/* GET /api/v1/customer/me — the logged-in customer's FTM profile from the
   engine: { customer_public_id, email, subscription_status, billing_enabled,
   copies_allowed, accounts }. customer_public_id is sent to Stripe Checkout
   as client_reference_id so payments match the right customer. */

const { verifyCustomer, callEngine } = require('../../_lib/engineClient');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  const user = await verifyCustomer(req).catch(() => null);
  if (!user) return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });
  try {
    const r = await callEngine('/api/v1/customer/me', { method: 'GET', authSubject: user.id, authEmail: user.email });
    if (r.ok) return res.status(200).json(r.body);
    return res.status(r.status || 500).json({ ok: false, error: (r.body && r.body.error) || 'INTERNAL_SERVER_ERROR' });
  } catch (e) {
    console.error('FTM customer/me: engine unreachable:', e.message);
    return res.status(502).json({ ok: false, error: 'ENGINE_UNREACHABLE' });
  }
};
