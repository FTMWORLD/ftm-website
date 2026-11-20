/* Renders FTM social images with the official FTM logo.
   node social/tools/render.js day '<json from /api/v1/community?dayresult=>' out-dir   (a losing day also gets <name>-month: the month so far, every day)
   node social/tools/render.js card '<json {title, body, kicker, foot}>' out-dir name
   node social/tools/render.js cover '<json {top, big, title, sub, tone}>' out-dir name   -> <name>-cover (1080x1920 reel/short cover) + <name>-thumb (1280x720 YouTube)
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
.wrap{position:absolute;left:0;right:0;top:0;bottom:${h > 1500 ? 130 : 96}px;padding:${h > 1500 ? '230px 84px 250px' : '56px 84px 48px'};display:flex;flex-direction:column;justify-content:center}
.logo{display:flex;align-items:center;gap:16px;font-weight:800;font-size:46px;letter-spacing:-.04em}
.mark{width:62px;height:62px;border-radius:18px;background:#1F3A93;display:grid;place-items:center;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.kick{color:#D4AF37;font-weight:700;font-size:26px;letter-spacing:.16em;text-transform:uppercase;margin-top:${h > 1500 ? 64 : 48}px}
.date{font-size:40px;font-weight:600;color:#dfe4ff;margin-top:14px}
.big{font-weight:800;letter-spacing:-.04em;line-height:1;margin-top:${h > 1500 ? 60 : 40}px}
.sub{font-size:34px;color:#c9d0ee;margin-top:18px;font-weight:500}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:${h > 1500 ? 60 : 44}px}
.st{border:1.5px solid rgba(212,175,55,.42);border-radius:22px;padding:22px 24px;background:rgba(11,22,64,.5)}
.st b{display:block;font-size:52px;font-weight:800;letter-spacing:-.03em}
.st span{font-size:22px;color:#aeb7dc;letter-spacing:.06em;text-transform:uppercase;font-weight:600}
.mk{margin-top:30px;font-size:26px;color:#aeb7dc}
.foot{position:absolute;left:0;right:0;bottom:0;height:${h > 1500 ? 130 : 96}px;background:#0b1640;display:flex;align-items:center;justify-content:space-between;padding:0 84px;border-top:1.5px solid rgba(212,175,55,.35)}
.foot i{font-style:normal;color:#E3B62F;font-weight:700;font-size:28px}
.foot u{text-decoration:none;color:#fff;font-weight:600;font-size:26px;opacity:.9}
h1{font-size:${h > 1500 ? 92 : 80}px;line-height:1.04;letter-spacing:-.035em;font-weight:800;margin-top:${h > 1500 ? 56 : 44}px;text-wrap:balance}
h1 b{color:#E3B62F}
.body{font-size:${h > 1500 ? 42 : 38}px;line-height:1.42;color:#d6dbf3;margin-top:44px;font-weight:500}
.body p+p{margin-top:24px}
.line{position:absolute;right:0;bottom:${h > 1500 ? 130 : 96}px;width:58%;height:28%;opacity:.8}`;
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
function trades(w, h, part, parts) {
  const R = (D.rows || []).slice().sort((a, b) => a.c - b.c), per = Math.ceil(R.length / parts), L = R.slice(part * per, (part + 1) * per);
  const [y, m, d] = D.date.split('-').map(Number), wd = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const tm = ms => new Date(ms).toLocaleTimeString('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
  const sym = { USD: '$', EUR: '€', GBP: '£' }[D.cur] || '';
  const mny = v => (v > 0 ? '+' : v < 0 ? '−' : '') + sym + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rh = Math.min(92, Math.floor((part === parts - 1 && D.balance != null ? 600 : 820) / Math.max(L.length, 1)));
  const rows = L.map(r => `<div style="display:grid;grid-template-columns:122px 1fr 100px 118px 210px;align-items:center;height:${rh}px;border-bottom:1.5px solid rgba(212,175,55,.18);font-size:${Math.min(36, rh * .42)}px">
    <span style="color:#aeb7dc;font-weight:600">${tm(r.c)}</span><span style="font-weight:700;white-space:nowrap">${esc(mk(r.s))}</span><span style="color:#dfe4ff;font-weight:600;white-space:nowrap">${r.v != null ? (+r.v).toFixed(2) : ''}</span>
    <span><b style="font-size:.72em;padding:6px 14px;border-radius:99px;background:${/buy/i.test(r.d) ? 'rgba(47,191,113,.18);color:#5fe39b' : 'rgba(229,50,62,.2);color:#ff8a92'}">${/buy/i.test(r.d) ? 'BUY' : 'SELL'}</b></span>
    <span style="text-align:right;font-weight:800;color:${r.pl >= 0 ? '#E3B62F' : '#ff6b74'}">${mny(r.pl)}</span></div>`).join('');
  return `<div class="grid"></div><div class="wrap"><div class="logo">${MARK}FTM</div>
    <div class="kick" style="margin-top:40px">Today's trades · ${part + 1} of ${parts}</div><div class="date">${wd}, ${d} ${MONTHS[m - 1]} ${y} · Berlin time</div>
    <div style="margin-top:30px;display:grid;grid-template-columns:122px 1fr 100px 118px 210px;font-size:22px;letter-spacing:.08em;text-transform:uppercase;color:#aeb7dc;font-weight:700;padding-bottom:12px"><span>Time</span><span>Market</span><span>Lots</span><span>Order</span><span style="text-align:right">Result</span></div><div style="border-top:1.5px solid rgba(212,175,55,.35)">${rows}</div>
    ${part === parts - 1 && D.balance != null ? `<div style="margin-top:34px;border:1.5px solid rgba(212,175,55,.5);border-radius:24px;padding:24px 28px;background:rgba(11,22,64,.55);display:flex;justify-content:space-between;align-items:center"><span style="font-size:26px;letter-spacing:.1em;text-transform:uppercase;color:#D4AF37;font-weight:700">Account balance</span><span style="font-size:52px;font-weight:800;letter-spacing:-.02em">${sym}${(+D.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
    <div style="margin-top:18px;font-size:30px;color:#dfe4ff;font-weight:600">The same trades are taken in members' accounts of any size.</div>` : ''}</div>${FOOT}`;
}
/* Losing days only: the whole month so far, day by day (green/red), so one red day is seen in context. Every day shown. */
function month(w, h) {
  const [y, m, d] = D.date.split('-').map(Number), C = D.cal || [], first = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const g = C.filter(x => x.n && x.pct > 0).length, r = C.filter(x => x.n && x.pct < 0).length;
  const cell = x => { const on = x.n > 0, c = !on ? 'rgba(255,255,255,.05)' : x.pct >= 0 ? 'rgba(47,191,113,.22)' : 'rgba(229,50,62,.24)', b = !on ? 'rgba(255,255,255,.08)' : x.pct >= 0 ? 'rgba(95,227,155,.55)' : 'rgba(255,138,146,.6)', today = x.date === D.date;
    return `<div style="height:104px;border-radius:16px;background:${c};border:${today ? '3px solid #E3B62F' : '1.5px solid ' + b};padding:10px 10px;display:flex;flex-direction:column;justify-content:space-between"><span style="font-size:20px;color:#aeb7dc;font-weight:700">${+x.date.slice(8)}</span><b style="font-size:20px;letter-spacing:-.02em;color:${!on ? '#6b7194' : x.pct >= 0 ? '#5fe39b' : '#ff8a92'}">${on ? pc(x.pct) : '—'}</b></div>`; };
  // weeks Mon-Sun with the week total after Sunday (daily %s chained, the same time-weighted way as every FTM figure)
  const slots = Array(first).fill(null).concat(C); while (slots.length % 7) slots.push(null);
  const wk = L => { const on = L.filter(x => x && x.n); if (!on.length) return '<div></div>'; const v = (on.reduce((f, x) => f * (1 + x.pct / 100), 1) - 1) * 100;
    return `<div style="height:104px;border-radius:16px;background:rgba(212,175,55,.12);border:1.5px solid rgba(212,175,55,.6);padding:10px 12px;display:flex;flex-direction:column;justify-content:space-between"><span style="font-size:18px;color:#D4AF37;font-weight:800;letter-spacing:.06em">WEEK</span><b style="font-size:22px;letter-spacing:-.02em;color:${v >= 0 ? '#5fe39b' : '#ff8a92'}">${pc(v)}</b></div>`; };
  let cells = ''; for (let i = 0; i < slots.length; i += 7) { const L = slots.slice(i, i + 7); cells += L.map(x => x ? cell(x) : '<div></div>').join('') + wk(L); }
  return `<div class="grid"></div><div class="wrap" style="padding-top:40px;padding-bottom:30px"><div class="logo">${MARK}FTM</div>
    <div class="kick" style="margin-top:30px">Every day shown · ${MONTHS[m - 1]} ${y}</div>
    <div style="font-size:54px;font-weight:800;letter-spacing:-.03em;line-height:1.08;margin-top:14px">Losing days are part of trading. <span style="color:#E3B62F">We show you every one.</span></div>
    <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:8px;margin-top:28px;font-size:17px;color:#aeb7dc;font-weight:700;letter-spacing:.06em;text-align:center">${['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'WEEK'].map((x, i) => `<span style="${i === 7 ? 'color:#D4AF37' : ''}">${x}</span>`).join('')}</div>
    <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:8px;margin-top:10px">${cells}</div>
    ${D.mtd == null ? '' : `<div style="margin-top:26px;border:1.5px solid rgba(212,175,55,.5);border-radius:24px;padding:22px 28px;background:rgba(11,22,64,.55);display:flex;justify-content:space-between;align-items:center"><span style="font-size:26px;letter-spacing:.1em;text-transform:uppercase;color:#D4AF37;font-weight:700">${MONTHS[m - 1]} so far</span><span style="font-size:60px;font-weight:800;letter-spacing:-.02em;color:${D.mtd >= 0 ? '#E3B62F' : '#ff6b74'}">${pc(D.mtd)}</span></div>`}
    <div style="margin-top:14px;font-size:26px;color:#c9d0ee;font-weight:600">${g} green day${g === 1 ? '' : 's'} · ${r} red day${r === 1 ? '' : 's'} · results posted every day at 11 p.m.</div></div>${FOOT}`;
}
/* Cover image for a reel / short / video (owner 20 Nov: every video post gets its own designed cover). 1080x1920; the words
   sit in the centre square so the profile grid (3:4 / 1:1 crop) shows them. D = {top, title, big, sub, tone: 'up'|'down'|'gold', bg: a still from the video (optional)} */
