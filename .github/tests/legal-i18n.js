// Terms and Privacy in every language: legal-i18n.js translates the pages from i18n/legal/<code>.json,
// shows the "English applies" note, a language picker, right-to-left for Arabic, and English on request.
// Run: node .github/tests/legal-i18n.js (site on :8765)
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
const fs=require('fs'), path=require('path'); const BASE=process.argv[2]||'http://localhost:8765'; let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const LANGS=Object.keys(JSON.parse(fs.readFileSync(path.join(__dirname,'../../legal-i18n.js'),'utf8').match(/langs=(\{[^}]*\})/)[1])).filter(c=>c!=='en');
ok(LANGS.length===49&&LANGS.every(c=>fs.existsSync(path.join(__dirname,'../../i18n/legal/'+c+'.json'))),'a Terms and Privacy translation file exists for all 49 languages');
(async()=>{ const b=await pw.chromium.launch();
  for(const [pg,h] of [['terms.html','#s1 h2'],['privacy.html','section[id] h2']]){
    for(const [code,w] of [['fr',1280],['ar',390],['ja',360]]){
      const p=await b.newPage({viewport:{width:w,height:800}}); await p.goto(BASE+'/'+pg+'?lang='+code); await p.waitForFunction(()=>document.getElementById('lgNote'),null,{timeout:8000}).catch(()=>{});
      const r=await p.evaluate(h=>({ note:!!document.getElementById('lgNote'), dir:document.documentElement.dir, lang:document.documentElement.lang, h:(document.querySelector(h)||{}).textContent||'', title:document.title, opts:document.querySelectorAll('#lgSel option').length, sel:(document.getElementById('lgSel')||{}).value, sw:document.documentElement.scrollWidth<=innerWidth }),h);
      ok(r.note&&r.lang===code&&r.sel===code&&r.opts===50&&!/(Acceptance of these Terms|Who we are)/.test(r.h)&&!/^(Terms|Privacy)/.test(r.title)&&(code==='ar'?r.dir==='rtl':r.dir==='ltr')&&r.sw, pg+' '+code+' at '+w+'px: translated page, title, note, picker, direction, no sideways scroll ('+r.h.trim().slice(0,40)+')');
      if(code==='fr'){ await p.click('#lgNote a'); await p.waitForTimeout(300); const e=await p.evaluate(h=>({h:document.querySelector(h).textContent, note:!!document.getElementById('lgNote'), dir:document.documentElement.dir}),h); ok(/^(1\. |\d+\. )?[A-Z]/.test(e.h.trim())&&!e.note&&e.dir==='ltr', pg+': "Read in English" brings back the English text ('+e.h.trim().slice(0,30)+')'); }
      await p.close();
    }
  }
  const q=await b.newPage({viewport:{width:1280,height:800}}); await q.addInitScript(()=>{ try{ localStorage.setItem('ftm-lang','de'); localStorage.setItem('ftm-lang-manual','1'); }catch(e){} }); await q.goto(BASE+'/terms.html'); await q.waitForTimeout(1200);
  ok(await q.evaluate(()=>document.documentElement.lang==='de'&&!!document.getElementById('lgNote')),'terms.html follows the language chosen on the homepage');
  await q.selectOption('#lgSel','en'); await q.waitForTimeout(300);
  ok(await q.evaluate(()=>document.documentElement.lang==='en'&&!document.getElementById('lgNote')&&localStorage.getItem('ftm-lang')==='en'),'the picker switches back to English and remembers it');
  await q.close(); await b.close();
  console.log(fails?'FAILED: '+fails:'LEGAL I18N OK'); process.exit(fails?1:0); })();
