/* One place that sends every FTM email.
   - Google Workspace (SMTP) when SMTP_USER and SMTP_PASS are set in Vercel (from SMTP_FROM, default no-reply@ftmwealthnation.com).
   - Otherwise Brevo's API (BREVO_API_KEY), as before.
   sendMail({ to, subject, html, fromName, replyTo }) resolves to the provider used, or throws with the reason. */
let transporter = null;
function smtpOn() { return !!(process.env.SMTP_USER && process.env.SMTP_PASS); }
function from() { return process.env.SMTP_FROM || 'no-reply@ftmwealthnation.com'; }
function getTransport() {
  if (transporter) return transporter;
  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com', port: +(process.env.SMTP_PORT || 587), secure: +(process.env.SMTP_PORT || 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: String(process.env.SMTP_PASS).replace(/\s+/g, '') },
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000
  });
  return transporter;
}
async function sendMail(o) {
  const to = Array.isArray(o.to) ? o.to : [o.to];
  const fromName = o.fromName || 'FTM', replyTo = o.replyTo || process.env.SUPPORT_EMAIL || (smtpOn() ? process.env.SMTP_USER : 'ftmwebnation@gmail.com');
  if (smtpOn()) {
    await getTransport().sendMail({ from: { name: fromName, address: from() }, to, replyTo, subject: o.subject, html: o.html });
    return 'google';
  }
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error('No email provider configured (SMTP_USER/SMTP_PASS or BREVO_API_KEY)');
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { email: 'no-reply@ftmwealthnation.com', name: fromName }, replyTo: { email: replyTo }, to: to.map(email => ({ email })), subject: o.subject, htmlContent: o.html }),
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error('Brevo ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return 'brevo';
}
async function verify() { if (!smtpOn()) return null; await getTransport().verify(); return 'google smtp ok (' + from() + ')'; }
module.exports = { sendMail, verify, smtpOn, _reset: () => { transporter = null; } };
