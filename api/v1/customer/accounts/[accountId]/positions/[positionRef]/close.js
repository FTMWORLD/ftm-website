/* POST /api/v1/customer/accounts/{accountId}/positions/{positionRef}/close
   Asks the FTM engine to close one open trade on the customer's own account.
   Engine answers 202 {requested:true}, 409 POSITION_NOT_OPEN /
   CLOSE_ALREADY_IN_PROGRESS, or 404 for an unknown position. */

const { verifyCustomer, callEngine } = require('../../../../../../_lib/engineClient');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  const user = await verifyCustomer(req).catch(() => null);
  if (!user) return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });
  const { accountId, positionRef } = req.query;
  if (!accountId || !positionRef) return res.status(400).json({ ok: false, error: 'VALIDATION_FAILED' });
  try {
    const r = await callEngine('/api/v1/customer/accounts/' + encodeURIComponent(accountId) + '/positions/' + encodeURIComponent(positionRef) + '/close',
      { method: 'POST', authSubject: user.id, authEmail: user.email });
    if (r.ok) return res.status(r.status).json(r.body);
    return res.status(r.status || 500).json({ ok: false, error: (r.body && r.body.error) || 'INTERNAL_SERVER_ERROR', message: (r.body && typeof r.body.message === 'string') ? r.body.message.slice(0, 300) : undefined });
  } catch (e) {
    console.error('FTM close position: engine unreachable:', e.message);
    return res.status(502).json({ ok: false, error: 'ENGINE_UNREACHABLE' });
  }
};
