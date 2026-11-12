// A logged-in member must never be left on an empty dashboard because one request failed.
// Simulates: server error, network drop, expired token (401), and a brief empty account list. Each time the
// dashboard must show the real balance again on its own, without logging out and in. Run: node .github/tests/live-recovery.js (site on :8765)
process.env.TZ='Europe/Berlin';
const {chromium}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();
const BASE=process.argv[2]||'http://localhost:8765'; let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const ACC={account_id:'f7a00000-0000-4000-8000-0000000000e1',account_number:'5739503',name:'DERIV',currency:'USD',balance:'4321.09',equity:'4300.00',display_status:'ACTIVE',status_reason:'OK',is_trading:true,floating_profit:'-21.09',deposits:'4000',withdrawals:'0'};
const T=[{market:'XAUUSD',symbol:'XAUUSD',side:'BUY',volume:'0.1',opened_at:new Date(Date.now()-5*864e5).toISOString(),closed_at:new Date(Date.now()-4*864e5).toISOString(),net_profit:'321.09',position_ref:'1',copied_by_ftm:true}];
const SCEN=[['server error',['500']],['network drop',['abort','abort']],['expired token',['401']],['brief empty account list',['empty']],['several failures in a row',['500','abort','503']]];
(async()=>{ const b=await chromium.launch();
for(const [name,plan] of SCEN){ for(const [dev,opt] of [['laptop',{viewport:{width:1366,height:900}}],['phone',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}]]){
  const c=await b.newContext(opt); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  let q=null, forced=0;
  await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
  await p.route('**/api/v1/**',r=>{ const u=r.request().url();
    if(/\/customer\/accounts(\?|$)/.test(u)){ if(q&&q.length){ const s=q.shift();
        if(s==='abort') return r.abort(); if(s==='empty') return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,accounts:[]})});
        if(s==='401' && r.request().headers()['authorization']==='Bearer fresh'){ /* refreshed token is accepted */ }
        else return r.fulfill({status:+s,contentType:'application/json',body:JSON.stringify({ok:false,error:'X'})}); }
      return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:[ACC]})}); }
    if(u.includes('/history')) return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,trades:T,page:{offset:0,limit:200,total:1}})});
    if(u.includes('/billing')) return r.fulfill({status:200,contentType:'application/json',body:'{"status":"ACTIVE","plan":"ANNUAL"}'});
    if(u.includes('client-log')) return r.fulfill({status:204,body:''});
    return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"positions":[]}'}); });
  await p.goto(BASE+'/?preview=split'); await p.waitForTimeout(800);
  await p.exposeFunction('__forced',()=>{ forced++; });
  await p.evaluate(()=>{ const F=window.FTM; F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:f=>{ if(f) window.__forced(); return Promise.resolve(f?'fresh':'t'); },signOut:()=>Promise.resolve()}); F.session={email:'r@ftm.com',products:['auto'],name:'R'}; });
  await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))); await p.waitForTimeout(1500);
  const bal=()=>p.evaluate(()=>{ const a=(FTM.data.accounts||[])[0]; return a?a.balance:null; });
  ok(await bal()===4321.09, dev+' '+name+': first load shows the account');
  q=plan.slice(); await p.evaluate(()=>FTM.loadLive()); await p.waitForTimeout(400);
  const mid=await bal();
  await p.waitForFunction(()=>{ const a=(FTM.data.accounts||[])[0]; return a&&a.balance===4321.09&&!FTM._liveFails&&!FTM._liveRetryT; },null,{timeout:60000}).catch(()=>{});
  const end=await p.evaluate(()=>({bal:((FTM.data.accounts||[])[0]||{}).balance, session:!!FTM.session, hero:(document.getElementById('cvNow')||{}).textContent}));
  ok(end.bal===4321.09 && end.session, dev+' '+name+': the dashboard recovers by itself, no new login needed (balance '+end.bal+', meanwhile '+mid+')');
  if(plan[0]!=='empty') ok(mid===4321.09, dev+' '+name+': figures stay on screen while it reconnects (never an empty dashboard)');
  if(plan[0]==='401') ok(forced>0, dev+' '+name+': an expired token is renewed and the request repeated');
  ok(!errs.length, dev+' '+name+': no script errors '+(errs[0]||''));
  await c.close(); } }
// a session that truly ended (token cannot be renewed) goes to the login window, not an empty dashboard
{ const c=await b.newContext({viewport:{width:1366,height:900}}); const p=await c.newPage();
  await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
  await p.route('**/api/v1/**',r=>r.request().url().includes('/customer/')?r.fulfill({status:401,contentType:'application/json',body:'{"ok":false,"error":"UNAUTHENTICATED"}'}):r.fulfill({status:204,body:''}));
  await p.goto(BASE+'/?preview=split'); await p.waitForTimeout(800);
  await p.evaluate(()=>{ const F=window.FTM; F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:f=>Promise.resolve(f?null:'t'),signOut:()=>Promise.resolve()}); F.session={email:'r@ftm.com',products:['auto'],name:'R'}; F.openArea('auto'); return F.loadLive(); });
  await p.waitForTimeout(1500);
  const r=await p.evaluate(()=>({login:!document.getElementById('authOverlay').hidden, msg:(document.getElementById('authError')||{}).textContent, app:!document.getElementById('appView').hidden}));
  ok(r.login && !r.app && /session has ended/.test(r.msg), 'ended session: the login window opens with a clear message instead of an empty dashboard ('+JSON.stringify(r)+')');
  await c.close(); }
await b.close(); console.log(fails?'FAILED: '+fails:'LIVE RECOVERY OK'); process.exit(fails?1:0); })();
