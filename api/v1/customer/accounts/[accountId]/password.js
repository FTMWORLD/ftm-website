/* PUT /api/v1/customer/accounts/{accountId}/password — update the saved
   master password for a connected account (e.g. the broker refused the
   original login). Deployed and proven live 2026-09-29.

   Body: { password: "<1-200 chars>" }
   202 -> { ok:true, account_id, status:"SETUP_INCOMPLETE",
            status_reason:"VALIDATION_PENDING", password_tries_left }
   The validator re-checks within about a minute; a refused login is
   reported immediately, no 10-minute retry on this path. */

const { verifyCustomer, callEngine } = require('../../../../_lib/engineClient');

const STATUS_FOR_CODE = {
  UNAUTHENTICATED: 401,
  CUSTOMER_NOT_PERMITTED: 403,
  ACCOUNT_NOT_FOUND: 404,
  ACCOUNT_PROVISIONED: 409,
  ACCOUNT_DISABLED: 409,
  PASSWORD_TRIES_EXHAUSTED: 409,
  VALIDATION_FAILED: 422,
  CUSTOMER_API_NOT_CONFIGURED: 503,
  INTERNAL_SERVER_ERROR: 500
};

module.exports = async function handler(req, res) {
  if (req.method !== 'PUT') {
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

  const password = req.body && req.body.password;
  if (!password || typeof password !== 'string' || password.length < 1 || password.length > 200) {
    res.status(422).json({ ok: false, error: 'VALIDATION_FAILED', message: 'Enter your MT5 master password.' });
    return;
  }

  try {
    var result = await callEngine(
      '/api/v1/customer/accounts/' + encodeURIComponent(accountId) + '/password',
      { method: 'PUT', body: { password: password }, authSubject: user.id, authEmail: user.email }
    );
    if (result.ok) {
      res.status(result.status).json(result.body);
      return;
    }
    var code = result.body && result.body.error;
    var status = STATUS_FOR_CODE[code] || result.status || 500;
    res.status(status).json({ ok: false, error: code || 'INTERNAL_SERVER_ERROR' });
  } catch (e) {
    console.error('FTM password update: engine unreachable:', e.message);
    res.status(502).json({ ok: false, error: 'ENGINE_UNREACHABLE', message: 'Could not reach the FTM engine. Try again shortly.' });
  }
};
