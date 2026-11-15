// FTM staff area: only staff logins (confirmed email) see it and can use it; customers never see it.
// Server part runs api/v1/community.js with mocked Supabase and mail; browser part checks laptop and phone. Run: node .github/tests/staff-area.js (site on :8765)
const path=require('path'), Module=require('module'); let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const BASE=process.argv[2]||'http://localhost:8765';
(async()=>{
  process.env.SUPABASE_SERVICE_ROLE_KEY='k'; process.env.SUPABASE_URL='https://x.supabase.co';
  const files={}, mails=[], now=new Date().toISOString();
  const users={tokS:{id:'s1',email:'ftmwebnation@gmail.com',email_confirmed_at:now,created_at:now,last_sign_in_at:now},tokU:{id:'s2',email:'support@ftmwealthnation.com',created_at:now},
    tokC:{id:'c1',email:'tanaya@x.com',email_confirmed_at:now,created_at:now,user_metadata:{full_name:'Tanaya Rao'}},tokD:{id:'c2',email:'marine@x.com',email_confirmed_at:now,created_at:now}};
  const byId=id=>Object.values(users).find(u=>u.id===id);
  const fake={createClient:()=>({auth:{getUser:async t=>({data:{user:users[t]||null}}),admin:{getUserById:async id=>({data:{user:byId(id)}}),listUsers:async()=>({data:{users:Object.values(users)}})}},
    from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{products:['auto']}})})})}),
    storage:{getBucket:async()=>({error:null}),createBucket:async()=>({}),from:()=>({download:async p=>files[p]?{data:{text:async()=>files[p]}}:{error:{message:'nf'}},upload:async(p,b)=>{ files[p]=b.toString(); return {error:null}; },remove:async()=>({}),list:async()=>({data:[]})})}})};
  const orig=Module._load; Module._load=function(r,...a){ if(r==='@supabase/supabase-js') return fake; if(r==='web-push') return {setVapidDetails(){},sendNotification:async()=>({})}; return orig.call(this,r,...a); };
  const Mail=require(path.join(__dirname,'../../api/_lib/mail.js')); Mail.sendMail=async m=>{ mails.push(m); return 'test'; };
  const H=require(path.join(__dirname,'../../api/v1/community.js'));
  const call=(tok,body)=>new Promise(res=>{ const r={s:0,setHeader(){},status(c){this.s=c;return this;},json(j){res([this.s,j]);},end(){res([this.s,null]);}}; H({method:'POST',headers:{authorization:'Bearer '+tok},body:Object.assign({action:'staff'},body)},r); });
  let r=await call('tokC',{op:'check'}); ok(r[0]===403,'a customer is refused by the server (no staff area)');
  r=await call('tokU',{op:'check'}); ok(r[0]===403,'a staff address whose email is not confirmed is refused');
  r=await call('tokS',{op:'check'}); ok(r[0]===200&&r[1].staff,'the FTM mailbox login is staff');
  r=await call('tokC',{op:'email',template:'custom',emails:['marine@x.com'],subject:'x',title:'x',text:'x'}); ok(r[0]===403&&mails.length===0,'a customer cannot send emails');
  r=await call('tokC',{op:'post',text:'fake FTM news'}); ok(r[0]===403,'a customer cannot post as FTM');
  r=await call('tokS',{op:'overview'}); ok(r[0]===200&&r[1].logins===4&&r[1].new_24h===4,'overview shows logins and new sign-ups');
  r=await call('tokS',{op:'email',template:'copying_resumed',emails:'tanaya@x.com\nnobody@x.com',account:'2022'});
  ok(r[1].results[0].status==='sent'&&r[1].results[1].status==='no FTM account'&&/Hello Tanaya/.test(mails[0].html)&&/maintenance/.test(mails[0].html)&&/account 2022/.test(mails[0].html)&&/Invest today, secure tomorrow\./.test(mails[0].html),'copying-resumed email in the FTM design; unknown addresses are reported');
  r=await call('tokS',{op:'email',template:'copying_resumed',emails:['tanaya@x.com'],account:'2022'}); ok(r[1].results[0].status==='already sent in the last 12 hours'&&mails.length===1,'no double email to the same account');
  r=await call('tokS',{op:'email',template:'custom',emails:['marine@x.com'],subject:'New markets',title:'Two new markets',text:'Hello world.\n\nSecond <b>paragraph</b>.',button:'Open FTM',link:'https://www.ftmwealthnation.com/'});
  const m=mails[1]||{}; ok(r[1].results[0].status==='sent'&&m.subject==='New markets'&&/Two new markets/.test(m.html)&&!/<b>paragraph/.test(m.html)&&/Second/.test(m.html)&&/Open FTM/.test(m.html)&&/#0b1640/.test(m.html),'own message: FTM design, text escaped, button');
  r=await call('tokS',{op:'email',template:'custom',emails:['marine@x.com'],subject:'x',title:'y',text:'z',button:'Click',link:'https://evil.example/'}); ok(!/evil\.example/.test(mails[2].html),'buttons only link to the FTM website');
  r=await call('tokS',{op:'post',text:'Service update: everything is restored.',pin:true}); const P=JSON.parse(files['posts.json']).posts; ok(r[0]===200&&P.length===1&&P[0].ftm&&P[0].pin,'post appears as an official, pinned FTM post');
  // browser
  let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
  const b=await pw.chromium.launch();
  for(const [label,vp,staff] of [['laptop customer',{width:1280,height:900},false],['laptop staff',{width:1280,height:900},true],['phone staff',{width:390,height:844},true],['phone customer',{width:390,height:844},false]]){
    const p=await b.newPage({viewport:vp}); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const sent=[];
    p.on('dialog',d=>d.accept());
    await p.route('**/api/v1/**',async rt=>{ const u=new URL(rt.request().url()), pd=rt.request().postData()||'';
      if(u.pathname==='/api/v1/community'&&/"action":"staff"/.test(pd)){ const o=JSON.parse(pd); sent.push(o.op);
        if(!staff) return rt.fulfill({status:403,contentType:'application/json',body:'{"ok":false,"error":"STAFF_ONLY"}'});
        const J={check:{ok:true,staff:true},overview:{ok:true,logins:128,new_24h:3,active_24h:41,community:57,community_subscribers:40,online:6,posts:212,posts_24h:4},email:{ok:true,results:[{email:'tanaya@x.com',status:'sent'}]},post:{ok:true,posted:'p1'}}[o.op];
        return rt.fulfill({status:200,contentType:'application/json',body:JSON.stringify(J)}); }
      if(/\/customer\/accounts$/.test(u.pathname)) return rt.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"accounts":[]}'});
      return rt.fulfill({status:404,contentType:'application/json',body:'{"ok":false}'}); });
    await p.goto(BASE+'/'); await p.waitForTimeout(800);
    await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'someone@x.com',products:['auto'],name:'T'};});
    await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))).catch(()=>{}); await p.waitForTimeout(3500);
    const has=await p.evaluate(()=>!!document.querySelector('#appView .nav-staff')&&!!document.querySelector('.app-view[data-view="staff"]'));
    if(!staff){ ok(!has&&sent.join()==='check','['+label+'] customers do not see the staff area'); await p.close(); continue; }
    ok(has,'['+label+'] staff see "FTM staff" in the menu');
    await p.click('#appView .nav-staff'); await p.waitForTimeout(700);
    const v=await p.evaluate(()=>{ const s=document.querySelector('.app-view[data-view="staff"]'); const r=s.getBoundingClientRect(); return {shown:!s.hidden, tiles:s.querySelectorAll('#stfTiles>div').length, first:(s.querySelector('#stfTiles b')||{}).textContent, wide:document.documentElement.scrollWidth<=innerWidth+1, others:[...document.querySelectorAll('.app-view')].filter(x=>x!==s&&!x.hidden).length}; });
    ok(v.shown&&v.others===0&&v.tiles===8&&v.first==='128'&&v.wide,'['+label+'] staff page opens with the overview, no sideways scroll '+JSON.stringify(v));
    await p.fill('#stfTo','tanaya@x.com'); await p.fill('#stfAcct','2022'); await p.click('#stfSend'); await p.waitForTimeout(500);
    ok(/tanaya@x.com.*sent/.test(await p.textContent('#stfMailOut')),'['+label+'] Send email shows the result per customer');
    await p.selectOption('#stfTpl','custom'); ok(await p.isVisible('#stfSub'),'['+label+'] own-message fields appear');
    await p.click('#stfFill'); ok(/everything is restored/i.test(await p.inputValue('#stfPost'))&&!/Deriv/i.test(await p.inputValue('#stfPost')),'['+label+'] maintenance update fills in (no broker named)');
    await p.click('#stfPostBtn'); await p.waitForTimeout(500); ok(/Posted/.test(await p.textContent('#stfPostOut')),'['+label+'] Post publishes on FTM news');
    if(label==='phone staff') await p.screenshot({path:path.join(process.env.SHOT_DIR||'/tmp','staff-phone.png'),fullPage:false});
    if(label==='laptop staff') await p.screenshot({path:path.join(process.env.SHOT_DIR||'/tmp','staff-laptop.png'),fullPage:false});
    ok(!errs.length,'['+label+'] no script errors '+errs.join(' | '));
    await p.close();
  }
  await b.close();
  console.log(fails?'FAILED: '+fails:'STAFF AREA OK'); process.exit(fails?1:0);
})();
