// Community comments: emoji picker and stickers (laptop + phone). Emoji and stickers go into the text; nothing is sent until
// Send is pressed; a comment being written survives a feed refresh; a sticker alone shows large; a post shows 2 comments and
// "View all" (then a scrolling list and Show less). Run: node .github/tests/comment-emoji.js (site on :8765)
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
const BASE=process.argv[2]||'http://localhost:8765'; let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
(async()=>{ const b=await pw.chromium.launch();
  for(const [label,vp] of [['laptop',{width:1280,height:900}],['phone',{width:390,height:844}]]){
    const p=await b.newPage({viewport:vp}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    const post={id:'p1',author:{mid:'m2',nickname:'Tanaya'},text:'Gold looks strong today',imgs:[],t:new Date().toISOString(),likes:2,liked:false,comments:[],tags:[],poll:null,saved:false,mine:false,can_delete:false};
    await p.route('**/api/v1/**',r=>{ const u=new URL(r.request().url()), pd=r.request().postData()||''; const J=o=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(o)});
      if(u.pathname==='/api/v1/community'){ const o=JSON.parse(pd||'{}');
        if(o.action==='me') return J({ok:true,mid:'m1',paid:true,staff:false,notif_unread:0,profile:{nickname:'Tester',bio:'',country:'',visible:true,since:new Date().toISOString(),av:null},followers:0,following:0,blocked:[]});
        if(o.action==='feed') return J({ok:true,staff:false,posts:[post],more:false});
        if(o.action==='comment'){ post.comments.push({id:'c'+post.comments.length,author:{mid:'m1',nickname:'Tester'},text:o.text,t:new Date().toISOString(),mine:true,likes:0,liked:false,can_delete:true}); return J({ok:true,post}); }
        if(o.action==='threads') return J({ok:true,threads:[]}); if(o.action==='members') return J({ok:true,members:[]}); if(o.action==='trending') return J({ok:true,tags:[]}); return J({ok:true}); }
      if(/\/customer\/accounts$/.test(u.pathname)) return J({ok:true,accounts:[]});
      return r.fulfill({status:404,contentType:'application/json',body:'{"ok":false}'}); });
    await p.goto(BASE+'/'); await p.waitForTimeout(800);
    await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok')});F.session={email:'t@x.com',products:['auto'],name:'T'};});
    await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))).catch(()=>{}); await p.waitForTimeout(1500);
    await p.evaluate(()=>FTM.showView('community')); await p.waitForTimeout(400);
    await p.evaluate(()=>{ const t=document.querySelector('#cTabs button[data-tab="feed"]'); if(t) t.click(); if(window.FTM.feedLoad) window.FTM.feedLoad(true); }); await p.waitForTimeout(1200);
    const has=await p.evaluate(()=>!!document.querySelector('[data-cform] [data-cemo]'));
    ok(has,'['+label+'] every comment box has an emoji and sticker button');
    if(!has){ await p.close(); continue; }
    const form=await p.$('[data-cform]'); const pid=await form.evaluate(f=>f.closest('[data-pid]').dataset.pid);
    await form.$eval('[data-cemo]',b=>b.scrollIntoView({block:'center'})); await (await form.$('[data-cemo]')).click(); await p.waitForTimeout(200);
    const pop=await p.evaluate(()=>{ const q=document.getElementById('fdCPop'); const r=q.getBoundingClientRect(); return {open:!q.hidden,inView:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,stk:q.querySelectorAll('.emo-grid.stk [data-emo]').length,tabs:q.querySelectorAll('[data-et]').length}; });
    ok(pop.open&&pop.inView&&pop.tabs>=4&&pop.stk===0,'['+label+'] picker opens fully on screen, on the emoji tab (not stickers) '+JSON.stringify(pop));
    if(process.env.SHOT_DIR) await p.screenshot({path:require('path').join(process.env.SHOT_DIR,'cemo-'+label+'.png')});
    await form.$eval('input',i=>{ i.value='Great call '; i.setSelectionRange(11,11); });
    await p.click('#fdCPop .emo-grid [data-emo]'); await p.waitForTimeout(150);
    let v=await p.evaluate(pid=>document.querySelector('[data-pid="'+pid+'"] [data-cform] input').value,pid);
    ok(/^Great call \p{Extended_Pictographic}/u.test(v)&&post.comments.length===0,'['+label+'] an emoji is added after the text, the text stays, nothing is sent ('+v+')');
    await p.click('#fdCPop [data-et="0"]'); await p.click('#fdCPop .emo-grid.stk [data-emo="🚀"]'); await p.waitForTimeout(150);
    v=await p.evaluate(pid=>document.querySelector('[data-pid="'+pid+'"] [data-cform] input').value,pid);
    ok(/^Great call .*🚀$/u.test(v)&&post.comments.length===0,'['+label+'] a sticker is added too, still nothing sent ('+v+')');
    await p.evaluate(()=>FTM.feedLoad(true)); await p.waitForTimeout(500);
    v=await p.evaluate(pid=>document.querySelector('[data-pid="'+pid+'"] [data-cform] input').value,pid);
    ok(/^Great call .*🚀$/u.test(v),'['+label+'] the comment being written survives a feed refresh');
    await p.evaluate(()=>{ document.getElementById('fdCPop').hidden=true; }); await p.evaluate(pid=>{ const f=document.querySelector('[data-pid="'+pid+'"] [data-cform]'); f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})); },pid); await p.waitForTimeout(400);
    ok(post.comments.length===1&&/^Great call .*🚀$/u.test(post.comments[0].text),'['+label+'] Send sends the text, emoji and sticker together as one comment');
    await p.evaluate(pid=>{ const i=document.querySelector('[data-pid="'+pid+'"] [data-cform] input'); i.value='🚀'; const f=i.closest('form'); f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})); },pid); await p.waitForTimeout(400);
    const big=await p.evaluate(pid=>{ const a=document.querySelector('[data-pid="'+pid+'"]'); const c=[...a.querySelectorAll('.fd-c')].filter(x=>/🚀/.test(x.innerText)&&!/Great/.test(x.innerText)).pop(); return c?{big:!!c.querySelector('.fd-cbig'),fs:parseFloat(getComputedStyle(c.querySelector('p')).fontSize)}:null; },pid);
    ok(big&&big.big&&big.fs>=30,'['+label+'] a sticker sent on its own shows large '+JSON.stringify(big));
    // many comments: 2 shown, the rest behind "View all"
    for(let k=0;k<48;k++) post.comments.push({id:'x'+k,author:{mid:'m'+(k%5+3),nickname:'Member'+k},text:'Comment number '+k,t:new Date(Date.now()-k*6e4).toISOString(),mine:false,likes:k===30?9:(k===7?4:0),liked:false,can_delete:false});
    await p.evaluate(()=>{ if(document.activeElement) document.activeElement.blur(); return FTM.feedLoad(true); }); await p.waitForTimeout(600);
    let c=await p.evaluate(pid=>{ const a=document.querySelector('[data-pid="'+pid+'"]'); return {n:a.querySelectorAll('.fd-c').length, txt:[...a.querySelectorAll('.fd-c p')].map(x=>x.textContent), btn:(a.querySelector('[data-call]')||{}).textContent||'', after:!!a.querySelector('.fd-c ~ [data-call]')}; },pid);
    ok(c.n===3&&/50/.test(c.btn)&&c.after&&c.txt.includes('Comment number 30')&&c.txt.includes('Comment number 7')&&c.txt.includes('🚀'),'['+label+'] 50 comments: the 2 most liked show (plus the one you just sent), then a "View all 50 comments" button '+JSON.stringify({n:c.n,txt:c.txt,btn:c.btn}));
    await p.evaluate(pid=>document.querySelector('[data-pid="'+pid+'"] [data-call]').click(),pid); await p.waitForTimeout(300);
    c=await p.evaluate(pid=>{ const a=document.querySelector('[data-pid="'+pid+'"]'), sc=a.querySelector('.fd-cscroll'); return {n:a.querySelectorAll('.fd-c').length, scroll:!!sc&&sc.scrollHeight>sc.clientHeight&&sc.clientHeight<=Math.min(440,innerHeight*0.6)+1, less:!!a.querySelector('[data-cless]')}; },pid);
    ok(c.n===50&&c.scroll&&c.less,'['+label+'] View all opens every comment in a scrolling list with Show less '+JSON.stringify(c));
    await p.evaluate(pid=>document.querySelector('[data-pid="'+pid+'"] [data-cless]').click(),pid); await p.waitForTimeout(300);
    ok(await p.evaluate(pid=>document.querySelectorAll('[data-pid="'+pid+'"] .fd-c').length,pid)===3,'['+label+'] Show less goes back to the short list');
    ok(!errs.length,'['+label+'] no script errors '+errs.join(' | '));
    await p.close(); }
  await b.close(); console.log(fails?'FAILED: '+fails:'COMMENT EMOJI OK'); process.exit(fails?1:0); })();
