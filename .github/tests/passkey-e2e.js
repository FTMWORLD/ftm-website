// Face ID / fingerprint (passkeys) end to end with a virtual authenticator and the real server code:
// turn on, log in, and the tap goes straight to Face ID (no download in between, which Safari requires).
// Run: node .github/tests/passkey-e2e.js   (needs @simplewebauthn/server; set PK_DEPS to its node_modules folder if not installed here)
const Module=require('module'), path=require('path'), fs=require('fs'); const orig=Module._load;
const U={id:'11111111-2222-4333-8444-555555555555',email:'pk@ftm.com',app_metadata:{},user_metadata:{full_name:'PK Member'}};
const fake={createClient:()=>({auth:{getUser:async t=>({data:{user:t==='tok'?U:null}}),admin:{updateUserById:async(id,o)=>{ if(o.app_metadata) U.app_metadata=o.app_metadata; return {data:{user:U}}; },getUserById:async id=>({data:{user:id===U.id?U:null}}),generateLink:async()=>({data:{properties:{hashed_token:'th123'}}})}}})};
Module._load=function(r,...a){ if(r==='@supabase/supabase-js') return fake; if(r==='@simplewebauthn/server'&&process.env.PK_DEPS) return orig.call(this,path.join(process.env.PK_DEPS,'@simplewebauthn/server'),...a); return orig.call(this,r,...a); };
process.env.SUPABASE_SERVICE_ROLE_KEY='test-key';
const handler=require(path.join(__dirname,'../../api/v1/passkey.js'));
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
const ROOT=path.join(__dirname,'../..'); let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const TYPES={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.jpg':'image/jpeg'};
(async()=>{ const b=await pw.chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
for(const [n,opt] of [['laptop',{viewport:{width:1280,height:900}}],['phone',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}]]){
  U.app_metadata={}; const c=await b.newContext(opt), p=await c.newPage(), errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await c.route(/^https?:\/\/(?!www\.ftmwealthnation\.com)/,r=>r.abort());
  await c.route('https://www.ftmwealthnation.com/**',async r=>{ const u=new URL(r.request().url());
    if(u.pathname==='/api/v1/passkey'){ const out=await new Promise(res=>{ const rs={s:200,status(x){this.s=x;return this;},json(j){res([this.s,j]);}}; const h=r.request().headers();
        handler({method:r.request().method(),headers:{host:'www.ftmwealthnation.com',authorization:h.authorization||'','user-agent':h['user-agent']||''},body:r.request().postData()||'{}'},rs); });
      return r.fulfill({status:out[0],contentType:'application/json',body:JSON.stringify(out[1])}); }
    if(u.pathname.startsWith('/api/')) return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});
    const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname)); if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()) return r.fulfill({status:404,body:''});
    return r.fulfill({status:200,contentType:TYPES[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)}); });
  const cdp=await c.newCDPSession(p); await cdp.send('WebAuthn.enable'); await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
  await p.goto('https://www.ftmwealthnation.com/'); await p.waitForTimeout(1200);
  await p.evaluate(()=>{ const A=FTM.auth; A.ready=()=>true; A.getAccessToken=()=>Promise.resolve('tok'); A.verifyTokenHash=th=>th==='th123'?Promise.resolve({email:'pk@ftm.com',products:['auto'],name:'PK'}):Promise.reject(new Error('bad'));
    window.__f=0; const of=window.fetch; window.fetch=function(){ window.__f++; return of.apply(this,arguments); };
    window.__calls=[]; const cc=navigator.credentials.create.bind(navigator.credentials), cg=navigator.credentials.get.bind(navigator.credentials);
    window.__tap=false; document.addEventListener('click',()=>{ window.__tap=true; setTimeout(()=>{ window.__tap=false; },0); },true); navigator.credentials.create=o=>{ window.__calls.push(['create',window.__tap?0:1]); return cc(o); }; navigator.credentials.get=o=>{ window.__calls.push(['get',window.__tap?0:1]); return cg(o); };
    const t=document.createElement('button'); t.id='__reg'; t.textContent='turn on'; t.style.cssText='position:fixed;top:0;left:0;z-index:99999'; t.onclick=()=>{ window.__f=0; FTM.pk.register().then(()=>window.__regR='ok',e=>window.__regR='err '+(e.code||e.name||e.message)); }; document.body.appendChild(t); });
  // before Face ID is on, the login window must not offer it (it would only show a QR code)
  await p.evaluate(()=>{ try{ localStorage.removeItem('ftm_pk_on'); }catch(e){} FTM.session=null; document.querySelector('.js-login').click(); }); await p.waitForTimeout(900);
  ok(!(await p.isVisible('#authPk')), n+': no Face ID button on a device where Face ID is not turned on');
  await p.evaluate(()=>{ document.getElementById('authOverlay').hidden=true; });
  // turn on Face ID from the menu prompt: Turn on waits until it is ready, then goes straight to Face ID
  await p.evaluate(()=>{ FTM.session={email:'pk@ftm.com',products:['auto'],name:'PK'}; return FTM.loadLive().then(()=>FTM.openArea('auto')); }); await p.waitForTimeout(1500);
  await p.evaluate(()=>{ const b=document.querySelector('.um-pk'); b.dispatchEvent(new MouseEvent('click',{bubbles:true})); });
  await p.waitForFunction(()=>{ const y=document.getElementById('pkYes'); return y&&!y.hidden&&!y.disabled; },null,{timeout:8000}).catch(()=>{}); if(process.env.DBG) console.log('DBG',await p.evaluate(()=>({t:document.getElementById('pkToast').hidden,y:document.getElementById('pkYes').hidden,d:document.getElementById('pkYes').disabled,m:document.getElementById('pkMsg').textContent,on:FTM.pk.isOn(),um:document.querySelectorAll('.um-pk').length})));
  await p.evaluate(()=>{ window.__f=0; window.__calls=[]; }); await p.click('#pkYes');
  await p.waitForFunction(()=>/is on for this device/.test(document.getElementById('pkMsg').textContent),null,{timeout:10000}).catch(()=>{});
  await p.evaluate(()=>{ window.__regR=/is on for this device/.test(document.getElementById('pkMsg').textContent)?'ok':'msg: '+document.getElementById('pkMsg').textContent; });
  let r=await p.evaluate(()=>({reg:window.__regR,calls:window.__calls.slice()}));
  ok(r.reg==='ok' && (U.app_metadata.passkeys||[]).length===1, n+': turning on Face ID stores a passkey for this person ('+r.reg+')');
  ok(r.calls[0] && r.calls[0][0]==='create' && r.calls[0][1]===0, n+': tapping Turn on starts Face ID within the tap itself (what Safari requires)');
  // log in with Face ID from the login window
  await p.evaluate(()=>{ FTM.session=null; document.getElementById('appView').hidden=true; const a=document.querySelector('.js-login'); a.click(); }); await p.waitForTimeout(1200);
  ok(await p.isVisible('#authPk'), n+': the login window offers "Log in with Face ID or fingerprint"');
  await p.evaluate(()=>{ window.__f=0; window.__calls=[]; }); await p.click('#authPk');
  await p.waitForFunction(()=>window.FTM.session&&FTM.session.email==='pk@ftm.com',null,{timeout:10000}).catch(()=>{});
  r=await p.evaluate(()=>({calls:window.__calls.slice(),email:FTM.session&&FTM.session.email,err:(document.getElementById('authError')||{}).textContent}));
  ok(r.email==='pk@ftm.com', n+': Face ID logs the person in ('+(r.email||r.err)+')');
  ok(r.calls[0] && r.calls[0][0]==='get' && r.calls[0][1]===0, n+': tapping Face ID starts it within the tap itself (what Safari requires)');
  // a device without an FTM passkey gets a clear message
  U.app_metadata={passkeys:[]}; await p.evaluate(()=>{ FTM.session=null; document.getElementById('appView').hidden=true; const a=document.querySelector('.js-login'); a.click(); }); await p.waitForTimeout(1200);
  await p.click('#authPk'); await p.waitForTimeout(1500);
  const msg=await p.evaluate(()=>{ const e=document.getElementById('authError'); return e&&!e.hidden?e.textContent:''; });
  ok(/no FTM Face ID yet/.test(msg), n+': a device without Face ID set up gets a clear message ('+msg+')');
  ok(!errs.length, n+': no script errors '+(errs[0]||''));
  await c.close(); }
await b.close(); console.log(fails?'FAILED: '+fails:'PASSKEY OK'); process.exit(fails?1:0); })();
