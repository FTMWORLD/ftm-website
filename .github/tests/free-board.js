// Free accounts see the leaderboard (read only); Community stays for subscribers; leaderboard names are not links for free accounts. Run: node .github/tests/free-board.js (site on :8765)
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
const BASE=process.argv[2]||'http://localhost:8765'; let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const ROWS=[{rank:1,nickname:'Tanaya',return_pct:'12.33',closed_copies:9,wins:7,risk_tier:'GROWTH',is_you:false},{rank:2,nickname:'FTM MASTER',return_pct:'5.51',closed_copies:20,wins:12,is_master:true},{rank:3,nickname:'G-Marine',return_pct:'5.15',closed_copies:6,wins:4},{rank:4,nickname:'member_fff2',return_pct:'3.79',closed_copies:5,wins:3}];
(async()=>{ const b=await pw.chromium.launch();
  for(const [label,vp,products] of [['laptop free',{width:1280,height:900},[]],['phone free',{width:390,height:844},[]],['laptop paid',{width:1280,height:900},['auto']]]){
    const p=await b.newPage({viewport:vp}); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const finds=[];
    await p.route('**/api/v1/**',r=>{ const u=new URL(r.request().url()), pd=r.request().postData()||''; const J=(st,o)=>r.fulfill({status:st,contentType:'application/json',body:JSON.stringify(o)});
      if(u.pathname==='/api/v1/customer/leaderboard') return J(200,{ok:true,board:'MONTH',computed_at:new Date().toISOString(),rows:ROWS,you:{has_account:false},rules:{min_closed_copies:3}});
      if(u.pathname==='/api/v1/customer/leaderboard/profile') return J(200,{ok:true,profile:{opted_in:false,nickname:null}});
      if(u.pathname==='/api/v1/customer/accounts') return J(200,{ok:true,accounts:[]});
      if(u.pathname==='/api/v1/community'){ if(/"find"/.test(pd)) finds.push(pd); return J(200,{ok:true,member:{mid:'m2',nickname:'Tanaya'}}); }
      return J(404,{ok:false}); });
    await p.goto(BASE+'/'); await p.waitForTimeout(800);
    await p.evaluate(pr=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok')});F.session={email:'f@x.io',products:pr,name:'F'};},products);
    await p.evaluate(pr=>FTM.loadLive().then(()=>FTM.openArea('auto'))).catch(()=>{}); await p.waitForTimeout(1500);
    const free=await p.evaluate(()=>document.getElementById('appView').classList.contains('free'));
    await p.evaluate(()=>FTM.showView('board')); await p.waitForTimeout(400); await p.evaluate(()=>FTM.loadBoard&&FTM.loadBoard()); await p.waitForTimeout(1200);
    const v=await p.evaluate(()=>{ const s=document.querySelector('.app-view[data-view="board"]'); const lock=s.querySelector('.soc-lock'); return {lock:lock?getComputedStyle(lock).display:'none', names:[...s.querySelectorAll('#lbLive .lb-table b')].map(b=>b.textContent), links:s.querySelectorAll('#lbLive [data-cm]').length}; });
    if(products.length){ ok(!free&&v.links>0,'['+label+'] subscribers can tap names to open Community ('+v.links+' links)'); }
    else {
      ok(free,'['+label+'] free account recognised');
      ok(v.lock==='none'&&v.names.join(',')==='Tanaya,FTM MASTER,G-Marine,member_fff2','['+label+'] free account sees the full leaderboard '+JSON.stringify(v));
      ok(v.links===0,'['+label+'] leaderboard names are not links for free accounts');
      await p.click('#lbLive .lb-table tbody tr:first-child b').catch(()=>{}); await p.waitForTimeout(500);
      ok(!finds.length&&await p.evaluate(()=>document.querySelector('.app-view[data-view="board"]').hidden===false),'['+label+'] tapping a name stays on the leaderboard');
      await p.evaluate(()=>FTM.showView('community')); await p.waitForTimeout(300);
      ok(await p.evaluate(()=>{ const s=document.querySelector('.app-view[data-view="community"]'); const l=s.querySelector('.soc-lock'); return l&&getComputedStyle(l).display!=='none'; }),'['+label+'] Community stays locked for free accounts');
    }
    ok(!errs.length,'['+label+'] no script errors '+errs.join(' | '));
    await p.close(); }
  await b.close(); console.log(fails?'FAILED: '+fails:'FREE BOARD OK'); process.exit(fails?1:0); })();
