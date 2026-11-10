// Menu green dots: a section with something new (closed trade, message, follower) gets a green dot; opening it clears the dot.
// Run: node .github/tests/nav-dots-e2e.js (site on :8765)
const {chromium}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();
const BASE=process.argv[2]||'http://localhost:8765', SHOTS=process.env.KYC_SHOTS||'';
let fails=0, THREADS=[]; const tall=async(p,f)=>{ await p.setViewportSize({width:390,height:2050}); await p.evaluate(()=>{ const a=document.getElementById('appView'); if(a) a.scrollTop=0; window.scrollTo(0,0); }); await p.waitForTimeout(300); await p.screenshot({path:f}); await p.setViewportSize({width:390,height:844}); };
const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const OK_V={goal:['GROW_SAVINGS','MONTHLY_INCOME','LONG_TERM','TRY_FIRST'],experience:['NONE','SOME','EXPERIENCED'],drawdown_comfort:[10,25,35]};
function engine(){ const st={full_name:null,country:null,goal:null,experience:null,drawdown_comfort:null,completed_at:null}, puts=[];
  const view=()=>{ const done=['full_name','country','goal','experience','drawdown_comfort'].every(k=>st[k]!=null); if(done&&!st.completed_at) st.completed_at=new Date().toISOString(); if(!done) st.completed_at=null;
    return {ok:true,profile:Object.assign({},st,{full_name:st.full_name||'Tanaya Rao',full_name_saved:st.full_name!=null,kyc_completed:done,suggested_tier:st.drawdown_comfort==null?null:{10:'CONSERVATIVE',25:'BALANCED',35:'GROWTH'}[st.drawdown_comfort]})}; };
  return {puts, handle(method,body){ if(method==='GET') return [200,view()];
    puts.push(body); for(const k of Object.keys(body)){ const v=body[k]; if(!(k in st)) return [422,{ok:false,error:'VALIDATION_FAILED'}];
      if(v!==null && OK_V[k] && OK_V[k].indexOf(v)===-1) return [422,{ok:false,error:'VALIDATION_FAILED'}]; if(k==='country'&&v!==null&&!/^[A-Z]{2}$/.test(v)) return [422,{ok:false,error:'VALIDATION_FAILED'}]; st[k]=v; }
    return [200,view()]; } }; }
async function open(b,vp,E,dflt){
  const p=await b.newPage({viewport:vp}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
  await p.route('**/api/v1/**',async r=>{ const u=r.request().url();
    if(/\/customer\/kyc-profile/.test(u)){ const o=E.handle(r.request().method(),JSON.parse(r.request().postData()||'{}')); return r.fulfill({status:o[0],contentType:'application/json',body:JSON.stringify(o[1])}); }
    if(/\/customer\/accounts(\?|$)/.test(u)) return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:[{account_id:'f7a00000-0000-4000-8000-0000000000a1',account_number:'1001',currency:'USD',balance:'500',equity:'500',display_status:'ACTIVE',status_reason:'OK',is_trading:true,deposits:'500',withdrawals:'0'}]})});
    if(u.includes('/billing')) return r.fulfill({status:200,contentType:'application/json',body:'{"status":"ACTIVE","plan":"ANNUAL"}'});
    if(u.includes('/api/v1/community')){ const a=JSON.parse(r.request().postData()||'{}').action; return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,profile:{nickname:'Tanaya'},followers:0,members:[],threads:a==='threads'?THREADS:[]})}); }
    return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"trades":[],"positions":[],"history":[]}'}); });
  await p.goto(BASE+'/'); await p.waitForTimeout(700);
  await p.evaluate(()=>{ try{ localStorage.removeItem('ftm_kyc_ban'); }catch(e){} const F=window.FTM; F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()}); F.session={email:'t@x.com',products:['auto'],name:'Tanaya Rao'}; });
  await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))); await p.waitForTimeout(3500);
  p.errs=errs; return p;
}
(async()=>{
  const b=await chromium.launch({...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{})});
  for(const [label,vp] of [['laptop',{width:1280,height:900}],['phone',{width:390,height:844}]]){
    THREADS=[]; const p=await open(b,vp,engine());
    const dot=v=>p.evaluate(v=>document.querySelector('#appView .app-nav-item[data-view="'+v+'"]').classList.contains('has-new'),v);
    await p.evaluate(()=>{ FTM.navCheck(); FTM.navPaint(); }); await p.waitForTimeout(800); await p.evaluate(()=>FTM.navPaint());
    ok(!(await dot('metrics'))&&!(await dot('community')),label+': no dots when nothing is new');
    await p.evaluate(()=>FTM.showView('community')); await p.waitForTimeout(400);
    await p.evaluate(()=>{ const n=Date.now(); FTM.data.closed.push({symbol:'XAUUSD',dir:'BUY',lots:0.01,openTime:new Date(n-36e5).toISOString(),closeTime:new Date(n).toISOString(),open:2000,close:2010,profit:10,pl:10,net:10}); FTM.navPaint(); });
    ok(await dot('metrics'),label+': a trade closes while on Community: green dot on Dashboard');
    ok(!(await dot('community')),label+': no dot on the section you are looking at');
    await p.evaluate(()=>document.querySelector('#appView .app-nav-item[data-view="metrics"]').click()); await p.waitForTimeout(300);
    ok(!(await dot('metrics')),label+': opening Dashboard clears its dot');
    THREADS=[{mid:'abc',nickname:'Marine',last:'Hi!',from:'them',t:new Date().toISOString(),unread:true}];
    await p.evaluate(()=>FTM.navCheck()); await p.waitForTimeout(800);
    ok(await dot('community'),label+': a new message arrives while on Dashboard: green dot on Community');
    if(process.env.NAV_SHOTS) await p.screenshot({path:process.env.NAV_SHOTS+'/nav_dots_'+label+'.png',clip:label==='laptop'?{x:0,y:80,width:300,height:620}:{x:0,y:0,width:390,height:200}});
    await p.evaluate(()=>document.querySelector('#appView .app-nav-item[data-view="community"]').click()); await p.waitForTimeout(300);
    ok(!(await dot('community')),label+': opening Community clears its dot');
    const col=await p.evaluate(()=>{ const n=document.querySelector('#appView .app-nav-item[data-view="perf"]'); return n.classList.contains('has-new')?getComputedStyle(n,'::after').backgroundColor:''; });
    ok(col==='rgb(34, 197, 94)',label+': the dot is green ('+col+')');
    ok(!p.errs.length,label+': no script errors '+(p.errs[0]||''));
    await p.close();
  }
  await b.close(); console.log(fails?'FAILED: '+fails:'NAV DOTS OK'); process.exit(fails?1:0);
})();
