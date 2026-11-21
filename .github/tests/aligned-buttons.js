// Owner 21 Nov 2026 (precision): cards that sit side by side in one row keep their buttons, headings and bottom edges on one straight line.
// Scans the homepage and the client area on laptop and tablet; any row whose card buttons differ by more than 2 px is BROKEN.
// Run: node .github/tests/aligned-buttons.js [base]
const BASE = process.argv[2] || 'http://localhost:8765'; let fails = 0; const ok = (c, m) => { console.log((c ? 'OK     ' : 'BROKEN ') + m); if (!c) fails++; };
const scan = () => {
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[hidden]'); };
  const out = [], seen = new Set();
  document.querySelectorAll('*').forEach(par => {
    if (!vis(par) || par.closest('[aria-hidden="true"]')) return;
    const kids = [...par.children].filter(k => vis(k) && k.getBoundingClientRect().width > 140);
    if (kids.length < 2) return;
    const btnOf = k => { const b = [...k.querySelectorAll('a.btn,button.btn,.btn')].filter(vis); return b.length ? b[b.length - 1] : null; };
    const rows = {}; kids.forEach(k => { const t = Math.round(k.getBoundingClientRect().top); (rows[t] = rows[t] || []).push(k); });
    Object.values(rows).forEach(row => {
      if (row.length < 2) return; const bs = row.map(btnOf); if (bs.some(b => !b)) return;
      if (bs.some((b, i) => b.closest(row[i].tagName) !== row[i] && !row[i].contains(b))) return;
      const tops = bs.map(b => Math.round(b.getBoundingClientRect().top + scrollY)); const d = Math.max(...tops) - Math.min(...tops);
      const key = tops.join(','); if (seen.has(key)) return; seen.add(key);
      if (d > 2) out.push({ where: (par.id ? '#' + par.id : '') + '.' + String(par.className).split(' ').slice(0, 2).join('.'), tops, d, labels: bs.map(b => b.textContent.trim().slice(0, 24)) });
    });
    Object.values(rows).forEach(row => {
      if (row.length < 2 || !row.every(k => /card|plan|step|tile|box|review/i.test(k.className))) return;
      const hs = row.map(k => [...k.querySelectorAll('h2,h3,h4')].filter(vis)[0]); const where = (par.id ? '#' + par.id : '') + '.' + String(par.className).split(' ').slice(0, 2).join('.');
      if (hs.every(Boolean)) { const t = hs.map(h => Math.round(h.getBoundingClientRect().top)); if (Math.max(...t) - Math.min(...t) > 2) out.push({ where, headings: t }); }
      const bt = row.map(k => Math.round(k.getBoundingClientRect().bottom)); if (Math.max(...bt) - Math.min(...bt) > 2) out.push({ where, bottoms: bt, cls: row.map(k => String(k.className).split(' ')[0]) });
    });
  });
  return out;
};
(async () => {
  let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
  const b = await pw.chromium.launch();
  for (const [label, vp] of [['laptop', { width: 1280, height: 900 }], ['wide', { width: 1600, height: 1000 }], ['tablet', { width: 1000, height: 1200 }]]) {
    const p = await b.newPage({ viewport: vp }); await p.goto(BASE + '/'); await p.waitForTimeout(900);
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } scrollTo(0, 0); });
    await p.waitForTimeout(500);
    let r = await p.evaluate(scan); ok(!r.length, '[' + label + '] homepage: card buttons in one row sit on one line ' + JSON.stringify(r));
    await p.evaluate(() => { const F = window.FTM; F.auth = Object.assign(F.auth || {}, { ready: () => true, getAccessToken: () => Promise.resolve('tok'), signOut: () => Promise.resolve() }); F.session = { email: 'a@x.com', products: ['auto'], name: 'A' }; });
    await p.evaluate(() => FTM.loadLive().then(() => FTM.openArea('auto'))).catch(() => {}); await p.waitForTimeout(1200);
    const views = await p.evaluate(() => [...document.querySelectorAll('#appView .app-nav-item[data-view]')].map(n => n.dataset.view).filter(v => v !== 'staff'));
    const bad = [];
    for (const v of views) { await p.evaluate(x => FTM.showView(x), v).catch(() => {}); await p.waitForTimeout(350); const x = await p.evaluate(scan); if (x.length) bad.push({ view: v, x }); }
    ok(!bad.length, '[' + label + '] client area (' + views.length + ' views): card buttons in one row sit on one line ' + JSON.stringify(bad));
    await p.close();
  }
  // owner 21 Nov: after clicking a menu section, a refresh starts at the top of the page again
  { const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); await p.goto(BASE + '/'); await p.waitForTimeout(600);
    await p.evaluate(() => { const a = document.querySelector('a[href="#partner"]'); location.hash = 'partner'; }); await p.waitForTimeout(600);
    const before = await p.evaluate(() => scrollY); await p.reload(); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => ({ y: scrollY, h: location.hash })); ok(before > 500 && r.y < 5 && r.h === '', 'refresh after a menu jump starts at the top (was at ' + before + ', now ' + JSON.stringify(r) + ')');
    await p.goto(BASE + '/?x=1#pricing'); await p.waitForTimeout(1500); ok(await p.evaluate(() => scrollY > 500), 'a shared link to a section still opens that section'); await p.close(); }
  await b.close(); console.log(fails ? fails + ' BROKEN' : 'ALIGNED OK'); process.exit(fails ? 1 : 0);
})();
