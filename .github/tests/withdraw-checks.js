// Investment withdrawal checks every input before anything is sent (owner 23 Nov 2026): an empty or wrong USDT address
// turns the address box red, an empty amount turns the amount box red, no balance or too much says "Insufficient funds",
// and only a valid request reaches the warning and the engine.
// Run: node .github/tests/withdraw-checks.js http://localhost:8765
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');} const {chromium,devices}=pw; const BASE=process.argv[2]||'http://localhost:8765';
let bad=0; const ok=(c,m)=>{console.log((c?'OK     ':'BROKEN ')+m); if(!c) bad++;};
const inv=w=>({ok:true,investments:w===null?[]:[{id:'c1',amount:'10000.00',currency:'EUR',joined_at:'2025-09-20',status:'ACTIVE',eligible_from:'2026-11-01',ends_on:'2030-09-20',value_now:'11500.00',profit_to_date:'1500.00',return_pct:'15.00',withdrawable_now:String(w),pending:[],history:[]}]});
(async()=>{const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
for(const [nm,dev] of [['phone',devices['iPhone 13']],['laptop',{viewport:{width:1440,height:900}}]]){
 for(const [label,w] of [['300 available',300],['nothing available',0]]){
  const c=await b.newContext(dev),p=await c.newPage(); const posted=[];
  await p.route(/(binance|coinbase|gold-api|fonts\.g)/,r=>r.abort());
  await p.route('**/api/v1/**',r=>{const u=r.request().url(),m=r.request().method();const J=(s,o)=>r.fulfill({status:s,contentType:'application/json',body:JSON.stringify(o)});
    if(m==='POST') posted.push(u.replace(/.*\/api\/v1\//,''));
    if(/customer\/investments(\?|$)/.test(u)) return J(200,inv(w)); if(/investments\/c1\/withdraw/.test(u)) return J(202,{ok:true,requested:true});
    if(/\/customer\/accounts(\?|$)/.test(u))return J(200,{ok:true,accounts:[]}); if(u.includes('/billing'))return J(200,{status:'ACTIVE',plan:'ANNUAL'}); return J(200,{ok:true});});
  await p.goto(BASE+'/'); await p.waitForTimeout(700);
  await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('t'),signOut:()=>Promise.resolve()});F.session={email:'i@ftm.com',products:['auto','invest'],name:'I'};});
  await p.evaluate(()=>FTM.loadLive().then(()=>{FTM.invest._loaded=false;FTM.openArea('invest');})).catch(()=>{}); await p.waitForTimeout(2000);
  await p.evaluate(()=>document.querySelector('.iv-item[data-iv="withdraw"]').click()); await p.waitForTimeout(500);
  const st=()=>p.evaluate(()=>({msg:document.getElementById('ivWMsg').hidden?'':document.getElementById('ivWMsg').textContent,addr:document.getElementById('ivWAddr').classList.contains('is-bad'),amt:document.getElementById('ivWAmt').classList.contains('is-bad')}));
  const tag=nm+' / '+label+': ';
  await p.fill('#ivWAmt','100'); await p.fill('#ivWAddr',''); await p.click('#ivWBtn'); await p.waitForTimeout(300);
  let s=await st(); ok(s.addr&&/USDT wallet address/.test(s.msg),tag+'no address: the address box turns red ('+s.msg+')');
  await p.fill('#ivWAddr','0x12'); await p.click('#ivWBtn'); await p.waitForTimeout(300);
  s=await st(); ok(s.addr&&/not a valid USDT address/.test(s.msg),tag+'wrong address for the network: red + message');
  await p.fill('#ivWAddr','TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE'); await p.fill('#ivWAmt',''); await p.click('#ivWBtn'); await p.waitForTimeout(300);
  s=await st(); ok(s.amt&&!s.addr&&/Enter the amount/.test(s.msg),tag+'no amount: the amount box turns red');
  await p.fill('#ivWAmt','5000'); await p.click('#ivWBtn'); await p.waitForTimeout(300);
  s=await st(); ok(s.amt&&/Insufficient funds/.test(s.msg),tag+'more than available: Insufficient funds ('+s.msg+')');
  ok(!posted.some(x=>/withdraw/.test(x)),tag+'nothing was sent for any of these');
  if(w>0){ await p.fill('#ivWAmt','300'); await p.click('#ivWBtn'); await p.waitForSelector('#wnModal:not([hidden])',{timeout:4000}).catch(()=>{});
    ok(!posted.some(x=>/withdraw/.test(x)),tag+'the warning comes first, nothing sent yet'); await p.click('#wnGo').catch(()=>{}); await p.waitForTimeout(1200);
    s=await st(); ok(/Request received/.test(s.msg)&&posted.some(x=>/investments\/c1\/withdraw/.test(x)),tag+'a valid request goes through after the warning ('+s.msg+')'); }
  await c.close(); } }
await b.close(); console.log(bad?'FAILED':'ALL OK'); process.exit(bad?1:0);})();
