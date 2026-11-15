// Community comments: emoji picker and stickers (laptop + phone). A sticker sends at once and shows large. Run: node .github/tests/comment-emoji.js (site on :8765)
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
    ok(pop.open&&pop.inView&&pop.stk>=20&&pop.tabs>=4,'['+label+'] picker opens fully on screen with stickers and emoji tabs '+JSON.stringify(pop));
    if(process.env.SHOT_DIR) await p.screenshot({path:require('path').join(process.env.SHOT_DIR,'cemo-'+label+'.png')});
    await p.click('#fdCPop [data-et="1"]'); await p.click('#fdCPop .emo-grid [data-emo]');
    const v=await form.$eval('input',i=>i.value); ok(/\p{Extended_Pictographic}/u.test(v),'['+label+'] an emoji goes into the comment ('+v+')');
    await form.$eval('input',i=>{ i.value=''; });
    await p.click('#fdCPop [data-et="0"]'); await p.click('#fdCPop .emo-grid.stk [data-emo="🚀"]'); await p.waitForTimeout(400);
    const big=await p.evaluate(pid=>{ const a=document.querySelector('[data-pid="'+pid+'"]'); const c=[...a.querySelectorAll('.fd-c')].pop(); return c?{t:c.innerText,big:!!c.querySelector('.fd-cbig'),fs:parseFloat(getComputedStyle(c.querySelector('p')).fontSize)}:null; },pid);
    ok(big&&/🚀/.test(big.t)&&big.big&&big.fs>=30,'['+label+'] a sticker is sent at once and shown large '+JSON.stringify(big));
    ok(await p.evaluate(()=>document.getElementById('fdCPop').hidden),'['+label+'] picker closes after sending');
    ok(!errs.length,'['+label+'] no script errors '+errs.join(' | '));
    await p.close(); }
  await b.close(); console.log(fails?'FAILED: '+fails:'COMMENT EMOJI OK'); process.exit(fails?1:0); })();
