// Welcome emails (replace the Brevo automations): free series F0/F2/F5/F9, paid series P0/P2/P7, through our own mail,
// in the member's language, FTM footer, never twice, one per day, old members do not get the whole series, P2 only while
// no account is connected, owners excluded. Run: node .github/tests/welcome-emails.js
const path=require('path'), Module=require('module'); let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
process.env.SUPABASE_SERVICE_ROLE_KEY='k'; process.env.SUPABASE_URL='https://x.supabase.co';
const files={}, D=864e5, NOW=Date.UTC(2026,10,21,9,30), iso=x=>new Date(x).toISOString();
const users=[{id:'n1',email:'new@x.com',email_confirmed_at:iso(NOW),created_at:iso(NOW-3600e3)},{id:'o1',email:'old@x.com',email_confirmed_at:iso(NOW),created_at:iso(NOW-60*D)},
 {id:'p1',email:'payer@x.com',email_confirmed_at:iso(NOW),created_at:iso(NOW-3600e3),user_metadata:{full_name:'Ada Obi'}},{id:'p2',email:'connected@x.com',email_confirmed_at:iso(NOW),created_at:iso(NOW-90*D)},
 {id:'s1',email:'ftmwebnation@gmail.com',email_confirmed_at:iso(NOW),created_at:iso(NOW-90*D)},{id:'u1',email:'unconfirmed@x.com',created_at:iso(NOW)}];
const products={p1:['auto'],p2:['auto'],s1:['auto']};
const fake={createClient:()=>({auth:{admin:{listUsers:async()=>({data:{users}})}},from:()=>({select:()=>({range:async()=>({data:Object.keys(products).map(id=>({id,products:products[id]}))})})}),
  storage:{getBucket:async()=>({error:null}),createBucket:async()=>({}),from:()=>({download:async p=>files[p]?{data:{text:async()=>files[p]}}:{error:{message:'nf'}},upload:async(p,b)=>{ files[p]=b.toString(); return {error:null}; }})}})};
const engine={callEngine:async(p,o)=>{ const who=(o&&o.authSubject)||''; return {ok:true,body:{accounts:who==='p2'?[{account_id:'a2',account_number:'777',is_trading:true}]:[]}}; }};
const orig=Module._load; Module._load=function(r,...a){ if(r==='@supabase/supabase-js') return fake; if(r==='web-push') return {}; if(/engineClient$/.test(r)) return engine; return orig.call(this,r,...a); };
const Mail=require(path.join(__dirname,'../../api/_lib/mail.js')); const mails=[]; Mail.sendMail=async m=>{ mails.push(m); return 'test'; };
const J=require(path.join(__dirname,'../../api/_lib/journeyMail.js')), admin=fake.createClient();
(async()=>{
  let r=await J.run(admin,{now:NOW}); const to=x=>mails.filter(m=>m.to===x);
  ok(to('new@x.com').length===1&&/Welcome to FTM: your free account is ready/.test(to('new@x.com')[0].subject),'new free member: F0 welcome '+JSON.stringify(r.log));
  ok(/Invest today, secure tomorrow\./.test(to('new@x.com')[0].html)&&/email-logo\.png/.test(to('new@x.com')[0].html)&&/Unsubscribe/.test(to('new@x.com')[0].html),'FTM footer: tagline, logo, unsubscribe');
  ok(to('old@x.com').length===1&&/Ready when you are/.test(to('old@x.com')[0].subject),'free member from 2 months ago: only the last step (plans), not the whole series');
  ok(to('payer@x.com').length===1&&/Welcome aboard/.test(to('payer@x.com')[0].subject)&&/Hello Ada,/.test(to('payer@x.com')[0].html)&&/open=accounts/.test(to('payer@x.com')[0].html),'new paying member: Welcome aboard with the connect button, by first name');
  ok(!to('connected@x.com').length,'long-time paying member with a connected account: no Welcome aboard, no reminder');
  ok(!to('ftmwebnation@gmail.com').length&&!to('unconfirmed@x.com').length,'owners and unconfirmed emails: nothing');
  const n0=mails.length; await J.run(admin,{now:NOW+3600e3}); ok(mails.length===n0,'same day again: nothing sent twice');
  await J.run(admin,{now:NOW+2*D+3600e3}); ok(to('new@x.com').length===2&&/How FTM MACHINE works/.test(to('new@x.com')[1].subject),'day 2: free member gets How FTM MACHINE works');
  ok(to('payer@x.com').length===2&&/waiting for your account/.test(to('payer@x.com')[1].subject),'day 2: paying member with no account gets the connect reminder');
  await J.run(admin,{now:NOW+7*D+3600e3}); ok(/client area, explained/.test((to('payer@x.com')[2]||{}).subject||'')&&/client area, explained/.test((to('connected@x.com')[0]||{}).subject||''),'day 7: paying members get Your client area');
  await J.run(admin,{now:NOW+30*D}); await J.run(admin,{now:NOW+31*D}); ok(to('new@x.com').length<=4&&to('old@x.com').length===1,'never more than the series, nothing repeated ('+to('new@x.com').map(m=>m.subject).join(' | ')+')');
  const d=J.due({sent:{},skip:{}},false,false,NOW,NOW-20*D); ok(d.step==='F9'&&d.skip.join()==='F0,F2,F5','overdue steps skipped, last step kept');
  console.log(fails?fails+' BROKEN':'all OK'); process.exit(fails?1:0);
})();
