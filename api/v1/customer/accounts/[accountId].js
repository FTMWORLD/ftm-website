/* DELETE /api/v1/customer/accounts/{accountId} — remove a connected
   account. Deployed and proven live 2026-09-29. The engine keeps the
   record internally; for the customer it disappears from GET /accounts
   and its /history and /positions start 404ing.

   200 -> { ok:true, account_id, removed:true } */

const { verifyCustomer, callEngine } = require('../../../_lib/engineClient');

const STATUS_FOR_CODE = {
  UNAUTHENTICATED: 401,
  CUSTOMER_NOT_PERMITTED: 403,
  ACCOUNT_NOT_FOUND: 404,
  OPEN_POSITIONS: 409,
  ACCOUNT_PROVISIONED: 409,
  CUSTOMER_API_NOT_CONFIGURED: 503,
  INTERNAL_SERVER_ERROR: 500
};

module.exports = async function handler(req, res) {
  if (req.method !== 'DELETE') {
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
      '/api/v1/customer/accounts/' + encodeURIComponent(accountId),
      { method: 'DELETE', authSubject: user.id, authEmail: user.email }
    );
    if (result.ok) {
      res.status(result.status).json(result.body);
      return;
    }
    var code = result.body && result.body.error;
    var status = STATUS_FOR_CODE[code] || result.status || 500;
    res.status(status).json({ ok: false, error: code || 'INTERNAL_SERVER_ERROR' });
  } catch (e) {
    console.error('FTM account removal: engine unreachable:', e.message);
    res.status(502).json({ ok: false, error: 'ENGINE_UNREACHABLE', message: 'Could not reach the FTM engine. Try again shortly.' });
  }
};
