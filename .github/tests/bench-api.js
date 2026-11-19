// "Compare with" prices for markets FTM does not trade: first source, fallback source, cache, unknown symbol, error. Run: node .github/tests/bench-api.js
let mode='ok', calls=0;
const yahoo=()=>({json:async()=>({chart:{result:[{timestamp:[1700000000,1700086400,1700172800,1700259200,1700345600,1700432000],indicators:{quote:[{open:[100,101,102,null,104,105],close:[101,102,103,104,105,106]}]}}]}})});
const stooq='Date,Open,High,Low,Close,Volume\n2026-01-02,10,11,9,10.5,1\n2026-01-05,10.5,11,9,10.8,1\n2026-01-06,10.8,11,9,11,1\n2026-01-07,11,12,10,11.5,1\n2026-01-08,11.5,12,10,11.7,1\n2026-01-09,11.7,12,10,12,1\n';
global.fetch=async u=>{ calls++; if(mode==='down') throw new Error('offline'); if(/yahoo/.test(u)){ if(mode==='fallback') return {json:async()=>({chart:{result:null,error:{code:'Too Many Requests'}}})}; return yahoo(); } return {text:async()=>stooq}; };
const load=()=>{ delete require.cache[require.resolve('../../api/v1/bench.js')]; return require('../../api/v1/bench.js'); };
const call=(h,q)=>new Promise(res=>{ const r={s:0,h:{},setHeader(k,v){this.h[k]=v;},status(c){this.s=c;return this;},json(j){res([this.s,j,this.h]);}}; h({method:'GET',query:q},r); });
let fails=0; const ok=(c,m)=>{ console.log((c?'OK   ':'FAIL ')+m); if(!c) fails++; };
(async()=>{
  let h=load(), r=await call(h,{symbol:'nvda'});
  ok(r[0]===200&&r[1].candles.length===5&&r[1].candles[0].t===1700000000000&&r[1].candles[0].c===101,'Nvidia daily closes come from the first source (ms times, gaps dropped)');
  ok(/s-maxage=21600/.test(r[2]['Cache-Control']||''),'prices are cached for 6 hours');
  const c0=calls; r=await call(h,{symbol:'NVDA'}); ok(calls===c0&&r[0]===200,'a second request uses the cached prices');
  for(const s of ['XAGUSD','US500','AAPL','MSFT','AMZN','GOOGL']){ r=await call(h,{symbol:s}); ok(r[0]===200&&r[1].symbol===s,s+' is available'); }
  r=await call(h,{symbol:'XYZ'}); ok(r[0]===404,'an unknown symbol is refused');
  mode='fallback'; h=load(); r=await call(h,{symbol:'US500'}); ok(r[0]===200&&r[1].candles.length===6&&r[1].candles[5].c===12,'when the first source fails, the second is used');
  mode='down'; h=load(); r=await call(h,{symbol:'AAPL'}); ok(r[0]===503&&r[1].error==='PRICES_UNAVAILABLE','with no source, a clear error (the chart drops the comparison)');
  console.log(fails?'FAILED: '+fails:'BENCH OK'); process.exit(fails?1:0);
})();
