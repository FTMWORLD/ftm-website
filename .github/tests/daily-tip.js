// Net daily P&L bars: hovering or tapping a bar shows that day's date, money, %, trades and best/worst trade; axis dates carry the year when the range spans years.
// Run: node .github/tests/daily-tip.js (site on :8765)
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
await p.evaluate(()=>FTM.showView('calendar')); await p.waitForTimeout(1500);
const sv=await p.$('#dailyChart'); await sv.scrollIntoViewIfNeeded(); const bb=await sv.boundingBox();
const info=await p.evaluate(()=>{ const d=document.getElementById('dailyChart')._d; let b=-1,v=0; d.list.forEach((k,i)=>{ const m=d.D.map[k]; if(m&&m.pl!=null&&m.pl<v){v=m.pl;b=i;} }); const k=d.list[b], m=d.D.map[k]; return {i:b,n:d.list.length,k,pl:m.pl,pct:m.pct,trades:m.trades}; });
if(n==='laptop') await p.mouse.move(bb.x+(info.i+.5)/info.n*bb.width, bb.y+bb.height/2); else await p.touchscreen.tap(bb.x+(info.i+.5)/info.n*bb.width, bb.y+bb.height/2);
await p.waitForTimeout(300);
const tip=await p.evaluate(()=>{ const t=document.querySelector('.dly-tip'); return t&&!t.hidden?t.innerText:''; });
const q=info.k.split('-').map(Number), want=new Date(q[0],q[1]-1,q[2]).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
ok(!!tip && tip.indexOf(want)!==-1, n+': the biggest red day shows its date ('+want+')');
ok(tip.indexOf(Math.abs(info.pl).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,','))!==-1 && tip.indexOf(Math.abs(info.pct).toFixed(2)+'%')!==-1, n+': it shows the money and % of that day ('+tip.replace(/\n/g,' | ')+')');
ok(new RegExp(info.trades+' trade').test(tip) && /Worst trade/.test(tip), n+': it shows how many trades and the worst trade');
const yrs=info.k.slice(0,4)!==await p.evaluate(()=>{ const d=document.getElementById('dailyChart')._d; return d.list[d.list.length-1].slice(0,4); });
ok(!yrs || /\d{4}/.test(await p.textContent('#dailyFrom')), n+': axis dates show the year when the range spans years');
await p.evaluate(()=>FTM.showView('metrics')); await p.waitForTimeout(800);
await p.evaluate(()=>{ document.getElementById('dxInitV').textContent='$10,000,000.00'; FTM.fitStats(); });
const fz=await p.evaluate(()=>{ const b=document.getElementById('dxInitV'), box=b.closest('.hx-stat'); return {fits:b.scrollWidth<=b.clientWidth+1, boxH:box.getBoundingClientRect().height, shrunk:b.classList.contains('fz-on')}; });
ok(fz.fits && fz.boxH<60, n+': a $10,000,000.00 starting balance fits its box without stretching it ('+JSON.stringify(fz)+')');
if(fz.shrunk){ await p.evaluate(()=>document.getElementById('dxInitV').click()); await p.waitForTimeout(200); ok(await p.evaluate(()=>!document.getElementById('fzModal').hidden && /10,000,000\.00/.test(document.getElementById('fzV').textContent)), n+': tapping the shrunk figure shows it large'); await p.evaluate(()=>document.getElementById('fzX').click()); }
ok(!errs.length, n+': no script errors '+(errs[0]||''));
await c.close();}
await b.close(); console.log(fails?'FAILED: '+fails:'DAILY TIP OK'); process.exit(fails?1:0);})();
