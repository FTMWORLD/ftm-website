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
    ok(!errs.length, tag+': no script errors '+(errs[0]||'')); await p.close(); }
  await b.close(); console.log(fails?'FAILED: '+fails:'RENEW OK'); process.exit(fails?1:0); })();
