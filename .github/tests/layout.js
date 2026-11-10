// Every client-area view on laptop and phones: no clipped text, no words on top of each other, nothing wider than the screen.
// Uses a demanding account (big amounts, 6 markets, long names, open trades). Run: node .github/tests/layout.js (site on :8765)
process.env.TZ='Europe/Berlin';
const {chromium,devices}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();
const {gen,oracle,engine}=require('./stats-fuzz.js');
const BASE=process.argv[2]||'http://localhost:8765';
let acc,seed=1; for(;;seed++){ acc=gen(seed,Date.now()); if(acc.rows.length>120 && (acc.open||[]).length && acc.rows.some(r=>r.type==='DIVIDEND')) break; }
// a million-sized account with six markets
const SY=['USTEC','XAUUSD','BTCUSD','US500','GER40','EURUSD']; let si=0;
acc.rows.forEach(r=>{ ['net','profit','commission','swap'].forEach(k=>{ if(r[k]) r[k]=Math.round(r[k]*1234)/100; }); if(r.entry){ r.sym=SY[(si++>>1)%6]; } });
(acc.open||[]).forEach(o=>o.fl=Math.round(o.fl*1234)/100);
const O=oracle(acc), ST=engine(acc,O);
const VIEWS=['metrics','accounts','perf','calendar','sessions','board','community','charts'];
const SIZES=[['laptop 1440',{viewport:{width:1440,height:900}}],['laptop 1280',{viewport:{width:1280,height:800}}],['tablet',{viewport:{width:820,height:1180},isMobile:true,hasTouch:true}],
  ['iPhone 13',devices['iPhone 13']],['iPhone SE',devices['iPhone SE']],['Android',devices['Pixel 5']],['small Android',{viewport:{width:360,height:740},isMobile:true,hasTouch:true,deviceScaleFactor:2}]];
