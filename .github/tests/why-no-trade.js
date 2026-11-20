// "Why no trade today?": a member's own account that closed no trade on a day gets the reason in its daily email:
// open trades still running, no trade anywhere (master idle), a small account below 2,000 (broker 0.01-lot minimum),
// or a larger account that should have traded (check the connection). In the member's language. Never on master/preview.
// Run: node .github/tests/why-no-trade.js [http://localhost:8765]
const path=require('path'), Module=require('module'); let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
process.env.SUPABASE_SERVICE_ROLE_KEY='k'; process.env.SUPABASE_URL='https://x.supabase.co'; if(process.argv[2]) process.env.SITE_URL=process.argv[2];
const orig=Module._load; Module._load=function(r,...a){ if(r==='@supabase/supabase-js') return {createClient:()=>({})}; if(r==='web-push') return {}; if(/engineClient$/.test(r)) return {callEngine:async()=>({})}; return orig.call(this,r,...a); };
const R=require(path.join(__dirname,'../../api/_lib/results.js'));
(async()=>{
  const day=(n,why)=>({k:'day',date:'2026-11-19',cur:'USD',net:0,pct:0,n,rows:[],why});
  const acct={accountId:'a9',number:'90210',balance:600,openPositions:0,currency:'USD'};
  const w=R.whyNone(15,acct); ok(w.mn===15&&w.bal===600&&w.open===0,'whyNone keeps master trades, balance and open trades');
  let m=await R.emailFor(day(0,R.whyNone(15,acct)),'en',acct,'Tanaya');
  ok(/Why no trade today\?/.test(m.html),'small account: heading shown');
  ok(/0\.01 lot/.test(m.html)&&/\$600\.00/.test(m.html),'small account: broker minimum lot and the account size explained');
  ok(/2,000 or more/.test(m.html),'small account: 2,000 recommendation');
  m=await R.emailFor(day(0,R.whyNone(0,acct)),'en',acct,'Tanaya');
  ok(/no trade that met its rules today/.test(m.html)&&!/0\.01 lot/.test(m.html),'master idle: no-trade day explained, no lot note');
  m=await R.emailFor(day(0,R.whyNone(12,Object.assign({},acct,{balance:25000}))),'en',acct,'Ben');
  ok(/check your connection/.test(m.html)&&!/0\.01 lot/.test(m.html),'large account with no trade: connection check, no lot note');
  m=await R.emailFor(day(0,R.whyNone(12,Object.assign({},acct,{openPositions:2}))),'en',acct,'Ben');
  ok(/2 trades are still open/.test(m.html),'open trades: counted on the day they close');
  m=await R.emailFor(day(0,R.whyNone(12,Object.assign({},acct,{openPositions:1}))),'en',acct,'Ben');
  ok(/One trade is still open/.test(m.html),'one open trade: singular');
  m=await R.emailFor(day(3,R.whyNone(12,acct)),'en',acct,'Ben');
  ok(!/Why no trade today/.test(m.html),'a day with trades: no box');
  m=await R.emailFor(day(0),'en',null,'');
  ok(!/Why no trade today/.test(m.html),'master/preview email (no why): no box');
  if(process.argv[2]){ m=await R.emailFor(day(0,R.whyNone(15,acct)),'de',acct,'Tanaya');
    ok(!/Why no trade today/.test(m.html)&&/0,01|0\.01/.test(m.html),'German member: the box is translated'); }
  console.log(fails?fails+' BROKEN':'all OK'); process.exit(fails?1:0);
})();
