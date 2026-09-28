/* GET /api/v1/customer/accounts/{accountId}/history — closed trade history
   for one connected account. Confirmed live against the real engine on
   2026-09-25 — this is the final shape, not a draft.

   Query: limit (1-200, default 50), offset (>=0, default 0) — passed
   straight through to the engine, which owns validation of both.

   Response is forwarded unchanged: { ok, account_id, currency, summary,
   page, trades }. summary's four money fields (realized_profit,
   commission, swap, net_profit) are pre-summed server-side over the
   rows that have every component non-null; do not recompute them here
   or on the client. Every money/price field is an 8/10-decimal STRING —
   forwarded as-is, never parsed or reformatted by this function. */

const { verifyCustomer, callEngine } = require('../../../../_lib/engineClient');

const STATUS_FOR_CODE = {
  UNAUTHENTICATED: 401,
  CUSTOMER_NOT_PERMITTED: 403,
  ACCOUNT_NOT_FOUND: 404,
  VALIDATION_FAILED: 422,
  CUSTOMER_API_NOT_CONFIGURED: 503,
  INTERNAL_SERVER_ERROR: 500
};

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const user = await verifyCustomer(req).catch(function(e){
    console.error('verifyCustomer threw:', e.message);
    return null;
  });
  if (!user) {
    res.status(401).json({ ok: false, error: 'UNAUTHENTICATED', message: 'Your session has expired. Log in again and retry.' });
    return;
  }

  const accountId = req.query.accountId;
  if (!accountId) {
    res.status(400).json({ ok: false, error: 'VALIDATION_FAILED', message: 'Missing account id.' });
    return;
  }

  const limit = req.query.limit || '50';
  const offset = req.query.offset || '0';

  try {
    var result = await callEngine(
      '/api/v1/customer/accounts/' + encodeURIComponent(accountId) + '/history?limit=' + encodeURIComponent(limit) + '&offset=' + encodeURIComponent(offset),
      { method: 'GET', authSubject: user.id, authEmail: user.email }
    );
    if (result.ok) {
      res.status(result.status).json(result.body);
      return;
    }
    var code = result.body && result.body.error;
    var status = STATUS_FOR_CODE[code] || result.status || 500;
    res.status(status).json({ ok: false, error: code || 'INTERNAL_SERVER_ERROR' });
  } catch (e) {
    console.error('FTM history: engine unreachable:', e.message);
    res.status(502).json({ ok: false, error: 'ENGINE_UNREACHABLE', message: 'Could not reach the FTM engine. Try again shortly.' });
  }
};
