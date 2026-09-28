/* GET /api/v1/customer/accounts/{accountId}/positions — currently open
   positions for one connected account. Confirmed live against the real
   engine on 2026-09-25.

   Response forwarded unchanged: { ok, account_id, positions }. Each
   position: position_ref, symbol, side, volume, remaining_volume,
   open_price, opened_at, partial_closes. There is deliberately no
   current price or floating P&L per position in v1 — do not invent one
   client-side. */

const { verifyCustomer, callEngine } = require('../../../../_lib/engineClient');

const STATUS_FOR_CODE = {
  UNAUTHENTICATED: 401,
  CUSTOMER_NOT_PERMITTED: 403,
  ACCOUNT_NOT_FOUND: 404,
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

  try {
    var result = await callEngine(
      '/api/v1/customer/accounts/' + encodeURIComponent(accountId) + '/positions',
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
    console.error('FTM positions: engine unreachable:', e.message);
    res.status(502).json({ ok: false, error: 'ENGINE_UNREACHABLE', message: 'Could not reach the FTM engine. Try again shortly.' });
  }
};
