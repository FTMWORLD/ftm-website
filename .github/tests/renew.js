// Subscription card: "Renew subscription" only shows in the last 7 days before the plan ends (or after); "Upgrade plan" always.
// Run: node .github/tests/renew.js (site on :8765)
const {chromium}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();
const BASE=process.argv[2]||'http://localhost:8765'; let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch({...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{})});
  for(const vp of [{width:1280,height:900},{width:390,height:844}]){
    const p=await b.newPage({viewport:vp}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.route(/(binance|coinbase|gold-api)/,r=>r.abort()); await p.goto(BASE+'/'); await p.waitForTimeout(800);
    const tag=vp.width>500?'laptop':'phone';
    for(const [days,want] of [[392,false],[30,false],[8,false],[7,true],[2,true],[-3,true]]){
      const r=await p.evaluate(d=>{ const F=FTM; F.planFree=false; F.planLifetime=false; F.planName='Annual'; F.planEnd=new Date(Date.now()+d*864e5-60000).toISOString(); F.subRing(); return {ren:!document.getElementById('subRenew').hidden, up:!document.getElementById('subUp').hidden}; },days);
      ok(r.ren===want && r.up, tag+': '+days+' days left: Renew '+(want?'shown':'hidden')+', Upgrade shown ('+JSON.stringify(r)+')');
    }
    const lf=await p.evaluate(()=>{ FTM.planLifetime=true; FTM.subRing(); return !document.getElementById('subRenew').hidden; }); ok(!lf, tag+': lifetime plan never shows Renew');
    { const g=await p.evaluate(()=>{ const F=FTM; F.planLifetime=false; F.planName='5 Years'; F.session={email:'g@x.com',products:['auto']}; F.planStatus='EXPIRED'; F.planEnd=new Date(Date.now()-10*864e5).toISOString(); F.planBar(); const t=document.getElementById('planBarTxt').textContent, kept=!F.graceCheck()&&!!F.session; return {t,kept}; });
      ok(/You can still log in until/.test(g.t)&&g.kept, tag+': plan ended 10 days ago: still logged in, the bar says until when ('+g.t+')'); }
    { const g=await p.evaluate(()=>new Promise(res=>{ const F=FTM; F.auth=Object.assign(F.auth||{},{signOut:()=>Promise.resolve()}); F.session={email:'g@x.com',products:['auto']}; F.planStatus='EXPIRED'; F.planEnd=new Date(Date.now()-31*864e5).toISOString(); const out=F.graceCheck();
        setTimeout(()=>{ const er=document.getElementById('authError'); res({out, session:!!F.session, msg:er&&!er.hidden?er.textContent:''}); },700); }));
      ok(g.out&&!g.session&&/grace period is over/.test(g.msg)&&/See plans/.test(g.msg), tag+': one month after the plan ended: logged out with the reason and See plans ('+g.msg+')'); }
    { const g=await p.evaluate(()=>{ const F=FTM; F.session={email:'i@x.com',products:['auto','invest']}; F.planStatus='EXPIRED'; F.planEnd=new Date(Date.now()-60*864e5).toISOString(); const a=F.graceCheck(); F.session={email:'l@x.com',products:['auto']}; F.planLifetime=true; const b=F.graceCheck(); F.planLifetime=false; F.planStatus='ACTIVE'; const c=F.graceCheck(); return [a,b,c]; });
      ok(!g[0]&&!g[1]&&!g[2], tag+': investors, Lifetime and active plans are never logged out ('+g.join(',')+')'); }
    await p.evaluate(()=>{ const x=document.getElementById('authClose'); if(x) x.click(); });
    ok(!errs.length, tag+': no script errors '+(errs[0]||'')); await p.close(); }
  await b.close(); console.log(fails?'FAILED: '+fails:'RENEW OK'); process.exit(fails?1:0); })();
