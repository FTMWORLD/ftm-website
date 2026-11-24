/* GET /api/v1/news-cron — run by Vercel cron at 16:05 and 17:05 UTC (see vercel.json); the one that falls on 18:05 in
   Europe/Berlin (summer or winter time) posts the FTM master account's results (18:05 UTC is a catch-up: nothing is ever posted or emailed twice) on FTM news and emails every member the same result for their own accounts (see api/_lib/results.js). Calls itself again until every email is out.
   ?sample=1 emails the owners a sample weekly summary and monthly statement (?sample=day: today's daily result) of their own accounts (max once per 10 min).
   If CRON_SECRET is set in Vercel, only the cron can call it. */
const { createClient } = require('@supabase/supabase-js');
const R = require('../_lib/results');

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== 'Bearer ' + secret) return res.status(401).json({ ok: false });
  try {
    if (req.query && req.query.sample) { const admin0 = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY), r0 = await R.samples(admin0, String(req.query.sample)); console.log('news-cron samples', JSON.stringify(r0.log)); return res.status(200).json({ ok: true, log: r0.log }); }
    const t0 = Date.now(), hop0 = +req.query.hop || 0;
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const r = await R.run(admin, {}), m = await R.mail(admin, { deadline: t0 + 30000, chain: hop0 > 0 }), log = r.log.concat(m.log);
    if (m.more) {
      const hop = hop0 + 1;
      if (hop <= 300) { const base = (process.env.SITE_URL || 'https://www.ftmwealthnation.com').replace(/\/$/, '');
        await Promise.race([fetch(base + '/api/v1/news-cron?hop=' + hop, { headers: secret ? { authorization: 'Bearer ' + secret } : {} }).catch(() => null), new Promise(r2 => setTimeout(r2, 2500))]); }
    }
    console.log('news-cron', JSON.stringify(log));
    return res.status(200).json({ ok: true, more: m.more, log });
  } catch (e) { console.error('news-cron', e.message); return res.status(500).json({ ok: false, error: String(e.message || '').slice(0, 120) }); }
};
