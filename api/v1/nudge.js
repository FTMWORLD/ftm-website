/* GET  /api/v1/nudge           -> {show}: may this visitor see the free sign-up pop-up? (no: this IP already saw it, signed up or logged in)
   POST /api/v1/nudge {act}     -> records 'shown' or 'customer' for the visitor's IP (stored only as a keyed hash). */
const { createClient } = require('@supabase/supabase-js');
const N = require('../_lib/nudge');
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY), ip = N.ipOf(req);
    if (req.method === 'GET') return res.status(200).json({ ok: true, show: !(await N.seen(admin, ip)) });
    if (req.method === 'POST') {
      let b = req.body || {}; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
      const act = b.act === 'customer' ? 'customer' : 'shown'; await N.mark(admin, ip, act);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ ok: false });
  } catch (e) { return res.status(200).json({ ok: true, show: false }); }
};
