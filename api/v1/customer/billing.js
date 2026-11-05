/* GET /api/v1/customer/billing — the customer's FTM payment status from the
   engine: { status, period_end, billing_enabled, copies_allowed }. */

const { verifyCustomer, callEngine } = require('../../_lib/engineClient');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  const user = await verifyCustomer(req).catch(() => null);
  if (!user) return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });
  try {
    const r = await callEngine('/api/v1/billing/status', { method: 'GET', authSubject: user.id, authEmail: user.email });
    if (r.ok) return res.status(200).json(r.body);
    return res.status(r.status || 500).json({ ok: false, error: (r.body && r.body.error) || 'INTERNAL_SERVER_ERROR', message: (r.body && typeof r.body.message === 'string') ? r.body.message.slice(0, 300) : undefined });
  } catch (e) {
    console.error('FTM billing status: engine unreachable:', e.message);
    return res.status(502).json({ ok: false, error: 'ENGINE_UNREACHABLE' });
  }
};
