// Leaderboard → Community: a leaderboard name opens that member's Community profile (follow / message). Run: node .github/tests/leaderboard-community.js
const Module=require('module'); const orig=Module._load;
const files={}, users={'tokA':{id:'00000000-0000-4000-8000-00000000000a',email:'a@x.io'},'tokB':{id:'00000000-0000-4000-8000-00000000000b',email:'b@x.io'},'tokC':{id:'00000000-0000-4000-8000-00000000000c',email:'c@x.io'},'tokD':{id:'00000000-0000-4000-8000-00000000000d',email:'d@x.io'}};
const paid={'00000000-0000-4000-8000-00000000000a':['auto'],'00000000-0000-4000-8000-00000000000b':['auto'],'00000000-0000-4000-8000-00000000000c':['auto'],'00000000-0000-4000-8000-00000000000d':['auto']};
const lbNick={'00000000-0000-4000-8000-00000000000a':'Tanaya','00000000-0000-4000-8000-00000000000b':'G-Marine','00000000-0000-4000-8000-00000000000c':'Tanaya','00000000-0000-4000-8000-00000000000d':'member_fff2'};
const fake={createClient:()=>({auth:{getUser:async t=>({data:{user:users[t]||null}}),admin:{listUsers:async()=>({data:{users:Object.values(users)}})}},
  from:()=>({select:()=>({eq:(c,id)=>({maybeSingle:async()=>({data:{products:paid[id]||[]}})}),range:async()=>({data:Object.keys(paid).map(id=>({id,products:paid[id]}))})})}),
  storage:{getBucket:async()=>({error:null}),createBucket:async()=>({}),from:()=>({download:async p=>files[p]?{data:{text:async()=>files[p].toString()}}:{error:{message:'nf'}},upload:async(p,b)=>{files[p]=b.toString();return {error:null};},remove:async()=>({}),list:async()=>({data:[]}),createSignedUrl:async()=>({data:{signedUrl:'x'}})})}})};
let engineCalls=0;
const engine={callEngine:async(path,o)=>{ engineCalls++; if(path!=='/api/v1/customer/leaderboard/profile') throw new Error('unexpected '+path); return {ok:true,status:200,body:{ok:true,profile:{nickname:lbNick[o.authSubject]}}}; }};
Module._load=function(r,...a){ if(r==='@supabase/supabase-js') return fake; if(/_lib\/engineClient$/.test(r)) return engine; if(/_lib\/push$/.test(r)) return {send:async()=>0}; return orig.call(this,r,...a); };
process.env.SUPABASE_SERVICE_ROLE_KEY='x';
const h=require(require('path').join(__dirname,'../../api/v1/community.js'));
const call=(tok,body)=>new Promise(res=>{ const r={s:0,setHeader(){},status(c){this.s=c;return this;},json(j){res([this.s,j]);},end(){res([this.s,null]);}}; h({method:'POST',headers:{authorization:'Bearer '+tok},body},r); });
let fails=0; const ok=(c,m)=>{ console.log((c?'OK   ':'FAIL ')+m); if(!c) fails++; };
(async()=>{
  let r=await call('tokA',{action:'lbsync'}); ok(r[0]===200&&r[1].synced===false,'no Community profile yet: nothing to sync');
  await call('tokA',{action:'me'}); await call('tokB',{action:'me'});
  r=await call('tokA',{action:'lbsync'}); ok(r[1].synced&&r[1].nickname==='Tanaya','an automatic Community name takes the leaderboard nickname (verified with the engine, not the browser)');
  r=await call('tokB',{action:'save',nickname:'Marine',visible:true}); ok(r[0]===200,'G-Marine chose her own Community name');
  r=await call('tokB',{action:'lbsync'}); ok(r[1].nickname==='Marine','a name the member chose is never overwritten');
  r=await call('tokA',{action:'find',nickname:'g-marine'}); ok(r[0]===200&&r[1].member&&r[1].member.nickname==='Marine'&&r[1].member.mid,'clicking G-Marine on the leaderboard finds her Community profile (any case)');
  const mB=r[1].member.mid;
  r=await call('tokA',{action:'follow',mid:mB}); ok(r[0]===200,'and she can be followed from there');
  r=await call('tokA',{action:'send',mid:mB,text:'Congrats on #3!'}); ok(r[0]===200,'and messaged');
  r=await call('tokB',{action:'find',nickname:'Tanaya'}); ok(r[0]===200&&r[1].member&&r[1].member.nickname==='Tanaya','a Community name equal to the leaderboard name is found too');
  r=await call('tokA',{action:'find',nickname:'Tanaya'}); ok(r[1].self===true,'clicking your own name is recognised as you');
  await call('tokC',{action:'me'}); r=await call('tokC',{action:'lbsync'}); ok(r[1].nickname!=='Tanaya','a name already used in Community is not taken twice');
  r=await call('tokA',{action:'find',nickname:'nobody_here'}); ok(r[0]===404&&r[1].error==='NOT_FOUND','an unknown name gives NOT_FOUND (the site shows a short message)');
  await call('tokB',{action:'save',nickname:'Marine',visible:false}); r=await call('tokC',{action:'find',nickname:'G-Marine'}); ok(r[0]===404,'a hidden profile is not opened from the leaderboard');
  r=await call('tokA',{action:'find',nickname:'member_fff2'}); ok(r[0]===200&&r[1].member&&r[1].member.mid,'a paying member who never opened the site is still found from the leaderboard (engine asked server to server)');
  const before=engineCalls; r=await call('tokB',{action:'find',nickname:'member_FFF2'}); ok(r[0]===200&&engineCalls===before,'the name map is reused (no engine calls for the next click)');
  r=await call('tokA',{action:'find',nickname:'ghost_name'}); ok(r[0]===404,'a name no member has is still NOT_FOUND');
  const fs=require('fs'), html=fs.readFileSync(require('path').join(__dirname,'../../index.html'),'utf8');
  ok(/data-cm="'\+esc\(e\.nickname\)/.test(html)&&/openMemberByNick\(cm\.getAttribute\('data-cm'\)\)/.test(html),'leaderboard cards and names carry the member link');
  ok(/var ck=!e\.is_you&&!e\.is_master/.test(html),'your own row and the FTM MASTER row are not links');
  ok(/\[data-peek\],\[data-cm\]/.test(html),'on the phone, tapping the name opens the profile instead of folding the row');
  ok(/\.lb-cm\{cursor:pointer\}/.test(html)&&!/\.lb-cm\{[^}]*underline/.test(html),'leaderboard names are not underlined (clickable without a mark)');
  console.log(fails?'FAILED: '+fails:'LEADERBOARD-COMMUNITY OK'); process.exit(fails?1:0);
})();
