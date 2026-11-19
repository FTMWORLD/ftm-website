// The round avatar beside the name, email and client ID in the client-area menu shows the member's Community photo;
// with no photo it shows the first letter of their name. Run: node .github/tests/menu-avatar.js [baseUrl]
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
const {chromium}=pw; const BASE=process.argv[2]||'http://localhost:8765';
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
const fails=[]; const ok=(c,m)=>{console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails.push(m);};
(async()=>{
 const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
 for(const [dev,vp] of [['laptop',{width:1280,height:900}],['phone',{width:390,height:844}]]){
  const p=await b.newPage({viewport:vp}); const errs=[]; let av='v1'; p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/api/v1/**',r=>{const u=r.request().url();
   if(/community\?avatar=/.test(u)) return r.fulfill({status:200,contentType:'image/png',body:PNG});
   if(/\/api\/v1\/community$/.test(u)){ const bd=JSON.parse(r.request().postData()||'{}');
     if(bd.action==='me') return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,mid:'ab12cd34ef56ab78',paid:true,notif_unread:0,profile:{nickname:'gee_m',bio:'',country:'',visible:true,av},followers:0,following:0,blocked:[]})});
     return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"threads":[],"members":[],"items":[],"posts":[]}'}); }
   if(u.includes('/stats'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"history":[],"history_total":0}'});
   if(u.includes('/history'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"trades":[],"page":{"offset":0,"limit":200,"total":0}}'});
   if(u.includes('/positions'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"positions":[]}'});
   if(/\/customer\/accounts(\?|$)/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:[{account_id:'c0a00000-0000-4000-8000-000000000009',account_number:'51000009',name:'DERIV',currency:'USD',balance:'100',equity:'100',display_status:'ACTIVE',status_reason:'OK',is_trading:true,risk_tier:'BALANCED'}]})});
   return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
  const setup=async()=>{ await p.waitForLoadState('load'); await p.waitForTimeout(800);
    await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'gospel@ftm.com',products:['auto'],name:'Gospel Marine'};});
    await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))); };
  await p.goto(BASE+'/');
  try{ await setup(); }catch(e){ if(!/context was destroyed|navigation/i.test(e.message)) throw e; await setup(); }
  await p.waitForTimeout(1500);
  const chk=()=>p.evaluate(()=>new Promise(done=>{ FTM.navCheck(); setTimeout(()=>{ const a=document.getElementById('sbAv'), im=a.querySelector('img'); done({img:im?im.getAttribute('src'):null,loaded:!!(im&&im.complete&&im.naturalWidth),txt:a.textContent.trim(),cls:a.className,r:getComputedStyle(a).borderRadius}); },900); }));
  let s=await chk();
  ok(s.img&&/avatar=ab12cd34ef56ab78/.test(s.img)&&s.loaded&&/has-img/.test(s.cls), dev+': the menu avatar shows the Community photo (got '+JSON.stringify(s)+')');
  av=null; s=await chk();
  ok(!s.img&&s.txt==='G'&&!/has-img/.test(s.cls), dev+': with no photo it shows the first letter of the name (got '+JSON.stringify(s)+')');
  av='v2'; s=await chk(); ok(s.img&&/v=v2/.test(s.img), dev+': a new photo replaces the old one (got '+JSON.stringify(s)+')');
  ok(!errs.length, dev+': no page errors ('+errs.join(' | ')+')');
  await p.close();
 }
 await b.close(); console.log(fails.length?'FAILED: '+fails.length:'MENU AVATAR OK'); process.exit(fails.length?1:0);
})();
