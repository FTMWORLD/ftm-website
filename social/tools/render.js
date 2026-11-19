/* Renders FTM social images with the official FTM logo.
   node social/tools/render.js day '<json from /api/v1/community?dayresult=>' out-dir
   node social/tools/render.js card '<json {title, body, kicker, foot}>' out-dir name
   Writes <name>-post.png (1080x1350) and <name>-story.png (1080x1920). */
const { chromium } = require('playwright');
const fs = require('fs');
const [, , kind, raw, outDir, nameArg] = process.argv;
const D = JSON.parse(raw);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NICE = { XAUUSD: 'Gold', BTCUSD: 'Bitcoin', USTEC: 'US Tech 100', NAS100: 'US Tech 100', USDJPY: 'USD/JPY', HK50: 'Hang Seng 50', HSI: 'Hang Seng 50' };
const mk = s => NICE[String(s).toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(M|PRO|RAW|ECN)$/, '')] || String(s);
const pc = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + '%';

const css = (w, h) => `*{margin:0;padding:0;box-sizing:border-box}
body{width:${w}px;height:${h}px;overflow:hidden;font-family:'Inter Display','Inter',sans-serif;-webkit-font-smoothing:antialiased;color:#fff;
background:radial-gradient(120% 80% at 85% 10%,#1d3590 0%,#132a7a 25%,#0b1640 65%,#070e2c 100%);position:relative}
.grid{position:absolute;inset:0;opacity:.06;background-image:linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px);background-size:72px 72px}
.wrap{position:absolute;inset:0;padding:${h > 1500 ? '150px 84px 140px' : '84px 84px 0'};display:flex;flex-direction:column}
.logo{display:flex;align-items:center;gap:16px;font-weight:800;font-size:46px;letter-spacing:-.04em}
.mark{width:62px;height:62px;border-radius:18px;background:#1F3A93;display:grid;place-items:center;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.kick{color:#D4AF37;font-weight:700;font-size:26px;letter-spacing:.16em;text-transform:uppercase;margin-top:${h > 1500 ? 120 : 64}px}
.date{font-size:40px;font-weight:600;color:#dfe4ff;margin-top:14px}
.big{font-weight:800;letter-spacing:-.04em;line-height:1;margin-top:${h > 1500 ? 90 : 46}px}
.sub{font-size:34px;color:#c9d0ee;margin-top:18px;font-weight:500}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:${h > 1500 ? 90 : 52}px}
.st{border:1.5px solid rgba(212,175,55,.42);border-radius:22px;padding:22px 24px;background:rgba(11,22,64,.5)}
.st b{display:block;font-size:52px;font-weight:800;letter-spacing:-.03em}
.st span{font-size:22px;color:#aeb7dc;letter-spacing:.06em;text-transform:uppercase;font-weight:600}
.mk{margin-top:30px;font-size:26px;color:#aeb7dc}
.foot{position:absolute;left:0;right:0;bottom:0;height:${h > 1500 ? 130 : 96}px;background:#0b1640;display:flex;align-items:center;justify-content:space-between;padding:0 84px;border-top:1.5px solid rgba(212,175,55,.35)}
.foot i{font-style:normal;color:#E3B62F;font-weight:700;font-size:28px}
.foot u{text-decoration:none;color:#fff;font-weight:600;font-size:26px;opacity:.9}
h1{font-size:${h > 1500 ? 92 : 80}px;line-height:1.04;letter-spacing:-.035em;font-weight:800;margin-top:${h > 1500 ? 110 : 60}px;text-wrap:balance}
h1 b{color:#E3B62F}
.body{font-size:${h > 1500 ? 42 : 38}px;line-height:1.42;color:#d6dbf3;margin-top:44px;font-weight:500}
.body p+p{margin-top:24px}
.line{position:absolute;right:0;bottom:${h > 1500 ? 130 : 96}px;width:62%;height:38%;opacity:.9}`;
const MARK = `<span class="mark"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#D4AF37" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18 10 11l4 4 6-8"/></svg></span>`;
const LINE = `<svg class="line" viewBox="0 0 100 60" preserveAspectRatio="none"><defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E3B62F" stop-opacity=".16"/><stop offset="1" stop-color="#E3B62F" stop-opacity="0"/></linearGradient></defs><path d="M0 52 L12 46 L18 49 L30 38 L36 41 L50 28 L56 31 L70 18 L76 21 L92 6 L100 4 L100 60 L0 60Z" fill="url(#a)"/><path d="M0 52 L12 46 L18 49 L30 38 L36 41 L50 28 L56 31 L70 18 L76 21 L92 6 L100 4" fill="none" stroke="#D4AF37" stroke-width=".5" vector-effect="non-scaling-stroke" style="stroke-width:4px"/></svg>`;
const FOOT = `<div class="foot"><i>Invest today, secure tomorrow.</i><u>ftmwealthnation.com</u></div>`;

