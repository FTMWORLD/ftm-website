// Logging out and in again (for example after a password change) must open the Dashboard with its figures,
// never an empty page - also for FTM staff whose staff page was open when they logged out.
// Run: node .github/tests/relogin.js (site on http://localhost:8765)
const {chromium}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();
let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const BASE=process.argv[2]||'http://localhost:8765';
const L=(y,m,d)=>new Date(y,m,d,12).getTime(), T=[[L(2026,8,5),250],[L(2026,9,3),400],[L(2026,10,4),150]];
const hist=[{type:'BALANCE',entry:'IN',time:new Date(L(2026,8,2)).toISOString(),profit:10000,net:10000}], copies=[];
T.forEach(([t,p],i)=>{ hist.push({type:'SELL',entry:'OUT',position_ref:'P'+i,time:new Date(t).toISOString(),symbol:'XAUUSD',volume:1,price:1,profit:p,commission:0,swap:0,fee:0,net:p}); copies.push({execution_id:'e'+i,symbol:'XAUUSD',side:'BUY',volume:'1',opened_at:new Date(t-36e5).toISOString(),closed_at:new Date(t).toISOString(),net_profit:String(p),position_ref:'P'+i}); });
const stats={ok:true,history:hist.slice().reverse(),history_total:hist.length,deposits_total:10000,withdrawals_total:0};
(async()=>{
  const b=await chromium.launch();
  for(const [label,vp,last] of [['laptop staff page',{width:1440,height:900},'staff'],['phone staff page',{width:390,height:844},'staff'],['laptop accounts',{width:1440,height:900},'accounts'],['phone performance',{width:390,height:844},'perf']]){
    const p=await b.newPage({viewport:vp}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
    await p.route('**/api/v1/**',r=>{ const u=r.request().url(), J=o=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(o)}), pd=r.request().postData()||'';
      if(u.includes('/stats')) return J(stats); if(u.includes('/history')) return J({ok:true,trades:copies,page:{offset:0,limit:200,total:copies.length}});
      if(u.includes('/positions')) return J({ok:true,positions:[]});
      if(/\/customer\/accounts(\?|$)/.test(u)) return J({ok:true,account_limit:{max:3,used:1},accounts:[{account_id:'a1',account_number:'555',currency:'USD',balance:'10800',equity:'10800',display_status:'ACTIVE',is_trading:true}]});
      if(u.includes('/community')&&/"op":"check"/.test(pd)) return J({ok:true,staff:true,role:'owner'});
      if(u.includes('/staff')) return J({ok:true,stats:{},problems:[],at:new Date().toISOString()});
      return J({ok:true}); });
    await p.goto(BASE+'/'); await p.waitForTimeout(700);
    await p.evaluate(()=>{ const A=FTM.auth; A.getAccessToken=()=>Promise.resolve('tok'); A.signOut=()=>Promise.resolve(); A.signInWithPassword=(e)=>Promise.resolve({email:e,products:['auto'],name:'G'}); FTM.session={email:'ftmwebnation@gmail.com',products:['auto'],name:'G'}; });
    await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))); await p.waitForTimeout(3200);
    if(last==='staff'){ await p.waitForSelector('.nav-staff',{timeout:8000}).catch(()=>{}); await p.evaluate(()=>{ const n=document.querySelector('.nav-staff'); if(n) n.click(); }); }
    else await p.evaluate(v=>FTM.showView(v),last);
    await p.waitForTimeout(600);
    const before=await p.evaluate(()=>[...document.querySelectorAll('#appView .app-view')].filter(v=>!v.hidden).map(v=>v.dataset.view).join());
    await p.evaluate(()=>document.getElementById('appLogout').click()); await p.waitForTimeout(3500);
    await p.evaluate(()=>{ document.getElementById('authEmail').value='ftmwebnation@gmail.com'; document.getElementById('authPass').value='new-password-1'; const f=document.getElementById('authForm'); f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event('submit',{cancelable:true})); });
    await p.waitForTimeout(3000);
    const st=await p.evaluate(()=>{ const vis=[...document.querySelectorAll('#appView .app-view')].filter(v=>!v.hidden), m=document.querySelector('.app-view[data-view="metrics"]');
      return {app:!document.getElementById('appView').hidden, vis:vis.map(v=>v.dataset.view).join(), h:vis.reduce((a,v)=>a+v.getBoundingClientRect().height,0), on:(document.querySelector('.app-nav-item.is-on')||{dataset:{}}).dataset.view, bal:(document.getElementById('dxVal')||{}).textContent||''}; });
    ok(st.app&&/metrics/.test(st.vis)&&st.on==='metrics'&&st.h>600,'['+label+'] after logging out from "'+before+'" and in again, the Dashboard shows ('+st.vis+', '+Math.round(st.h)+'px, nav '+st.on+')');
    ok(/10,800|10.800/.test(st.bal),'['+label+'] with the figures (balance '+st.bal.trim()+')');
    ok(!errs.length,'['+label+'] no script errors '+errs.join(' | ')); await p.close();
  }
  await b.close(); console.log(fails?fails+' BROKEN':'ALL OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
