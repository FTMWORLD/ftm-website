/* One place that sends every FTM email. Providers are tried in this order; if one refuses, the next one sends:
   1. Resend (RESEND_API_KEY), from MAIL_FROM or no-reply@ftmwealthnation.com
   2. SMTP mailbox (SMTP_USER + SMTP_PASS; Gmail / Google Workspace by default, SMTP_HOST/SMTP_PORT for others),
      from SMTP_FROM, or the mailbox itself
   3. Brevo (BREVO_API_KEY), legacy
   sendMail({ to, subject, html, fromName, replyTo }) resolves to the provider used, or throws with every reason. */
let transporter = null;
function smtpOn() { return !!(process.env.SMTP_USER && process.env.SMTP_PASS); }
function from() { return process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@ftmwealthnation.com'; }
function resendOn() { return !!process.env.RESEND_API_KEY; }
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
async function viaResend(o, to, fromName, replyTo) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ from: fromName + ' <' + (process.env.MAIL_FROM || 'no-reply@ftmwealthnation.com') + '>', to, reply_to: replyTo, subject: o.subject, html: o.html }),
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error('Resend ' + r.status + ' ' + (await r.text()).slice(0, 200));
}
async function viaSmtp(o, to, fromName, replyTo) {
  await getTransport().sendMail({ from: { name: fromName, address: from() }, to, replyTo, subject: o.subject, html: o.html });
}
async function viaBrevo(o, to, fromName, replyTo) {
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { email: 'no-reply@ftmwealthnation.com', name: fromName }, replyTo: { email: replyTo }, to: to.map(email => ({ email })), subject: o.subject, htmlContent: o.html }),
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error('Brevo ' + r.status + ' ' + (await r.text()).slice(0, 200));
}
async function sendMail(o) {
  const to = Array.isArray(o.to) ? o.to : [o.to];
  const fromName = o.fromName || 'FTM', replyTo = o.replyTo || process.env.SUPPORT_EMAIL || process.env.SMTP_USER || 'ftmwebnation@gmail.com';
  const chain = [];
  if (resendOn()) chain.push(['resend', viaResend]);
  if (smtpOn()) chain.push([/gmail/.test(process.env.SMTP_HOST || 'smtp.gmail.com') ? 'google' : 'smtp', viaSmtp]);
  if (process.env.BREVO_API_KEY) chain.push(['brevo', viaBrevo]);
  if (!chain.length) throw new Error('No email provider configured (RESEND_API_KEY, SMTP_USER/SMTP_PASS or BREVO_API_KEY)');
  const errs = [];
  for (const [name, fn] of chain) {
    try { await fn(o, to, fromName, replyTo); if (errs.length) console.error('mail: sent via', name, 'after', errs.join(' | ')); return name; }
    catch (e) { errs.push(name + ': ' + String(e.message).slice(0, 160)); }
  }
  throw new Error(errs.join(' | '));
}
async function verify() {
  const out = [];
  if (resendOn()) { const r = await fetch('https://api.resend.com/domains', { headers: { authorization: 'Bearer ' + process.env.RESEND_API_KEY }, signal: AbortSignal.timeout(8000) });
    if (r.status === 401 || r.status === 403) throw new Error('Resend refused the API key (' + r.status + ')');
    const j = await r.json().catch(() => ({})); const d = (j.data || []).find(x => /ftmwealthnation\.com$/.test(x.name || ''));
    out.push('Resend ' + (d ? 'domain ' + d.status : 'key ok')); }
  if (smtpOn()) { await getTransport().verify(); out.push('mailbox ' + from() + ' ok'); }
  return out.length ? out.join(' · ') : null;
}
module.exports = { sendMail, verify, smtpOn, resendOn, _reset: () => { transporter = null; } };
