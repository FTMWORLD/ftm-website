// Account activity → Download statement: besides All time, years and months, people can choose their own dates
// (Custom dates: From and To). The statement covers exactly those days (opening and closing balance, deposits,
// trading result), names the dates and the file, and the picker fits laptop, phone and small phone.
// Run: node .github/tests/statement-range.js (site on http://localhost:8765)
const {chromium}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();
let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const BASE=process.argv[2]||'http://localhost:8765';
const L=(y,m,d,h)=>new Date(y,m,d,h||12).getTime();
// deposit 10,000 on 2 Sep; trades through Sep-Nov; a withdrawal on 20 Oct
const T=[[L(2026,8,5),250],[L(2026,8,25),-120],[L(2026,9,3),400],[L(2026,9,15),-80],[L(2026,9,28),310],[L(2026,10,4),150],[L(2026,10,12),-60]];
const hist=[{type:'BALANCE',entry:'IN',time:new Date(L(2026,8,2)).toISOString(),profit:10000,net:10000},{type:'BALANCE',entry:'OUT',time:new Date(L(2026,9,20)).toISOString(),profit:-500,net:-500}];
const copies=[];
T.forEach(([t,p],i)=>{ hist.push({type:'BUY',entry:'IN',position_ref:'P'+i,time:new Date(t-36e5).toISOString(),symbol:'XAUUSD',volume:1,price:1,profit:0,commission:0,swap:0,fee:0,net:0});
  hist.push({type:'SELL',entry:'OUT',position_ref:'P'+i,time:new Date(t).toISOString(),symbol:'XAUUSD',volume:1,price:1,profit:p,commission:0,swap:0,fee:0,net:p});
  copies.push({execution_id:'e'+i,symbol:'XAUUSD',market:'XAUUSD',side:'BUY',volume:'1',open_price:'1',close_price:'1',opened_at:new Date(t-36e5).toISOString(),closed_at:new Date(t).toISOString(),profit:String(p),commission:'0',swap:'0',net_profit:String(p),position_ref:'P'+i}); });
