// Discover cards: followers, following and the member's FTM profit % (green/red, from the Since joining leaderboard) with
// the label under each number; the Follows you pill is a neat, centred pill beside the country. Run: node .github/tests/discover-cards.js [baseUrl]
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
const {chromium}=pw; const BASE=process.argv[2]||'http://localhost:8765', OUT=process.env.SHOT_DIR||'';
const fails=[]; const ok=(c,m)=>{console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails.push(m);};
const MEM=[{mid:'a1',nickname:'Tanaya',country:'IN',bio:'Patient member',followers:2,following_count:1,follows_you:true,av:null,sub:true,lb:'Tanaya'},
 {mid:'a2',nickname:'Marine',country:'NG',bio:'',followers:5,following_count:3,follows_you:false,av:null,sub:true,lb:'Marine'},
 {mid:'a3',nickname:'newbie_9',country:'',bio:'',followers:0,following_count:0,follows_you:true,av:null,sub:false}];
(async()=>{ const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
 for(const [dev,vp] of [['laptop',{width:1280,height:900}],['phone',{width:390,height:844}],['small phone',{width:340,height:700}]]){
  const p=await b.newPage({viewport:vp,deviceScaleFactor:1}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/api/v1/**',r=>{const u=r.request().url();
   if(/\/api\/v1\/community$/.test(u)){ const bd=JSON.parse(r.request().postData()||'{}');
     if(bd.action==='me') return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,mid:'me1',paid:true,notif_unread:0,profile:{nickname:'gee_m',visible:true},followers:0,following:0,blocked:[]})});
     if(bd.action==='members') return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,members:MEM})});
     return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"threads":[],"items":[],"posts":[]}'}); }
   if(/leaderboard(\?|%3F)board(=|%3D)SINCE_CONNECT/.test(u)) return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,entries:[{rank:1,nickname:'Tanaya',return_pct:'16.42'},{rank:2,nickname:'Marine',return_pct:'-7.35'}]})});
   if(u.includes('/stats'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"history":[],"history_total":0}'});
   if(u.includes('/history'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"trades":[],"page":{"offset":0,"limit":200,"total":0}}'});
   if(u.includes('/positions'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"positions":[]}'});
   if(/\/customer\/accounts(\?|$)/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:1},accounts:[{account_id:'c0a00000-0000-4000-8000-000000000009',account_number:'51000009',name:'DERIV',currency:'USD',balance:'100',equity:'100',display_status:'ACTIVE',status_reason:'OK',is_trading:true,risk_tier:'BALANCED'}]})});
   return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
  await p.goto(BASE+'/'); await p.waitForLoadState('load'); await p.waitForTimeout(800);
  await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'g@ftm.com',products:['auto'],name:'Gospel'};});
  await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))); await p.waitForTimeout(1500);
  await p.evaluate(()=>{ FTM.showView('community'); }); await p.waitForTimeout(1500);
  await p.click('#cTabs [data-tab="discover"]'); await p.waitForTimeout(2000);
   if(OUT){ const m=await p.$('#cMembers'); await m.screenshot({path:OUT+'/disc-'+dev.replace(' ','_')+'.png'}); }
  const r=await p.evaluate(()=>[...document.querySelectorAll('#cMembers .mem')].map(c=>{ const g=c.querySelector('.mc-g'), fy=c.querySelector('.fy'), mcs=[...c.querySelectorAll('.mem-counts .mc')];
    const o={name:c.querySelector('.top b').textContent.trim(), stats:mcs.map(x=>x.querySelector('b').textContent+'/'+x.querySelector('small').textContent).join(' '), oneRow:new Set(mcs.map(x=>Math.round(x.getBoundingClientRect().top))).size===1,
      labelUnder:mcs.every(x=>x.querySelector('small').getBoundingClientRect().top>=x.querySelector('b').getBoundingClientRect().bottom-1),
      gColor:g?getComputedStyle(g.querySelector('b')).color:null, fitsCard:mcs.every(x=>x.getBoundingClientRect().right<=c.getBoundingClientRect().right)};
    if(fy){ const pr=fy.getBoundingClientRect(), rg=document.createRange(); rg.selectNodeContents(fy); const tr=rg.getBoundingClientRect(); o.fy={h:Math.round(pr.height), dy:Math.abs((tr.top+tr.bottom)/2-(pr.top+pr.bottom)/2), dx:Math.abs((tr.left+tr.right)/2-(pr.left+pr.right)/2), rad:getComputedStyle(fy).borderTopLeftRadius, inHead:!!fy.closest('.top'), inCard:pr.right<=c.getBoundingClientRect().right}; }
    return o; }));
  const T=r.find(x=>x.name.startsWith('Tanaya')), M=r.find(x=>x.name.startsWith('Marine')), N=r.find(x=>x.name.startsWith('newbie'));
  ok(T&&/\+16\.42%\/Profit/.test(T.stats)&&T.gColor==='rgb(21, 128, 61)', dev+': a member on the leaderboard shows +16.42% in green with Profit under it (got '+JSON.stringify(T)+')');
  ok(M&&/-7\.35%\/Profit/.test(M.stats)&&M.gColor==='rgb(200, 30, 43)', dev+': a loss shows in red (got '+JSON.stringify(M)+')');
  ok(N&&!/Profit/.test(N.stats), dev+': a member without FTM results shows no profit figure (got '+JSON.stringify(N)+')');
  ok(r.every(x=>x.oneRow&&x.labelUnder&&x.fitsCard), dev+': followers, following and profit sit on one row, label under each number, inside the card ('+JSON.stringify(r.map(x=>[x.oneRow,x.labelUnder,x.fitsCard]))+')');
  const P=[T,N].map(x=>x&&x.fy);
  ok(P.every(f=>f&&f.inHead&&f.inCard&&f.h>=20&&f.h<=26&&f.dy<=1.5&&f.dx<=1.5&&parseFloat(f.rad)>=f.h/2-1), dev+': Follows you is a round pill with its text centred, beside the country (got '+JSON.stringify(P)+')');
  ok(M&&!M.fy, dev+': no Follows you pill when the member does not follow you');
  ok(!errs.length, dev+': no page errors ('+errs.join(' | ')+')');
  await p.close(); }
 await b.close(); console.log(fails.length?'FAILED: '+fails.length:'DISCOVER CARDS OK'); process.exit(fails.length?1:0); })();
