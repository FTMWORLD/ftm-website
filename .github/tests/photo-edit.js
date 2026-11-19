// Community photos: choosing a picture opens the editor (move, zoom, rotate; round for the profile photo, Original /
// Square / Portrait / Wide for posts) and only the framed part is uploaded. Laptop, phone and small phone.
// Run: node .github/tests/photo-edit.js [baseUrl]
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
const {chromium}=pw; const BASE=process.argv[2]||'http://localhost:8765';
const fails=[]; const ok=(c,m)=>{console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails.push(m);};
(async()=>{
 const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
 for(const [dev,vp] of [['laptop',{width:1280,height:900}],['phone',{width:390,height:844}],['small phone',{width:340,height:640}]]){
  const p=await b.newPage({viewport:vp}); const errs=[], up=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/api/v1/**',r=>{const u=r.request().url();
   if(/\/api\/v1\/community$/.test(u)){ const bd=JSON.parse(r.request().postData()||'{}');
     if(bd.action==='avatar'){ up.push(bd.image||''); return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"av":"v9"}'}); }
     if(bd.action==='me') return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,mid:'ab12cd34ef56ab78',paid:true,notif_unread:0,profile:{nickname:'gee_m',bio:'',country:'',visible:true,av:null},followers:0,following:0,blocked:[]})});
     return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"threads":[],"members":[],"items":[],"posts":[]}'}); }
   if(u.includes('/stats'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"history":[],"history_total":0}'});
   if(u.includes('/history'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"trades":[],"page":{"offset":0,"limit":200,"total":0}}'});
   if(u.includes('/positions'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"positions":[]}'});
   if(/\/customer\/accounts(\?|$)/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:[{account_id:'c0a00000-0000-4000-8000-00000000000a',account_number:'51000010',name:'DERIV',currency:'USD',balance:'100',equity:'100',display_status:'ACTIVE',status_reason:'OK',is_trading:true,risk_tier:'BALANCED'}]})});
   return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
  const setup=async()=>{ await p.waitForLoadState('load'); await p.waitForTimeout(800);
    await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'pe@ftm.com',products:['auto'],name:'Photo Test'};});
    await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))); };
  await p.goto(BASE+'/');
  try{ await setup(); }catch(e){ if(!/context was destroyed|navigation/i.test(e.message)) throw e; await setup(); }
  await p.waitForTimeout(1200); await p.evaluate(()=>FTM.showView('community')); await p.waitForTimeout(1800);
  const pick=(id,n)=>p.evaluate(([id,n])=>new Promise(done=>{ const mk=(w,h)=>new Promise(res=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d'); x.fillStyle='#ff0000'; x.fillRect(0,0,w/2,h); x.fillStyle='#0000ff'; x.fillRect(w/2,0,w/2,h); c.toBlob(bl=>res(new File([bl],'p'+w+'.png',{type:'image/png'})),'image/png'); });
     Promise.all(Array.from({length:n},()=>mk(600,300))).then(fs=>{ const dt=new DataTransfer(); fs.forEach(f=>dt.items.add(f)); const inp=document.getElementById(id); inp.files=dt.files; inp.dispatchEvent(new Event('change',{bubbles:true})); setTimeout(done,700); }); }),[id,n]);
  const state=()=>p.evaluate(()=>{ const m=document.getElementById('peModal'), c=m.querySelector('.pe-card').getBoundingClientRect(), ok=document.getElementById('peOk').getBoundingClientRect(), st=document.getElementById('peStage').getBoundingClientRect();
    return {open:!m.hidden, asp:!document.getElementById('peAsp').hidden, fits:c.top>=-1&&c.bottom<=innerHeight+1&&c.left>=-1&&c.right<=innerWidth+1, okVisible:ok.bottom<=innerHeight+1&&ok.width>40, stageH:Math.round(st.height)}; });
  // profile photo
  await pick('cAvFile',1); let s=await state();
  ok(s.open&&!s.asp&&s.fits&&s.okVisible&&s.stageH>=200, dev+': choosing a profile photo opens the editor with a round frame, fully on screen (got '+JSON.stringify(s)+')');
  ok(up.length===0, dev+': nothing is uploaded before Use photo');
  const st=await p.$('#peStage'), bb=await st.boundingBox();
  await p.evaluate(()=>{ const z=document.getElementById('peZoom'); z.value='2'; z.dispatchEvent(new Event('input')); });
  await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2); await p.mouse.down(); await p.mouse.move(bb.x+bb.width/2+400,bb.y+bb.height/2,{steps:8}); await p.mouse.up();
  await p.click('#peOk'); await p.waitForTimeout(700);
  const av=up[0]?await p.evaluate(src=>new Promise(res=>{ const i=new Image(); i.onload=()=>{ const c=document.createElement('canvas'); c.width=i.width; c.height=i.height; const x=c.getContext('2d'); x.drawImage(i,0,0); const d=x.getImageData(i.width/2,i.height/2,1,1).data; res({w:i.width,h:i.height,r:d[0],b:d[2]}); }; i.src=src; }),up[0]):null;
  ok(up.length===1&&/^data:image\/jpeg;base64,/.test(up[0])&&av&&av.w===400&&av.h===400, dev+': Use photo uploads one 400×400 JPEG (got '+JSON.stringify(av)+')');
  ok(av&&av.r>200&&av.b<60, dev+': zooming and dragging right keeps the left (red) part in the frame (centre pixel '+JSON.stringify(av)+')');
  ok(await p.evaluate(()=>document.getElementById('peModal').hidden), dev+': the editor closes after Use photo');
  await pick('cAvFile',1); await p.click('#peNo'); await p.waitForTimeout(400);
  ok(up.length===1&&await p.evaluate(()=>document.getElementById('peModal').hidden), dev+': Cancel uploads nothing and closes the editor');
  // post photos: two pictures, the first made square, the second left as it is
  await p.evaluate(()=>{ const t=document.querySelector('.ctab[data-tab="feed"]'); if(t) t.hidden=false; });
  await pick('fdFile',2); s=await state();
  ok(s.open&&s.asp&&s.fits, dev+': a post photo opens the editor with Original, Square, Portrait and Wide (got '+JSON.stringify(s)+')');
  await p.click('#peAsp [data-a="1"]'); await p.click('#peOk'); await p.waitForTimeout(500);
  s=await state(); ok(s.open, dev+': the second photo opens next');
  await p.click('#peOk'); await p.waitForTimeout(700);
  const pv=await p.evaluate(()=>Promise.all([...document.querySelectorAll('#fdPrev img')].map(i=>new Promise(r=>{ if(i.complete) r(i.naturalWidth+'x'+i.naturalHeight); else i.onload=()=>r(i.naturalWidth+'x'+i.naturalHeight); }))));
  ok(pv.length===2&&/^(\d+)x\1$/.test(pv[0])&&(()=>{ const [w,h]=pv[1].split('x').map(Number); return Math.abs(w/h-2)<0.02; })(), dev+': the post gets a square first photo and the second in its original shape (got '+pv.join(', ')+')');
  ok(!errs.length, dev+': no page errors ('+errs.join(' | ')+')');
  if(process.env.SHOT_DIR){ await pick('cAvFile',1); await p.screenshot({path:process.env.SHOT_DIR+'/pe-'+dev.replace(' ','_')+'.png'}); await p.click('#peNo'); await pick('fdFile',1); await p.click('#peAsp [data-a="0.8"]'); await p.screenshot({path:process.env.SHOT_DIR+'/pe-post-'+dev.replace(' ','_')+'.png'}); await p.click('#peNo'); }
  await p.close();
 }
 await b.close(); console.log(fails.length?'FAILED: '+fails.length:'PHOTO EDIT OK'); process.exit(fails.length?1:0);
})();