function day(w, h) {
  const [y, m, d] = D.date.split('-').map(Number), wd = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const col = D.pct > 0 ? '#E3B62F' : D.pct < 0 ? '#ff6b74' : '#ffffff';
  const markets = (D.markets || []).map(mk).filter((v, i, a) => a.indexOf(v) === i);
  const body = D.trades
    ? `<div class="big" style="font-size:${h > 1500 ? 230 : 200}px;color:${col}">${pc(D.pct)}</div>
       <div class="sub">Result of today's closed trades</div>
       <div class="stats"><div class="st"><b>${D.trades}</b><span>Trades</span></div><div class="st"><b>${D.wins}</b><span>Won</span></div><div class="st"><b>${D.losses}</b><span>Lost</span></div></div>
       ${D.mtd == null ? '' : `<div class="stats" style="grid-template-columns:1fr;margin-top:18px"><div class="st"><b style="color:${D.mtd >= 0 ? '#E3B62F' : '#ff6b74'}">${pc(D.mtd)}</b><span>${MONTHS[m - 1]} so far</span></div></div>`}
       ${markets.length ? `<div class="mk">Markets: ${esc(markets.join(' · '))}</div>` : ''}`
    : `<div class="big" style="font-size:120px">No trades today</div><div class="sub">FTM MACHINE found no setup worth taking. Waiting is part of the plan.</div>
       ${D.mtd == null ? '' : `<div class="stats" style="grid-template-columns:1fr"><div class="st"><b style="color:${D.mtd >= 0 ? '#E3B62F' : '#ff6b74'}">${pc(D.mtd)}</b><span>${MONTHS[m - 1]} so far</span></div></div>`}`;
  return `<div class="grid"></div><div class="wrap"><div class="logo">${MARK}FTM</div>
    <div class="kick">FTM master account · daily result</div><div class="date">${wd}, ${d} ${MONTHS[m - 1]} ${y}</div>${body}</div>${FOOT}`;
}
function card(w, h) {
  return `<div class="grid"></div>${D.line === false ? '' : LINE}<div class="wrap"><div class="logo">${MARK}FTM</div>
    ${D.kicker ? `<div class="kick">${esc(D.kicker)}</div>` : ''}<h1>${D.title}</h1>
    <div class="body">${(D.body || []).map(p => `<p>${p}</p>`).join('')}</div></div>${FOOT}`;
}
(async () => {
  const b = await chromium.launch(); fs.mkdirSync(outDir, { recursive: true });
  const name = nameArg || (kind === 'day' ? 'day-' + D.date : 'card');
  for (const [tag, w, h] of [['post', 1080, 1350], ['story', 1080, 1920]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.setContent(`<html><head><style>${css(w, h)}</style></head><body>${kind === 'day' ? day(w, h) : card(w, h)}</body></html>`);
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${outDir}/${name}-${tag}.png` }); await p.close();
  }
  await b.close(); console.log('ok', name);
})();
