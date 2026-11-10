// Know Your Customer page: badge until done, 5 answers saved to the engine contract (GET/PUT /customer/kyc-profile), check mark after, laptop and phone.
// Run: node .github/tests/kyc-e2e.js (site on :8765)
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
  const b0=await chromium.launch({...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{})});
  { const E=engine(), p=await open(b0,{width:1280,height:900},E, true);
    ok(await p.isVisible('#appView .app-nav-item[data-view="kyc"]'),'KYC is on for every customer by default (no switch needed)'); await b0.close(); }
  const b=await chromium.launch({...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{})});
  for(const [label,vp] of [['laptop',{width:1280,height:900}],['phone',{width:390,height:844}]]){
    const E=engine(), p=await open(b,vp,E);
    const nav='#appView .app-nav-item[data-view="kyc"]';
    ok(await p.evaluate(n=>{ const all=[...document.querySelectorAll('#appView .app-nav-item')]; return all[all.length-1]===document.querySelector(n); },nav),label+': "Know Your Customer (KYC)" is the last item of the menu');
    ok(await p.isVisible('#kycDot') && !(await p.isVisible('#kycOk')),label+': gold "Verify your KYC" badge shows until it is done');
    ok(await p.isVisible('#kycBan'),label+': dashboard shows the slim "Complete your KYC" banner');
    if(SHOTS&&label==='laptop') await p.screenshot({path:SHOTS+'/kyc_menu_'+label+'.png'});
    await p.evaluate(n=>document.querySelector(n).click(),nav); await p.waitForTimeout(700);
    ok(await p.inputValue('#kycName')==='Tanaya Rao',label+': full name is pre-filled from sign-up');
    ok(/0\/5|1\/5/.test(await p.textContent('#kycCount')),label+': progress shows how many answers are given');
    if(SHOTS) await (label==='phone'?tall(p,SHOTS+'/kyc_empty_phone.png'):p.screenshot({path:SHOTS+'/kyc_empty_laptop.png'}));
    await p.click('#kycCountryQ'); await p.keyboard.type('germ'); await p.waitForTimeout(150); ok(await p.isVisible('.cc-list') && /Germany/.test(await p.textContent('.cc-list .cc-o.on')),label+': typing "germ" finds Germany'); if(SHOTS) await p.locator('.kyc-q').nth(1).screenshot({path:SHOTS+'/cc_'+label+'.png'}).catch(()=>{}); await p.keyboard.press('Enter');
    await p.click('.kyc-tiles[data-k="goal"] [data-v="LONG_TERM"]'); await p.click('.kyc-tiles[data-k="experience"] [data-v="SOME"]'); await p.click('.kyc-tiles[data-k="drawdown_comfort"] [data-v="25"]');
    ok(await p.isVisible('#kycHint') && /Balanced/.test(await p.textContent('#kycTier')),label+': about 25% shows the Balanced profile as a hint');
    ok(await p.textContent('#kycCount')==='5/5',label+': all five answered');
    await p.click('#kycSave'); await p.waitForTimeout(900);
    const last=E.puts[E.puts.length-1]||{};
    ok(last.full_name==='Tanaya Rao'&&last.country==='DE'&&last.goal==='LONG_TERM'&&last.experience==='SOME'&&last.drawdown_comfort===25,label+': saves exactly the engine contract '+JSON.stringify(last));
    ok(await p.isVisible('#kycDone') && /complete/i.test(await p.textContent('#kycMsg')),label+': shows "KYC completed" with a thank-you');
    ok(!(await p.isVisible('#kycDot')) && await p.isVisible('#kycOk'),label+': badge disappears and a check mark shows in the menu');
    ok(!(await p.isVisible('#kycBan')),label+': dashboard banner is gone once done');
    await p.click('.kyc-tiles[data-k="drawdown_comfort"] [data-v="35"]'); await p.click('#kycSave'); await p.waitForTimeout(700);
    ok(E.puts[E.puts.length-1].drawdown_comfort===35 && /Growth/.test(await p.textContent('#kycTier')),label+': an answer can be changed later');
    const over=await p.evaluate(()=>{ const v=document.querySelector('.app-view[data-view="kyc"]'); const W=document.documentElement.clientWidth; return [...v.querySelectorAll('*')].filter(e=>{ const r=e.getBoundingClientRect(); return r.width>0 && (r.right>W+1||r.left<-1); }).length; });
    ok(over===0,label+': nothing sticks out of the screen ('+over+')');
    if(SHOTS) await (label==='phone'?tall(p,SHOTS+'/kyc_done_phone.png'):p.locator('.kyc-card').screenshot({path:SHOTS+'/kyc_done_laptop.png'}));
    ok(!p.errs.length,label+': no script errors '+(p.errs[0]||''));
    await p.close();
  }
  await b.close(); console.log(fails?'FAILED: '+fails:'KYC OK'); process.exit(fails?1:0);
})();
