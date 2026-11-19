// Dashboard "Last trading day" strip: the latest day with closed trades, its net result and time-weighted %
// (same as the Calendar), trades and wins, best and worst trade, a "New highest balance" badge when the engine's peak
// falls on that day, and "See the trades" opens that day in the Calendar pop-up. Run: node .github/tests/last-day.js [baseUrl]
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
const {chromium}=pw; const BASE=process.argv[2]||'http://localhost:8765';
const D=864e5, now=Date.now(), noon=t=>{ const d=new Date(t); d.setHours(12,0,0,0); return d.getTime(); };
const mk=(today)=>{ const last=today?noon(now)-3*36e5:noon(now-3*D), h=[{type:'BALANCE',time:new Date(noon(now-20*D)).toISOString(),profit:1000,net:1000}]; let i=0;
  const tr=(t,sym,pl)=>{ i++; h.push({type:'BUY',entry:'IN',position_ref:'P'+i,time:new Date(t-36e5).toISOString(),profit:0,net:0,symbol:sym,volume:0.1}); h.push({type:'SELL',entry:'OUT',position_ref:'P'+i,time:new Date(t).toISOString(),profit:pl,net:pl,symbol:sym,volume:0.1}); };
  tr(noon(now-10*D),'XAUUSD',30); tr(noon(now-6*D),'BTCUSD',-15); tr(last-2*36e5,'XAUUSD',50); tr(last-36e5,'US500',-20); tr(last,'HK50',10);
  return {ok:true,history:h.slice().reverse(),history_total:h.length,deposits_total:1000,withdrawals_total:0,closed_pl_total:55,trades_closed:5,wins:3,losses:2,peak_balance:1055,peak_balance_at:new Date(last).toISOString(),max_drawdown_closed_balance_pct:1.5}; };
const fails=[]; const ok=(c,m)=>{console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails.push(m);};
(async()=>{
 const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
 for(const [dev,vp,today] of [['laptop',{width:1280,height:900},false],['phone',{width:390,height:844},false],['small phone',{width:340,height:700},true]]){
  const stats=mk(today), p=await b.newPage({viewport:vp}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/api/v1/**',r=>{const u=r.request().url();
   if(u.includes('/stats'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(stats)});
   if(u.includes('/history'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"trades":[],"page":{"offset":0,"limit":200,"total":0}}'});
   if(u.includes('/positions'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"positions":[]}'});
   if(/\/customer\/accounts(\?|$)/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:[{account_id:'c0a00000-0000-4000-8000-00000000000b',account_number:'51000011',name:'DERIV',currency:'USD',balance:'1055',equity:'1055',display_status:'ACTIVE',status_reason:'OK',is_trading:true,risk_tier:'BALANCED',deposits:'1000',withdrawals:'0'}]})});
   return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
  const setup=async()=>{ await p.waitForLoadState('load'); await p.waitForTimeout(800);
    await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'ld@ftm.com',products:['auto'],name:'Last Day'};});
    await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))); };
  await p.goto(BASE+'/');
  try{ await setup(); }catch(e){ if(!/context was destroyed|navigation/i.test(e.message)) throw e; await setup(); }
  await p.waitForTimeout(2500);
  const v=await p.evaluate(()=>{ const g=i=>document.getElementById(i), box=g('ldStrip'), r=box.getBoundingClientRect(), kids=[...box.querySelectorAll('.ld-when,.ld-res,.ld-facts>span,.ld-hi,#ldOpen')].filter(x=>!x.hidden&&x.offsetParent);
    return {shown:!box.hidden, lab:g('ldLab').textContent, date:g('ldDate').textContent, val:g('ldVal').textContent, cls:g('ldVal').className, pct:g('ldPct').textContent, facts:g('ldFacts').textContent, hi:!g('ldHi').hidden, inside:kids.every(k=>{ const q=k.getBoundingClientRect(); return q.left>=r.left-1&&q.right<=r.right+1; }), pageW:document.documentElement.scrollWidth<=innerWidth+1}; });
  ok(v.shown&&v.lab===(today?'Today so far':'Last trading day'), dev+': the strip shows '+(today?'Today so far':'Last trading day')+' (got '+JSON.stringify(v)+')');
  ok(v.val==='+$40.00'&&v.cls==='up', dev+': the day result is the sum of that day\'s closed trades, +$40.00 in green (got '+v.val+')');
  ok(/3 trades · 2 won/.test(v.facts)&&/Best trade XAUUSD \+\$50\.00/.test(v.facts)&&/Worst trade US500 -\$20\.00/.test(v.facts), dev+': trades, wins, best and worst trade (got '+v.facts+')');
  ok(v.hi, dev+': "New highest balance" shows when the engine peak is on that day');
  ok(v.inside&&v.pageW, dev+': everything fits inside the strip, no sideways scroll');
  await p.click('#ldOpen'); await p.waitForTimeout(500);
  const m=await p.evaluate(()=>({open:!document.getElementById('dayTradesModal').hidden, rows:document.querySelectorAll('#dayTradesRows tr').length, pct:(document.getElementById('dayNetP')||{}).textContent, net:(document.getElementById('dayNetV')||{}).textContent}));
  ok(m.open&&m.rows===3&&m.net==='+$40.00'&&m.pct===v.pct&&/%$/.test(v.pct), dev+': See the trades opens that day in the Calendar pop-up with the same result and % (got '+JSON.stringify(m)+' / strip '+v.pct+')');
  await p.keyboard.press('Escape');
  const st2=JSON.parse(JSON.stringify(stats)); st2.peak_balance_at=new Date(now-40*D).toISOString();
  const hi2=await p.evaluate(s=>{ FTM.data.engineStats.peakBalanceAt=s; FTM.render(); return !document.getElementById('ldHi').hidden; },st2.peak_balance_at);
  ok(!hi2, dev+': no badge when the highest balance was on another day');
  if(process.env.SHOT_DIR){ await (await p.$('#ldStrip')).screenshot({path:process.env.SHOT_DIR+'/ld-'+dev.replace(' ','_')+'.png'}); }
  ok(!errs.length, dev+': no page errors ('+errs.join(' | ')+')');
  await p.close();
 }
 await b.close(); console.log(fails.length?'FAILED: '+fails.length:'LAST DAY OK'); process.exit(fails.length?1:0);
})();
