// Performance › Trade statistics: counts, frequency, streaks and timing of the closed trades, checked against values worked
// out here from the same fixture; laptop 3 columns, phone 1. Run: node .github/tests/trade-stats.js (site on :8765)
let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
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
(async()=>{const b=await chromium.launch({...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{})});for(const [label,vp] of [['laptop',{width:1440,height:900}],['phone',{width:390,height:844}]]){ const p=await b.newPage({viewport:vp});const errs=[];p.on('pageerror',e=>errs.push(e.message));
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
await p.evaluate(()=>FTM.showView('perf')); await p.waitForTimeout(1500);
await p.evaluate(()=>{ document.querySelectorAll('.ts-card').forEach(c=>{ if(c.offsetHeight<90){ const h=c.querySelector('h3'); if(h) h.click(); } }); }); await p.waitForTimeout(400);
const V=await p.evaluate(()=>{ const g={}; document.querySelectorAll('.ts-card dl>div').forEach(d=>{ g[d.querySelector('dt').textContent.trim()]=d.querySelector('dd').textContent.trim(); }); const gr=getComputedStyle(document.querySelector('.ts-grid')).gridTemplateColumns.split(' ').length, W=document.documentElement.clientWidth; const c=document.querySelector('.ts-card').getBoundingClientRect(); return {g, cols:gr, fit:c.right<=W+1, sw:document.documentElement.scrollWidth<=W}; });
const net=tr.map(x=>x[4]+x[5]+x[6]), closeT=tr.map(x=>t0+x[0]*H), W2=net.filter(v=>v>0.004).length, L2=net.filter(v=>v<-0.004).length;
const days=new Set(closeT.map(t=>new Date(t).toDateString())).size;
const longs=tr.filter(x=>x[2]==='BUY'), lw=longs.filter(x=>x[4]+x[5]+x[6]>0.004).length, shorts=tr.filter(x=>x[2]==='SELL'), sw2=shorts.filter(x=>x[4]+x[5]+x[6]>0.004).length;
let run=0,best=0,lr=0,lbest=0; net.forEach(v=>{ if(v>0.004){run++;lr=0;} else if(v<-0.004){lr++;run=0;} best=Math.max(best,run); lbest=Math.max(lbest,lr); });
const pc=v=>v.toFixed(2)+'%', sym={}; tr.forEach(x=>{ sym[x[1]]=(sym[x[1]]||0)+1; }); const top=Object.keys(sym).sort((a,b)=>sym[b]-sym[a])[0];
const mon=d=>{ const x=new Date(d); return new Date(x.getFullYear(),x.getMonth(),x.getDate()-((x.getDay()+6)%7)); }, weeks=Math.round((mon(Date.now())-mon(closeT[0]))/6048e5)+1;
const g=V.g;
ok(g['Total trades']==='11'&&g['Winning trades']===W2+' · '+pc(W2/(W2+L2)*100)&&g['Losing trades']===L2+' · '+pc(L2/(W2+L2)*100)&&g['Break-even trades']==='0','['+label+'] trades: total, winning, losing, break-even '+JSON.stringify([g['Total trades'],g['Winning trades'],g['Losing trades']]));
ok(g['Long trades, won']===longs.length+' · '+pc(lw/longs.length*100)&&g['Short trades, won']===shorts.length+' · '+pc(sw2/shorts.length*100),'['+label+'] long and short trades with the share won');
ok(g['Trading days']===String(days)&&g['Trades per trading day']===(11/days).toFixed(2)&&g['Trades per week']===(11/weeks).toFixed(2),'['+label+'] how often: '+JSON.stringify([g['Trading days'],g['Trades per trading day'],g['Trades per week'],g['Trades per month']]));
ok(g['Most wins in a row']===String(best)&&g['Most losses in a row']===String(lbest),'['+label+'] streaks: '+best+' wins, '+lbest+' losses in a row');
ok(g['Average time in a trade']==='0h 45m'&&g['Longest trade']==='0h 45m'&&g['Shortest trade']==='0h 45m'&&g['Most traded market']===top+' · '+pc(sym[top]/11*100),'['+label+'] timing and most traded market');
ok(/\w/.test(g['Busiest weekday'])&&/\d{1,2} \w{3} \d{4}/.test(g['Most trades in one day']),'['+label+'] busiest weekday and busiest day: '+g['Busiest weekday']+' / '+g['Most trades in one day']);
{ const opens=closeT.map(t=>t-45*60e3), evs=opens.concat(closeT), d0=t=>{ const x=new Date(t); return new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime(); };
  const first=Math.min(...evs), lastOpen=Math.max(...opens), today=d0(Date.now()), nDays=Math.round((today-d0(first))/864e5)+1, act=new Set(evs.map(d0)).size, idle=nDays-act;
  const ds=[...new Set(evs.map(d0))].sort((a,b)=>a-b); let pause=0; for(let i=1;i<ds.length;i++) pause=Math.max(pause,Math.round((ds[i]-ds[i-1])/864e5)-1); pause=Math.max(pause,Math.round((today-ds[ds.length-1])/864e5));
  const lots=tr.reduce((a,x)=>a+x[3],0);
  ok(g['Trading since']===new Date(first).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})&&g['Last trade'].indexOf(new Date(lastOpen).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}))===0,'['+label+'] trading since and last trade: '+g['Trading since']+' / '+g['Last trade']);
  ok(g['Days without trading']===idle+' · '+pc(idle/nDays*100)&&g['Longest pause (days)']===String(pause)&&g['Days since the last trade']===String(Math.round((today-d0(lastOpen))/864e5))&&g['Open trades now']==='0'&&g['Trades this month']===String(closeT.filter(t=>t>=new Date(new Date().getFullYear(),new Date().getMonth(),1).getTime()).length)&&/^\d+$/.test(g['Trades this week']),'['+label+'] days without trading '+g['Days without trading']+', longest pause '+g['Longest pause (days)']+', days since last '+g['Days since the last trade']);
  ok(g['Markets traded']===String(Object.keys(sym).length)&&g['Total lots traded']===lots.toFixed(2)&&g['Average lot size']===(lots/11).toFixed(2),'['+label+'] markets, total and average lots'); }
ok(V.cols===(label==='laptop'?2:1)&&V.fit&&V.sw,'['+label+'] '+V.cols+' column(s), fits the screen');
if(process.env.SHOT_DIR) await p.locator('.ts-card').screenshot({path:process.env.SHOT_DIR+'/ts-'+label+'.png'});
ok(!errs.length,'['+label+'] no script errors '+errs.join(' | ')); await p.close(); }
await b.close(); console.log(fails?fails+' BROKEN':'ALL OK'); process.exit(fails?1:0); })();
