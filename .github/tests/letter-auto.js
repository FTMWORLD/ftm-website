// The automatic monthly Letter: written on the 1st from the engine's master account through ftm-calc.js (the dashboards'
// own calculation), owners get a preview, it goes out on the 2nd to every member once, in their language, then FTM news and
// phone notification. Unsafe or wrong text falls back to the plain text. Run: node .github/tests/letter-auto.js
const path=require('path'), Module=require('module'); let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
(async()=>{
  process.env.SUPABASE_SERVICE_ROLE_KEY='k'; process.env.SUPABASE_URL='https://x.supabase.co'; process.env.ANTHROPIC_API_KEY='test';
  const files={}, mails=[], pushes=[], now=new Date().toISOString(); let aiText=null, writes=0;
  const users={s1:{id:'s1',email:'ftmwebnation@gmail.com',email_confirmed_at:now,created_at:now},c1:{id:'c1',email:'amelie@x.com',email_confirmed_at:now,created_at:now,user_metadata:{full_name:'Amélie Roux',ftm_lang:'fr'}},
    c2:{id:'c2',email:'jo@x.com',email_confirmed_at:now,created_at:now},c3:{id:'c3',email:'typo@x.con',created_at:now}};
  const fake={createClient:()=>({auth:{admin:{listUsers:async()=>({data:{users:Object.values(users)}}),getUserById:async id=>({data:{user:users[id]}})}},
    storage:{getBucket:async()=>({error:null}),createBucket:async()=>({}),from:()=>({download:async p=>files[p]?{data:{text:async()=>files[p]}}:{error:{message:'nf'}},upload:async(p,b)=>{ files[p]=b.toString(); return {error:null}; },remove:async()=>({}),list:async()=>({data:[]})})}})};
  const T=(d)=>new Date(Date.UTC(2026,d[0],d[1],d[2]||12)).toISOString();
  // master: deposit 10,000 (1 Oct); Oct +200; Nov +510 then -107.10  =>  Nov = 1.05*0.99-1 = +3.95%, since 1 Jan = 1.02*1.05*0.99-1 = +6.0290%
  const deals=[[T([9,5]),200],[T([10,10]),510],[T([10,20]),-107.1]];
  const hist=[{type:'BALANCE',time:T([9,1,8]),profit:10000,net:10000}].concat(deals.map((d,i)=>({type:'SELL',entry:'OUT',ticket:'t'+i,time:d[0],profit:d[1],net:d[1]})));
  const engine={callEngine:async(p,o)=>{ if(/\/customer\/accounts$/.test(p)) return {ok:true,status:200,body:{ok:true,accounts:[{account_id:'m1',preview:true,view_only:true,currency:'USD',balance:'10602.9',equity:'10602.9',display_status:'ACTIVE'}]}};
    if(/\/m1\/stats/.test(p)) return {ok:true,status:200,body:{ok:true,history:hist.slice().reverse(),history_total:hist.length,deposits_total:10000,withdrawals_total:0}};
    if(/\/m1\/history/.test(p)) return {ok:true,status:200,body:{ok:true,trades:deals.map((d,i)=>({symbol:'XAUUSD',side:'BUY',volume:'1',opened_at:new Date(Date.parse(d[0])-3600e3).toISOString(),closed_at:d[0],net_profit:String(d[1]),position_ref:'p'+i})),page:{offset:0,limit:200,total:3}}};
    return {ok:false,status:404,body:{error:'NF'}}; }};
  class FakeAnthropic{ constructor(){ this.beta={messages:{create:async o=>{
    if(/You translate/.test(o.system)){ const src=JSON.parse(o.messages[0].content), out={}; Object.keys(src).forEach(k=>{ out[k]='FR:'+src[k]; }); return {content:[{type:'text',text:JSON.stringify(out)}]}; }
    writes++; return {content:[{type:'text',text:JSON.stringify(aiText)}]}; }}}; } }
  const orig=Module._load; Module._load=function(r,...a){ if(r==='@supabase/supabase-js') return fake; if(r==='@anthropic-ai/sdk') return FakeAnthropic; if(r==='web-push') return {setVapidDetails(){},sendNotification:async()=>({})}; if(/engineClient$/.test(r)) return engine; return orig.call(this,r,...a); };
  const Mail=require(path.join(__dirname,'../../api/_lib/mail.js')); Mail.sendMail=async m=>{ mails.push(m); return 'test'; };
  const Pu=require(path.join(__dirname,'../../api/_lib/push.js')); Pu.send=async o=>{ pushes.push(o.uid); return 0; };
  const Auto=require(path.join(__dirname,'../../api/_lib/letterAuto.js')), Letter=require(path.join(__dirname,'../../api/_lib/letter.js'));
  const admin=fake.createClient(), dec1=Date.UTC(2026,11,1,9,23), dec2=Date.UTC(2026,11,2,9,23);
  // 1. the AI puts in a figure that is not the engine's: the plain text is used instead
  aiText={title:'November: a strong month',intro:'A calm month.',did:'The account made +12.00% in November.',changed:'',next:'More soon.'};
  let r=await Auto.run(admin,{now:dec1,deadline:Date.now()+30000}); let ix=JSON.parse(files['letters/index.json']), L=JSON.parse(files['letters/'+ix.items[0].id+'.json']);
  ok(ix.items.length===1&&L.month==='2026-11'&&L.status==='scheduled'&&L.auto,'1 Dec: November\'s letter is written automatically '+JSON.stringify(r.log));
  ok(Math.abs(L.figs.month_pct-3.95)<0.0001&&Math.abs(L.figs.ytd_pct-6.029)<0.0001&&L.figs.trades===2&&L.figs.win_pct===50,'figures come from the engine through the dashboards\' calculation: '+L.figs.month_pct+'% month, '+L.figs.ytd_pct+'% since 1 January, '+L.figs.trades+' trades, '+L.figs.win_pct+'% in profit');
  ok(/\+3\.95%/.test(L.did)&&!/12\.00/.test(JSON.stringify(L)),'a figure the engine did not give is never sent (plain text used)');
  ok(/Free accounts can now see the leaderboard/.test(L.changed),'what changed comes from data/changes.json for that month');
  ok(L.send_at===new Date(Date.UTC(2026,11,2,9)).toISOString(),'scheduled for 2 Dec 09:00 UTC');
  ok(mails.length===1&&mails[0].to==='ftmwebnation@gmail.com'&&/^Preview: Letter from FTM: November 2026/.test(mails[0].subject),'owners get a preview by email, members get nothing yet');
  r=await Auto.run(admin,{now:dec1+3600e3,deadline:Date.now()+30000}); ok(JSON.parse(files['letters/index.json']).items.length===1&&mails.length===1,'running again the same day writes nothing twice');
  { const before=JSON.stringify(files['letters/index.json']); const r2=await Auto.run(admin,{now:Date.UTC(2026,10,20,9),deadline:Date.now()+30000}); ok(JSON.stringify(files['letters/index.json'])===before,'mid-month (20 Nov, no October letter) nothing is written: only in the first week of a month'); }
  // 2. good AI text is used; unsafe words are not
  
  aiText={title:'November in profit',intro:'November was steady.',did:'FTM MACHINE closed 2 trades and the month ended at +3.95%. Since 1 January the account is at +6.03%.',changed:'',next:'We keep going.'};
  let w=await Auto.writeText(L.figs,'2026-11',[]); ok(w.title==='November in profit','well-written text with the engine\'s figures is used');
  aiText=Object.assign({},aiText,{next:'We guarantee more profit next month.'}); w=await Auto.writeText(L.figs,'2026-11',[]); ok(w.title!=='November in profit','a promise or guarantee is never sent (plain text used)');
  aiText=Object.assign({},aiText,{next:'Thank you, traders.'}); w=await Auto.writeText(L.figs,'2026-11',[]); ok(w.title!=='November in profit','"traders" is never sent');
  // 3. 2 Dec: sent to every confirmed member once, in their language; FTM news; phone notifications
  mails.length=0; r=await Auto.run(admin,{now:dec2,deadline:Date.now()+30000}); L=JSON.parse(files['letters/'+ix.items[0].id+'.json']);
  const to=e=>mails.find(m=>m.to===e)||{};
  ok(L.status==='sent'&&mails.length===3&&!mails.some(m=>m.to==='typo@x.con'),'2 Dec: sent to the 3 confirmed logins (not to an unconfirmed address) '+JSON.stringify(r.log));
  ok(/^FR:/.test(to('amelie@x.com').subject)&&/^Letter from FTM: November 2026$/.test(to('jo@x.com').subject),'each member in their own language');
  ok(/\+3\.95%/.test(to('jo@x.com').html)&&/Invest today, secure tomorrow\./.test(to('jo@x.com').html),'the email carries the figures and the FTM footer');
  const posts=JSON.parse(files['posts.json']||'{"posts":[]}').posts; ok(posts.length===1&&posts[0].ftm&&/Letter from FTM · November 2026/.test(posts[0].x),'posted on FTM news in Community');
  ok(pushes.length===3,'phone notification to every member (sent where phones allow it)');
  mails.length=0; r=await Auto.run(admin,{now:dec2+86400e3,deadline:Date.now()+30000}); ok(mails.length===0&&JSON.parse(files['posts.json']).posts.length===1,'nobody gets it twice, no second post');
  // 4. hold, staff drafts, and running out of time
  for(const k of Object.keys(files)) delete files[k]; mails.length=0;
  await Auto.run(admin,{now:Date.UTC(2027,0,1,9),deadline:Date.now()+30000}); ix=JSON.parse(files['letters/index.json']); L=JSON.parse(files['letters/'+ix.items[0].id+'.json']); L.held=true; await Letter.save(admin,L); mails.length=0;
  await Auto.run(admin,{now:Date.UTC(2027,0,2,10),deadline:Date.now()+30000}); ok(mails.length===0,'a held letter is not sent');
  for(const k of Object.keys(files)) delete files[k]; mails.length=0;
  await Letter.save(admin,{id:'staffdraft1',month:'2027-01',title:'January, by Gospel',intro:'Hello.',status:'draft',v:1,figs:{},updated:now,by:'ftmwebnation@gmail.com'});
  await Auto.run(admin,{now:Date.UTC(2027,1,1,9),deadline:Date.now()+30000}); ix=JSON.parse(files['letters/index.json']);
  ok(ix.items.length===1&&ix.items[0].id==='staffdraft1'&&ix.items[0].status==='scheduled','a letter staff wrote for the month is sent instead of a new one');
  r=await Auto.run(admin,{now:Date.UTC(2027,1,2,10),deadline:Date.now()-1}); ok(r.more&&mails.length===0,'out of time: it stops and continues on the next call');
  r=await Auto.run(admin,{now:Date.UTC(2027,1,2,10),deadline:Date.now()+30000}); ok(!r.more&&mails.length===3&&/January, by Gospel/.test(mails[0].html),'the next call finishes the send');
  console.log(fails?fails+' BROKEN':'ALL OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
