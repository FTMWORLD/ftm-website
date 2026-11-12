/* POST /api/v1/auth-email {email, mode} — sends FTM's own branded account emails instead of Supabase's:
     signup  free account: "Welcome to FTM, create your password" (creates the account)
     login   6-digit login code plus a one-tap login button
     reset   forgot password: "Choose a new password" (only if the account exists)
   Always answers {ok:true} for a valid email, so it cannot be used to find out who has an account. */

const { createClient } = require('@supabase/supabase-js');
const { sendPasswordEmail, sendLoginEmail, sendResetEmail } = require('../_lib/passwordEmail');

const recent = new Map(); // best-effort limit on a warm instance: 5 per email per hour
const perIp = new Map();  // and 8 per sender (IP) per hour, so the form cannot be used to email strangers in bulk
let hourKey = '', hourCount = 0; // and at most 300 account emails per hour per instance

async function findUser(admin, email) {
  for (let page = 1; page <= 20; page++) {
    const r = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (r.error) throw new Error(r.error.message);
    const hit = (r.data.users || []).find(u => String(u.email || '').toLowerCase() === email);
    if (hit) return hit;
    if ((r.data.users || []).length < 1000) break;
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const email = String(body.email || '').trim().toLowerCase().slice(0, 200);
  const mode = String(body.mode || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ ok: false, error: 'INVALID_EMAIL' });
  if (!/^(signup|login|reset)$/.test(mode)) return res.status(400).json({ ok: false, error: 'INVALID_MODE' });

  if (body.website) return res.status(200).json({ ok: true }); // hidden field only bots fill in
  const now = Date.now(), hits = (recent.get(email) || []).filter(t => now - t < 3600000);
  if (hits.length >= 5) return res.status(200).json({ ok: true });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const ipHits = (perIp.get(ip) || []).filter(t => now - t < 3600000);
  if (ipHits.length >= 8) { console.error('auth-email: sender limit', ip.slice(0, 20)); return res.status(429).json({ ok: false, error: 'TOO_MANY' }); }
  const hk = new Date().toISOString().slice(0, 13); if (hk !== hourKey) { hourKey = hk; hourCount = 0; }
  if (++hourCount > 300) { console.error('auth-email: hourly cap reached'); return res.status(429).json({ ok: false, error: 'TOO_MANY' }); }
  hits.push(now); recent.set(email, hits); ipHits.push(now); perIp.set(ip, ipHits);

  try {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const user = await findUser(admin, email);
    const name = user && user.user_metadata && user.user_metadata.full_name || '';
    if (mode === 'signup') {
      // Someone who already has a password and signs up again gets a login code instead of a new password.
      if (user && user.user_metadata && user.user_metadata.password_set) await sendLoginEmail(admin, email, { name });
      else await sendPasswordEmail(admin, email, { free: true, name });
    } else if (mode === 'login') {
      await sendLoginEmail(admin, email, { name });
    } else if (user) {
      await sendResetEmail(admin, email, { name });
    }
  } catch (e) {
    console.error('auth-email:', mode, 'failed for', email, e.message);
    return res.status(502).json({ ok: false, error: 'EMAIL_FAILED' });
  }
  return res.status(200).json({ ok: true });
};
