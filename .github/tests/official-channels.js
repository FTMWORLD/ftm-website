// "Is it really FTM?" (footer > Fraud prevention, and Customer support > Fraud prevention in the client area): FTM's official
// website, email addresses and social media accounts in one window, two safety rules and a way to report a fake.
// Laptop, phone and small phone, English and one translated language. Run: node .github/tests/official-channels.js (site on :8765)
const {chromium}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();
let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const BASE=process.argv[2]||'http://localhost:8765';
(async()=>{
  const b=await chromium.launch();
  for(const [label,vp] of [['laptop',{width:1440,height:900}],['phone',{width:390,height:844}],['small phone',{width:360,height:740}]]){
    const p=await b.newPage({viewport:vp}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
    await p.route('**/api/v1/**',r=>{ const u=r.request().url(), J=o=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(o)});
      if(/\/customer\/accounts(\?|$)/.test(u)) return J({ok:true,accounts:[]}); return J({ok:true}); });
    await p.goto(BASE+'/'); await p.waitForTimeout(800);
    const foot=await p.evaluate(()=>{ const a=[...document.querySelectorAll('footer a')].find(x=>x.textContent.trim()==='Fraud prevention'); return a?{href:a.getAttribute('href'),cls:a.className}:null; });
    ok(foot&&foot.href==='#official'&&/js-official/.test(foot.cls),'['+label+'] footer "Fraud prevention" opens the official channels window '+JSON.stringify(foot));
    await p.evaluate(()=>{ const a=document.querySelector('footer a.js-official'), u=a.closest('ul'); if(getComputedStyle(u).display==='none'){ const h=u.previousElementSibling; h.scrollIntoView(); h.click(); } });
    await p.waitForTimeout(300); await p.evaluate(()=>document.querySelector('footer a.js-official').click()); await p.waitForTimeout(400);
    const v=await p.evaluate(()=>{ const m=document.getElementById('ofModal'); if(!m) return null; const c=m.querySelector('.ss-card').getBoundingClientRect(), W=document.documentElement.clientWidth;
      const kids=[...m.querySelectorAll('.of-row,.of-hero,.of-safe,.of-help,.of-soc a,.of-help .btn')].map(e=>e.getBoundingClientRect());
      const rows=[...m.querySelectorAll('.of-row')].map(r=>r.getBoundingClientRect());
      return {open:!m.hidden, txt:m.innerText, socials:[...m.querySelectorAll('.of-soc a')].map(a=>a.href), rules:m.querySelectorAll('.of-safe li').length,
        fit:c.left>=0&&c.right<=W+0.5&&kids.every(k=>k.left>=c.left-0.5&&k.right<=c.right+0.5)&&document.documentElement.scrollWidth<=W,
        eq:rows.every(r=>Math.abs(r.left-rows[0].left)<0.5&&Math.abs(r.width-rows[0].width)<0.5), help:!!m.querySelector('.of-help .um-live')}; });
    ok(v&&v.open,'['+label+'] the window opens');
    ok(v&&/Is it really FTM\?/.test(v.txt)&&/www\.ftmwealthnation\.com/.test(v.txt)&&/@ftmwealthnation\.com/.test(v.txt)&&/ftmwebnation@gmail\.com/.test(v.txt),'['+label+'] it names the official website and email addresses');
    const foots=await p.evaluate(()=>[...document.querySelectorAll('footer .socials a')].map(a=>a.href));
    ok(v&&v.socials.length===5&&v.socials.every(h=>foots.includes(h)),'['+label+'] the five social media accounts are the same links as in the footer');
    ok(v&&v.rules===2&&/Never share your passwords or login codes/.test(v.txt)&&v.help,'['+label+'] two safety rules and a "Chat with FTM support" button to report a fake');
    ok(v&&!/guarantee|promise|trader/i.test(v.txt),'['+label+'] no promise or "traders" wording');
    ok(v&&v.fit&&v.eq,'['+label+'] fits the screen, rows one width and lined up');
    if(process.env.SHOT_DIR) await p.screenshot({path:require('path').join(process.env.SHOT_DIR,'official-'+label.replace(/ /g,'_')+'.png')});
    await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok(await p.evaluate(()=>document.getElementById('ofModal').hidden&&!document.body.classList.contains('ss-lock')),'['+label+'] Escape closes it');
    // client area: Customer support > Fraud prevention
    await p.evaluate(()=>{ const F=FTM; F.auth.getAccessToken=()=>Promise.resolve('tok'); F.session={email:'a@x.com',products:['auto'],name:'A'}; });
    await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))).catch(()=>{}); await p.waitForTimeout(1200);
    await p.evaluate(()=>{ const m=[...document.querySelectorAll('.um-btn')].find(x=>x.offsetParent); if(m) m.click(); }); await p.waitForTimeout(200);
    await p.evaluate(()=>{ const s=[...document.querySelectorAll('.um-sup')].find(x=>x.offsetParent); if(s) s.click(); }); await p.waitForTimeout(200);
    const inMenu=await p.evaluate(()=>{ const o=[...document.querySelectorAll('.um-sub .js-official')].find(x=>x.offsetParent); if(!o) return false; o.click(); return true; }); await p.waitForTimeout(400);
    ok(inMenu&&await p.evaluate(()=>!document.getElementById('ofModal').hidden),'['+label+'] client area: Customer support > Fraud prevention opens it');
    await p.click('#ofModal .ss-x'); await p.waitForTimeout(200); ok(await p.evaluate(()=>document.getElementById('ofModal').hidden),'['+label+'] the close button closes it');
    ok(!errs.length,'['+label+'] no script errors '+errs.join(' | ')); await p.close();
  }
  // a translated language
  const p=await b.newPage({viewport:{width:390,height:844}}); await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
  await p.goto(BASE+'/?lang=de'); await p.waitForTimeout(400);
  await p.evaluate(()=>{ try{ localStorage.setItem('ftm_lang','de'); }catch(e){} if(window.I18NE&&I18NE.set) return I18NE.set('de'); }).catch(()=>{}); await p.waitForTimeout(1500);
  await p.evaluate(()=>FTM.openOfficial()); await p.waitForTimeout(300); const de=await p.evaluate(()=>document.getElementById('ofModal').innerText);
  ok(/Ist das wirklich FTM\?/.test(de)&&/Bleiben Sie sicher/.test(de),'German: the window is translated');
  await b.close(); console.log(fails?fails+' BROKEN':'ALL OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
