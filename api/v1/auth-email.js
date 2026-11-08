/* POST /api/v1/auth-email {email, mode} — sends FTM's own branded account emails instead of Supabase's:
     signup  free account: "Welcome to FTM, create your password" (creates the account)
     login   6-digit login code plus a one-tap login button
     reset   forgot password: "Choose a new password" (only if the account exists)
   Always answers {ok:true} for a valid email, so it cannot be used to find out who has an account. */

const { createClient } = require('@supabase/supabase-js');
const { sendPasswordEmail, sendLoginEmail, sendResetEmail } = require('../_lib/passwordEmail');

const recent = new Map(); // best-effort limit on a warm instance: 5 per email per hour

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

  const now = Date.now(), hits = (recent.get(email) || []).filter(t => now - t < 3600000);
  if (hits.length >= 5) return res.status(200).json({ ok: true });
  hits.push(now); recent.set(email, hits);

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
