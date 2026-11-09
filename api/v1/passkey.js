/* POST /api/v1/passkey {action, ...}: Face ID / fingerprint login (WebAuthn passkeys).
     register-options  (logged in)  options to create a passkey on this device
     register-verify   (logged in)  stores the new passkey on the user (app_metadata.passkeys)
     login-options                  options to sign in with a passkey
     login-verify                   checks the passkey and returns a one-time login token
     status            (logged in)  how many passkeys the user has
     remove-all        (logged in)  turns Face ID login off for every device
   No database table is needed: passkeys live in the user's app_metadata, which only the server can write.
   Challenges are stateless: signed with a key derived from the service role key, valid for 3 minutes. */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

let SW = null;
function sw() { return SW || (SW = require('@simplewebauthn/server')); }

const RP_NAME = 'FTM';
const TTL = 180000;
const used = new Map();

function rpOf(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0].toLowerCase();
  if (host === 'ftmwealthnation.com' || host.endsWith('.ftmwealthnation.com')) {
    return { rpID: 'ftmwealthnation.com', origins: ['https://www.ftmwealthnation.com', 'https://ftmwealthnation.com'] };
  }
  return null;
}

function key() { return crypto.createHmac('sha256', String(process.env.SUPABASE_SERVICE_ROLE_KEY || '')).update('ftm-passkey-state-v1').digest(); }
function b64u(buf) { return Buffer.from(buf).toString('base64url'); }
function sign(obj) {
  const body = b64u(JSON.stringify(obj));
  return body + '.' + b64u(crypto.createHmac('sha256', key()).update(body).digest());
}
function unsign(state, kind) {
  const [body, mac] = String(state || '').split('.');
  if (!body || !mac) return null;
  const want = b64u(crypto.createHmac('sha256', key()).update(body).digest());
  if (want.length !== mac.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(mac))) return null;
  let o; try { o = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch (e) { return null; }
  if (!o || o.k !== kind || !o.e || o.e < Date.now()) return null;
  return o;
}
function once(challenge) {
  const now = Date.now();
  for (const [c, t] of used) if (t < now) used.delete(c);
  if (used.has(challenge)) return false;
  used.set(challenge, now + TTL);
  return true;
}

async function userFromToken(admin, req) {
  const h = String(req.headers.authorization || '');
  const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!tok) return null;
  const r = await admin.auth.getUser(tok);
  return (r && r.data && r.data.user) || null;
}

