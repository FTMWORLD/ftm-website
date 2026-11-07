/* POST /api/v1/password-link {email} — emails a fresh "create your password" link when the one in the
   welcome email has expired or was already used. Always answers {ok:true}, whether or not the email has an
   account, so it cannot be used to find out who is a customer. Only existing accounts get an email. */

const { createClient } = require('@supabase/supabase-js');
const { sendPasswordEmail } = require('../_lib/passwordEmail');

const recent = new Map(); // best-effort limit on a warm instance: 3 per email per hour

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const email = String(body.email || '').trim().toLowerCase().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ ok: false, error: 'INVALID_EMAIL' });

  const now = Date.now(), hits = (recent.get(email) || []).filter(t => now - t < 3600000);
  if (hits.length >= 3) return res.status(200).json({ ok: true });
  hits.push(now); recent.set(email, hits);

  try {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    let found = null;
    for (let page = 1; page <= 20 && !found; page++) {
      const r = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (r.error) throw new Error(r.error.message);
      found = (r.data.users || []).find(u => String(u.email || '').toLowerCase() === email);
      if ((r.data.users || []).length < 1000) break;
    }
    if (found) {
      const meta = found.user_metadata || {};
      await sendPasswordEmail(admin, email, { name: meta.full_name || '', fresh: true });
    }
  } catch (e) {
    console.error('password-link: failed for', email, e.message);
  }
  return res.status(200).json({ ok: true });
};
