/* Every account email FTM sends (no Supabase default emails anywhere):
   paid    — after payment: create your password
   free    — free sign-up: create your password
   fresh   — a new link when the first one expired (paid or free)
   login   — 6-digit login code plus a one-tap login button
   reset   — forgot password: choose a new password
   Supabase only makes the secure one-time links and codes (generateLink sends nothing itself); our own branded
   email goes out through api/_lib/mail.js (Google Workspace SMTP when configured, otherwise Brevo). */

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

/* Dark mode: Gmail on phones flips light and dark colours. Navy areas also carry the colour as a background image (never
   flipped) and text on navy is wrapped in keep() (screen + difference blend, undone only inside Gmail), so FTM keeps its own
   colours; Apple Mail and others are told the email is designed in light colours. */
const NAVY = 'background-color:#0b1640;background-image:linear-gradient(#0b1640,#0b1640);';
function keep(h) { return '<span class="gm-s"><span class="gm-d">' + h + '</span></span>'; }
const HEAD = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">'
  + '<style>:root{color-scheme:light only;supported-color-schemes:light}u + .body .gm-s{background:#000;mix-blend-mode:screen;display:inline-block}u + .body .gm-d{background:#000;mix-blend-mode:difference;display:inline-block}</style></head><body class="body" style="margin:0;padding:0;background:#ffffff;">';
