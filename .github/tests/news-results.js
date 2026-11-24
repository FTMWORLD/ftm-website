// FTM news results: every day at 18:00 Berlin the FTM master account's last 24 hours (18:00 to 18:00) (like the Calendar pop-up), Fridays also the week,
// emailed to each member for THEIR OWN accounts only (never the master's),
// the 1st also last month; figures through ftm-calc.js; never twice; shown in Community For you, Following and FTM news,
// drawn as a card on laptop and phone. Run: node .github/tests/news-results.js (site on :8765)
const path=require('path'), Module=require('module'); let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const BASE=process.argv[2]||'http://localhost:8765';
(async()=>{
  process.env.SUPABASE_SERVICE_ROLE_KEY='k'; process.env.SUPABASE_URL='https://x.supabase.co';
  const files={}, now=new Date().toISOString();
  // s1 owner login (the master + its own EUR 10,000 copying account), c1 French member with her own account, e1 English member with his own account,
  // f1 free member (master preview only), i1 member whose account is switched off and has no trades, z1 engine read fails, x1 unconfirmed
  const users={tokS:{id:'s1',email:'ftmwebnation@gmail.com',email_confirmed_at:now,created_at:now},tokC:{id:'c1',email:'amelie@x.com',email_confirmed_at:now,created_at:now,user_metadata:{ftm_lang:'fr'}},
    tokE:{id:'e1',email:'ben@x.com',email_confirmed_at:now,created_at:now,user_metadata:{full_name:'Ben Okafor'}},tokF:{id:'f1',email:'free@x.com',email_confirmed_at:now,created_at:now},tokI:{id:'i1',email:'idle@x.com',email_confirmed_at:now,created_at:now},
    tokZ:{id:'z1',email:'broken@x.com',email_confirmed_at:now,created_at:now},tokX:{id:'x1',email:'typo@x.con',created_at:now}};
  const byId=id=>Object.values(users).find(u=>u.id===id);
  const fake={createClient:()=>({auth:{getUser:async t=>({data:{user:users[t]||null}}),admin:{listUsers:async()=>({data:{users:Object.values(users)}}),getUserById:async id=>({data:{user:byId(id)}})}},
    from:()=>({select:()=>({eq:(c,id)=>({maybeSingle:async()=>({data:{products:['auto']}})}),range:async()=>({data:[{id:'s1',products:['auto']},{id:'c1',products:['auto']}]})}),upsert:async()=>({})}),
    storage:{getBucket:async()=>({error:null}),createBucket:async()=>({}),from:()=>({download:async p=>files[p]?{data:{text:async()=>files[p]}}:{error:{message:'nf'}},upload:async(p,b)=>{ files[p]=b.toString(); return {error:null}; },remove:async()=>({}),list:async()=>({data:[]})})}})};
  // master: deposit 100,000 on 1 Nov; trades (UTC close times). Berlin = UTC+1 in November.
  const U=(m,d,h,mi)=>new Date(Date.UTC(2026,m,d,h,mi||0)).toISOString();
  const deals=[
    [U(10,16,16,30),1000,'BTCUSD','BUY'],   // 17:30 Berlin 16 Nov (before 18:00) -> belongs to Monday 16
    [U(10,17,1,16),533.03,'HK50','SELL'],    // 02:16 Berlin 17 Nov
    [U(10,17,1,16),1586.38,'HK50','SELL'],
    [U(10,17,11,54),-492.12,'BTCUSD','SELL'],
    [U(10,17,17,10),250,'XAUUSD','BUY'],     // 18:10 Berlin 17 Nov (after 18:00) -> Wednesday 18
    [U(10,20,9,0),-300,'XAUUSD','SELL'],     // Friday 20
    [U(10,14,10,0),400,'US500','BUY']        // Saturday 14 -> in the week Sat 14 - Fri 20
  ].sort((a,b)=>a[0].localeCompare(b[0]));
  const hist=[{type:'BALANCE',time:U(10,1,8),profit:100000,net:100000}].concat(deals.map((d,i)=>({type:d[3],entry:'OUT',ticket:'t'+i,time:d[0],profit:d[1],net:d[1],symbol:d[2]})));
  const bal=100000+deals.reduce((a,d)=>a+d[1],0);
  // each member's own accounts (deposit, deals); the master m1 is what s1 and free members see
  const own={a1:{dep:5000,deals:[[U(10,17,9,5),120.5,'EURUSD','BUY'],[U(10,17,14,40),-40.25,'XAUUSD','SELL'],[U(10,19,10,0),60,'EURUSD','BUY']]},
    a2:{dep:20000,deals:[[U(10,17,12,0),-75,'NVDA','BUY']]}, a3:{dep:1000,deals:[[U(10,3,9,0),10,'EURUSD','BUY']]}, a4:{dep:10000,deals:[[U(10,17,10,30),45,'XAUUSD','BUY']]}};
  own.m1={dep:100000,deals};
  const ACC={s1:[{account_id:'m1',view_only:true,is_master:true,currency:'USD',display_status:'ACTIVE',floating_profit:-412.5,open_positions:2,balance:102977.29,equity:102564.79},{account_id:'a4',account_number:'10000',currency:'EUR',is_trading:true,display_status:'ACTIVE'}],f1:[{account_id:'m1',preview:true,view_only:true,currency:'USD',display_status:'ACTIVE'}],
    c1:[{account_id:'m1',preview:true,view_only:true,currency:'USD',display_status:'ACTIVE'},{account_id:'a1',account_number:'51234567',currency:'USD',is_trading:true,display_status:'ACTIVE'}],
    e1:[{account_id:'a2',account_number:'70011',currency:'USD',is_trading:true,display_status:'ACTIVE'}], i1:[{account_id:'a3',account_number:'333',currency:'USD',is_trading:false,display_status:'PAUSED'}]};
  const engCalls=[];
  const engine={callEngine:async(p,o)=>{ const who=(o&&o.authSubject)||''; engCalls.push(who+' '+p);
    if(who==='z1') return {ok:false,status:502,body:{error:'down'}};
    if(/\/customer\/accounts$/.test(p)) return {ok:true,status:200,body:{ok:true,accounts:(ACC[who]||[]).map(a=>Object.assign({balance:'1',equity:'1'},a))}};
    const mm=/\/accounts\/(\w+)\/(stats|history)/.exec(p); if(!mm) return {ok:true,status:200,body:{}};
    if(!(ACC[who]||[]).some(a=>a.account_id===mm[1])) return {ok:false,status:404,body:{error:'not yours'}};
    const A=own[mm[1]], D=A.deals.slice().sort((a,b)=>a[0].localeCompare(b[0]));
    if(mm[2]==='stats'){ const H2=[{type:'BALANCE',time:U(10,1,8),profit:A.dep,net:A.dep}].concat(D.map((d,i)=>({type:d[3],entry:'OUT',ticket:mm[1]+i,time:d[0],profit:d[1],net:d[1],symbol:d[2]}))); return {ok:true,status:200,body:{ok:true,history:H2.reverse(),history_total:H2.length,deposits_total:A.dep,withdrawals_total:0}}; }
    return {ok:true,status:200,body:{ok:true,trades:D.map((d,i)=>({symbol:d[2],side:d[3],volume:'25.2',opened_at:new Date(Date.parse(d[0])-8*3600e3).toISOString(),closed_at:d[0],net_profit:String(d[1]),position_ref:mm[1]+'p'+i})),page:{offset:0,limit:200,total:D.length}}}; }};
  const orig=Module._load; Module._load=function(r,...a){ if(r==='@supabase/supabase-js') return fake; if(r==='web-push') return {setVapidDetails(){},sendNotification:async()=>({})}; if(/engineClient$/.test(r)) return engine; return orig.call(this,r,...a); };
  const fs=require('fs'), mails=[]; global.fetch=async u=>{ const m=/\/i18n\/([\w-]+)\.json$/.exec(String(u)); if(m) return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(__dirname,'../../i18n/'+m[1]+'.json'),'utf8'))}; return {ok:false,json:async()=>({})}; };
  const Mail=require(path.join(__dirname,'../../api/_lib/mail.js')); Mail.sendMail=async m=>{ mails.push(m); return 'test'; };
  const R=require(path.join(__dirname,'../../api/_lib/results.js')), Calc=require(path.join(__dirname,'../../ftm-calc.js')), admin=fake.createClient();
  const posts=()=>JSON.parse(files['posts.json']||'{"posts":[]}').posts;
  let r=await R.run(admin,{now:Date.UTC(2026,10,17,16,0)}); ok(!posts().length&&/not 18:00/.test(r.log[0]),'17:00 Berlin: nothing yet');
  r=await R.run(admin,{now:Date.UTC(2026,10,17,17,5)}); let P=posts(), c=(P[0]||{}).card||{};
  ok(P.length===1&&P[0].ftm&&c.k==='day'&&c.date==='2026-11-17','18:05 Berlin Tuesday: the last 24 hours are posted on FTM news '+JSON.stringify(r.log));
  ok(c.n===3&&c.rows.map(x=>x.pl).join()==='533.03,1586.38,-492.12','the day runs 18:00 to 18:00 Berlin: a trade at 17:30 the day before and one at 18:10 are not in it ('+c.rows.map(x=>x.pl).join()+')');
  const netExp=+(533.03+1586.38-492.12).toFixed(2); ok(c.net===netExp,'net P&L = the day\'s closed trades '+c.net);
  { const before=100000+1000+400; let f=1, b=before; [533.03,1586.38,-492.12].forEach(v=>{ f*=1+v/b; b+=v; }); ok(Math.abs(c.pct-(f-1)*100)<0.0001,'day % is time-weighted like the Calendar ('+c.pct.toFixed(4)+'%)'); }
  ok(/Tuesday, 17 November 2026: 3 trades closed, net \+\$1,627\.29/.test(P[0].x),'a short text for share links: '+P[0].x);
  r=await R.run(admin,{now:Date.UTC(2026,10,17,17,40)}); ok(posts().length===1,'never posted twice');
  { const fr=JSON.parse(fs.readFileSync(path.join(__dirname,'../../i18n/fr.json'),'utf8'));
    let mm=await R.mail(admin,{deadline:Date.now()+30000}), calls=1; while(mm.more&&calls<6){ mm=await R.mail(admin,{deadline:Date.now()+30000,chain:true}); calls++; }
    const mem=()=>mails.filter(m=>!/^Copy of /.test(m.subject)), to=x=>mem().filter(m=>m.to===x), one=x=>to(x)[0]||{}, copies=mails.filter(m=>/^Copy of /.test(m.subject));
    ok(!mm.more&&calls===3,'an engine read that fails is retried, then skipped after 3 tries ('+calls+' calls) '+JSON.stringify(mm.log));
    ok(mem().length===5&&to('amelie@x.com').length===1&&to('ben@x.com').length===1&&to('free@x.com').length===1,'emails: members get their own account; a free member gets the FTM master account ('+mem().map(m=>m.to).join(', ')+')');
    { const fo=to('ftmwebnation@gmail.com'), ms=fo.find(m=>/FTM master account/.test(m.html)), o4=fo.find(m=>/ · 10000 · /.test(m.subject));
      ok(fo.length===2&&ms&&/HK50/.test(ms.html)&&/\+\$1,627\.29/.test(ms.subject)&&/open=community/.test(ms.html)&&o4&&/XAUUSD/.test(o4.html)&&/€/.test(o4.subject),'the FTM owner email gets the master account and its own 10,000 account, nothing else ('+fo.map(m=>m.subject).join(' | ')+')');
      ok(!copies.length&&!fo.some(m=>/51234567|70011|amelie|ben@/.test(m.subject+m.html)),'the FTM owner email never gets a customer\'s result'); }
    { const fr0=one('free@x.com'); ok(/FTM master account/.test(fr0.html||'')&&/\+\$1,627\.29/.test(fr0.subject||'')&&/HK50/.test(fr0.html||'')&&!/51234567|70011|10000/.test((fr0.subject||'')+(fr0.html||'')),'a free member gets the FTM master account\'s daily result, never a customer\'s account ('+fr0.subject+')'); }
    ok(!to('idle@x.com').length,'a switched-off account with no trades that day gets no email');
    ok(!to('typo@x.con').length&&!to('broken@x.com').length,'unconfirmed login and failed engine read: no email');
    ok(engCalls.filter(c=>/^c1 /.test(c)&&/\/m1\//.test(c)).length===0,'the master history is never read for a member email');
    const ben=one('ben@x.com'), bh=ben.html||'';
    ok(/^Last 24 hours: Tuesday,? 17 November 2026 · 70011 · -\$75\.00 \(-0\.38%\)$/.test(ben.subject),'email subject = his own account and figures: '+ben.subject);
    ok(/Ben Okafor · 70011/.test(bh)&&/color:#E3B62F;font-size:19px;font-weight:bold;text-align:left;"><span class="gm-s"><span class="gm-d">Daily result</.test(bh)&&(bh.match(/background-image:linear-gradient\(#0b1640,#0b1640\)/g)||[]).length>=4&&/color-scheme" content="light only/.test(bh)&&!/font-size:26px;font-weight:bold;color:#0b1640;margin:0 0 16px;">Daily result/.test(bh)&&/NVDA/.test(bh)&&/-\$75\.00/.test(bh)&&!/HK50/.test(bh)&&!/FTM master account/.test(bh)&&/open=calendar/.test(bh)&&/Invest today, secure tomorrow\./.test(bh)&&/email-logo\.png/.test(bh),'email: his name and account number, the title in the navy header on the left and the FTM logo on the right, navy areas locked against phone dark mode, his own trades and net P&L, not the master; link to his Calendar; FTM footer and logo');
    ok(/display:none;max-height:0[^>]*>[^<]*One trade closed this day\.[^<]*NVDA Buy/.test(bh),'the preview line under the subject says something new (window, trades, markets), not the subject again');
    const am=one('amelie@x.com'), ah=am.html||'';
    { let f=1,b=5000; [120.5,-40.25].forEach(v=>{ f*=1+v/b; b+=v; }); const pc='+'+((f-1)*100).toFixed(2)+'%';
      ok(am.subject.indexOf(fr['Last 24 hours'])!==-1&&am.subject.indexOf('51234567')!==-1&&am.subject.indexOf(pc)!==-1&&ah.indexOf(fr['Your account'])!==-1&&ah.indexOf(fr['{} trades closed this day.'].replace('{}','2'))!==-1&&/mardi/i.test(ah)&&/EURUSD/.test(ah)&&!/HK50/.test(ah),'the French member gets her own account in French, time-weighted '+pc+': '+am.subject); }
    const nAll=mails.length; mm=await R.mail(admin,{deadline:Date.now()+30000}); ok(mails.length===nAll,'nobody gets the same result email twice'); }
  r=await R.run(admin,{now:Date.UTC(2026,10,18,0,30)}); ok(posts().length===1,'a late run after midnight does not post the next day early');
  r=await R.run(admin,{now:Date.UTC(2026,10,20,22,0)}); { const n0=mails.length; let mm=await R.mail(admin,{deadline:Date.now()-1}); ok(mm.more&&mails.length===n0,'out of time: emails continue on the next call');
    let m2=await R.mail(admin,{deadline:Date.now()+30000}); ok(/already being sent/.test(m2.log.join())&&mails.length===n0,'a second job while emails are going out sends nothing');
    for(let k=0;k<5&&mm.more;k++) mm=await R.mail(admin,{deadline:Date.now()+30000,chain:true});
    const nw=mails.slice(n0), am=nw.filter(m=>m.to==='amelie@x.com'), bn=nw.filter(m=>m.to==='ben@x.com');
    ok(!mm.more&&nw.length===10&&nw.filter(m=>m.to==='ftmwebnation@gmail.com').length===4&&nw.filter(m=>m.to==='free@x.com'&&/FTM master account/.test(m.html)).length===2&&am.length===2&&bn.length===2&&am.some(m=>m.subject.indexOf('51234567')!==-1&&/Résultat hebdomadaire/.test(m.subject)),'Friday: each member gets their own day and week, a free member the master\'s ('+nw.map(m=>m.to.split('@')[0]+':'+m.subject.slice(6,30)).join(' | ')+')'); }
    { const bw=mails.filter(m=>m.to==='ben@x.com'&&/Weekly result/.test(m.subject)).slice(-1)[0]||{}, h=bw.html||'';
      ok(/By market/.test(h)&&/Winning trades/.test(h)&&/Markets traded/.test(h)&&/NVDA/.test(h)&&/Won/.test(h)&&!/<td[^>]*>Monday/.test(h)&&!/Opened/.test(h),'Friday: the weekly email is a summary (result, trades, winning trades, markets traded, by market), not every trade'); }
  P=posts(); const wk=(P.find(x=>x.res==='week-2026-11-20')||{}).card||{};
  ok(P.length===3&&P.some(x=>x.res==='day-2026-11-20')&&wk.k==='week'&&wk.from==='2026-11-14'&&wk.to==='2026-11-20','Friday: the day and the week (Saturday 14 to Friday 20)');
  ok(wk.n===7&&wk.days.length===5&&wk.days[0].date==='2026-11-14'&&wk.days.find(x=>x.date==='2026-11-18').n===1,'the week lists every day with trades ('+wk.days.map(x=>x.date.slice(8)+':'+x.n).join(' ')+')');
  r=await R.run(admin,{now:Date.UTC(2026,10,29,22,0)}); ok(!posts().some(x=>x.res==='month-2026-11'),'29 November: no month yet');
  r=await R.run(admin,{now:Date.UTC(2026,10,30,22,0)}); P=posts(); const mo=(P.find(x=>x.res==='month-2026-11')||{}).card||{};
  ok(mo.k==='month'&&mo.n===7&&mo.from==='2026-11-01'&&mo.to==='2026-11-30'&&mo.best&&mo.worst&&mo.win!=null,'30 November 18:00 (last day of the month): the month is posted '+JSON.stringify({n:mo.n,win:mo.win,best:mo.best&&mo.best.date,worst:mo.worst&&mo.worst.date}));
  { const n0=mails.length; let mm=await R.mail(admin,{deadline:Date.now()+30000,chain:true}); for(let k=0;k<5&&mm.more;k++) mm=await R.mail(admin,{deadline:Date.now()+30000,chain:true});
    const ms=mails.slice(n0).filter(m=>/Monthly statement|Relevé mensuel/.test(m.subject)), b=ms.find(m=>m.to==='ben@x.com')||{}, h=b.html||'';
    ok(ms.some(m=>m.to==='free@x.com'&&/FTM master account/.test(m.html)),'a free member also gets the FTM master account\'s monthly statement');
    ok(ms.length>=3&&ms.some(m=>m.to==='amelie@x.com'&&/Relevé mensuel/.test(m.subject))&&/Monthly statement: November 2026 · 70011/.test(b.subject||''),'every member with an account gets the monthly statement in their language ('+ms.map(m=>m.to.split('@')[0]).join(', ')+')');
    ok(/Opening balance/.test(h)&&/\$20,000\.00/.test(h)&&/Closing balance/.test(h)&&/\$19,925\.00/.test(h)&&/Trading result/.test(h)&&/-\$75\.00/.test(h)&&/Highest balance/.test(h)&&/Lowest balance/.test(h),'the statement email has opening and closing balance, trading result, highest and lowest balance (his own figures)');
    ok((h.match(/background:#D4AF37;border-radius:3px 3px 0 0/g)||[]).length>=13&&/Lowest balance.{0,300}\$19,925\.00/.test(h)&&/open=statement&amp;from=2026-11-01&amp;to=2026-11-30|open=statement&from=2026-11-01&to=2026-11-30/.test(h)&&/Download your statement \(PDF\)/.test(h),'a day-by-day balance chart (30 days) and a button that opens the PDF statement for November'); }
  if(process.env.SHOT_DIR){ const L2=m=>mails.filter(x=>x.to==='ben@x.com'&&m.test(x.subject)).slice(-1)[0]; fs.writeFileSync(path.join(process.env.SHOT_DIR,'mail-week.html'),(L2(/Weekly/)||{}).html||''); fs.writeFileSync(path.join(process.env.SHOT_DIR,'mail-month.html'),(L2(/Monthly statement/)||{}).html||''); }
  { const n0=mails.length; let sm=await R.samples(admin); const S2=mails.slice(n0);
    ok(S2.length===4&&S2.every(m=>m.to==='ftmwebnation@gmail.com'&&/^SAMPLE · /.test(m.subject))&&S2.filter(m=>/Weekly result/.test(m.subject)).length===2&&S2.filter(m=>/Monthly statement|Monthly result/.test(m.subject)).length===2,'samples: the owner gets the weekly summary and the monthly statement of the master and his own account, nobody else ('+S2.map(m=>m.subject.slice(9,40)).join(' | ')+')');
    sm=await R.samples(admin); ok(mails.length===n0+4&&/less than 10 minutes/.test(sm.log.join()),'samples are sent at most once per 10 minutes'); }
  r=await R.run(admin,{now:Date.UTC(2027,6,2,16,5)}); ok(posts().some(x=>x.res==='day-2027-07-02')&&posts().some(x=>x.res==='week-2027-07-02'),'summer time: posted at 16:05 UTC = 18:05 Berlin');
  // Community: the result posts show in For you, Following and FTM news, with the card
  const CH=require(path.join(__dirname,'../../api/v1/community.js'));
  const call=(tok,body)=>new Promise(res=>{ const r={s:0,setHeader(){},status(c){this.s=c;return this;},json(j){res([this.s,j]);},end(){res([this.s,null]);}}; CH({method:'POST',headers:{authorization:'Bearer '+tok},body},r); });
  await call('tokC',{action:'me'}).catch(()=>{});
  for(const sc of ['all','following','ftm']){ const f=await call('tokC',{action:'feed',scope:sc}); const L=(f[1]&&f[1].posts)||[]; ok(f[0]===200&&L.filter(x=>x.card&&x.author&&x.author.ftm).length===Math.min(30,posts().length),'feed "'+sc+'": every result post is there with its card ('+L.length+')'); }
  { // dayresult (social posts): the month so far day by day, the same time-weighted % as the day card (losing-day month slide)
    const g=await new Promise(res=>{ const r={s:0,setHeader(){},status(c){this.s=c;return this;},json(j){res([this.s,j]);},end(){res([this.s,null]);}}; CH({method:'GET',headers:{},query:{dayresult:'2026-11-17'}},r); });
    const cal=(g[1]&&g[1].cal)||[], d17=cal.find(x=>x.date==='2026-11-17')||{}, d16=cal.find(x=>x.date==='2026-11-16')||{};
    ok(g[0]===200&&cal.length===17&&cal[0].date==='2026-11-01','dayresult: the month so far, one entry per day ('+cal.length+')');
    ok(d17.n===4&&d16.n===1&&cal.filter(x=>x.n).length===3,'dayresult: the month calendar keeps calendar days (midnight to midnight, like the client-area Calendar); the 18:00 result is the day card ('+JSON.stringify(d17)+')'); }
  { // a day not posted yet (tomorrow, so it never clashes with the days posted above): hidden from the public (the social job waits for the 23:00 post), shown to the owner with &preview=1
    const today=new Date(Date.now()+864e5+3600e3).toISOString().slice(0,10), GQ=q=>new Promise(res=>{ const r={s:0,h:{},setHeader(k,v){this.h[k]=v;},status(c){this.s=c;return this;},json(j){res([this.s,j,this.h]);},end(){res([this.s,null,this.h]);}}; CH({method:'GET',headers:{},query:q},r); });
    const a=await GQ({dayresult:today}), b2=await GQ({dayresult:today,preview:'1'});
    ok(a[0]===404&&a[1].error==='NOT_POSTED_YET','dayresult: a day not posted yet is not public ('+JSON.stringify(a.slice(0,2)).slice(0,160)+')');
    ok(b2[0]===200&&b2[1].date===today&&b2[2]['Cache-Control']==='no-store','dayresult preview: the day so far from the engine, never cached ('+JSON.stringify(b2).slice(0,200)+')');
    const fl=b2[1].floating; ok(fl&&isFinite(fl.pl)&&(fl.pct===null||isFinite(fl.pct))&&Number.isInteger(fl.n),'dayresult: the open trades (floating P/L, % of balance, count) come with the day ('+JSON.stringify(fl)+')');
    ok(fl&&fl.pl===-412.5&&fl.n===2&&Math.abs(fl.pct-(-412.5/102977.29*100))<0.006,'dayresult: floating % = floating P/L / balance');
    ok(a[1].floating===undefined,'dayresult: nothing about open trades leaks while the day is not public'); }
  // browser: the card in the feed
  let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
  const b=await pw.chromium.launch(); const day=P.find(x=>x.res==='day-2026-11-17'), ftmPosts=[mo,wk,day.card].map((cd,i)=>({id:'r'+i,author:{mid:'s',nickname:'FTM',ftm:true},text:'x'+i,card:cd,imgs:[],t:new Date(Date.now()-i*6e4).toISOString(),likes:0,comments:[],tags:[]}));
  for(const [label,vp] of [['laptop',{width:1280,height:900}],['phone',{width:390,height:844}],['small phone',{width:360,height:740}]]){
    const p=await b.newPage({viewport:vp}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.route('**/api/v1/**',async rt=>{ const u=new URL(rt.request().url()), pd=rt.request().postData()||''; const J=o=>rt.fulfill({status:200,contentType:'application/json',body:JSON.stringify(o)});
      if(u.pathname==='/api/v1/community'){ const o=JSON.parse(pd||'{}'); if(o.action==='feed') return J({ok:true,posts:ftmPosts,more:false}); if(o.action==='me') return J({ok:true,profile:{nickname:'amelie',visible:true},paid:true,mid:'c1'}); return J({ok:true,items:[],members:[],threads:[],tags:[]}); }
      if(/\/customer\/accounts$/.test(u.pathname)) return J({ok:true,accounts:[]}); return J({ok:true}); });
    await p.goto(BASE+'/'); await p.waitForTimeout(800);
    await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'amelie@x.com',products:['auto'],name:'A'};});
    await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))).catch(()=>{}); await p.waitForTimeout(2500);
    await p.evaluate(()=>{ FTM.showView('community'); const t=document.querySelector('button[data-tab="feed"]'); if(t) t.click(); if(FTM.feedLoad) FTM.feedLoad(true); }); await p.waitForTimeout(1500);
    const v=await p.evaluate(()=>{ const cs=[...document.querySelectorAll('#fdList .rc')]; const W=document.documentElement.clientWidth; const po=document.querySelector('#fdList .fd-post'), pr=po?Math.round(po.getBoundingClientRect().right):0, li=Math.round(document.getElementById('fdList').getBoundingClientRect().right); return {pr, li, n:cs.length, k:cs.map(c=>c.className), day:(document.querySelector('.rc-day')||{}).innerText||'', txt:document.querySelectorAll('#fdList .fd-text').length, over:cs.filter(c=>c.getBoundingClientRect().right>W+1).map(c=>Math.round(c.getBoundingClientRect().right)+'/'+c.className), sw:document.documentElement.scrollWidth, W}; });
    ok(v.n===3&&/rc-month/.test(v.k[0])&&/rc-week/.test(v.k[1])&&/rc-day/.test(v.k[2])&&v.txt===0,'['+label+'] the feed draws the month, week and day cards (no raw text)');
    ok(/Daily result/i.test(v.day)&&/Tuesday,? 17 November 2026/.test(v.day)&&/3 trades closed this day\./.test(v.day)&&/HK50/.test(v.day)&&/\+\$1,627\.29/.test(v.day)&&/Net P&L/i.test(v.day),'['+label+'] day card: date, trades, net P&L and % like the Calendar');
    ok(!v.over.length&&v.sw<=v.W,'['+label+'] the cards fit the screen '+JSON.stringify({over:v.over,sw:v.sw,W:v.W,post:v.pr,list:v.li}));
    if(process.env.SHOT_DIR){ const el=await p.$('.rc-day'); await el.scrollIntoViewIfNeeded(); await el.screenshot({path:path.join(process.env.SHOT_DIR,'rc-day-'+label.replace(/ /g,'_')+'.png')}); const e2=await p.$('.rc-week'); await e2.screenshot({path:path.join(process.env.SHOT_DIR,'rc-week-'+label.replace(/ /g,'_')+'.png')}); const e3=await p.$('.rc-month'); await e3.screenshot({path:path.join(process.env.SHOT_DIR,'rc-month-'+label.replace(/ /g,'_')+'.png')}); }
    ok(!errs.length,'['+label+'] no script errors '+errs.join(' | ')); await p.close();
  }
  await b.close(); console.log(fails?fails+' BROKEN':'ALL OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
