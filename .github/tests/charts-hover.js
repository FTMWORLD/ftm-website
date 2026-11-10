// Every chart in the client area explains itself on hover (laptop) and tap (phone): blue-box graph, donuts, activity bars, gauge, session bars, performance bars, heatmap.
// Run: node .github/tests/charts-hover.js (site on :8765)
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
const act=async(sel)=>{ const el=await p.$(sel); if(!el) return false; await el.scrollIntoViewIfNeeded().catch(()=>{}); await p.waitForTimeout(150); const pt=await p.evaluate(s=>{ const e=document.querySelector(s), r=e.getBoundingClientRect(); for(let gy=0.5;gy<1;gy+=0.0)break; for(let i=1;i<20;i++) for(let j=1;j<20;j++){ const x=r.left+r.width*i/20, y=r.top+r.height*j/20, h=document.elementFromPoint(x,y); if(h&&(h===e||e.contains(h))) return [x,y]; } return null; },sel); if(!pt) return false; const x=pt[0], y=pt[1]; if(phone) await p.touchscreen.tap(x,y); else await p.mouse.move(x,y); await p.waitForTimeout(phone?250:700); return true; };
const tipText=()=>p.evaluate(()=>{ const t=document.querySelector('.ftm-tip'); return t&&!t.hidden?t.textContent:''; });
// blue box graph
await p.evaluate(()=>FTM.showView('metrics')); await p.waitForTimeout(800);
await act('#dxSpark'); const ht=await p.evaluate(()=>{ const t=document.querySelector('.hx-tip'); return t&&!t.hidden?t.innerText:''; });
ok(/\d{4}/.test(ht) && /[$€]/.test(ht), n+': blue-box graph shows date, balance and change ('+ht.replace(/\n/g,' | ')+')');
const checks=[['metrics','#rgWin circle[data-tip]','win/loss donut',/\d+ (winning|losing) \(/i],['metrics','#rgMkt circle[data-tip]','markets donut',/: \d+ trades? /i],['metrics','#mSpark rect[data-tip]','activity bars',/: \d+ trades?$/i],
  ['calendar','#calGauge path[data-tip]','winning days gauge',/days: \d+/i],['calendar','#ratioWin','win/loss day ratio',/avg/i],['sessions','#sessBars .row[data-tip]','session bars',/trade/i],['perf','.px-bars [data-tip]','performance bars',/:/],['perf','#pxHeat [data-tip]','monthly heatmap',/%/]];
for(const [v,sel,name,re] of checks){ await p.evaluate(v=>FTM.showView(v),v); await p.waitForTimeout(700); if(phone) await p.touchscreen.tap(5,5); else await p.mouse.move(1,1); await p.waitForTimeout(200);
  const has=await act(sel); const t=has?await tipText():''; ok(has && re.test(t), n+': '+name+' explains itself ('+(t||'no tooltip')+')'); }
ok(!errs.length, n+': no script errors '+(errs[0]||''));
await c.close();}
await b.close(); console.log(fails?'FAILED: '+fails:'CHARTS HOVER OK'); process.exit(fails?1:0);})();
