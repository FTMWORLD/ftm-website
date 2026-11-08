/* GET /api/v1/customer/entitlements — safety net for paying customers.
   Returns the signed-in customer's products. If the profile has none, it checks whether this email has paid
   (Stripe checkouts, when STRIPE_SECRET_KEY is set, and the FTM engine's billing status) and grants the plan,
   so a customer is never left without access because a webhook was missed. FTM is emailed whenever it repairs. */

const { createClient } = require('@supabase/supabase-js');
const { verifyCustomer, callEngine } = require('../../_lib/engineClient');

function linkMap() {
  try { return require('../../stripe/webhook.js').PAYMENT_LINK_PRODUCT || {}; } catch (e) { return {}; }
}

async function paidProductsFromStripe(email) {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || process.env.STRIPE_RESTRICTED_KEY;
  if (!key) return { checked: false, products: [] };
  const url = 'https://api.stripe.com/v1/checkout/sessions?limit=20&customer_details[email]=' + encodeURIComponent(email);
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + key } });
  if (!r.ok) return { checked: false, products: [] };
  const j = await r.json();
  const map = linkMap(); const out = new Set();
  (j.data || []).forEach(s => {
    if (s.status !== 'complete') return;
    if (s.payment_status !== 'paid' && s.payment_status !== 'no_payment_required') return;
    // Only real FTM plans count: a known payment link, or at least 400 (EUR) through a link not mapped yet.
    // Small payments such as the 1 EUR test link are not a plan.
    if (map[s.payment_link]) out.add(map[s.payment_link]);
    else if ((s.amount_total || 0) >= 40000) out.add('auto');
  });
  return { checked: true, products: [...out] };
}

async function activeOnEngine(user) {
  if (!process.env.FTM_ENGINE_URL) return false;
  try {
    const r = await callEngine('/api/v1/billing/status', { method: 'GET', authSubject: user.id, authEmail: user.email });
    const st = r.ok && r.body && String(r.body.status || '').toUpperCase();
    return st === 'ACTIVE';
  } catch (e) { return false; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  const user = await verifyCustomer(req).catch(() => null);
  if (!user) return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED', message: 'Your session has expired. Log in again and retry.' });
  res.setHeader('cache-control', 'no-store');
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const cur = await admin.from('profiles').select('products').eq('id', user.id).maybeSingle();
  const have = (cur.data && cur.data.products) || [];
  if (have.length) {
    // An Auto Trading plan must have a Stripe payment behind it. Plans set by hand for FTM's own accounts
    // (FTM_MANUAL_PLAN_EMAILS, plus FTM's addresses) are kept; any other plan without a paid checkout for this
    // email is removed and FTM is emailed, so a free account can never act as a paying one.
    const manual = String(process.env.FTM_MANUAL_PLAN_EMAILS || '').toLowerCase().split(/[\s,;]+/).filter(Boolean)
      .concat(['ftmwebnation@gmail.com', 'famouzthefirst@gmail.com']);
    const mail = String(user.email || '').toLowerCase();
    if (have.indexOf('auto') > -1 && manual.indexOf(mail) < 0 && (process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || process.env.STRIPE_RESTRICTED_KEY)) {
      let proof = null;
      try { proof = await paidProductsFromStripe(mail); } catch (e) { console.error('entitlements: Stripe verify failed', e.message); }
      if (proof && proof.checked && proof.products.indexOf('auto') < 0) {
        const keep = have.filter(p => p !== 'auto');
        const w = await admin.from('profiles').upsert({ id: user.id, products: keep });
        if (!w.error) {
          console.error('entitlements: removed unpaid Auto Trading plan from', mail);
          // Take them off the Brevo "Customers" list too, so paid-customer emails (Welcome aboard) stop.
          try {
            const key = process.env.BREVO_API_KEY, list = parseInt(String(process.env.BREVO_CUSTOMERS_LIST_ID || '').replace(/\D/g, ''), 10);
            if (key && list && !keep.length) await fetch('https://api.brevo.com/v3/contacts/lists/' + list + '/contacts/remove', { method: 'POST', headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ emails: [mail] }), signal: AbortSignal.timeout(5000) });
          } catch (e) { console.error('entitlements: Brevo list removal failed', e.message); }
          try { await require('../../stripe/webhook.js').alertFtm('Plan removed: no payment found', [['Customer', mail], ['Removed', 'Auto Trading'], ['Why', 'The profile had a plan but Stripe has no paid checkout for this email'], ['If wrong', 'Add the email to FTM_MANUAL_PLAN_EMAILS in Vercel and set products back in Supabase']]); } catch (e) {}
          return res.status(200).json({ ok: true, products: keep, repaired: false, removed: ['auto'] });
        }
      }
    }
    return res.status(200).json({ ok: true, products: have, repaired: false });
  }

  // A plan is only ever granted on proof of payment. With the Stripe key set, Stripe is the only proof
  // (a completed, paid checkout for this email); the engine is asked only when there is no Stripe key.
  let found = [], stripeChecked = false;
  try { const r = await paidProductsFromStripe(user.email); found = r.products; stripeChecked = r.checked; } catch (e) { console.error('entitlements: Stripe check failed', e.message); }
  if (!found.length && !stripeChecked && !process.env.STRIPE_SECRET_KEY && await activeOnEngine(user)) found = ['auto'];
  if (!found.length) return res.status(200).json({ ok: true, products: [], repaired: false });

  const w = await admin.from('profiles').upsert({ id: user.id, products: found });
  if (w.error) {
    console.error('entitlements: profile write failed', w.error.message);
    return res.status(200).json({ ok: true, products: found, repaired: false, error: 'PROFILE_WRITE_FAILED' });
  }
  console.error('entitlements: repaired missing plan for', user.email, found.join(','));
  try { await require('../../stripe/webhook.js').alertFtm('Plan repaired at login', [['Customer', user.email], ['Granted', found.join(', ')], ['Why', 'Paid, but the profile had no plan']]); } catch (e) {}
  return res.status(200).json({ ok: true, products: found, repaired: true });
};
