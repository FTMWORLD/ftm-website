// Client-area button test with a simulated engine. Every button must send the right request
// and show the right result. Run: node .github/tests/buttons.js [baseUrl]
let pw; try{pw=require('playwright');}catch(e){pw=require('/opt/node-tools/node_modules/playwright');}
const {chromium}=pw; const BASE=process.argv[2]||'http://localhost:8765';
(async()=>{const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});const p=await b.newPage({viewport:{width:1280,height:900}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));let calls=[];let riskTries=0;const gone=new Set();let failNext=null;
const accts=()=>({ok:true,account_limit:{max:3,used:2},accounts:[
 {account_id:'acc-B',account_number:'202459643',name:'DERIV',server:'Deriv-Demo',currency:'EUR',balance:'7747.72',equity:'7747.72',display_status:'PAUSED',status_reason:'PAUSED',is_trading:false,risk_tier:'BALANCED',trade_mode:'DEMO'},
 {account_id:'acc-A',account_number:'5739503',name:'DERIV',server:'Deriv-Demo',currency:'USD',balance:'11158.46',equity:'11160.00',display_status:'ACTIVE',status_reason:'OK',is_trading:true,risk_tier:'BALANCED',open_positions:1,floating_profit:'23.40',trade_mode:'DEMO'}].filter(a=>!gone.has(a.account_id))});
await p.route('**/api/v1/**',async r=>{const u=new URL(r.request().url()),m=r.request().method(),path=u.pathname;const pd=r.request().postData();
 const j=(st,o)=>{calls.push(m+' '+path.replace('/api/v1/customer','')+(pd&&!/password/.test(pd)?' '+pd:'')+' -> '+st+' '+JSON.stringify(o).slice(0,90));return r.fulfill({status:st,contentType:'application/json',body:JSON.stringify(o)});};
 if(path.endsWith('/chat'))return j(200,{ok:true,reply:'Hello, how can I help?'});
 if(failNext&&m!=='GET'){const f=failNext;failNext=null;return j(f[0],f[1]);}
 if(path.endsWith('/customer/accounts')&&m==='GET')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(accts())});
 if(path.endsWith('/customer/accounts')&&m==='POST'){const n=JSON.parse(pd).account_number;return n==='53131445'?j(409,{ok:false,error:'MASTER_ACCOUNT',message:'This is the FTM master account. It cannot be added as a copy account.'}):j(202,{ok:true,account_id:'acc-N',status:'SETUP_INCOMPLETE'});}
 if(path.endsWith('/history'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,trades:[],page:{offset:0,limit:200,total:0}})});
 if(path.endsWith('/positions'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,positions:[{position_ref:'P1',symbol:'USTEC',market:'US Tech 100',side:'BUY',volume:'0.10',open_price:'21000',opened_at:new Date().toISOString()}]})});
 if(path.endsWith('/risk_tier')){riskTries++;return riskTries===1?j(409,{ok:false,error:'GROWTH_ACKNOWLEDGEMENT_REQUIRED',acknowledgement_text:'I accept larger swings with Growth.'}):j(200,{ok:true});}
 if(m==='DELETE'){gone.add(path.split('/').pop());return j(200,{ok:true,removed:true});}
 if(/\/(pause|resume|activate)$/.test(path))return j(200,{ok:true,changed:true});
 if(path.endsWith('/close'))return j(202,{ok:true,requested:true});
 if(path.endsWith('/billing'))return j(200,{status:'ACTIVE',period_end:'2027-12-01T00:00:00Z'});
 if(path.endsWith('/me'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});
 return r.fulfill({status:404,contentType:'application/json',body:'{"ok":false}'});});
let dialogs=[];p.on('dialog',d=>{dialogs.push(d.message().slice(0,110));d.accept();});
await p.goto(BASE+'/');await p.waitForTimeout(800);
await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>{window.__out=1;return Promise.resolve();}});F.session={email:'test@ftm.com',products:['auto'],name:'Test'};});
await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto')));await p.waitForTimeout(1500);
const T=[];
async function step(name,fn,screen,expect){calls=[];dialogs=[];try{await fn();}catch(e){T.push([name,'TEST ERROR '+e.message.split('\n')[0]]);return;}await p.waitForTimeout(1800);const req=calls.filter(c=>!/^GET \/(accounts|.*history|.*positions|me)\b/.test(c)).join(' ; ')||'(no request)';const scr=screen?await screen():'';const all=req+' '+dialogs.join(' | ')+' '+scr;
 const bad=(expect||[]).filter(x=>!all.includes(x));T.push([(bad.length?'BROKEN ':'OK ')+name,req,'dialogs: '+(dialogs.join(' | ')||'-'),'screen: '+scr].concat(bad.length?['MISSING: '+bad.join(' / ')]:[]));if(bad.length)fails++;}
