/* POST /api/v1/client-log: records why a customer action stopped in the browser (no personal data),
   so a failed connect can be traced in the server logs. A trading account stuck on "Connecting" for
   10 minutes (ev connect_stuck) also emails the FTM support inbox once, so support knows before the customer asks. */
const recent = new Map();
const mailed = new Map();
let mailDay = '', mailCount = 0;
const ALERT_TO = 'ftmwebnation@gmail.com';

async function alertStuck(acct, why, mins) {
  const env = process.env;
  if (!env.BREVO_API_KEY) return false;
  const now = Date.now(), last = mailed.get(acct) || 0;
  if (now - last < 6 * 3600e3) return false;
  const day = new Date().toISOString().slice(0, 10);
  if (day !== mailDay) { mailDay = day; mailCount = 0; }
  if (mailCount >= 20) return false;
  mailed.set(acct, now); mailCount++;
  const html = '<table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;"><tr><td style="padding:32px 20px;">'
    + '<p style="font-size:22px;font-weight:bold;color:#0b1640;margin:0 0 12px;">A trading account is stuck on "Connecting"</p>'
    + '<p style="color:#444;margin:0 0 8px;">Account <b>' + acct + '</b> has shown "Connecting" for ' + mins + ' minutes and FTM\'s engine has not read it yet.</p>'
    + '<p style="color:#444;margin:0 0 8px;">Engine status: <b>' + (why || 'not given') + '</b></p>'
    + '<p style="color:#444;margin:0;">Please ask FTM ENGINE (via FTM MACHINE) to check this account. The customer sees that FTM is checking it.</p></td></tr>'
    + '<tr><td align="center" bgcolor="#0b1640" style="background-color:#0b1640;background-image:linear-gradient(#0b1640,#0b1640);padding:28px 20px;"><p style="margin:0 0 14px;color:#D4AF37;font-size:18px;font-weight:bold;">Invest today, secure tomorrow.</p>'
    + '<table cellpadding="0" cellspacing="0"><tr><td style="padding-right:10px;"><img src="https://www.ftmwealthnation.com/email-logo.png" width="40" height="40" alt="" style="display:block;border-radius:10px;"></td><td style="color:#fff;font-size:26px;font-weight:bold;">FTM</td></tr></table>'
    + '<p style="margin:14px 0 0;color:#9aa3c7;font-size:11px;">Follow The Market Ltd. · Internal monitoring email.</p></td></tr></table>';
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { email: 'no-reply@ftmwealthnation.com', name: 'FTM watchdog' }, to: [{ email: ALERT_TO }],
        subject: 'FTM: account ' + acct + ' stuck on Connecting (' + mins + ' min)', htmlContent: html })
    });
    return r.ok;
  } catch (e) { console.error('connect_stuck alert failed', e.message); return false; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const now = Date.now(), hits = (recent.get(ip) || []).filter(t => now - t < 60000);
  if (hits.length >= 20) return res.status(204).end();
  hits.push(now); recent.set(ip, hits);
  const clean = v => String(v == null ? '' : v).replace(/[^\w:.\- ]/g, '').slice(0, 60);
  console.log('client-log', JSON.stringify({ ev: clean(b.ev), reason: clean(b.reason), live: !!b.live, at: clean(b.at), ua: clean(String(req.headers['user-agent'] || '').slice(0, 60)) }));
  if (b.ev === 'connect_stuck') {
    const m = /^(\d{4,14}) (\w{0,40}) (\d{1,5})$/.exec(String(b.reason || ''));
    if (m && +m[3] >= 10) await alertStuck(m[1], m[2], +m[3]);
  }
  return res.status(204).end();
};
