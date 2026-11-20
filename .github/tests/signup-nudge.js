// Free sign-up pop-up (owner 20 Nov): opens after 20 s for a new visitor, once only, has a close button; never for a customer
// (logged in before on this device) and never when the server says this internet address already saw it, signed up or logged in.
// Run: node .github/tests/signup-nudge.js [baseUrl]
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
const {chromium,devices}=pw; const BASE=process.argv[2]||'http://localhost:8765';
let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
async function visit(opt,{show=true,customer=false,url='/'}={}){
  const c=await b.newContext(opt), p=await c.newPage(), calls=[]; await p.clock.install();
  await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
  await p.route('**/api/v1/nudge*',r=>{ const m=r.request().method(); calls.push(m==='POST'?JSON.parse(r.request().postData()||'{}').act:'GET'); r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,show})}); });
  if(customer) await c.addInitScript(()=>{ try{ localStorage.setItem('ftm_customer','1'); }catch(e){} });
  await p.goto(BASE+url,{waitUntil:'domcontentloaded'}); await p.clock.runFor(2000);
  return {c,p,calls};
}
for(const [n,opt] of [['laptop',{viewport:{width:1280,height:900}}],['phone',devices['iPhone 13']]]){
  let {c,p,calls}=await visit(opt);
  ok(!(await p.isVisible('#suEmail')), n+': nothing pops up straight away');
  await p.clock.runFor(19000); await p.waitForTimeout(400);
  ok(await p.isVisible('#suEmail'), n+': after 20 seconds the free sign-up opens');
  ok(calls.includes('GET')&&calls.includes('shown'), n+': the server is asked first and told it was shown ('+calls.join(',')+')');
  await p.click('#authClose'); await p.waitForTimeout(300);
  ok(!(await p.isVisible('#suEmail')), n+': the close button closes it');
  await p.reload({waitUntil:'domcontentloaded'}); await p.clock.runFor(25000); await p.waitForTimeout(400);
  ok(!(await p.isVisible('#suEmail')), n+': never a second time on the same device');
  await c.close();
  ({c,p,calls}=await visit(opt,{show:false})); await p.clock.runFor(25000); await p.waitForTimeout(400);
  ok(!(await p.isVisible('#suEmail')) && calls.includes('GET') && !calls.includes('shown'), n+': an address that already saw it, signed up or logged in: no pop-up'); await c.close();
  ({c,p,calls}=await visit(opt,{customer:true})); await p.clock.runFor(25000); await p.waitForTimeout(400);
  ok(!(await p.isVisible('#suEmail')) && calls.includes('customer') && !calls.includes('GET'), n+': a customer (logged in before) never gets it, and the address is marked as a customer ('+calls.join(',')+')'); await c.close();
  ({c,p,calls}=await visit(opt,{url:'/?start=ig'})); await p.waitForTimeout(300); await p.clock.runFor(1500); await p.waitForTimeout(300);
  const opened=await p.isVisible('#suEmail'); await p.click('#authClose').catch(()=>{}); await p.clock.runFor(25000); await p.waitForTimeout(400);
  ok(opened && !calls.includes('GET') && !(await p.isVisible('#suEmail')), n+': a sign-up link opens it once and the 20-second pop-up does not repeat it'); await c.close();
}
await b.close(); console.log(fails?fails+' BROKEN':'all OK'); process.exit(fails?1:0); })();
