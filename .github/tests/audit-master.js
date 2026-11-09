// Full audit on a master-like account: prints every figure of every page next to the hand-worked expected values.
// Run: node .github/tests/audit-master.js (needs the site on http://localhost:8765)
const {chromium}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();const fs=require('fs');
const H=36e5, t0=Date.UTC(2026,10,4,11,7);
const tr=[[+2,'XAUUSD','BUY',1.0,850.20,-7,0],[+5,'XAUUSD','SELL',1.0,1210.55,-7,-3.2],[+20,'XAUUSD','BUY',1.0,-640.10,-7,0],[+30,'US500','BUY',2.0,980.30,-6,-1.1],[+38,'XAUUSD','SELL',1.0,190.00,-7,0],
 [+44,'XAUUSD','BUY',1.5,-2950.40,-10.5,-4.0],[+50,'US500','SELL',2.0,-3120.75,-6,0],[+60,'XAUUSD','BUY',1.0,-2105.00,-7,-2.5],[+75,'XAUUSD','SELL',1.0,1876.20,-7,0],[+90,'BTCUSD','BUY',0.5,2450.00,-5,0],[+100,'XAUUSD','BUY',1.0,920.40,-7,-1.8]];
const hist=[{type:'BALANCE',entry:'IN',time:new Date(t0).toISOString(),profit:100000,net:100000}];const copies=[];let bal=100000,peak=100000,maxdd=0,pl=0;
tr.forEach(([h,sym,side,vol,p,c,sw],i)=>{const tc=t0+h*H, to=tc-45*60e3;
 hist.push({type:side,entry:'IN',position_ref:'P'+i,time:new Date(to).toISOString(),symbol:sym,volume:vol,price:1,profit:0,commission:c/2,swap:0,fee:0,net:c/2});
 hist.push({type:side==='BUY'?'SELL':'BUY',entry:'OUT',position_ref:'P'+i,time:new Date(tc).toISOString(),symbol:sym,volume:vol,price:1,profit:p,commission:c/2,swap:sw,fee:0,net:p+c/2+sw});
 bal+=p+c+sw; pl+=p+c+sw; if(bal>peak)peak=bal; maxdd=Math.max(maxdd,(peak-bal)/peak*100);
 copies.push({execution_id:'e'+i,symbol:sym,market:sym,side,volume:String(vol),open_price:'1',close_price:'1',opened_at:new Date(to).toISOString(),closed_at:new Date(tc).toISOString(),profit:String(p),commission:String(c),swap:String(sw),net_profit:String(p+c+sw),position_ref:'P'+i});});
const wins=tr.filter(x=>x[4]+x[5]+x[6]>0).length;
const stats={ok:true,history:hist.slice().reverse(),history_total:hist.length,deposits_total:100000,withdrawals_total:0,closed_pl_total:+pl.toFixed(2),trades_closed:tr.length,wins,losses:tr.length-wins,win_rate_pct:+(wins/tr.length*100).toFixed(2),
 peak_balance:+peak.toFixed(2),peak_balance_at:new Date(t0+H*30).toISOString(),max_drawdown_pct:+(maxdd+1.2).toFixed(2),max_drawdown_basis:'EQUITY_READINGS_EXCLUDING_DEPOSITS_WITHDRAWALS',max_drawdown_closed_balance_pct:+maxdd.toFixed(2),growth_pct:+(pl/1000).toFixed(2)};
console.log('EXPECTED balance',bal.toFixed(2),'P/L',pl.toFixed(2),'%',(pl/1000).toFixed(2),'peak',peak.toFixed(2),'maxDD',maxdd.toFixed(2),'wins',wins,'/',tr.length);
(async()=>{const b=await chromium.launch({...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{})});const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
await p.route('**/i18n/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
await p.route('**/api/v1/**',r=>{const u=r.request().url();
 if(u.includes('/stats'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(stats)});
 if(u.includes('/history')){const q=new URL(u).searchParams;const o=+q.get('offset')||0,l=+q.get('limit')||200;const rv=copies.slice().reverse();return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,trades:rv.slice(o,o+l),page:{offset:o,limit:l,total:copies.length}})});}
 if(u.includes('/positions'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"positions":[]}'});
 if(u.includes('/billing'))return r.fulfill({status:200,contentType:'application/json',body:'{"status":"NONE"}'});
 if(/\/customer\/accounts(\?|$)/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:0},accounts:[{account_id:'f7a00000-0000-4000-8000-0000000000a5',account_number:null,preview:true,view_only:true,currency:'USD',balance:bal.toFixed(2),equity:bal.toFixed(2),display_status:'PAUSED',deposits:'100000',withdrawals:'0'}]})});
 return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
await p.goto('http://localhost:8765/');await p.waitForTimeout(800);
await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'a@ftm.com',products:[],name:'A'};});
await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto')));await p.waitForTimeout(3000);
const T=await p.evaluate(()=>{const g=i=>((document.getElementById(i)||{}).textContent||'').replace(/\s+/g,' ').trim();const q=s=>[...document.querySelectorAll(s)].map(e=>e.textContent.replace(/\s+/g,' ').trim());
 return {dxVal:g('dxVal'),balance:g('mBalance'),equity:g('mEquity'),high:g('kpHigh'),year:g('mYear'),net:g('mNet'),ddTile:g('mDDtile'),gain:g('mGain'),win:g('mWin'),donut:g('rgWinV'),winLeg:g('rgWinW')+' '+g('rgWinL'),count:g('mCount'),pf:g('rgPF'),streak:g('mStreakDays')+'d '+g('mStreakTrades')+'t',
  pnl:q('#dxPnl .pp-t'),cv:g('cvNow')+' '+g('cvChg'),risk:g('rkScore')+' '+g('rkVs'),ddb:g('mDDbal'),dde:g('mDDeq'),eq2:g('mEq2'),bal2:g('mBal2'),mHigh:g('mHigh'),dep:g('mDep'),wdr:g('mWdr'),netdep:g('mNetDep'),fees:g('mFees'),lots:g('mLots'),exp:g('mExp'),sd:g('mSD'),sharpe:g('mSharpe'),
  closed:q('#mClosedRows tr').slice(0,3),fs:q('#fsGrid .fs-c'),perfYears:q('#perfYears .perf-cell.up, #perfYears .perf-cell.down'),pxYears:q('#pxYears tbody tr'),pxWeeks:q('#pxWeeks div'),pxWorst:q('#pxWorst div'),pxBest:q('#pxBest div'),pxDD:q('#pxDD tbody tr'),bySym:q('#perfSymbols tr'),
  cal:[g('calTrades'),g('calWins'),g('calNet'),g('calPct'),g('calWR'),g('calRatio'),g('dailyNet')],sess:q('#sessTable tr').slice(0,6)};});
for(const k in T) console.log(k.padEnd(10), JSON.stringify(T[k]));
const st=await p.evaluate(()=>{FTM._stFill&&FTM._stFill();const s=document.getElementById('stPeriod');s.value='all';const h=FTM.statementHtml();const d=document.createElement('div');d.innerHTML=h;return [...d.querySelectorAll('.sum b')].map(b=>b.textContent).join(' | ');});
console.log('statement ',st);console.log('errs',errs.join('|'));process.exit(0);})();
