/* Renders FTM social images with the official FTM logo.
   node social/tools/render.js day '<json from /api/v1/community?dayresult=>' out-dir   (a loss day or small day under +0.5% also gets <name>-month: the month so far, every day)
   node social/tools/render.js card '<json {title, body, kicker, foot}>' out-dir name
   node social/tools/render.js week '<json from social/tools/week.py>' out-dir   -> week-<to>-post, -days, -story (Saturday 06:00 weekly summary)
   node social/tools/render.js quiet '<dayresult json + night>' out-dir   -> day-D-quiet1..3 (no-trade day: note + live stats + quiet days in the backtest)
   node social/tools/render.js cover '<json {top, big, title, sub, tone}>' out-dir name   -> <name>-cover (1080x1920 reel/short cover) + <name>-thumb (1280x720 YouTube)
   Writes <name>-post.png (1080x1350) and <name>-story.png (1080x1920). */
const { chromium } = require('playwright');
const fs = require('fs');
const [, , kind, raw, outDir, nameArg] = process.argv;
const D = JSON.parse(raw);
if (D.floating && !(D.floating.pct > 0)) D.floating = null; // owner 23 Nov: open trades are shown only when they are in profit
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

/* owner 20 Nov: the 23:00 post also shows the open trades' floating P/L (money and % of the balance) at posting time */
function floatBox() {  /* owner 23 Nov: social posts show percentages only, never money */
  const F = D.floating; if (!F) return '';
  const col = F.pct > 0 ? '#5fe39b' : F.pct < 0 ? '#ff6b74' : '#ffffff';
  if (!F.n) return `<div class="st"><b style="font-size:40px">No open trades</b><span>Floating now</span></div>`;
  return `<div class="st"><b style="color:${col};font-size:44px;white-space:nowrap">${pc(F.pct || 0)}</b><span>Floating · ${F.n} open trade${F.n === 1 ? '' : 's'}</span></div>`;
}
function day(w, h) {
  const [y, m, d] = D.date.split('-').map(Number), wd = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const col = D.pct > 0 ? '#E3B62F' : D.pct < 0 ? '#ff6b74' : '#ffffff';
  const markets = (D.markets || []).map(mk).filter((v, i, a) => a.indexOf(v) === i);
  const body = D.trades
    ? `<div class="big" style="font-size:${h > 1500 ? 230 : 200}px;color:${col}">${pc(D.pct)}</div>
       <div class="sub">${D.when === 'last24' ? 'Result of the trades closed in the last 24 hours' : 'Result of ' + (D.when === 'yesterday' ? 'the day\'s' : 'today\'s') + ' closed trades'}</div>
       <div class="stats"><div class="st"><b>${D.trades}</b><span>Trades</span></div><div class="st"><b>${D.wins}</b><span>Won</span></div><div class="st"><b>${D.losses}</b><span>Lost</span></div></div>
       ${D.mtd == null && !D.floating ? '' : `<div class="stats" style="grid-template-columns:${D.mtd != null && D.floating ? '1fr 1fr' : '1fr'};margin-top:18px">${D.mtd == null ? '' : `<div class="st"><b style="color:${D.mtd >= 0 ? '#E3B62F' : '#ff6b74'}">${pc(D.mtd)}</b><span>${MONTHS[m - 1]} so far</span></div>`}${floatBox()}</div>`}
       ${markets.length ? `<div class="mk">Markets: ${esc(markets.join(' · '))}</div>` : ''}`
    : `<div class="big" style="font-size:120px">No trades today</div><div class="sub">FTM MACHINE found no setup worth taking. Waiting is part of the plan.</div>
       ${D.mtd == null && !D.floating ? '' : `<div class="stats" style="grid-template-columns:${D.mtd != null && D.floating ? '1fr 1fr' : '1fr'}">${D.mtd == null ? '' : `<div class="st"><b style="color:${D.mtd >= 0 ? '#E3B62F' : '#ff6b74'}">${pc(D.mtd)}</b><span>${MONTHS[m - 1]} so far</span></div>`}${floatBox()}</div>`}`;
  return `<div class="grid"></div><div class="wrap"><div class="logo">${MARK}FTM</div>
    <div class="kick">${D.when === 'last24' ? 'Last 24 hours on FTM' : (D.when === 'yesterday' ? 'Yesterday' : 'Today') + ' on FTM · daily result'}</div><div class="date">${D.when === 'last24' && D.range ? esc(D.range) : wd + ', ' + d + ' ' + MONTHS[m - 1] + ' ' + y}</div>${body}</div>${FOOT}`;
}
function trades(w, h, part, parts) {
  const R = (D.rows || []).slice().sort((a, b) => a.c - b.c), per = Math.ceil(R.length / parts), L = R.slice(part * per, (part + 1) * per);
  const [y, m, d] = D.date.split('-').map(Number), wd = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const tm = ms => new Date(ms).toLocaleTimeString('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
  const sym = { USD: '$', EUR: '€', GBP: '£' }[D.cur] || '';
  // owner 23 Nov: percentages only. Each trade's result on the balance at that moment (start balance = end balance - the day's results)
  const ALL = (D.rows || []).slice().sort((a, b) => a.c - b.c); let bal = D.balance != null ? D.balance - ALL.reduce((t, r) => t + r.pl, 0) : null; const PCT = new Map();
  ALL.forEach(r => { PCT.set(r, bal ? r.pl / bal * 100 : null); if (bal != null) bal += r.pl; });
  const mny = r => { const v = PCT.get(r); return v == null ? '' : pc(v); };
  const rh = Math.min(92, Math.floor((part === parts - 1 && D.balance != null ? 600 : 820) / Math.max(L.length, 1)));
  const rows = L.map(r => `<div style="display:grid;grid-template-columns:122px 1fr 100px 118px 210px;align-items:center;height:${rh}px;border-bottom:1.5px solid rgba(212,175,55,.18);font-size:${Math.min(36, rh * .42)}px">
    <span style="color:#aeb7dc;font-weight:600">${tm(r.c)}</span><span style="font-weight:700;white-space:nowrap">${esc(mk(r.s))}</span><span style="color:#dfe4ff;font-weight:600;white-space:nowrap">${r.v != null ? (+r.v).toFixed(2) : ''}</span>
    <span><b style="font-size:.72em;padding:6px 14px;border-radius:99px;background:${/buy/i.test(r.d) ? 'rgba(47,191,113,.18);color:#5fe39b' : 'rgba(229,50,62,.2);color:#ff8a92'}">${/buy/i.test(r.d) ? 'BUY' : 'SELL'}</b></span>
    <span style="text-align:right;font-weight:800;color:${r.pl >= 0 ? '#E3B62F' : '#ff6b74'}">${mny(ALL.find(x => x === r) || r)}</span></div>`).join('');
  return `<div class="grid"></div><div class="wrap"><div class="logo">${MARK}FTM</div>
    <div class="kick" style="margin-top:40px">${D.when === 'last24' ? 'Last 24 hours · trades' : (D.when === 'yesterday' ? 'Yesterday' : 'Today') + '\'s trades'} · ${part + 1} of ${parts}</div><div class="date">${D.when === 'last24' && D.range ? esc(D.range) : wd + ', ' + d + ' ' + MONTHS[m - 1] + ' ' + y} · Berlin time</div>
    <div style="margin-top:30px;display:grid;grid-template-columns:122px 1fr 100px 118px 210px;font-size:22px;letter-spacing:.08em;text-transform:uppercase;color:#aeb7dc;font-weight:700;padding-bottom:12px"><span>Time</span><span>Market</span><span>Lots</span><span>Order</span><span style="text-align:right">Result</span></div><div style="border-top:1.5px solid rgba(212,175,55,.35)">${rows}</div>
    ${part === parts - 1 && D.balance != null ? `<div style="margin-top:34px;border:1.5px solid rgba(212,175,55,.5);border-radius:24px;padding:24px 28px;background:rgba(11,22,64,.55);display:flex;justify-content:space-between;align-items:center"><span style="font-size:26px;letter-spacing:.1em;text-transform:uppercase;color:#D4AF37;font-weight:700">${D.when === 'last24' ? 'Last 24 hours' : 'Day result'}</span><span style="font-size:52px;font-weight:800;letter-spacing:-.02em">${pc(D.pct)}</span></div>
    <div style="margin-top:18px;font-size:30px;color:#dfe4ff;font-weight:600">The same trades are taken in members' accounts of any size.</div>` : ''}</div>${FOOT}`;
}
/* Loss days and small days (owner 23 Nov: small wins add up): the whole month so far, day by day (green/red), so one red day is seen in context. Every day shown. */
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
    <div style="font-size:54px;font-weight:800;letter-spacing:-.03em;line-height:1.08;margin-top:14px">${D.pct >= 0 ? 'Small profit days add up.' : (D.variant || 1) === 2 ? 'Quiet days, profit days, loss days.' : 'Loss days are part of trading.'}<br><span style="color:#E3B62F;white-space:nowrap">${D.pct >= 0 ? 'One day at a time.' : 'We show you every one.'}</span></div>
    <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:8px;margin-top:28px;font-size:17px;color:#aeb7dc;font-weight:700;letter-spacing:.06em;text-align:center">${['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'WEEK'].map((x, i) => `<span style="${i === 7 ? 'color:#D4AF37' : ''}">${x}</span>`).join('')}</div>
    <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:8px;margin-top:10px">${cells}</div>
    ${D.mtd == null ? '' : `<div style="margin-top:26px;border:1.5px solid rgba(212,175,55,.5);border-radius:24px;padding:22px 28px;background:rgba(11,22,64,.55);display:flex;justify-content:space-between;align-items:center"><span style="font-size:26px;letter-spacing:.1em;text-transform:uppercase;color:#D4AF37;font-weight:700">${MONTHS[m - 1]} so far</span><span style="font-size:60px;font-weight:800;letter-spacing:-.02em;color:${D.mtd >= 0 ? '#E3B62F' : '#ff6b74'}">${pc(D.mtd)}</span></div>`}
    <div style="margin-top:14px;font-size:26px;color:#c9d0ee;font-weight:600">${g} profit day${g === 1 ? '' : 's'} · ${r} loss day${r === 1 ? '' : 's'} · results posted every day at ${D.date >= '2026-11-22' ? '6 p.m.' : '11 p.m.'}</div></div>${FOOT}`;
}
/* Weekly summary (owner 20 Nov: every Saturday 06:00, the week from last Saturday to this Friday). D = {from, to, pct, trades, wins, losses, mtd, balance, cur, markets, days:[{date, pct, n, wins, losses}]} */
function weekRange() { const [y1, m1, d1] = D.from.split('-').map(Number), [y2, m2, d2] = D.to.split('-').map(Number); return (m1 === m2 ? `${d1}` : `${d1} ${MONTHS[m1 - 1]}`) + ` – ${d2} ${MONTHS[m2 - 1]} ${y2}`; }
function weekBars(H) {
  const L = D.days || [], mx = Math.max(.5, ...L.map(x => Math.abs(x.pct)));
  return `<div style="display:grid;grid-template-columns:repeat(${L.length},1fr);gap:14px;align-items:end;height:${H}px;margin-top:34px;position:relative">
    <div style="position:absolute;left:0;right:0;top:${H / 2}px;border-top:1.5px dashed rgba(212,175,55,.35)"></div>
    ${L.map(x => { const [y, m, d] = x.date.split('-').map(Number), wd = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()].slice(0, 3), on = x.n > 0, hh = on ? Math.max(6, Math.abs(x.pct) / mx * (H / 2 - 40)) : 0, up = x.pct >= 0;
      return `<div style="position:relative;height:${H}px"><div style="position:absolute;left:12%;right:12%;${up ? `bottom:${H / 2}px` : `top:${H / 2}px`};height:${hh}px;border-radius:12px;background:${up ? 'linear-gradient(0deg,#1f9d55,#5fe39b)' : 'linear-gradient(180deg,#c42a35,#ff6b74)'};${on ? '' : 'display:none'}"></div>
      <div style="position:absolute;left:0;right:0;${up ? `bottom:${H / 2 + hh + 8}px` : `top:${H / 2 + hh + 8}px`};text-align:center;font-size:22px;font-weight:800;color:${!on ? '#6b7194' : up ? '#5fe39b' : '#ff8a92'}">${on ? pc(x.pct) : ''}</div>
      <div style="position:absolute;left:0;right:0;${up || !on ? `top:${H / 2 + 10}px` : `bottom:${H / 2 + 10}px`};text-align:center;font-size:22px;font-weight:700;color:#aeb7dc">${wd}${on ? '' : '<br><span style="font-size:18px;color:#6b7194">no trades</span>'}</div></div>`; }).join('')}</div>`;
}
function week(w, h) {
  const col = D.pct > 0 ? '#E3B62F' : D.pct < 0 ? '#ff6b74' : '#ffffff', [, m] = D.to.split('-').map(Number), markets = (D.markets || []).map(mk).filter((v, i, a) => a.indexOf(v) === i);
  return `<div class="grid"></div><div class="wrap"><div class="logo">${MARK}FTM</div>
    <div class="kick">This week on FTM · weekly result</div><div class="date">${weekRange()}</div>
    <div class="big" style="font-size:${h > 1500 ? 220 : 180}px;color:${col}">${pc(D.pct)}</div>
    <div class="sub">Result of this week's closed trades, Saturday to Friday</div>
    ${weekBars(h > 1500 ? 380 : 300)}
    <div class="stats"><div class="st"><b>${D.trades}</b><span>Trades</span></div><div class="st"><b>${D.wins}</b><span>Won</span></div><div class="st"><b>${D.losses}</b><span>Lost</span></div></div>
    ${D.mtd == null ? '' : `<div class="stats" style="grid-template-columns:1fr;margin-top:18px"><div class="st"><b style="color:${D.mtd >= 0 ? '#E3B62F' : '#ff6b74'}">${pc(D.mtd)}</b><span>${MONTHS[m - 1]} so far</span></div></div>`}
    ${markets.length && h > 1500 ? `<div class="mk">Markets: ${esc(markets.join(' · '))}</div>` : ''}</div>${FOOT}`;
}
function weekDays(w, h) {
  const L = D.days || [];
  const rows = L.map(x => { const [y, m, d] = x.date.split('-').map(Number), wd = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()], on = x.n > 0;
    return `<div style="display:grid;grid-template-columns:2.1fr 1.1fr 1.4fr 1fr;align-items:center;height:96px;border-bottom:1.5px solid rgba(212,175,55,.18);font-size:34px">
    <span><b style="font-weight:800">${wd}</b> <span style="color:#aeb7dc;font-weight:600;font-size:28px">${d} ${MONTHS[m - 1].slice(0, 3)}</span></span>
    <span style="color:#dfe4ff;font-weight:600">${on ? x.n + ' trade' + (x.n === 1 ? '' : 's') : '—'}</span><span style="color:#aeb7dc;font-weight:600;font-size:28px">${on ? x.wins + ' won · ' + x.losses + ' lost' : ''}</span>
    <span style="text-align:right;font-weight:800;color:${!on ? '#6b7194' : x.pct >= 0 ? '#E3B62F' : '#ff6b74'}">${on ? pc(x.pct) : 'No trades'}</span></div>`; }).join('');
  const sym = { USD: '$', EUR: '€', GBP: '£' }[D.cur] || '';
  return `<div class="grid"></div><div class="wrap"><div class="logo">${MARK}FTM</div>
    <div class="kick" style="margin-top:40px">The week, day by day</div><div class="date">${weekRange()} · Berlin time</div>
    <div style="margin-top:30px;border-top:1.5px solid rgba(212,175,55,.35)">${rows}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;font-size:34px;font-weight:800"><span style="color:#D4AF37;letter-spacing:.06em;font-size:26px;text-transform:uppercase">Week</span><span style="color:${D.pct >= 0 ? '#E3B62F' : '#ff6b74'}">${pc(D.pct)}</span></div>
    ${D.balance != null ? `<div style="margin-top:28px;border:1.5px solid rgba(212,175,55,.5);border-radius:24px;padding:24px 28px;background:rgba(11,22,64,.55);display:flex;justify-content:space-between;align-items:center"><span style="font-size:26px;letter-spacing:.1em;text-transform:uppercase;color:#D4AF37;font-weight:700">${D.mtd != null ? 'Month so far' : 'Week'}</span><span style="font-size:52px;font-weight:800">${pc(D.mtd != null ? D.mtd : D.pct)}</span></div>
    <div style="margin-top:18px;font-size:30px;color:#dfe4ff;font-weight:600">The same trades are taken in members' accounts of any size.</div>` : ''}</div>${FOOT}`;
}
/* Cover image for a reel / short / video (owner 20 Nov: every video post gets its own designed cover). 1080x1920; the words
   sit in the centre square so the profile grid (3:4 / 1:1 crop) shows them. D = {top, title, big, sub, tone: 'up'|'down'|'gold', bg: a still from the video (optional)} */
function cover(w, h) {
  /* Covers v2 (owner 21 Nov 2026: sharper, unique, the best on the grid). Everything sits inside the centre 1080x1440
     that Instagram shows on the profile grid; one glass card, one huge figure or hook, a live badge, a red play button. */
  const tone = D.tone === 'down' ? '#ff6b74' : D.tone === 'up' ? '#5fe39b' : '#E3B62F', land = w > h;
  const glow = D.tone === 'down' ? 'rgba(255,107,116,.35)' : D.tone === 'up' ? 'rgba(95,227,155,.35)' : 'rgba(227,182,47,.35)';
  const bg = D.bg && fs.existsSync(D.bg) ? `<div style="position:absolute;inset:0;background:url(data:image/${/png$/i.test(D.bg) ? 'png' : 'jpeg'};base64,${fs.readFileSync(D.bg).toString('base64')}) center/cover;filter:saturate(1.1)"></div><div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,12,38,.6),rgba(6,12,38,.35) 35%,rgba(6,12,38,.75))"></div>` : '';
  const bars = (D.bars || []).slice(0, 14), mx = Math.max(1e-9, ...bars.map(v => Math.abs(v)));
  const barsH = bars.length ? `<div style="display:flex;align-items:flex-end;justify-content:center;gap:${land ? 8 : 10}px;height:${land ? 70 : 110}px;margin-top:${land ? 18 : 30}px">${bars.map(v => `<i style="display:block;width:${land ? 18 : 26}px;height:${Math.max(8, Math.abs(v) / mx * (land ? 70 : 110))}px;border-radius:6px;background:${v >= 0 ? '#5fe39b' : '#ff6b74'};opacity:.95"></i>`).join('')}</div>` : '';
  const title = D.title ? String(D.title).replace(/<b>/g, '<b style="color:#E3B62F">') : '';
  const badge = `<div style="display:inline-flex;align-items:center;gap:14px;padding:${land ? '10px 20px' : '14px 26px'};border-radius:999px;background:rgba(6,12,38,.6);border:2px solid rgba(227,182,47,.55);font-size:${land ? 24 : 30}px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#E3B62F;white-space:nowrap"><i style="width:14px;height:14px;border-radius:50%;background:#5fe39b;box-shadow:0 0 0 6px rgba(95,227,155,.18)"></i>${esc(D.top || 'FTM')}</div>`;
  const play = `<div style="display:inline-flex;align-items:center;gap:18px;padding:${land ? '16px 30px' : '22px 40px'};border-radius:999px;background:linear-gradient(180deg,#f0414c,#d42633);font-size:${land ? 32 : 42}px;font-weight:900;box-shadow:0 18px 44px rgba(229,50,62,.45);white-space:nowrap"><svg width="${land ? 26 : 34}" height="${land ? 26 : 34}" viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z" fill="#fff"/></svg>${esc(D.sub || 'Watch every trade')}</div>`;
  const big = D.big ? `<div style="font-size:${(land ? [170, 170, 170, 170, 170, 170, 150, 130, 116, 104] : [250, 250, 250, 250, 250, 250, 215, 188, 166, 148])[Math.min(9, String(D.big).length)]}px;white-space:nowrap;font-weight:900;letter-spacing:-.055em;line-height:.95;color:${tone};text-shadow:0 0 70px ${glow},0 16px 40px rgba(0,0,0,.5)">${esc(D.big)}</div>` : '';
  const tt = title ? `<div style="font-size:${land ? (D.big ? 54 : 78) : (D.big ? 70 : 104)}px;font-weight:900;letter-spacing:-.04em;line-height:1.02;margin-top:${D.big ? (land ? 10 : 22) : 0}px;text-wrap:balance;text-shadow:0 10px 40px rgba(0,0,0,.5)">${title}</div>` : '';
  const card = `<div style="position:relative;padding:${land ? '30px 40px' : '56px 56px 50px'};border-radius:${land ? 36 : 56}px;background:linear-gradient(160deg,rgba(31,58,147,.55),rgba(6,12,38,.72));border:3px solid transparent;background-clip:padding-box;box-shadow:0 0 0 3px rgba(227,182,47,.55),0 40px 90px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.12);text-align:center;width:100%">${big}${tt}${barsH}</div>`;
  const logo = `<div class="logo" style="font-size:${land ? 34 : 44}px">${MARK}FTM</div>`;
  const back = `<div style="position:absolute;inset:0;background:radial-gradient(70% 45% at 50% 50%,rgba(227,182,47,.20),transparent 70%)"></div>
    <div style="position:absolute;left:-20%;top:${land ? -30 : 20}%;width:140%;height:${land ? 60 : 26}%;transform:rotate(-14deg);background:linear-gradient(90deg,transparent,rgba(227,182,47,.10),transparent)"></div>
    <div class="grid"></div>
    <div style="position:absolute;left:0;right:0;bottom:${land ? -60 : 40}px;text-align:center;font-weight:900;font-size:${land ? 360 : 520}px;letter-spacing:-.06em;line-height:1;color:transparent;-webkit-text-stroke:2px rgba(227,182,47,.10)">FTM</div>`;
  if (land) return bg + back + `<div style="position:absolute;inset:44px 60px;display:grid;grid-template-columns:auto 1fr;gap:40px;align-items:center;align-content:center">
      <div style="display:flex;flex-direction:column;gap:22px;align-items:flex-start">${logo}${badge}${play}</div>${card}</div>`;
  return bg + back + `<div style="position:absolute;left:70px;right:70px;top:240px;bottom:240px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px">
      <div style="margin-bottom:60px">${logo}</div>${badge}${card}<div style="margin-top:60px">${play}</div></div>${FOOT}`;
}
function card(w, h) {
  return `<div class="grid"></div>${D.line === false ? '' : LINE}<div class="wrap"><div class="logo">${MARK}FTM</div>
    ${D.kicker ? `<div class="kick">${esc(D.kicker)}</div>` : ''}<h1>${D.title}</h1>
    <div class="body">${(D.body || []).map(p => `<p>${p}</p>`).join('')}</div>
    ${D.cta === false ? '' : `<div style="margin-top:${h > 1500 ? 64 : 44}px"><span style="display:inline-block;padding:${h > 1500 ? '28px 54px' : '22px 44px'};border-radius:999px;background:#E5323E;color:#fff;font-weight:800;font-size:${h > 1500 ? 46 : 38}px;box-shadow:0 18px 50px rgba(229,50,62,.35)">${esc(D.cta || 'Start free · link in bio')}</span>${h > 1500 ? `<div style="margin-top:22px;font-size:30px;color:#c9d0ee;font-weight:600">Tap our name above for the link</div>` : ''}</div>`}</div>${FOOT}`;
}  /* owner 23 Nov: every post and story is centred and always ends with a call to action */
/* No-trade day (owner 21 Nov 2026): the 11 p.m. post becomes a short note ("not every day needs a trade") and two slides of real
   statistics: the live account this month (D = the dayresult JSON) and the trust engine's Portfolio backtest. D.night = series number. */
