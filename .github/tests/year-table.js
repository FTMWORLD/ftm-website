// Year by year (Performance): a classic statement table. Seven columns on one header line, no "-$0.00", dividends shown under End,
// phone rows show year, return and end balance. Run: node .github/tests/year-table.js (site on :8765). Fixture from audit-master.js.
let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
const DIV=process.env.YT_DIV!=='0';
const {chromium}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();const fs=require('fs');
const H=36e5, t0=Date.UTC(2026,10,4,11,7);
const tr=[[+2,'XAUUSD','BUY',1.0,850.20,-7,0],[+5,'XAUUSD','SELL',1.0,1210.55,-7,-3.2],[+20,'XAUUSD','BUY',1.0,-640.10,-7,0],[+30,'US500','BUY',2.0,980.30,-6,-1.1],[+38,'XAUUSD','SELL',1.0,190.00,-7,0],
 [+44,'XAUUSD','BUY',1.5,-2950.40,-10.5,-4.0],[+50,'US500','SELL',2.0,-3120.75,-6,0],[+60,'XAUUSD','BUY',1.0,-2105.00,-7,-2.5],[+75,'XAUUSD','SELL',1.0,1876.20,-7,0],[+90,'BTCUSD','BUY',0.5,2450.00,-5,0],[+100,'XAUUSD','BUY',1.0,920.40,-7,-1.8]];
const hist=[{type:'BALANCE',entry:'IN',time:new Date(t0).toISOString(),profit:100000,net:100000}];if(DIV) hist.push({type:'DIVIDEND',time:new Date(t0+H*40).toISOString(),profit:12.64,net:12.64});const copies=[];let bal=100000,peak=100000,maxdd=0,pl=0;
tr.forEach(([h,sym,side,vol,p,c,sw],i)=>{const tc=t0+h*H, to=tc-45*60e3;
 hist.push({type:side,entry:'IN',position_ref:'P'+i,time:new Date(to).toISOString(),symbol:sym,volume:vol,price:1,profit:0,commission:c/2,swap:0,fee:0,net:c/2});
 hist.push({type:side==='BUY'?'SELL':'BUY',entry:'OUT',position_ref:'P'+i,time:new Date(tc).toISOString(),symbol:sym,volume:vol,price:1,profit:p,commission:c/2,swap:sw,fee:0,net:p+c/2+sw});
 bal+=p+c+sw; pl+=p+c+sw; if(bal>peak)peak=bal; maxdd=Math.max(maxdd,(peak-bal)/peak*100);
 copies.push({execution_id:'e'+i,symbol:sym,market:sym,side,volume:String(vol),open_price:'1',close_price:'1',opened_at:new Date(to).toISOString(),closed_at:new Date(tc).toISOString(),profit:String(p),commission:String(c),swap:String(sw),net_profit:String(p+c+sw),position_ref:'P'+i});});
const wins=tr.filter(x=>x[4]+x[5]+x[6]>0).length;
const stats={ok:true,history:hist.slice().reverse(),history_total:hist.length,deposits_total:100000,withdrawals_total:0,closed_pl_total:+pl.toFixed(2),trades_closed:tr.length,wins,losses:tr.length-wins,win_rate_pct:+(wins/tr.length*100).toFixed(2),
 peak_balance:+peak.toFixed(2),peak_balance_at:new Date(t0+H*30).toISOString(),max_drawdown_pct:+(maxdd+1.2).toFixed(2),max_drawdown_basis:'EQUITY_READINGS_EXCLUDING_DEPOSITS_WITHDRAWALS',max_drawdown_closed_balance_pct:+maxdd.toFixed(2),growth_pct:+(pl/1000).toFixed(2)};
