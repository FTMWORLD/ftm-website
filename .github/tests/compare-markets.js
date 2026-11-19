// "Compare with" on the account chart: FTM's five markets plus silver, the S&P 500 and five top stocks; each draws a
// comparison line over the account's own period, in %, on laptop and phone. Run: node .github/tests/compare-markets.js [baseUrl]
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
const {chromium}=pw; const BASE=process.argv[2]||'http://localhost:8765';
const D=864e5, now=Date.now();
const hist=[
 {type:'BALANCE',time:new Date(now-30*D).toISOString(),profit:1000,net:1000},
 {type:'BUY',entry:'IN',position_ref:'A',time:new Date(now-20*D).toISOString(),profit:0,net:0,symbol:'XAUUSD',volume:0.01},
 {type:'SELL',entry:'OUT',position_ref:'A',time:new Date(now-20*D+36e5).toISOString(),profit:50,net:50,symbol:'XAUUSD',volume:0.01},
 {type:'BUY',entry:'IN',position_ref:'B',time:new Date(now-5*D).toISOString(),profit:0,net:0,symbol:'HK50',volume:0.01},
 {type:'SELL',entry:'OUT',position_ref:'B',time:new Date(now-5*D+36e5).toISOString(),profit:30,net:30,symbol:'HK50',volume:0.01}];
