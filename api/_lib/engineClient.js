/* Shared helper for every /api function that talks to the FTM trading
   engine. Vercel does not route files whose name starts with "_", so this
   file is never itself a public endpoint — only imported.

   Env vars this reads (Vercel project settings, server-side only, never
   NEXT_PUBLIC_ or otherwise exposed to the browser):

     FTM_ENGINE_URL             e.g. https://api.ftmwealthnation.com
     FTM_WEBSITE_API_TOKEN      the god token — asserts customer identity to
                                 the engine (contract v0.1 §1). NEVER forward
                                 anything a browser sent in its place.
     CF_ACCESS_CLIENT_ID        Cloudflare Access service token
     CF_ACCESS_CLIENT_SECRET    Cloudflare Access service token
     SUPABASE_URL               same project the website's login already uses
     SUPABASE_SERVICE_ROLE_KEY  server-side only — never the anon key here

   ---------------------------------------------------------------------
   THE SECURITY BOUNDARY, stated plainly because it's the one thing in
   this file that must never be gotten wrong: FTM_WEBSITE_API_TOKEN can
   assert ANY customer's identity to the engine. The only thing standing
   between "logged in as yourself" and "reading a stranger's trading
   account" is verifyCustomer() actually verifying the Supabase session
   server-side, rather than trusting anything the request claims about
   who it is. Every route MUST call verifyCustomer(req) and use ONLY the
   id it returns — never an id read from a query string, body, or header
   the caller supplied.
   --------------------------------------------------------------------- */

const { createClient } = require('@supabase/supabase-js');

/* Lazy singleton, built only when a route actually needs Supabase (i.e.
   calls verifyCustomer). Building this eagerly at module load time — as
   an earlier version of this file did — meant EVERY function that
   imports this module, including /api/v1/health, which needs no
   identity at all, crashed with FUNCTION_INVOCATION_FAILED the moment
   SUPABASE_URL was unset. A health check that fails because of an
   unrelated, unconfigured dependency is exactly the kind of coupling
   this file exists to avoid. */
let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not configured — cannot verify a customer session yet.');
    }
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

/* Verifies the Supabase access token on the incoming request and returns
   the VERIFIED user, or null if there isn't a valid one. Reads the token
   from an Authorization: Bearer <supabase access token> header — this is
   the browser's own Supabase session token, distinct from and never to
   be confused with FTM_WEBSITE_API_TOKEN below. */
async function verifyCustomer(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  // supabase.auth.getUser(jwt) checks the token against Supabase itself —
  // this is real verification, not a decode-and-trust of the JWT payload.
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data || !data.user) return null;
  verified.set(data.user.id, { emailVerified: !!data.user.email_confirmed_at, createdAt: data.user.created_at || null, at: Date.now() });
  return data.user; // { id, email, ... } — verified
}

/* Facts about each verified login, read server-side from Supabase (never from the browser), sent to the
   engine for its automatic re-link (contract: X-FTM-Relink-Capable). Kept per warm instance. */
const verified = new Map();

// Re-link only when the earlier login is really gone from Supabase: a definite "user not found".
async function previousLoginGone(subject) {
  if (!/^[0-9a-f-]{36}$/i.test(String(subject || ''))) return false;
  try {
    const r = await getSupabaseAdmin().auth.admin.getUserById(String(subject));
    if (r && r.data && r.data.user) return false;
    const e = r && r.error;
    return !!(e && (e.status === 404 || /not.?found/i.test(e.message || '')));
  } catch (e) { return false; }
}

/* Calls the FTM engine through the Cloudflare Access tunnel. `customerId`
   is required for every customer-scoped route and must come from
   verifyCustomer()'s result, never from the request itself — see the
   note above. Pass null for routes with no customer concept (health).

   Header contract v0.3 (engine session, confirmed): identity is asserted
   as X-FTM-Auth-Subject, the Supabase user id, NOT X-FTM-Customer-Id —
   the engine resolves/creates the customer row itself on first sight, so
   this function never needs to know or store an ftm.customers.id. Pass
   authEmail only alongside a brand-new signup; the engine uses it solely
   to populate a first-seen customer row, never to update an existing
   one — sending it on every request would let this header edit customer
   data, which it must never be able to do. */
