// Open positions follow the engine within seconds, and a closed trade refreshes the closed-trade history (owner 23 Nov 2026: "it doesn't update fast").
// Run: node .github/tests/positions-live.js http://localhost:8765
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');} const {chromium,devices}=pw; const BASE=process.argv[2]||'http://localhost:8765';
let bad=0; const ok=(c,m)=>{console.log((c?'OK     ':'BROKEN ')+m); if(!c) bad++;};
const pos=(ref,sym,pl)=>({position_ref:ref,market:sym,side:'BUY',volume:'7.80',open_price:'26000',current_price:'26010',floating_profit:String(pl),swap:'0',opened_at:new Date(Date.now()-3600e3).toISOString(),snapshot_at:new Date().toISOString()});
(async()=>{const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
for(const [nm,dev] of [['phone',devices['iPhone 13']],['laptop',{viewport:{width:1440,height:900}}]]){
  const c=await b.newContext(dev),p=await c.newPage(); let open=[pos('p1','HK50',113.87)], hist=0;
  await p.route(/(binance|coinbase|gold-api|fonts\.g)/,r=>r.abort());
  await p.route('**/api/v1/**',r=>{const u=r.request().url(),J=o=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(o)});
    if(u.includes('/positions'))return J({ok:true,positions:open});
    if(u.includes('/history')){hist++;return J({ok:true,trades:[],page:{offset:0,limit:5000,total:0}});}
    if(u.includes('/stats'))return J({pending:true});
    if(/\/customer\/accounts(\?|$)/.test(u))return J({ok:true,account_limit:{max:3,used:1},accounts:[{account_id:'a1',account_number:'5739503',currency:'USD',balance:'100000',equity:'100113.87',display_status:'ACTIVE',status_reason:'OK',is_trading:true,deposits:'100000',withdrawals:'0'}]});
    if(u.includes('/billing'))return J({status:'ACTIVE',plan:'ANNUAL'}); return J({ok:true});});
  await p.goto(BASE+'/'); await p.waitForTimeout(800);
  await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('t'),signOut:()=>Promise.resolve()});F.session={email:'t@ftm.com',products:['auto'],name:'T'};});
  await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))); await p.waitForTimeout(2500);
  const chips=()=>p.evaluate(()=>[...document.querySelectorAll('#lvList .lv-set:first-child .lv-c b')].map(e=>e.textContent).join(','));
  ok((await chips())==='HK50',nm+': strip shows the open HK50 trade');
  open=[pos('p1','HK50',150.10),pos('p2','XAUUSD',12.5)]; const t0=Date.now();
  await p.waitForFunction(()=>/XAUUSD/.test(document.getElementById('lvList').textContent),null,{timeout:9000}).catch(()=>{});
  const dt=Date.now()-t0; ok(/XAUUSD/.test(await chips()),nm+': a new trade appears in the strip within '+Math.round(dt/1000)+' s (max 7 s)'); ok(dt<7000,nm+': fast enough');
  const h0=hist; open=[pos('p2','XAUUSD',20)];
  await p.waitForFunction(()=>!/HK50/.test(document.querySelector('#lvList .lv-set').textContent),null,{timeout:9000}).catch(()=>{});
  ok(!/HK50/.test(await chips()),nm+': a closed trade leaves the strip within seconds');
  await p.waitForTimeout(1500); ok(hist>h0,nm+': closing a trade reloads the closed-trade history');
  await c.close(); }
await b.close(); console.log(bad?'FAILED':'ALL OK'); process.exit(bad?1:0);})();
