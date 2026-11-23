// Get started -> Affiliate marketing -> FTM affiliate programme "Apply now" opens the application form at once (owner 23 Nov 2026:
// "Apply now does not work"), sending it confirms the review and the free account, and the email link ?open=aff lands on the Affiliate page.
// Run: node .github/tests/affiliate-apply-path.js http://localhost:8765
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');} const {chromium,devices}=pw; const BASE=process.argv[2]||'http://localhost:8765';
let bad=0; const ok=(c,m)=>{console.log((c?'OK     ':'BROKEN ')+m); if(!c) bad++;};
(async()=>{const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
for(const [nm,dev] of [['iPhone SE',devices['iPhone SE']],['iPhone 13',devices['iPhone 13']],['laptop',{viewport:{width:1440,height:900}}]]){
  const c=await b.newContext(dev),p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const posted=[];
  await p.route(/(binance|coinbase|gold-api|fonts\.g)/,r=>r.abort());
  await p.route('**/api/v1/**',r=>{const u=r.request().url();let d={};try{d=JSON.parse(r.request().postData()||'{}')}catch(e){} posted.push([u.replace(/.*\/api\/v1\//,''),d]);const J=o=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(o)});
    if(u.includes('/affiliate')){ if(d.action==='apply') return J({ok:true,status:'pending',code:'ADA',account:'created'}); if(d.action==='me') return J({ok:true,aff:{code:'ADA',status:'pending'},rules:{rate:10}}); return J({ok:true,valid:false}); }
    if(/\/customer\/accounts(\?|$)/.test(u))return J({ok:true,accounts:[]}); if(u.includes('/billing'))return J({status:'NONE'}); return J({ok:true});});
  await p.goto(BASE+'/',{waitUntil:'load'}); await p.waitForTimeout(900);
  await p.evaluate(()=>document.querySelector('.js-start').click()); await p.waitForTimeout(400);
  await p.click('#gsOverlay .gs-card[href="#partner"]'); await p.waitForTimeout(1200);
  await p.click('#partner a[href="#affiliate"]'); await p.waitForTimeout(500);
  const f=await p.evaluate(()=>{const m=document.getElementById('afModal'),n=m&&m.querySelector('#afName'),W=innerWidth,H=innerHeight; if(!m||m.hidden||!n) return null; const r=n.getBoundingClientRect(),c=m.querySelector('.af-mcard').getBoundingClientRect();
    return {top:Math.round(r.top),inView:r.top>=0&&r.bottom<=H,cardFits:c.left>=-1&&c.right<=W+1,over:[...m.querySelectorAll('*')].filter(e=>{const R=e.getBoundingClientRect();return R.width&&R.right>W+1}).length,locked:document.body.style.position}});
  ok(!!f,nm+': Apply now opens the application form');
  ok(f&&f.inView,nm+': the first form field is on screen at once (top '+(f&&f.top)+'px)');
  ok(f&&f.cardFits&&f.over===0,nm+': the form fits the screen');
  ok(f&&f.locked==='fixed',nm+': the page behind stays still');
  await p.fill('#afModal #afName','Ada Lovelace'); await p.fill('#afModal #afEmail','ada@gmail.com'); await p.check('#afModal #afAgree');
  const btn=await p.textContent('#afModal button[type=submit]'); ok(/free account/i.test(btn),nm+': the button says it also creates the free account ("'+btn.trim()+'")');
  await p.click('#afModal button[type=submit]'); await p.waitForTimeout(600);
  const done=await p.evaluate(()=>{const w=document.querySelector('#afModal .af-done');return w?{t:w.textContent,mail:!!w.querySelector('a[href*="mail.google"]'),top:Math.round(w.getBoundingClientRect().top)}:null});
  ok(done&&/being reviewed/.test(done.t)&&/create your password/.test(done.t),nm+': after sending: being reviewed + check your email to open the free account');
  ok(done&&done.mail&&done.top<innerHeightOf(dev),nm+': "Open my email" button for Gmail, shown on screen');
  ok(posted.some(x=>/affiliate/.test(x[0])&&x[1].action==='apply'&&x[1].name==='Ada Lovelace'&&x[1].agree===true),nm+': the application is sent');
  ok(posted.some(x=>/subscribe/.test(x[0])&&x[1].source==='affiliate'),nm+': the applicant is added like a free sign-up (FTM emails)');
  await p.keyboard.press('Escape'); ok(await p.evaluate(()=>document.body.style.position===''),nm+': closing frees the page again');
  await p.goto(BASE+'/?open=aff',{waitUntil:'load'}); await p.waitForTimeout(700);
  ok(await p.evaluate(()=>!/open=aff/.test(location.search)),nm+': ?open=aff is taken off the address');
  await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('t'),signOut:()=>Promise.resolve()});F.session={email:'ada@gmail.com',products:[],name:'Ada'};});
  await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))).catch(()=>{}); await p.waitForTimeout(2500);
  const v=await p.evaluate(()=>{const s=document.querySelector('.app-view[data-view="aff"]');return {on:s&&!s.hidden,t:(document.getElementById('affView')||{}).textContent||''}});
  ok(v.on&&/being reviewed/.test(v.t),nm+': after logging in from the email, the Affiliate page opens and says the application is being reviewed');
  ok(!errs.length,nm+': no script errors '+errs.join(' | '));
  await c.close(); }
await b.close(); console.log(bad?'FAILED':'ALL OK'); process.exit(bad?1:0);})();
function innerHeightOf(d){return (d.viewport&&d.viewport.height)||800;}
