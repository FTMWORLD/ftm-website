// Terms and Privacy: every section has a menu link, phone menu is one slim scrolling row, the top bar does not cover the text on phones,
// homepage links point at the right Terms sections. Run: node .github/tests/legal-pages.js [baseUrl]
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
const {chromium,devices}=pw; const BASE=process.argv[2]||'http://localhost:8765';
let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
for(const [n,opt] of [['laptop',{viewport:{width:1366,height:900}}],['phone',devices['iPhone 13']]]){ const c=await b.newContext(opt);
 for(const pg of ['terms.html','privacy.html']){ const p=await c.newPage(), errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE+'/'+pg); await p.waitForTimeout(500);
  const r=await p.evaluate(()=>{ const S=[...document.querySelectorAll('section[id]')].map(s=>s.id), L=[...document.querySelectorAll('.side a')].map(a=>a.getAttribute('href').slice(1)), H=[...document.querySelectorAll('section[id] h2')].map(h=>parseInt(h.textContent));
    window.scrollTo(0,3000); const top=document.querySelector('.top').getBoundingClientRect(), sm=document.querySelector('.side-mobile'), smr=sm.getBoundingClientRect();
    return {same:JSON.stringify(S)===JSON.stringify(L), seq:H.every((h,i)=>h===i+1), n:S.length, topCovers:top.bottom>0&&top.height>200, sm:getComputedStyle(sm).display==='none'?0:Math.round(smr.height), fits:document.documentElement.scrollWidth<=innerWidth}; });
  ok(r.same && r.seq, n+' '+pg+': '+r.n+' sections, numbered 1..'+r.n+', each in the menu');
  ok(!r.topCovers, n+' '+pg+': the top bar does not cover the text while reading');
  ok(r.sm<80, n+' '+pg+': section menu is one slim row ('+r.sm+'px)');
  ok(r.fits && !errs.length, n+' '+pg+': fits the screen, no script errors '+(errs[0]||''));
  await p.close(); }
 await c.close(); }
const p=await b.newPage(); await p.goto(BASE+'/'); const L=await p.evaluate(()=>[...document.querySelectorAll('a[href*="terms.html#s"]')].map(a=>[a.textContent.trim(),a.getAttribute('href').split('#')[1]]));
await p.goto(BASE+'/terms.html'); const T=await p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('section[id]')].map(s=>[s.id,s.querySelector('h2').textContent])));
const want={'Regulatory information':/Regulatory Status/,'Privacy policy':/Data Protection/,'Secure & responsible trading':/Prohibited/,'Fraud prevention':/Prohibited/,'Risk Disclosure':/Risk/,'Secure and Responsible Trading':/Prohibited/};
L.forEach(([t,id])=>{ const w=want[t]; if(w) ok(w.test(T[id]||''), 'homepage link "'+t+'" opens Terms '+(T[id]||id)); });
await b.close(); console.log(fails?'FAILED: '+fails:'LEGAL PAGES OK'); process.exit(fails?1:0); })();
