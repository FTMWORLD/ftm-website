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
const { callEngine } = require('../_lib/engineClient');
const Stripe = require('stripe');

module.exports.config = { api: { bodyParser: false } };

/* Maps a Stripe Payment Link id to the FTM product it grants — the
   real ids, sent by Gospel from the Stripe Dashboard, replacing the
   placeholders. Update here if a plan's link ever changes, since
   nothing else derives this mapping.
     confirmed, all four: Annual (999€), 5 Years (3,999€),
     Lifetime (9,999€) -> auto; Investment -> invest
     Note: Gospel first sent the Lifetime link labelled "Annual" by
     mistake, caught and corrected the same night — worth a sanity
     check against the Stripe Dashboard if a real payment ever grants
     the wrong plan. */
const PAYMENT_LINK_PRODUCT = {
  'plink_1USfs7AZWClTb7yxxDVMAKmY': 'auto', // Lifetime sale, 4,999€ — added 2026-10-20
  'plink_1USfiuAZWClTb7yxfgCmBpC4': 'auto', // 5 Years sale, 1,999€ — added 2026-10-20
  'plink_1USfSYAZWClTb7yxYnZ9wlM1': 'auto', // Annual sale, 499€ — added 2026-10-20
  'plink_1UG5XeAZWClTb7yx1a8w5228': 'auto', // Annual, 999€ — confirmed 2026-09-30
  'plink_1UG6CUAZWClTb7yxRTis1wzS': 'auto', // 5 Years, 3,999€ — confirmed 2026-09-30
  'plink_1UHLQXAZWClTb7yxBn9gU95g': 'auto', // Lifetime, 9,999€ — confirmed 2026-09-30
  'plink_1NItdgAZWClTb7yxGcXgPDLP': 'invest' // Investment — confirmed 2026-09-30
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

  // Tell the FTM engine the customer's payment status after every billing
  // event (spec "connect Stripe payments to the FTM engine"). Never blocks
  // or fails the Stripe reply.
  const engineSync = await syncEngine(event).catch(e => { console.error('Stripe webhook: engine sync failed:', e.message); return 'failed'; });

  // Always 200 once the signature is valid, even on an event we don't
  // act on — a non-200 makes Stripe retry the same event repeatedly.
  if (event.type !== 'checkout.session.completed') {
    res.status(200).json({ ok: true, ignored: event.type, engine: engineSync });
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

  // Finds an existing Supabase user's id by email. supabase-js v2 has no
  // lookup-by-email, so page through the user list (fine at this scale).
  async function findUserIdByEmail(addr) {
    const want = String(addr).toLowerCase();
    for (let page = 1; page <= 20; page++) {
      const r = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (r.error) throw new Error('listUsers: ' + r.error.message);
      const hit = (r.data.users || []).find(u => String(u.email || '').toLowerCase() === want);
      if (hit) return hit.id;
      if ((r.data.users || []).length < 1000) break;
    }
    return null;
  }

  // The reply body is only ever read by Stripe (the Dashboard's event
  // delivery log) because the signature was verified above. It reports
  // what actually happened, since a plain {ok:true} hid real failures.
  // error/detail are listed first (null when fine) so they are the first
  // lines Stripe's delivery log shows.
  // Name typed on the card at checkout; shown in the client area as "Signed in as".
  const payerName = String((session.customer_details && session.customer_details.name) || '').trim().slice(0, 80);
  const report = { ok: true, error: null, detail: null, granted: false, product: product, invited: false, existingUser: false };

  try {
    const invite = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: (process.env.SITE_URL || 'https://www.ftmwealthnation.com') + '/'
    });

    let userId = invite.data && invite.data.user && invite.data.user.id;

    if (invite.error) {
      // Most likely an existing customer buying a second plan (e.g.
      // Auto Trading then Investment) — they already have an account
      // and password, so no new invite email; just grant the product.
      if (String(invite.error.message || '').toLowerCase().indexOf('already') > -1) {
        console.log('Stripe webhook:', email, 'already has an account — adding product only, not resending an invite.');
        report.existingUser = true;
        userId = await findUserIdByEmail(email);
      } else {
        console.error('Stripe webhook: inviteUserByEmail failed:', invite.error.message);
        res.status(200).json({ ok: true, error: 'INVITE_FAILED', detail: invite.error.message });
        return;
      }
    } else {
      report.invited = true;
    }

    if (userId && payerName) {
      const upd = await admin.auth.admin.updateUserById(userId, { user_metadata: { full_name: payerName } });
      if (upd.error) console.error('Stripe webhook: name save failed:', upd.error.message);
    }

    if (!userId) {
      console.error('Stripe webhook: no user id for', email, '— cannot grant a plan.');
      report.error = 'NO_USER_ID';
    } else if (!product) {
      report.error = 'UNRECOGNISED_PAYMENT_LINK';
      report.paymentLink = linkId || null;
    } else {
      const existing = await admin.from('profiles').select('products').eq('id', userId).maybeSingle();
      if (existing.error) console.error('Stripe webhook: profiles read failed:', existing.error.message);
      const current = (existing.data && existing.data.products) || [];
      const next = current.indexOf(product) > -1 ? current : current.concat([product]);
      const write = await admin.from('profiles').upsert({ id: userId, products: next });
      if (write.error) {
        console.error('Stripe webhook: profiles write failed:', write.error.message);
        report.error = 'PROFILE_WRITE_FAILED';
        report.detail = write.error.message;
      } else {
        report.granted = true;
        report.products = next;
      }
    }

    // Paying customers go on the Brevo "Customers" list, so marketing
    // automations can skip people who already bought. Never blocks the reply.
    report.brevo = await addToCustomerList(email);
    report.engine = engineSync;

    res.status(200).json(report);
  } catch (e) {
    console.error('Stripe webhook: unexpected error:', e.message);
    // Still 200 — Stripe retrying won't fix a bug in this handler, and
    // the failure is already logged for a manual follow-up.
    res.status(200).json({ ok: true, error: 'INTERNAL_ERROR', detail: e.message });
  }
};

