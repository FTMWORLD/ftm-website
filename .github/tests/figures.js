// Figures test: highest balance, drawdown and gain must come only from the FTM engine, for every account
// type (customer, master preview), and deposits/withdrawals must never count as profit.
// Run: node .github/tests/figures.js [baseUrl]
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
const {chromium}=pw; const BASE=process.argv[2]||'http://localhost:8765';
const D=864e5, now=Date.now();
const hist=[
 {type:'BALANCE',time:new Date(now-9*D).toISOString(),profit:500,net:500},
 {type:'BUY',entry:'IN',position_ref:'A',time:new Date(now-8*D).toISOString(),profit:0,net:-1,symbol:'XAUUSD',volume:0.01},
 {type:'SELL',entry:'OUT',position_ref:'A',time:new Date(now-8*D+36e5).toISOString(),profit:12,net:12,symbol:'XAUUSD',volume:0.01},
 {type:'BALANCE',time:new Date(now-7*D).toISOString(),profit:-310,net:-310},
 {type:'BUY',entry:'IN',position_ref:'B',time:new Date(now-5*D).toISOString(),profit:0,net:-1,symbol:'XAUUSD',volume:0.01},
 {type:'SELL',entry:'OUT',position_ref:'B',time:new Date(now-5*D+36e5).toISOString(),profit:12.53,net:12.53,symbol:'XAUUSD',volume:0.01},
 {type:'BALANCE',time:new Date(now-1*D).toISOString(),profit:289.83,net:289.83}
];
const balance=500+11-310+11.53+289.83; // 502.36
const base={ok:true,history:hist.slice().reverse(),history_total:hist.length,deposits_total:789.83,withdrawals_total:310,closed_pl_total:22.53,trades_closed:2,wins:2,losses:0,win_rate_pct:100};
const full=Object.assign({},base,{peak_balance:504.94,peak_balance_at:new Date(now-2*D).toISOString(),peak_balance_trading:522.53,peak_balance_trading_at:new Date(now-5*D).toISOString(),
 max_drawdown_pct:1.71,max_drawdown_basis:'EQUITY_READINGS_EXCLUDING_DEPOSITS_WITHDRAWALS',max_drawdown_closed_balance_pct:1.03});
const fails=[]; const ok=(c,m)=>{console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails.push(m);};
(async()=>{
 const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
 for(const [label,stats,preview] of [['customer, engine figures',full,false],['customer, engine figures missing',base,false],['master preview, engine figures',full,true]]){
  const p=await b.newPage({viewport:{width:1280,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/api/v1/**',r=>{const u=r.request().url();
   if(u.includes('/stats'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(stats)});
   if(u.includes('/history'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"trades":[],"page":{"offset":0,"limit":200,"total":0}}'});
   if(u.includes('/positions'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"positions":[]}'});
   if(u.includes('/billing'))return r.fulfill({status:200,contentType:'application/json',body:'{"status":"ACTIVE"}'});
   if(/\/customer\/accounts(\?|$)/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:[Object.assign({account_id:'f7a00000-0000-4000-8000-000000000002',account_number:preview?null:'41734917',name:'DERIV',currency:'USD',balance:String(balance),equity:String(balance),display_status:preview?'PAUSED':'ACTIVE',status_reason:'OK',is_trading:!preview,deposits:'789.83',withdrawals:'310'},preview?{preview:true,view_only:true}:{})]})});
   return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
  await p.goto(BASE+'/');await p.waitForTimeout(800);
  await p.evaluate(pv=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'fig@ftm.com',products:pv?[]:['auto'],name:'Fig'};},preview);
  await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto')));await p.waitForTimeout(2500);
  const v=await p.evaluate(()=>{const g=i=>(document.getElementById(i)||{}).textContent||'';return {high:g('mHigh'),kp:g('kpHigh'),dd:g('mDDtile'),ddb:g('mDDbal'),gain:g('mGain'),pnl:g('dxPnl')};});
  if(stats===full){
   ok(/522\.53/.test(v.high)&&/522\.53/.test(v.kp), label+': highest balance is the engine trading peak (got '+v.high+')');
   ok(/1\.0%/.test(v.dd), label+': drawdown tile is the engine closed-balance drawdown (got '+v.dd+')');
   ok(/1\.03%/.test(v.ddb), label+': balance drawdown from the engine (got '+v.ddb+')');
  } else {
   ok(v.high.trim()==='—', label+': no website-made highest balance (got '+v.high+')');
   ok(v.dd.trim()==='—', label+': no website-made drawdown (got '+v.dd+')');
  }
  ok(/\+4\.70%/.test(v.gain), label+': gain = (balance - net deposits) / net deposits = +4.70% (got '+v.gain+')');
  ok(/\+\$23/.test(v.pnl)||/\+\$22/.test(v.pnl), label+': all-time profit = balance - net deposits = +22.53 (got '+v.pnl.replace(/\s+/g,' ').slice(-40)+')');
  ok(!errs.length, label+': no script errors '+(errs[0]||''));
  await p.close();
 }
 console.log(fails.length?('FAILED: '+fails.length):'ALL FIGURES OK'); process.exit(fails.length?1:0);
})();
