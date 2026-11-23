// The FTM staff menu shows the green "new" dot like every other menu item when something new happens in the staff
// area (new sign-up, new affiliate), and the dot goes away once the staff console is opened (owner 23 Nov 2026).
// Run: node .github/tests/staff-dot.js http://localhost:8765
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');} const {chromium,devices}=pw; const BASE=process.argv[2]||'http://localhost:8765';
let bad=0; const ok=(c,m)=>{console.log((c?'OK     ':'BROKEN ')+m); if(!c) bad++;};
(async()=>{const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
for(const [nm,dev] of [['phone',devices['iPhone 13']],['laptop',{viewport:{width:1440,height:900}}]]){
  const c=await b.newContext(dev),p=await c.newPage(); let sig='5|2026-11-23T10:00:00Z|2|x';
  await p.route(/(binance|coinbase|gold-api|fonts\.g)/,r=>r.abort());
  await p.route('**/api/v1/**',r=>{const u=r.request().url();let d={};try{d=JSON.parse(r.request().postData()||'{}')}catch(e){}const J=o=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(o)});
    if(u.includes('/community')&&d.action==='staff') return J({ok:true,staff:true,role:'owner'});
    if(u.includes('/staff')){ if(d.op==='pulse') return J({ok:true,sig}); if(d.op==='dashboard') return J({ok:true,at:new Date().toISOString(),accounts:[],totals:{}}); return J({ok:true,items:[],members:[],affiliates:[]}); }
    if(/\/customer\/accounts(\?|$)/.test(u))return J({ok:true,accounts:[{account_id:'a1',account_number:'1',currency:'USD',balance:'100',equity:'100',display_status:'ACTIVE',is_trading:true}]}); if(u.includes('/billing'))return J({status:'ACTIVE',plan:'ANNUAL'}); return J({ok:true,positions:[],trades:[],page:{total:0}});});
  await p.goto(BASE+'/'); await p.waitForTimeout(700);
  await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('t'),signOut:()=>Promise.resolve()});F.session={email:'owner@ftm.com',products:['auto'],name:'O'};});
  await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))).catch(()=>{}); await p.waitForTimeout(7000);
  const has=()=>p.evaluate(()=>{const n=document.querySelector('.app-nav-item[data-view="staff"]');return n?n.classList.contains('has-new'):null});
  ok((await has())===false,nm+': no dot while nothing changed');
  sig='6|2026-11-23T15:00:00Z|2|x';
  await p.evaluate(()=>{ return fetch('/api/v1/staff',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'pulse'})}).then(r=>r.json()).then(j=>window.FTM.navSignal('staff',j.sig)); });
  await p.waitForTimeout(2500);
  ok((await has())===true,nm+': a new sign-up puts the green dot on the FTM staff menu');
  await p.evaluate(()=>document.querySelector('.app-nav-item[data-view="staff"]').click()); await p.waitForTimeout(2500);
  await p.evaluate(()=>document.querySelector('.app-nav-item[data-view="metrics"]').click()); await p.waitForTimeout(2500);
  ok((await has())===false,nm+': opening the staff console clears the dot');
  await c.close(); }
await b.close(); console.log(bad?'FAILED':'ALL OK'); process.exit(bad?1:0);})();
