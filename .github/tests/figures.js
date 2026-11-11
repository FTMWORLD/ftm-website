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
   if(/\/customer\/accounts(\?|$)/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:[Object.assign({account_id:'f7a00000-0000-4000-8000-000000000002',account_number:preview?null:'41734917',name:'DERIV',currency:'USD',balance:String(balance),equity:String(balance),display_status:preview?'PAUSED':'ACTIVE',status_reason:'OK',is_trading:!preview,risk_tier:'BALANCED',deposits:'789.83',withdrawals:'310'},preview?{preview:true,view_only:true}:{})]})});
   return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
  await p.goto(BASE+'/');await p.waitForTimeout(800);
  await p.evaluate(pv=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'fig@ftm.com',products:pv?[]:['auto'],name:'Fig'};},preview);
  await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto')));await p.waitForTimeout(2500);
  const v=await p.evaluate(()=>{const g=i=>(document.getElementById(i)||{}).textContent||'';return {high:g('mHigh'),kp:g('kpHigh'),dd:g('mDDtile'),ddb:g('mDDbal'),gain:g('mGain'),pnl:g('dxPnl')};});
  if(stats===full){
   ok(/504\.94/.test(v.high)&&/504\.94/.test(v.kp), label+': highest balance is the highest balance the account really reached, from the engine (got '+v.high+')');
   ok(/1\.03%/.test(v.dd), label+': drawdown tile is the engine closed-balance drawdown (got '+v.dd+')');
   ok(/1\.03%/.test(v.ddb), label+': balance drawdown from the engine (got '+v.ddb+')');
  } else {
   ok(v.high.trim()==='—', label+': no website-made highest balance (got '+v.high+')');
   ok(v.dd.trim()==='—', label+': no website-made drawdown (got '+v.dd+')');
  }
  ok(/\+8\.06%/.test(v.gain), label+': gain is time-weighted: each trade on the balance at that moment, chained = +8.06% (got '+v.gain+')');
  const same=await p.evaluate(()=>{const g=i=>(document.getElementById(i)||{}).textContent||'';const F=window.FTM;F.unit='percent';
    const nav=v=>document.querySelector('#appView .app-nav-item[data-view="'+v+'"]').click();
    const yr=g('mYear'); const all=[...document.querySelectorAll('#dxPnl .pp-t')].map(x=>x.textContent);
    F.redrawAllViews&&F.redrawAllViews(); F.renderPerf&&0;
    return {yr, allTime:all[3]||'', perfTotal:(document.querySelector('#perfYears .perf-cell.ytd b')||{}).textContent||'', pxYear:(()=>{const h=[...document.querySelectorAll('#pxYears thead th')].map(x=>x.textContent.trim()).indexOf('Return');const td=document.querySelectorAll('#pxYears tbody tr:first-child td')[h];return td?td.textContent:'';})()};});
  ok(/8\.06%/.test(same.yr), label+': profit this year matches the gain (got '+same.yr+')');
  ok(/8\.06%/.test(same.allTime)&&/\+\$23|\+\$22/.test(same.allTime), label+': profit by period, all time = +22.53 and +8.06% (got '+same.allTime+')');
  ok(/8\.06%/.test(same.pxYear), label+': year-by-year return matches (got '+same.pxYear+')');
  const pt=await p.evaluate(()=>{FTM.unit='percent';document.querySelector('#appView .app-nav-item[data-view="perf"]').click();return new Promise(r=>setTimeout(()=>{FTM.unit='percent';if(FTM.redrawAllViews)FTM.redrawAllViews();setTimeout(()=>r((document.querySelector('#perfYears .perf-cell.ytd b')||{}).textContent||''),600);},600));});
  ok(/8\.06%/.test(pt), label+': yearly performance total (in %) matches (got '+pt+')');
  const cvh=await p.evaluate(()=>{document.querySelector('#appView .app-nav-item[data-view="metrics"]').click();return new Promise(r=>setTimeout(()=>r((document.getElementById('cvChg')||{}).textContent||''),500));});
  ok(/22\.53/.test(cvh)&&/8\.06%/.test(cvh), label+': balance chart header (All) = all-time profit +22.53 / +8.06% (got '+cvh+')');
  const fsAll=await p.evaluate(()=>{const c=[...document.querySelectorAll('#fsGrid .fs-c')].find(x=>/all time/i.test(x.textContent));return c?c.textContent:'';});
  ok(/8\.06%/.test(fsAll), label+': performance summary, all time matches (got '+fsAll+')');
  const fsW=await p.evaluate(()=>{const C=[...document.querySelectorAll('#fsGrid .fs-c')];const w=C.find(x=>/this week/i.test(x.textContent));if(!w)return 'missing';const n=new Date(),s=new Date(n.getFullYear(),n.getMonth(),n.getDate()-((n.getDay()+6)%7)).getTime(),g=FTM.metrics().seg(s,null);return (C.indexOf(w)===0&&C.length%2===0&&w.querySelector('b').textContent===(g.pct>0?'+':'')+g.pct.toFixed(2)+'%')?'ok':'bad '+C.length+' '+w.textContent;});
  ok(fsW==='ok', label+': performance summary starts with This week (shared time-weighted %, even grid) (got '+fsW+')');
  const fsP=await p.evaluate(()=>{const b=[...document.querySelectorAll('#fsGrid button.fs-c')].find(x=>/all time/i.test(x.textContent));if(!b)return 'no button';b.click();const sh=document.getElementById('fsPop');if(!sh||sh.hidden)return 'no pop-up';const dd=[...sh.querySelectorAll('.fsp-grid div')].find(d=>/^trades$/i.test(d.querySelector('dt').textContent));const n=FTM.data.closed.filter(t=>t.closeTime).length,pc=sh.querySelector('.fsp-big b').textContent,want=b.querySelector('b').textContent,tips=sh.querySelectorAll('.fsp-bars i[data-tip]').length;sh.click();return (dd&&+dd.querySelector('dd').textContent===n&&pc===want&&tips>0&&sh.hidden)?'ok':'bad '+(dd&&dd.textContent)+' n='+n+' '+pc+'/'+want+' tips='+tips;});
  ok(fsP==='ok', label+': tapping a period opens its statistics pop-up (same %, every closed trade, daily bars with details) (got '+fsP+')');
  const fsA=await p.evaluate(()=>{const b=[...document.querySelectorAll('#fsGrid button.fs-c')].find(x=>/all time/i.test(x.textContent));b.click();const sh=document.getElementById('fsPop'),c=FTM._fsCells.find(x=>x.l==='All time'),cl=FTM.data.closed.map(t=>+new Date(t.closeTime)).filter(Boolean),a0=Math.min(...cl),yrs=(Date.now()-a0)/(365.25*864e5),d=[...sh.querySelectorAll('.fsp-grid div')].find(x=>/per year/i.test(x.textContent));const how=!!sh.querySelector('.fsp-how');sh.click();if(yrs<1)return d?'shown under a year':'ok';if(!d)return 'missing';const want=(Math.pow(1+c.g.pct/100,1/yrs)-1)*100,got=parseFloat(d.querySelector('dd').textContent.replace(/[^0-9.\-]/g,''));return (Math.abs(got-want)<0.02&&how)?'ok':'bad '+got+' vs '+want.toFixed(2)+' how='+how;});
  ok(fsA==='ok', label+': all-time pop-up shows the average yearly return (compounded, same shared %) and how it is calculated (got '+fsA+')');
  if(stats===full && !preview){ const rk=await p.evaluate(()=>[document.getElementById('rkScore').textContent,document.getElementById('rkVs').textContent,document.getElementById('rkRange').textContent]);
   ok(/1\.03%/.test(rk[0]) && /Below/.test(rk[1]) && /20\D{1,4}40%/.test(rk[2]), label+': risk level = engine drawdown against the Balanced band 20-40% (got '+rk.join(' | ')+')'); }
  ok(!errs.length, label+': no script errors '+(errs[0]||''));
  await p.close();
 }
 // Switching accounts: a customer viewing the master preview must see only the master's own engine figures.
 {
  const p=await b.newPage({viewport:{width:1280,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const DEMO='f7a00000-0000-4000-8000-0000000000d1', MAS='f7a00000-0000-4000-8000-0000000000a5';
  const demoStats=Object.assign({},full,{peak_balance:20028.06,peak_balance_at:new Date(now-30*D).toISOString(),max_drawdown_closed_balance_pct:49.34});
  const mh=[{type:'BALANCE',time:new Date(now-6*D).toISOString(),profit:100000,net:100000},{type:'SELL',entry:'OUT',position_ref:'M1',time:new Date(now-4*D).toISOString(),profit:2528.95,net:2528.95,symbol:'XAUUSD',volume:1},{type:'BUY',entry:'OUT',position_ref:'M2',time:new Date(now-2*D).toISOString(),profit:-8795.31,net:-8795.31,symbol:'XAUUSD',volume:1}];
  const masStats={ok:true,history:mh.slice().reverse(),history_total:mh.length,deposits_total:100000,withdrawals_total:0,closed_pl_total:-6266.36,trades_closed:2,wins:1,losses:1,win_rate_pct:50,
   peak_balance:102528.95,peak_balance_at:new Date(now-4*D).toISOString(),max_drawdown_pct:10.48,max_drawdown_basis:'EQUITY_READINGS_EXCLUDING_DEPOSITS_WITHDRAWALS',max_drawdown_closed_balance_pct:8.58};
  await p.route('**/api/v1/**',async r=>{const u=r.request().url();
   if(u.includes('/stats')){ await new Promise(z=>setTimeout(z,u.includes(MAS)?900:0)); return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(u.includes(MAS)?masStats:demoStats)}); }
   if(u.includes('/history'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"trades":[],"page":{"offset":0,"limit":200,"total":0}}'});
   if(u.includes('/positions'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"positions":[]}'});
   if(u.includes('/billing'))return r.fulfill({status:200,contentType:'application/json',body:'{"status":"ACTIVE"}'});
   if(/\/customer\/accounts(\?|$)/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:[
     {account_id:DEMO,account_number:'184',name:'DERIV',currency:'USD',balance:'12000',equity:'12000',display_status:'ACTIVE',status_reason:'OK',is_trading:true,deposits:'20000',withdrawals:'0'},
     {account_id:MAS,account_number:null,preview:true,view_only:true,currency:'USD',balance:'93733.64',equity:'93733.64',display_status:'PAUSED',deposits:'100000',withdrawals:'0'}]})});
   return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
  await p.goto(BASE+'/');await p.waitForTimeout(800);
  await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'sw@ftm.com',products:['auto'],name:'Sw'};});
  await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto')));await p.waitForTimeout(2000);
  const g=()=>p.evaluate(()=>{const g=i=>(document.getElementById(i)||{}).textContent||'';return {high:g('mHigh'),dd:g('mDDtile'),gain:g('mGain')};});
  const before=await g(); ok(/20,028\.06/.test(before.high), 'switch: demo shows its own highest balance (got '+before.high+')');
  await p.evaluate(()=>FTM.viewAccount('MASTER')); await p.waitForTimeout(300);
  const mid=await g(); ok(!/20,028/.test(mid.high) && !/49\.34/.test(mid.dd), 'switch: while the master loads, no demo figures are shown (got '+mid.high+' / '+mid.dd+')');
  await p.waitForTimeout(2500);
  const after=await g(); ok(/102,528\.95/.test(after.high) && /8\.58%/.test(after.dd), 'switch: master shows its own engine figures (got '+after.high+' / '+after.dd+')');
  const yr=await p.evaluate(()=>[document.getElementById('mYear').textContent,document.getElementById('mGain').textContent]);
  ok(/-6\.27%/.test(yr[0]) && /-6\.27%/.test(yr[1]), 'switch: master profit this year and gain = (93,733.64 - 100,000) / 100,000 = -6.27% (got '+yr.join(' / ')+')');
  ok(!errs.length, 'switch: no script errors '+(errs[0]||''));
  await p.close();
 }
 // Engine balance that disagrees with the history (the master on 9 Nov: history -5,154.34 was right, the reported balance 99,606.31 was not):
 // profit and % must come from the closed-trade history, never from balance minus deposits.
 {
  const p=await b.newPage({viewport:{width:1280,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const gh=[{type:'BALANCE',time:new Date(now-6*D).toISOString(),profit:100000,net:100000},{type:'SELL',entry:'OUT',position_ref:'G1',time:new Date(now-4*D).toISOString(),profit:2528.95,net:2528.95,symbol:'USTEC',volume:1},{type:'BUY',entry:'OUT',position_ref:'G2',time:new Date(now-2*D).toISOString(),profit:-7683.29,net:-7683.29,symbol:'USTEC',volume:1}];
  const gs={ok:true,history:gh.slice().reverse(),history_total:gh.length,deposits_total:100000,withdrawals_total:0,closed_pl_total:-5154.34,trades_closed:2,wins:1,losses:1,win_rate_pct:50,peak_balance:102528.95,peak_balance_at:new Date(now-4*D).toISOString(),max_drawdown_pct:9.5,max_drawdown_basis:'EQUITY_READINGS_EXCLUDING_DEPOSITS_WITHDRAWALS',max_drawdown_closed_balance_pct:9.02};
  await p.route('**/api/v1/**',r=>{const u=r.request().url();
   if(u.includes('/stats'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(gs)});
   if(u.includes('/history'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"trades":[],"page":{"offset":0,"limit":200,"total":0}}'});
   if(u.includes('/positions'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"positions":[]}'});
   if(u.includes('/billing'))return r.fulfill({status:200,contentType:'application/json',body:'{"status":"ACTIVE"}'});
   if(/\/customer\/accounts(\?|$)/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:[{account_id:'f7a00000-0000-4000-8000-0000000000b7',account_number:null,preview:true,view_only:true,currency:'USD',balance:'99606.31',equity:'99644.10',display_status:'PAUSED',deposits:'100000',withdrawals:'0'}]})});
   return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
  await p.goto(BASE+'/');await p.waitForTimeout(800);
  await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'gap@ftm.com',products:[],name:'Gap'};});
  await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto')));await p.waitForTimeout(2500);
  const v=await p.evaluate(()=>{const g=i=>(document.getElementById(i)||{}).textContent||'';return {gain:g('mGain'),year:g('mYear'),net:g('mNet')};});
  ok(/-5\.15%/.test(v.gain)&&/-5\.15%/.test(v.year), 'balance disagrees: gain and profit this year come from the trade history = -5.15% (got '+v.gain+' / '+v.year+')');
  ok(/-\$5,154\.34/.test(v.net), 'balance disagrees: net P/L is the engine closed P/L -5,154.34 (got '+v.net+')');
  const iv=await p.evaluate(()=>{const g=i=>(document.getElementById(i)||{}).textContent||'';return {row:g('mInitL')+' '+g('mInit')+' · '+g('mInitD'),hero:g('dxInitL')+' '+g('dxInitV')+' · '+g('dxInitD'),shown:!document.getElementById('dxInit').hidden};});
  ok(/^Initial deposit \$100,000\.00 · /.test(iv.row)&&iv.shown&&iv.hero===iv.row, 'initial deposit: first deposit 100,000.00 with its date, in Capital flows and under the account value (got '+iv.row+' / '+iv.hero+')');
  ok(!errs.length, 'balance disagrees: no script errors '+(errs[0]||''));
  await p.close();
 }
 // History that starts after the account opened (like demo #184 from 5 Oct): the engine sends start_balance.
 // Identity: balance = start_balance + deposits - withdrawals + closed P/L + fees_and_adjustments + credit. A wrong reported balance must not move the start.
 {
  const p=await b.newPage({viewport:{width:1280,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const sh=[{type:'BUY',entry:'OUT',position_ref:'S1',time:new Date(now-4*D).toISOString(),profit:500,net:500,symbol:'XAUUSD',volume:0.1},{type:'SELL',entry:'OUT',position_ref:'S2',time:new Date(now-2*D).toISOString(),profit:-200,net:-200,symbol:'XAUUSD',volume:0.1}];
  const ss={ok:true,history:sh.slice().reverse(),history_total:sh.length,start_balance:10000,fees_and_adjustments:0,credit_total:0,deposits_total:0,withdrawals_total:0,closed_pl_total:300,trades_closed:2,wins:1,losses:1,win_rate_pct:50,peak_balance:10500,peak_balance_at:new Date(now-4*D).toISOString(),max_drawdown_closed_balance_pct:1.9};
  await p.route('**/api/v1/**',r=>{const u=r.request().url();
   if(u.includes('/stats'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(ss)});
   if(u.includes('/history'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"trades":[],"page":{"offset":0,"limit":200,"total":0}}'});
   if(u.includes('/positions'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"positions":[]}'});
   if(u.includes('/billing'))return r.fulfill({status:200,contentType:'application/json',body:'{"status":"ACTIVE"}'});
   if(/\/customer\/accounts(\?|$)/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:[{account_id:'f7a00000-0000-4000-8000-0000000000c4',account_number:null,preview:true,view_only:true,currency:'USD',balance:'99999',equity:'99999',display_status:'PAUSED',deposits:'0',withdrawals:'0'}]})});
   return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
  await p.goto(BASE+'/');await p.waitForTimeout(800);
  await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'start@ftm.com',products:[],name:'Start'};});
  await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto')));await p.waitForTimeout(2500);
  const v=await p.evaluate(()=>{const g=i=>(document.getElementById(i)||{}).textContent||'';return {gain:g('mGain'),net:g('mNet')};});
  ok(/\+3\.00%/.test(v.gain), 'start balance: gain chained from start_balance 10,000: +5.00% then -1.90% = +3.00% (got '+v.gain+')');
  ok(/\$300\.00/.test(v.net), 'start balance: net P/L = closed P/L +300.00 (got '+v.net+')');
  const iv=await p.evaluate(()=>{const g=i=>(document.getElementById(i)||{}).textContent||'';return g('mInitL')+' '+g('mInit');});
  ok(/^Starting balance \$10,000\.00/.test(iv), 'start balance: history starts after opening, so it shows the starting balance, not a later deposit (got '+iv+')');
  ok(!errs.length, 'start balance: no script errors '+(errs[0]||''));
  await p.close();
 }
 console.log(fails.length?('FAILED: '+fails.length):'ALL FIGURES OK'); process.exit(fails.length?1:0);
})();
