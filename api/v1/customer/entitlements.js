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
    out.add(map[s.payment_link] || 'auto');
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
  if (have.length) return res.status(200).json({ ok: true, products: have, repaired: false });

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
