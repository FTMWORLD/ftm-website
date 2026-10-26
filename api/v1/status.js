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

async function get(url, opts) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    return await fetch(url, Object.assign({ signal: ctl.signal }, opts || {}));
  } finally {
    clearTimeout(timer);
  }
}

function must(r, what) {
  if (!r.ok) throw new Error(what + ' answered ' + r.status);
}

module.exports = async function handler(req, res) {
  const site = (process.env.SITE_URL || 'https://www.ftmwealthnation.com').replace(/\/$/, '');
  const env = process.env;

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
    check('Emails (Brevo)', async () => {
      if (!env.BREVO_API_KEY) throw new Error('BREVO_API_KEY missing in Vercel');
      must(await get('https://api.brevo.com/v3/account', { headers: { 'api-key': env.BREVO_API_KEY, accept: 'application/json' } }), 'Brevo');
    }),
    check('Ask here chat (Anthropic)', async () => {
      if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing in Vercel');
      must(await get('https://api.anthropic.com/v1/models?limit=1', { headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' } }), 'Anthropic');
    }),
    check('Payments (Stripe webhook)', async () => {
      if (!env.STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET missing in Vercel');
      return 'configured';
    }),
    check('FTM MACHINE engine', async () => {
      if (!env.FTM_ENGINE_URL) return 'not configured yet';
      const headers = {};
      if (env.CF_ACCESS_CLIENT_ID) { headers['CF-Access-Client-Id'] = env.CF_ACCESS_CLIENT_ID; headers['CF-Access-Client-Secret'] = env.CF_ACCESS_CLIENT_SECRET || ''; }
      const r = await get(env.FTM_ENGINE_URL.replace(/\/$/, '') + '/health', { headers });
      if (r.status >= 500) throw new Error('Engine answered ' + r.status);
      return 'answered ' + r.status;
    })
  ]);

  const down = results.filter(r => !r.ok);
  const body = { ok: down.length === 0, checked_at: new Date().toISOString(), services: results, alert_sent: false };

  if (down.length && req.query && req.query.alert === '1' && env.BREVO_API_KEY) {
    const rows = down.map(d => '<tr><td style="padding:6px 0;color:#b3202b;font-weight:bold;">' + d.name + '</td></tr><tr><td style="padding:0 0 12px;color:#444;">' + (d.detail || 'Not answering') + '</td></tr>').join('');
    const html = '<table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;"><tr><td style="padding:32px 20px;">'
      + '<p style="font-size:22px;font-weight:bold;color:#0b1640;margin:0 0 12px;">FTM watchdog: ' + down.length + ' problem' + (down.length > 1 ? 's' : '') + ' found</p>'
      + '<table cellpadding="0" cellspacing="0">' + rows + '</table>'
      + '<p style="color:#444;">Live status: <a href="' + site + '/api/v1/status">' + site + '/api/v1/status</a></p></td></tr>'
      + '<tr><td align="center" style="background:#0b1640;padding:28px 20px;"><p style="margin:0 0 14px;color:#D4AF37;font-size:18px;font-weight:bold;">Invest today, secure tomorrow.</p>'
      + '<table cellpadding="0" cellspacing="0"><tr><td style="padding-right:10px;"><img src="https://www.ftmwealthnation.com/email-logo.png" width="40" height="40" alt="" style="display:block;border-radius:10px;"></td><td style="color:#fff;font-size:26px;font-weight:bold;">FTM</td></tr></table>'
      + '<p style="margin:14px 0 0;color:#9aa3c7;font-size:11px;">Follow The Market Ltd. · Internal monitoring email.</p></td></tr></table>';
    try {
      const r = await get('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: 'no-reply@ftmwealthnation.com', name: 'FTM watchdog' },
          to: [{ email: ALERT_TO }],
          subject: 'FTM watchdog: ' + down.map(d => d.name).join(', ') + ' down',
          htmlContent: html
        })
      });
      body.alert_sent = r.ok;
    } catch (e) {
      console.error('Watchdog alert failed', e.message);
    }
  }

  if (down.length) console.error('Watchdog:', down.map(d => d.name + ': ' + d.detail).join(' | '));
  res.setHeader('cache-control', 'no-store');
  res.status(down.length ? 503 : 200).json(body);
};
