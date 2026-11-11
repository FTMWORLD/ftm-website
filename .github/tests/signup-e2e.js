// Free sign-up: "Check your email" appears at once (even when the newsletter service is slow), the sign-up email's real result is shown,
// a failed email can be sent again, on phone and laptop. Run: node .github/tests/signup-e2e.js [baseUrl]
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
const {chromium,devices}=pw; const BASE=process.argv[2]||'http://localhost:8765';
let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
for(const [n,opt] of [['laptop',{viewport:{width:1280,height:900}}],['phone',devices['iPhone 13']],['small phone',{viewport:{width:320,height:640},isMobile:true,hasTouch:true}]]){
  const c=await b.newContext(opt), p=await c.newPage(), errs=[]; p.on('pageerror',e=>errs.push(e.message));
  let mailMode='ok', mails=[];
  await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
  await p.route('**/api/v1/subscribe',async r=>{ await new Promise(x=>setTimeout(x,3000)); r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}); });
  await p.route('**/api/v1/auth-email',async r=>{ mails.push(JSON.parse(r.request().postData()||'{}')); await new Promise(x=>setTimeout(x,300)); r.fulfill(mailMode==='ok'?{status:200,contentType:'application/json',body:'{"ok":true}'}:{status:502,contentType:'application/json',body:'{"ok":false,"error":"EMAIL_FAILED"}'}); });
  await p.goto(BASE+'/',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1200);
  await p.evaluate(()=>{ FTM.auth.ready=()=>true; });
  const open=async()=>{ await p.evaluate(()=>{ const a=document.querySelector('.js-signup'); a.click(); }); await p.waitForSelector('#suEmail',{state:'visible'}); };
  await open(); await p.fill('#suEmail','new.member@example.com');
  ok(!(await p.$('#signupPane input[type=checkbox]')) && /including FTM emails/.test(await p.textContent('#signupPane .auth-agree-note')), n+': no checkbox; agreeing to the Terms (including FTM emails) is stated under the email');
  const t0=Date.now(); await p.click('#signupPane button[type=submit]'); await p.waitForSelector('#suSent',{state:'visible',timeout:5000}).catch(()=>{}); const dt=Date.now()-t0;
  ok(dt<1000, n+': "Check your email" shows at once ('+dt+' ms), not after the newsletter service');
  await p.waitForTimeout(700);
  let st=await p.evaluate(()=>[document.getElementById('suSentTo').textContent,document.getElementById('suState').textContent]);
  ok(st[0]==='new.member@example.com' && /^Sent/.test(st[1]), n+': the sign-up email is really sent and confirmed ('+st[1]+')');
  ok(mails.length===1 && mails[0].mode==='signup' && mails[0].email==='new.member@example.com', n+': one sign-up email request with the right email');
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), n+': nothing wider than the screen');
  // failure: the person is told, and can send again
  await p.evaluate(()=>{ document.getElementById('authOverlay').hidden=true; }); mailMode='fail';
  await open(); await p.fill('#suEmail','second@example.com'); await p.click('#signupPane button[type=submit]'); await p.waitForTimeout(900);
  st=await p.evaluate(()=>[document.getElementById('suState').textContent, !document.getElementById('suResend').hidden]);
  ok(/could not send/i.test(st[0]) && st[1], n+': a failed email is shown with "Send the link again" ('+st[0]+')');
  mailMode='ok'; await p.click('#suResend'); await p.waitForTimeout(700);
  st=await p.evaluate(()=>document.getElementById('suState').textContent);
  ok(/^Sent/.test(st) && mails.length===3, n+': sending again works ('+st+')');
  ok(!errs.length, n+': no script errors '+(errs[0]||''));
  await c.close(); }
await b.close(); console.log(fails?'FAILED: '+fails:'SIGNUP OK'); process.exit(fails?1:0); })();
