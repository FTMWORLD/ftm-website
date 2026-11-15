// Site polish from the 15 Nov audit: calm static headline, every "How it works" step on phones, timeline in order,
// performance charts fit phones, performance page footer, no "-0.00", empty states. Run: node .github/tests/site-polish.js (site on :8765)
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
const fs=require('fs'), path=require('path'); const BASE=process.argv[2]||'http://localhost:8765'; let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8'), perf=fs.readFileSync(path.join(__dirname,'../../performance.html'),'utf8');
ok(!/class="trust-head">\s*<div class="marquee"/.test(html),'the "Your money, working around the clock" headline is calm and complete (no sideways scroll)');
ok(!/\.how-steps\{display:none!important\}/.test(html),'"How FTM MACHINE works" keeps its steps on phones');
ok(!/\.inv-tl\{[^}]*column-reverse/.test(html),'the investment timeline reads Day 1 to Year 5 on phones');
ok(!/'-'\+money\(avgL,2\)/.test(html),'the calendar never shows "-0.00 avg loss day"');
ok(!/Where wealthy people interact/.test(html),'Community subtitle is the calm one');
ok(/class="pf-foot"/.test(perf)&&/href="\/terms.html"/.test(perf)&&/Invest today, secure tomorrow\./.test(perf),'performance page has the FTM footer with Terms and Privacy');
ok(!/counted to 8 October'\]/.test(perf),'"Profitable years" date follows the market shown');
(async()=>{ const b=await pw.chromium.launch();
  const p=await b.newPage({viewport:{width:390,height:844}}); await p.goto(BASE+'/performance.html'); await p.waitForTimeout(1500);
  const r=await p.evaluate(()=>['c-equity-a','c-years-a','c-weeks-a'].map(id=>{ const e=document.getElementById(id); return e?[id,e.scrollWidth<=e.clientWidth+1]:[id,false]; }));
  ok(r.every(x=>x[1]),'performance charts fit the phone screen without hidden sideways scrolling '+JSON.stringify(r));
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'performance page: no sideways scroll with the footer');
  await p.close();
  const q=await b.newPage({viewport:{width:390,height:844}}); await q.goto(BASE+'/'); await q.waitForTimeout(800);
  ok(await q.evaluate(()=>[...document.querySelectorAll('.how-steps li')].filter(li=>getComputedStyle(li).display!=='none').length===4),'phone: the 4 steps are shown');
  ok(await q.evaluate(()=>{ const L=[...document.querySelectorAll('.inv-tl li')]; return L.length>1&&L[0].getBoundingClientRect().top<L[L.length-1].getBoundingClientRect().top; }),'phone: timeline starts at the top with Day 1');
  await q.close(); await b.close();
  console.log(fails?'FAILED: '+fails:'SITE POLISH OK'); process.exit(fails?1:0); })();
