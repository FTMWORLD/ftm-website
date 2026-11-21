// Owner 21 Nov 2026: "Open account" (How FTM MACHINE works), "Create account" (Get started) and "No broker account yet? Create one"
// (connect form + first-steps card in the client area) open one page to choose the broker: Deriv or Exness, each with its own link.
// Run: node .github/tests/broker-pick.js [base]
const BASE = process.argv[2] || 'http://localhost:8765'; let fails = 0; const ok = (c, m) => { console.log((c ? 'OK     ' : 'BROKEN ') + m); if (!c) fails++; };
const DV = 'https://t.deriv.link?t=ECECYN33UYBT', EX = 'https://one.toexness.com/boarding/sign-up/303589/a/2lnoimb9l4';
(async () => {
  let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
  const b = await pw.chromium.launch();
  for (const [label, vp] of [['laptop', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }], ['small phone', { width: 360, height: 740 }]]) {
    const p = await b.newPage({ viewport: vp }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + '/'); await p.waitForTimeout(700);
    const pick = async () => p.evaluate(() => { const m = document.getElementById('bkModal'); if (!m || m.hidden) return null; const c = m.querySelector('.bkm-card').getBoundingClientRect();
      return { links: [...m.querySelectorAll('a[data-broker]')].map(a => a.getAttribute('href')), blank: [...m.querySelectorAll('a[data-broker]')].every(a => a.target === '_blank'), fit: c.left >= 0 && c.right <= document.documentElement.clientWidth + 1, onTop: document.elementFromPoint(c.left + c.width / 2, c.top + 20) && m.contains(document.elementFromPoint(c.left + c.width / 2, c.top + 20)) }; });
    const direct = await p.evaluate(() => [...document.querySelectorAll('a[href*="t.deriv.link?t=ECECYN33UYBT"]')].filter(a => /Open account|Create account/.test(a.textContent)).length);
    ok(direct === 0, '[' + label + '] no "Open account" / "Create account" button skips the broker choice');
    await p.evaluate(() => document.querySelector('a[href="#open-account"][data-i18n="btn.open"]').click()); await p.waitForTimeout(300);
    let r = await pick(); ok(r && r.links.join() === DV + ',' + EX && r.blank && r.fit && r.onTop, '[' + label + '] Open account shows Deriv and Exness with their own links, on top and on screen ' + JSON.stringify(r));
    await p.keyboard.press('Escape'); ok(await p.evaluate(() => document.getElementById('bkModal').hidden), '[' + label + '] Escape closes it');
    // client area: connect form
    await p.evaluate(() => { const F = window.FTM; F.auth = Object.assign(F.auth || {}, { ready: () => true, getAccessToken: () => Promise.resolve('tok'), signOut: () => Promise.resolve() }); F.session = { email: 'new@x.com', products: ['auto'], name: 'N' }; });
    await p.evaluate(() => FTM.loadLive().then(() => FTM.openArea('auto'))).catch(() => {}); await p.waitForTimeout(1200);
    await p.evaluate(() => FTM.cxWizard && FTM.cxWizard.open()); await p.waitForTimeout(300);
    const has = await p.evaluate(() => { const a = document.querySelector('.cx-sheet:not([hidden]) .cw-step.on .cw-nobk a'); return !!(a && a.offsetParent); });
    ok(has, '[' + label + '] connect form step 1 shows "No broker account yet? Create one"');
    await p.evaluate(() => document.querySelector('.cx-sheet:not([hidden]) .cw-step.on .cw-nobk a').click()); await p.waitForTimeout(300);
    r = await pick(); ok(r && r.links.length === 2 && r.onTop && r.fit, '[' + label + '] Create one opens the broker choice above the connect form');
    ok(!errs.length, '[' + label + '] no script errors ' + errs.join(' | '));
    await p.close();
  }
  await b.close(); console.log(fails ? fails + ' BROKEN' : 'BROKER PICK OK'); process.exit(fails ? 1 : 0);
})();
