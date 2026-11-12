/* Every account email FTM sends (no Supabase default emails anywhere):
   paid    — after payment: create your password
   free    — free sign-up: create your password
   fresh   — a new link when the first one expired (paid or free)
   login   — 6-digit login code plus a one-tap login button
   reset   — forgot password: choose a new password
   Supabase only makes the secure one-time links and codes (generateLink sends nothing itself); Brevo sends
   our own branded email. */

const SITE = () => (process.env.SITE_URL || 'https://www.ftmwealthnation.com').replace(/\/$/, '');

async function link(admin, type, email, redirectTo) {
  const r = await admin.auth.admin.generateLink({ type, email, options: { redirectTo } });
  if (r.error) return { error: r.error };
  const p = (r.data && r.data.properties) || {};
  return { userId: r.data && r.data.user && r.data.user.id, link: p.action_link, otp: p.email_otp };
}

// A "create your password" link; creates the account when it does not exist yet.
async function makeLink(admin, email, free) {
  const redirectTo = SITE() + '/?setpw=1' + (free ? '&free=1' : '') + '&e=' + encodeURIComponent(email);
  let r = await link(admin, 'invite', email, redirectTo), kind = 'invite';
  if (r.error && /already|registered|exists/i.test(r.error.message || '')) { r = await link(admin, 'recovery', email, redirectTo); kind = 'recovery'; }
  if (r.error) throw new Error(r.error.message);
  return Object.assign(r, { kind });
}

function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function shell(title, body) {
  return '<table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;">'
    + '<tr><td bgcolor="#0b1640" style="background-color:#0b1640;padding:22px 24px;"><table cellpadding="0" cellspacing="0"><tr><td style="padding-right:10px;"><img src="https://www.ftmwealthnation.com/email-logo.png" width="34" height="34" alt="" style="display:block;border-radius:8px;"></td><td style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:.02em;">FTM</td></tr></table></td></tr>'
    + '<tr><td style="height:4px;background:#D4AF37;background-image:linear-gradient(90deg,#D4AF37,#f3d77a,#D4AF37);font-size:0;line-height:0;">&nbsp;</td></tr>'
    + '<tr><td style="padding:34px 24px 8px;"><p style="font-size:26px;font-weight:bold;color:#0b1640;margin:0 0 16px;">' + esc(title) + '</p>' + body + '</td></tr>'
    + '<tr><td align="center" bgcolor="#0b1640" style="background-color:#0b1640;padding:28px 20px;">'
    + '<p style="margin:0 0 14px;color:#D4AF37;font-size:18px;font-weight:bold;letter-spacing:.04em;">Invest today, secure tomorrow.</p>'
    + '<table cellpadding="0" cellspacing="0"><tr><td style="padding-right:10px;"><img src="https://www.ftmwealthnation.com/email-logo.png" width="38" height="38" alt="" style="display:block;border-radius:9px;"></td><td style="color:#ffffff;font-size:26px;font-weight:bold;">FTM</td></tr></table>'
    + '<p style="margin:16px 0 0;color:#9aa3c7;font-size:11px;line-height:1.5;">Trading involves risk; past results do not guarantee future returns.<br>Follow The Market Ltd. · You get this email because of your FTM account. '
    + '<a href="mailto:ftmwebnation@gmail.com?subject=Unsubscribe" style="color:#9aa3c7;">Unsubscribe</a></p></td></tr></table>';
}
const P = (t, small) => '<p style="font-size:' + (small ? '14px' : '16px') + ';line-height:1.55;color:' + (small ? '#555' : '#333') + ';margin:0 0 14px;">' + t + '</p>';
const BTN = (href, label) => '<table cellpadding="0" cellspacing="0" style="margin:22px 0 26px;"><tr><td bgcolor="#E5323E" style="border-radius:999px;"><a href="' + esc(href) + '" style="display:inline-block;padding:15px 30px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:999px;">' + esc(label) + '</a></td></tr></table>';
const SAFE = P('<b>Safety first:</b> FTM only asks for your MT5 password inside the Connect account form. We never ask for it by email, chat or phone.', true);
const hello = name => P(name ? 'Hello ' + esc(String(name).split(' ')[0]) + ',' : 'Hello,');

