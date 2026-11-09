/* GET /api/v1/customer/accounts/{accountId}/stats — the account's own statistics from the FTM engine:
   balance, equity, totals of deposits and withdrawals, growth, drawdown and the full deal history, in which
   deposits and withdrawals are type "BALANCE" rows (profit > 0 deposit, < 0 withdrawal). Forwarded unchanged.
   Query: limit (history rows, engine default 200, max 2000). */

const { verifyCustomer, callEngine } = require('../../../../_lib/engineClient');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  const user = await verifyCustomer(req).catch(() => null);
  if (!user) return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED', message: 'Your session has expired. Log in again and retry.' });
  const accountId = req.query.accountId;
  if (!accountId) return res.status(400).json({ ok: false, error: 'VALIDATION_FAILED' });
  const limit = String(req.query.limit || '2000').replace(/\D/g, '') || '2000';
  try {
    const r = await callEngine('/api/v1/customer/accounts/' + encodeURIComponent(accountId) + '/stats?limit=' + limit,
      { method: 'GET', authSubject: user.id, authEmail: user.email });
    if (r.ok) return res.status(200).json(r.body);
    const code = r.body && r.body.error;
    return res.status(r.status || 500).json({ ok: false, error: code || 'INTERNAL_SERVER_ERROR' });
  } catch (e) {
    console.error('FTM stats: engine unreachable:', e.message);
    return res.status(502).json({ ok: false, error: 'ENGINE_UNREACHABLE' });
  }
};
