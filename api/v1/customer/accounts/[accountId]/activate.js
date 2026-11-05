/* POST /api/v1/customer/accounts/{accountId}/activate — "Trade on this account".
   The engine pauses the customer's current trading account (closing its
   copies) and makes this one the only trading account. */

const { verifyCustomer, callEngine } = require('../../../../_lib/engineClient');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  const user = await verifyCustomer(req).catch(() => null);
  if (!user) return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });
  const { accountId } = req.query;
  if (!accountId) return res.status(400).json({ ok: false, error: 'VALIDATION_FAILED' });
  try {
    const r = await callEngine('/api/v1/customer/accounts/' + encodeURIComponent(accountId) + '/activate', { method: 'POST', authSubject: user.id, authEmail: user.email });
    if (r.ok) return res.status(r.status).json(r.body);
    console.error('FTM activate account: engine answered', r.status, r.body && r.body.error);
    return res.status(r.status || 500).json({ ok: false, error: (r.body && r.body.error) || 'INTERNAL_SERVER_ERROR', message: (r.body && typeof r.body.message === 'string') ? r.body.message.slice(0, 300) : undefined });
  } catch (e) {
    console.error('FTM activate account: engine unreachable:', e.message);
    return res.status(502).json({ ok: false, error: 'ENGINE_UNREACHABLE' });
  }
};
