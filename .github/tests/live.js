// Hourly check of the LIVE site without any login: pages load without errors, every customer API route is
// wired (answers 401 JSON, never 404 or 500), every Stripe button points at a known checkout, and phones
// cannot be dragged sideways. Run: node .github/tests/live.js [baseUrl]
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
const { chromium, devices } = pw;
const BASE = (process.argv[2] || 'https://www.ftmwealthnation.com').replace(/\/$/, '');
const STRIPE = ['fZubJ00Dx6Fm8Nsfw87wA0j', '5kQ4gy1HB2p6aVA97K7wA0k', 'dRmdR81HBfbS3t8es47wA0l', '5kA7uka0Y4t27zWbIN'];
const ROUTES = [['GET', 'me'], ['GET', 'accounts'], ['GET', 'billing'], ['GET', 'investments'], ['GET', 'investment'],
  ['GET', 'chat'], ['GET', 'chat/messages'], ['POST', 'chat/messages'], ['POST', 'chat/read'],
  ['GET', 'leaderboard'], ['GET', 'leaderboard/profile'], ['POST', 'investments/x1/withdraw'],
  ['DELETE', 'accounts/x1'], ['POST', 'accounts/x1/pause'], ['POST', 'accounts/x1/activate'], ['PUT', 'accounts/x1/risk_tier']];
const fails = [];
const ok = (cond, msg) => { console.log((cond ? 'OK     ' : 'BROKEN ') + msg); if (!cond) fails.push(msg); };

(async () => {
  for (const [m, r] of ROUTES) {
    const res = await fetch(BASE + '/api/v1/customer/' + r, { method: m, headers: { 'content-type': 'application/json' }, body: m === 'GET' ? undefined : '{}' }).catch(e => ({ status: 0, text: async () => e.message }));
    const body = await res.text();
    ok(res.status === 401 && /UNAUTHENTICATED/.test(body), m + ' /api/v1/customer/' + r + ' answers ' + res.status);
  }
  const st = await fetch(BASE + '/api/v1/status').then(r => r.json()).catch(() => null);
  ok(!!st, 'status page answers');
  if (st) st.services.forEach(s => ok(s.ok, 'service ' + s.name + (s.ok ? '' : ': ' + s.detail)));

  const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  for (const [name, opts] of [['laptop', { viewport: { width: 1280, height: 900 } }], ['phone', devices['iPhone 13']]]) {
    for (const page of ['/', '/performance.html', '/terms.html', '/privacy.html']) {
      const c = await b.newContext(opts); const p = await c.newPage(); const errs = [];
      p.on('pageerror', e => errs.push(e.message));
      const resp = await p.goto(BASE + page + '?check=' + Date.now(), { waitUntil: 'load' }).catch(e => null);
      await p.waitForTimeout(2500);
      ok(resp && resp.status() === 200, name + ' ' + page + ' loads');
      ok(!errs.length, name + ' ' + page + ' has no script errors' + (errs.length ? ': ' + errs[0].slice(0, 120) : ''));
      const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(sw <= 1, name + ' ' + page + ' cannot scroll sideways (' + sw + 'px)');
      if (page === '/') {
        const links = await p.evaluate(() => [...document.querySelectorAll('a[href^="https://buy.stripe.com/"]')].map(a => a.href));
        ok(links.length >= 4 && links.every(h => STRIPE.some(id => h.includes(id))), name + ' all ' + links.length + ' Stripe buttons point at a known checkout');
        await p.evaluate(() => { const l = document.querySelector('.js-login'); if (l) l.click(); });
        await p.waitForTimeout(800);
        ok(await p.evaluate(() => { const e = document.getElementById('authEmail'); return !!(e && e.offsetParent); }), name + ' login window opens');
        await p.keyboard.press('Escape');
        await p.evaluate(() => { const t = document.getElementById('fsToggle'); if (t) t.click(); });
        await p.waitForTimeout(300);
        ok(await p.evaluate(() => !!document.getElementById('fsLive') && !document.getElementById('fsPanel').hidden), name + ' help menu opens with support chat');
      }
      await c.close();
    }
  }
  await b.close();
  console.log(fails.length ? '\nFAILED: ' + fails.length + ' problem(s)' : '\nLIVE SITE OK');
  process.exit(fails.length ? 1 : 0);
})();
