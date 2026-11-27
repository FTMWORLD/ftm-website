// Owner 27 Nov 2026: one FTM MACHINE section; "Activate FTM MACHINE" opens a plan chooser (drop-down), Continue goes to that plan's Stripe link.
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8765';
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
(async () => {
  const b = await chromium.launch();
  for (const [n, opt] of [['laptop', { viewport: { width: 1366, height: 820 } }], ['phone', devices['Pixel 7']]]) {
    const c = await b.newContext(opt), p = await c.newPage();
    await p.goto(BASE + '/?x=1'); await p.waitForTimeout(1200);
    ok(await p.$$eval('#pricing .plan', x => x.length) === 0, n + ': no plan cards listed on the page');
    await p.evaluate(() => document.querySelector('.js-activate').click()); await p.waitForTimeout(300);
    ok(await p.evaluate(() => !document.getElementById('planPick').hidden), n + ': Activate opens the plan chooser');
    const opts = await p.$$eval('#ppPlan option', o => o.map(x => x.value));
    ok(opts.includes('annual') && opts.includes('5y') && opts.includes('life'), n + ': chooser lists Annual, 5 Years, Lifetime (' + opts.join(',') + ')');
    for (const v of opts) { await p.selectOption('#ppPlan', v); const h = await p.getAttribute('#ppGo', 'href'); const t = await p.textContent('#ppText'); ok(/^https:\/\/buy\.stripe\.com\//.test(h) && t.trim().length > 10, n + ': ' + v + ' has its own Stripe link and write-up'); }
    await p.evaluate(() => document.getElementById('planPick').click()); await p.waitForTimeout(200);
    ok(await p.evaluate(() => document.getElementById('planPick').hidden), n + ': tapping outside closes the chooser');
    await c.close();
  }
  await b.close(); process.exit(fail ? 1 : 0);
})();