/* ---------------------------------------------------------------------
   SETUP — completed 2026-09-30, all live:

   1. Stripe Dashboard → Developers → Webhooks → endpoint added,
        URL: https://www.ftmwealthnation.com/api/stripe/webhook
        Event: checkout.session.completed

   2. Vercel → Environment Variables → STRIPE_WEBHOOK_SECRET set,
      redeployed, confirmed live (probe returns 400 BAD_SIGNATURE for
      a request without a real Stripe signature, as expected, rather
      than 503 NOT_CONFIGURED).

   3. PAYMENT_LINK_PRODUCT above has all four real plink_... ids,
      confirmed against the Stripe Dashboard by Gospel.

   4. PROVEN end to end 2026-10-05 with a 1€ live test link: payment ->
      webhook -> invite email -> create password -> login -> plan
      unlocked. That test found the profiles table had no grant for
      the service role; fixed in Supabase with
        grant all on table public.profiles to service_role;
      This endpoint's reply body reports what happened (error / detail
      / granted), readable in the Stripe Dashboard's event delivery log.
   --------------------------------------------------------------------- */

async function addToCustomerList(email) {
  const key = process.env.BREVO_API_KEY;
  const list = parseInt(String(process.env.BREVO_CUSTOMERS_LIST_ID || '').replace(/\D/g, ''), 10);
  if (!key || !list) return 'not configured';
  try {
    const r = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ email: String(email).toLowerCase(), listIds: [list], updateEnabled: true }),
      signal: AbortSignal.timeout(5000)
    });
    if (r.ok || r.status === 204) return 'added';
    console.error('Stripe webhook: Brevo customer list failed', r.status, await r.text());
    return 'failed ' + r.status;
  } catch (e) {
    console.error('Stripe webhook: Brevo unreachable', e.message);
    return 'failed';
  }
}

/* ---------------------------------------------------------------------
   Engine billing sync: PUT /api/v1/billing/subscription on the FTM engine.
   Payment Links are one-time payments, so a paid checkout is ACTIVE until
   the plan's end: Annual 13 months, 5 Years 64 months, Lifetime no end.
   Investment payments do not unlock trade copies and are not sent.
   --------------------------------------------------------------------- */
