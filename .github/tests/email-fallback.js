// Account emails (create password, login code, reset) must still reach people when Brevo refuses to send
// (for example while Brevo reviews the account): the same secure link goes out through Supabase's own mailer.
// Also: the sign-up endpoint limits how many emails one sender can trigger and ignores bots. Run: node .github/tests/email-fallback.js
const path=require('path'), Module=require('module'); let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
(async()=>{
  process.env.BREVO_API_KEY='test-key';
  global.fetch=async()=>({ok:false,status:403,text:async()=>'{"code":"permission_denied","message":"account under review"}'});
  const calls=[]; const admin={auth:{admin:{generateLink:async({type,email})=>({data:{user:{id:'u1'},properties:{action_link:'https://x/'+type,email_otp:'123456'}}})},
    resetPasswordForEmail:async(email,o)=>{ calls.push(['reset',email,o&&o.redirectTo]); return {data:{}}; },
    signInWithOtp:async(o)=>{ calls.push(['otp',o.email]); return {data:{}}; }}};
  const E=require(path.join(__dirname,'../../api/_lib/passwordEmail.js'));
  const r1=await E.sendPasswordEmail(admin,'paid@x.com',{name:'P'}); ok(r1.via==='supabase' && calls.some(c=>c[0]==='reset'&&c[1]==='paid@x.com'&&/setpw=1/.test(c[2])), 'paid "create your password" email falls back to Supabase with the set-password link');
  await E.sendLoginEmail(admin,'login@x.com',{}); ok(calls.some(c=>c[0]==='otp'&&c[1]==='login@x.com'), 'login code falls back to Supabase');
  await E.sendResetEmail(admin,'reset@x.com',{}); ok(calls.some(c=>c[0]==='reset'&&c[1]==='reset@x.com'), 'password reset falls back to Supabase');
  // when Brevo works, Supabase is not used
  calls.length=0; global.fetch=async()=>({ok:true,status:201,text:async()=>'{}'});
  const r2=await E.sendPasswordEmail(admin,'ok@x.com',{free:true}); ok(r2.via==='brevo' && !calls.length, 'normally the branded Brevo email is used');
  // auth-email: bots and floods
  const orig=Module._load; Module._load=function(req,...a){ if(req==='@supabase/supabase-js') return {createClient:()=>({auth:{admin:{listUsers:async()=>({data:{users:[]}}),generateLink:admin.auth.admin.generateLink},resetPasswordForEmail:admin.auth.resetPasswordForEmail,signInWithOtp:admin.auth.signInWithOtp}})}; return orig.call(this,req,...a); };
  const H=require(path.join(__dirname,'../../api/v1/auth-email.js'));
  const run=async(body,ip)=>{ let code=0, j=null; await H({method:'POST',headers:{'x-forwarded-for':ip},body},{status:c=>{code=c; return {json:x=>{j=x;}};}}); return code; };
  let sent=0; global.fetch=async()=>{ sent++; return {ok:true,status:201,text:async()=>'{}'}; };
  await run({email:'bot@x.com',mode:'signup',website:'http://spam'},'1.1.1.1'); ok(sent===0, 'a bot filling the hidden field gets no email sent');
  const codes=[]; for(let i=0;i<10;i++) codes.push(await run({email:'p'+i+'@x.com',mode:'signup'},'2.2.2.2'));
  ok(codes.slice(0,8).every(c=>c===200) && codes[8]===429 && codes[9]===429 && sent===8, 'one sender can trigger at most 8 account emails an hour ('+codes.join(',')+', sent '+sent+')');
  ok(await run({email:'other@x.com',mode:'signup'},'3.3.3.3')===200, 'other people are not affected by one sender\'s limit');
  Module._load=orig;
  console.log(fails?'FAILED: '+fails:'EMAIL FALLBACK OK'); process.exit(fails?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