function cover(w, h) {
  const tone = D.tone === 'down' ? '#ff6b74' : D.tone === 'up' ? '#5fe39b' : '#E3B62F', land = w > h;
  let rays = ''; for (let i = 0; i < 14; i++) { const a = i * Math.PI / 7; rays += `<path d="M50 50 L${50 + 90 * Math.cos(a - .05)} ${50 + 90 * Math.sin(a - .05)} L${50 + 90 * Math.cos(a + .05)} ${50 + 90 * Math.sin(a + .05)}Z" fill="#E3B62F" opacity=".05"/>`; }
  const bg = D.bg && fs.existsSync(D.bg) ? `<div style="position:absolute;inset:0;background:url(data:image/${/png$/i.test(D.bg) ? 'png' : 'jpeg'};base64,${fs.readFileSync(D.bg).toString('base64')}) center/cover"></div><div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,14,44,.55),rgba(7,14,44,.25) 30%,rgba(7,14,44,.72) 50%,rgba(7,14,44,.35) 72%,rgba(7,14,44,.8))"></div>` : '';
  return bg + `<div style="position:absolute;inset:0;background:radial-gradient(60% 40% at 50% 50%,rgba(227,182,47,.22),transparent 70%)"></div>
    <svg style="position:absolute;inset:0" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">${rays}</svg>
    <div class="grid"></div>${LINE}
    <div style="position:absolute;left:0;right:0;top:${land ? 44 : 150}px;display:flex;justify-content:center"><div class="logo">${MARK}FTM</div></div>
    <div style="position:absolute;left:${land ? 90 : 70}px;right:${land ? 90 : 70}px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center">
      ${D.top ? `<div style="font-size:${land ? 34 : 40}px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#D4AF37">${esc(D.top)}</div>` : ''}
      ${D.big ? `<div style="font-size:${land ? 190 : 230}px;font-weight:900;letter-spacing:-.05em;line-height:1;color:${tone};margin-top:18px;text-shadow:0 20px 60px rgba(0,0,0,.45)">${esc(D.big)}</div>` : ''}
      ${D.title ? `<div style="font-size:${land ? 96 : (D.big ? 76 : 116)}px;font-weight:900;letter-spacing:-.04em;line-height:1.02;margin-top:${D.big ? 20 : 26}px;text-wrap:balance;text-shadow:0 14px 50px rgba(0,0,0,.5)">${D.title}</div>` : ''}
      ${D.sub ? `<div style="margin-top:34px;display:inline-block;padding:16px 34px;border-radius:999px;background:#E5323E;font-size:${land ? 34 : 40}px;font-weight:800">${esc(D.sub)}</div>` : ''}
    </div>${FOOT}`;
}
function card(w, h) {
  return `<div class="grid"></div>${D.line === false ? '' : LINE}<div class="wrap"><div class="logo">${MARK}FTM</div>
    ${D.kicker ? `<div class="kick">${esc(D.kicker)}</div>` : ''}<h1>${D.title}</h1>
    <div class="body">${(D.body || []).map(p => `<p>${p}</p>`).join('')}</div></div>${FOOT}`;
}
(async () => {
  const b = await chromium.launch(); fs.mkdirSync(outDir, { recursive: true });
  const name = nameArg || (kind === 'day' ? 'day-' + D.date : 'card');
  const jobs = kind === 'day' ? [['post', 1080, 1350, () => day(1080, 1350)], ['story', 1080, 1920, () => day(1080, 1920)]] : kind === 'card' ? [['post', 1080, 1350, () => card(1080, 1350)], ['story', 1080, 1920, () => card(1080, 1920)]] : kind === 'cover' ? [['cover', 1080, 1920, () => cover(1080, 1920)], ['thumb', 1280, 720, () => cover(1280, 720)]] : [];
  if (kind === 'day' && (D.rows || []).length) { const parts = D.rows.length > 10 ? 2 : 1; for (let i = 0; i < parts; i++) jobs.push(['trades' + (i + 1), 1080, 1350, () => trades(1080, 1350, i, parts)]); }
  if (kind === 'day' && D.pct < 0 && (D.cal || []).length) jobs.push(['month', 1080, 1350, () => month(1080, 1350)]);
  for (const [tag, w, h, fn] of jobs) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.setContent(`<html><head><style>${css(w, h)}</style></head><body>${fn()}</body></html>`);
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${outDir}/${name}-${tag}.png` }); await p.screenshot({ path: `${outDir}/${name}-${tag}.jpg`, type: 'jpeg', quality: 92 }); await p.close();
  }
  await b.close(); console.log('ok', name);
})();
