// Long figures (naira on a big account, every view, laptop and phones) must never break over two lines or spill out of their box.
// They shrink to fit (owner rule, 10 Nov 2026). Run: node .github/tests/figures-fit.js (site on :8765)
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
const SIZES0=[['laptop 1440',{viewport:{width:1440,height:900}}],['laptop 1280',{viewport:{width:1280,height:800}}],['tablet',{viewport:{width:820,height:1180},isMobile:true,hasTouch:true}],
  ['iPhone 13',devices['iPhone 13']],['iPhone SE',devices['iPhone SE']],['Android',devices['Pixel 5']],['small Android',{viewport:{width:360,height:740},isMobile:true,hasTouch:true,deviceScaleFactor:2}],['phone with enlarged text',{viewport:{width:280,height:600},isMobile:true,hasTouch:true,deviceScaleFactor:2}]];
const SIZES=process.env.ONLY?SIZES0.filter(s=>process.env.ONLY.split(',').includes(s[0])):SIZES0;
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
      if(u.includes('/fx'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,base:'USD',rates:{USD:1,EUR:0.92,NGN:1530.5,IDR:16300,VND:25400}})});
      if(u.includes('/billing'))return r.fulfill({status:200,contentType:'application/json',body:'{"status":"ACTIVE","plan":"LIFETIME"}'});
      if(/\/customer\/accounts(\?|$)/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:[{account_id:'f7a00000-0000-4000-8000-0000000000e1',account_number:'52500001',name:'IC Markets',currency:'USD',balance:String(O.balance),equity:String(O.equity),floating_profit:String(O.floating),display_status:'ACTIVE',status_reason:'OK',is_trading:true,risk_tier:'GROWTH',deposits:String(O.dep),withdrawals:String(O.wd)}]})});
      return r.fulfill({status:204,body:''});});
    await p.addInitScript(c=>{ try{ localStorage.setItem('ftm_ccy',c); }catch(e){} }, process.env.FIT_CCY||'NGN');
    await p.goto(BASE+'/');await p.waitForTimeout(800);
    await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'layout.check@ftm.com',products:['auto'],name:'Layout Check'};});
    await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto')));await p.waitForTimeout(2000);
    for(const v of VIEWS){
      await p.evaluate(v=>{ FTM.showView&&FTM.showView(v); const mo=document.getElementById('mtMore'); if(v==='metrics'&&mo&&mo.offsetParent) mo.click(); },v); await p.waitForTimeout(700);
      if(process.env.ONLY) console.log(await p.evaluate(()=>{window.__DBG=1; const e=document.getElementById('mBalance'); if(!e||!e.offsetParent) return ''; const t=e.closest('.app-tile'); const cs=getComputedStyle(t); return JSON.stringify({fs:e.style.fontSize, cfs:getComputedStyle(e).fontSize, ew:e.getBoundingClientRect().width, sw:e.scrollWidth, cw:e.clientWidth, tw:t.getBoundingClientRect().width, tdisp:cs.display, pl:cs.paddingLeft, edisp:getComputedStyle(e).display, k:e._fzk, gridcols:getComputedStyle(t.parentElement).gridTemplateColumns}); }));
      const bad=await p.evaluate(()=>{
        const out=[], root=document.getElementById('appView');
        const vis=e=>{ const r=e.getBoundingClientRect(); if(r.width<1||r.height<1) return false; const cs=getComputedStyle(e); return cs.visibility!=='hidden'&&cs.display!=='none'&&+cs.opacity>0.05; };
        const lab=e=>(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):'')+' "'+e.textContent.trim().replace(/\s+/g,' ').slice(0,40)+'"';
        const W=document.documentElement.clientWidth;
        const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); let n;
        while((n=tw.nextNode())){ const e=n.parentElement; if(!e||!vis(e)||e.closest('svg,[hidden],[aria-hidden="true"],.ftm-tip,select,option,input,textarea,.cv-yaxis')) continue;
          const re=/[+\-\u2212]?[^\s\d.,%()·]{0,3}\d[\d,.\u00a0\u202f]*\d%?/g; let m;
          while((m=re.exec(n.textContent))){ if(m[0].replace(/\D/g,'').length<5) continue; const rg=document.createRange(); rg.setStart(n,m.index); rg.setEnd(n,m.index+m[0].length);
            const R=[...rg.getClientRects()].filter(r=>r.width>0.5); if(!R.length) continue;
            const tops=[...new Set(R.map(r=>Math.round(r.top/4)))]; if(tops.length>1){ out.push('number broken over two lines: '+lab(e)+' ['+m[0]+']'); continue; }
            const r=R[0]; let box=null, inScroll=false; for(let a=e;a&&a!==root;a=a.parentElement){ const ca=getComputedStyle(a); if(ca.overflowX==='auto'||ca.overflowX==='scroll'){ box=null; inScroll=true; break; } if(/app-tile|app-card|hx-stat|fs-c|kp|dx-card|op-card|lb-|app-scroll/.test(a.className||'')){ box=a; break; } }
            if(box){ const q=box.getBoundingClientRect(); if(r.right>q.right+1||r.left<q.left-1) out.push('number spills out of its box: '+lab(e)+' ['+m[0]+']'+(window.__DBG?' fs='+getComputedStyle(e).fontSize+' r='+Math.round(r.left)+'-'+Math.round(r.right)+' box='+box.className.slice(0,30)+' '+Math.round(q.left)+'-'+Math.round(q.right)+' path='+(()=>{let a=e,o=[];for(let i=0;i<4&&a;i++,a=a.parentElement)o.push(a.tagName+'.'+String(a.className).split(' ')[0]);return o.join('<');})():'')); }
            else if(!inScroll && r.right>W+1) out.push('number wider than the screen: '+lab(e)+' ['+m[0]+']'+(window.__DBG?' path='+(()=>{let a=e,o=[];for(let i=0;i<6&&a;i++,a=a.parentElement)o.push(a.tagName+'.'+String(a.className).split(' ')[0]+'#'+a.id);return o.join('<');})():'')); } }
        return [...new Set(out)];
      });
      bad.forEach(x=>fails.push(name+' · '+v+' · '+x));
    }
    if(errs.length) fails.push(name+' · script error: '+errs[0]);
    await ctx.close(); process.stdout.write('.');
  }
  await b.close();
  fails.forEach(f=>console.log('BAD  '+f));
  console.log(fails.length?('LAYOUT PROBLEMS: '+fails.length):'FIGURES FIT OK'); process.exit(fails.length?1:0);
})();
