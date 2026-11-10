// Every statistic on every view, checked against an independent calculation, on many generated accounts.
// The generator makes accounts of every shape: opened inside the history (first deposit) or before it (start_balance),
// extra deposits and withdrawals, dividends and tax, broker credit, entry commissions, swaps, partial closes, trades across
// the turn of the year, today, 7 and 30 days ago. The FAKE engine below answers like the real one (docs/engine-contract.md).
// Definitions (docs/statistics.md):
//   balance  = start_balance + deposits - withdrawals + closed P/L + adjustments + credit
//   profit   = sum of every trade deal's net result (profit + commission + swap + fee); cash moves never count
//   %        = time-weighted: each trade deal's net / the balance just before it, chained; cash moves never count
//   period   = [from, to) in the customer's local time
// Run: node .github/tests/stats-fuzz.js [accounts=24] [seed=1]   (needs the site on http://localhost:8765)
const ZONE = process.env.FUZZ_TZ || 'Europe/Berlin'; process.env.TZ = ZONE;
const {chromium}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();
const N=+(process.argv[2]||24), SEED=+(process.argv[3]||1), BASE='http://localhost:8765';
const D=864e5, H=36e5, MIN=6e4;

function rng(seed){ let s=seed>>>0||1; return ()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; }
const c2=x=>Math.round(x*100)/100;

function gen(seed, now){
  const R=rng(seed*2654435761), pick=a=>a[Math.floor(R()*a.length)], ri=(a,b)=>a+Math.floor(R()*(b-a+1));
  const span=pick([3,12,45,95,200,420]), t0=now-span*D;
  const startMode=R()<0.3, A0=pick([500,1000,5000,11965.28,100000]);
  const avoid=[now-7*D,now-30*D,now-365*D, new Date(new Date(now).getFullYear(),0,1).getTime()];
  const okT=t=>avoid.every(b=>Math.abs(t-b)>10*MIN)&&t<now-2*MIN&&t>t0+2*MIN;
  const T=()=>{ for(;;){ const t=Math.round(t0+R()*(now-t0)); if(okT(t)) return t; } };
  const ev=[];
  if(!startMode) ev.push({t:t0+MIN,k:'dep',amt:A0});
  const big=seed%20===7, nT=big?1150:ri(3,span<10?12:90), syms=['XAUUSD','US500','BTCUSD','USTEC','EURUSD'];
  for(let i=0;i<nT;i++){ const tc=T(); let to=tc-ri(5,60*48)*MIN; if(to<t0+2*MIN) to=t0+2*MIN; if(!okT(to)) to=tc;
    ev.push({t:tc,k:'pos',to,sym:pick(syms),side:pick(['BUY','SELL']),vol:pick([0.01,0.1,0.5,1,2]),r:(R()-0.47)*pick([0.004,0.01,0.03,0.06]),
      cIn:R()<0.6?-c2(R()*7):0,cOut:R()<0.6?-c2(R()*7):0,sw:R()<0.4?c2((R()-0.6)*4):0,part:R()<0.1,id:'P'+seed+'_'+i}); }
  for(let i=ri(0,3);i>0;i--) ev.push({t:T(),k:'dep',amt:pick([100,250,1000,5000,20000])});
  for(let i=ri(0,2);i>0;i--) ev.push({t:T(),k:'wd',f:0.05+R()*0.3});
  for(let i=ri(0,3);i>0;i--) ev.push({t:T(),k:'adj',type:pick(['DIVIDEND','TAX','INTEREST']),amt:0});
  if(R()<0.15) ev.push({t:T(),k:'credit',amt:pick([50,200])});
  ev.sort((a,b)=>a.t-b.t);
  // walk once to give every amount a value that keeps the balance positive
  const hist=[]; let bal=startMode?A0:0; const S0=startMode?A0:0;
  const rows=[];
  ev.forEach(e=>{
    if(e.k==='dep'){ bal=c2(bal+e.amt); rows.push({t:e.t,type:'BALANCE',net:e.amt}); }
    else if(e.k==='wd'){ const a=c2(Math.max(0,bal)*e.f); if(a>=1){ bal=c2(bal-a); rows.push({t:e.t,type:'BALANCE',net:-a}); } }
    else if(e.k==='adj'){ const a=c2((e.type==='TAX'?-1:1)*Math.max(0.5,bal*0.0004)); bal=c2(bal+a); rows.push({t:e.t,type:e.type,net:a}); }
    else if(e.k==='credit'){ bal=c2(bal+e.amt); rows.push({t:e.t,type:'CREDIT',net:e.amt}); }
    else if(e.k==='pos'){
      if(bal<=50){ return; }
      let p=c2(bal*e.r); if(bal+p+e.cIn+e.cOut+e.sw<bal*0.5) p=c2(Math.abs(p)); const ptot=p;
      const close=e.side==='BUY'?'SELL':'BUY';
      rows.push({t:e.to,type:e.side,entry:'IN',pos:e.id,sym:e.sym,vol:e.vol,profit:0,commission:e.cIn,swap:0,net:e.cIn});
      if(e.part){ const p1=c2(p/2); rows.push({t:e.t-MIN,type:close,entry:'OUT',pos:e.id,sym:e.sym,vol:c2(e.vol/2),profit:p1,commission:0,swap:0,net:p1}); p=c2(p-p1); }
      rows.push({t:e.t,type:close,entry:'OUT',pos:e.id,sym:e.sym,vol:e.part?c2(e.vol-c2(e.vol/2)):e.vol,profit:p,commission:e.cOut,swap:e.sw,net:c2(p+e.cOut+e.sw)});
      bal=c2(bal+e.cIn+ptot+e.cOut+e.sw);
    }
  });
  const open=[]; if(R()<0.35){ for(let i=ri(1,3);i>0;i--){ const t=Math.max(t0+3*MIN,now-ri(10,60*30)*MIN), id='O'+seed+'_'+i, c=R()<0.6?-c2(R()*5):0, sym=pick(syms), side=pick(['BUY','SELL']), vol=pick([0.01,0.1,1]);
      if(!okT(t)) continue; rows.push({t,type:side,entry:'IN',pos:id,sym,vol,profit:0,commission:c,swap:0,net:c}); open.push({id,sym,side,vol,t,fl:c2((R()-0.5)*Math.max(100,bal)*0.02)}); } }
  rows.sort((a,b)=>a.t-b.t||((a.entry==='IN')?-1:1));
  return {rows,S0,startMode,t0,now,open,oldestFirst:seed%3===2};
}

