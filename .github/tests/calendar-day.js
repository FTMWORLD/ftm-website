// Calendar day pop-up: FTM logo band, the account's balance (engine) and risk profile, the day's trades; a trade's details
// close back to the day, the day closes back to the calendar. Laptop, phone, small phone. Run: node .github/tests/calendar-day.js (site on :8765)
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
(async()=>{const b=await chromium.launch({...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{})});for(const [label,vp] of [['laptop',{width:1440,height:900}],['phone',{width:390,height:844}],['small phone',{width:360,height:740}]]){ const p=await b.newPage({viewport:vp});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
await p.route('**/i18n/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
await p.route('**/api/v1/**',r=>{const u=r.request().url();
 if(u.includes('/stats'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(stats)});
 if(u.includes('/history')){const q=new URL(u).searchParams;const o=+q.get('offset')||0,l=+q.get('limit')||200;const rv=copies.slice().reverse();return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,trades:rv.slice(o,o+l),page:{offset:o,limit:l,total:copies.length}})});}
 if(u.includes('/positions'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"positions":[]}'});
 if(u.includes('/billing'))return r.fulfill({status:200,contentType:'application/json',body:'{"status":"NONE"}'});
 if(/\/customer\/accounts(\?|$)/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:0},accounts:[{account_id:'f7a00000-0000-4000-8000-0000000000a5',account_number:'2022',risk_tier:(global.TIER||'GROWTH'),currency:'USD',is_trading:true,balance:bal.toFixed(2),equity:bal.toFixed(2),display_status:'ACTIVE',deposits:'100000',withdrawals:'0'}]})});
 return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
await p.goto('http://localhost:8765/');await p.waitForTimeout(800);
await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'a@ftm.com',products:['auto'],name:'A'};});
await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto')));await p.waitForTimeout(3000);
await p.evaluate(()=>FTM.showView('calendar')); await p.waitForTimeout(1200);
const nov=await p.evaluate(()=>{ const c=[...document.querySelectorAll('#calGrid .day-click')]; return c.map(x=>x.dataset.day); });
const dayKey=nov.find(k=>k)||''; await p.evaluate(k=>{ const c=document.querySelector('#calGrid .day-click[data-day="'+k+'"]'); c.scrollIntoView(); c.click(); },dayKey); await p.waitForTimeout(500);
const v=await p.evaluate(()=>{ const m=document.getElementById('dayTradesModal'), box=m.querySelector('.mdl-box').getBoundingClientRect(), W=document.documentElement.clientWidth;
  return {open:!m.hidden, logo:!!m.querySelector('.dtm-band .mark svg')&&/FTM/.test(m.querySelector('.dtm-logo').textContent), bal:document.getElementById('dtmBal').textContent, risk:document.getElementById('dtmRisk').textContent, acct:document.getElementById('dtmAcct').textContent, rows:m.querySelectorAll('#dayTradesRows tr').length, fit:box.left>=-1&&box.right<=W+1, sw:document.documentElement.scrollWidth<=W }; });
ok(v.open&&v.logo,'['+label+'] the day opens with the FTM logo band');
ok(v.bal==='$'+bal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})&&v.risk==='Growth'&&/Account 2022/.test(v.acct),'['+label+'] balance from the engine, risk profile and account: '+v.bal+' · '+v.risk+' · '+v.acct);
ok(v.rows>=1&&v.fit&&v.sw,'['+label+'] trades listed, fits the screen');
if(process.env.SHOT_DIR) await p.locator('#dayTradesModal .mdl-box').screenshot({path:process.env.SHOT_DIR+'/dtm-'+label.replace(/ /g,'_')+'.png'});
await p.click('#dayTradesRows tr'); await p.waitForTimeout(400);
let s1=await p.evaluate(()=>({trade:!document.getElementById('tradeModal').hidden, day:!document.getElementById('dayTradesModal').hidden}));
ok(s1.trade&&!s1.day,'['+label+'] a row opens the trade details');
await p.click('#tradeModalClose'); await p.waitForTimeout(300);
s1=await p.evaluate(()=>({trade:!document.getElementById('tradeModal').hidden, day:!document.getElementById('dayTradesModal').hidden}));
ok(!s1.trade&&s1.day,'['+label+'] closing the trade details goes back to the day');
await p.click('#dayTradesRows tr'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
s1=await p.evaluate(()=>({trade:!document.getElementById('tradeModal').hidden, day:!document.getElementById('dayTradesModal').hidden}));
ok(!s1.trade&&s1.day,'['+label+'] Escape on the trade details also goes back to the day');
await p.click('#dayTradesClose'); await p.waitForTimeout(300);
s1=await p.evaluate(()=>({day:!document.getElementById('dayTradesModal').hidden, cal:!document.querySelector('.app-view[data-view="calendar"]').hidden}));
ok(!s1.day&&s1.cal,'['+label+'] closing the day goes back to the calendar');
await p.evaluate(()=>FTM.showView('metrics')); await p.waitForTimeout(400);
const cl=await p.evaluate(()=>{ const r=document.querySelector('#mClosedRows tr.tr-click'); if(!r) return null; r.click(); return true; }); await p.waitForTimeout(300);
if(cl){ await p.click('#tradeModalClose'); await p.waitForTimeout(300); ok(await p.evaluate(()=>document.getElementById('dayTradesModal').hidden),'['+label+'] trade details opened elsewhere do not open the day afterwards'); }
ok(!errs.length,'['+label+'] no script errors '+errs.join(' | ')); await p.close(); }
await b.close(); console.log(fails?fails+' BROKEN':'ALL OK'); process.exit(fails?1:0); })();
