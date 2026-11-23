// Owner 23 Nov 2026: people who never click the sign-up link get three reminders (3 hours, 3 days, 7 days), each saying how
// long it has been and what they are missing, with no money amounts. Run: node .github/tests/reminder-emails.js
const path=require('path'); let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const E=require(path.join(__dirname,'../../api/_lib/passwordEmail.js'));
const r1=E.remindWords('r1'), r2=E.remindWords('r2'), r3=E.remindWords('r3');
ok(/hours/.test(r1.lead) && /3 days/.test(r2.subject+r2.lead) && /7 days/.test(r3.subject+r3.lead) && /last reminder/.test(r3.lead), 'each reminder says how long it has been (hours, 3 days, 7 days, last one)');
const h=E.remindHtml(r2,{link:'https://x/link',name:'Ama Mensah',mtd:10.45});
ok(/What you are missing/.test(h) && /every trade shown/.test(h) && /6 p\.m\./.test(h), 'the reminder lists what they are missing');
ok(/\+10\.45%/.test(h) && !/[$€]\s?\d/.test(h), 'the month is shown in percent, never as a money amount');
ok(/https:\/\/x\/link/.test(h) && /Activate my free account/.test(h), 'the reminder carries the one-tap activation link');
const n=E.remindHtml(r2,{link:'https://x',mtd:-2}); ok(/7 of 7 years profitable/.test(n) && !/-2/.test(n), 'a losing month falls back to the trust engine line');
const src=require('fs').readFileSync(path.join(__dirname,'../../api/_lib/journeyMail.js'),'utf8');
ok(/age > 7 \* DAY \? 'r3'/.test(src) && /sendReminderEmail/.test(src), 'journeyMail sends r3 after 7 days through sendReminderEmail');
if(fails){ console.log(fails+' broken'); process.exit(1); } console.log('all good');
