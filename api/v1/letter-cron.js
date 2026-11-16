/* GET /api/v1/letter-cron — run daily by a Vercel cron (see vercel.json). Writes last month's Letter from FTM on the 1st,
   sends it from the 2nd at 09:00 UTC (see api/_lib/letterAuto.js). When work is left (many members or languages)
   it calls itself again until everything is sent. If CRON_SECRET is set in Vercel, only the cron (and this function) can call it. */
const { createClient } = require('@supabase/supabase-js');
const Auto = require('../_lib/letterAuto');

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== 'Bearer ' + secret) return res.status(401).json({ ok: false });
  try {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const r = await Auto.run(admin, { deadline: Date.now() + 42000 });
    if (r.more) {
      const hop = (+req.query.hop || 0) + 1;
      if (hop <= 40) {
        const base = (process.env.SITE_URL || 'https://www.ftmwealthnation.com').replace(/\/$/, '');
        await Promise.race([fetch(base + '/api/v1/letter-cron?hop=' + hop, { headers: secret ? { authorization: 'Bearer ' + secret } : {} }).catch(() => null), new Promise(r2 => setTimeout(r2, 2500))]);
      }
    }
    console.log('letter-cron', JSON.stringify(r.log));
    return res.status(200).json({ ok: true, more: r.more, log: r.log });
  } catch (e) { console.error('letter-cron', e.message); return res.status(500).json({ ok: false, error: String(e.message || '').slice(0, 120) }); }
};
