// Speed: on a phone with a 4x slower processor, the client area does no background work while idle and every
// section opens without a long freeze (the calendar and number-fitting used to block for 0.3-0.7 s). Run: node .github/tests/view-speed.js [baseUrl]
process.env.TZ='Europe/Berlin';
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
const {chromium,devices}=pw; const BASE=process.argv[2]||'http://localhost:8765';
const {gen,oracle,engine}=require('./stats-fuzz.js');
const fails=[]; const ok=(c,m)=>{console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails.push(m);};
let acc,seed=3; for(;;seed++){ acc=gen(seed,Date.now()); if(acc.rows.filter(r=>r.entry==='OUT').length>200 && !acc.startMode) break; }
const O=oracle(acc), ST=engine(acc,O);
(async()=>{ const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
 const ctx=await b.newContext(Object.assign({},devices['iPhone 13']));
 const p=await ctx.newPage(); const cdp=await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await p.route('**/api/v1/**',r=>{const u=r.request().url();
   if(u.includes('/stats'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(ST)});
   if(u.includes('/history'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"trades":[],"page":{"offset":0,"limit":200,"total":0}}'});
   if(u.includes('/positions'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"positions":[]}'});
   if(/\/customer\/accounts(\?|$)/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:[{account_id:'c0a00000-0000-4000-8000-00000000000c',account_number:'51000012',name:'DERIV',currency:'USD',balance:String(O.balance||1000),equity:String(O.balance||1000),display_status:'ACTIVE',status_reason:'OK',is_trading:true,risk_tier:'BALANCED'}]})});
   if(/community$/.test(u)) return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"threads":[],"members":[],"items":[],"posts":[],"mid":"x","profile":{"nickname":"lag"}}'});
   return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
 await p.addInitScript(()=>{ window.__lt=[]; new PerformanceObserver(l=>{ l.getEntries().forEach(e=>window.__lt.push([Math.round(e.startTime),Math.round(e.duration)])); }).observe({entryTypes:['longtask']}); });
 await p.goto(BASE+'/'); await p.waitForLoadState('load'); await p.waitForTimeout(1000);
 await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'lag@ftm.com',products:['auto'],name:'Lag'};});
 await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))); await p.waitForTimeout(4000);
 const mark=async(l,lim)=>{ const r=await p.evaluate(()=>{ const a=window.__lt; window.__lt=[]; return a; }); const tot=r.reduce((a,x)=>a+x[1],0); if(lim) ok(tot<=lim, l+': '+tot+' ms of blocking work (limit '+lim+')'); };
 await mark('load+open');
 await p.waitForTimeout(15000); await mark('idle 15 s on the dashboard',150);
 for(const v of ['perf','calendar','accounts','community','board','metrics']){ const t0=Date.now(); await p.evaluate(v=>FTM.showView(v),v); await p.waitForTimeout(2500); await mark('opening '+v,v==='metrics'?700:250); }
 await p.evaluate(()=>window.scrollTo(0,3000)); await p.waitForTimeout(1500); await mark('scrolling',150);
 await b.close(); console.log(fails.length?'FAILED: '+fails.length:'VIEW SPEED OK'); process.exit(fails.length?1:0); })();
