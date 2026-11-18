// Account menu > Your devices: every device the account is logged in on (this device marked first, place and last
// activity), and "Sign out all other devices". Laptop, phone and small phone. Run: node .github/tests/devices.js (site on :8765)
const {chromium}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();
let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const BASE=process.argv[2]||'http://localhost:8765';
(async()=>{
  const b=await chromium.launch();
  for(const [label,vp] of [['laptop',{width:1440,height:900}],['phone',{width:390,height:844}],['small phone',{width:360,height:740}]]){
    const p=await b.newPage({viewport:vp}); const errs=[], ops=[]; p.on('pageerror',e=>errs.push(e.message));
    let devs=[{name:'Safari on iPhone',where:'Lagos, Nigeria',first:'2026-11-01T10:00:00Z',last:new Date().toISOString(),current:true},{name:'Chrome on Windows',where:'London, United Kingdom',first:'2026-11-10T10:00:00Z',last:'2026-11-17T21:14:00Z',current:false},{name:'Firefox on Mac',where:'Berlin, Germany',first:'2026-11-12T10:00:00Z',last:'2026-11-16T08:02:00Z',current:false}];
    await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
    await p.route('**/api/v1/**',r=>{ const u=r.request().url(), J=o=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(o)});
      if(u.includes('/login-alert')){ const o=JSON.parse(r.request().postData()||'{}'); ops.push(o); if(o.op==='list') return J({ok:true,devices:devs}); if(o.op==='signout_others'){ devs=devs.filter(d=>d.current); return J({ok:true,signed_out:2}); } return J({ok:true,known:true}); }
      if(/\/customer\/accounts(\?|$)/.test(u)) return J({ok:true,accounts:[]}); return J({ok:true}); });
    await p.goto(BASE+'/'); await p.waitForTimeout(600);
    await p.evaluate(()=>{ const F=FTM; F.auth.getAccessToken=()=>Promise.resolve('tok'); F.session={email:'a@x.com',products:['auto'],name:'A'}; });
    await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))).catch(()=>{}); await p.waitForTimeout(1200);
    ok(await p.evaluate(()=>document.querySelectorAll('.um-dev').length===2),'['+label+'] "Your devices" is in the account menu');
    await p.evaluate(()=>{ const m=[...document.querySelectorAll('.um-btn')].find(x=>x.offsetParent); if(m) m.click(); }); await p.waitForTimeout(200);
    await p.evaluate(()=>{ const d=[...document.querySelectorAll('.um-dev')].find(x=>x.offsetParent)||document.querySelector('.um-dev'); d.click(); }); await p.waitForTimeout(500);
    let v=await p.evaluate(()=>{ const m=document.getElementById('dvModal'), rows=[...m.querySelectorAll('.dv-row')]; return {open:!m.hidden, n:rows.length, first:rows[0]&&rows[0].innerText, cur:rows.filter(r=>r.classList.contains('cur')).length, btn:!!m.querySelector('[data-dv-out]')}; });
    ok(v.open&&v.n===3&&v.cur===1&&/Safari on iPhone/.test(v.first)&&/This device/i.test(v.first)&&/Lagos/.test(v.first)&&/Last active/.test(v.first)&&v.btn,'['+label+'] it lists 3 devices, this one first and marked, with place and last activity');
    const dev=ops.find(o=>o.op==='list'); ok(dev&&/^[a-z0-9-]{8,64}$/i.test(dev.device),'['+label+'] it asks with this device\'s id');
    const lay=await p.evaluate(()=>{ const c=document.querySelector('#dvModal .ss-card').getBoundingClientRect(), rows=[...document.querySelectorAll('#dvModal .dv-row')].map(r=>r.getBoundingClientRect()), btn=document.querySelector('#dvModal [data-dv-out]').getBoundingClientRect();
      return {inside:rows.every(r=>r.left>=c.left&&r.right<=c.right+0.5)&&btn.left>=c.left&&btn.right<=c.right, eq:rows.every(r=>Math.abs(r.left-rows[0].left)<0.5&&Math.abs(r.width-rows[0].width)<0.5), onscreen:c.left>=0&&c.right<=innerWidth&&c.bottom<=innerHeight+1}; });
    ok(lay.inside&&lay.eq&&lay.onscreen,'['+label+'] the window fits the screen, rows are one width and lined up '+JSON.stringify(lay));
    if(process.env.SHOT_DIR) await p.screenshot({path:require('path').join(process.env.SHOT_DIR,'dev-'+label.replace(/ /g,'_')+'.png')});
    await p.click('#dvModal [data-dv-out]'); await p.waitForTimeout(500);
    v=await p.evaluate(()=>{ const m=document.getElementById('dvModal'); return {n:m.querySelectorAll('.dv-row').length, msg:(m.querySelector('.dv-msg')||{}).textContent||'', btn:!!m.querySelector('[data-dv-out]')}; });
    ok(ops.some(o=>o.op==='signout_others')&&v.n===1&&/Every other device is signed out/.test(v.msg)&&!v.btn,'['+label+'] "Sign out all other devices" leaves only this device and says so');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok(await p.evaluate(()=>document.getElementById('dvModal').hidden),'['+label+'] Escape closes it');
    ok(!errs.length,'['+label+'] no script errors '+errs.join(' | ')); await p.close();
  }
  await b.close(); console.log(fails?fails+' BROKEN':'ALL OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
