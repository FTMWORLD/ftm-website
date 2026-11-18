// Change password in the client area never sets a new password directly (someone who knows the password could
// otherwise lock the owner out): it emails a link, and the new password is chosen from that link.
// Run: node .github/tests/password-change.js (site on http://localhost:8765)
const {chromium}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();
let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const BASE=process.argv[2]||'http://localhost:8765';
(async()=>{
  const b=await chromium.launch();
  for(const [label,vp] of [['laptop',{width:1440,height:900}],['phone',{width:390,height:844}]]){
    const p=await b.newPage({viewport:vp}); const errs=[], mails=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
    await p.route('**/api/v1/**',r=>{ const u=r.request().url(); if(/auth-email/.test(u)){ mails.push(JSON.parse(r.request().postData()||'{}')); return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}); }
      if(/\/customer\/accounts(\?|$)/.test(u)) return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"accounts":[]}'}); return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}); });
    await p.goto(BASE+'/'); await p.waitForTimeout(700);
    const live=await p.evaluate(()=>!!(window.FTM&&FTM.auth&&FTM.auth.ready&&FTM.auth.ready()));
    ok(live,'['+label+'] the site runs with real logins (Supabase configured)');
    let upd=0; await p.evaluate(()=>{const F=window.FTM; F.auth.updatePassword=function(){ window.__upd=(window.__upd||0)+1; return Promise.resolve(); }; F.auth.getAccessToken=()=>Promise.resolve('tok'); F.session={email:'owner@x.com',products:['auto'],name:'G'};});
    await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))).catch(()=>{}); await p.waitForTimeout(1500);
    await p.evaluate(()=>{ const b=[...document.querySelectorAll('.js-pw')][0]; b.click(); }); await p.waitForTimeout(300);
    const m=await p.evaluate(()=>{ const v=id=>{ const e=document.getElementById(id); return !!e&&!e.hidden&&e.offsetParent!==null; }; return {open:!document.getElementById('pwModal').hidden, title:document.getElementById('pwTitle').textContent, newPw:v('pwNew'), save:v('pwSave'), send:v('pwSend'), cur:v('pwCur')}; });
    ok(m.open&&m.title==='Change password'&&!m.newPw&&!m.save&&!m.cur&&m.send,'['+label+'] Change password shows only "Email me the link", no password boxes '+JSON.stringify(m));
    await p.click('#pwSend'); await p.waitForTimeout(400);
    const after=await p.evaluate(()=>({ok:document.getElementById('pwOk').textContent, vis:!document.getElementById('pwOk').hidden, dis:document.getElementById('pwSend').disabled, upd:window.__upd||0}));
    ok(mails.length===1&&mails[0].mode==='reset'&&mails[0].email==='owner@x.com','['+label+'] it emails the reset link to the logged-in email '+JSON.stringify(mails));
    ok(after.vis&&/owner@x\.com/.test(after.ok)&&after.dis&&after.upd===0,'['+label+'] it says where the link went, blocks repeat taps for a minute, and changes nothing yet: '+after.ok);
    await p.click('#pwSend',{force:true}).catch(()=>{}); await p.waitForTimeout(200); ok(mails.length===1,'['+label+'] a second tap right away sends nothing');
    // the link from the email still opens the "choose a new password" form
    await p.evaluate(()=>{ document.getElementById('pwModal').hidden=true; }); 
    const rec=await p.evaluate(()=>{ const s=[...document.scripts].map(x=>x.textContent).join(''); return /pwEmailMode\(false\); document\.getElementById\('pwTitle'\)\.textContent='Reset your password'/.test(s); });
    ok(rec,'['+label+'] opening the emailed link shows the new-password boxes again (Reset your password)');
    const lay=await p.evaluate(()=>{ document.querySelector('.js-pw').click(); const bx=document.querySelector('#pwModal .mdl-box').getBoundingClientRect(), s=document.getElementById('pwSend').getBoundingClientRect(); return {inside:s.left>=bx.left&&s.right<=bx.right, sw:document.documentElement.scrollWidth<=innerWidth}; });
    ok(lay.inside&&lay.sw,'['+label+'] the dialog fits the screen '+JSON.stringify(lay));
    if(process.env.SHOT_DIR){ const e=await p.$('#pwModal .mdl-box'); await e.screenshot({path:require('path').join(process.env.SHOT_DIR,'pw-'+label+'.png')}); }
    ok(!errs.length,'['+label+'] no script errors '+errs.join(' | ')); await p.close();
  }
  await b.close(); console.log(fails?fails+' BROKEN':'ALL OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