let fails=0;
const nav=v=>p.evaluate(v=>document.querySelector('.app-nav-item[data-view="'+v+'"]').click(),v);
const menu=async(i,sel)=>{await nav('accounts');await p.waitForTimeout(400);await p.click('#acctRows [data-menu-toggle="'+i+'"]');await p.waitForTimeout(200);await p.click('#acctRows ['+sel+'="'+i+'"]');};
const rows=()=>p.evaluate(()=>[...document.querySelectorAll('#acctRows tr')].map(r=>(r.querySelector('.conn')||{}).textContent).join(' / '));
const cmsg=()=>p.evaluate(()=>document.getElementById('appConnectMsg').textContent);
async function addAcct(n){await nav('metrics');await p.waitForTimeout(300);await p.click('#appBroker');await p.fill('#appBroker','Deriv-Demo');await p.keyboard.press('Enter');await p.fill('#appAcct',n);await p.fill('#appPass','secret');await p.click('#appConnect');}
await step('Add account (master 53131445)',()=>addAcct('53131445'),cmsg,['POST /accounts','This is the FTM master account']);
await step('Add account (normal)',()=>addAcct('40123456'),cmsg,['-> 202','Connecting']);
await step('Pause trading (row menu)',()=>menu(1,'data-pause'),rows,['POST /accounts/acc-A/pause {}']);
await step('Pause and close all trades',()=>menu(1,'data-pauseclose'),rows,['close_open']);
await step('Trade on this account (switch)',()=>menu(0,'data-switch'),rows,['/acc-B/activate']);
await step('Change risk profile to Growth',async()=>{await menu(1,'data-risk');await p.selectOption('#rkTier','GROWTH');await p.click('#rkSave');await p.waitForTimeout(800);await p.check('#rkAck');await p.click('#rkSave');},()=>p.evaluate(()=>'modal '+(document.querySelector('.rk-back').hidden?'closed':'open')),['growth_acknowledged":true} -> 200','modal closed']);
await step('Pause button (top)',async()=>{await nav('metrics');await p.waitForTimeout(300);await p.evaluate(()=>document.getElementById('pauseTradingBtn').click());},()=>p.evaluate(()=>document.getElementById('pauseTradingBtn').textContent));
await step('Close trade',async()=>{await nav('metrics');await p.waitForTimeout(300);await p.evaluate(()=>document.querySelector('#mOpenRows .pos-close').click());},null,['/positions/P1/close','Close requested']);
await step('Billing status',()=>p.evaluate(()=>document.getElementById('billingBtn').click()),null,['GET /billing','Plan status: Active']);
failNext=[409,{ok:false,error:'ACCOUNT_BUSY',message:'This account is being updated by FTM. Try again after the update finishes.'}];
await step('Pause with engine refusal',()=>menu(1,'data-pause'),null,['This account is being updated by FTM']);
failNext=[500,{ok:false,error:'INTERNAL_SERVER_ERROR'}];
await step('Remove with engine 500',()=>menu(0,'data-remove'),rows,['(INTERNAL_SERVER_ERROR)']);
await step('Remove account',async()=>{await menu(0,'data-remove');await p.waitForTimeout(5500);},rows,['DELETE /accounts/acc-B -> 200']);
await step('Log out',()=>p.evaluate(()=>document.getElementById('appLogout').click()),()=>p.evaluate(()=>'area hidden '+document.getElementById('appView').closest('.app').hidden),['area hidden true']);
await step('Ask here chat send',async()=>{await p.evaluate(()=>{document.getElementById('appView').closest('.app').hidden=false;document.querySelector('#acctA .um-ai').click();});await p.waitForTimeout(800);await p.fill('#fcText','hi');await p.keyboard.press('Enter');},()=>p.evaluate(()=>[...document.querySelectorAll('.fc-m')].map(m=>m.textContent.slice(0,30)).join(' | ')),['POST /api/v1/chat','Hello, how can I help?']);
for(const r of T)console.log('\n# '+r.join('\n   '));console.log('\nPAGE ERRORS',errs.join('|')||'none');if(errs.length)fails++;
console.log(fails?'\nFAILED: '+fails+' problem(s)':'\nALL BUTTONS OK');await b.close();process.exit(fails?1:0);})();
