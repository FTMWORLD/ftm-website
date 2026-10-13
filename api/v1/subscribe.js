/* POST /api/v1/subscribe — adds a visitor's email to the FTM mailing list
   in Brevo. Body: {email, source, consent}. Needs two Vercel environment
   variables: BREVO_API_KEY and BREVO_LIST_ID. Only stores the email when
   the visitor ticked the consent box. */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const email = String(body.email || '').trim().toLowerCase();
  const source = String(body.source || 'site').slice(0, 30);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return res.status(400).json({ ok: false, error: 'BAD_EMAIL' });
  if (body.consent !== true) return res.status(400).json({ ok: false, error: 'NO_CONSENT' });
  const key = process.env.BREVO_API_KEY, list = parseInt(process.env.BREVO_LIST_ID, 10);
  if (!key || !list) return res.status(503).json({ ok: false, error: 'NOT_CONFIGURED' });
  try {
    const r = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ email, listIds: [list], updateEnabled: true })
    });
    if (r.ok || r.status === 204) return res.status(200).json({ ok: true, source });
    console.error('Brevo error', r.status, await r.text());
    return res.status(502).json({ ok: false, error: 'LIST_FAILED' });
  } catch (e) {
    console.error('Brevo unreachable', e.message);
    return res.status(502).json({ ok: false, error: 'LIST_FAILED' });
  }
};