async function callEngine(path, { method = 'GET', body = null, authSubject = null, authEmail = null, timeoutMs = 25000 } = {}) {
  const headers = {
    'Authorization': `Bearer ${process.env.FTM_WEBSITE_API_TOKEN}`,
    'Content-Type': 'application/json',
    'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID,
    'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET
  };
  if (authSubject !== null) headers['X-FTM-Auth-Subject'] = String(authSubject);
  if (authEmail !== null) headers['X-FTM-Auth-Email'] = String(authEmail);
  const facts = authSubject !== null ? verified.get(String(authSubject)) : null;
  if (authSubject !== null) {
    headers['X-FTM-Relink-Capable'] = '1';
    if (facts) {
      headers['X-FTM-Auth-Email-Verified'] = facts.emailVerified ? 'true' : 'false';
      if (facts.createdAt) headers['X-FTM-Auth-Created-At'] = String(facts.createdAt);
    }
  }

  const send = async (h) => {
    const r = await fetch(`${process.env.FTM_ENGINE_URL}${path}`, {
      method,
      headers: h,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs)
    });
    const j = await r.json().catch(() => ({}));
    return { r, j };
  };

  let { r, j } = await send(headers);

  // Automatic re-link (engine contract): retry ONCE when the email belongs to an earlier login that no longer
  // exists in Supabase and this login's email is verified. Never on a guess.
  const rl = j && j.error === 'EMAIL_ALREADY_REGISTERED' && j.relink;
  if (r.status === 409 && rl && (rl.reason === 'RELINK_NOT_REQUESTED' || rl.reason === 'RELINK_NOT_CONFIRMED') && rl.previous_subject && facts && facts.emailVerified
      && String(rl.previous_subject) !== String(authSubject) && await previousLoginGone(rl.previous_subject)) {
    const h2 = Object.assign({}, headers, {
      'X-FTM-Relink-From-Subject': String(rl.previous_subject),
      'X-FTM-Relink-Previous-Gone': 'true',
      'X-FTM-Auth-Email-Verified': 'true'
    });
    ({ r, j } = await send(h2));
    if (r.ok) console.error('engine re-link done for', authEmail);
    else console.error('engine re-link refused for', authEmail, j && j.relink && j.relink.reason);
  }

  // The earlier login's id never leaves the server.
  if (j && j.relink) { j = Object.assign({}, j); j.relink = { reason: j.relink.reason }; }
  return { ok: r.ok && j.ok !== false, status: r.status, body: j };
}

/* Maps an engine error to something safe to hand the browser — never
   forward the engine's raw response verbatim, per the contract's own
   error-code list (v0.1 §2). Unknown codes fall back to a generic message
   rather than leaking internal detail. */
const SAFE_MESSAGES = {
  UNAUTHENTICATED: 'Your session has expired. Log in again and retry.',
  CUSTOMER_NOT_FOUND: 'We could not find your account. Log out and log in again.',
  ACCOUNT_NOT_FOUND: 'That account could not be found.',
  ACCOUNT_NOT_OWNED: 'That account could not be found.', // deliberately identical to ACCOUNT_NOT_FOUND — never confirm existence of a resource that isn't yours
  VALIDATION_FAILED: 'Check the details you entered and try again.',
  ACKNOWLEDGEMENT_REQUIRED: 'This change needs your confirmation first.',
  MAINTENANCE_MODE: 'FTM is briefly in maintenance. Try again in a few minutes.'
};

function safeErrorMessage(engineBody) {
  const code = engineBody && engineBody.error;
  return SAFE_MESSAGES[code] || 'Something went wrong. Please try again.';
}

module.exports = { verifyCustomer, callEngine, safeErrorMessage };
