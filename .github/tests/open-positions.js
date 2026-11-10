// Open positions: with many trades the card shows 4 and a See all button; the pop-up lists every trade and closing it puts the card back. Laptop and phone.
// Run: node .github/tests/open-positions.js (site on :8765)
const {chromium}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();
const BASE=process.argv[2]||'http://localhost:8765', SHOTS=process.env.KYC_SHOTS||'';
let fails=0; const tall=async(p,f)=>{ await p.setViewportSize({width:390,height:2050}); await p.evaluate(()=>{ const a=document.getElementById('appView'); if(a) a.scrollTop=0; window.scrollTo(0,0); }); await p.waitForTimeout(300); await p.screenshot({path:f}); await p.setViewportSize({width:390,height:844}); };
const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const OK_V={goal:['GROW_SAVINGS','MONTHLY_INCOME','LONG_TERM','TRY_FIRST'],experience:['NONE','SOME','EXPERIENCED'],drawdown_comfort:[10,25,35]};
function engine(){ const st={full_name:null,country:null,goal:null,experience:null,drawdown_comfort:null,completed_at:null}, puts=[];
  const view=()=>{ const done=['full_name','country','goal','experience','drawdown_comfort'].every(k=>st[k]!=null); if(done&&!st.completed_at) st.completed_at=new Date().toISOString(); if(!done) st.completed_at=null;
    return {ok:true,profile:Object.assign({},st,{full_name:st.full_name||'Tanaya Rao',full_name_saved:st.full_name!=null,kyc_completed:done,suggested_tier:st.drawdown_comfort==null?null:{10:'CONSERVATIVE',25:'BALANCED',35:'GROWTH'}[st.drawdown_comfort]})}; };
  return {puts, handle(method,body){ if(method==='GET') return [200,view()];
    puts.push(body); for(const k of Object.keys(body)){ const v=body[k]; if(!(k in st)) return [422,{ok:false,error:'VALIDATION_FAILED'}];
      if(v!==null && OK_V[k] && OK_V[k].indexOf(v)===-1) return [422,{ok:false,error:'VALIDATION_FAILED'}]; if(k==='country'&&v!==null&&!/^[A-Z]{2}$/.test(v)) return [422,{ok:false,error:'VALIDATION_FAILED'}]; st[k]=v; }
    return [200,view()]; } }; }
async function open(b,vp,E,dflt){
  const p=await b.newPage({viewport:vp}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
  await p.route('**/api/v1/**',async r=>{ const u=r.request().url();
    if(/\/customer\/kyc-profile/.test(u)){ const o=E.handle(r.request().method(),JSON.parse(r.request().postData()||'{}')); return r.fulfill({status:o[0],contentType:'application/json',body:JSON.stringify(o[1])}); }
    if(/\/positions/.test(u)) return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,positions:Array.from({length:10},(_,i)=>({position_ref:'P'+i,symbol:i<8?'XAUUSD':'USTEC',market:'Gold',side:'SELL',volume:'0.10',open_price:'2650',current_price:'2640',profit:String(10+i),opened_at:new Date(Date.now()-i*36e5).toISOString()}))})});
    if(/\/customer\/accounts(\?|$)/.test(u)) return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:[{account_id:'f7a00000-0000-4000-8000-0000000000a1',account_number:'1001',currency:'USD',balance:'500',equity:'500',display_status:'ACTIVE',status_reason:'OK',is_trading:true,deposits:'500',withdrawals:'0'}]})});
    if(u.includes('/billing')) return r.fulfill({status:200,contentType:'application/json',body:'{"status":"ACTIVE","plan":"ANNUAL"}'});
    if(u.includes('/api/v1/community')) return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"profile":{"nickname":""},"members":[],"threads":[]}'});
    return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"trades":[],"positions":[],"history":[]}'}); });
  await p.goto(BASE+'/'); await p.waitForTimeout(700);
  await p.evaluate(()=>{ try{ localStorage.removeItem('ftm_kyc_ban'); }catch(e){} const F=window.FTM; F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()}); F.session={email:'t@x.com',products:['auto'],name:'Tanaya Rao'}; });
  await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))); await p.waitForTimeout(3500);
  p.errs=errs; return p;
}
(async()=>{
  const b=await chromium.launch({...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{})});
  for(const [label,vp] of [['laptop',{width:1280,height:900}],['phone',{width:390,height:844}]]){
    const p=await open(b,vp,engine()); await p.waitForTimeout(2500);
    const n=await p.evaluate(()=>document.querySelectorAll('#mOpenRows tr').length);
    const vis=await p.evaluate(()=>[...document.querySelectorAll('#mOpenRows tr')].filter(r=>r.offsetParent!==null).length);
    ok(n===10&&vis===4,label+': 10 open trades, only 4 shown in the card ('+n+'/'+vis+')');
    ok(await p.isVisible('#mOpenAll') && /10/.test(await p.textContent('#mOpenAll')),label+': a "See all 10 positions" button shows');
    const h1=await p.evaluate(()=>document.getElementById('mOpenRows').closest('.app-card').getBoundingClientRect().height);
    await p.evaluate(()=>document.getElementById('mOpenAll').click()); await p.waitForTimeout(400);
    ok(await p.isVisible('#opModal') && await p.evaluate(()=>[...document.querySelectorAll('#opModal #mOpenRows tr')].filter(r=>r.offsetParent!==null).length)===10,label+': the pop-up lists all 10 trades');
    const fits=await p.evaluate(()=>{ const r=document.querySelector('.op-mcard').getBoundingClientRect(); return r.bottom<=innerHeight+1 && r.right<=innerWidth+1 && r.left>=-1; });
    ok(fits,label+': the pop-up fits the screen (scrolls inside)');
    if(process.env.OP_SHOTS) await p.screenshot({path:process.env.OP_SHOTS+'/open_all_'+label+'.png'});
    await p.click('#opMX'); await p.waitForTimeout(300);
    const h2=await p.evaluate(()=>document.getElementById('mOpenRows').closest('.app-card').getBoundingClientRect().height);
    ok(!(await p.isVisible('#opModal')) && Math.abs(h1-h2)<2 && await p.evaluate(()=>[...document.querySelectorAll('#mOpenRows tr')].filter(r=>r.offsetParent!==null).length)===4,label+': closing puts the card back as it was (4 trades)');
    ok(!p.errs.length,label+': no script errors '+(p.errs[0]||''));
    await p.close();
  }
  await b.close(); console.log(fails?'FAILED: '+fails:'OPEN POSITIONS OK'); process.exit(fails?1:0);
})();
