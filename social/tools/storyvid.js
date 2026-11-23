/* FTM story video (owner 21 Nov 2026): 1080x1920, 10 s, everything centred, moving from the first frame,
   FOMO line, real figure, clear call to action pointing to the profile link, FTM's own finance music.
   node social/tools/storyvid.js '<json>' out.mp4
   json: { kicker, hook, big, bigTone: up|down|gold, bigLabel, title, chips: [..], cta, ctaSub, seed,
           theme: navy|paper|night|gold, sound: drive|lofi|news|cinema|bright, opts: ['A','B'] (quiz), myth, fact, src (news source line) }
   owner 23 Nov 2026: every story must look and sound different -> themes, sound styles and formats (quiz, myth vs fact, news).
   hook   = the first words people see (visible on frame 1), title may use <b>gold</b>. */
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const D = JSON.parse(process.argv[2]), OUT = process.argv[3];
const FPS = 30, DUR = +(process.env.DUR || 10), W = 1080, H = 1920;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tone = D.bigTone === 'down' ? '#ff6b74' : D.bigTone === 'up' ? '#5fe39b' : '#E3B62F';

const page = `<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden;font-family:'Inter Display','Inter',sans-serif;-webkit-font-smoothing:antialiased;color:#fff;
background:radial-gradient(90% 60% at 50% 42%,#1d3590 0%,#122a7a 34%,#0b1640 70%,#060c26 100%)}
#grid{position:absolute;inset:-80px;opacity:.07;background-image:linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px);background-size:80px 80px}
#beam{position:absolute;left:50%;top:44%;width:1500px;height:1500px;margin:-750px 0 0 -750px;border-radius:50%;background:radial-gradient(closest-side,rgba(227,182,47,.26),rgba(227,182,47,0))}
#chart{position:absolute;left:0;right:0;top:1330px;height:460px;opacity:.5}
.p{position:absolute;width:8px;height:8px;border-radius:50%;background:#E3B62F;box-shadow:0 0 18px #E3B62F}
#logo{display:flex;justify-content:center;align-items:center;gap:14px;font-weight:800;font-size:40px;letter-spacing:-.04em;margin-bottom:34px}
#logo span{width:56px;height:56px;border-radius:18px;background:#1F3A93;display:grid;place-items:center;box-shadow:0 10px 30px rgba(0,0,0,.35)}
#col{position:absolute;left:70px;right:70px;top:330px;bottom:330px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.e{will-change:transform,opacity}
#kick{display:inline-flex;align-items:center;gap:14px;color:#E3B62F;font-weight:800;font-size:30px;letter-spacing:.18em;text-transform:uppercase;padding:14px 26px;border:2px solid rgba(227,182,47,.45);border-radius:999px;background:rgba(11,22,64,.55)}
#kick i{width:14px;height:14px;border-radius:50%;background:#5fe39b;box-shadow:0 0 0 0 rgba(95,227,155,.6)}
#hook{font-size:92px;font-weight:900;letter-spacing:-.045em;line-height:1.02;margin-top:40px;text-wrap:balance;text-shadow:0 18px 60px rgba(0,0,0,.45)}
#hook b,#title b{color:#E3B62F}
#big{font-size:210px;font-weight:900;letter-spacing:-.055em;line-height:1;margin-top:34px;color:${tone};text-shadow:0 0 80px ${tone}55,0 20px 60px rgba(0,0,0,.45)}
#bl{font-size:36px;font-weight:700;color:#dfe4ff;margin-top:10px}
#title{font-size:52px;font-weight:800;letter-spacing:-.03em;line-height:1.12;margin-top:30px;color:#eef1ff;text-wrap:balance}
#title b{display:block;white-space:nowrap}
#chips{display:flex;margin-top:0;flex-wrap:wrap;justify-content:center;gap:0 16px}
.c{margin-top:36px;font-size:32px;font-weight:700;padding:14px 24px;border-radius:18px;background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.16)}
#cta{margin-top:54px;display:flex;flex-direction:column;align-items:center;gap:18px}
#btn{position:relative;padding:30px 56px;border-radius:999px;background:linear-gradient(180deg,#f0414c,#d42633);font-size:50px;font-weight:900;letter-spacing:-.02em;box-shadow:0 18px 50px rgba(229,50,62,.5)}
#ring{position:absolute;inset:-8px;border-radius:999px;border:4px solid rgba(229,50,62,.7)}
#cs{font-size:34px;font-weight:700;color:#dfe4ff;text-shadow:0 2px 12px rgba(6,12,38,.9)}
#cs b{color:#E3B62F}
#tap{position:absolute;left:56px;top:236px;display:flex;align-items:center;gap:14px;font-size:30px;font-weight:800;color:#fff;background:rgba(229,50,62,.92);padding:12px 22px 12px 16px;border-radius:999px;box-shadow:0 10px 30px rgba(0,0,0,.35)}
#tap svg{width:40px;height:40px}
#foot{position:absolute;left:0;right:0;bottom:0;height:130px;background:#0b1640;display:flex;align-items:center;justify-content:space-between;padding:0 84px;border-top:1.5px solid rgba(212,175,55,.35)}
body.th-paper{background:radial-gradient(90% 60% at 50% 40%,#fffaf0 0%,#f3ecdc 60%,#e8dfc9 100%);color:#0b1640}
body.th-paper #grid{opacity:.06;background-image:linear-gradient(#0b1640 1px,transparent 1px);background-size:80px 56px}body.th-paper #beam{background:radial-gradient(closest-side,rgba(229,50,62,.10),rgba(229,50,62,0))}
body.th-paper #kick{color:#E5323E;border-color:rgba(229,50,62,.5);background:rgba(255,255,255,.7)}body.th-paper #hook b,body.th-paper #title b{color:#c81e2b}body.th-paper #title{color:#0b1640}body.th-paper #bl,body.th-paper #cs{color:#24305e;text-shadow:none}
body.th-paper .c{background:rgba(11,22,64,.06);border-color:rgba(11,22,64,.18);color:#0b1640}body.th-paper #hook{text-shadow:none}body.th-paper .p{background:#c81e2b;box-shadow:none;opacity:.2}
body.th-night{background:radial-gradient(90% 60% at 50% 42%,#2a0d14 0%,#14070c 55%,#050306 100%)}body.th-night #beam{background:radial-gradient(closest-side,rgba(229,50,62,.28),rgba(229,50,62,0))}body.th-night #hook b,body.th-night #title b{color:#ff5a66}
body.th-gold{background:radial-gradient(90% 60% at 50% 40%,#f6d77a 0%,#e3b62f 45%,#b8922a 100%);color:#0b1640}body.th-gold #grid{opacity:.08;background-image:linear-gradient(#0b1640 1px,transparent 1px),linear-gradient(90deg,#0b1640 1px,transparent 1px)}
body.th-gold #beam{background:radial-gradient(closest-side,rgba(255,255,255,.35),rgba(255,255,255,0))}body.th-gold #hook b,body.th-gold #title b{color:#fff;background:#0b1640;padding:0 .18em;border-radius:.14em;-webkit-box-decoration-break:clone;box-decoration-break:clone;line-height:1.25}body.th-gold #big{color:#0b1640;text-shadow:0 6px 30px rgba(255,255,255,.45)}body.th-gold #title,body.th-gold #bl,body.th-gold #cs{color:#0b1640;text-shadow:none}body.th-gold #kick{color:#0b1640;border-color:rgba(11,22,64,.4);background:rgba(255,255,255,.35)}body.th-gold #hook{text-shadow:none}body.th-gold .c{background:rgba(11,22,64,.1);border-color:rgba(11,22,64,.25);color:#0b1640}body.th-gold #cs b{color:#fff}
#opts{display:flex;gap:26px;justify-content:center;margin-top:40px;width:100%}.o{flex:1;max-width:420px;padding:30px 20px;border-radius:30px;font-size:52px;font-weight:900;letter-spacing:-.02em;background:rgba(255,255,255,.1);border:3px solid rgba(255,255,255,.3)}
.o i{display:block;font-style:normal;font-size:28px;font-weight:800;letter-spacing:.16em;opacity:.7;margin-bottom:8px}.o.up{border-color:#5fe39b;color:#5fe39b}.o.dn{border-color:#ff6b74;color:#ff6b74}
body.th-paper .o,body.th-gold .o{background:#fff;color:#0b1640;border-color:#0b1640}
#mf{margin-top:34px;width:100%;display:grid;gap:22px}.mf{padding:26px 30px;border-radius:28px;text-align:left;font-size:46px;font-weight:800;line-height:1.15;letter-spacing:-.02em}
.mf i{display:inline-block;font-style:normal;font-size:28px;font-weight:900;letter-spacing:.18em;padding:6px 16px;border-radius:12px;margin-bottom:12px}
.mf.m{background:rgba(229,50,62,.14);border:2px solid rgba(229,50,62,.5)}.mf.m i{background:#E5323E;color:#fff}.mf.m span{text-decoration:line-through;text-decoration-color:#E5323E;text-decoration-thickness:6px;opacity:.85}
.mf.f{background:rgba(227,182,47,.14);border:2px solid rgba(227,182,47,.6)}.mf.f i{background:#E3B62F;color:#0b1640}
#src{margin-top:18px;font-size:26px;font-weight:600;opacity:.7}
#foot i{font-style:normal;color:#E3B62F;font-weight:700;font-size:28px}#foot u{text-decoration:none;font-weight:600;font-size:26px;opacity:.9}
</style></head><body class="th-${esc(D.theme || 'navy')}">
<div id="grid"></div><div id="beam"></div>
<svg id="chart" viewBox="0 0 1080 560" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E3B62F" stop-opacity=".22"/><stop offset="1" stop-color="#E3B62F" stop-opacity="0"/></linearGradient><clipPath id="cl"><rect id="clr" x="0" y="0" width="0" height="560"/></clipPath></defs>
<g clip-path="url(#cl)"><path d="M0 500 L120 450 L180 478 L300 380 L360 410 L480 300 L540 330 L660 220 L720 250 L860 120 L920 150 L1080 40 L1080 560 L0 560Z" fill="url(#g)"/>
<path d="M0 500 L120 450 L180 478 L300 380 L360 410 L480 300 L540 330 L660 220 L720 250 L860 120 L920 150 L1080 40" fill="none" stroke="#E3B62F" stroke-width="6" stroke-linejoin="round"/></g></svg>
<div id="parts"></div>

<div id="tap"${D.tap === false ? ' style="display:none"' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 17 7 7M7 15V7h8"/></svg>${esc(D.tapText || 'Tap our name for the link')}</div>
<div id="col">
 <div id="logo"><span><svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="#D4AF37" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18 10 11l4 4 6-8"/></svg></span>FTM</div>
 ${D.kicker ? `<div id="kick" class="e"><i></i>${esc(D.kicker)}</div>` : ''}
 <div id="hook" class="e">${D.hook || ''}</div>
 ${D.big ? `<div id="big" class="e"></div>${D.bigLabel ? `<div id="bl" class="e">${esc(D.bigLabel)}</div>` : ''}` : ''}
 ${D.title ? `<div id="title" class="e">${D.title}</div>` : ''}
 ${D.myth ? `<div id="mf"><div class="mf m e"><i>MYTH</i><br><span>${esc(D.myth)}</span></div><div class="mf f e"><i>FACT</i><br>${D.fact || ''}</div></div>` : ''}
 ${(D.opts || []).length ? `<div id="opts">${D.opts.map((o, i) => `<div class="o e ${i ? 'dn' : 'up'}"><i>${'AB'[i] || ''}</i>${esc(o)}</div>`).join('')}</div>` : ''}
 ${D.src ? `<div id="src" class="e">${esc(D.src)}</div>` : ''}
 ${(D.chips || []).length ? `<div id="chips">${D.chips.map(c => `<div class="c e">${esc(c)}</div>`).join('')}</div>` : ''}
 <div id="cta" class="e"${D.cta === false ? ' style="display:none"' : ''}><div id="btn"><div id="ring"></div>${esc(D.cta || 'Tap our name for the link')}</div><div id="cs">${D.ctaSub || 'Link in our bio · <b>ftmwealthnation.com</b>'}</div></div>
</div>
<div id="foot"><i>Invest today, secure tomorrow.</i><u>ftmwealthnation.com</u></div>
<script>
const BIG=${JSON.stringify(String(D.big || ''))};
const m=BIG.match(/^([^0-9]*)([0-9][0-9,]*(?:\\.[0-9]+)?)(.*)$/);
const parts=document.getElementById('parts');let seed=${+D.seed || 7};const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
const P=[];for(let i=0;i<22;i++){const d=document.createElement('div');d.className='p';parts.appendChild(d);P.push({x:rnd()*1080,y:300+rnd()*1400,s:.4+rnd()*1.1,v:20+rnd()*45,ph:rnd()*6})}
const ease=x=>x<0?0:x>1?1:1-Math.pow(1-x,3);
const back=x=>{x=Math.max(0,Math.min(1,x));const c=1.70158;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
function inn(el,t0,t,dy){if(!el)return;if(el._h==null){el._h=el.offsetHeight;el._m=parseFloat(getComputedStyle(el).marginTop)||0}const k=ease((t-t0)/.45),g=ease((t-t0)/.35);el.style.opacity=k;el.style.height=(el._h*g)+'px';el.style.marginTop=(el._m*g)+'px';el.style.transform='translateY('+((1-k)*(dy||60))+'px)'}
(function(){const H=document.getElementById('hook');if(H&&H.querySelector('b')){const lh=parseFloat(getComputedStyle(H).lineHeight)||94;if(H.offsetHeight>lh*1.5&&[...H.querySelectorAll('b')].every(b=>b.textContent.trim().length>=12)){H.querySelectorAll('b').forEach(b=>{b.style.display='block';b.style.whiteSpace='nowrap'});let fs=92;const fit=()=>[...H.querySelectorAll('b')].every(b=>b.scrollWidth<=H.clientWidth+1);while(!fit()&&fs>64){fs-=3;H.style.fontSize=fs+'px'}if(!fit())H.querySelectorAll('b').forEach(b=>b.style.whiteSpace='normal')}}})();
(function(){const T=document.getElementById('title');if(T){let fs=52;const fit=()=>[...T.querySelectorAll('b')].every(b=>b.scrollWidth<=T.clientWidth+1);while(!fit()&&fs>36){fs-=2;T.style.fontSize=fs+'px'}if(!fit())T.querySelectorAll('b').forEach(b=>b.style.whiteSpace='normal')}})();
(function(){const bb=document.getElementById('big');if(bb)bb.textContent=BIG;document.querySelectorAll('#col .e').forEach(el=>{el._h=el.offsetHeight;el._m=parseFloat(getComputedStyle(el).marginTop)||0;el.style.overflow='visible'})})();
window.R=function(t){
 document.getElementById('grid').style.transform='translateY('+(-(t*14)%80)+'px)';
 document.getElementById('beam').style.transform='scale('+(1+.06*Math.sin(t*1.6))+')';
 document.getElementById('clr').setAttribute('width',1080*ease(t/3.2));
 P.forEach((p,i)=>{const el=parts.children[i];const y=(p.y-p.v*t)%1920;el.style.transform='translate('+(p.x+18*Math.sin(t*1.3+p.ph))+'px,'+(y<250?y+1500:y)+'px) scale('+p.s+')';el.style.opacity=.25+.35*Math.sin(t*2+p.ph)**2});
 const k=document.getElementById('kick');if(k){inn(k,0,t+.45,30);k.querySelector('i').style.boxShadow='0 0 0 '+(8*((t*1.4)%1))+'px rgba(95,227,155,'+(.6*(1-(t*1.4)%1))+')'}
 const h=document.getElementById('hook');const hs=back(t/.5);h.style.transform='scale('+(1.18-.18*hs)+')';h.style.opacity=1;
 const b=document.getElementById('big');if(b){inn(b,.7,t,80);const c=ease((t-.7)/1.6);if(m){const v=parseFloat(m[2].replace(/,/g,''))*c,dec=(m[2].split('.')[1]||'').length;b.textContent=m[1]+v.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec})+m[3]}else b.textContent=BIG;
  if(t>2.3)b.style.transform='scale('+(1+.025*Math.sin((t-2.3)*3))+')'}
 inn(document.getElementById('bl'),1.1,t,30);inn(document.getElementById('title'),1.5,t,50);
 document.querySelectorAll('.c').forEach((c,i)=>inn(c,2.1+i*.25,t,40));
 document.querySelectorAll('.mf').forEach((c,i)=>inn(c,1.2+i*.7,t,40));document.querySelectorAll('.o').forEach((c,i)=>{inn(c,1.2+i*.3,t,40);if(t>2.4)c.style.transform='scale('+(1+.03*Math.sin((t+i)*4))+')'});inn(document.getElementById('src'),1.8,t,20);
 const cta=document.getElementById('cta');const ct=${+D.ctaAt || 3.3};const cg=ease((t-ct)/.4),ck=back((t-ct)/.55);cta.style.height=(cta._h*cg)+'px';cta.style.marginTop=(cta._m*cg)+'px';cta.style.opacity=Math.min(1,Math.max(0,(t-ct)/.25));cta.style.transform='translateY('+((1-ck)*120)+'px)';
 const btn=document.getElementById('btn');if(t>ct+.6)btn.style.transform='scale('+(1+.04*Math.sin((t-ct)*5))+')';
 const r=document.getElementById('ring'),rp=((t-ct)*1.1)%1;r.style.opacity=t>ct?(1-rp):0;r.style.transform='scale('+(1+rp*.25)+')';
 const tap=document.getElementById('tap');const tk=ease((t-ct-.4)/.4);tap.style.opacity=tk;tap.style.transform='translate('+(6*Math.sin(t*6))+'px,'+(-6*Math.abs(Math.sin(t*6))+(1-tk)*-30)+'px)';
};
</script></body></html>`;

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-')), vid = path.join(tmp, 'v.mp4'), wav = path.join(tmp, 'a.wav');
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: W, height: H } });
  await p.setContent(page); await p.waitForTimeout(300);
  if (process.env.TEST) { for (const t of process.env.TEST.split(',')) { await p.evaluate(x => R(x), +t); await p.screenshot({ path: OUT.replace(/\.mp4$/, '') + '-t' + t + '.jpg', type: 'jpeg', quality: 90 }); } await b.close(); return; }
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', vid]);
  for (let f = 0; f < FPS * DUR; f++) {
    await p.evaluate(x => R(x), f / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
  execFileSync('python3', ['-c', `
import sys,wave,numpy as np
sys.path.insert(0,${JSON.stringify(__dirname)})
from finbed import finance_bed
L,R=finance_bed(${DUR},cuts=(3.3,),seed=${(+D.seed || 7) % 97},bpm=${118 + ((+D.seed || 7) % 9)},style=${JSON.stringify(D.sound || ['drive', 'lofi', 'news', 'cinema', 'bright'][(+D.seed || 7) % 5])})
x=np.stack([L,R],1);x=x/max(1e-9,np.abs(x).max())*0.82
f=np.ones(len(x));n=int(0.8*48000);f[-n:]=np.linspace(1,0,n);x=(x.T*f).T
w=wave.open(${JSON.stringify(wav)},'wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(48000);w.writeframes((x*32767).astype('<i2').tobytes());w.close()`]);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', vid, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', OUT]);
  fs.rmSync(tmp, { recursive: true, force: true }); console.log('ok', OUT);
})();
