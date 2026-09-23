/* POST /api/v1/customer/accounts — the real connect-trading-account endpoint.
   Confirmed shape, 2026-09-23, against the engine's own proven implementation.

   Flow: verify the browser's Supabase session server-side, resolve it to
   the engine's identity header, forward the request, map the response
   (and any error) back to the browser without ever exposing the engine's
   own bearer token or the raw ACCESS/engine error body. */

const { verifyCustomer, callEngine } = require('../../_lib/engineClient');

/* Never invent wording for an error the engine didn't send — that risks
   guessing wrong about what happened. Only the codes below are known and
   safe to reword; anything else passes through as a generic message with
   the engine's own code attached, so the browser can still branch on it
   without us fabricating user-facing text for a case we haven't seen. */
const STATUS_FOR_CODE = {
  UNAUTHENTICATED: 401,
  CUSTOMER_NOT_PERMITTED: 403,
  ACCOUNT_ALREADY_CONNECTED: 409,
  VALIDATION_FAILED: 422,
  CUSTOMER_API_NOT_CONFIGURED: 503,
  INTERNAL_SERVER_ERROR: 500
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
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

  // Pass the body through untouched — the engine's own schema validates
  // it (and rejects unknown keys with 422), so this function doesn't
  // duplicate that logic or risk disagreeing with it.
  var body = req.body || {};

  try {
    var result = await callEngine('/api/v1/customer/accounts', {
      method: 'POST',
      body: body,
      authSubject: user.id,
      authEmail: user.email
    });

    if (result.ok) {
      // 202 Accepted, { ok, account_id, status, status_reason } — passed
      // straight through, nothing here to reshape.
      res.status(result.status).json(result.body);
      return;
    }

    var code = result.body && result.body.error;
    var status = STATUS_FOR_CODE[code] || result.status || 500;
    var payload = { ok: false, error: code || 'INTERNAL_SERVER_ERROR' };
    if (result.body && result.body.issues) payload.issues = result.body.issues;
    // Deliberately no message field here — the browser maps codes to its
    // own wording (see FTM.remote.connectAccount), including the
    // privacy-safe rewording of ACCOUNT_ALREADY_CONNECTED. Passing the
    // engine's raw message through risks leaking phrasing we haven't
    // reviewed for that.
    res.status(status).json(payload);
  } catch (e) {
    console.error('FTM connect-account: engine unreachable:', e.message);
    res.status(502).json({ ok: false, error: 'ENGINE_UNREACHABLE', message: 'Could not reach the FTM engine. Try again shortly.' });
  }
};