/* shell(title, body, {head:true}) puts the title in the navy header, gold, on the right (statements and result emails). */
function shell(title, body, o) {
  o = o || {}; const cs = o.head ? ' colspan="2"' : '';
  return HEAD + '<table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;">'
    + '<tr><td bgcolor="#0b1640" style="' + NAVY + 'padding:22px 24px;"><table cellpadding="0" cellspacing="0"><tr><td style="padding-right:10px;"><img src="https://www.ftmwealthnation.com/email-logo.png" width="34" height="34" alt="" style="display:block;border-radius:8px;"></td><td style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:.02em;">' + keep('FTM') + '</td></tr></table></td>'
    + (o.head ? '<td align="right" bgcolor="#0b1640" style="' + NAVY + 'padding:22px 24px;color:#E3B62F;font-size:19px;font-weight:bold;text-align:right;">' + keep(esc(title)) + '</td>' : '') + '</tr>'
    + '<tr><td' + cs + ' style="height:4px;background:#D4AF37;background-image:linear-gradient(90deg,#D4AF37,#f3d77a,#D4AF37);font-size:0;line-height:0;">&nbsp;</td></tr>'
    + '<tr><td' + cs + ' style="padding:' + (o.head ? '28px' : '34px') + ' 24px 8px;">' + (o.head ? '' : '<p style="font-size:26px;font-weight:bold;color:#0b1640;margin:0 0 16px;">' + esc(title) + '</p>') + body + '</td></tr>'
    + '<tr><td' + cs + ' align="center" bgcolor="#0b1640" style="' + NAVY + 'padding:28px 20px;">'
    + '<p style="margin:0 0 14px;color:#D4AF37;font-size:18px;font-weight:bold;letter-spacing:.04em;">' + keep('Invest today, secure tomorrow.') + '</p>'
    + '<table cellpadding="0" cellspacing="0"><tr><td style="padding-right:10px;"><img src="https://www.ftmwealthnation.com/email-logo.png" width="38" height="38" alt="" style="display:block;border-radius:9px;"></td><td style="color:#ffffff;font-size:26px;font-weight:bold;">' + keep('FTM') + '</td></tr></table>'
    + '<p style="margin:16px 0 0;color:#9aa3c7;font-size:11px;line-height:1.5;">' + keep('Trading involves risk; past results do not guarantee future returns.<br>Follow The Market Ltd. · You get this email because of your FTM account. '
    + '<a href="mailto:ftmwebnation@gmail.com?subject=Unsubscribe" style="color:#9aa3c7;">Unsubscribe</a>') + '</p></td></tr></table></body></html>';
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
  if (kind === 'topup2000') {
    const H3 = t => '<p style="font-size:17px;font-weight:bold;color:#0b1640;margin:26px 0 10px;">' + t + '</p>';
    const bar = (label, pct, note, gold) => '<tr><td style="padding:6px 12px 6px 0;font-size:15px;font-weight:bold;color:#0b1640;white-space:nowrap;width:70px;">' + label + '</td>'
      + '<td style="padding:6px 0;width:100%;"><table cellpadding="0" cellspacing="0" width="100%" style="background:#eef1f8;border-radius:6px;"><tr><td width="' + pct + '%" style="background:' + (gold ? '#D4AF37' : '#152a7a') + ';height:14px;border-radius:6px;font-size:0;line-height:0;">&nbsp;</td><td style="font-size:0;line-height:0;">&nbsp;</td></tr></table></td>'
      + '<td style="padding:6px 0 6px 12px;font-size:14px;color:#333;white-space:nowrap;">' + note + '</td></tr>';
    const accts = (o.accounts || []).map(a => 'Account <b>' + esc(a.number) + '</b>: <b>' + esc(Number(a.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + ' ' + esc(a.currency || '') + '</b>').join('<br>');
    const mail = 'mailto:ftmwebnation@gmail.com?subject=' + encodeURIComponent('I have topped up' + ((o.accounts || [])[0] ? ' - account ' + o.accounts[0].number : ''));
    return shell('Get the full FTM strategy', hello(o.name)
      + P('Thank you for being with FTM. Here is how to get the full FTM strategy on your account.')
      + (accts ? '<table cellpadding="0" cellspacing="0" width="100%" style="margin:4px 0 6px;"><tr><td style="background:#f3f6ff;border-left:4px solid #D4AF37;border-radius:8px;padding:14px 18px;font-size:15px;line-height:1.6;color:#0b1640;">Your trading account today<br>' + accts + '</td></tr></table>' : '')
      + H3('Why 2,000 matters')
      + P('Every broker has a smallest trade size. Below 2,000, that smallest size is often too large for the account: one trade placed at it can carry <b>5 to 10 times the risk</b> it is meant to have. To protect you, FTM skips most of those trades.')
      + '<table cellpadding="0" cellspacing="0" width="100%" style="margin:4px 0 10px;">' + bar('500', 44, 'about 4 in 10 trades', false) + bar('1,000', 79, 'about 8 in 10 trades', false) + bar('2,000', 99, 'practically every trade', true) + '</table>'
      + P('From 2,000, every trade runs at its intended risk across all five FTM markets, and your results follow the master account closely. In our tests on past market data (2020 to 2025), 2,000 accounts earned clearly more per year than 500 accounts.')
      + H3('How to upgrade')
      + '<table cellpadding="0" cellspacing="0" style="margin:0 0 6px;">'
      + [['Add funds at your broker to bring your account to 2,000 or more (in your account currency).'], ['Tell us with the button below, or reply “I have topped up”.'], ['We update your account size, usually within one working day. Nothing else changes.']]
        .map((x, i) => '<tr><td valign="top" style="padding:6px 12px 6px 0;"><span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:#0b1640;color:#D4AF37;font-weight:bold;font-size:14px;">' + (i + 1) + '</span></td><td style="padding:8px 0;font-size:16px;line-height:1.5;color:#333;">' + x[0] + '</td></tr>').join('') + '</table>'
      + BTN(mail, 'I have topped up')
      + P('You do not have to upgrade: your account stays connected and keeps trading at its current size. Questions? Just reply to this email.<br><br>Best regards,<br>The FTM team', true));
  }
  if (kind === 'notice') {
    const paras = String(o.text || '').split(/\n{2,}/).map(t => P(esc(t).replace(/\n/g, '<br>'))).join('');
    return shell(o.title || 'A message from FTM', hello(o.name) + paras + (o.button && /^https:\/\/(www\.)?ftmwealthnation\.com\//.test(o.link || '') ? BTN(o.link, o.button) : '') + P('Questions? Just reply to this email.', true));
  }
  if (kind === 'copying_resumed') {
    let when = ''; try { if (o.since) when = new Date(o.since).toLocaleString('en-GB', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'; } catch (e) { when = ''; }
    const acct = o.account ? ' (account ' + esc(o.account) + ')' : '';
    return shell('Copying is running again', hello(o.name)
      + (o.cause === 'broker_maintenance'
        ? P('Your broker\'s servers were briefly down for maintenance. To keep your account safe, FTM paused copying on your account' + acct + ' for a short time, which is why you received a "copying stopped" email.')
        : P('Copying on your account' + acct + ' paused for a short time, which is why you received a "copying stopped" email.'))
      + '<table cellpadding="0" cellspacing="0" width="100%" style="margin:6px 0 18px;"><tr><td style="background:#f3f6ff;border-left:4px solid #D4AF37;border-radius:8px;padding:16px 18px;font-size:15px;line-height:1.6;color:#0b1640;">'
      + '<b>Everything is restored.</b><br>&#10003; FTM MACHINE copies on your account again' + (when ? ' since ' + esc(when) : '') + '.<br>&#10003; Your open trades were managed the whole time.<br>&#10003; Your start date, figures and leaderboard place are unchanged.</td></tr></table>'
      + P('We have also improved FTM for every account: when a broker is in maintenance, FTM now keeps retrying and no longer pauses copying.')
      + P('There is nothing you need to do.')
      + BTN('https://www.ftmwealthnation.com/?open=perf', 'Open my dashboard')
      + P('Questions? Just reply to this email.', true));
  }
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

const { sendMail } = require('./mail');
async function send(email, subject, htmlContent) {
  return sendMail({ to: email, subject, html: htmlContent, fromName: 'FTM' });
}

// When Brevo refuses to send (for example while Brevo reviews the account), the same secure link is sent
// through Supabase's own mailer instead, so nobody is left without their email. Logged as email_fallback.
async function sendOrFallback(admin, email, subject, htmlContent, fallback) {
  try { return (await send(email, subject, htmlContent)) || 'brevo'; }
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

module.exports = { sendPasswordEmail, sendLoginEmail, sendResetEmail, makeLink, html, shell, keep, NAVY };