const bal=10000-500+T.reduce((a,x)=>a+x[1],0);
const stats={ok:true,history:hist.slice().sort((a,b)=>a.time<b.time?1:-1),history_total:hist.length,deposits_total:10000,withdrawals_total:500,closed_pl_total:bal-9500,trades_closed:T.length};
(async()=>{
  const b=await chromium.launch();
  for(const [label,vp] of [['laptop',{width:1440,height:900}],['phone',{width:390,height:844}],['small phone',{width:360,height:740}]]){
    const p=await b.newPage({viewport:vp}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
    await p.route('**/api/v1/**',r=>{ const u=r.request().url(), J=o=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(o)});
      if(u.includes('/stats')) return J(stats);
      if(u.includes('/history')) return J({ok:true,trades:copies.slice().reverse(),page:{offset:0,limit:200,total:copies.length}});
      if(u.includes('/positions')) return J({ok:true,positions:[]});
      if(/\/customer\/accounts(\?|$)/.test(u)) return J({ok:true,account_limit:{max:3,used:1},accounts:[{account_id:'acc-1',account_number:'5551234',currency:'USD',balance:bal.toFixed(2),equity:bal.toFixed(2),display_status:'ACTIVE',is_trading:true,deposits:'10000',withdrawals:'500'}]});
      return J({ok:true}); });
    await p.goto(BASE+'/'); await p.waitForTimeout(700);
    await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'a@x.com',products:['auto'],name:'A'};});
    await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))).catch(()=>{}); await p.waitForTimeout(2500);
    await p.evaluate(()=>{ FTM.showView('accounts'); FTM._stFill&&FTM._stFill(); }); await p.waitForTimeout(500);
    const opts=await p.$$eval('#stPeriod option',o=>o.map(x=>x.value+'='+x.textContent));
    ok(opts[0].startsWith('all=')&&opts.some(x=>x.startsWith('Y2026'))&&opts.some(x=>x.startsWith('2026-11'))&&opts[opts.length-1]==='custom=Custom dates','['+label+'] the period list has All time, years, months and Custom dates ('+opts.length+')');
    ok(await p.$eval('#stRange',e=>e.hidden),'['+label+'] the date boxes stay hidden until Custom dates is chosen');
    await p.selectOption('#stPeriod','custom'); await p.waitForTimeout(200);
    const r0=await p.evaluate(()=>({h:document.getElementById('stRange').hidden,f:document.getElementById('stFrom').value,t:document.getElementById('stTo').value,min:document.getElementById('stFrom').min}));
    ok(!r0.h&&r0.f==='2026-09-02'&&r0.min==='2026-09-02'&&/^\d{4}-\d{2}-\d{2}$/.test(r0.t),'['+label+'] Custom dates shows From and To, starting at the first activity '+JSON.stringify(r0));
    await p.fill('#stFrom','2026-09-20'); await p.fill('#stTo','2026-10-31');
    const S=await p.evaluate(()=>{ const d=document.createElement('div'); d.innerHTML=FTM.statementHtml(); return {sum:Object.fromEntries([...d.querySelectorAll('.sum div')].map(x=>[x.querySelector('span').textContent,x.querySelector('b').textContent])),rows:[...d.querySelectorAll('table:last-of-type tbody tr')].filter(r=>!/^[+\-]?\$?0\.00$/.test(r.cells[2].textContent.trim())).length,head:(d.querySelector('.hd p')||{}).textContent,file:FTM._stFile}; });
    const num=s=>+String(s||'').replace(/[^0-9.\-]/g,'').replace(/^-?\$?/,m=>m)||0;
    const open=10000+250, inRange=[-120,400,-80,310], close=open-500+inRange.reduce((a,x)=>a+x,0);
    ok(Math.abs(num(S.sum['Opening balance'])-open)<0.01&&Math.abs(num(S.sum['Closing balance'])-close)<0.01,'['+label+'] opening and closing balance are those of 20 Sep and 31 Oct '+JSON.stringify(S.sum));
    ok(/500/.test(S.sum['Withdrawals'])&&/0\.00/.test(S.sum['Deposits'])&&Math.abs(Math.abs(num(S.sum['Trading result']))-510)<0.01&&S.rows===5,'['+label+'] only the activity of those days: 4 trades (+510.00) and the 500 withdrawal ('+S.rows+' rows with an amount)');
    ok(/20 Sept?\.? 2026/.test(S.head)&&/31 Oct\.? 2026/.test(S.head)&&S.file==='FTM-statement-20260920-to-20261031.pdf','['+label+'] the statement and file name show the dates: '+S.head+' · '+S.file);
    await p.fill('#stFrom','2026-11-10'); await p.fill('#stTo','2026-11-01');
    const sw=await p.evaluate(()=>{ const d=document.createElement('div'); d.innerHTML=FTM.statementHtml(); return d.querySelector('.hd p').textContent; });
    ok(/1 Nov\.? 2026.*10 Nov\.? 2026/.test(sw),'['+label+'] dates entered the wrong way round are swapped: '+sw);
    const lay=await p.evaluate(()=>{ const W=document.documentElement.clientWidth, el=[...document.querySelectorAll('#stPeriod,#stFrom,#stTo,#stDl')].map(e=>e.getBoundingClientRect()), c=document.querySelector('.act-log').getBoundingClientRect();
      return {inside:el.every(r=>r.width>0&&r.left>=c.left-1&&r.right<=c.right+1),sw:document.documentElement.scrollWidth,W}; });
    ok(lay.inside&&lay.sw<=lay.W,'['+label+'] the period list, From, To and Download fit inside the card, no sideways scroll '+JSON.stringify(lay));
    if(process.env.SHOT_DIR){ const el=await p.$('.act-log .al-head'); await el.scrollIntoViewIfNeeded(); await el.screenshot({path:require('path').join(process.env.SHOT_DIR,'st-'+label.replace(/ /g,'_')+'.png')}); }
    ok(!errs.length,'['+label+'] no script errors '+errs.join(' | ')); await p.close();
  }
  await b.close(); console.log(fails?fails+' BROKEN':'ALL OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