const PLAN_MONTHS = {
  'plink_1USfSYAZWClTb7yxYnZ9wlM1': 13, 'plink_1UG5XeAZWClTb7yx1a8w5228': 13,
  'plink_1USfiuAZWClTb7yxfgCmBpC4': 64, 'plink_1UG6CUAZWClTb7yxRTis1wzS': 64,
  'plink_1USfs7AZWClTb7yxxDVMAKmY': null, 'plink_1UHLQXAZWClTb7yxBn9gU95g': null
};

function subStatus(st) {
  if (st === 'active' || st === 'trialing') return 'ACTIVE';
  if (st === 'past_due' || st === 'unpaid') return 'PAST_DUE';
  if (st === 'canceled' || st === 'incomplete_expired') return 'CANCELED';
  return null;
}

function isoFromUnix(t) { return t ? new Date(t * 1000).toISOString() : null; }

async function syncEngine(event) {
  if (!process.env.FTM_ENGINE_URL || !process.env.FTM_WEBSITE_API_TOKEN) return 'not configured';
  const o = event.data.object || {};
  let status = null, email = null, ref = null, cus = null, periodEnd = null;

  switch (event.type) {
    case 'checkout.session.completed': {
      if (o.payment_status !== 'paid') return 'skipped (not paid)';
      if (PAYMENT_LINK_PRODUCT[o.payment_link] === 'invest') return 'skipped (investment)';
      if (!PAYMENT_LINK_PRODUCT[o.payment_link]) return 'skipped (unknown payment link)';
      status = 'ACTIVE';
      email = (o.customer_details && o.customer_details.email) || o.customer_email || null;
      ref = o.client_reference_id || (o.metadata && o.metadata.ftm_customer) || null;
      cus = typeof o.customer === 'string' ? o.customer : null;
      if (o.payment_link in PLAN_MONTHS) {
        const m = PLAN_MONTHS[o.payment_link];
        if (m) { const d = new Date((o.created || event.created || Math.floor(Date.now() / 1000)) * 1000); d.setUTCMonth(d.getUTCMonth() + m); periodEnd = d.toISOString(); }
      }
      break;
    }
    case 'invoice.paid':
    case 'invoice.payment_failed': {
      status = event.type === 'invoice.paid' ? 'ACTIVE' : 'PAST_DUE';
      email = o.customer_email || null;
      ref = (o.metadata && o.metadata.ftm_customer) || (o.subscription_details && o.subscription_details.metadata && o.subscription_details.metadata.ftm_customer) || null;
      cus = typeof o.customer === 'string' ? o.customer : null;
      const line = o.lines && o.lines.data && o.lines.data[0];
      periodEnd = line && line.period ? isoFromUnix(line.period.end) : null;
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      status = event.type === 'customer.subscription.deleted' ? 'CANCELED' : subStatus(o.status);
      if (!status) return 'skipped (status ' + o.status + ')';
      ref = (o.metadata && o.metadata.ftm_customer) || null;
      cus = typeof o.customer === 'string' ? o.customer : null;
      periodEnd = isoFromUnix(o.current_period_end || (o.items && o.items.data && o.items.data[0] && o.items.data[0].current_period_end));
      break;
    }
    default:
      return 'not a billing event';
  }

  if (!ref && !email) {
    console.error('Stripe webhook: engine sync skipped, no customer id or email on', event.type, event.id);
    return 'skipped (no customer)';
  }

  const body = { stripe_event_id: event.id, event_type: event.type, status };
  if (ref) body.customer_public_id = ref; else body.email = String(email).toLowerCase();
  if (cus) body.stripe_customer_id = cus;
  if (periodEnd) body.period_end = periodEnd;

  const r = await callEngine('/api/v1/billing/subscription', { method: 'PUT', body });
  if (!r.ok) console.error('Stripe webhook: engine billing answered', r.status, JSON.stringify(r.body).slice(0, 300));
  return r.ok ? ('engine ' + (r.body.duplicate ? 'duplicate' : 'applied') + ' ' + status) : ('engine error ' + r.status);
}
module.exports._syncEngine = syncEngine;
