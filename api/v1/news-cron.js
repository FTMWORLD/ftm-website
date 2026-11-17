/* GET /api/v1/news-cron — run by Vercel cron at 21:00 and 22:00 UTC (see vercel.json); the one that falls on 23:00 in
   Europe/Berlin (summer or winter time) posts the FTM master account's results on FTM news and emails them to every member (see api/_lib/results.js). Calls itself again until every email is out.
   If CRON_SECRET is set in Vercel, only the cron can call it. */
const { createClient } = require('@supabase/supabase-js');
const R = require('../_lib/results');

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== 'Bearer ' + secret) return res.status(401).json({ ok: false });
  try {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const r = await R.run(admin, {}), t0 = Date.now(), m = await R.mail(admin, { deadline: t0 + 40000 }), log = r.log.concat(m.log);
    if (m.more) {
      const hop = (+req.query.hop || 0) + 1;
      if (hop <= 40) { const base = (process.env.SITE_URL || 'https://www.ftmwealthnation.com').replace(/\/$/, '');
        await Promise.race([fetch(base + '/api/v1/news-cron?hop=' + hop, { headers: secret ? { authorization: 'Bearer ' + secret } : {} }).catch(() => null), new Promise(r2 => setTimeout(r2, 2500))]); }
    }
    console.log('news-cron', JSON.stringify(log));
    return res.status(200).json({ ok: true, more: m.more, log });
  } catch (e) { console.error('news-cron', e.message); return res.status(500).json({ ok: false, error: String(e.message || '').slice(0, 120) }); }
};
