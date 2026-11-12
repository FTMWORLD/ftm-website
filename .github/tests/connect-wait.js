// A trading account the engine has not read yet must never sit on a bare "Connecting": the member sees how long
// FTM has been checking, any status the engine gives, an honest message after 10 minutes, and FTM support is alerted
// once. The status keeps being re-checked (no 15-minute stop). Run: node .github/tests/connect-wait.js (site on :8765)
const {chromium}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();
const path=require('path');
const BASE=process.argv[2]||'http://localhost:8765'; let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const ACC={account_id:'acc-stuck-1',account_number:'101875056',name:'DERIV',currency:'USD',balance:'0',equity:'0',display_status:'SETUP_INCOMPLETE',status_reason:'VALIDATION_PENDING',is_trading:false,server:'DerivSVG-Server-02'};
(async()=>{
  // the server side: a stuck alert never crashes, even without an email key
  { const h=require(path.join(__dirname,'../../api/v1/client-log.js')); let code=0; const res={status:c=>{code=c; return {end:()=>{}}; }};
    await h({method:'POST',headers:{},body:{ev:'connect_stuck',reason:'101875056 VALIDATIONPENDING 12'}},res); ok(code===204,'client-log accepts a stuck-connection alert ('+code+')'); }
  const b=await chromium.launch();
  for(const [dev,opt] of [['laptop',{viewport:{width:1366,height:900}}],['phone',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}]]){
    const c=await b.newContext(opt); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); let polls=0; const logs=[];
    await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
    await p.route('**/api/v1/**',r=>{ const u=r.request().url();
      if(u.includes('client-log')){ logs.push(r.request().postData()||''); return r.fulfill({status:204,body:''}); }
      if(/\/customer\/accounts(\?|$)/.test(u)){ polls++; return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,accounts:[ACC]})}); }
      if(u.includes('/billing')) return r.fulfill({status:200,contentType:'application/json',body:'{"status":"ACTIVE","plan":"ANNUAL"}'});
      if(u.includes('/history')) return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"trades":[],"page":{"offset":0,"limit":200,"total":0}}'});
      return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"positions":[]}'}); });
    await p.addInitScript(()=>{ try{ localStorage.setItem('ftm_pend_acc-stuck-1',String(Date.now()-12*60000)); }catch(e){} });
    await p.goto(BASE+'/'); await p.waitForTimeout(800);
    await p.evaluate(()=>{ const F=window.FTM; F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('t'),signOut:()=>Promise.resolve()}); F.session={email:'w@ftm.com',products:['auto'],name:'W'}; return F.loadLive().then(()=>F.openArea('auto')); });
    await p.waitForTimeout(2500);
    const r=await p.evaluate(()=>{ if(FTM.renderActivate) FTM.renderActivate(); if(FTM.renderAccounts) FTM.renderAccounts();
      const st=[...document.querySelectorAll('#actSteps li')].map(l=>l.textContent).join(' | '); const row=(document.querySelector('#acctRows .conn')||{}).textContent||''; const note=(document.querySelector('#acctRows .acct-action-note')||{}).textContent||'';
      const opt=[...document.querySelectorAll('#dxView option')].map(o=>o.textContent).join(' | '); return {st,row,note,opt}; });
    ok(/taking longer than usual/.test(r.st), dev+': after 10 minutes the setup steps say honestly that it takes longer and FTM is checking ('+r.st.slice(0,160)+')');
    ok(/· 1\d min/.test(r.row) && /taking longer than usual/.test(r.note), dev+': the account row shows how long it has been connecting and the explanation ('+r.row+' / '+r.note.slice(0,60)+')');
    ok(!/View only/.test(r.opt), dev+': a connecting account is not called "View only" ('+r.opt+')');
    await p.waitForTimeout(1500);
    ok(logs.filter(x=>/connect_stuck/.test(x)&&/101875056/.test(x)).length===1, dev+': FTM support is alerted exactly once ('+logs.filter(x=>/connect_stuck/.test(x)).length+')');
    const p0=polls; await p.waitForTimeout(7000); ok(polls>p0, dev+': the status keeps being re-checked ('+(polls-p0)+' checks in 7 s)');
    ok(!errs.length, dev+': no script errors '+(errs[0]||''));
    await c.close(); }
  await b.close(); console.log(fails?'FAILED: '+fails:'CONNECT WAIT OK'); process.exit(fails?1:0); })();
