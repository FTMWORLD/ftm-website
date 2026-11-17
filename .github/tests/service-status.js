// Public Service status page: the hourly watchdog records each check per day (90 days); the page shows every FTM service,
// its uptime and a 90-day bar with a tip per day, on laptop and phone; opening it never re-runs the checks; no details leak.
// Run: node .github/tests/service-status.js (site on :8765)
const path=require('path'), Module=require('module'); let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const BASE=process.argv[2]||'http://localhost:8765';
(async()=>{
  process.env.SUPABASE_SERVICE_ROLE_KEY='k'; process.env.SUPABASE_URL='https://x.supabase.co';
  const files={};
  const fake={createClient:()=>({auth:{admin:{listUsers:async()=>({data:{users:[]}})}},from:()=>({select:()=>({limit:async()=>({data:[],error:null}),range:async()=>({data:[],error:null})})}),
    storage:{getBucket:async()=>({error:null}),createBucket:async()=>({}),from:()=>({download:async p=>files[p]?{data:{text:async()=>files[p]}}:{error:{message:'nf'}},upload:async(p,b)=>{ files[p]=b.toString(); return {error:null}; },remove:async()=>({}),list:async()=>({data:[]})})}})};
  const orig=Module._load; Module._load=function(r,...a){ if(r==='@supabase/supabase-js') return fake; if(r==='web-push') return {setVapidDetails(){},sendNotification:async()=>({})}; return orig.call(this,r,...a); };
  let fetches=0; global.fetch=async u=>{ fetches++; if(/performance\.html/.test(String(u))) return {ok:false,status:500,text:async()=>'',json:async()=>({})}; return {ok:true,status:200,text:async()=>'<html>FTM</html>',json:async()=>({ok:true})}; };
  const H=require(path.join(__dirname,'../../api/v1/status.js'));
  const call=q=>new Promise(res=>{ const r={s:0,h:{},setHeader(k,v){this.h[k]=v;},status(c){this.s=c;return this;},json(j){res([this.s,j,this.h]);}}; H({method:'GET',query:q,headers:{}},r); });
  await call({alert:'1'}); await call({alert:'1'});
  const hist=JSON.parse(files['status/history.json']||'{}'), d=new Date().toISOString().slice(0,10);
  ok(hist.days&&hist.days[d]&&hist.days[d].n===2&&hist.days[d].bad.web===2&&hist.last&&hist.last.comp.web===false,'each hourly watchdog run is recorded for the day (web had a problem twice) '+JSON.stringify(hist.days&&hist.days[d]));
  const f0=fetches; let r=await call({history:'1'}); const j=r[1];
  ok(r[0]===200&&fetches===f0,'opening the status page does not run the checks again');
  ok(j.days.length===90&&j.days[89].d===d&&j.days[89].n===2&&j.components.join()==='web,login,engine,email,pay,ask','90 days, today last, six services');
  ok(!/supabase|stripe|anthropic|gmail|mailbox|detail/i.test(JSON.stringify(j)),'no internal names or details are public');
  // 90 days kept, older dropped
  hist.days['2020-01-01']={n:5,bad:{}}; for(let i=0;i<95;i++){ hist.days[new Date(Date.now()-(i+1)*864e5).toISOString().slice(0,10)]={n:24,bad:i===3?{engine:1}:{}}; } files['status/history.json']=JSON.stringify(hist);
  await call({alert:'1'}); ok(Object.keys(JSON.parse(files['status/history.json']).days).length===90,'only the last 90 days are kept');
  // browser
  let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
  const b=await pw.chromium.launch(), days=Array.from({length:90},(_,i)=>({d:new Date(Date.now()-(89-i)*864e5).toISOString().slice(0,10),n:i<5?0:24,bad:i===80?{engine:1}:(i===85?{pay:5}:{})}));
  for(const [label,vp,down] of [['laptop',{width:1280,height:900},false],['phone',{width:390,height:844},true],['small phone',{width:360,height:740},false]]){
    const p=await b.newPage({viewport:vp}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.route('**/api/v1/status?history=1',rt=>rt.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,last:{t:new Date().toISOString(),comp:{web:true,login:true,engine:!down,email:true,pay:true,ask:true}},components:['web','login','engine','email','pay','ask'],days})}));
    await p.goto(BASE+'/'); await p.waitForTimeout(800);
    await p.evaluate(()=>{ const a=document.querySelector('a.js-status'), u=a.closest('ul'); if(getComputedStyle(u).display==='none'){ const h=u.previousElementSibling; h.scrollIntoView(); h.click(); } }); await p.waitForTimeout(300); await p.click('a.js-status'); await p.waitForTimeout(700);
    const v=await p.evaluate(()=>{ const m=document.getElementById('ssModal'), c=m.querySelector('.ss-card').getBoundingClientRect(), W=document.documentElement.clientWidth; return {vis:!m.hidden, rows:m.querySelectorAll('.ss-row').length, bars:m.querySelectorAll('.ss-row:first-child .ss-bars i').length, hero:m.querySelector('.ss-hero').innerText, eng:[...m.querySelectorAll('.ss-row')][2].innerText, tips:[...m.querySelectorAll('.ss-row:nth-child(3) .ss-bars i')].map(i=>i.getAttribute('data-tip')), fit:c.left>=0&&c.right<=W+1, W}; });
    ok(v.vis&&v.rows===6&&v.bars===90,'['+label+'] footer link opens Service status: six services, 90 days each');
    ok(down?/Some FTM services have a problem/.test(v.hero):/All FTM services are running\./.test(v.hero),'['+label+'] headline says whether everything is running');
    ok(/FTM MACHINE engine/.test(v.eng)&&/99\.95% uptime/.test(v.eng),'['+label+'] uptime per service from the hourly checks: '+v.eng.replace(/\n/g,' '));
    ok(/: 1 checks with a problem$/.test(v.tips[80])&&/: No problems found$/.test(v.tips[81])&&/: Not checked$/.test(v.tips[0]),'['+label+'] every day explains itself on hover/tap');
    ok(v.fit,'['+label+'] fits the screen');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok(await p.evaluate(()=>document.getElementById('ssModal').hidden),'['+label+'] closes with Escape');
    if(process.env.SHOT_DIR){ await p.evaluate(()=>FTM.openStatus()); await p.waitForTimeout(500); await p.screenshot({path:path.join(process.env.SHOT_DIR,'status-'+label.replace(/ /g,'_')+'.png')}); }
    ok(!errs.length,'['+label+'] no script errors '+errs.join(' | ')); await p.close();
  }
  await b.close(); console.log(fails?fails+' BROKEN':'ALL OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
