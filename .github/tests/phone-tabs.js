// Phone tab bar of the client area: the open tab is always fully visible (scrolled into view) and marked by a
// gold line under it, never a stray bar next to another tab. Run: node .github/tests/phone-tabs.js (site on :8765)
const {chromium,devices}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();
const BASE=process.argv[2]||'http://localhost:8765'; let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch();
for(const [dev,opt] of [['iPhone 13',devices['iPhone 13']],['iPhone SE',devices['iPhone SE']],['small Android',{viewport:{width:360,height:740},isMobile:true,hasTouch:true}]]){
  const c=await b.newContext(opt); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
  await p.route('**/api/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"accounts":[],"positions":[],"trades":[]}'}));
  await p.goto(BASE+'/'); await p.waitForTimeout(800);
  await p.evaluate(()=>{ const F=window.FTM; F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('t'),signOut:()=>Promise.resolve()}); F.session={email:'t@ftm.com',products:['auto'],name:'T'}; return F.loadLive().then(()=>F.openArea('auto')); });
  await p.waitForTimeout(1200);
  for(const v of ['metrics','accounts','perf','calendar','sessions','board','community','charts']){
    await p.evaluate(v=>FTM.showView(v),v); await p.waitForTimeout(700);
    const r=await p.evaluate(()=>{ const nav=document.querySelector('#appView .app-nav'), on=nav.querySelector('.app-nav-item.is-on'), nr=nav.getBoundingClientRect(), q=on.getBoundingClientRect();
      const st=getComputedStyle(on,'::before'), bl=parseFloat(st.left), bw=parseFloat(st.width);
      return {vis:q.left>=nr.left-1 && q.right<=nr.right+1, bar:st.content!=='none' && bl>=0 && bl+bw<=q.width+1, name:on.textContent.trim()}; });
    ok(r.vis, dev+' '+v+': the open tab "'+r.name+'" is fully visible');
    ok(r.bar, dev+' '+v+': the gold marker sits under the open tab');
  }
  ok(!errs.length, dev+': no script errors '+(errs[0]||''));
  await c.close(); }
await b.close(); console.log(fails?'FAILED: '+fails:'PHONE TABS OK'); process.exit(fails?1:0); })();
