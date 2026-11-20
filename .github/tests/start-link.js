// One-tap sign-up links for posts and bios (?start=ig|fb|tt|yt|wa): the free sign-up opens straight away, the link's source
// is remembered (30 days) and sent with the sign-up so FTM knows which platform brings people; a normal visit sends no source.
// Run: node .github/tests/start-link.js [baseUrl]
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
const {chromium,devices}=pw; const BASE=process.argv[2]||'http://localhost:8765';
let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
for(const [n,opt] of [['laptop',{viewport:{width:1280,height:900}}],['phone',devices['iPhone 13']]]){
  const c=await b.newContext(opt), p=await c.newPage(), mails=[];
  await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
  await p.route('**/api/v1/subscribe',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
  await p.route('**/api/v1/auth-email',r=>{ mails.push(JSON.parse(r.request().postData()||'{}')); r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}); });
  await p.goto(BASE+'/?start=IG',{waitUntil:'domcontentloaded'}); await p.evaluate(()=>{ FTM.auth.ready=()=>true; });
  const vis=await p.waitForSelector('#suEmail',{state:'visible',timeout:6000}).then(()=>true).catch(()=>false);
  ok(vis, n+': ?start=ig opens the free sign-up at once');
  ok(!/start=/.test(await p.evaluate(()=>location.search)), n+': the link is cleaned from the address bar');
  await p.fill('#suEmail','from.instagram@example.com'); await p.click('#signupPane button[type=submit]'); await p.waitForTimeout(900);
  ok(mails.length===1&&mails[0].src==='ig', n+': the sign-up is sent with its source ('+JSON.stringify(mails[0]||{})+')');
  const c2=await b.newContext(opt), p2=await c2.newPage(), m2=[];
  await p2.route(/(binance|coinbase|gold-api)/,r=>r.abort()); await p2.route('**/api/v1/subscribe',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
  await p2.route('**/api/v1/auth-email',r=>{ m2.push(JSON.parse(r.request().postData()||'{}')); r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}); });
  await p2.goto(BASE+'/',{waitUntil:'domcontentloaded'}); await p2.waitForTimeout(1500);
  ok(!(await p2.isVisible('#suEmail')), n+': a normal visit does not open the sign-up');
  await p2.evaluate(()=>{ FTM.auth.ready=()=>true; document.querySelector('.js-signup').click(); }); await p2.waitForSelector('#suEmail',{state:'visible'});
  await p2.fill('#suEmail','direct@example.com'); await p2.click('#signupPane button[type=submit]'); await p2.waitForTimeout(900);
  ok(m2.length===1&&!m2[0].src, n+': a normal sign-up has no source');
  await c.close(); await c2.close();
}
await b.close(); console.log(fails?fails+' BROKEN':'all OK'); process.exit(fails?1:0); })();