function quietStats() {
  const dir = __dirname + '/../../data/trades/all/100000/g2', T = [];
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json')).sort()) T.push(...JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8')));
  const key = t => new Date(t * 1000).toISOString().slice(0, 10), closed = new Set(T.map(t => key(t[1])));
  const ds = [...closed].sort(), a = new Date(ds[0] + 'T00:00:00Z'), b = new Date(ds[ds.length - 1] + 'T00:00:00Z');
  let all = 0, none = 0, wk = 0, run = 0, streak = 0; const yr = {};
  for (let d = new Date(a); d <= b; d.setUTCDate(d.getUTCDate() + 1)) { all++; const k = d.toISOString().slice(0, 10), q = !closed.has(k);
    if (q) { none++; run++; streak = Math.max(streak, run); if (d.getUTCDay() % 6) wk++; } else run = 0; }
  T.forEach(t => { const y = key(t[1]).slice(0, 4); yr[y] = (yr[y] || 0) + t[6]; });
  let wdays = 0; for (let d = new Date(a); d <= b; d.setUTCDate(d.getUTCDate() + 1)) if (d.getUTCDay() % 6) wdays++;
  const tradedWd = ds.filter(k => new Date(k + 'T00:00:00Z').getUTCDay() % 6).length;
  const ys = Object.keys(yr); return { none, weekdays: wk, streak, oneIn: Math.round(all / none), years: ys.filter(y => yr[y] > 0).length + ' of ' + ys.length, from: ds[0].slice(0, 4), to: ds[ds.length - 1].slice(0, 4),
    trades: T.length, perDay: (T.length / ds.length).toFixed(1), tradedPct: Math.round(tradedWd / wdays * 100), daysPerWeek: (tradedWd / (wdays / 5)).toFixed(1) };
}
function quiet(w, h, part) {
  const [y, m, d] = D.date.split('-').map(Number), wd = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()], mon = MONTHS[m - 1];
  const cal = D.cal || [], green = cal.filter(c => c.pct > 0).length, red = cal.filter(c => c.pct < 0).length, trades = cal.reduce((a, c) => a + (c.n || 0), 0);
  const best = cal.reduce((b, c) => (c.pct > (b ? b.pct : -1e9) ? c : b), null);
  const chip = (t, v, tone) => `<div style="padding:22px 26px;border-radius:24px;background:rgba(6,12,38,.55);border:2px solid rgba(227,182,47,.35);text-align:center"><b style="display:block;font-size:56px;font-weight:900;letter-spacing:-.03em;color:${tone || '#fff'}">${v}</b><span style="font-size:22px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#aeb7dc">${t}</span></div>`;
  const badge = t => `<div style="display:inline-flex;align-items:center;gap:14px;padding:14px 26px;border-radius:999px;background:rgba(6,12,38,.6);border:2px solid rgba(227,182,47,.55);font-size:28px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#E3B62F"><i style="width:14px;height:14px;border-radius:50%;background:#5fe39b"></i>${esc(t)}</div>`;
  const frame = inner => `<div style="position:absolute;inset:0;background:radial-gradient(70% 45% at 50% 48%,rgba(227,182,47,.18),transparent 70%)"></div><div class="grid"></div>
    <div style="position:absolute;left:84px;right:84px;top:60px;bottom:${h > 1500 ? 130 : 96}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:34px">
    <div class="logo">${MARK}FTM</div>${inner}</div>${FOOT}`;
  if ((D.variant || 1) === 2) {
    const Q2 = quietStats(), wkend = [0, 6].includes(new Date(Date.UTC(y, m - 1, d)).getUTCDay());
    if (part === 1) return frame(`${badge((D.daily ? 'Daily #' + D.daily + ' · ' : '') + wd + ' ' + d + ' ' + mon.slice(0, 3))}
    <div style="font-size:210px;font-weight:900;letter-spacing:-.055em;line-height:.95;color:#E3B62F;text-shadow:0 0 70px rgba(227,182,47,.3)">0 trades</div>
    <h1 style="margin:0;font-size:84px">${wkend ? 'The markets rested. <b>So did FTM MACHINE.</b>' : 'No setup, <b>no trade.</b>'}</h1>
    <div class="body" style="margin:0;font-size:38px">${wkend ? 'Gold, the indices and USD/JPY close at the weekend. FTM MACHINE waits for Monday with fresh rules, not fresh emotions.' : 'FTM MACHINE trades only when every rule lines up. Today they did not.'} Swipe 👉</div>`);
    if (part === 2) return month(w, h);
    return frame(`${badge('How selective? · ' + Q2.from + '–' + Q2.to)}
    <div style="font-size:200px;font-weight:900;letter-spacing:-.055em;line-height:.95;color:#E3B62F">${Q2.perDay}</div>
    <h1 style="margin:0;font-size:66px">trades on an average trading day. <b>Not hundreds. A few, by the rules.</b></h1>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;width:100%">${chip('weekdays with a trade', Q2.tradedPct + '%')}${chip('trading days a week', Q2.daysPerWeek)}${chip('years profitable', Q2.years)}</div>
    <div class="body" style="margin:0">${Q2.trades.toLocaleString('en-US')} trades over the years, every one on the trust engine: ftmwealthnation.com</div>`);
  }
  if (part === 1) return frame(`${badge((D.daily ? 'Daily #' + D.daily + ' · ' : D.night ? 'Night ' + D.night + ' · ' : '') + wd + ' ' + d + ' ' + mon.slice(0, 3))}
    <div style="font-size:210px;font-weight:900;letter-spacing:-.055em;line-height:.95;color:#E3B62F;text-shadow:0 0 70px rgba(227,182,47,.3)">0 trades</div>
    <h1 style="margin:0;font-size:86px">Not every day <b>needs a trade.</b></h1>
    <div class="body" style="margin:0;font-size:38px">FTM MACHINE only trades when its rules line up. Waiting is part of the plan. Swipe for the numbers 👉</div>`);
  if (part === 2) return frame(`${badge('Live account · ' + mon + ' so far')}
    <div style="font-size:200px;font-weight:900;letter-spacing:-.055em;line-height:.95;color:${(D.mtd || 0) >= 0 ? '#5fe39b' : '#ff6b74'}">${D.mtd == null ? '—' : pc(D.mtd)}</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:18px;width:100%">${chip('trades', trades)}${chip('profit days', green, '#5fe39b')}${chip('loss days', red, '#ff6b74')}${chip('best day', best ? pc(best.pct) : '—', '#5fe39b')}</div>
    <div class="body" style="margin:0">Every trade is posted here at ${D.date >= '2026-11-22' ? '6 p.m.' : '11 p.m.'}, profit days and loss days.</div>`);
  // owner 21 Nov: on a quiet day the last slide shows that quiet days exist in the backtest too (not big profits)
  const Q = quietStats();
  return frame(`${badge('Trust engine · backtest ' + Q.from + ' to ' + Q.to)}
    <div style="font-size:200px;font-weight:900;letter-spacing:-.055em;line-height:.95;color:#E3B62F">${Q.none.toLocaleString('en-US')}</div>
    <h1 style="margin:0;font-size:68px">days without a trade. <b>About 1 day in ${Q.oneIn}.</b></h1>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;width:100%">${chip('quiet weekdays', Q.weekdays)}${chip('longest quiet run', Q.streak + ' days')}${chip('years profitable', Q.years)}</div>
    <div class="body" style="margin:0">Quiet days are part of the plan. Every trade of the backtest is on the trust engine: ftmwealthnation.com</div>`);
}
(async () => {
  const b = await chromium.launch(); fs.mkdirSync(outDir, { recursive: true });
  const name = nameArg || (kind === 'day' || kind === 'quiet' ? 'day-' + D.date : kind === 'week' ? 'week-' + D.to : 'card');
  const jobs = kind === 'day' ? [['post', 1080, 1350, () => day(1080, 1350)], ['story', 1080, 1920, () => day(1080, 1920)]] : kind === 'card' ? [['post', 1080, 1350, () => card(1080, 1350)], ['story', 1080, 1920, () => card(1080, 1920)]] : kind === 'cover' ? [['cover', 1080, 1920, () => cover(1080, 1920)], ['thumb', 1280, 720, () => cover(1280, 720)]] : kind === 'week' ? [['post', 1080, 1350, () => week(1080, 1350)], ['days', 1080, 1350, () => weekDays(1080, 1350)], ['story', 1080, 1920, () => week(1080, 1920)]] : kind === 'quiet' ? [['quiet1', 1080, 1350, () => quiet(1080, 1350, 1)], ['quiet2', 1080, 1350, () => quiet(1080, 1350, 2)], ['quiet3', 1080, 1350, () => quiet(1080, 1350, 3)]] : [];
  if (kind === 'day' && (D.rows || []).length) { const parts = D.rows.length > 10 ? 2 : 1; for (let i = 0; i < parts; i++) jobs.push(['trades' + (i + 1), 1080, 1350, () => trades(1080, 1350, i, parts)]); }
  if (kind === 'day' && D.pct < 0.5 && (D.cal || []).length) jobs.push(['month', 1080, 1350, () => month(1080, 1350)]);
  for (const [tag, w, h, fn] of jobs) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.setContent(`<html><head><style>${css(w, h)}</style></head><body>${fn()}</body></html>`);
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${outDir}/${name}-${tag}.png` }); await p.screenshot({ path: `${outDir}/${name}-${tag}.jpg`, type: 'jpeg', quality: 95 }); await p.close();
  }
  await b.close();
  // owner 22 Nov: TikTok and YouTube Shorts show the video's first frame, so the cover becomes the video's first frame
  if (kind === 'cover') { const mp4 = `${outDir}/${name}.mp4`; if (fs.existsSync(mp4)) require('child_process').spawnSync('python3', [require('path').join(__dirname, 'coverfirst.py'), mp4, `${outDir}/${name}-cover.jpg`], { stdio: 'inherit' }); }
  console.log('ok', name);
})();
