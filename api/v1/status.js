/* GET /api/v1/status — FTM watchdog.
   Checks every outside service the website depends on and returns one line
   per service (ok or the failure), never any secret. With ?alert=1 (sent by
   the hourly GitHub Action and the daily Vercel cron) it also emails the FTM
   support inbox when something is down, so problems are found before a
   customer finds them. */

const ALERT_TO = 'ftmwebnation@gmail.com';

async function check(name, fn) {
  const t = Date.now();
  try {
    const detail = await fn();
    return { name, ok: true, ms: Date.now() - t, detail: detail || null };
  } catch (e) {
    let msg = String(e.message || e);
    if (msg === 'fetch failed' && /Supabase/.test(name)) msg = 'Supabase cannot be reached. The project is most likely paused: open supabase.com/dashboard, select the FTM project and click Restore.';
    else if (msg === 'fetch failed') msg = 'Not reachable';
    return { name, ok: false, ms: Date.now() - t, detail: msg.slice(0, 200) };
  }
}

async function getOnce(url, opts) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    return await fetch(url, Object.assign({ signal: ctl.signal }, opts || {}));
  } finally {
    clearTimeout(timer);
  }
}

// A service that is slow or drops one request is tried once more after 3 seconds before it counts as down,
// so a single network blip does not send a false alarm.
async function get(url, opts) {
  try { return await getOnce(url, opts); }
  catch (e) { await new Promise(r => setTimeout(r, 3000)); return getOnce(url, opts); }
}

function must(r, what) {
  if (!r.ok) throw new Error(what + ' answered ' + r.status);
}

/* Public service status (?history=1): what members see on the Service status page. The hourly watchdog run (?alert=1)
   records each check per day in the private community bucket (status/history.json, 90 days); the page reads that record,
   so opening it never runs the checks again. Only component names and ok/not ok are public, never details. */
const COMPONENTS = [['web', ['Website homepage', 'Trust engine page']], ['login', ['Login service (Supabase)', 'Customer database (Supabase)']], ['engine', ['FTM MACHINE engine']], ['email', ['Emails']], ['pay', ['Payments (Stripe webhook)', 'Payment backup check (Stripe key)']], ['ask', ['Ask here chat (Anthropic)']]];
const HIST = 'status/history.json';
function admin() { const { createClient } = require('@supabase/supabase-js'); return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); }
function compOf(results) { const c = {}; COMPONENTS.forEach(([k, names]) => { c[k] = names.every(n => { const r = results.find(x => x.name === n); return !r || r.ok; }); }); return c; }
async function record(results) {
  const P = require('../_lib/push'), a = admin(), h = await P.read(a, HIST, { days: {} }), now = new Date(), d = now.toISOString().slice(0, 10), comp = compOf(results);
  const day = h.days[d] || { n: 0, bad: {} }; day.n++; Object.keys(comp).forEach(k => { if (!comp[k]) day.bad[k] = (day.bad[k] || 0) + 1; }); h.days[d] = day;
  Object.keys(h.days).sort().slice(0, -90).forEach(k => { delete h.days[k]; });
  h.last = { t: now.toISOString(), comp }; await P.write(a, HIST, h);
}
async function history(res) {
  let h = { days: {} }; try { h = await require('../_lib/push').read(admin(), HIST, { days: {} }); } catch (e) { console.error('status history', e.message); }
  const days = []; for (let i = 89; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10), x = h.days[d]; days.push(x ? { d, n: x.n, bad: x.bad } : { d, n: 0, bad: {} }); }
  res.setHeader('cache-control', 'public, max-age=60');
  return res.status(200).json({ ok: true, last: h.last || null, components: COMPONENTS.map(c => c[0]), days });
}

