// Every "Learn more" in the markets section opens the matching market on the trust engine, never an outside site (owner 23 Nov 2026).
// Run: node .github/tests/market-links.js http://localhost:8765
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');} const {chromium,devices}=pw; const BASE=process.argv[2]||'http://localhost:8765';
const WANT={'mk.forex':'jpy','mk.stocks':'ndx','mk.comm':'gold','mk.crypto':'btc','mk.indices':'hk'};
let bad=0; const ok=(c,m)=>{console.log((c?'OK     ':'BROKEN ')+m); if(!c) bad++;};
(async()=>{const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
for(const [nm,dev] of [['phone',devices['iPhone 13']],['laptop',{viewport:{width:1440,height:900}}]]){
  const c=await b.newContext(dev),p=await c.newPage(); await p.route(/(binance|coinbase|gold-api|fonts\.g)/,r=>r.abort());
  await p.goto(BASE+'/',{waitUntil:'load'});
  const A=await p.evaluate(()=>[...document.querySelectorAll('.market-text')].map(t=>({k:t.querySelector('h3').dataset.i18n,h:t.querySelector('a.link').getAttribute('href')})));
  A.forEach(x=>ok(x.h==='/performance.html#mk-'+WANT[x.k],nm+': every copy of '+x.k+' links to the trust engine ('+x.h+')'));
  const L=[...new Map(A.map(x=>[x.k,x])).values()]; ok(L.length===5,nm+': five markets listed');
  for(const x of L){ const m=WANT[x.k]; ok(x.h==='/performance.html#mk-'+m,nm+': '+x.k+' Learn more -> trust engine '+m+' ('+x.h+')');
    await p.goto(BASE+x.h,{waitUntil:'load'}); await p.waitForTimeout(1500);
    const top=await p.evaluate(id=>{const e=document.getElementById(id);return e?Math.round(e.getBoundingClientRect().top):null},'mk-'+m);
    ok(top!==null&&top>-40&&top<innerHeightGuess(dev),nm+': page opens at the '+m+' section (top '+top+'px)'); }
  await c.close(); }
await b.close(); console.log(bad?'FAILED':'ALL OK'); process.exit(bad?1:0);})();
function innerHeightGuess(d){return (d.viewport&&d.viewport.height||800)*0.6;}
