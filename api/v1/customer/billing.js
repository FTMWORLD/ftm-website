/* GET /api/v1/customer/billing — the customer's FTM payment status from the
   engine: { status, period_end, billing_enabled, copies_allowed }. When the engine
   has no end date (or cannot be reached), the end date is worked out from the
   customer's Stripe checkout: plan length from the payment link, counted from the
   payment date. Lifetime plans answer lifetime: true. */

const { verifyCustomer, callEngine } = require('../../_lib/engineClient');

async function fromStripe(email) {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || process.env.STRIPE_RESTRICTED_KEY;
  if (!key || !email) return null;
  let wh = {};
  try { wh = require('../../stripe/webhook.js'); } catch (e) { return null; }
  const links = wh.PAYMENT_LINK_PRODUCT || {}, months = wh.PLAN_MONTHS || {};
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions?limit=20&customer_details[email]=' + encodeURIComponent(email),
    { headers: { Authorization: 'Bearer ' + key }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const j = await r.json();
  let best = null;
  (j.data || []).forEach(s => {
    if (s.status !== 'complete' || (s.payment_status !== 'paid' && s.payment_status !== 'no_payment_required')) return;
    if (links[s.payment_link] === 'invest' || !(s.payment_link in months)) return;
    const m = months[s.payment_link];
    if (m === null) { best = { lifetime: true }; return; }
    if (best && best.lifetime) return;
    const d = new Date(s.created * 1000); d.setUTCMonth(d.getUTCMonth() + m);
    if (!best || d.toISOString() > best.period_end) best = { period_end: d.toISOString() };
  });
  return best;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  const user = await verifyCustomer(req).catch(() => null);
  if (!user) return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });
  res.setHeader('cache-control', 'no-store');
  let r = null;
  try {
    r = await callEngine('/api/v1/billing/status', { method: 'GET', authSubject: user.id, authEmail: user.email, timeoutMs: 8000 });
  } catch (e) {
    console.error('FTM billing status: engine unreachable:', e.message);
  }
  const body = (r && r.ok) ? Object.assign({}, r.body) : null;
  if (!body || !body.period_end) {
    const s = await fromStripe(user.email).catch(e => { console.error('FTM billing status: Stripe lookup failed:', e.message); return null; });
    if (s) {
      const out = body || { ok: true, status: 'ACTIVE' };
      if (s.lifetime) out.lifetime = true; else out.period_end = s.period_end;
      out.period_source = 'stripe';
      return res.status(200).json(out);
    }
  }
  if (body) return res.status(200).json(body);
  if (r) return res.status(r.status || 500).json({ ok: false, error: (r.body && r.body.error) || 'INTERNAL_SERVER_ERROR', message: (r.body && typeof r.body.message === 'string') ? r.body.message.slice(0, 300) : undefined });
  return res.status(502).json({ ok: false, error: 'ENGINE_UNREACHABLE' });
};