(async()=>{
  const b=await chromium.launch({...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{})}); const fails=[];
  for(const [name,opt] of SIZES){
    const ctx=await b.newContext(Object.assign({timezoneId:'Europe/Berlin',locale:'en-GB'},opt)); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
    await p.route('**/i18n/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
    await p.route('**/api/v1/**',r=>{const u=r.request().url();
      if(u.includes('/stats'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(ST)});
      if(u.includes('/history'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"trades":[],"page":{"offset":0,"limit":200,"total":0}}'});
      if(u.includes('/positions'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,positions:acc.open.map(x=>({market:x.sym,side:x.side,volume:x.vol,open_price:1,current_price:1,floating_profit:x.fl,swap:0,opened_at:new Date(x.t).toISOString(),position_ref:x.id}))})});
      if(u.includes('/billing'))return r.fulfill({status:200,contentType:'application/json',body:'{"status":"ACTIVE","plan":"LIFETIME"}'});
      if(/\/customer\/accounts(\?|$)/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:[{account_id:'f7a00000-0000-4000-8000-0000000000e1',account_number:'52500001',name:'IC Markets',currency:'USD',balance:String(O.balance),equity:String(O.equity),floating_profit:String(O.floating),display_status:'ACTIVE',status_reason:'OK',is_trading:true,risk_tier:'GROWTH',deposits:String(O.dep),withdrawals:String(O.wd)}]})});
      return r.fulfill({status:204,body:''});});
    await p.goto(BASE+'/');await p.waitForTimeout(800);
    await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'layout.check@ftm.com',products:['auto'],name:'Layout Check'};});
    await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto')));await p.waitForTimeout(2000);
    for(const v of VIEWS){
      await p.evaluate(v=>{ FTM.showView&&FTM.showView(v); const mo=document.getElementById('mtMore'); if(v==='metrics'&&mo&&mo.offsetParent) mo.click(); },v); await p.waitForTimeout(700);
      const bad=await p.evaluate(()=>{
        const out=[], W=document.documentElement.clientWidth, root=document.getElementById('appView');
        const vis=e=>{ const r=e.getBoundingClientRect(); if(r.width<1||r.height<1) return false; const cs=getComputedStyle(e); return cs.visibility!=='hidden'&&cs.display!=='none'&&+cs.opacity>0.05; };
        const scrolls=e=>{ for(let a=e.parentElement;a&&a!==document.body;a=a.parentElement){ const o=getComputedStyle(a).overflowX; if(o==='auto'||o==='scroll') return true; } return false; };
        const lab=e=>(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):'')+' "'+e.textContent.trim().replace(/\s+/g,' ').slice(0,40)+'"';
        const texts=[...root.querySelectorAll('*')].filter(e=>vis(e)&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&!e.closest('svg,[hidden],[aria-hidden="true"],.ftm-tip,select,option,input,textarea'));
        texts.forEach(e=>{ const cs=getComputedStyle(e);
          if((e.scrollWidth>e.clientWidth+1)&&(cs.overflowX==='hidden'||cs.overflowX==='clip'||cs.textOverflow==='ellipsis')&&cs.display!=='inline') out.push('cut off: '+lab(e));
          const r=e.getBoundingClientRect(); if((r.right>W+1||r.left<-1)&&!scrolls(e)) out.push('wider than the screen: '+lab(e));
          for(let a=e.parentElement;a&&a!==root;a=a.parentElement){ const ca=getComputedStyle(a); if(ca.overflowX!=='visible'&&ca.overflowX!=='auto'&&ca.overflowX!=='scroll'){ const ra=a.getBoundingClientRect(); if(r.right>ra.right+2||r.left<ra.left-2){ out.push('cut off by its box: '+lab(e)); } break; } } });
        // words on top of each other: text ranges of different elements that intersect
        const boxes=[]; texts.forEach(e=>{ [...e.childNodes].forEach(n=>{ if(n.nodeType!==3||!n.textContent.trim()) return; const rg=document.createRange(); rg.selectNodeContents(n); const clip=(()=>{ let L=-1e9,R=1e9,T=-1e9,Bt=1e9; for(let a=e.parentElement;a&&a!==document.body;a=a.parentElement){ const o=getComputedStyle(a); if(o.overflowX!=='visible'||o.overflowY!=='visible'){ const q=a.getBoundingClientRect(); L=Math.max(L,q.left);R=Math.min(R,q.right);T=Math.max(T,q.top);Bt=Math.min(Bt,q.bottom); } } return {L,R,T,Bt}; })();
            [...rg.getClientRects()].forEach(r0=>{ const r={left:Math.max(r0.left,clip.L),right:Math.min(r0.right,clip.R),top:Math.max(r0.top,clip.T),bottom:Math.min(r0.bottom,clip.Bt)}; r.width=r.right-r.left; r.height=r.bottom-r.top; if(r.width>2&&r.height>2) boxes.push({e,r}); }); }); });
        for(let i=0;i<boxes.length;i++) for(let j=i+1;j<boxes.length;j++){ const A=boxes[i],B=boxes[j]; if(A.e===B.e||A.e.contains(B.e)||B.e.contains(A.e)) continue;
          const ox=Math.min(A.r.right,B.r.right)-Math.max(A.r.left,B.r.left), oy=Math.min(A.r.bottom,B.r.bottom)-Math.max(A.r.top,B.r.top);
          if(ox>3&&oy>Math.min(A.r.height,B.r.height)*0.35) out.push('overlap: '+lab(A.e)+' / '+lab(B.e)); }
        return [...new Set(out)];
      });
      bad.forEach(x=>fails.push(name+' · '+v+' · '+x));
    }
    if(errs.length) fails.push(name+' · script error: '+errs[0]);
    await ctx.close(); process.stdout.write('.');
  }
  await b.close();
  fails.forEach(f=>console.log('BAD  '+f));
  console.log(fails.length?('LAYOUT PROBLEMS: '+fails.length):'LAYOUT OK'); process.exit(fails.length?1:0);
})();