// ---------- the independent calculation ----------
function oracle(acc){
  const {rows,S0}=acc; let B=S0, F=1; const deals=[];
  let peak=B, peakAt=rows.length?rows[0].t:acc.t0, ddRun=B, ddPeak=B, ddMax=0;
  const pts=[]; let dep=0,wd=0,adj=0,cr=0,pl=0,costs=0;
  rows.forEach(r=>{
    const isTrade=!!r.entry;
    if(isTrade){ const before=B; B=c2(B+r.net); if(r.net!==0&&before>0) F*=1+r.net/before; pl+=r.net; costs+=(r.commission||0)+(r.swap||0);
      deals.push({t:r.t,net:r.net,before}); ddRun+=r.net; if(ddRun>ddPeak) ddPeak=ddRun; const dr=ddPeak-ddRun; if(ddPeak>0) ddMax=Math.max(ddMax,dr/ddPeak*100); }
    else { B=c2(B+r.net); ddRun+=r.net; ddPeak+=r.net; if(r.type==='BALANCE'){ if(r.net>0) dep+=r.net; else wd-=r.net; } else if(r.type==='CREDIT') cr+=r.net; else adj+=r.net; }
    if(B>peak){ peak=B; peakAt=r.t; }
    pts.push({t:r.t,B});
  });
  const seg=(a,b)=>{ let f=1,p=0; deals.forEach(d=>{ if((a==null||d.t>=a)&&(b==null||d.t<b)){ if(d.net!==0&&d.before>0) f*=1+d.net/d.before; p+=d.net; } }); return {pl:c2(p),pct:(f-1)*100}; };
  const balAt=t=>{ let b=S0; rows.forEach(r=>{ if(r.t<t) b=c2(b+r.net); }); return b; };
  // positions (a position = its opening deal + every closing deal)
  const P={}; rows.forEach(r=>{ if(!r.entry) return; const x=P[r.pos]=P[r.pos]||{net:0,close:0,open:null,lots:0,sym:r.sym}; x.net+=r.net; if(r.entry==='IN') x.open=r.t; if(r.entry==='OUT'){ x.close=Math.max(x.close,r.t); x.lots+=r.vol; } });
  const pos=Object.values(P).filter(x=>x.close);
  const outs=rows.filter(r=>r.entry==='OUT');
  const wins=pos.filter(x=>c2(x.net)>0).length;
  const first=rows.filter(r=>r.type==='BALANCE'&&r.net>0)[0];
  const fl=c2((acc.open||[]).reduce((a,x)=>a+x.fl,0));
  return {floating:fl,equity:c2(B+fl),balance:c2(B),pl:c2(pl),twr:(F-1)*100,seg,balAt,dep:c2(dep),wd:c2(wd),adj:c2(adj),credit:c2(cr),costs:c2(costs),peak:c2(peak),peakAt,dd:ddMax,
    trades:outs.length,positions:pos,wins,losses:pos.length-wins,lots:c2(outs.reduce((a,r)=>a+r.vol,0)),
    init:acc.startMode?{amt:S0,label:'Starting balance'}:(first?{amt:first.net,label:'Initial deposit'}:null)};
}

