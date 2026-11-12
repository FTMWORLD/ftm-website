// Phone lists: every table becomes a compact list (key fields) with a drop-down for the rest; laptop keeps the full table.
// Run: node .github/tests/compact-lists.js (site on :8765)
process.env.TZ='Europe/Berlin';
const {chromium,devices}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();const BASE=process.argv[2]||'http://localhost:8765';
const {gen,oracle,engine}=require(require('path').join(__dirname,'stats-fuzz.js'));
let acc,seed=3; for(;;seed++){ acc=gen(seed,Date.now()); if(acc.rows.filter(r=>r.entry==='OUT').length>30 && !acc.startMode) break; }
const O=oracle(acc), ST=engine(acc,O);
const P={}; acc.rows.forEach(r=>{ if(!r.entry) return; const x=P[r.pos]=P[r.pos]||{pos:r.pos,sym:r.sym,net:0,lots:0}; x.net+=r.net; if(r.entry==='IN'){x.open=r.t;x.side=r.type;} else {x.close=r.t;x.lots+=r.vol;} });
const rows=Object.values(P).filter(x=>x.close).map((x,i)=>({market:x.sym,symbol:x.sym,side:x.side,volume:String(x.lots),opened_at:new Date(x.open).toISOString(),closed_at:new Date(x.close).toISOString(),net_profit:String(Math.round(x.net*100)/100),position_ref:x.pos,copied_by_ftm:i%3!==0})).sort((a,b)=>b.closed_at.localeCompare(a.closed_at));
let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
(async()=>{const b=await chromium.launch({...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{})});
for(const [n,opt] of [['laptop',{viewport:{width:1440,height:900},deviceScaleFactor:1}],['iphone',devices['iPhone 13']]]){
const errs=[]; const c=await b.newContext(Object.assign({timezoneId:'Europe/Berlin',locale:'en-GB'},opt));const p=await c.newPage();
await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
await p.route('**/api/v1/**',r=>{const u=r.request().url();
 if(u.includes('/stats'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(ST)});
 if(u.includes('/history'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,trades:rows,page:{offset:0,limit:200,total:rows.length}})});
 if(/\/customer\/accounts(\?|$)/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:[{account_id:'f7a00000-0000-4000-8000-0000000000e1',account_number:'5739503',currency:'USD',balance:String(O.balance),equity:String(O.balance),display_status:'ACTIVE',status_reason:'OK',is_trading:true,deposits:String(O.dep),withdrawals:String(O.wd)}]})});
 if(u.includes('/billing'))return r.fulfill({status:200,contentType:'application/json',body:'{"status":"ACTIVE","plan":"ANNUAL"}'});
 return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"positions":[]}'});});
await p.goto(BASE+'/?preview=split');await p.waitForTimeout(800);
await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('t'),signOut:()=>Promise.resolve()});F.session={email:'t@ftm.com',products:['auto'],name:'T'};});
await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto')));await p.waitForTimeout(2500);
p.on('pageerror',e=>errs.push(e.message));
const phone=n!=='laptop';
for(const [v,sel] of [['accounts','.acct-table'],['perf','#perfSymbols'],['metrics','.app-scroll table.app-trades']]){
  await p.evaluate(v=>FTM.showView(v),v); await p.waitForTimeout(1200);
  const r=await p.evaluate(sel=>{ const t=document.querySelector(sel); if(!t) return null; const tr=t.querySelector('tbody tr'); if(!tr||tr.cells.length<=3) return {skip:true}; const vis=[...tr.cells].filter(c=>getComputedStyle(c).display!=='none').length; return {n:tr.cells.length,vis,h:tr.getBoundingClientRect().height}; },sel);
  if(!r||r.skip) continue;
  if(phone){ ok(r.vis===3 && r.h<110, n+': '+v+' list row shows only the key fields ('+JSON.stringify(r)+')');
    await p.evaluate(sel=>{ const tr=document.querySelector(sel+' tbody tr.cx'); tr.click(); },sel); await p.waitForTimeout(200);
    const o=await p.evaluate(sel=>{ const tr=document.querySelector(sel+' tbody tr.cx'); return [...tr.cells].filter(c=>getComputedStyle(c).display!=='none').length; },sel);
    ok(o===r.n, n+': '+v+' drop-down shows all '+r.n+' fields ('+o+')'); }
  else ok(r.vis===r.n, n+': '+v+' laptop keeps the full table ('+r.vis+'/'+r.n+')');
}
{ await p.evaluate(()=>FTM.showView('perf')); await p.waitForTimeout(900);
  const f=await p.evaluate(()=>{ const c=document.getElementById('pxDD').closest('.app-card'), h=c.querySelector('h3'), body=()=>[...c.children].filter(x=>x!==h&&x.offsetParent).length; const a=body(); h.click(); const b2=body(); h.click(); return {fold:c.classList.contains('m-fold'),a,b:b2,len:+(document.querySelector('#appView .app-view:not([hidden])').scrollHeight/innerHeight).toFixed(1)}; });
  if(n==='iphone') ok(f.fold&&f.a===0&&f.b>0&&f.len<6, n+': Performance detail cards fold into one-line rows that open on tap (page '+f.len+' screens)');
  else ok(f.a>0, n+': laptop keeps every Performance card open'); }
ok(!errs.length, n+': no script errors '+(errs[0]||''));
await c.close();}
await b.close(); console.log(fails?'FAILED: '+fails:'COMPACT LISTS OK'); process.exit(fails?1:0);})();
