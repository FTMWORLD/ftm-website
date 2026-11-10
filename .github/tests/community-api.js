// Community service: two members find each other, follow, message, block; rules for names, links and free accounts. Run: node .github/tests/community-api.js
const Module=require('module'); const orig=Module._load;
const files={}, users={'tokA':{id:'00000000-0000-4000-8000-00000000000a'},'tokB':{id:'00000000-0000-4000-8000-00000000000b'},'tokF':{id:'00000000-0000-4000-8000-00000000000f'}};
const paid={'00000000-0000-4000-8000-00000000000a':['auto'],'00000000-0000-4000-8000-00000000000b':['auto']};
const fake={createClient:()=>({auth:{getUser:async t=>({data:{user:users[t]||null}})},
  from:()=>({select:()=>({eq:(c,id)=>({maybeSingle:async()=>({data:{products:paid[id]||[]}})})})}),
  storage:{getBucket:async()=>({error:null}),createBucket:async()=>({}),from:()=>({download:async p=>files[p]?{data:{text:async()=>files[p]}}:{error:{message:'nf'}},upload:async(p,b)=>{files[p]=b.toString();return {};}})}})};
Module._load=function(r,...a){ if(r==='@supabase/supabase-js') return fake; return orig.call(this,r,...a); };
process.env.SUPABASE_SERVICE_ROLE_KEY='x';
const h=require(require('path').join(__dirname,'../../api/v1/community.js'));
const call=(tok,body)=>new Promise(res=>{ const r={s:0,status(c){this.s=c;return this;},json(j){res([this.s,j]);},end(){res([this.s,null]);}}; h({method:'POST',headers:{authorization:'Bearer '+tok},body},r); });
let fails=0; const ok=(c,m)=>{ console.log((c?'OK   ':'FAIL ')+m); if(!c) fails++; };
(async()=>{
  let r=await call('tokA',{action:'me'}); ok(r[1].profile.nickname===''&&r[1].profile.visible===false,'new member starts with an empty, hidden profile');
  r=await call('tokA',{action:'save',nickname:'Tanaya',bio:'Hi all',country:'de',visible:true}); ok(r[0]===200,'Tanaya saves her profile');
  r=await call('tokB',{action:'save',nickname:'tanaya',visible:true}); ok(r[0]===409&&r[1].error==='NICKNAME_TAKEN','nickname is unique (any case)');
  r=await call('tokB',{action:'save',nickname:'FTM-TRADES',visible:true}); ok(r[1].error==='NICKNAME_RESERVED','FTM names are reserved');
  r=await call('tokB',{action:'save',nickname:'Marine',bio:'visit www.x.com',visible:true}); ok(r[1].error==='NO_LINKS','no links in a bio');
  r=await call('tokB',{action:'save',nickname:'Marine',bio:'Gold fan',visible:true}); ok(r[0]===200,'Marine saves her profile');
  r=await call('tokA',{action:'members'}); ok(r[1].members.length===1&&r[1].members[0].nickname==='Marine','Tanaya sees Marine in Discover');
  const mB=r[1].members[0].mid; r=await call('tokB',{action:'members'}); const mA=r[1].members[0].mid; ok(r[1].members[0].nickname==='Tanaya','Marine sees Tanaya');
  ok(!/0000/.test(mA),'members are addressed by an opaque id, never the login id');
  r=await call('tokA',{action:'follow',mid:mB}); r=await call('tokB',{action:'members'}); ok(r[1].members[0].followers===0,'follower count: Tanaya has none');
  r=await call('tokA',{action:'members'}); ok(r[1].members[0].following===true&&r[1].members[0].followers===1,'Tanaya follows Marine (1 follower)');
  r=await call('tokA',{action:'send',mid:mB,text:'Hello Marine!'}); ok(r[0]===200,'Tanaya messages Marine');
  r=await call('tokA',{action:'send',mid:mB,text:'call me +49 151 2345 6789'}); ok(r[1].error==='NO_LINKS','no phone numbers or links in messages');
  r=await call('tokB',{action:'threads'}); ok(r[1].threads.length===1&&r[1].threads[0].unread&&r[1].threads[0].last==='Hello Marine!','Marine sees the new message as unread');
  r=await call('tokB',{action:'messages',mid:mA}); ok(r[1].messages.length===1&&r[1].messages[0].from==='them','Marine opens the conversation');
  r=await call('tokB',{action:'threads'}); ok(!r[1].threads[0].unread,'opening marks it read');
  r=await call('tokB',{action:'send',mid:mA,text:'Hi Tanaya'}); r=await call('tokA',{action:'messages',mid:mB}); ok(r[1].messages.map(x=>x.from).join()==='me,them','Tanaya sees the reply in order');
  r=await call('tokF',{action:'save',nickname:'FreeUser',visible:true}); r=await call('tokF',{action:'members'}); ok(r[1].members.length===2,'a free member can browse');
  r=await call('tokF',{action:'send',mid:mA,text:'hey'}); ok(r[0]===403&&r[1].error==='READ_ONLY','a free member cannot send messages');
  r=await call('tokB',{action:'block',mid:mA}); r=await call('tokA',{action:'members'}); ok(!r[1].members.some(m=>m.nickname==='Marine'),'after Marine blocks Tanaya, they no longer see each other');
  r=await call('tokA',{action:'send',mid:mB,text:'still there?'}); ok(r[0]===404,'and Tanaya cannot message her');
  r=await call('tokA',{action:'save',nickname:'Tanaya',visible:false}); r=await call('tokF',{action:'members'}); ok(!r[1].members.some(m=>m.nickname==='Tanaya'),'a hidden profile disappears from Discover');
  r=await call('bad',{action:'me'}); ok(r[0]===401,'no login, no access');
  console.log(fails?'FAILED: '+fails:'COMMUNITY OK'); process.exit(fails?1:0);
})();