module.exports = async function handler(req, res) {
  const site = (process.env.SITE_URL || 'https://www.ftmwealthnation.com').replace(/\/$/, '');
  const env = process.env;
  if (req.query && req.query.history === '1') return history(res);

  const results = await Promise.all([
    check('Website homepage', async () => must(await get(site + '/'), 'Homepage')),
    check('Trust engine page', async () => must(await get(site + '/performance.html'), 'Trust engine')),
    check('Login service (Supabase)', async () => {
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase keys missing in Vercel');
      const r = await get(env.SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/health', { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY } });
      if (r.status === 540 || r.status === 503) throw new Error('Supabase project is paused or down (' + r.status + '). Restore it in the Supabase dashboard.');
      must(r, 'Supabase');
    }),
    check('Customer database (Supabase)', async () => {
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase keys missing in Vercel');
      const r = await get(env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/profiles?select=id&limit=1', {
        headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY }
      });
      must(r, 'Supabase database');
    }),
    check('Emails', async () => {
      const mail = require('../_lib/mail');
      if (mail.resendOn() || mail.smtpOn()) return await mail.verify();
      if (!env.BREVO_API_KEY) throw new Error('No email provider: set RESEND_API_KEY (and SMTP_USER/SMTP_PASS as backup) in Vercel');
      return 'Brevo suspended sending for FTM on 12 Nov 2026: set RESEND_API_KEY and the Gmail backup (SMTP_USER / SMTP_PASS) in Vercel';
    }),
    check('Ask here chat (Anthropic)', async () => {
      if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing in Vercel');
      must(await get('https://api.anthropic.com/v1/models?limit=1', { headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' } }), 'Anthropic');
    }),
    check('Payments (Stripe webhook)', async () => {
      if (!env.STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET missing in Vercel');
      return 'configured';
    }),
    check('Payment backup check (Stripe key)', async () => {
      const key = env.STRIPE_SECRET_KEY || env.STRIPE_API_KEY || env.STRIPE_RESTRICTED_KEY;
      if (!key) throw new Error('STRIPE_SECRET_KEY missing in Vercel');
      const r = await get('https://api.stripe.com/v1/checkout/sessions?limit=1', { headers: { Authorization: 'Bearer ' + key } });
      if (r.status === 401) throw new Error('Stripe rejected the key');
      if (r.status === 403) throw new Error('key needs Checkout Sessions: Read');
      if (!r.ok) throw new Error('Stripe answered ' + r.status);
      return 'key works';
    }),
    check('FTM MACHINE engine', async () => {
      if (!env.FTM_ENGINE_URL) return 'not configured yet';
      const headers = {};
      if (env.CF_ACCESS_CLIENT_ID) { headers['CF-Access-Client-Id'] = env.CF_ACCESS_CLIENT_ID; headers['CF-Access-Client-Secret'] = env.CF_ACCESS_CLIENT_SECRET || ''; }
      const r = await get(env.FTM_ENGINE_URL.replace(/\/$/, '') + '/api/v1/health', { headers });
      must(r, 'Engine');
    })
  ]);

  const down = results.filter(r => !r.ok);
  const body = { ok: down.length === 0, checked_at: new Date().toISOString(), services: results, alert_sent: false };

  if (down.length && req.query && req.query.alert === '1' && (env.RESEND_API_KEY || env.BREVO_API_KEY || (env.SMTP_USER && env.SMTP_PASS))) {
    const rows = down.map(d => '<tr><td style="padding:6px 0;color:#b3202b;font-weight:bold;">' + d.name + '</td></tr><tr><td style="padding:0 0 12px;color:#444;">' + (d.detail || 'Not answering') + '</td></tr>').join('');
    const html = '<table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;"><tr><td style="padding:32px 20px;">'
      + '<p style="font-size:22px;font-weight:bold;color:#0b1640;margin:0 0 12px;">FTM watchdog: ' + down.length + ' problem' + (down.length > 1 ? 's' : '') + ' found</p>'
      + '<table cellpadding="0" cellspacing="0">' + rows + '</table>'
      + '<p style="color:#444;">Live status: <a href="' + site + '/api/v1/status">' + site + '/api/v1/status</a></p></td></tr>'
      + '<tr><td align="center" bgcolor="#0b1640" style="background-color:#0b1640;background-image:linear-gradient(#0b1640,#0b1640);padding:28px 20px;"><p style="margin:0 0 14px;color:#D4AF37;font-size:18px;font-weight:bold;">Invest today, secure tomorrow.</p>'
      + '<table cellpadding="0" cellspacing="0"><tr><td style="padding-right:10px;"><img src="https://www.ftmwealthnation.com/email-logo.png" width="40" height="40" alt="" style="display:block;border-radius:10px;"></td><td style="color:#fff;font-size:26px;font-weight:bold;">FTM</td></tr></table>'
      + '<p style="margin:14px 0 0;color:#9aa3c7;font-size:11px;">Follow The Market Ltd. · Internal monitoring email.</p></td></tr></table>';
    try {
      await require('../_lib/mail').sendMail({ to: ALERT_TO, fromName: 'FTM watchdog', subject: 'FTM watchdog: ' + down.map(d => d.name).join(', ') + ' down', html });
      body.alert_sent = true;
    } catch (e) {
      console.error('Watchdog alert failed', e.message);
    }
  }

  if (req.query && req.query.alert === '1') { try { await record(results); } catch (e) { console.error('status record', e.message); } }
  if (down.length) console.error('Watchdog:', down.map(d => d.name + ': ' + d.detail).join(' | '));
  res.setHeader('cache-control', 'no-store');
  res.status(down.length ? 503 : 200).json(body);
};