function html(kind, o) {
  if (kind === 'login') return shell('Your FTM login code', hello(o.name)
    + P('Enter this code on the FTM log-in screen, or tap the button to log straight in.')
    + '<p style="margin:20px 0 6px;font-size:36px;font-weight:bold;letter-spacing:.32em;color:#0b1640;font-family:Arial,Helvetica,sans-serif;">' + esc(o.otp) + '</p>'
    + BTN(o.link, 'Log in to FTM')
    + P('The code and button work once and expire soon. If you did not ask to log in, you can ignore this email.', true) + SAFE);
  if (kind === 'reset') return shell('Reset your FTM password', hello(o.name)
    + P('Tap the button to choose a new password. You then go straight into your client area.')
    + BTN(o.link, 'Choose a new password')
    + P('The button works once and expires soon. If you did not ask for this, you can ignore this email: your password stays the same.', true) + SAFE);
  const free = kind === 'free' || (kind === 'fresh' && o.free);
  const lead = kind === 'fresh'
    ? 'Here is your new link to create your FTM password.'
    : free ? 'Your free FTM account is ready. Create your password to open your client area.'
    : 'Your payment went through and your FTM account is ready. Create your password to open your client area.';
  const next = free
    ? 'After you create your password you go straight into your client area. Look around the leaderboard, charts and community, and subscribe whenever you want FTM MACHINE to trade for you.'
    : o.product === 'invest'
    ? 'After you create your password you go straight into your client area, where you follow the FTM account and your share.'
    : 'After you create your password you go straight into your client area. Then open the menu (&#8801;) at the top right, click <b>Activate FTM MACHINE</b> and enter your MT5 server, account number and master password. FTM MACHINE starts trading automatically.';
  return shell('Welcome to FTM', hello(o.name) + P(lead) + BTN(o.link, 'Create my password')
    + P('<b>Next step:</b> ' + next)
    + P('This button works once. If it has expired, just tap it anyway: FTM sends you a fresh link straight away.', true) + SAFE);
}

async function send(email, subject, htmlContent) {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error('BREVO_API_KEY missing');
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { email: 'no-reply@ftmwealthnation.com', name: 'FTM' }, replyTo: { email: 'ftmwebnation@gmail.com', name: 'FTM support' }, to: [{ email }], subject, htmlContent }),
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error('Brevo ' + r.status + ' ' + (await r.text()).slice(0, 200));
}

// When Brevo refuses to send (for example while Brevo reviews the account), the same secure link is sent
// through Supabase's own mailer instead, so nobody is left without their email. Logged as email_fallback.
async function sendOrFallback(admin, email, subject, htmlContent, fallback) {
  try { await send(email, subject, htmlContent); return 'brevo'; }
  catch (e) {
    console.error('email_fallback', subject.slice(0, 40), e.message.slice(0, 160));
    const r = await fallback();
    if (r && r.error) throw new Error('Brevo failed (' + e.message.slice(0, 80) + ') and Supabase fallback failed (' + r.error.message + ')');
    return 'supabase';
  }
}

// Paid or free "create your password" email (creates the account if needed). Returns { userId, kind }.
async function sendPasswordEmail(admin, email, opts) {
  opts = opts || {};
  const free = !!opts.free;
  const m = await makeLink(admin, email, free);
  if (!m.link) throw new Error('no link from Supabase');
  const kind = opts.fresh ? 'fresh' : (free ? 'free' : 'paid');
  const subject = opts.fresh ? 'Your new FTM password link' : free ? 'Welcome to FTM: create your password' : 'Welcome to FTM: create your password';
  const redirectTo = SITE() + '/?setpw=1' + (free ? '&free=1' : '') + '&e=' + encodeURIComponent(email);
  const via = await sendOrFallback(admin, email, subject, html(kind, { link: m.link, name: opts.name, product: opts.product, free }),
    () => admin.auth.resetPasswordForEmail(email, { redirectTo }));
  return { userId: m.userId, kind: m.kind, via };
}

// 6-digit login code + one-tap link. Creates a free account first when the email is new (as before).
async function sendLoginEmail(admin, email, opts) {
  opts = opts || {};
  let r = await link(admin, 'magiclink', email, SITE() + '/?login=1');
  if (r.error && /not.*found|no user|does not exist/i.test(r.error.message || '')) {
    await makeLink(admin, email, true);
    r = await link(admin, 'magiclink', email, SITE() + '/?login=1');
  }
  if (r.error) throw new Error(r.error.message);
  await sendOrFallback(admin, email, 'Your FTM login code: ' + r.otp, html('login', { link: r.link, otp: r.otp, name: opts.name }),
    () => admin.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: SITE() + '/?login=1' } }));
}

async function sendResetEmail(admin, email, opts) {
  opts = opts || {};
  const r = await link(admin, 'recovery', email, SITE() + '/');
  if (r.error) throw new Error(r.error.message);
  await sendOrFallback(admin, email, 'Reset your FTM password', html('reset', { link: r.link, name: opts.name }),
    () => admin.auth.resetPasswordForEmail(email, { redirectTo: SITE() + '/' }));
}

module.exports = { sendPasswordEmail, sendLoginEmail, sendResetEmail, makeLink, html };
