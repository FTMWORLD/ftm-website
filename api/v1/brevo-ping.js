/* GET /api/v1/brevo-ping — run weekly by a Vercel cron (see vercel.json).
   Makes one harmless call to Brevo so the API key is used at least once a
   week; Brevo expires keys after 90 days without use. If CRON_SECRET is
   set in Vercel, only Vercel's cron (which sends it) can call this. */

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== 'Bearer ' + secret) return res.status(401).json({ ok: false });
  const key = process.env.BREVO_API_KEY;
  if (!key) return res.status(503).json({ ok: false, error: 'NOT_CONFIGURED' });
  try {
    const r = await fetch('https://api.brevo.com/v3/account', { headers: { 'api-key': key, accept: 'application/json' } });
    if (!r.ok) console.error('Brevo key check failed', r.status);
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  } catch (e) {
    console.error('Brevo unreachable', e.message);
    return res.status(502).json({ ok: false });
  }
};
