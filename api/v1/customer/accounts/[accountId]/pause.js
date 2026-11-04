/* POST /api/v1/customer/accounts/{accountId}/pause — pause trading on one of the customer's own accounts. */

const { verifyCustomer, callEngine } = require('../../../../_lib/engineClient');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  const user = await verifyCustomer(req).catch(() => null);
  if (!user) return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });
  const { accountId } = req.query;
  if (!accountId) return res.status(400).json({ ok: false, error: 'VALIDATION_FAILED' });
  try {
    const r = await callEngine('/api/v1/customer/accounts/' + encodeURIComponent(accountId) + '/pause', { method: 'POST', authSubject: user.id, authEmail: user.email });
    if (r.ok) return res.status(r.status).json(r.body);
    console.error('FTM pause account: engine answered', r.status, r.body && r.body.error);
    return res.status(r.status || 500).json({ ok: false, error: (r.body && r.body.error) || 'INTERNAL_SERVER_ERROR' });
  } catch (e) {
    console.error('FTM pause account: engine unreachable:', e.message);
    return res.status(502).json({ ok: false, error: 'ENGINE_UNREACHABLE' });
  }
};