function deviceLabel(req) {
  const ua = String(req.headers['user-agent'] || '');
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'Device';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const action = String(body.action || '');
  const rp = rpOf(req);
  if (!rp) return res.status(400).json({ ok: false, error: 'UNSUPPORTED_HOST' });

  try {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const S = sw();

    if (action === 'register-options' || action === 'register-verify' || action === 'status' || action === 'remove-all') {
      const user = await userFromToken(admin, req);
      if (!user) return res.status(401).json({ ok: false, error: 'NOT_LOGGED_IN' });
      const meta = user.app_metadata || {};
      const list = Array.isArray(meta.passkeys) ? meta.passkeys : [];

      if (action === 'status') return res.status(200).json({ ok: true, count: list.length });

      if (action === 'remove-all') {
        await admin.auth.admin.updateUserById(user.id, { app_metadata: Object.assign({}, meta, { passkeys: [] }) });
        return res.status(200).json({ ok: true, count: 0 });
      }

      if (action === 'register-options') {
        const options = await S.generateRegistrationOptions({
          rpName: RP_NAME, rpID: rp.rpID,
          userName: user.email, userDisplayName: (user.user_metadata && user.user_metadata.full_name) || user.email,
          userID: new TextEncoder().encode(user.id),
          attestationType: 'none',
          excludeCredentials: list.map(p => ({ id: p.id, transports: p.transports || undefined })),
          authenticatorSelection: { residentKey: 'required', userVerification: 'required' }
        });
        return res.status(200).json({ ok: true, options, state: sign({ k: 'reg', c: options.challenge, u: user.id, e: Date.now() + TTL }) });
      }

      const st = unsign(body.state, 'reg');
      if (!st || st.u !== user.id || !once(st.c)) return res.status(400).json({ ok: false, error: 'EXPIRED' });
      const v = await S.verifyRegistrationResponse({
        response: body.response, expectedChallenge: st.c, expectedOrigin: rp.origins, expectedRPID: rp.rpID, requireUserVerification: true
      });
      if (!v.verified || !v.registrationInfo) return res.status(400).json({ ok: false, error: 'NOT_VERIFIED' });
      const c = v.registrationInfo.credential;
      const rec = {
        id: c.id, pk: b64u(c.publicKey), counter: c.counter || 0,
        transports: (body.response && body.response.response && body.response.response.transports) || c.transports || [],
        device: deviceLabel(req), created: new Date().toISOString()
      };
      const next = list.filter(p => p.id !== rec.id).concat([rec]).slice(-10);
      await admin.auth.admin.updateUserById(user.id, { app_metadata: Object.assign({}, meta, { passkeys: next }) });
      return res.status(200).json({ ok: true, count: next.length });
    }

    if (action === 'login-options') {
      const options = await S.generateAuthenticationOptions({ rpID: rp.rpID, userVerification: 'required', allowCredentials: [] });
      return res.status(200).json({ ok: true, options, state: sign({ k: 'auth', c: options.challenge, e: Date.now() + TTL }) });
    }

    if (action === 'login-verify') {
      const st = unsign(body.state, 'auth');
      const resp = body.response || {};
      if (!st) return res.status(400).json({ ok: false, error: 'EXPIRED' });
      const handle = resp.response && resp.response.userHandle;
      let uid = '';
      try { uid = Buffer.from(String(handle || ''), 'base64url').toString('utf8'); } catch (e) { uid = ''; }
      if (!/^[0-9a-f-]{36}$/i.test(uid)) return res.status(400).json({ ok: false, error: 'UNKNOWN_PASSKEY' });
      const g = await admin.auth.admin.getUserById(uid);
      const user = g && g.data && g.data.user;
      const meta = (user && user.app_metadata) || {};
      const list = Array.isArray(meta.passkeys) ? meta.passkeys : [];
      const pk = list.find(p => p.id === resp.id);
      if (!user || !pk) return res.status(400).json({ ok: false, error: 'UNKNOWN_PASSKEY' });
      if (!once(st.c)) return res.status(400).json({ ok: false, error: 'EXPIRED' });
      const v = await S.verifyAuthenticationResponse({
        response: resp, expectedChallenge: st.c, expectedOrigin: rp.origins, expectedRPID: rp.rpID, requireUserVerification: true,
        credential: { id: pk.id, publicKey: Buffer.from(pk.pk, 'base64url'), counter: pk.counter || 0, transports: pk.transports || undefined }
      });
      if (!v.verified) return res.status(400).json({ ok: false, error: 'NOT_VERIFIED' });
      const updated = list.map(p => p.id === pk.id ? Object.assign({}, p, { counter: v.authenticationInfo.newCounter, used: new Date().toISOString() }) : p);
      await admin.auth.admin.updateUserById(user.id, { app_metadata: Object.assign({}, meta, { passkeys: updated }) });
      const link = await admin.auth.admin.generateLink({ type: 'magiclink', email: user.email });
      const th = link && link.data && link.data.properties && link.data.properties.hashed_token;
      if (!th) return res.status(502).json({ ok: false, error: 'LOGIN_FAILED' });
      return res.status(200).json({ ok: true, email: user.email, token_hash: th });
    }

    return res.status(400).json({ ok: false, error: 'INVALID_ACTION' });
  } catch (e) {
    console.error('passkey:', action, e && e.message);
    return res.status(500).json({ ok: false, error: 'PASSKEY_FAILED' });
  }
};
