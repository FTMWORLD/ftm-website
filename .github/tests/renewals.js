// Plan renewal reminders: from 30 days before a plan ends, then weekly until renewed, and weekly during the one-month grace
// after it ends; never for Lifetime, auto-renewing Annual, free members or after the grace month. Run: node .github/tests/renewals.js
const path=require('path'), fs=require('fs');
const store={}; const pushPath=require.resolve('../../api/_lib/push.js');
require.cache[pushPath]={id:pushPath,filename:pushPath,loaded:true,exports:{read:async(a,k,d)=>store[k]?JSON.parse(JSON.stringify(store[k])):d,write:async(a,k,v)=>{ store[k]=JSON.parse(JSON.stringify(v)); },getBox:async()=>null,midOf:x=>x,
  tr:async(lang,t)=>{ if(!lang||lang==='en') return t; const d=JSON.parse(fs.readFileSync(path.join(__dirname,'../../i18n/'+lang+'.json'),'utf8')); return d[t]||t; }}};
const R=require('../../api/_lib/renewals.js');
const D=864e5, T0=Date.UTC(2026,10,20,10,19), iso=d=>new Date(T0+d*D).toISOString();
let fails=0; const ok=(c,m)=>{ console.log((c?'OK   ':'FAIL ')+m); if(!c) fails++; };
const U=(id,email,lang)=>({id,email,email_confirmed_at:iso(-400),user_metadata:lang?{ftm_lang:lang}:{}});
const users=[U('a','five@x.com'),U('b','annual-auto@x.com'),U('c','annual-cancelled@x.com','fr'),U('d','life@x.com'),U('e','far@x.com'),U('f','grace@x.com'),U('g','over@x.com'),U('h','free@x.com'),U('i','renewed@x.com')];
const plans={a:{status:'ACTIVE',plan:'FIVE_YEARS',period_end:iso(29)},b:{status:'ACTIVE',plan:'ANNUAL',period_end:iso(10),renews:true},c:{status:'CANCELED',plan:'ANNUAL',period_end:iso(20)},d:{status:'ACTIVE',plan:'LIFETIME',lifetime:true,period_end:null},
  e:{status:'ACTIVE',plan:'FIVE_YEARS',period_end:iso(45)},f:{status:'EXPIRED',plan:'FIVE_YEARS',period_end:iso(-10)},g:{status:'EXPIRED',plan:'FIVE_YEARS',period_end:iso(-31)},i:{status:'ACTIVE',plan:'FIVE_YEARS',period_end:iso(5)}};
(async()=>{
  const run=async(now,mails)=>R.run(null,{now,users,paid:['a','b','c','d','e','f','g','i'],statusOf:async u=>plans[u.id]?Object.assign({},plans[u.id]):null,gainOf:async u=>u.id==='a'?{pl:1250.5,pct:12.5,cur:'USD'}:null,send:async m=>{ mails.push(m); },deadline:Date.now()+30000});
  let M=[]; await run(T0,M); const to=x=>M.filter(m=>m.to===x);
  ok(to('five@x.com').length===1&&/ends soon/.test(to('five@x.com')[0].subject),'5 Years plan ending in 29 days: reminder sent');
  const h=(to('five@x.com')[0]||{}).html||'';
  ok(/Your 5 Years plan ends on 19 December 2026\./.test(h)&&/\+\$1,250\.50 \(\+12\.50%\)/.test(h)&&/FTM MACHINE stops trading on your accounts/.test(h)&&/#pricing/.test(h)&&/Renew now/.test(h)&&/Invest today, secure tomorrow/.test(h),'the email: end date, the member\'s own result with FTM, what stops, Renew now button, FTM footer');
  ok(!/guarantee|promise/i.test(h.split('Invest today')[0]),'no guarantee or promise in the message (the risk note stays in the footer)');
  ok(!to('annual-auto@x.com').length,'an Annual subscription that renews by itself gets no reminder (it would be charged twice)');
  ok(to('annual-cancelled@x.com').length===1&&/Votre offre FTM se termine bientôt/.test(to('annual-cancelled@x.com')[0].subject),'a cancelled Annual gets the reminder, in the member\'s language');
  ok(!to('life@x.com').length&&!to('far@x.com').length,'Lifetime and plans ending in more than 30 days: nothing');
  ok(to('grace@x.com').length===1&&/has ended/.test(to('grace@x.com')[0].subject)&&/You can still log in until 10 December 2026/.test(to('grace@x.com')[0].html),'ended 10 days ago: grace reminder with the last login date');
  ok(!to('over@x.com').length&&!to('free@x.com').length,'after the grace month, and free members: nothing');
  M=[]; await run(T0+3*D,M); ok(!M.length,'three days later: no second email that week');
  M=[]; await run(T0+7*D,M); ok(to('five@x.com').length===1&&to('grace@x.com').length===1&&to('renewed@x.com').length===1&&/has ended/.test(to('renewed@x.com')[0].subject),'a week later: the weekly reminder again; a plan that ended in between gets the grace email ('+M.map(m=>m.to).join(',')+')');
  plans.i.period_end=iso(370); M=[]; await run(T0+14*D,M); ok(!to('renewed@x.com').length&&to('five@x.com').length===1,'after a renewal (later end date) the reminders stop');
  ok(R.phase({status:'ACTIVE',plan:'ANNUAL',period_end:iso(5)},T0)===null,'an Annual whose renewal cannot be checked is treated as renewing (no email)');
  console.log(fails?'FAILED: '+fails:'RENEWALS OK'); process.exit(fails?1:0);
})();