console.log('EXPECTED balance',bal.toFixed(2),'P/L',pl.toFixed(2),'%',(pl/1000).toFixed(2),'peak',peak.toFixed(2),'maxDD',maxdd.toFixed(2),'wins',wins,'/',tr.length);
(async()=>{const b=await chromium.launch({...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{})});const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
await p.route('**/i18n/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
await p.route('**/api/v1/**',r=>{const u=r.request().url();
 if(u.includes('/stats'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(stats)});
 if(u.includes('/history')){const q=new URL(u).searchParams;const o=+q.get('offset')||0,l=+q.get('limit')||200;const rv=copies.slice().reverse();return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,trades:rv.slice(o,o+l),page:{offset:o,limit:l,total:copies.length}})});}
 if(u.includes('/positions'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"positions":[]}'});
 if(u.includes('/billing'))return r.fulfill({status:200,contentType:'application/json',body:'{"status":"NONE"}'});
 if(/\/customer\/accounts(\?|$)/.test(u))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,account_limit:{max:3,used:0},accounts:[{account_id:'f7a00000-0000-4000-8000-0000000000a5',account_number:null,preview:true,view_only:true,currency:'USD',balance:bal.toFixed(2),equity:bal.toFixed(2),display_status:'PAUSED',deposits:'100000',withdrawals:'0'}]})});
 return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
await p.goto(process.argv[2]||'http://localhost:8765/');await p.waitForTimeout(800);
await p.evaluate(()=>{const F=window.FTM;F.auth=Object.assign(F.auth||{},{ready:()=>true,getAccessToken:()=>Promise.resolve('tok'),signOut:()=>Promise.resolve()});F.session={email:'a@ftm.com',products:[],name:'A'};});
await p.evaluate(()=>FTM.loadLive().then(()=>FTM.openArea('auto')));await p.waitForTimeout(3000);
await p.evaluate(()=>FTM.showView('perf')); await p.waitForTimeout(1200);
const L=await p.evaluate(()=>{ const t=document.getElementById('pxYears'); return {head:[...t.querySelectorAll('thead th')].map(x=>x.textContent.trim()), hs:[...t.querySelectorAll('thead th')].map(x=>x.getBoundingClientRect().height), cells:[...t.querySelectorAll('tbody td')].map(x=>x.textContent.trim()), adj:(t.querySelector('.yr-end small')||{}).textContent||''}; });
ok(L.head.join('|')==='Year|Start|Net deposits|Profit|End|Return|Profitable months','laptop: seven classic columns '+L.head.join(' | '));
ok(Math.max(...L.hs)<=Math.min(...L.hs)+1&&Math.max(...L.hs)<34,'laptop: every heading on one line '+L.hs.join(','));
ok(!L.cells.some(c=>/(^|\s)[-\u2212][$€£]?0\.00(\s|$)/.test(c)),'no "-0.00" anywhere '+L.cells.join(' | '));
ok(DIV?/Dividends, tax & adjustments \+\$12\.64/.test(L.adj):!L.adj,'dividends, tax & adjustments shown under End only when there are some ('+L.adj+')');
await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(500);
await p.evaluate(()=>{ const c=document.getElementById('pxYears').closest('.app-card'); if(c.offsetHeight<90) c.querySelector('h3').click(); }); await p.waitForTimeout(400);
const ph=await p.evaluate(()=>{ const tr=document.querySelector('#pxYears tbody tr'); return [...tr.children].filter(td=>getComputedStyle(td).display!=='none').map(td=>({r:td.getBoundingClientRect(),t:(td.querySelector('b')||td).textContent.trim()})).sort((x,y)=>(Math.round(x.r.top)-Math.round(y.r.top))||(x.r.left-y.r.left)).map(x=>x.t); });
ok(ph.length===3&&/^20\d\d$/.test(ph[0])&&/%$/.test(ph[1])&&/\d\.\d\d$/.test(ph[2]),'phone: closed row shows year, return, end balance '+ph.join(' | '));
await p.click('#pxYears tbody tr'); await p.waitForTimeout(300);
const op=await p.evaluate(()=>[...document.querySelectorAll('#pxYears tbody tr td')].filter(td=>getComputedStyle(td).display!=='none').length);
ok(op===7,'phone: tapping the year shows all seven figures');
ok(!errs.length,'no script errors '+errs.join(' | '));
await b.close(); console.log(fails?fails+' BROKEN':'ALL OK'); process.exit(fails?1:0); })();
