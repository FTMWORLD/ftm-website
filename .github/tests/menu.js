// Account menu: green FTM MACHINE ACTIVATED when trading (red Activate otherwise), no Subscription plans for subscribers, support items inside Customer support.
// Run: node .github/tests/menu.js (site on :8765)
process.env.TZ='Europe/Berlin';
const {chromium,devices}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();const BASE=process.argv[2]||'http://localhost:8765';
const {gen,oracle,engine}=require(require('path').join(__dirname,'stats-fuzz.js'));
let acc,seed=3; for(;;seed++){ acc=gen(seed,Date.now()); if(acc.rows.filter(r=>r.entry==='OUT').length>30 && !acc.startMode) break; }
const O=oracle(acc), ST=engine(acc,O);
const P={}; acc.rows.forEach(r=>{ if(!r.entry) return; const x=P[r.pos]=P[r.pos]||{pos:r.pos,sym:r.sym,net:0,lots:0}; x.net+=r.net; if(r.entry==='IN'){x.open=r.t;x.side=r.type;} else {x.close=r.t;x.lots+=r.vol;} });
const rows=Object.values(P).filter(x=>x.close).map((x,i)=>({market:x.sym,symbol:x.sym,side:x.side,volume:String(x.lots),opened_at:new Date(x.open).toISOString(),closed_at:new Date(x.close).toISOString(),net_profit:String(Math.round(x.net*100)/100),position_ref:x.pos,copied_by_ftm:i%3!==0})).sort((a,b)=>b.closed_at.localeCompare(a.closed_at));
let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
(async()=>{const b=await chromium.launch({...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{})});
for(const [n,opt] of [['laptop',{viewport:{width:1440,height:900},deviceScaleFactor:1}],['iphone',devices['iPhone 13']]]){
const errs=[]; const c=await b.newContext(Object.assign({timezoneId:'Europe/Berlin',locale:'en-GB'},opt));const p=await c.newPage();
await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
await p.route('**/api/v1/**',r=>{const u=r.request().url();
 if(u.includes('/stats'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(ST)});
 if(u.includes('/history'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,trades:rows,page:{offset:0,limit:200,total:rows.length}})});
 if(/\/customer\/accounts(\?|$)/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:[{account_id:'f7a00000-0000-4000-8000-0000000000e1',account_number:'5739503',currency:'USD',balance:String(O.balance),equity:String(O.balance),display_status:'ACTIVE',status_reason:'OK',is_trading:true,deposits:String(O.dep),withdrawals:String(O.wd)}]})});
 if(u.includes('/billing'))return r.fulfill({status:200,contentType:'application/json',body:'{"status":"ACTIVE","plan":"ANNUAL"}'});
 return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"positions":[]}'});});
await p.goto(BASE+'/?preview=split');await p.waitForTimeout(800);
await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('t'),signOut:()=>Promise.resolve()});F.session={email:'t@ftm.com',products:['auto'],name:'T'};});
await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto')));await p.waitForTimeout(2500);
p.on('pageerror',e=>errs.push(e.message));
await p.waitForTimeout(1600); await p.click('#appView .um-btn'); await p.waitForTimeout(400);
let r=await p.evaluate(()=>({act:(document.querySelector('#acctA .um-actd')||{}).textContent||'', red:!!document.querySelector('#acctA .um-act'), home:!!document.querySelector('#acctA a.um-home:not([hidden])'), subHidden:document.querySelector('#acctA .um-sub').hidden}));
ok(r.act==='FTM MACHINE ACTIVATED' && !r.red, n+': trading customer sees green FTM MACHINE ACTIVATED');
ok(!r.home, n+': subscribed customer does not see Subscription plans');
ok(r.subHidden, n+': Ask here, Chat and Email support are folded under Customer support');
await p.click('#acctA .um-sup'); await p.waitForTimeout(200);
r=await p.evaluate(()=>[...document.querySelectorAll('#acctA .um-sub .um-i')].filter(x=>x.offsetParent).map(x=>x.textContent).join('|')); ok(r==='Ask here|Chat with FTM support|Email support', n+': Customer support opens the three choices ('+r+')');
await p.evaluate(()=>{ FTM.data.accounts.forEach(a=>a.active=false); FTM.planFree=true; }); await p.waitForTimeout(1800);
r=await p.evaluate(()=>({red:!!document.querySelector('#acctA .um-act'), home:!!document.querySelector('#acctA a.um-home:not([hidden])')}));
ok(r.red && r.home, n+': a customer without FTM MACHINE sees red Activate FTM MACHINE and Subscription plans');
await p.evaluate(()=>{ document.getElementById('appView').classList.add('free'); }); await p.waitForTimeout(300);
if(!(await p.isVisible('#acctA .um-act'))){ await p.click('#appView .um-btn'); await p.waitForTimeout(300); }
await p.click('#acctA .um-act'); await p.waitForTimeout(1900);
r=await p.evaluate(()=>{ const pr=document.getElementById('pricing').getBoundingClientRect(); return {app:document.getElementById('appView').hidden, top:Math.round(pr.top), y:Math.round(scrollY)}; });
ok(r.app && r.top>-50 && r.top<200, n+': a free account tapping Activate FTM MACHINE lands on the plans to subscribe (app hidden '+r.app+', plans at '+r.top+'px, scrollY '+r.y+')');
ok(!errs.length, n+': no script errors '+(errs[0]||''));
await c.close();}
await b.close(); console.log(fails?'FAILED: '+fails:'MENU OK'); process.exit(fails?1:0);})();
