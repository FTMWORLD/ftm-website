/* One branded "create your password" email for new FTM customers.
   Supabase makes the secure one-time link (generateLink sends nothing itself); Brevo sends our own email,
   so customers never get Supabase's plain default invite. The link opens the site's "create your password"
   screen; if it has expired, the site asks /api/v1/password-link for a fresh one. */

const SITE = () => (process.env.SITE_URL || 'https://www.ftmwealthnation.com').replace(/\/$/, '');

// Returns { userId, link, kind } — kind 'invite' for a new account, 'recovery' for an existing one.
async function makeLink(admin, email) {
  const redirectTo = SITE() + '/?setpw=1&e=' + encodeURIComponent(email);
  let r = await admin.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo } });
  let kind = 'invite';
  if (r.error && /already|registered|exists/i.test(r.error.message || '')) {
    r = await admin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } });
    kind = 'recovery';
  }
  if (r.error) throw new Error(r.error.message);
  const p = (r.data && r.data.properties) || {};
  return { userId: r.data && r.data.user && r.data.user.id, link: p.action_link, kind };
}

function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function html({ link, name, product, fresh }) {
  const hello = name ? 'Hello ' + esc(name.split(' ')[0]) + ',' : 'Hello,';
  const lead = fresh
    ? 'Here is your new link to create your FTM password. Your account and plan are ready.'
    : 'Your payment went through and your FTM account is ready. Create your password to open your client area.';
  const next = product === 'invest'
    ? 'After you create your password you go straight into your client area, where you follow the FTM account and your share.'
    : 'After you create your password you go straight into your client area. Then open the menu (&#8801;) at the top right, click <b>Activate FTM MACHINE</b> and enter your MT5 server, account number and master password. FTM MACHINE starts trading automatically.';
  const btn = '<table cellpadding="0" cellspacing="0" style="margin:26px 0;"><tr><td bgcolor="#E5323E" style="border-radius:999px;">'
    + '<a href="' + esc(link) + '" style="display:inline-block;padding:15px 30px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:999px;">Create my password</a></td></tr></table>';
  return '<table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;"><tr><td style="padding:36px 24px 8px;">'
    + '<p style="font-size:26px;font-weight:bold;color:#0b1640;margin:0 0 16px;">Welcome to FTM</p>'
    + '<p style="font-size:16px;line-height:1.55;color:#333;margin:0 0 6px;">' + hello + '</p>'
    + '<p style="font-size:16px;line-height:1.55;color:#333;margin:0;">' + lead + '</p>' + btn
    + '<p style="font-size:15px;line-height:1.55;color:#333;margin:0 0 14px;"><b>Next step:</b> ' + next + '</p>'
    + '<p style="font-size:14px;line-height:1.55;color:#555;margin:0 0 14px;">This button works once. If it has expired, just tap it anyway: FTM sends you a fresh link straight away. You can also log in at ftmwealthnation.com with your email and leave the password empty to get a 6-digit code.</p>'
    + '<p style="font-size:14px;line-height:1.55;color:#555;margin:0 0 28px;"><b>Safety first:</b> FTM only asks for your MT5 password inside the Connect account form. We never ask for it by email, chat or phone.</p>'
    + '</td></tr><tr><td align="center" bgcolor="#0b1640" style="background-color:#0b1640;padding:28px 20px;">'
    + '<p style="margin:0 0 14px;color:#D4AF37;font-size:18px;font-weight:bold;letter-spacing:.04em;">Invest today, secure tomorrow.</p>'
    + '<table cellpadding="0" cellspacing="0"><tr><td style="padding-right:10px;"><img src="https://www.ftmwealthnation.com/email-logo.png" width="38" height="38" alt="" style="display:block;border-radius:9px;"></td><td style="color:#ffffff;font-size:26px;font-weight:bold;">FTM</td></tr></table>'
    + '<p style="margin:16px 0 0;color:#9aa3c7;font-size:11px;line-height:1.5;">Trading involves risk; past results do not guarantee future returns.<br>Follow The Market Ltd. · You get this email because you created an FTM account. '
    + '<a href="mailto:ftmwebnation@gmail.com?subject=Unsubscribe" style="color:#9aa3c7;">Unsubscribe</a></p></td></tr></table>';
}

// Creates the account if needed and emails the branded link. Returns { userId, kind }.
async function sendPasswordEmail(admin, email, opts) {
  opts = opts || {};
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error('BREVO_API_KEY missing');
  const m = await makeLink(admin, email);
  if (!m.link) throw new Error('no link from Supabase');
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: 'no-reply@ftmwealthnation.com', name: 'FTM' },
      replyTo: { email: 'ftmwebnation@gmail.com', name: 'FTM support' },
      to: [{ email }],
      subject: opts.fresh ? 'Your new FTM password link' : 'Welcome to FTM: create your password',
      htmlContent: html({ link: m.link, name: opts.name, product: opts.product, fresh: opts.fresh })
    }),
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error('Brevo ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return { userId: m.userId, kind: m.kind };
}

module.exports = { sendPasswordEmail, makeLink };
