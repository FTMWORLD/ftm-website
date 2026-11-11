// Exchange-rate service: first source, fallback source, cached answer, error when every source fails. Run: node .github/tests/fx-api.js
let calls=0, mode='ok';
global.fetch=async u=>{ calls++; if(mode==='down') throw new Error('offline'); if(/er-api/.test(u)){ if(mode==='fallback') throw new Error('er-api down'); return {json:async()=>({result:'success',rates:{USD:1,EUR:0.9,NGN:1500,BAD:-1,xx:2},time_last_update_utc:'today'})}; } return {json:async()=>({date:'2026-11-11',rates:{EUR:0.91,GBP:0.78}})}; };
const load=()=>{ delete require.cache[require.resolve('../../api/v1/fx.js')]; return require('../../api/v1/fx.js'); };
const call=h=>new Promise(res=>{ const r={s:0,h:{},setHeader(k,v){this.h[k]=v;},status(c){this.s=c;return this;},json(j){res([this.s,j,this.h]);}}; h({method:'GET'},r); });
let fails=0; const ok=(c,m)=>{ console.log((c?'OK   ':'FAIL ')+m); if(!c) fails++; };
(async()=>{
  let h=load(), r=await call(h); ok(r[0]===200&&r[1].rates.NGN===1500&&r[1].rates.USD===1,'rates come from the first source (USD base)');
  ok(!('BAD' in r[1].rates)&&!('xx' in r[1].rates),'invalid codes and values are dropped');
  ok(/s-maxage=3600/.test(r[2]['Cache-Control']||''),'rates are cached for an hour');
  const c0=calls; r=await call(h); ok(calls===c0&&r[1].rates.NGN===1500,'a second request within the hour uses the cached rates');
  mode='fallback'; h=load(); r=await call(h); ok(r[0]===200&&r[1].rates.GBP===0.78&&r[1].rates.USD===1,'when the first source fails, the second is used');
  mode='down'; h=load(); r=await call(h); ok(r[0]===503&&r[1].error==='RATES_UNAVAILABLE','with no source, a clear error (the site keeps the account currency)');
  console.log(fails?'FAILED: '+fails:'FX OK'); process.exit(fails?1:0);
})();
