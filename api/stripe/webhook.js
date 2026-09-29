/* POST /api/stripe/webhook — Stripe calls this the moment a payment
   completes. On a successful checkout it creates (or reuses) the
   customer's Supabase account and emails them an invite link that lets
   them set their own password and log straight in — replacing the
   previous manual step of an operator creating each Supabase user by
   hand after seeing a payment come through.

   Requires two things only Gospel can set up, both in Vercel's env vars
   (never in this repo, never in chat):
     STRIPE_WEBHOOK_SECRET   — from the Stripe Dashboard, once this
                               endpoint is added as a webhook there
                               (see the setup note at the bottom).
     SUPABASE_SERVICE_ROLE_KEY / SUPABASE_URL — already configured for
                               the rest of the site's server-side calls.

   Body parsing is deliberately OFF (see module.exports.config below) —
   Stripe's signature check needs the exact raw bytes it signed, not a
   JSON-parsed-and-reserialized copy, which would not match. */

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

module.exports.config = { api: { bodyParser: false } };

/* Maps a Stripe Payment Link id to the FTM product it grants — the
   real ids, sent by Gospel from the Stripe Dashboard, replacing the
   placeholders. Update here if a plan's link ever changes, since
   nothing else derives this mapping.
     confirmed: Annual (999€) -> auto
     still placeholder: 5 Years, Lifetime, Investment — see bottom note */
const PAYMENT_LINK_PRODUCT = {
  'plink_1UHLQXAZWClTb7yxBn9gU95g': 'auto', // Annual, 999€ — confirmed 2026-09-30
  'plink_1SDMxxJ9CfQOYqUAAAAAAA': 'auto',  // 5 Years — placeholder, still needed
  'plink_1SDMyYJ9CfQOYqUABBBBBB': 'auto',  // Lifetime — placeholder, still needed
  'plink_1SDMzZJ9CfQOYqUACCCCCC': 'invest' // Investment — placeholder, still needed
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    return;
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('Stripe webhook: STRIPE_WEBHOOK_SECRET not configured.');
    res.status(503).json({ ok: false, error: 'NOT_CONFIGURED' });
    return;
  }

  const rawBody = await readRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    // No Stripe secret API key needed here — constructEvent only checks
    // the signature against the webhook signing secret.
    const stripe = new Stripe('placeholder', { apiVersion: '2024-06-20' });
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('Stripe webhook: signature verification failed:', e.message);
    res.status(400).json({ ok: false, error: 'BAD_SIGNATURE' });
    return;
  }

  // Always 200 once the signature is valid, even on an event we don't
  // act on — a non-200 makes Stripe retry the same event repeatedly.
  if (event.type !== 'checkout.session.completed') {
    res.status(200).json({ ok: true, ignored: event.type });
    return;
  }

  const session = event.data.object;
  if (session.payment_status !== 'paid') {
    res.status(200).json({ ok: true, ignored: 'not paid' });
    return;
  }

  const email = (session.customer_details && session.customer_details.email) || session.customer_email;
  if (!email) {
    console.error('Stripe webhook: no email on session', session.id);
    res.status(200).json({ ok: true, ignored: 'no email' });
    return;
  }

  const linkId = session.payment_link;
  const product = PAYMENT_LINK_PRODUCT[linkId] || null;
  if (!product) {
    // Deliberately do NOT grant access when the plan can't be
    // identified — better to leave a customer needing a manual follow-
    // up than to silently give the wrong product or none at all.
    console.error('Stripe webhook: unrecognised payment_link', linkId, 'for', email, '— needs a manual follow-up.');
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Stripe webhook: Supabase not configured, cannot create the account.');
    res.status(200).json({ ok: true, error: 'SUPABASE_NOT_CONFIGURED' });
    return;
  }
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const invite = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: (process.env.SITE_URL || 'https://www.ftmwealthnation.com') + '/'
    });

    if (invite.error) {
      // Most likely an existing customer buying a second plan (e.g.
      // Auto Trading then Investment) — they already have an account
      // and password, so no new invite email; just grant the product.
      if (String(invite.error.message || '').toLowerCase().indexOf('already') > -1) {
        console.log('Stripe webhook:', email, 'already has an account — adding product only, not resending an invite.');
      } else {
        console.error('Stripe webhook: inviteUserByEmail failed:', invite.error.message);
        res.status(200).json({ ok: true, error: 'INVITE_FAILED' });
        return;
      }
    }

    const userId = invite.data && invite.data.user && invite.data.user.id;
    if (userId && product) {
      const existing = await admin.from('profiles').select('products').eq('id', userId).maybeSingle();
      const current = (existing.data && existing.data.products) || [];
      const next = current.indexOf(product) > -1 ? current : current.concat([product]);
      await admin.from('profiles').upsert({ id: userId, products: next });
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Stripe webhook: unexpected error:', e.message);
    // Still 200 — Stripe retrying won't fix a bug in this handler, and
    // the failure is already logged for a manual follow-up.
    res.status(200).json({ ok: true, error: 'INTERNAL_ERROR' });
  }
};

/* ---------------------------------------------------------------------
   SETUP — none of this can be done from here, it needs Gospel's own
   Stripe and Vercel dashboard access:

   1. Stripe Dashboard → Developers → Webhooks → Add endpoint
        URL: https://www.ftmwealthnation.com/api/stripe/webhook
        Event: checkout.session.completed
      Stripe then shows a signing secret (whsec_...) — copy it.

   2. Vercel → this project → Settings → Environment Variables:
        STRIPE_WEBHOOK_SECRET = the whsec_... value from step 1
        SITE_URL = https://www.ftmwealthnation.com   (optional, has a
                                                        fallback above)

   3. THE PAYMENT_LINK_PRODUCT MAP ABOVE HAS PLACEHOLDER IDS.
      Stripe Dashboard → Payment Links → open each of the 4 live links
      (3 Auto Trading plans + 1 Investment) → the link's own id starts
      with "plink_..." (NOT the buy.stripe.com/xxxx part in the URL).
      Replace the four placeholder keys above with the real plink_...
      ids, matched to 'auto' or 'invest' correctly, then redeploy.
      Until this is done, the webhook will run but log "unrecognised
      payment_link" for every real payment and grant nothing — safer
      than guessing wrong, but it needs this one manual step to work.
   --------------------------------------------------------------------- */
