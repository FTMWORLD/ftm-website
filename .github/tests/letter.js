// Monthly Letter from FTM (staff console): drafts, engine figures through the shared FTM.metrics(), one translation per language,
// each member gets it once in their own language, FTM design. Run: node .github/tests/letter.js (site on :8765)
const path=require('path'), Module=require('module'); let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const BASE=process.argv[2]||'http://localhost:8765';
(async()=>{
  process.env.SUPABASE_SERVICE_ROLE_KEY='k'; process.env.SUPABASE_URL='https://x.supabase.co'; process.env.ANTHROPIC_API_KEY='test';
  const files={}, mails=[], now=new Date().toISOString(); let translations=0;
  const users={tokS:{id:'s1',email:'ftmwebnation@gmail.com',email_confirmed_at:now,created_at:now,last_sign_in_at:now},
    tokC:{id:'c1',email:'amelie@x.com',email_confirmed_at:now,created_at:now,user_metadata:{full_name:'Amélie Roux',ftm_lang:'fr'}},
    tokD:{id:'c2',email:'omar@x.com',email_confirmed_at:now,created_at:now,user_metadata:{full_name:'Omar Haddad',ftm_lang:'ar'}},
    tokE:{id:'c3',email:'jo@x.com',email_confirmed_at:now,created_at:now},tokF:{id:'f1',email:'free@x.com',email_confirmed_at:now,created_at:now}};
  const byId=id=>Object.values(users).find(u=>u.id===id);
  const prof={s1:['auto'],c1:['auto'],c2:['auto'],c3:['auto']};
  const fake={createClient:()=>({auth:{getUser:async t=>({data:{user:users[t]||null}}),admin:{getUserById:async id=>({data:{user:byId(id)}}),updateUserById:async()=>({data:{},error:null}),listUsers:async()=>({data:{users:Object.values(users)}})}},
    from:()=>({select:()=>({eq:(c,id)=>({maybeSingle:async()=>({data:{products:prof[id]||[]}})}),range:async()=>({data:Object.keys(prof).map(id=>({id,products:prof[id]}))})})}),
    storage:{getBucket:async()=>({error:null}),createBucket:async()=>({}),from:()=>({download:async p=>files[p]?{data:{text:async()=>files[p]}}:{error:{message:'nf'}},upload:async(p,b)=>{ files[p]=b.toString(); return {error:null}; },remove:async()=>({}),list:async()=>({data:[]})})}})};
  class FakeAnthropic{ constructor(){ this.beta={messages:{create:async o=>{ translations++; const src=JSON.parse(o.messages[0].content), lang=/into ([A-Za-z]+)/.exec(o.system)[1].slice(0,2).toUpperCase(), out={}; Object.keys(src).forEach(k=>{ out[k]=lang+':'+src[k]; }); return {content:[{type:'text',text:JSON.stringify(out)}]}; }}}; } }
  const orig=Module._load; Module._load=function(r,...a){ if(r==='@supabase/supabase-js') return fake; if(r==='@anthropic-ai/sdk') return FakeAnthropic; if(r==='web-push') return {setVapidDetails(){},sendNotification:async()=>({})}; if(/_lib\/engineClient$/.test(r)) return {callEngine:async()=>({ok:true,status:200,body:{}})}; return orig.call(this,r,...a); };
  const Mail=require(path.join(__dirname,'../../api/_lib/mail.js')); Mail.sendMail=async m=>{ mails.push(m); return 'test'; };
  const SH=require(path.join(__dirname,'../../api/v1/staff.js'));
  const sc=(tok,body)=>new Promise(res=>{ const r={s:0,setHeader(){},status(c){this.s=c;return this;},json(j){res([this.s,j]);},end(){res([this.s,null]);}}; SH({method:'POST',headers:{authorization:'Bearer '+tok},body},r); });
  let r=await sc('tokC',{op:'letter_list'}); ok(r[0]===403,'customers cannot open letters');
  r=await sc('tokS',{op:'letter_save',month:'2026-10',title:'',intro:''}); ok(r[1].error==='LETTER_INCOMPLETE','a letter needs a headline and a word to members');
  const L0={op:'letter_save',month:'2026-10',title:'October: a steady month',intro:'FTM MACHINE had a calm month.\n\nHere is what happened.',did:'It closed 142 trades.',changed:'We now keep trading through broker maintenance.',next:'More markets.',sign:'Gospel',figs:{month_pct:4.2137,ytd_pct:38.1,trades:142,win_pct:61.3,account:'900',at:now}};
  r=await sc('tokS',L0); const L=r[1].letter; ok(r[0]===200&&L.id&&L.v===1&&L.status==='draft'&&L.figs.trades===142,'draft saved with its engine figures');
  r=await sc('tokS',Object.assign({},L0,{id:L.id})); ok(r[1].letter.v===1,'saving without changes keeps the translations valid');
  r=await sc('tokS',{op:'letter_list'}); ok(r[1].items.length===1&&r[1].items[0].title==='October: a steady month','letters archive lists it');
  r=await sc('tokS',{op:'letter_langs',id:L.id,segment:'paying'}); const lg={}; (r[1].langs||[]).forEach(x=>{ lg[x.lang]=x; });
  ok(r[1].total===4&&lg.fr&&lg.fr.members===1&&!lg.fr.ready&&lg.ar&&lg.en&&lg.en.ready&&lg.en.members===2,'languages of the members are known (French, Arabic, English) '+JSON.stringify(r[1].langs));
  r=await sc('tokS',{op:'letter_preview',id:L.id,lang:'en'}); const h=r[1].html||'';
  ok(/Letter from FTM: October 2026/.test(r[1].subject)&&/\+4\.21%/.test(h)&&/\+38\.10%/.test(h)&&/142/.test(h)&&/61%/.test(h)&&/What changed and why/.test(h)&&/Invest today, secure tomorrow\./.test(h)&&/email-logo\.png/.test(h)&&/open=calendar/.test(h)&&!/trader/i.test(h),'English preview: figures, sections, FTM footer and logo, link to the member\'s own month');
  r=await sc('tokS',{op:'letter_translate',id:L.id,lang:'fr'}); ok(r[0]===200&&!r[1].cached&&translations===1,'translated into French once');
  r=await sc('tokS',{op:'letter_translate',id:L.id,lang:'fr'}); ok(r[1].cached&&translations===1,'the French translation is reused, not paid for twice');
  await sc('tokS',{op:'letter_translate',id:L.id,lang:'ar'});
  r=await sc('tokS',{op:'letter_preview',id:L.id,lang:'ar'}); ok(r[1].ready&&/dir="rtl"/.test(r[1].html)&&/AR:What FTM MACHINE did/.test(r[1].html),'Arabic reads right to left');
  r=await sc('tokS',{op:'letter_send',id:L.id,segment:'paying',dry:true}); ok(r[1].total===4&&r[1].left===4&&mails.length===0,'dry run counts without sending');
  r=await sc('tokS',{op:'letter_send',id:L.id,segment:'paying'}); const to=m=>mails.find(x=>x.to===m)||{};
  ok(r[1].sent===4&&r[1].left===0&&mails.length===4,'sent to every paying member');
  ok(/^FR:Letter from FTM/.test(to('amelie@x.com').subject)&&/FR:Hello Amélie,/.test(to('amelie@x.com').html),'the French member gets it in French, with her first name');
  ok(/^AR:/.test(to('omar@x.com').subject)&&/^Letter from FTM: October 2026$/.test(to('jo@x.com').subject),'Arabic for the Arabic member, English for the rest');
  ok(!mails.some(m=>m.to==='free@x.com'),'free accounts are not in the paying group');
  r=await sc('tokS',{op:'letter_send',id:L.id,segment:'paying'}); ok(mails.length===4&&r[1].left===0,'sending again sends nobody a second copy');
  r=await sc('tokS',Object.assign({},L0,{id:L.id,title:'Changed after sending'})); ok(r[0]===409,'a sent letter cannot be changed');
  r=await sc('tokS',{op:'letter_list'}); ok(r[1].items[0].status==='sent'&&r[1].items[0].sent.sent===4,'archive shows it as sent to 4');
  r=await sc('tokS',{op:'log'}); ok(r[1].items.some(x=>x.op==='letter_send'),'the send is in the staff activity log');
  // a changed draft needs a new translation
  r=await sc('tokS',Object.assign({},L0,{title:'November'})); const L2=r[1].letter; await sc('tokS',{op:'letter_translate',id:L2.id,lang:'fr'}); const t1=translations;
  r=await sc('tokS',Object.assign({},L0,{id:L2.id,title:'November, edited'})); r=await sc('tokS',{op:'letter_langs',id:L2.id,segment:'paying'}); ok(r[1].langs.find(x=>x.lang==='fr').ready===false&&t1===translations,'editing a draft marks its translations as out of date');
  r=await sc('tokS',{op:'letter_delete',id:L2.id}); r=await sc('tokS',{op:'letter_list'}); ok(r[1].items.length===1,'a draft can be deleted');
  // browser: the Letter tab, figures from the shared calculation
  let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
  const b=await pw.chromium.launch();
  for(const [label,vp] of [['laptop',{width:1280,height:900}],['phone',{width:390,height:844}],['small phone',{width:360,height:740}]]){
    const p=await b.newPage({viewport:vp}); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const sent=[]; p.on('dialog',d=>d.accept());
    let saved=null;
    await p.route('**/api/v1/**',async rt=>{ const u=new URL(rt.request().url()), pd=rt.request().postData()||''; const J=(st,o)=>rt.fulfill({status:st,contentType:'application/json',body:JSON.stringify(o)});
      if(u.pathname==='/api/v1/community'&&/"action":"staff"/.test(pd)){ const o=JSON.parse(pd); sent.push('c:'+o.op); return J(200,{check:{ok:true,staff:true,role:'owner'},post:{ok:true,posted:'p1'}}[o.op]||{ok:true}); }
      if(u.pathname==='/api/v1/staff'){ const o=JSON.parse(pd); sent.push('s:'+o.op+(o.lang?':'+o.lang:''));
        if(o.op==='dashboard') return J(200,{ok:false,error:'X'});
        if(o.op==='letter_list') return J(200,{ok:true,items:saved?[{id:'lt1',month:saved.month,title:saved.title,status:'draft',at:now}]:[]});
        if(o.op==='letter_save'){ saved=Object.assign({},o,{id:'lt1',v:1,status:'draft'}); return J(200,{ok:true,letter:saved}); }
        if(o.op==='letter_preview') return J(200,{ok:true,lang:o.lang,ready:o.lang!=='de',subject:'Letter from FTM: '+saved.month,html:'<p id="pv">'+saved.title+' '+(saved.figs.month_pct)+'</p>'});
        if(o.op==='letter_langs') return J(200,{ok:true,total:3,langs:[{lang:'en',name:'English',members:2,ready:true},{lang:'fr',name:'French',members:1,ready:!!global.frDone}]});
        if(o.op==='letter_translate'){ global.frDone=true; return J(200,{ok:true,lang:o.lang,cached:false}); }
        if(o.op==='letter_send') return J(200,{ok:true,total:3,sent:3,failed:0,left:0,langs:{en:2,fr:1}});
        if(o.op==='letter_get') return J(200,{ok:true,letter:{id:'auto1',month:'2026-10',title:'October in profit',intro:'Hi.',status:'scheduled',auto:true,send_at:'2026-11-02T09:00:00.000Z',figs:{month_pct:3.95,ytd_pct:6.03,trades:2,win_pct:50},v:1}});
        if(o.op==='letter_hold') return J(200,{ok:true,letter:{id:'auto1',month:'2026-10',title:'October in profit',intro:'Hi.',status:'scheduled',held:!!o.hold,auto:true,send_at:'2026-11-02T09:00:00.000Z',figs:{},v:1}});
        if(o.op==='broadcast') return J(200,{ok:true,id:'b1',total:3,sent:2,failed:0,left:0});
        return J(200,{ok:true}); }
      if(u.pathname==='/api/v1/fx') return J(200,{ok:true,rates:{USD:1,EUR:.9}});
      if(/\/customer\/accounts$/.test(u.pathname)) return J(200,{ok:true,accounts:[]});
      return J(404,{ok:false}); });
    global.frDone=false;
    await p.goto(BASE+'/'); await p.waitForTimeout(800);
    await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'ftmwebnation@gmail.com',products:['auto'],name:'Gospel Owner'};});
    await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto'))).catch(()=>{}); await p.waitForTimeout(3500);
    // a master account with a known history, read through the same FTM.metrics() as every dashboard
    const exp=await p.evaluate(()=>{ const F=window.FTM, d=t=>new Date(t).getTime(), T=(o,c,pl)=>({openTime:d(o),closeTime:d(c),pl:pl,lots:.1,symbol:'XAUUSD',commission:0,swap:0});
      F.data.accounts=[{number:'900',accountId:'m1',isMaster:true,currency:'USD',balance:11000,equity:11000,floating:0,active:true}]; F.viewNum='900';
      F.data.account={currency:'USD',deposits:10000,withdrawals:0}; F.data.open=[]; F.data.flows=[{t:d('2026-01-02'),amt:10000}];
      F.data.closed=[T('2026-03-01','2026-03-02',500),T('2026-10-03','2026-10-04',400),T('2026-10-10','2026-10-11',-100),T('2026-10-20','2026-10-21',200),T('2026-11-02','2026-11-03',0)];
      F.data.engineStats={accountId:'m1',flows:F.data.flows}; F.viewAccount=function(){}; F.refreshing=false; if(F.metricsFresh) F.metricsFresh();
      const M=F.metrics(), a=new Date(2026,9,1).getTime(), z=new Date(2026,10,1).getTime(); return {m:M.seg(a,z).pct,y:M.seg(new Date(2026,0,1).getTime(),z).pct}; });
    await p.click('#appView .nav-staff'); await p.waitForTimeout(300);
    if(!(await p.isVisible('.stf-tabs [data-t="letter"]'))) await p.click('#stfMenu'); await p.click('.stf-tabs [data-t="letter"]'); await p.waitForTimeout(500);
    ok(await p.isVisible('#ltTitle')&&/FTM master account 900/.test(await p.textContent('#ltAcct')),'['+label+'] Letter tab opens with the master account as the figures source');
    await p.selectOption('#ltMonth','2026-10').catch(()=>{});
    const hasOct=await p.evaluate(()=>[...document.querySelectorAll('#ltMonth option')].some(o=>o.value==='2026-10'));
    if(hasOct){ await p.click('#ltRead'); await p.waitForTimeout(700); 
      const figs=await p.evaluate(()=>[...document.querySelectorAll('#ltFigs b')].map(b=>b.textContent));
      const fmt=v=>(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(2)+'%';
      ok(figs[0]===fmt(exp.m)&&figs[1]===fmt(exp.y)&&figs[2]==='3'&&figs[3]==='67%','['+label+'] figures come from the shared calculation: '+figs.join(' | ')+' expected '+fmt(exp.m)+' '+fmt(exp.y)); }
    else ok(true,'['+label+'] (October 2026 is outside the 13-month list today; figures check skipped)');
    await p.click('#ltDraft'); ok(/closed 3 trades/.test(await p.inputValue('#ltDid'))&&(await p.inputValue('#ltTitle')).length>3,'['+label+'] first draft written from the figures');
    await p.fill('#ltIntro','A calm month.'); await p.click('#ltSave'); await p.waitForTimeout(600);
    ok(/Saved/.test(await p.textContent('#ltOut'))&&sent.includes('s:letter_preview:en')&&/French/.test(await p.textContent('#ltLangs')),'['+label+'] saved, preview and member languages shown');
    await p.click('#ltSend'); await p.waitForTimeout(1500);
    ok(sent.includes('s:letter_translate:fr')&&sent.includes('s:letter_send')&&sent.includes('c:post')&&sent.includes('s:broadcast')&&/✓ Sent\. 3 emails/.test(await p.textContent('#ltSOut')),'['+label+'] send: translates missing languages first, emails, FTM news post, phone notification '+(await p.textContent('#ltSOut')));
    await p.evaluate(()=>{ const b=document.createElement('button'); b.dataset.id='auto1'; document.querySelector('#ltList').appendChild(b); b.click(); }); await p.waitForTimeout(500);
    ok(/Goes out automatically/.test(await p.textContent('#ltSch'))&&await p.isVisible('#ltHold'),'['+label+'] an automatic letter shows when it goes out, with Hold');
    await p.click('#ltHold'); await p.waitForTimeout(400); ok(/On hold/.test(await p.textContent('#ltSch'))&&sent.includes('s:letter_hold'),'['+label+'] Hold stops it');
    const lay=await p.evaluate(()=>{ const v=document.querySelector('.app-view[data-view="staff"]'), W=document.documentElement.clientWidth; let over=[]; v.querySelectorAll('[data-p="letter"] *').forEach(e=>{ const r=e.getBoundingClientRect(); if(r.width&&r.right>W+1) over.push(e.tagName+'.'+e.className); }); return {over:over.slice(0,4),sw:document.documentElement.scrollWidth,W}; });
    ok(!lay.over.length&&lay.sw<=lay.W,'['+label+'] nothing wider than the screen '+JSON.stringify(lay));
    if(process.env.SHOT_DIR){ const hgt=await p.evaluate(()=>Math.min(6000,Math.ceil(document.querySelector('.app-view[data-view="staff"] .stf-main').getBoundingClientRect().height)+200)); await p.setViewportSize({width:vp.width,height:hgt}); await p.waitForTimeout(300); await p.screenshot({path:path.join(process.env.SHOT_DIR,'letter-'+label.replace(/ /g,'_')+'.png')}); }
    ok(!errs.length,'['+label+'] no script errors '+errs.join(' | '));
    await p.close();
  }
  await b.close();
  console.log(fails?fails+' BROKEN':'ALL OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
