// Two real members in two browsers: empty profile at first, save a name, find each other in Discover, message and reply live.
// Runs the real api/v1/community.js against an in-memory stand-in for Supabase. Run: node .github/tests/community-e2e.js (site on :8765)
const path=require('path'), Module=require('module'), orig=Module._load;
const {chromium}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();
const files={}, users={tokA:{id:'00000000-0000-4000-8000-00000000000a'},tokB:{id:'00000000-0000-4000-8000-00000000000b'}};
const fake={createClient:()=>({auth:{getUser:async t=>({data:{user:users[t]||null}})},
  from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{products:['auto']}})})})}),
  storage:{getBucket:async()=>({error:null}),createBucket:async()=>({}),from:()=>({download:async p=>files[p]?{data:{text:async()=>files[p]}}:{error:{message:'nf'}},upload:async(p,b)=>{files[p]=b.toString();return {};}})}})};
Module._load=function(r,...a){ if(r==='@supabase/supabase-js') return fake; return orig.call(this,r,...a); };
process.env.SUPABASE_SERVICE_ROLE_KEY='test';
const H=require(path.join(__dirname,'../../api/v1/community.js'));
const BASE=process.argv[2]||'http://localhost:8765';
let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
async function open(b,tok,name){
  const p=await b.newPage({viewport:{width:1280,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
  await p.route('**/api/v1/**',async r=>{ const u=r.request().url();
    if(u.includes('/api/v1/community')){ const auth=r.request().headers()['authorization']||''; const body=JSON.parse(r.request().postData()||'{}');
      const out=await new Promise(res=>{ const rs={s:200,status(c){this.s=c;return this;},json(j){res([this.s,j]);},end(){res([this.s,{}]);}}; H({method:'POST',headers:{authorization:auth},body},rs); });
      return r.fulfill({status:out[0],contentType:'application/json',body:JSON.stringify(out[1])}); }
    if(/\/customer\/accounts(\?|$)/.test(u)) return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:[{account_id:'f7a00000-0000-4000-8000-0000000000'+(tok==='tokA'?'a1':'b1'),account_number:tok==='tokA'?'1001':'1002',currency:'USD',balance:'500',equity:'500',display_status:'ACTIVE',status_reason:'OK',is_trading:true,deposits:'500',withdrawals:'0'}]})});
    if(u.includes('/billing')) return r.fulfill({status:200,contentType:'application/json',body:'{"status":"ACTIVE","plan":"ANNUAL"}'});
    return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"trades":[],"positions":[],"history":[]}'}); });
  await p.goto(BASE+'/'); await p.waitForTimeout(700);
  await p.evaluate(([tok,name])=>{ const F=window.FTM; F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve(tok),signOut:()=>Promise.resolve()}); F.session={email:name.toLowerCase()+'@x.com',products:['auto'],name:name}; },[tok,name]);
  await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))); await p.waitForTimeout(1200);
  await p.evaluate(()=>FTM.showView('community')); await p.waitForTimeout(900);
  p.errs=errs; return p;
}
const tab=(p,t)=>p.click('#cTabs [data-tab="'+t+'"]');
(async()=>{
  const b=await chromium.launch({...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{})});
  const A=await open(b,'tokA','Tanaya');
  await tab(A,'profile'); await A.waitForTimeout(300);
  const nm=await A.inputValue('#cName'); ok(nm==='','a new member sees an empty name, not someone else\'s (got "'+nm+'")');
  await A.fill('#cName','Tanaya'); await A.fill('#cBio','Gold and indices'); if(await A.getAttribute('#cVisToggle','aria-checked')!=='true') await A.click('#cVisToggle'); await A.click('#cSave'); await A.waitForTimeout(700);
  ok(/Saved/.test(await A.textContent('#cSaved')) && await A.isVisible('#cSaved'),'Tanaya saves her profile and SEES "Saved."');
  const B=await open(b,'tokB','Marine');
  await tab(B,'discover'); await B.waitForTimeout(500);
  ok(/Tanaya/.test(await B.textContent('#cMembers')),'Marine sees Tanaya in Discover');
  await tab(B,'profile'); await B.fill('#cName','tanaya'); if(await B.getAttribute('#cVisToggle','aria-checked')!=='true') await B.click('#cVisToggle'); await B.click('#cSave'); await B.waitForTimeout(600);
  ok(/already taken/.test(await B.textContent('#cSaved')) && await B.isVisible('#cSaved'),'a taken name is refused with a clear message');
  await B.fill('#cName','Marine'); await B.click('#cSave'); await B.waitForTimeout(700);
  ok(/Saved/.test(await B.textContent('#cSaved')) && await B.isVisible('#cSaved'),'a second, different customer (Marine) also saves and SEES "Saved."');
  await A.bringToFront(); await tab(A,'discover'); await A.waitForTimeout(1500);
  ok(/Marine/.test(await A.textContent('#cMembers')),'Tanaya sees Marine in Discover');
  await A.click('#cMembers [data-msg]'); await A.waitForTimeout(500);
  await A.fill('#cChatInput','Hello Marine, how is your gold trade?'); await A.press('#cChatInput','Enter'); await A.waitForTimeout(700);
  ok(/Hello Marine/.test(await A.textContent('#cChatLog')),'Tanaya\'s message appears in her chat');
  await B.bringToFront(); await B.waitForTimeout(4600);
  ok(await B.evaluate(()=>document.querySelector('#cTabs [data-tab="messages"]').classList.contains('has-unread')),'Marine gets an unread mark on Messages');
  await tab(B,'messages'); await B.waitForTimeout(900);
  ok(/Hello Marine/.test(await B.textContent('#cChatLog')),'Marine reads the message');
  await B.fill('#cChatInput','All good, thanks Tanaya!'); await B.press('#cChatInput','Enter'); await B.waitForTimeout(600);
  await A.bringToFront(); await tab(A,'messages'); await A.waitForTimeout(4800);
  ok(/All good, thanks Tanaya/.test(await A.textContent('#cChatLog')),'Tanaya sees the reply without reloading');
  await A.fill('#cChatInput','my number is +49 151 2345 6789'); await A.press('#cChatInput','Enter'); await A.waitForTimeout(600);
  ok(/not allowed/.test(await A.textContent('#cChatErr')),'contact details are refused with a clear message');
  ok(!A.errs.length && !B.errs.length,'no script errors '+(A.errs[0]||B.errs[0]||''));
  await b.close(); console.log(fails?'FAILED: '+fails:'COMMUNITY LIVE OK'); process.exit(fails?1:0);
})();