// ---------- the fake engine ----------
function engine(acc,O){
  const iso=t=>new Date(t).toISOString();
  const history=acc.rows.map((r,i)=>r.entry?{type:r.type,entry:r.entry,position_ref:r.pos,time:iso(r.t),symbol:r.sym,volume:r.vol,price:1,profit:r.profit,commission:r.commission,swap:r.swap,fee:0,net:r.net,ticket:'T'+i}
                                          :{type:r.type,time:iso(r.t),profit:r.net,commission:0,swap:0,fee:0,net:r.net,ticket:'T'+i});
  if(!acc.oldestFirst) history.reverse();
  return {ok:true,currency:'USD',balance:O.balance,equity:O.equity,floating_pl:O.floating,history,history_total:history.length,deposits_total:O.dep,withdrawals_total:O.wd,credit_total:O.credit,
    fees_and_adjustments:O.adj,closed_pl_total:O.pl,start_balance:acc.S0,start_balance_at:acc.startMode?iso(acc.rows[0].t):null,growth_pct:+O.twr.toFixed(2),
    return_basis:'TIME_WEIGHTED_CLOSED_TRADES_EXCLUDING_DEPOSITS_WITHDRAWALS',trades_closed:O.positions.length,wins:O.wins,losses:O.losses,
    win_rate_pct:O.positions.length?+(O.wins/O.positions.length*100).toFixed(2):0,peak_balance:O.peak,peak_balance_at:iso(O.peakAt),
    max_drawdown_pct:+O.dd.toFixed(2),max_drawdown_basis:'EQUITY_READINGS_EXCLUDING_DEPOSITS_WITHDRAWALS',max_drawdown_closed_balance_pct:+O.dd.toFixed(2)};
}

