// FTM staff area: only staff logins (confirmed email) see it and can use it; customers never see it.
// Server part runs api/v1/community.js with mocked Supabase and mail; browser part checks laptop and phone. Run: node .github/tests/staff-area.js (site on :8765)
const path=require('path'), Module=require('module'); let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const BASE=process.argv[2]||'http://localhost:8765';
(async()=>{
  process.env.SUPABASE_SERVICE_ROLE_KEY='k'; process.env.SUPABASE_URL='https://x.supabase.co';
  const files={}, mails=[], now=new Date().toISOString();
  const users={tokS:{id:'s1',email:'ftmwebnation@gmail.com',email_confirmed_at:now,created_at:now,last_sign_in_at:now},tokU:{id:'s2',email:'support@ftmwealthnation.com',created_at:now},
    tokC:{id:'c1',email:'tanaya@x.com',email_confirmed_at:now,created_at:now,user_metadata:{full_name:'Tanaya Rao'}},tokD:{id:'c2',email:'marine@x.com',email_confirmed_at:now,created_at:now},tokH:{id:'h1',email:'helper@x.com',email_confirmed_at:now,created_at:now,last_sign_in_at:now}};
  const byId=id=>Object.values(users).find(u=>u.id===id);
  const prof={s1:['auto'],c1:['auto'],c2:['auto']};
  const engine={callEngine:async(path,o)=>{ if(/\/customer\/accounts$/.test(path)) return {ok:true,status:200,body:{ok:true,accounts:o.authSubject==='c1'?[{account_id:'a1',account_number:'2022',name:'DERIV',currency:'USD',balance:'500',equity:'512.5',floating_profit:'12.5',open_positions:1,display_status:'ACTIVE',is_trading:true,risk_tier:'GROWTH',trade_mode:'REAL'},{account_id:'a2',account_number:'4701',name:'DERIV',currency:'USD',balance:'500',equity:'500',display_status:'ACTION_REQUIRED',status_reason:'LOGIN_FAILED',status_text:'Check your password'},{account_id:'f7a',view_only:true,preview:true,display_status:'PAUSED'}]:[]}};
    if(/billing\/status$/.test(path)) return {ok:true,status:200,body:{status:o.authSubject==='s1'?'EXEMPT':'ACTIVE',period_end:new Date(Date.now()+5*864e5).toISOString()}};
    if(/customer\/me$/.test(path)) return {ok:true,status:200,body:{client_id:'FTM-'+o.authSubject.toUpperCase()+'-000000'}};
    if(/\/stats$/.test(path)) return {ok:true,status:200,body:{stats:{growth_pct:2.5,win_rate:60,history:[1,2]}}};
    return {ok:true,status:200,body:{}}; }};
  const fake={createClient:()=>({auth:{getUser:async t=>({data:{user:users[t]||null}}),admin:{getUserById:async id=>({data:{user:byId(id)}}),updateUserById:async(id,o)=>{ Object.assign(byId(id),o); return {data:{},error:null}; },listUsers:async()=>({data:{users:Object.values(users)}})}},
    from:()=>({select:()=>({eq:(c,id)=>({maybeSingle:async()=>({data:{products:prof[id]||[]}})}),range:async()=>({data:Object.keys(prof).map(id=>({id,products:prof[id]}))})}),upsert:async o=>{ prof[o.id]=o.products; return {}; }}),
    storage:{getBucket:async()=>({error:null}),createBucket:async()=>({}),from:()=>({download:async p=>files[p]?{data:{text:async()=>files[p]}}:{error:{message:'nf'}},upload:async(p,b)=>{ files[p]=b.toString(); return {error:null}; },remove:async()=>({}),list:async()=>({data:[]})})}})};
  const orig=Module._load; Module._load=function(r,...a){ if(r==='@supabase/supabase-js') return fake; if(r==='web-push') return {setVapidDetails(){},sendNotification:async()=>({})}; if(/_lib\/engineClient$/.test(r)) return engine; return orig.call(this,r,...a); };
  const Mail=require(path.join(__dirname,'../../api/_lib/mail.js')); Mail.sendMail=async m=>{ mails.push(m); return 'test'; };
  const H=require(path.join(__dirname,'../../api/v1/community.js'));
  const call=(tok,body)=>new Promise(res=>{ const r={s:0,setHeader(){},status(c){this.s=c;return this;},json(j){res([this.s,j]);},end(){res([this.s,null]);}}; H({method:'POST',headers:{authorization:'Bearer '+tok},body:Object.assign({action:'staff'},body)},r); });
  let r=await call('tokC',{op:'check'}); ok(r[0]===403,'a customer is refused by the server (no staff area)');
  r=await call('tokU',{op:'check'}); ok(r[0]===403,'a staff address whose email is not confirmed is refused');
  r=await call('tokS',{op:'check'}); ok(r[0]===200&&r[1].staff,'the FTM mailbox login is staff');
  r=await call('tokC',{op:'email',template:'custom',emails:['marine@x.com'],subject:'x',title:'x',text:'x'}); ok(r[0]===403&&mails.length===0,'a customer cannot send emails');
  r=await call('tokC',{op:'post',text:'fake FTM news'}); ok(r[0]===403,'a customer cannot post as FTM');
  r=await call('tokS',{op:'overview'}); ok(r[0]===200&&r[1].logins===5&&r[1].new_24h===5,'overview shows logins and new sign-ups');
  r=await call('tokS',{op:'email',template:'copying_resumed',emails:'tanaya@x.com\nnobody@x.com',account:'2022'});
  ok(r[1].results[0].status==='sent'&&r[1].results[1].status==='no FTM account'&&/Hello Tanaya/.test(mails[0].html)&&/maintenance/.test(mails[0].html)&&/account 2022/.test(mails[0].html)&&/Invest today, secure tomorrow\./.test(mails[0].html),'copying-resumed email in the FTM design; unknown addresses are reported');
  r=await call('tokS',{op:'email',template:'copying_resumed',emails:['tanaya@x.com'],account:'2022'}); ok(r[1].results[0].status==='already sent in the last 12 hours'&&mails.length===1,'no double email to the same account');
  r=await call('tokS',{op:'email',template:'custom',emails:['marine@x.com'],subject:'New markets',title:'Two new markets',text:'Hello world.\n\nSecond <b>paragraph</b>.',button:'Open FTM',link:'https://www.ftmwealthnation.com/'});
  const m=mails[1]||{}; ok(r[1].results[0].status==='sent'&&m.subject==='New markets'&&/Two new markets/.test(m.html)&&!/<b>paragraph/.test(m.html)&&/Second/.test(m.html)&&/Open FTM/.test(m.html)&&/#0b1640/.test(m.html),'own message: FTM design, text escaped, button');
  r=await call('tokS',{op:'email',template:'custom',emails:['marine@x.com'],subject:'x',title:'y',text:'z',button:'Click',link:'https://evil.example/'}); ok(!/evil\.example/.test(mails[2].html),'buttons only link to the FTM website');
  r=await call('tokS',{op:'post',text:'Service update: everything is restored.',pin:true}); const P=JSON.parse(files['posts.json']).posts; ok(r[0]===200&&P.length===1&&P[0].ftm&&P[0].pin,'post appears as an official, pinned FTM post');
  const SH=require(path.join(__dirname,'../../api/v1/staff.js'));
  const sc=(tok,body)=>new Promise(res=>{ const r={s:0,setHeader(){},status(c){this.s=c;return this;},json(j){res([this.s,j]);},end(){res([this.s,null]);}}; SH({method:'POST',headers:{authorization:'Bearer '+tok},body},r); });
  r=await sc('tokC',{op:'dashboard'}); ok(r[0]===403,'staff console: customers are refused');
  r=await sc('tokS',{op:'dashboard',force:true}); const d=r[1]||{};
  users.tokH.created_at=now;
  ok(r[0]===200&&d.stats.paying===3&&d.stats.accounts===2&&d.stats.trading===1&&d.money.USD&&d.money.USD.equity===1012.5,'board: paying customers, connected accounts (master preview left out), money under copy '+JSON.stringify(d.stats&&{p:d.stats.paying,a:d.stats.accounts}));
  ok(d.days.length===30&&d.days[29].signups===5,'board: sign-ups per day for 30 days');
  ok(!(d.problems||[]).some(x=>x.kind==='billing'),'billing EXEMPT (FTM house accounts) is not a problem');
  const kinds=(d.problems||[]).map(x=>x.kind).sort().join(',');
  ok(/account/.test(kinds)&&/renewal/.test(kinds)&&(d.problems||[]).some(x=>x.kind==='account'&&/4701/.test(x.title)),'problems: account needing attention and plans ending soon are found ('+kinds+')');
  r=await sc('tokS',{op:'lookup',q:'4701'}); ok(r[0]===200&&r[1].customer.email==='tanaya@x.com'&&r[1].customer.client_id==='FTM-C1-000000','lookup by account number');
  r=await sc('tokS',{op:'lookup',q:'FTM-C1-000000'}); ok(r[0]===200&&r[1].customer.email==='tanaya@x.com','lookup by client ID');
  r=await sc('tokS',{op:'lookup',q:'TANAYA@x.com'}); const c=r[1].customer; ok(r[0]===200&&c.accounts.length===3&&c.billing.status==='ACTIVE'&&c.name==='Tanaya Rao','lookup by email: accounts, billing, name');
  r=await sc('tokS',{op:'account_stats',uid:'c1',account_id:'a1'}); ok(r[0]===200&&r[1].stats.growth_pct===2.5&&!('history' in r[1].stats),'full statistics of one account');
  r=await sc('tokS',{op:'act',uid:'c1',do:'signout_all'}); ok(r[0]===200&&users.tokC.app_metadata&&users.tokC.app_metadata.ftm_revoked_at,'sign out every device');
  r=await sc('tokS',{op:'act',uid:'c2',do:'email',subject:'Hi',title:'Hello',text:'Body'}); ok(r[0]===200&&mails[mails.length-1].to==='marine@x.com','email one customer');
  r=await sc('tokS',{op:'broadcast',segment:'paying',channel:'email',dry:true}); ok(r[1].count===3,'group count: paying customers');
  const before=mails.length; r=await sc('tokS',{op:'broadcast',segment:'paying',channel:'email',subject:'News',title:'Big news',text:'Hello all'}); ok(r[1].left===0&&mails.length-before===3,'group email sent to every paying customer');
  r=await sc('tokS',{op:'broadcast',segment:'paying',channel:'email',subject:'News',title:'Big news',text:'Hello all',id:r[1].id}); ok(mails.length-before===3,'resuming a finished group send sends nothing twice');
  // team and roles
  r=await sc('tokH',{op:'dashboard'}); ok(r[0]===403,'team: someone not on the team is refused');
  r=await sc('tokS',{op:'team_add',email:'helper@x.com',role:'support',name:'Ada'}); ok(r[0]===200&&/support/.test(r[1].message)&&/staff console/.test(mails[mails.length-1].subject),'team: the owner adds a support member, who gets an email');
  r=await call('tokH',{op:'check'}); ok(r[0]===200&&r[1].role==='support','team: the new member is recognised as support');
  r=await sc('tokH',{op:'dashboard'}); ok(r[0]===200&&r[1].payments===null,'support: sees the board but not payments');
  r=await sc('tokH',{op:'broadcast',segment:'paying',channel:'email',dry:true}); ok(r[0]===403,'support: no group sends');
  r=await call('tokH',{op:'post',text:'x'}); ok(r[0]===403,'support: no FTM news posts');
  r=await sc('tokH',{op:'team'}); ok(r[0]===403,'support: cannot see or change the team');
  r=await sc('tokS',{op:'team_add',email:'ftmwebnation@gmail.com',role:'support'}); ok(r[1].error==='FIXED_OWNER','team: the FTM mailbox owner can never be removed or demoted');
  r=await sc('tokS',{op:'team_role',email:'helper@x.com',role:'staff'}); r=await sc('tokH',{op:'broadcast',segment:'paying',channel:'email',dry:true}); ok(r[0]===200,'team: promoted to staff, group tools open');
  r=await sc('tokS',{op:'team'}); ok(r[1].members.some(m=>m.email==='ftmwebnation@gmail.com'&&m.fixed)&&r[1].members.some(m=>m.email==='helper@x.com'&&m.role==='staff'&&m.name==='Ada'),'team: list shows permanent owner and members');
  r=await sc('tokS',{op:'team_remove',email:'helper@x.com'}); ok(r[0]===200&&users.tokH.app_metadata&&users.tokH.app_metadata.ftm_revoked_at,'team: removing a member signs them out');
  r=await call('tokH',{op:'check'}); ok(r[0]===403,'team: a removed member has no access');
  r=await sc('tokS',{op:'log'}); ok(r[1].items.length>=3&&r[1].items[0].by==='ftmwebnation@gmail.com','every staff action is in the activity log');
  // browser
  let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
  const b=await pw.chromium.launch();
  const DASH={ok:true,at:new Date().toISOString(),crawl_ms:2100,stats:{customers:128,paying:41,investors:2,free:85,new_1d:3,new_7d:19,new_30d:60,active_1d:44,active_7d:90,paying_with_account:38,accounts:52,trading:47,open_positions:31,real:40,demo:12,community:57,online:6,posts_7d:14,conversion:32},
    days:Array.from({length:30},(_,i)=>({d:new Date(Date.now()-(29-i)*864e5).toISOString().slice(0,10),signups:i%5,logins:i%7})),money:{USD:{balance:1234567.89,equity:1240000.5,floating:5432.1,accounts:40},EUR:{balance:20000,equity:20100,floating:100,accounts:12}},
    by_status:{ACTIVE:47,ACTION_REQUIRED:3,PAUSED:2},by_tier:{GROWTH:30,BALANCED:15,CONSERVATIVE:7},by_broker:{DERIV:50,Exness:2},payments:{mtd:{EUR:12495},d30:{EUR:18990},d90:{EUR:40900},count30:9,plans:{Annual:12,'5 Years':4,Lifetime:2},recent:[{at:new Date().toISOString(),email:'tanaya@x.com',plan:'Annual',amount:499,currency:'EUR'}]},
    accounts:[{email:'tanaya@x.com',uid:'c1',number:'2022',broker:'DERIV',mode:'REAL',currency:'USD',balance:500,equity:512.5,floating:12.5,open:1,status:'ACTIVE',tier:'GROWTH'},{email:'marine@x.com',uid:'c2',number:'4701',broker:'DERIV',mode:'REAL',currency:'USD',balance:500,equity:500,floating:0,open:0,status:'ACTION_REQUIRED',tier:'BALANCED'}],
    problems:[{sev:3,kind:'account',uid:'c2',email:'marine@x.com',title:'Account 4701: Check your password',detail:'LOGIN_FAILED',fix:'lookup'},{sev:2,kind:'no_account',uid:'c3',email:'new@x.com',title:'Paid, but no trading account connected',detail:'Customer since 2026-11-01',fix:'email_connect'}]};
  const CUST={ok:true,customer:{uid:'c1',email:'tanaya@x.com',name:'Tanaya Rao',created:'2026-10-01T00:00:00Z',last_login:new Date().toISOString(),confirmed:true,products:['auto'],client_id:'FTM-0DDE-4EC966',kyc:{country:'IN',full_name:'Tanaya Rao'},billing:{status:'ACTIVE',period_end:'2027-10-01T00:00:00Z'},
    accounts:[{id:'a1',number:'2022',broker:'DERIV',server:'DerivSVG-Server-02',mode:'REAL',currency:'USD',balance:500,equity:512.5,floating:12.5,open:1,status:'ACTIVE',tier:'GROWTH',validated:new Date().toISOString()}],leaderboard:{nickname:'Tanaya',opted_in:true},community:{nickname:'Tanaya',visible:true},push:{devices:2,prefs:{messages:true,trades:false}},devices:[{name:'Chrome on Windows',place:'Lagos, Nigeria',last:new Date().toISOString()}],signed_out_at:null,payments:[{at:'2026-10-01T00:00:00Z',amount:499,currency:'EUR',paid:'paid'}]}};
  for(const [label,vp,staff] of [['laptop customer',{width:1280,height:900},false],['laptop staff',{width:1280,height:900},true],['phone staff',{width:390,height:844},true],['small phone staff',{width:360,height:740},true],['phone support',{width:390,height:844},'support'],['phone customer',{width:390,height:844},false]]){
    const p=await b.newPage({viewport:vp}); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const sent=[];
    p.on('dialog',d=>d.accept());
    await p.route('**/api/v1/**',async rt=>{ const u=new URL(rt.request().url()), pd=rt.request().postData()||'';
      const J=(st,o)=>rt.fulfill({status:st,contentType:'application/json',body:JSON.stringify(o)});
      if(u.pathname==='/api/v1/community'&&/"action":"staff"/.test(pd)){ const o=JSON.parse(pd); sent.push('c:'+o.op); if(!staff) return J(403,{ok:false,error:'STAFF_ONLY'});
        return J(200,{check:{ok:true,staff:true,role:staff==='support'?'support':'owner'},email:{ok:true,results:[{email:'tanaya@x.com',status:'sent'}]},post:{ok:true,posted:'p1'}}[o.op]); }
      if(u.pathname==='/api/v1/staff'){ const o=JSON.parse(pd); sent.push('s:'+o.op+(o.do?':'+o.do:'')); if(!staff) return J(403,{ok:false,error:'STAFF_ONLY'});
        if(o.op==='dashboard') return J(200,DASH); if(o.op==='lookup') return J(200,CUST); if(o.op==='account_stats') return J(200,{ok:true,stats:{growth_pct:2.5,win_rate:60}});
        if(o.op==='act') return J(200,{ok:true,message:'Done for test.'}); if(o.op==='broadcast') return J(200,o.dry?{ok:true,count:41}:{ok:true,id:'abc123',total:41,sent:41,failed:0,left:0}); if(o.op==='team') return J(200,{ok:true,me:'ftmwebnation@gmail.com',members:[{email:'ftmwebnation@gmail.com',role:'owner',fixed:true,has_login:true,confirmed:true},{email:'ada@x.com',name:'Ada',role:'support',has_login:false}]}); if(o.op==='team_add') return J(200,{ok:true,message:o.email+' was added as '+o.role+'.'}); if(o.op==='log') return J(200,{ok:true,items:[{at:new Date().toISOString(),by:'ftmwebnation@gmail.com',op:'signout_all',target:'tanaya@x.com',detail:'Signed out'}]}); }
      if(u.pathname==='/api/v1/status') return J(200,{ok:true,services:[{name:'Supabase',ok:true,ms:120,detail:null},{name:'Emails',ok:false,ms:300,detail:'mailbox not set'}]});
      if(u.pathname==='/api/v1/fx') return J(200,{ok:true,base:'USD',rates:{USD:1,EUR:0.9}});
      if(/\/customer\/accounts$/.test(u.pathname)) return J(200,{ok:true,accounts:[]});
      return J(404,{ok:false}); });
    await p.goto(BASE+'/'); await p.waitForTimeout(800);
    await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'someone@x.com',products:['auto'],name:'T'};});
    await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))).catch(()=>{}); await p.waitForTimeout(3500);
    const has=await p.evaluate(()=>!!document.querySelector('#appView .nav-staff')&&!!document.querySelector('.app-view[data-view="staff"]'));
    if(!staff){ ok(!has&&sent.join()==='c:check','['+label+'] customers do not see the staff area'); await p.close(); continue; }
    ok(has,'['+label+'] staff see "FTM staff" in the menu');
    await p.click('#appView .nav-staff'); await p.waitForTimeout(900);
    if(staff==='support'){ const sv=await p.evaluate(()=>({team:!!document.querySelector('.stf-tabs [data-t="team"]'),cards:document.querySelectorAll('[data-p="messages"] .app-card').length,badge:document.querySelector('.stf-badge').innerText}));
      ok(!sv.team&&sv.cards===1&&/Support/i.test(sv.badge),'['+label+'] support: no Team tab, no group send or FTM post '+JSON.stringify(sv)); ok(!errs.length,'['+label+'] no script errors '+errs.join(' | ')); await p.close(); continue; }
    await p.click('.stf-tabs [data-t="team"]'); await p.waitForTimeout(500);
    ok(await p.evaluate(()=>document.querySelectorAll('.stf-team tbody tr').length===2&&/permanent/.test(document.querySelector('.stf-team').innerText)&&!!document.querySelector('.stf-team select')),'['+label+'] Team: members listed, the FTM owner is permanent, roles can be changed');
    await p.fill('#stfTE','new@x.com'); await p.selectOption('#stfTR','staff'); await p.click('#stfTAdd'); await p.waitForTimeout(500); ok(/new@x.com was added as staff/.test(await p.textContent('#stfTOut')),'['+label+'] Team: add a staff member');
    ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'['+label+'] Team: no sideways scroll');
    await p.click('.stf-tabs [data-t="board"]'); await p.waitForTimeout(300);
    const wide=()=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
    const v=await p.evaluate(()=>{ const s=document.querySelector('.app-view[data-view="staff"]'); const hero=[...s.querySelectorAll('.stf-hero>div')].map(d=>d.innerText.replace(/\s+/g,' ')); const over=[...s.querySelectorAll('.stf-hero b')].filter(b=>b.scrollWidth>b.clientWidth+2).length; return {shown:!s.hidden, hero, over, cols:s.querySelectorAll('.stf-col[data-tip]').length, tiles:s.querySelectorAll('.stf-tiles:not(.stf-t3)>div').length, pb:(s.querySelector('#stfPbN')||{}).textContent, bars:s.querySelectorAll('.stf-bar').length}; });
    ok(v.shown&&v.hero.length===4&&/41/.test(v.hero[0])&&/EUR 1,136,100\.45/.test(v.hero[1])&&/12,495/.test(v.hero[2])&&v.cols===30&&v.tiles===16&&v.pb==='2'&&v.bars>=8&&v.over===0,'['+label+'] Board: headline figures (money under copy in EUR), 30-day chart with hover, breakdowns, figures fit '+JSON.stringify(v));
    ok(await wide(),'['+label+'] Board: no sideways scroll');
    await p.click('.stf-tabs [data-t="problems"]'); await p.waitForTimeout(300);
    ok(await p.evaluate(()=>document.querySelectorAll('.stf-pb').length===2&&/Email: connect your account/.test(document.querySelector('.stf-pbs').innerText)),'['+label+'] Problems: each problem with its fix button');
    await p.click('.stf-pb button[data-f="tpl:connect"]'); await p.waitForTimeout(400); ok(sent.includes('s:act:email'),'['+label+'] a problem is fixed with one click (email sent)');
    await p.click('.stf-tabs [data-t="accounts"]'); await p.waitForTimeout(300);
    await p.fill('#stfAF','4701'); await p.waitForTimeout(200); ok(await p.evaluate(()=>document.querySelectorAll('.stf-acc tbody tr').length===1),'['+label+'] Accounts: search filters the list');
    await p.click('.stf-acc tbody tr'); await p.waitForTimeout(500);
    const cv=await p.evaluate(()=>{ const c=document.querySelector('.stf-cust'); return c?{t:c.innerText.slice(0,2000),acts:c.querySelectorAll('[data-a="act"]').length}:null; });
    ok(cv&&/FTM-0DDE-4EC966/.test(cv.t)&&/Chrome on Windows/.test(cv.t)&&/DerivSVG-Server-02/.test(cv.t)&&cv.acts>=8,'['+label+'] clicking an account opens the customer: login, plan, payments, accounts, devices, fixes');
    ok(await wide(),'['+label+'] Customer view: no sideways scroll');
    await p.click('.stf-cust [data-a="astats"]'); await p.waitForTimeout(400); ok(/growth pct/i.test(await p.evaluate(()=>document.querySelector('.stf-astats').innerText)),'['+label+'] full account statistics open');
    await p.click('.stf-cust [data-do="signout_all"]'); await p.waitForTimeout(400); ok(/Done for test/.test(await p.textContent('#stfActOut')),'['+label+'] fix buttons work (sign out every device)');
    await p.click('.stf-tabs [data-t="messages"]'); await p.waitForTimeout(500); ok(/41 customers/.test(await p.textContent('#stfCount')),'['+label+'] Messages: group size shown before sending');
    await p.selectOption('#stfBT','maint'); await p.click('#stfBGo'); await p.waitForTimeout(500); ok(/Done\. 41 sent/.test(await p.textContent('#stfBOut')),'['+label+'] group email sent with progress');
    await p.fill('#stfTo','tanaya@x.com'); await p.click('#stfSend'); await p.waitForTimeout(400); ok(/tanaya@x.com.*sent/.test(await p.textContent('#stfMailOut')),'['+label+'] listed customers email');
    await p.click('#stfFill'); ok(/everything is restored/i.test(await p.inputValue('#stfPost'))&&!/Deriv/i.test(await p.inputValue('#stfPost')),'['+label+'] maintenance update fills in (no broker named)');
    await p.click('#stfPostBtn'); await p.waitForTimeout(400); ok(/Posted/.test(await p.textContent('#stfPostOut')),'['+label+'] Post publishes on FTM news');
    ok(await wide(),'['+label+'] Messages: no sideways scroll');
    await p.click('.stf-tabs [data-t="health"]'); await p.waitForTimeout(500); ok(await p.evaluate(()=>document.querySelectorAll('.stf-hl>div').length===2&&!!document.querySelector('.stf-hl .bad')),'['+label+'] Health: every service with problems in red');
    await p.click('.stf-tabs [data-t="activity"]'); await p.waitForTimeout(500); ok(/signout all/.test(await p.evaluate(()=>document.querySelector('[data-p="activity"]').innerText)),'['+label+'] Activity: staff actions listed');
    if(process.env.SHOT_DIR){ for(const t of ['board','customers']){ await p.click('.stf-tabs [data-t="'+t+'"]'); await p.waitForTimeout(300); const h=await p.evaluate(()=>{ const sc=document.querySelector('.app-view[data-view="staff"] .stf-main'); return Math.min(6000,Math.ceil(sc.getBoundingClientRect().height)+200); }); await p.setViewportSize({width:vp.width,height:h}); await p.waitForTimeout(300); await p.screenshot({path:path.join(process.env.SHOT_DIR,'staff-'+label.replace(/ /g,'_')+'-'+t+'.png')}); await p.setViewportSize(vp); } }
    ok(!errs.length,'['+label+'] no script errors '+errs.join(' | '));
    await p.close();
  }
  await b.close();
  console.log(fails?'FAILED: '+fails:'STAFF AREA OK'); process.exit(fails?1:0);
})();
