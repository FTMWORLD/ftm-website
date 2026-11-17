// FTM news results: every day at 23:00 Berlin the FTM master account's day (like the Calendar pop-up), Fridays also the week,
// the 1st also last month; figures through ftm-calc.js; never twice; shown in Community For you, Following and FTM news,
// drawn as a card on laptop and phone. Run: node .github/tests/news-results.js (site on :8765)
const path=require('path'), Module=require('module'); let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const BASE=process.argv[2]||'http://localhost:8765';
(async()=>{
  process.env.SUPABASE_SERVICE_ROLE_KEY='k'; process.env.SUPABASE_URL='https://x.supabase.co';
  const files={}, now=new Date().toISOString();
  const users={tokS:{id:'s1',email:'ftmwebnation@gmail.com',email_confirmed_at:now,created_at:now},tokC:{id:'c1',email:'amelie@x.com',email_confirmed_at:now,created_at:now,user_metadata:{ftm_lang:'fr'}},tokX:{id:'x1',email:'typo@x.con',created_at:now}};
  const byId=id=>Object.values(users).find(u=>u.id===id);
  const fake={createClient:()=>({auth:{getUser:async t=>({data:{user:users[t]||null}}),admin:{listUsers:async()=>({data:{users:Object.values(users)}}),getUserById:async id=>({data:{user:byId(id)}})}},
    from:()=>({select:()=>({eq:(c,id)=>({maybeSingle:async()=>({data:{products:['auto']}})}),range:async()=>({data:[{id:'s1',products:['auto']},{id:'c1',products:['auto']}]})}),upsert:async()=>({})}),
    storage:{getBucket:async()=>({error:null}),createBucket:async()=>({}),from:()=>({download:async p=>files[p]?{data:{text:async()=>files[p]}}:{error:{message:'nf'}},upload:async(p,b)=>{ files[p]=b.toString(); return {error:null}; },remove:async()=>({}),list:async()=>({data:[]})})}})};
  // master: deposit 100,000 on 1 Nov; trades (UTC close times). Berlin = UTC+1 in November.
  const U=(m,d,h,mi)=>new Date(Date.UTC(2026,m,d,h,mi||0)).toISOString();
  const deals=[
    [U(10,16,22,30),1000,'BTCUSD','BUY'],   // 23:30 Berlin 16 Nov -> belongs to Monday 16
    [U(10,17,1,16),533.03,'HK50','SELL'],    // 02:16 Berlin 17 Nov
    [U(10,17,1,16),1586.38,'HK50','SELL'],
    [U(10,17,11,54),-492.12,'BTCUSD','SELL'],
    [U(10,17,23,10),250,'XAUUSD','BUY'],     // 00:10 Berlin 18 Nov -> Wednesday
    [U(10,20,9,0),-300,'XAUUSD','SELL'],     // Friday 20
    [U(10,14,10,0),400,'US500','BUY']        // Saturday 14 -> in the week Sat 14 - Fri 20
  ].sort((a,b)=>a[0].localeCompare(b[0]));
  const hist=[{type:'BALANCE',time:U(10,1,8),profit:100000,net:100000}].concat(deals.map((d,i)=>({type:d[3],entry:'OUT',ticket:'t'+i,time:d[0],profit:d[1],net:d[1],symbol:d[2]})));
  const bal=100000+deals.reduce((a,d)=>a+d[1],0);
  const engine={callEngine:async p=>{ if(/\/customer\/accounts$/.test(p)) return {ok:true,status:200,body:{ok:true,accounts:[{account_id:'m1',preview:true,view_only:true,currency:'USD',balance:String(bal),equity:String(bal),display_status:'ACTIVE'}]}};
    if(/\/m1\/stats/.test(p)) return {ok:true,status:200,body:{ok:true,history:hist.slice().reverse(),history_total:hist.length,deposits_total:100000,withdrawals_total:0}};
    if(/\/m1\/history/.test(p)) return {ok:true,status:200,body:{ok:true,trades:deals.map((d,i)=>({symbol:d[2],side:d[3],volume:'25.2',opened_at:new Date(Date.parse(d[0])-8*3600e3).toISOString(),closed_at:d[0],net_profit:String(d[1]),position_ref:'p'+i})),page:{offset:0,limit:200,total:deals.length}}};
    return {ok:true,status:200,body:{}}; }};
  const orig=Module._load; Module._load=function(r,...a){ if(r==='@supabase/supabase-js') return fake; if(r==='web-push') return {setVapidDetails(){},sendNotification:async()=>({})}; if(/engineClient$/.test(r)) return engine; return orig.call(this,r,...a); };
  const fs=require('fs'), mails=[]; global.fetch=async u=>{ const m=/\/i18n\/([\w-]+)\.json$/.exec(String(u)); if(m) return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(__dirname,'../../i18n/'+m[1]+'.json'),'utf8'))}; return {ok:false,json:async()=>({})}; };
  const Mail=require(path.join(__dirname,'../../api/_lib/mail.js')); Mail.sendMail=async m=>{ mails.push(m); return 'test'; };
  const R=require(path.join(__dirname,'../../api/_lib/results.js')), Calc=require(path.join(__dirname,'../../ftm-calc.js')), admin=fake.createClient();
  const posts=()=>JSON.parse(files['posts.json']||'{"posts":[]}').posts;
  let r=await R.run(admin,{now:Date.UTC(2026,10,17,21,0)}); ok(!posts().length&&/not 23:00/.test(r.log[0]),'22:00 Berlin: nothing yet');
  r=await R.run(admin,{now:Date.UTC(2026,10,17,22,0)}); let P=posts(), c=(P[0]||{}).card||{};
  ok(P.length===1&&P[0].ftm&&c.k==='day'&&c.date==='2026-11-17','23:00 Berlin Tuesday: the day\'s result is posted on FTM news '+JSON.stringify(r.log));
  ok(c.n===3&&c.rows.map(x=>x.pl).join()==='533.03,1586.38,-492.12','the day is the Berlin day: a trade at 23:30 Berlin the night before and one after midnight are not in it ('+c.rows.map(x=>x.pl).join()+')');
  const netExp=+(533.03+1586.38-492.12).toFixed(2); ok(c.net===netExp,'net P&L = the day\'s closed trades '+c.net);
  { const before=100000+1000+400; let f=1, b=before; [533.03,1586.38,-492.12].forEach(v=>{ f*=1+v/b; b+=v; }); ok(Math.abs(c.pct-(f-1)*100)<0.0001,'day % is time-weighted like the Calendar ('+c.pct.toFixed(4)+'%)'); }
  ok(/Tuesday, 17 November 2026: 3 trades closed, net \+\$1,627\.29/.test(P[0].x),'a short text for share links: '+P[0].x);
  r=await R.run(admin,{now:Date.UTC(2026,10,17,22,40)}); ok(posts().length===1,'never posted twice');
  { const fr=JSON.parse(fs.readFileSync(path.join(__dirname,'../../i18n/fr.json'),'utf8'));
    let mm=await R.mail(admin,{deadline:Date.now()+30000}); const to=x=>mails.find(m=>m.to===x)||{};
    ok(mails.length===2&&!mails.some(m=>m.to==='typo@x.con'),'emails: every confirmed login gets the day result ('+mails.length+')');
    ok(/^FTM · Daily result: Tuesday,? 17 November 2026 · \+\$1,627\.29 \(\+1\.60%\)$/.test(to('ftmwebnation@gmail.com').subject),'email subject: '+to('ftmwebnation@gmail.com').subject);
    const h=to('ftmwebnation@gmail.com').html||''; ok(/HK50/.test(h)&&/\+\$1,586\.38/.test(h)&&/02:16/.test(h)&&/CET/.test(h)&&/Invest today, secure tomorrow\./.test(h)&&/email-logo\.png/.test(h)&&/open=community/.test(h),'email: the trades in Berlin time (CET), net P&L, FTM footer and logo, link to FTM news');
    ok(to('amelie@x.com').subject.indexOf(fr['Daily result'])!==-1&&(to('amelie@x.com').html||'').indexOf(fr['{} trades closed this day.'].replace('{}','3'))!==-1&&/mardi/i.test(to('amelie@x.com').html),'the French member gets it in French: '+to('amelie@x.com').subject);
    mm=await R.mail(admin,{deadline:Date.now()+30000}); ok(mails.length===2,'nobody gets the same result email twice'); }
  r=await R.run(admin,{now:Date.UTC(2026,10,18,0,30)}); ok(posts().length===1,'a late run after midnight does not post the next day early');
  r=await R.run(admin,{now:Date.UTC(2026,10,20,22,0)}); { const n0=mails.length; let mm=await R.mail(admin,{deadline:Date.now()-1}); ok(mm.more&&mails.length===n0,'out of time: emails continue on the next call'); mm=await R.mail(admin,{deadline:Date.now()+30000}); ok(!mm.more&&mails.length===n0+4&&mails.slice(n0).some(m=>/Weekly result/.test(m.subject)),'Friday: day and week emails ('+(mails.length-n0)+')'); }
  P=posts(); const wk=(P.find(x=>x.res==='week-2026-11-20')||{}).card||{};
  ok(P.length===3&&P.some(x=>x.res==='day-2026-11-20')&&wk.k==='week'&&wk.from==='2026-11-14'&&wk.to==='2026-11-20','Friday: the day and the week (Saturday 14 to Friday 20)');
  ok(wk.n===7&&wk.days.length===5&&wk.days[0].date==='2026-11-14'&&wk.days.find(x=>x.date==='2026-11-18').n===1,'the week lists every day with trades ('+wk.days.map(x=>x.date.slice(8)+':'+x.n).join(' ')+')');
  r=await R.run(admin,{now:Date.UTC(2026,11,1,22,0)}); P=posts(); const mo=(P.find(x=>x.res==='month-2026-11')||{}).card||{};
  ok(mo.k==='month'&&mo.n===7&&mo.from==='2026-11-01'&&mo.best&&mo.worst&&mo.win!=null,'1 December: last month (November) is posted '+JSON.stringify({n:mo.n,win:mo.win,best:mo.best&&mo.best.date,worst:mo.worst&&mo.worst.date}));
  r=await R.run(admin,{now:Date.UTC(2027,6,2,21,0)}); ok(posts().some(x=>x.res==='day-2027-07-02')&&posts().some(x=>x.res==='week-2027-07-02'),'summer time: posted at 21:00 UTC = 23:00 Berlin');
  // Community: the result posts show in For you, Following and FTM news, with the card
  const CH=require(path.join(__dirname,'../../api/v1/community.js'));
  const call=(tok,body)=>new Promise(res=>{ const r={s:0,setHeader(){},status(c){this.s=c;return this;},json(j){res([this.s,j]);},end(){res([this.s,null]);}}; CH({method:'POST',headers:{authorization:'Bearer '+tok},body},r); });
  await call('tokC',{action:'me'}).catch(()=>{});
  for(const sc of ['all','following','ftm']){ const f=await call('tokC',{action:'feed',scope:sc}); const L=(f[1]&&f[1].posts)||[]; ok(f[0]===200&&L.filter(x=>x.card&&x.author&&x.author.ftm).length===Math.min(30,posts().length),'feed "'+sc+'": every result post is there with its card ('+L.length+')'); }
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
    ok(/Daily result/i.test(v.day)&&/Tuesday, 17 November 2026/.test(v.day)&&/3 trades closed this day\./.test(v.day)&&/HK50/.test(v.day)&&/\+\$1,627\.29/.test(v.day)&&/Net P&L/i.test(v.day),'['+label+'] day card: date, trades, net P&L and % like the Calendar');
    ok(!v.over.length&&v.sw<=v.W,'['+label+'] the cards fit the screen '+JSON.stringify({over:v.over,sw:v.sw,W:v.W,post:v.pr,list:v.li}));
    if(process.env.SHOT_DIR){ const el=await p.$('.rc-day'); await el.scrollIntoViewIfNeeded(); await el.screenshot({path:path.join(process.env.SHOT_DIR,'rc-day-'+label.replace(/ /g,'_')+'.png')}); const e2=await p.$('.rc-week'); await e2.screenshot({path:path.join(process.env.SHOT_DIR,'rc-week-'+label.replace(/ /g,'_')+'.png')}); const e3=await p.$('.rc-month'); await e3.screenshot({path:path.join(process.env.SHOT_DIR,'rc-month-'+label.replace(/ /g,'_')+'.png')}); }
    ok(!errs.length,'['+label+'] no script errors '+errs.join(' | ')); await p.close();
  }
  await b.close(); console.log(fails?fails+' BROKEN':'ALL OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
