// Community: the owner chooses "Posting as" their own profile or FTM (composer switch, and the avatar next to each
// comment box toggles it); the choice is sent with every post and comment. Other members never see the switch.
// Run: node .github/tests/community-as.js (site on http://localhost:8765)
const {chromium}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();
let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const BASE=process.argv[2]||'http://localhost:8765';
const post={id:'p1',author:{mid:'s',nickname:'FTM',ftm:true},text:'FTM news',imgs:[],t:new Date().toISOString(),likes:0,comments:[],tags:[]};
(async()=>{
  const b=await chromium.launch();
  for(const [label,vp,owner] of [['laptop owner',{width:1440,height:900},true],['phone owner',{width:390,height:844},true],['small phone owner',{width:360,height:740},true],['laptop member',{width:1440,height:900},false]]){
    const p=await b.newPage({viewport:vp}); const errs=[], sent=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
    await p.route('**/api/v1/**',async rt=>{ const u=new URL(rt.request().url()), J=o=>rt.fulfill({status:200,contentType:'application/json',body:JSON.stringify(o)});
      if(u.pathname==='/api/v1/community'){ const o=JSON.parse(rt.request().postData()||'{}');
        if(o.action==='feed') return J({ok:true,staff:owner,owner,posts:[post],more:false});
        if(o.action==='me') return J({ok:true,mid:'me1',paid:true,staff:owner,profile:{nickname:'Gmarine',visible:true},followers:0,following:0,blocked:[]});
        if(o.action==='comment'||o.action==='post'){ sent.push(o); const au=o.as==='ftm'?{mid:'me1',nickname:'FTM',ftm:true}:{mid:'me1',nickname:'Gmarine'};
          if(o.action==='post') return J({ok:true,post:Object.assign({},post,{id:'p2',author:au,text:o.text})});
          return J({ok:true,post:Object.assign({},post,{comments:[{id:'c1',author:au,text:o.text,t:new Date().toISOString(),mine:true,can_delete:true}]})}); }
        return J({ok:true,items:[],members:[],threads:[],tags:[]}); }
      if(/\/customer\/accounts$/.test(u.pathname)) return J({ok:true,accounts:[]}); return J({ok:true}); });
    await p.addInitScript(()=>{ try{ localStorage.removeItem('ftm-as'); }catch(e){} });
    await p.goto(BASE+'/'); await p.waitForTimeout(700);
    await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'o@x.com',products:['auto'],name:'G'};});
    await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))).catch(()=>{}); await p.waitForTimeout(2000);
    await p.evaluate(()=>{ FTM.showView('community'); const t=document.querySelector('button[data-tab="feed"]'); if(t) t.click(); if(FTM.feedLoad) FTM.feedLoad(true); }); await p.waitForTimeout(1200);
    const vis=await p.evaluate(()=>{ const a=document.getElementById('fdAs'); return {hidden:a.hidden||a.offsetParent===null, flip:!!document.querySelector('[data-asflip]')}; });
    if(!owner){ ok(vis.hidden&&!vis.flip,'['+label+'] members do not see the Posting as switch'); ok(!errs.length,'['+label+'] no script errors '+errs.join(' | ')); await p.close(); continue; }
    ok(!vis.hidden&&vis.flip,'['+label+'] the owner sees "Posting as" and a switchable avatar on the comment box');
    let st=await p.evaluate(()=>({pressed:document.querySelector('#fdAs [aria-pressed="true"]').dataset.as,name:document.getElementById('fdAsNm').textContent,cav:!!document.querySelector('[data-asflip] .ftm-av')}));
    ok(st.pressed==='me'&&st.name==='Gmarine'&&!st.cav,'['+label+'] it starts on the owner\'s own profile ('+st.name+')');
    await p.fill('[data-pid="p1"] [data-cform] input','what a day !!'); await p.press('[data-pid="p1"] [data-cform] input','Enter'); await p.waitForTimeout(400);
    ok(sent.length===1&&sent[0].as==='me','['+label+'] a comment is sent as the owner\'s own profile');
    await p.click('[data-asflip]'); await p.waitForTimeout(300);
    st=await p.evaluate(()=>({pressed:document.querySelector('#fdAs [aria-pressed="true"]').dataset.as,cav:!!document.querySelector('[data-asflip] .ftm-av'),me:document.getElementById('fdMe').classList.contains('ftm-av'),ls:localStorage.getItem('ftm-as')}));
    ok(st.pressed==='ftm'&&st.cav&&st.me&&st.ls==='ftm','['+label+'] tapping the comment avatar switches everything to FTM (and remembers it)');
    await p.fill('[data-pid="p1"] [data-cform] input','Thank you all'); await p.press('[data-pid="p1"] [data-cform] input','Enter'); await p.waitForTimeout(400);
    ok(sent[1]&&sent[1].as==='ftm','['+label+'] the next comment is sent as FTM');
    await p.click('#fdAs [data-as="me"]'); await p.waitForTimeout(200); await p.fill('#fdText','Morning'); await p.click('#fdPost'); await p.waitForTimeout(400);
    ok(sent[2]&&sent[2].action==='post'&&sent[2].as==='me','['+label+'] the composer switch back to the own profile is used for posts');
    const lay=await p.evaluate(()=>{ const c=document.getElementById('fdCompose').getBoundingClientRect(), bs=[...document.querySelectorAll('#fdAs .fdc-ast button')].map(x=>x.getBoundingClientRect()), l=document.querySelector('.fdc-asl').getBoundingClientRect();
      return {inside:bs.every(r=>r.left>=c.left&&r.right<=c.right+0.5), same:Math.abs(bs[0].top-bs[1].top)<1&&Math.abs(bs[0].height-bs[1].height)<1, mid:Math.abs((l.top+l.bottom)/2-(bs[0].top+bs[0].bottom)/2)<2, sw:document.documentElement.scrollWidth<=innerWidth}; });
    ok(lay.inside&&lay.same&&lay.mid&&lay.sw,'['+label+'] the switch fits the card, both buttons level, label centred with them '+JSON.stringify(lay));
    if(process.env.SHOT_DIR){ const e=await p.$('#fdCompose'); await e.screenshot({path:require('path').join(process.env.SHOT_DIR,'as-'+label.replace(/ /g,'_')+'.png')}); }
    ok(!errs.length,'['+label+'] no script errors '+errs.join(' | ')); await p.close();
  }
  await b.close(); console.log(fails?fails+' BROKEN':'ALL OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