const num=s=>{ if(s==null) return NaN; const t=String(s).replace(/[−–]/g,'-').replace(/[^0-9.\-]/g,''); return t===''||t==='-'?NaN:parseFloat(t); };
if(require.main!==module){ module.exports={gen,oracle,engine}; } else (async()=>{
  const b=await chromium.launch({...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{})});
  const fails=[]; let checks=0;
  const one=async(k)=>{
    const seed=SEED*1000+k, now=Date.now(), acc=gen(seed,now), O=oracle(acc), ST=engine(acc,O);
    // every second account is first opened on another account (a customer's own), then switched to: no figure may leak across
    const sw=seed%2===1, OID='f7a00000-0000-4000-8000-0000000000d1', acc2=sw?gen(seed+77777,now):null, O2=sw?oracle(acc2):null, ST2=sw?engine(acc2,O2):null;
    const ctx=await b.newContext({viewport:{width:1280,height:900},timezoneId:ZONE,locale:'en-GB'}); const p=await ctx.newPage(); const errs=[], navs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('framenavigated',f=>{ if(f===p.mainFrame()) navs.push(f.url()); }); one.ctx=ctx; one.navs=navs;
    await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
    await p.route('**/i18n/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
    const beacons=[];
    await p.route('**/api/v1/**',r=>{const u=r.request().url();
      if(u.includes('client-log')){ beacons.push(r.request().postData()||''); return r.fulfill({status:204,body:''}); }
      if(u.includes('/stats')){ const q=new URL(u).searchParams, off=+q.get('offset')||0, lim=Math.min(2000,+q.get('limit')||200), X=u.includes(OID)?ST2:ST; return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(Object.assign({},X,{history:X.history.slice(off,off+lim)}))}); }
      if(u.includes('/history'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"trades":[],"page":{"offset":0,"limit":200,"total":0}}'});
      if(u.includes('/positions')){ const A=u.includes(OID)?acc2:acc; return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,positions:(A.open||[]).map(x=>({market:x.sym,side:x.side,volume:x.vol,open_price:1,current_price:1,floating_profit:x.fl,swap:0,opened_at:new Date(x.t).toISOString(),position_ref:x.id}))})}); }
      if(u.includes('/billing'))return r.fulfill({status:200,contentType:'application/json',body:'{"status":"ACTIVE"}'});
      if(/\/customer\/accounts(\?|$)/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:(sw?[{account_id:OID,account_number:'184',name:'DERIV',currency:'USD',balance:String(O2.balance),equity:String(O2.equity),floating_profit:String(O2.floating),display_status:'ACTIVE',status_reason:'OK',is_trading:true,deposits:String(O2.dep),withdrawals:String(O2.wd)}]:[]).concat([{account_id:'f7a00000-0000-4000-8000-'+String(100000000000+seed),account_number:'5'+seed,preview:true,view_only:true,currency:'USD',balance:String(O.balance),equity:String(O.equity),floating_profit:String(O.floating),display_status:'PAUSED',deposits:String(O.dep),withdrawals:String(O.wd)}])})});
      return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
    await p.goto(BASE+'/');await p.waitForTimeout(700);
    await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'fz@ftm.com',products:[],name:'Fz'};});
    await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto')));await p.waitForTimeout(1800);
    if(sw){ await p.evaluate(n=>FTM.viewAccount(n),'5'+seed); await p.waitForTimeout(2200); }
    const V=await p.evaluate(()=>{const g=i=>((document.getElementById(i)||{}).textContent||'').replace(/\s+/g,' ').trim();const q=s=>[...document.querySelectorAll(s)].map(e=>e.textContent.replace(/\s+/g,' ').trim());
      const st=(()=>{ try{ FTM._stFill&&FTM._stFill(); const s=document.getElementById('stPeriod'); s.value='all'; const d=document.createElement('div'); d.innerHTML=FTM.statementHtml(); return [...d.querySelectorAll('.sum div')].map(x=>[x.querySelector('span').textContent,x.querySelector('b').textContent]); }catch(e){ return 'ERR '+e.message; } })();
      const fx=id=>Object.fromEntries([...document.querySelectorAll('#'+id+' > div')].map(d=>[d.querySelector('dt').textContent,d.querySelector('dd').textContent]));
      return {eqT:g('mEquity'),flT:g('mFloat'),dx:g('dxVal'),lv:document.getElementById('lvStrip').hidden?0:document.querySelectorAll('#lvList .lv-c').length,now:Date.now(),pf:g('mPF'),avg:g('mAvg'),exp:g('mExp'),sd:g('mSD'),stD:g('mStreakDays'),stT:g('mStreakTrades'),best:fx('pxBest'),worst:fx('pxWorst'),weeks:fx('pxWeeks'),sharpe:g('mSharpe'),adjRow:document.getElementById('mAdjW').hidden?null:g('mAdj'),net:g('mNet'),gain:g('mGain'),year:g('mYear'),bal:g('mBalance'),high:g('mHigh'),dd:g('mDDtile'),init:g('mInitL')+'|'+g('mInit'),dep:g('mDep'),wdr:g('mWdr'),fees:g('mFees'),lots:g('mLots'),
        count:g('mCount'),win:g('mWin'),cv:g('cvChg'),pnl:[...document.querySelectorAll('#dxPnl .pp-t')].map(e=>[e.querySelector('.pp-l').textContent,e.querySelector('.pp-v').textContent,e.querySelector('.pp-c').textContent]),
        fs:[...document.querySelectorAll('#fsGrid .fs-c')].map(e=>[e.querySelector('span').textContent,e.querySelector('b').textContent,e.querySelector('small').textContent]),
        months:[...document.querySelectorAll('#perfYears .perf-row')].slice(1).map(r=>[r.querySelector('.yr').textContent,[...r.querySelectorAll('.perf-cell')].map(c=>c.querySelector('b').textContent+'|'+((c.querySelector('small')||{}).textContent||''))]),
        years:q('#pxYears tbody tr').map(x=>x),yearCells:[...document.querySelectorAll('#pxYears tbody tr')].map(tr=>[...tr.children].map(td=>td.textContent.trim())),
        yearHead:[...document.querySelectorAll('#pxYears thead th')].map(x=>x.textContent.trim()),
        dd1:[...document.querySelectorAll('#pxDD tbody tr')].map(tr=>tr.children[2]&&tr.children[2].textContent),
        calCells:[...document.querySelectorAll('#calGrid .cal-cell')].map(c=>[c.classList.contains('tot')?'W':((c.classList.contains('off'))?'off':(c.querySelector('.d')||{}).textContent),(c.querySelector('.v')||{}).textContent||'',(c.querySelector('.q')||{}).textContent||'']),
        cal:[g('calTitle'),g('calTrades'),g('calWins'),g('calNet'),g('calPct')],
        sess:[...document.querySelectorAll('#sessTable tbody tr')].map(tr=>[tr.children[1].textContent,tr.children[3].textContent]),
        sym:[...document.querySelectorAll('#perfSymbols tbody tr')].map(tr=>[tr.children[1].textContent,tr.children[4].textContent,tr.children[0].textContent,tr.children[2].textContent,tr.children[3].textContent]),
        recent:[...document.querySelectorAll('#mClosedRows tr')].slice(0,5).map(tr=>[tr.children[2].textContent,tr.children[5].textContent]),
        st};});
    const ACT=await p.evaluate(async()=>{ const mb=document.getElementById('alMore'); for(let i=0;i<80&&mb&&!mb.hidden;i++){ mb.click(); await new Promise(z=>setTimeout(z,5)); } return [...document.querySelectorAll('#alList li .al-amt')].map(e=>e.textContent); });
    const RG=await p.evaluate(async()=>{ const out={}; const tf=document.getElementById('curveTF'); for(const r of ['1','3','6','ytd','12','0']){ const bt=tf.querySelector('[data-r="'+r+'"]'); bt.click(); await new Promise(z=>setTimeout(z,60)); out[r]=[Date.now(),(document.getElementById('cvChg')||{}).textContent||'']; } return out; });
    const STS=await p.evaluate(()=>{ try{ FTM._stFill&&FTM._stFill(); const sel=document.getElementById('stPeriod'); return [...sel.options].map(o=>o.value).filter(v=>v!=='all').map(v=>{ sel.value=v; const d=document.createElement('div'); d.innerHTML=FTM.statementHtml(); return [v,[...d.querySelectorAll('.sum div')].map(x=>[x.querySelector('span').textContent,x.querySelector('b').textContent])]; }); }catch(e){ return 'ERR '+e.message; } });
    const PCT=await p.evaluate(async()=>{ const bt=document.querySelector('#unitSw [data-unit="percent"]'); if(!bt) return null; bt.click(); await new Promise(z=>setTimeout(z,150));
      const r=[...document.querySelectorAll('#perfYears .perf-row')].slice(1).map(r=>[r.querySelector('.yr').textContent,[...r.querySelectorAll('.perf-cell')].map(c=>c.querySelector('b').textContent)]);
      const a=document.querySelector('#unitSw [data-unit="amount"]'); if(a) a.click(); return r; });
    const tag='#'+seed+(acc.startMode?' (start balance)':'')+(sw?' (after switching)':'')+' ', ok=(c,m)=>{checks++; if(!c) fails.push(tag+m);};
    const eq=(shown,want,tol,m)=>ok(Math.abs(num(shown)-want)<=tol, m+': shown '+shown+', expected '+(+want).toFixed(2));
    const nowP=V.now, sod=new Date(nowP); sod.setHours(0,0,0,0); const y=new Date(nowP).getFullYear(), mo=new Date(nowP).getMonth();
    eq(V.net,O.pl,0.005,'Net P/L = sum of closed trade deals');
    eq(V.gain,O.twr,0.0051,'Gain = time-weighted return');
    eq(V.year,O.seg(new Date(y,0,1).getTime(),null).pct,0.0051,'Profit this year % (time-weighted from 1 Jan)');
    eq(V.bal,O.balance,0.005,'Balance');
    eq(V.eqT,O.equity,0.005,'Equity = balance + open trades');
    if((acc.open||[]).length){ eq(V.flT.replace(/floating/,''),O.floating,0.005,'Floating P/L of open trades'); eq(V.lv,Math.min(4,acc.open.length),0,'Open positions strip'); }
    ok(V.dx.replace(/\s/g,'')===V.eqT.replace(/\s/g,''),'Total account value = equity: '+V.dx+' vs '+V.eqT);
    ok(V.high.startsWith('$'+O.peak.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})), 'Highest balance = engine peak '+O.peak+': shown '+V.high);
    eq(V.dd,-O.dd,0.0051,'Max drawdown tile = engine closed-balance drawdown');
    if(O.init) ok(V.init.startsWith(O.init.label+'|$'+O.init.amt.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})),'Initial deposit: shown '+V.init+', expected '+O.init.label+' '+O.init.amt);
    { const A=c2(O.adj+O.credit); if(Math.abs(A)>=0.005) eq(V.adjRow,A,0.005,'Dividends, tax & adjustments'); else ok(V.adjRow==null,'no adjustments row when there are none'); }
    { const f=acc.rows[0]; const d0=new Date(f.t); d0.setHours(0,0,0,0); const nd=Math.floor((nowP-d0.getTime())/D);
      if(nd<30) ok(V.sharpe==='—','Sharpe needs 30 days: shown '+V.sharpe);
      else { const r=[]; let prev=d0.getTime(); for(let i=1;i<=nd+1;i++){ const e=new Date(d0); e.setDate(e.getDate()+i); r.push(O.seg(prev,e.getTime()).pct/100); prev=e.getTime(); }
        const mu=r.reduce((a,x)=>a+x,0)/r.length, v=r.reduce((a,x)=>a+(x-mu)**2,0)/(r.length-1), sh=v>0?mu/Math.sqrt(v)*Math.sqrt(365):null;
        if(sh==null) ok(V.sharpe==='—','Sharpe with no variation: shown '+V.sharpe); else eq(V.sharpe,sh,0.0051,'Sharpe ratio (daily time-weighted returns, x sqrt 365)'); } }
    { const PS=O.positions.slice().sort((x,y)=>x.close-y.close), nets=PS.map(x=>c2(x.net)), n=nets.length;
      const gp=nets.filter(x=>x>0).reduce((a,x)=>a+x,0), gl=-nets.filter(x=>x<0).reduce((a,x)=>a+x,0), w=nets.filter(x=>x>0).length, l=nets.filter(x=>x<0).length;
      if(gl>0) eq(V.pf,gp/gl,0.0051,'Profit factor'); else ok(V.pf==='—','Profit factor with no losing trade is a dash: shown '+V.pf);
      const av=V.avg.split('/'); eq(av[0],w?gp/w:0,0.0051,'Average win'); eq(av[1],l?gl/l:0,0.0051,'Average loss');
      const mu=n?nets.reduce((a,x)=>a+x,0)/n:0; eq(V.exp,mu,0.0051,'Expectancy = average trade result');
      if(n>1) eq(V.sd,Math.sqrt(nets.reduce((a,x)=>a+(x-mu)**2,0)/(n-1)),0.0051,'Standard deviation of trade results');
      let run=0,bestT=0; nets.forEach(x=>{ if(x>0){ run++; bestT=Math.max(bestT,run); } else if(x<0) run=0; }); eq(V.stT,bestT,0,'Best winning streak (trades)');
      const dk=t=>{ const d=new Date(t); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }; const day={},ord=[]; PS.forEach(x=>{ const k=dk(x.close); if(day[k]===undefined){ day[k]=0; ord.push(k); } day[k]+=x.net; });
      let rd=0,bestD=0; ord.forEach(k=>{ const v=c2(day[k]); if(v>0){ rd++; bestD=Math.max(bestD,rd); } else if(v<0) rd=0; }); eq(V.stD,bestD,0,'Best winning streak (days)');
      const tp=PS.map(x=>x.net/O.balAt(x.open!=null?x.open:x.close)*100);
      if(V.best['Best trade']) eq(V.best['Best trade'],Math.max(...tp),0.0051,'Best trade %');
      if(V.worst['Worst trade']) eq(V.worst['Worst trade'],Math.min(...tp),0.0051,'Worst trade %');
      const p2=x=>(x<10?'0':'')+x, K={d:t=>{const d=new Date(t);return [d.getFullYear(),d.getMonth(),d.getDate()];}, w:t=>{const d=new Date(t);const m=new Date(d.getFullYear(),d.getMonth(),d.getDate()-((d.getDay()+6)%7));return [m.getFullYear(),m.getMonth(),m.getDate()];}, m:t=>{const d=new Date(t);return [d.getFullYear(),d.getMonth(),1];}};
      const span={d:a=>[new Date(a[0],a[1],a[2]),new Date(a[0],a[1],a[2]+1)], w:a=>[new Date(a[0],a[1],a[2]),new Date(a[0],a[1],a[2]+7)], m:a=>[new Date(a[0],a[1],1),new Date(a[0],a[1]+1,1)]};
      [['d','day'],['w','week'],['m','month']].forEach(([k,name])=>{ const seen={}, L=[]; PS.forEach(x=>{ const a=K[k](x.close), key=a.join('-'); if(seen[key]) return; seen[key]=1; const b=span[k](a); L.push(O.seg(b[0].getTime(),b[1].getTime()).pct); });
        if(!L.length) return; let bi=0,wi=0; L.forEach((r,i)=>{ if(r>L[bi]) bi=i; if(r<L[wi]) wi=i; });
        if(k==='w'){ eq(V.weeks['Weeks traded'],L.length,0,'Weeks traded'); eq(String(V.weeks['Winning weeks']).split('(')[0],L.filter(r=>r>0).length,0,'Winning weeks'); eq(V.weeks['Losing weeks'],L.length-L.filter(r=>r>0).length,0,'Losing weeks'); eq(V.weeks['Average week'],L.reduce((a,r)=>a+r,0)/L.length,0.0051,'Average week %'); }
        const B=V.best['Best '+name], Wv=V.worst['Worst '+name]; if(B) eq(B.split('·')[0],L[bi],0.0051,'Best '+name+' %'); if(Wv) eq(Wv.split('·')[0],L[wi],0.0051,'Worst '+name+' %'); }); }
    eq(V.dep,O.dep,0.005,'Deposits'); eq(V.wdr,-O.wd,0.005,'Withdrawals');
    eq(V.fees,O.costs,0.005,'Commission & swap = sum over every trade deal');
    eq(V.lots,O.lots,0.005,'Total lots = closed volume');
    eq(V.count,O.positions.length,0,'Trade count');
    const cvm=V.cv.match(/^([+-]?)\$([\d,.]+)\s*\(([-+]?[\d.]+)%\)/); ok(!!cvm,'chart header readable: '+V.cv);
    if(cvm){ eq((cvm[1]==='-'?'-':'')+cvm[2],O.pl,0.005,'Chart header money (All) = Net P/L'); eq(cvm[3],O.twr,0.0051,'Chart header % (All) = Gain'); }
    Object.keys(RG).forEach(r=>{ const [tn,txt]=RG[r]; let from=null; if(r==='ytd') from=new Date(new Date(tn).getFullYear(),0,1).getTime(); else if(r!=='0'){ const d=new Date(tn); d.setMonth(d.getMonth()-parseInt(r,10)); from=d.getTime(); }
      const sg=O.seg(from,null), mm=txt.match(/^([+-]?)\$([\d,.]+)\s*\(([-+]?[\d.]+)%\)/); ok(!!mm,'chart '+r+' header readable: '+txt);
      if(mm){ eq((mm[1]==='-'?'-':'')+mm[2],sg.pl,0.005,'Chart range '+r+' money'); eq(mm[3],sg.pct,0.0051,'Chart range '+r+' %'); } });
    eq(ACT.reduce((a,x)=>a+num(x),0),O.balance-acc.S0,0.02,'Account activity adds up to the balance change ('+ACT.length+' rows)');
    const PER={'Today':sod.getTime(),'7 days':nowP-7*D,'30 days':nowP-30*D,'All time':null};
    V.pnl.forEach(([l,v,c])=>{ const sg=O.seg(PER[l],null); eq(v,sg.pl,0.5001,'Profit by period '+l+' money'); eq(c,sg.pct,0.0051,'Profit by period '+l+' %'); });
    const firstT=acc.rows.length?acc.rows[0].t:nowP;
    const FSP={'This month':[new Date(y,mo,1),null],'Last month':[new Date(y,mo-1,1),new Date(y,mo,1)],'YTD':[new Date(y,0,1),null],'1Y':[new Date(y-1,mo,new Date(nowP).getDate()),null],'All time':[null,null]};
    V.fs.forEach(([l,v,s])=>{ const r=FSP[l]; if(!r) return; const a=r[0]&&r[0].getTime(), z=r[1]&&r[1].getTime();
      if(z!=null && z<=firstT && !acc.startMode){ ok(/—|-$/.test(v.trim())||v.trim()==='—','Factsheet '+l+': the account did not exist yet, expected —, shown '+v); return; }
      const sg=O.seg(a,z); eq(v,sg.pct,0.0051,'Factsheet '+l+' %'); eq(s,sg.pl,0.005,'Factsheet '+l+' money'); });
    const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    V.months.forEach(([yr,cells])=>{ cells.forEach((c,i)=>{ const [v,sm]=c.split('|'); if(v==='-') return; const a=i<12?new Date(+yr,i,1):new Date(+yr,0,1), z=i<12?new Date(+yr,i+1,1):new Date(+yr+1,0,1);
      const sg=O.seg(a.getTime(),z.getTime()); eq(v,sg.pl,0.5001,'Month by month '+yr+' '+(MN[i]||'Total')+' money');
      const n=O.positions.filter(x=>x.close>=a.getTime()&&x.close<z.getTime()).length; eq(sm,n,0,'Month by month '+yr+' '+(MN[i]||'Total')+' trades'); }); });
    if(PCT) PCT.forEach(([yr,cells])=>cells.forEach((v,i)=>{ if(v==='-') return; const a=i<12?new Date(+yr,i,1):new Date(+yr,0,1), z=i<12?new Date(+yr,i+1,1):new Date(+yr+1,0,1); eq(v,O.seg(a.getTime(),z.getTime()).pct,0.0051,'Month by month in % '+yr+' '+(i<12?i+1:'Total')); }));
    const yi=n=>V.yearHead.indexOf(n);
    V.yearCells.forEach(c=>{ const yr=+c[0]; if(!yr) return; const a=new Date(yr,0,1).getTime(), z=new Date(yr+1,0,1).getTime(), sg=O.seg(a,z);
      eq(c[yi('Return')],sg.pct,0.0051,'Year '+yr+' return');
      eq(c[yi('Start')],O.balAt(a),0.005,'Year '+yr+' start balance');
      eq(c[yi('End')],O.balAt(z),0.005,'Year '+yr+' end balance');
      { const nums=['Start','Net deposits','Profit','Dividends, tax & adjustments'].map(h=>yi(h)>=0?num(c[yi(h)]):0); ok(Math.abs(nums.reduce((x,v)=>x+v,0)-num(c[yi('End')]))<=0.011,'Year '+yr+' adds up: start + net deposits + profit + adjustments = end ('+c.join(' | ')+')'); }
      if(yi('Profit')>=0) eq(c[yi('Profit')],sg.pl,0.005,'Year '+yr+' profit');
      if(yi('Net deposits')>=0){ let nd=0; acc.rows.forEach(r=>{ if(r.type==='BALANCE'&&r.t>=a&&r.t<z) nd+=r.net; }); eq(c[yi('Net deposits')],nd,0.005,'Year '+yr+' net deposits'); } });
    { const L=V.dd1.map(x=>Math.abs(num(x))).filter(x=>!isNaN(x)); if(L.length) eq(Math.max(...L),O.dd,0.0051,'Deepest drawdown in the list = Max drawdown'); else ok(O.dd<0.01,'Drawdown list empty but Max drawdown is '+O.dd.toFixed(2)); }
    { const ct=V.cal[0]; const d0=new Date(Date.parse('1 '+ct)); if(!isNaN(d0)){ const a=new Date(d0.getFullYear(),d0.getMonth(),1).getTime(), z=new Date(d0.getFullYear(),d0.getMonth()+1,1).getTime(), sg=O.seg(a,z), ps=O.positions.filter(x=>x.close>=a&&x.close<z);
      eq(V.cal[1],ps.length,0,'Calendar '+ct+' trades'); eq(V.cal[2],ps.filter(x=>c2(x.net)>0).length,0,'Calendar '+ct+' wins');
      if(ps.length){ eq(V.cal[3],sg.pl,0.005,'Calendar '+ct+' net'); eq(V.cal[4],sg.pct,0.0051,'Calendar '+ct+' %'); }
      const M0=d0.getMonth(), Y0=d0.getFullYear(); let wk=[], wks=[]; const dayCells={};
      V.calCells.forEach(c=>{ if(c[0]==='W'){ wks.push(c); return; } if(c[0]==='off') return; if(c[1]) dayCells[+c[0]]=c; });
      for(let dd=1; dd<=new Date(Y0,M0+1,0).getDate(); dd++){ const a1=new Date(Y0,M0,dd).getTime(), z1=new Date(Y0,M0,dd+1).getTime(), s1=O.seg(a1,z1);
        const has=acc.rows.some(r=>r.entry&&r.net!==0&&r.t>=a1&&r.t<z1);
        if(!has){ ok(!dayCells[dd],'Calendar '+dd+' '+ct+': no trading, no cell (shown '+(dayCells[dd]||[]).join(' ')+')'); continue; }
        const c=dayCells[dd]; ok(!!c,'Calendar '+dd+' '+ct+': trading but no cell'); if(!c) continue;
        if(!/K/.test(c[1])) eq(c[1],s1.pl,Math.abs(s1.pl)>=1000?0.5001:0.005,'Calendar day '+dd+' '+ct+' money'); eq(c[2],s1.pct,0.0051,'Calendar day '+dd+' '+ct+' %'); }
      const sumW=wks.reduce((a,c)=>a+(/K/.test(c[1])?NaN:num(c[1])),0); if(!isNaN(sumW)&&wks.length) eq(sumW,sg.pl,0.5001*wks.length,'Calendar weeks add up to the month'); } }
    if(V.sess.length){ const sp=V.sess.reduce((a,r)=>a+num(r[0]),0), sn=V.sess.reduce((a,r)=>a+num(r[1]),0); eq(sp,O.positions.reduce((a,x)=>a+x.net,0),0.05,'Sessions add up to the closed trades'); eq(sn,O.positions.length,0,'Sessions add up to the trade count'); }
    if(V.sym.length){ const sp=V.sym.reduce((a,r)=>a+num(r[1]),0), sn=V.sym.reduce((a,r)=>a+num(r[0]),0); eq(sp,O.positions.reduce((a,x)=>a+x.net,0),0.011,'Markets add up to the closed trades'); eq(sn,O.positions.length,0,'Markets add up to the trade count'); }
    V.sym.forEach(r=>{ const ps=O.positions.filter(x=>x.sym===r[2]); if(!ps.length){ ok(false,'market '+r[2]+' has no trades'); return; }
      eq(r[0],ps.length,0,'Market '+r[2]+' trades'); eq(r[3],ps.filter(x=>c2(x.net)>0).length/ps.length*100,0.0051,'Market '+r[2]+' win rate'); eq(r[4],ps.reduce((a,x)=>a+x.lots,0),0.0051,'Market '+r[2]+' lots'); eq(r[1],ps.reduce((a,x)=>a+x.net,0),0.0051,'Market '+r[2]+' net'); });
    { const R=O.positions.slice().sort((x,y)=>y.close-x.close).slice(0,V.recent.length); V.recent.forEach((r,i)=>{ ok(r[0]===R[i].sym,'Recently closed #'+(i+1)+' market '+r[0]+' vs '+R[i].sym); eq(r[1],R[i].net,0.0051,'Recently closed #'+(i+1)+' result'); }); }
    if(Array.isArray(V.st)){ const S=Object.fromEntries(V.st); eq(S['Opening balance'],acc.S0,0.005,'Statement opening balance'); eq(S['Closing balance'],O.balance,0.005,'Statement closing balance');
      eq(S['Deposits'],O.dep,0.005,'Statement deposits'); eq(S['Withdrawals'],-O.wd,0.005,'Statement withdrawals'); eq(S['Trading result'],O.pl,0.005,'Statement trading result'); }
    else ok(false,'statement: '+V.st);
    if(Array.isArray(STS)) STS.forEach(([v,sum])=>{ const S=Object.fromEntries(sum); let a,z; if(v[0]==='Y'){ a=new Date(+v.slice(1),0,1); z=new Date(+v.slice(1)+1,0,1); } else { a=new Date(+v.slice(0,4),+v.slice(5,7)-1,1); z=new Date(+v.slice(0,4),+v.slice(5,7),1); } a=a.getTime(); z=z.getTime();
      let dep=0,wd=0,adj=0; acc.rows.forEach(r=>{ if(r.t<a||r.t>=z||r.entry) return; if(r.type==='BALANCE'){ if(r.net>0) dep+=r.net; else wd-=r.net; } else adj+=r.net; });
      const L='Statement '+v+' '; eq(S['Opening balance'],O.balAt(a),0.005,L+'opening'); eq(S['Closing balance'],O.balAt(z),0.005,L+'closing'); eq(S['Deposits'],dep,0.005,L+'deposits'); eq(S['Withdrawals'],-wd,0.005,L+'withdrawals');
      eq(S['Trading result'],O.seg(a,z).pl,0.005,L+'trading result'); if(Math.abs(adj)>=0.005) eq(S['Dividends, tax & adjustments'],adj,0.005,L+'adjustments'); });
    else ok(false,'statements: '+STS);
    ok(!beacons.some(x=>/history_gap|return_gap|pl_gap|history_partial/.test(x)),'website and engine agree (no gap reported): '+beacons.join(' '));
    ok(!errs.length,'no script errors '+(errs[0]||''));
    await ctx.close();
    process.stdout.write('.');
  };
  for(let k=0;k<N;k++){
    for(let attempt=0;;attempt++){
      const f0=fails.length, c0=checks;
      try{ await one(k); break; }
      catch(e){ fails.length=f0; checks=c0; try{ await one.ctx.close(); }catch(x){}
        const why='#'+(SEED*1000+k)+' page error: '+String(e.message).split('\n')[0]+' | page went to: '+(one.navs||[]).join(' -> ');
        if(attempt>=1){ fails.push(why); break; } console.log('\nretrying after: '+why); }
    }
  }
  await b.close();
  console.log('\n'+checks+' checks on '+N+' accounts ('+ZONE+')');
  fails.forEach(f=>console.log('FAIL  '+f));
  console.log(fails.length?('FAILED: '+fails.length):'ALL STATISTICS OK'); process.exit(fails.length?1:0);
})();
