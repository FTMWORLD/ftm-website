// Brand-new customers: a subscriber with no trading account sees a welcome card with 3 steps (not a page of zeros) and one
// button that opens the connect form; an account that is still connecting says so; once an account exists the card is gone;
// free members never see it. Phone and laptop, no script errors. Run: node .github/tests/onboarding-e2e.js [baseUrl]
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
const {chromium,devices}=pw; const BASE=process.argv[2]||'http://localhost:8765';
let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const now=Date.now(), D=864e5, acct=o=>Object.assign({account_id:'f7a00000-0000-4000-8000-0000000000e1',account_number:'5739503',name:'DERIV',server:'Deriv-Demo',currency:'USD',display_status:'ACTIVE',status_reason:'OK',is_trading:true,risk_tier:'BALANCED'},o);
const SC={new:{products:['auto'],accounts:[]},connecting:{products:['auto'],accounts:[acct({balance:null,equity:null,display_status:'CONNECTING',status_reason:'CONNECTING',is_trading:false})]},
  firstday:{products:['auto'],accounts:[acct({balance:'1000',equity:'1000',deposits:'1000'})]},free:{products:[],accounts:[]}};
(async()=>{ const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
for(const [n,opt] of [['laptop',{viewport:{width:1366,height:900}}],['phone',devices['iPhone 13']]]) for(const [name,sc] of Object.entries(SC)){
  const c=await b.newContext(opt), p=await c.newPage(), errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route(/(binance|coinbase|gold-api|fonts\.g)/,r=>r.abort());
  await p.route('**/api/v1/**',r=>{ const u=r.request().url(), J=o=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(o)});
    if(u.includes('/stats')) return J({ok:true,history:[],history_total:0,trades_closed:0});
    if(u.includes('/history')) return J({ok:true,trades:[],page:{offset:0,limit:200,total:0}});
    if(u.includes('/positions')) return J({ok:true,positions:[]});
    if(/\/customer\/accounts(\?|$)/.test(u)) return J({ok:true,account_limit:{max:3,used:sc.accounts.length},accounts:sc.accounts});
    if(u.includes('/billing')) return J(sc.products.length?{status:'ACTIVE',plan:'ANNUAL',period_end:new Date(now+300*D).toISOString()}:{status:'NONE'});
    return J({ok:true}); });
  await p.goto(BASE+'/'); await p.waitForTimeout(800);
  await p.evaluate(sc=>{ const F=window.FTM; F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('t'),signOut:()=>Promise.resolve()}); F.session={email:'new.person@example.com',products:sc.products,name:''}; },sc);
  await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))); await p.waitForTimeout(2200);
  const r=await p.evaluate(()=>{ const v=e=>!!(e&&e.offsetParent); return {card:v(document.getElementById('obCard')), hero:v(document.querySelector('.dx-hero')), sub:document.getElementById('pageSub').textContent, wide:document.documentElement.scrollWidth>innerWidth}; });
  if(name==='new'){
    ok(r.card && !r.hero, n+' new subscriber: welcome card with 3 steps instead of a page of zeros');
    await p.click('#obGo'); await p.waitForTimeout(600);
    ok(await p.evaluate(()=>{ const s=document.querySelector('.cx-sheet'); return !!(s&&!s.hidden&&getComputedStyle(s).display!=='none'&&s.getBoundingClientRect().height>100&&s.querySelector('#appBroker')); }), n+' new subscriber: "Connect my trading account" opens the connect form');
  }
  if(name==='connecting') ok(/Connecting your account/.test(r.sub) && !r.card, n+' account still connecting: says so ('+r.sub+')');
  if(name==='firstday') ok(!r.card && r.hero, n+' account connected: the welcome card is gone and the figures show');
  if(name==='free') ok(!r.card, n+' free member: no welcome card (the plans banner shows instead)');
  ok(!r.wide && !errs.length, n+' '+name+': fits the screen, no script errors '+(errs[0]||''));
  await c.close(); }
await b.close(); console.log(fails?'FAILED: '+fails:'ONBOARDING OK'); process.exit(fails?1:0); })();
