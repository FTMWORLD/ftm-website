/* GET /api/v1/renew-cron — run daily by a Vercel cron (see vercel.json). Emails plan renewal reminders: from 30 days before
   a plan ends, then weekly until it is renewed, and weekly during the one-month grace after it ends (api/_lib/renewals.js).
   When work is left it calls itself again. If CRON_SECRET is set in Vercel, only the cron (and this function) can call it. */
const { createClient } = require('@supabase/supabase-js');
const R = require('../_lib/renewals');

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== 'Bearer ' + secret) return res.status(401).json({ ok: false });
  try {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const r = await R.run(admin, { deadline: Date.now() + 42000 });
    if (r.more) {
      const hop = (+req.query.hop || 0) + 1;
      if (hop <= 60) {
        const base = (process.env.SITE_URL || 'https://www.ftmwealthnation.com').replace(/\/$/, '');
        await Promise.race([fetch(base + '/api/v1/renew-cron?hop=' + hop, { headers: secret ? { authorization: 'Bearer ' + secret } : {} }).catch(() => null), new Promise(r2 => setTimeout(r2, 2500))]);
      }
    }
    console.log('renew-cron', JSON.stringify(r.log.slice(-20)));
    return res.status(200).json({ ok: true, more: r.more, sent: r.sent });
  } catch (e) { console.error('renew-cron', e.message); return res.status(500).json({ ok: false, error: String(e.message || '').slice(0, 120) }); }
};
