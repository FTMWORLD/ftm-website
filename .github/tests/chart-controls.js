// Account progress on phones: currency/% on the left, Compare in the middle and -/+ on the right, all on one line;
// every period tab (1M ... All) fully visible. Run: node .github/tests/chart-controls.js (site on :8765)
const {chromium}=(()=>{try{return require('playwright');}catch(e){return require('/opt/node-tools/node_modules/playwright');}})();
const BASE=process.argv[2]||'http://localhost:8765'; let fails=0; const ok=(c,m)=>{ console.log((c?'OK     ':'BROKEN ')+m); if(!c) fails++; };
(async()=>{ const b=await chromium.launch();
for(const w of [320,360,375,390,412,600,1280]){
  const c=await b.newContext({viewport:{width:w,height:900},isMobile:w<700,hasTouch:w<700,deviceScaleFactor:1}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route(/(binance|coinbase|gold-api)/,r=>r.abort());
  await p.goto(BASE+'/?preview=split'); await p.waitForTimeout(800);
  await p.evaluate(()=>{ const F=window.FTM; F.session={email:'t@ftm.com',products:['auto'],name:'T'}; return Promise.resolve(F.loadLive&&F.loadLive()).catch(()=>{}).then(()=>F.openArea('auto')); }).catch(()=>{}); await p.waitForTimeout(2000);
  const r=await p.evaluate(()=>{ const cmp=document.getElementById('cvCmp'); cmp.hidden=false;
    const R=s=>document.querySelector(s).getBoundingClientRect(), u=R('#curveUnit'), m=R('#cvCmp'), z=R('.cv-zoom-btns'), tf=R('#curveTF'), card=R('.cv-card');
    const mid=x=>x.top+x.height/2, row=Math.max(mid(u),mid(m),mid(z))-Math.min(mid(u),mid(m),mid(z));
    const tabs=[...document.querySelectorAll('#curveTF button')].every(b=>{ const x=b.getBoundingClientRect(); return x.left>=tf.left-1 && x.right<=tf.right+1 && x.width>0; });
    const ctx=document.createElement('canvas').getContext('2d'), cs=getComputedStyle(cmp); ctx.font=cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
    const txt=cmp.options[cmp.selectedIndex].text, need=ctx.measureText(txt).width+parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight);
    return {row, order:u.right<=m.left+1 && m.right<=z.left+1, inCard:z.right<=card.right-4 && u.left>=card.left+4, tabs, fits:need<=m.width+1, txt, need:Math.round(need), have:Math.round(m.width), sw:document.documentElement.scrollWidth}; });
  ok(r.row<8 && r.order, w+'px: currency/% left, Compare middle, -/+ right on one line ('+JSON.stringify(r)+')');
  ok(r.inCard && r.sw<=w, w+'px: the controls stay inside the card and the page does not scroll sideways');
  ok(r.tabs, w+'px: every period tab (1M to All) is fully visible');
  ok(r.fits, w+'px: "'+r.txt+'" is not cut off ('+r.need+' of '+r.have+'px)');
  ok(!errs.length, w+'px: no script errors '+(errs[0]||''));
  await c.close(); }
await b.close(); console.log(fails?'FAILED: '+fails:'CHART CONTROLS OK'); process.exit(fails?1:0); })();