const stats={ok:true,history:hist.slice().reverse(),history_total:hist.length,deposits_total:1000,withdrawals_total:0,closed_pl_total:80,trades_closed:2,wins:2,losses:0,win_rate_pct:100};
const candles=(n,step,iso)=>Array.from({length:60},(_,i)=>{ const t=now-(59-i)*D; return {t:iso?new Date(t).toISOString():t,o:n+i*step,h:0,l:0,c:n+(i+1)*step}; });
const want=['XAUUSD','BTCUSD','USTEC','USDJPY','HK50','US500','DJI','DAX','XAGUSD','OIL','EURUSD','ETHUSD','NVDA','AAPL','MSFT','AMZN','GOOGL','TSLA','META','BRKB','TSM','JPM'];
const fails=[]; const ok=(c,m)=>{console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails.push(m);};
(async()=>{
 const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
 for(const [dev,vp] of [['laptop',{width:1280,height:900}],['phone',{width:390,height:844}],['small phone',{width:340,height:700}]]){
  const p=await b.newPage({viewport:vp}); const errs=[], asked={pub:[],engine:[]}; p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/api/v1/**',r=>{const u=r.request().url();
   let m=u.match(/\/api\/v1\/bench\?symbol=([A-Z0-9]+)/); if(m){ asked.pub.push(m[1]); return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,symbol:m[1],tf:'1d',candles:candles(100,1,false)})}); }
   m=u.match(/market\/candles\?symbol=([A-Z0-9]+)/); if(m){ asked.engine.push(m[1]); return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,symbol:m[1],tf:'1d',candles:candles(200,-1,true)})}); }
   if(u.includes('/stats'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(stats)});
   if(u.includes('/history'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"trades":[],"page":{"offset":0,"limit":200,"total":0}}'});
   if(u.includes('/positions'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"positions":[]}'});
   if(u.includes('/billing'))return r.fulfill({status:200,contentType:'application/json',body:'{"status":"ACTIVE"}'});
   if(/\/customer\/accounts(\?|$)/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:[{account_id:'c0a00000-0000-4000-8000-000000000001',account_number:'51000001',name:'DERIV',currency:'USD',balance:'1080',equity:'1080',display_status:'ACTIVE',status_reason:'OK',is_trading:true,risk_tier:'BALANCED',deposits:'1000',withdrawals:'0'}]})});
   return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
  const setup=async()=>{ await p.waitForLoadState('load'); await p.waitForTimeout(800);
    await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'cmp@ftm.com',products:['auto'],name:'Cmp'};});
    await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))); };
  await p.goto(BASE+'/');
  try{ await setup(); }catch(e){ if(!/context was destroyed|navigation/i.test(e.message)) throw e; await setup(); }
  await p.waitForTimeout(2500);
  const stt=await p.evaluate(()=>{ const e=document.getElementById('mStatus'), h=document.getElementById('actHint'); return [(e&&e.textContent||'').trim(), (h&&!h.hidden?h.textContent:'').trim()]; });
  ok(stt[0]==='FTM MACHINE is trading for you'&&!/DERIV|51000001|running on/i.test(stt.join(' ')), dev+': the chart says FTM MACHINE is trading for you, with no broker name (got '+stt.join(' | ')+')');
  const opts=await p.evaluate(()=>[...document.querySelectorAll('#cvCmp option')].map(o=>o.value).filter(Boolean));
  ok(JSON.stringify(opts)===JSON.stringify(want), dev+': Compare with lists FTM\'s five markets, seven world markets and ten top stocks (got '+opts.join(',')+')');
  const groups=await p.evaluate(()=>[...document.querySelectorAll('#cvCmp optgroup')].map(g=>g.label+':'+g.children.length).join('|'));
  ok(groups==='FTM markets:5|World markets:7|Top stocks:10', dev+': the list is grouped (got '+groups+')');
  for(const sym of ['NVDA','HK50','US500','BRKB']){
   const res=await p.evaluate(sym=>new Promise(done=>{ const cmp=document.getElementById('cvCmp'); cmp.hidden=false; cmp.value=sym; cmp.dispatchEvent(new Event('change'));
     setTimeout(()=>{ try{ const pl=document.querySelector('#mCurve .cv-bench'), lab=document.querySelector('#mCurve .cv-bench-l'), svg=pl&&pl.ownerSVGElement;
       if(FTM.curveUnit!=='percent') return done('not in %'); if(!pl||!lab) return done('no comparison line');
       const pts=pl.getAttribute('points').trim().split(/\s+/).map(s=>s.split(',').map(Number)), vb=svg.viewBox.baseVal, lb=lab.getBBox();
       if(pts.length<5) return done('only '+pts.length+' points');
       if(pts.some(q=>q[0]<-1||q[0]>vb.width+1||q[1]<-1||q[1]>vb.height+1)) return done('line leaves the chart');
       if(lb.x<0) return done('label cut off on the left ('+lab.textContent+')');
       done('ok '+lab.textContent); }catch(e){ done('error '+e.message); } },900); }), sym);
   ok(/^ok /.test(res), dev+': choosing '+sym+' draws its line over the account period with its name and % (got '+res+')');
  }
  ok(asked.pub.includes('NVDA')&&asked.pub.includes('US500')&&!asked.pub.includes('HK50'), dev+': stocks and the S&P 500 come from the daily-price service (asked '+asked.pub.join(',')+')');
  ok(asked.engine.includes('HK50')&&!asked.engine.includes('NVDA'), dev+': FTM markets come from FTM\'s own price feed (asked '+asked.engine.join(',')+')');
  const back=await p.evaluate(()=>new Promise(done=>{ const cmp=document.getElementById('cvCmp'); cmp.value=''; cmp.dispatchEvent(new Event('change')); setTimeout(()=>done(!document.querySelector('#mCurve .cv-bench')&&(FTM.curveUnit||'amount')==='amount'?'ok':'still '+FTM.curveUnit),400); }));
  ok(back==='ok', dev+': clearing Compare removes the line and returns to the money view (got '+back+')');
  const wd=await p.evaluate(()=>{ const c=document.getElementById('cvCmp').getBoundingClientRect(), card=document.querySelector('.cv-card').getBoundingClientRect(); return c.right<=card.right+1&&c.width>30?'ok':'select '+c.left+'-'+c.right+' card '+card.right; });
  ok(wd==='ok', dev+': the Compare box fits in the chart card (got '+wd+')');
  if(process.env.SHOT_DIR){ await p.evaluate(()=>{ const cmp=document.getElementById('cvCmp'); cmp.value='NVDA'; cmp.dispatchEvent(new Event('change')); }); await p.waitForTimeout(500); await (await p.$('.cv-card')).screenshot({path:process.env.SHOT_DIR+'/cmp-'+dev.replace(' ','_')+'.png'}); }
  ok(!errs.length, dev+': no page errors ('+errs.join(' | ')+')');
  await p.close();
 }
 await b.close();
 console.log(fails.length?'FAILED: '+fails.length:'COMPARE MARKETS OK'); process.exit(fails.length?1:0);
})();
