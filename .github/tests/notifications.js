// Phone notifications + new-device security emails. Server parts run with mocked Supabase, storage, web-push and mail;
// the website part checks the menu item, the settings sheet, the one-time invitation and iPhone guidance on laptop and phones.
// Run: node .github/tests/notifications.js (site on :8765)
const path=require('path'), Module=require('module'); let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const BASE=process.argv[2]||'http://localhost:8765';
(async()=>{
  process.env.SUPABASE_SERVICE_ROLE_KEY='test-service-key'; process.env.SUPABASE_URL='https://x.supabase.co'; process.env.ENGINE_PUSH_SECRET='engine-secret-0123456789';
  // fake storage, users, web-push, mail
  const files={}, users={u1:{id:'u1',email:'one@x.com',app_metadata:{}},u2:{id:'u2',email:'two@x.com',app_metadata:{}}}, pushed=[], mails=[]; let tokenUser='u1';
  const storage={from:()=>({download:async p=>files[p]?{data:{text:async()=>files[p]}}:{error:{message:'nf'}},upload:async(p,b)=>{ files[p]=b.toString(); return {}; }})};
  const supa={createClient:()=>({storage,auth:{getUser:async tok=>({data:{user:users[tokenUser]}}),admin:{getUserById:async id=>({data:{user:users[id]}}),updateUserById:async(id,o)=>{ users[id].app_metadata=o.app_metadata; return {}; },listUsers:async()=>({data:{users:Object.values(users)}}),generateLink:async({type})=>({data:{user:{id:'u1'},properties:{action_link:'https://x/'+type}}})}}})};
  const orig=Module._load; Module._load=function(req,...a){ if(req==='@supabase/supabase-js') return supa; if(req==='web-push') return {setVapidDetails:()=>{},sendNotification:async(sub,payload)=>{ if(sub.endpoint.includes('gone')){ const e=new Error('gone'); e.statusCode=410; throw e; } pushed.push({sub:sub.endpoint,p:JSON.parse(payload)}); }}; return orig.call(this,req,...a); };
  global.fetch=async(u,o)=>{ if(String(u).includes('/i18n/de.json')) return {ok:true,json:async()=>({'New message from {}':'Neue Nachricht von {}','Trade closed in profit':'Trade mit Gewinn geschlossen','{} closed with {}':'{} geschlossen mit {}'})}; return {ok:false,json:async()=>({})}; };
  const Mail=require(path.join(__dirname,'../../api/_lib/mail.js')); Mail.sendMail=async m=>{ mails.push(m); return 'test'; };
  require.cache[require.resolve(path.join(__dirname,'../../api/_lib/mail.js'))].exports.sendMail=Mail.sendMail;
  const P=require(path.join(__dirname,'../../api/_lib/push.js')), H=require(path.join(__dirname,'../../api/v1/push.js'));
  const call=async(h,req)=>{ let code=0,j=null,html=''; await h(Object.assign({headers:{},method:'POST'},req),{status:c=>{code=c; return {json:x=>{j=x;},end:x=>{html=x;},setHeader(){ return this; }};},setHeader(){}}); return {code,j,html}; };
  const v=P.vapid(); ok(v.pub.length===87 && v.priv.length===43, 'push keys are derived on the server (nothing to set up)');
  let r=await call(H,{method:'GET',query:{key:'1'}}); ok(r.j&&r.j.key===v.pub, 'the website can fetch the public key');
  r=await call(H,{headers:{authorization:'Bearer t'},body:{action:'subscribe',sub:{endpoint:'https://push.example/a',keys:{p256dh:'p',auth:'a'}},lang:'de'}}); ok(r.j&&r.j.devices===1, 'a member\'s phone subscribes');
  r=await call(H,{headers:{authorization:'Bearer t'},body:{action:'subscribe',sub:{endpoint:'https://push.example/gone',keys:{p256dh:'p',auth:'a'}},lang:'en'}});
  r=await call(H,{headers:{authorization:'Bearer t'},body:{action:'test'}}); ok(r.j&&r.j.devices===1 && pushed.length===1, 'test notification reaches the phone; a dead subscription is removed ('+JSON.stringify(r.j)+')');
  ok(!JSON.parse(files['push/'+P.midOf('u1')+'.json']).subs.some(s=>s.endpoint.includes('gone')), 'expired phones are cleaned up automatically');
  // engine events
  pushed.length=0; r=await call(H,{headers:{'x-ftm-engine-key':'wrong'},body:{event:'trade_profit',user_id:'u1',symbol:'XAUUSD',profit:'12.4',currency:'USD'}}); ok(r.code===401, 'engine events need the shared secret');
  r=await call(H,{headers:{'x-ftm-engine-key':'engine-secret-0123456789'},body:{event:'trade_profit',user_id:'u1',symbol:'XAUUSD',profit:'12.4',currency:'USD'}});
  ok(r.j&&r.j.devices===1 && pushed[0].p.title==='Trade mit Gewinn geschlossen' && pushed[0].p.body==='XAUUSD geschlossen mit +12.40 USD', 'trade closed in profit -> notification in the member\'s language ('+JSON.stringify(pushed[0]&&pushed[0].p)+')');
  r=await call(H,{headers:{'x-ftm-engine-key':'engine-secret-0123456789'},body:{event:'trade_profit',user_id:'u1',symbol:'XAUUSD',profit:'-3'}}); ok(r.code===400, 'a losing trade sends nothing');
  pushed.length=0; r=await call(H,{headers:{'x-ftm-engine-key':'engine-secret-0123456789'},body:{event:'leaderboard_up',email:'one@x.com',rank:3,previous_rank:7}}); ok(pushed[0]&&/#3/.test(pushed[0].p.body)&&/#7/.test(pushed[0].p.body), 'leaderboard climb -> notification with the new and old place');
  r=await call(H,{headers:{authorization:'Bearer t'},body:{action:'prefs',prefs:{trades:false}}}); pushed.length=0;
  await call(H,{headers:{'x-ftm-engine-key':'engine-secret-0123456789'},body:{event:'trade_profit',user_id:'u1',symbol:'X',profit:'1'}}); ok(pushed.length===0, 'a member who switched trade notifications off gets none');
  // login alerts
  const L=require(path.join(__dirname,'../../api/v1/login-alert.js'));
  const tok=JSON.stringify({}); const jwt=(iat)=>'h.'+Buffer.from(JSON.stringify({iat})).toString('base64')+'.s';
  const now=Math.floor(Date.now()/1000);
  r=await call(L,{headers:{authorization:'Bearer '+jwt(now),'user-agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1','x-vercel-ip-city':'Lagos','x-vercel-ip-country':'NG'},body:{device:'device-aaaa1111'}});
  ok(r.j&&r.j.known===false&&!r.j.emailed && mails.length===0, 'the first device is remembered without an email');
  r=await call(L,{headers:{authorization:'Bearer '+jwt(now),'user-agent':'x'},body:{device:'device-aaaa1111'}}); ok(r.j&&r.j.known===true&&mails.length===0, 'the same device logging in again sends nothing');
  r=await call(L,{headers:{authorization:'Bearer '+jwt(now),'user-agent':'Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537','x-vercel-ip-city':'London','x-vercel-ip-country':'GB'},body:{device:'device-bbbb2222'}});
  const m=mails[0]||{}; ok(r.j&&r.j.emailed && m.to==='one@x.com' && /New sign-in/.test(m.subject) && /Chrome on Windows/.test(m.html) && /London, United Kingdom/.test(m.html) && /This wasn.t me/.test(m.html), 'a new device -> "New sign-in" email with device, place and a "This wasn\'t me" button');
  ok(/Invest today, secure tomorrow\./.test(m.html) && /email-logo\.png/.test(m.html) && !/involves risk/i.test(m.html), 'the email has the FTM footer and no risk text');
  const link=(m.html.match(/notme=([^"&]+)/)||[])[1]; r=await call(L,{method:'GET',query:{notme:link+'x'}}); ok(/expired/.test(r.html), 'a changed link is refused');
  mails.length=0; r=await call(L,{method:'GET',query:{notme:decodeURIComponent(link)}});
  ok(/Your account is secured/.test(r.html) && users.u1.app_metadata.ftm_revoked_at && users.u1.app_metadata.ftm_devices.length===0, '"This wasn\'t me" signs every device out and forgets the devices');
  r=await call(L,{headers:{authorization:'Bearer '+jwt(now-60)},body:{device:'device-aaaa1111'}}); ok(r.j&&r.j.signout===true, 'sessions from before "This wasn\'t me" are signed out on the website');
  r=await call(L,{headers:{authorization:'Bearer '+jwt(now+120)},body:{device:'device-cccc3333'}}); ok(r.j&&!r.j.signout, 'logging in again afterwards works');
  Module._load=orig;
  // website: menu item, sheet, invitation, iPhone guidance
  const {chromium,devices}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})(); const b=await chromium.launch();
  for(const [dev,opt] of [['laptop',{viewport:{width:1366,height:900}}],['Android',devices['Pixel 5']],['iPhone',devices['iPhone 13']]]){
    const c=await b.newContext(opt); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const calls=[];
    await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
    await p.route('**/api/v1/**',r=>{ const u=r.request().url(); if(u.includes('/push')||u.includes('/login-alert')) calls.push(u.split('/api/v1/')[1]+' '+(r.request().postData()||'')); if(u.includes('/push?key')) return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,key:v.pub})}); if(u.includes('/push')) return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"prefs":{"messages":true,"follows":true,"social":true,"trades":true,"leaderboard":false},"devices":0}'}); return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"accounts":[],"positions":[]}'}); });
    await p.addInitScript(()=>{ try{ Object.defineProperty(Notification,'permission',{get:()=>'default'}); }catch(e){} });
    await p.goto(BASE+'/'); await p.waitForTimeout(700);
    const head=await p.evaluate(()=>({mf:!!document.querySelector('link[rel=manifest]'), sw:'serviceWorker' in navigator}));
    ok(head.mf, dev+': the site can be installed like an app (manifest)');
    await p.evaluate(()=>{ const F=window.FTM; F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('t'),signOut:()=>Promise.resolve()}); F.session={email:'t@ftm.com',products:['auto'],name:'T'}; return F.loadLive().then(()=>F.openArea('auto')); });
    await p.evaluate(()=>FTM.loginCheck&&FTM.loginCheck()); await p.waitForTimeout(3500);
    const ask=await p.evaluate(()=>!document.getElementById('ntAsk').hidden);
    ok(ask, dev+': after login a one-time card offers phone notifications');
    await p.evaluate(()=>{ const m=document.querySelector('#appView .um-nt'); m.dispatchEvent(new MouseEvent('click',{bubbles:true})); }); await p.waitForTimeout(800);
    const sh=await p.evaluate(()=>({open:!document.getElementById('ntSheet').hidden, state:document.getElementById('ntState').textContent, prefs:!document.getElementById('ntPrefs').hidden, on:!document.getElementById('ntOn').hidden, lb:(document.querySelector('#ntPrefs [data-k=leaderboard]')||{}).checked}));
    if(dev==='iPhone') ok(sh.open && /Add to Home Screen/.test(sh.state) && !sh.on, dev+': iPhone (not installed) is told how to add FTM to the Home Screen ('+sh.state.slice(0,60)+')');
    else ok(sh.open && sh.prefs && sh.on && sh.lb===false, dev+': "Phone notifications" opens the settings with a Turn on button and the saved choices ('+JSON.stringify(sh)+')');
    ok(calls.some(x=>/^login-alert/.test(x)&&/device/.test(x)), dev+': every login is checked for a new device');
    ok(!errs.length, dev+': no script errors '+(errs[0]||''));
    await c.close(); }
  await b.close();
  console.log(fails?'FAILED: '+fails:'NOTIFICATIONS OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
