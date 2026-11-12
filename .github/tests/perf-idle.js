// Phone speed: with the dashboard open and nobody touching it, the page must stay calm (no animation that re-lays out the page every frame).
// Run: node .github/tests/perf-idle.js
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');} const {chromium,devices}=pw; const BASE=process.argv[2]||'http://localhost:8765';
const {gen,oracle,engine}=require(require('path').join(__dirname,'stats-fuzz.js'));
let acc,seed=3; for(;;seed++){ acc=gen(seed,Date.now()); if(acc.rows.filter(r=>r.entry==='OUT').length>200 && !acc.startMode) break; }
const O=oracle(acc), ST=engine(acc,O);
const P={}; acc.rows.forEach(r=>{ if(!r.entry) return; const x=P[r.pos]=P[r.pos]||{pos:r.pos,sym:r.sym,net:0,lots:0}; x.net+=r.net; if(r.entry==='IN'){x.open=r.t;x.side=r.type;} else {x.close=r.t;x.lots+=r.vol;} });
const rows=Object.values(P).filter(x=>x.close).map((x,i)=>({market:x.sym,symbol:x.sym,side:x.side,volume:String(x.lots),opened_at:new Date(x.open).toISOString(),closed_at:new Date(x.close).toISOString(),net_profit:String(Math.round(x.net*100)/100),position_ref:x.pos,copied_by_ftm:true})).sort((a,b)=>b.closed_at.localeCompare(a.closed_at));
(async()=>{const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});const c=await b.newContext(devices['iPhone 13']);const p=await c.newPage();
await p.route(/(binance|coinbase|gold-api|fonts\.g)/,r=>r.abort());
await p.route('**/api/v1/**',r=>{const u=r.request().url(),J=o=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(o)});
 if(u.includes('/stats'))return J(ST); if(u.includes('/history'))return J({ok:true,trades:rows,page:{offset:0,limit:5000,total:rows.length}});
 if(/\/customer\/accounts(\?|$)/.test(u))return J({ok:true,account_limit:{max:3,used:1},accounts:[{account_id:'a1',account_number:'5739503',currency:'USD',balance:String(O.balance),equity:String(O.balance),display_status:'ACTIVE',status_reason:'OK',is_trading:true,deposits:String(O.dep),withdrawals:String(O.wd)}]});
 if(u.includes('/billing'))return J({status:'ACTIVE',plan:'ANNUAL'}); return J({ok:true,positions:[]});});
await p.goto(BASE+'/');await p.waitForTimeout(800);
await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('t'),signOut:()=>Promise.resolve()});F.session={email:'t@ftm.com',products:['auto'],name:'T'};});
await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto')));await p.waitForTimeout(4000);
const cdp=await c.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate',{rate:4}); await cdp.send('Performance.enable');
await p.evaluate(()=>{ window.__lt=[]; new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push(Math.round(e.duration)))).observe({type:'longtask'}); });
const m0=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
await p.waitForTimeout(10000);
const m1=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
const d=k=>((m1[k]-m0[k])*1000).toFixed(0)+'ms';
const lay=m1.LayoutCount-m0.LayoutCount, sty=Math.round((m1.RecalcStyleDuration-m0.RecalcStyleDuration)*1000);
console.log('idle 10s on a slowed phone: '+lay+' re-layouts, '+sty+'ms style work');
const okL=lay<80, okS=sty<1200; console.log((okL?'OK     ':'BROKEN ')+'the page does not re-lay itself out every frame ('+lay+' < 80)'); console.log((okS?'OK     ':'BROKEN ')+'animations stay light ('+sty+'ms < 1200ms)');
await b.close(); console.log(okL&&okS?'PERF OK':'FAILED'); process.exit(okL&&okS?0:1);})();