// Trust engine month pop-up on phones (owner 23 Nov 2026: it could be pushed sideways, the page behind moved, words overlapped)
// and the homepage FTM MACHINE card (numbers bunched up while changing, "++" sign).
// Run: node .github/tests/month-popup-card.js http://localhost:8765
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');} const {chromium,devices}=pw; const BASE=process.argv[2]||'http://localhost:8765';
let bad=0; const ok=(c,m)=>{console.log((c?'OK     ':'BROKEN ')+m); if(!c) bad++;};
(async()=>{
if(/^https:/.test(BASE)){ for(const u of ['/data/trades/gold/100000/balanced/2025-03.json','/data/candles/2025-03.json']){ const r=await fetch(BASE+u,{redirect:'manual'}); ok(r.status===200,'live: '+u+' is served ('+r.status+')'); } }
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
for(const [nm,dev] of [['iPhone SE',devices['iPhone SE']],['iPhone 13',devices['iPhone 13']],['laptop',{viewport:{width:1440,height:900}}]]){
  const c=await b.newContext(dev),p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route(/(binance|coinbase|gold-api|fonts\.g)/,r=>r.abort());
  await p.goto(BASE+'/performance.html',{waitUntil:'load'}); await p.waitForTimeout(800);
  const y=await p.evaluate(()=>{const e=document.querySelector('.heat [data-m="2025-03"]');scrollTo(0,e.getBoundingClientRect().top+scrollY-300);return scrollY});
  await p.evaluate(()=>document.querySelector('.heat [data-m="2025-03"]').click()); await p.waitForSelector('#mback .wkweek',{timeout:15000}).catch(()=>{}); await p.waitForTimeout(400);
  const r=await p.evaluate(()=>{const m=document.getElementById('mback');return {open:!m.hidden,sw:m.scrollWidth,cw:m.clientWidth,fixed:document.body.style.position,weeks:m.querySelectorAll('.wkweek').length,links:m.querySelectorAll('.wkg [data-w]').length}});
  ok(r.open,nm+': clicking a month opens the pop-up');
  ok(r.sw<=r.cw+1,nm+': the pop-up cannot be pushed sideways ('+r.sw+' <= '+r.cw+')');
  ok(r.fixed==='fixed',nm+': the page behind the pop-up is locked');
  ok(r.weeks>=3,nm+': trades are grouped week by week ('+r.weeks+' weeks)');
  ok(r.links>=r.weeks,nm+': every week in the calendar links to its trades');
  const first=await p.evaluate(()=>document.querySelector('.wkg [data-w]').dataset.w);
  await p.evaluate(()=>document.querySelector('.wkg [data-w]').click()); await p.waitForTimeout(1000);
  const vis=await p.evaluate(w=>{const t=document.getElementById('mw-'+w).getBoundingClientRect();return t.top>=-2&&t.top<innerHeight*0.5},first);
  ok(vis,nm+': tapping a week scrolls to that week\'s trades');
  await p.evaluate(()=>document.getElementById('m-close').click()); await p.waitForTimeout(700);
  const y2=await p.evaluate(()=>scrollY); ok(Math.abs(y2-y)<3,nm+': closing returns to the same place on the page');
  await p.goto(BASE+'/',{waitUntil:'load'}); await p.waitForTimeout(600);
  await p.evaluate(()=>document.getElementById('lcx').scrollIntoView({block:'center'})); await p.waitForTimeout(1800);
  const h=await p.evaluate(()=>{const g=id=>document.getElementById(id).getAttribute('aria-label');const W=innerWidth;let over=0;document.querySelectorAll('#lcx *').forEach(e=>{const R=e.getBoundingClientRect();if(R.width&&R.right>W+0.5)over++});
    const cols=[...document.querySelectorAll('#lcRet .od')].map(e=>Math.round(e.getBoundingClientRect().width));
    return {ret:g('lcRet'),dd:g('lcDD'),tr:g('lcTr'),over,cols,txt:document.getElementById('lcx').innerText}});
  ok(h.ret==='+98,644%'&&h.dd==='-36.91%'&&h.tr==='6,209',nm+': card leads with Growth 2× (+98,644%, -36.91%, 6,209 trades)');
  ok(!/\+\+/.test(h.txt)&&!/\+\+/.test(h.ret),nm+': no double plus sign');
  ok(h.over===0,nm+': nothing in the card is wider than the screen');
  ok(new Set(h.cols).size===1,nm+': every digit has the same width, so changing numbers never shift');
  await p.evaluate(()=>document.querySelector('.lcx-seg [data-p="1"]').click()); await p.waitForTimeout(1500);
  const bal=await p.evaluate(()=>document.getElementById('lcRet').getAttribute('aria-label'));
  ok(bal==='+12,137%',nm+': Balanced shows +12,137%');
  const cr=await p.evaluate(()=>{const r=document.getElementById('lcxChart').getBoundingClientRect();return [r.left+r.width*.5,r.top+r.height*.5]});
  await p.mouse.move(cr[0],cr[1]); await p.mouse.down(); await p.waitForTimeout(150);
  const tip=await p.evaluate(()=>{const t=document.getElementById('lcxTip');return t.hidden?'':t.textContent}); await p.mouse.up();
  ok(/%/.test(tip)&&/20\d\d/.test(tip),nm+': touching the chart shows the % and date ('+tip+')');
  ok(!errs.length,nm+': no script errors '+errs.join(' | '));
  await c.close(); }
await b.close(); console.log(bad?'FAILED':'ALL OK'); process.exit(bad?1:0);})();
