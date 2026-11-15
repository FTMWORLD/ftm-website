// Performance page promo cards: one slide visible at a time (no overlapping text on phones) and big figures with thousands separators.
// Run: node .github/tests/perf-promo.js (site on :8765)
const {chromium,devices}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();
const BASE=process.argv[2]||'http://localhost:8765'; let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch();
for(const [n,opt] of [['laptop',{viewport:{width:1366,height:900}}],['phone',devices['iPhone 13']]]){
  const c=await b.newContext(opt); const p=await c.newPage(); await p.goto(BASE+'/performance.html'); await p.waitForTimeout(1200);
  const r=await p.evaluate(()=>new Promise(res=>{ const boxes=[...document.querySelectorAll('[data-promo]')]; let worst=0; const txt=new Set(); const t0=Date.now();
    (function tick(){ boxes.forEach(box=>{ const vis=[...box.querySelectorAll('.pr-slide')].filter(e=>+getComputedStyle(e).opacity>0.05); worst=Math.max(worst,vis.length); }); boxes.forEach(box=>box.querySelectorAll('.pr-slide b').forEach(e=>txt.add(e.textContent))); if(Date.now()-t0<13000) setTimeout(tick,40); else res({worst,txt:[...txt]}); })(); }));
  ok(r.worst<=1, n+': promo slides never show on top of each other (max visible at once: '+r.worst+')');
  const raw=r.txt.filter(t=>/\d{4,}%/.test(t)); ok(!raw.length, n+': big percentages have thousands separators ('+(raw.join(', ')||'all fine')+')');
  await c.close(); }
await b.close(); console.log(fails?'FAILED: '+fails:'PERF PROMO OK'); process.exit(fails?1:0); })();
