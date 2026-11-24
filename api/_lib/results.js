/* FTM news: the FTM master account's results, posted automatically (daily job /api/v1/news-cron, see vercel.json).
   Every day at 18:00 (FTM time, Europe/Berlin; owner 24 Nov 2026) the closed trades and result of the last 24 hours (18:00 the day
   before to 18:00), like the 6 p.m. social posts; on Fridays also the week (Saturday to Friday, a summary: result, trades, winning trades, markets); on the last day of
   the month at 18:00 also that month (the email is the member's monthly statement: balances, deposits, withdrawals, return,
   highest and lowest balance, a day-by-day balance chart, markets, and a button that opens the PDF statement). Figures from the FTM engine through
   ftm-calc.js (the dashboards' own calculation). Each post appears in Community (For you, Following and FTM news).
   Posts carry a `card` the feed draws in the FTM design, in each member's language and local time; `x` is a short text
   for share links. Never posts the same period twice.
   Emails: each member gets the same day/week/month result for THEIR OWN accounts (read from the engine as that member),
   never the master account's or another member's; members with no account of their own get no result email (FTM news has
   the master). The FTM owner logins get the master account and their own accounts. */
const crypto = require('crypto');
const P = require('./push');
const StaffLib = require('./staff');
const H = require('./accountHistory');
const Mail = require('./mail');
const Tpl = require('./passwordEmail');

const TZ = process.env.FTM_TZ || 'Europe/Berlin';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function parts(ms, tz) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' });
  const o = {}; f.formatToParts(new Date(ms)).forEach(p => { o[p.type] = p.value; });
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, min: +o.minute, wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday) };
}
/* The UTC time of local midnight on a calendar date in tz (handles summer time). */
function midnight(y, m, d, tz) {
  let t = Date.UTC(y, m - 1, d);
  for (let i = 0; i < 3; i++) { const p = parts(t, tz), shown = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min); t -= shown - Date.UTC(y, m - 1, d); }
  return t;
}
// owner 24 Nov 2026: a result day runs from 18:00 the day before to 18:00 (Berlin), like the 6 p.m. posts
const CUT = 6 * 3600e3;
function edge(y, m, d) { return midnight(y, m, d, TZ) - CUT; }
function ymd(y, m, d) { return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
function addDays(y, m, d, n) { const t = new Date(Date.UTC(y, m - 1, d + n)); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; }
function money(v, cur) { const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); const sym = { USD: '$', EUR: '€', GBP: '£' }[cur] || ''; return (v > 0 ? '+' : v < 0 ? '-' : '') + (sym ? sym + s : s + ' ' + (cur || '')); }
function pct(v) { return (v > 0 ? '+' : v < 0 ? '-' : '') + Math.abs(v).toFixed(2) + '%'; }

async function master(admin) {
  const users = []; for (let page = 1; page <= 50; page++) { const r = await admin.auth.admin.listUsers({ page, perPage: 1000 }); if (r.error) throw new Error(r.error.message); users.push(...(r.data.users || [])); if ((r.data.users || []).length < 1000) break; }
  const owners = StaffLib.owners(), reader = users.find(u => owners.indexOf(String(u.email || '').toLowerCase()) !== -1 && u.email_confirmed_at) || users.find(u => u.email_confirmed_at);
  if (!reader) throw new Error('NO_READER');
  const A = (await H.accounts(reader)).mapped, m = A.find(a => a.isMaster) || A.find(a => a.isPreview);
  if (!m || !m.accountId) throw new Error('NO_MASTER_ACCOUNT');
  const h = await H.load(reader, m);
  return { reader, m, h };
}

function dayCard(h, cur, y, m, d) {
  const a = edge(y, m, d), [y2, m2, d2] = addDays(y, m, d, 1), z = edge(y2, m2, d2), sg = h.M.seg(a, z);
  const T = h.closed.filter(t => t.closeTime >= a && t.closeTime < z && t.pl != null).sort((p, q) => p.closeTime - q.closeTime);
  const card = { k: 'day', date: ymd(y, m, d), cur, net: +sg.pl.toFixed(2), pct: +sg.pct.toFixed(4), n: T.length,
    rows: T.slice(0, 60).map(t => ({ o: t.openTime || null, c: t.closeTime, s: t.symbol, d: t.dir, v: t.lots, pl: +(+t.pl).toFixed(2) })) };
  const wd = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  card.x = 'FTM MACHINE · ' + wd + ', ' + d + ' ' + MONTHS[m - 1] + ' ' + y + ': ' + (T.length ? T.length + ' trade' + (T.length === 1 ? '' : 's') + ' closed, net ' + money(sg.pl, cur) + ' (' + pct(sg.pct) + ').' : 'no trades closed today.');
  return card;
}
function periodCard(k, h, cur, from, to, label) {
  const a = edge(from[0], from[1], from[2]), z = edge(to[0], to[1], to[2]), sg = h.M.seg(a, z);
  const T = h.closed.filter(t => t.closeTime >= a && t.closeTime < z && t.pl != null), wins = T.filter(t => t.pl > 0).length;
  const days = []; let cur3 = from.slice();
  for (let i = 0; i < 32; i++) { const s = edge(cur3[0], cur3[1], cur3[2]); if (s >= z) break; const nx = addDays(cur3[0], cur3[1], cur3[2], 1), e = edge(nx[0], nx[1], nx[2]);
    const n = T.filter(t => t.closeTime >= s && t.closeTime < e).length; if (n) { const g = h.M.seg(s, e); days.push({ date: ymd(cur3[0], cur3[1], cur3[2]), n, pl: +g.pl.toFixed(2), pct: +g.pct.toFixed(4) }); } cur3 = nx; }
  const best = days.length ? days.reduce((p, q) => q.pct > p.pct ? q : p) : null, worst = days.length ? days.reduce((p, q) => q.pct < p.pct ? q : p) : null;
  const byM = {}; T.forEach(t => { const q = t.symbol || '—'; const x = byM[q] || (byM[q] = { s: q, n: 0, w: 0, pl: 0 }); x.n++; if (t.pl > 0) x.w++; x.pl += +t.pl; });
  const mk = Object.keys(byM).map(q => ({ s: q, n: byM[q].n, w: byM[q].w, pl: +byM[q].pl.toFixed(2) })).sort((p, q) => q.pl - p.pl);
  const card = { k, mk, wins, from: ymd(from[0], from[1], from[2]), to: ymd(...addDays(to[0], to[1], to[2], -1)), cur, net: +sg.pl.toFixed(2), pct: +sg.pct.toFixed(4), n: T.length, win: T.length ? +(wins / T.length * 100).toFixed(1) : null,
    days: k === 'week' ? days : undefined, best: best ? { date: best.date, pct: best.pct, pl: best.pl } : null, worst: worst ? { date: worst.date, pct: worst.pct, pl: worst.pl } : null, tdays: days.length };
  card.x = 'FTM MACHINE · ' + label + ': ' + T.length + ' trade' + (T.length === 1 ? '' : 's') + ', net ' + money(sg.pl, cur) + ' (' + pct(sg.pct) + ').';
  return card;
}

/* A month statement for one account: opening and closing balance, deposits, withdrawals, trading result, the time-weighted
   return (seg), highest and lowest balance with dates and the end-of-day balance of every day, all from the engine history
   through ftm-calc.js (the same numbers as the statement PDF in the client area). */
function statementFor(h, y, m) {
  const a = edge(y, m, 1), nm = m === 12 ? [y + 1, 1, 1] : [y, m + 1, 1], z = edge(nm[0], nm[1], nm[2]), M = h.M;
  const open = M.balAt(a), close = M.balAt(z), sg = M.seg(a, z);
  let dep = 0, wd = 0; ((h.es && h.es.flows) || []).forEach(f => { if (f.t >= a && f.t < z) { if (f.amt > 0) dep += f.amt; else wd -= f.amt; } });
  const adj = close - open - dep + wd - sg.pl;
  let inM = (M.curve || []).filter(p => p.t >= a && p.t < z).map(p => [p.t, p.v]); const fresh = Math.abs(open) < 0.005 && inM.some(p => Math.abs(p[1]) >= 0.005);
  if (fresh) while (inM.length && Math.abs(inM[0][1]) < 0.005) inM.shift();
  const pts = fresh ? inM : [[a, open]].concat(inM);
  const hi = pts.reduce((q, p) => p[1] > q[1] ? p : q, pts[0]), lo = pts.reduce((q, p) => p[1] < q[1] ? p : q, pts[0]);
  const daysB = []; let dd = [y, m, 1]; for (let i = 0; i < 31; i++) { const s0 = edge(dd[0], dd[1], dd[2]); if (s0 >= z) break; const nx = addDays(dd[0], dd[1], dd[2], 1); const de = Math.min(edge(nx[0], nx[1], nx[2]), Date.now()); daysB.push({ date: ymd(dd[0], dd[1], dd[2]), v: (fresh && de <= pts[0][0]) ? null : +M.balAt(de).toFixed(2) }); dd = nx; }
  return { open: +open.toFixed(2), close: +close.toFixed(2), dep: +dep.toFixed(2), wd: +wd.toFixed(2), pl: +sg.pl.toFixed(2), pct: +sg.pct.toFixed(4), adj: Math.abs(adj) >= 0.005 ? +adj.toFixed(2) : 0,
    hi: { v: +hi[1].toFixed(2), t: hi[0] }, lo: { v: +lo[1].toFixed(2), t: lo[0] }, days: daysB, from: ymd(y, m, 1), to: ymd(...addDays(nm[0], nm[1], nm[2], -1)) };
}

/* The card of one period key (day-YYYY-MM-DD, week-YYYY-MM-DD = the Friday, month-YYYY-MM) for one account's history. */
function cardFor(key, h, cur) {
  const p = key.split('-').map(Number), k = key.split('-')[0];
  if (k === 'day') return dayCard(h, cur, p[1], p[2], p[3]);
  if (k === 'week') { const s = addDays(p[1], p[2], p[3], -6); return periodCard('week', h, cur, s, addDays(p[1], p[2], p[3], 1), 'week of ' + s[2] + ' ' + MONTHS[s[1] - 1] + ' to ' + p[3] + ' ' + MONTHS[p[2] - 1] + ' ' + p[1]); }
  const nm = p[2] === 12 ? [p[1] + 1, 1, 1] : [p[1], p[2] + 1, 1];
  return periodCard('month', h, cur, [p[1], p[2], 1], nm, MONTHS[p[2] - 1] + ' ' + p[1]);
}
/* Why an own account closed no trade on a day: what the master account did that day (mn = its closed trades), the
   account's balance (trades are sized to it, and small accounts hit the broker's 0.01-lot minimum) and its open trades. */
function whyNone(mn, acct) { return { mn: +mn || 0, bal: acct && acct.balance != null && isFinite(+acct.balance) ? +acct.balance : null, open: (acct && +acct.openPositions) || 0 }; }
/* The member's name as they gave it (full name, else first and last name); empty when unknown. */
function nameOf(u) { const m = (u && u.user_metadata) || {}; return String(m.full_name || m.name || [m.first_name, m.last_name].filter(Boolean).join(' ') || '').replace(/\s+/g, ' ').trim().slice(0, 60); }
/* A member's own accounts: never the FTM master account or the master preview free accounts see. */
function ownAccounts(A) { return (A || []).filter(a => a && a.accountId && !a.isMaster && !a.isPreview); }
/* What a login is emailed: its own accounts; the FTM owner logins also get the master account (first), never anyone else's.
   Free members (no account of their own) get the FTM master account's results, the same account their client area shows. */
function mailAccounts(A, isOwner) {
  const own = ownAccounts(A);
  const m = (A || []).find(a => a && a.accountId && a.isMaster) || (A || []).find(a => a && a.accountId && a.isPreview);
  if (isOwner) return m ? [m].concat(own) : own;
  return own.length ? own : (m ? [m] : []);
}

/* One run. Posts what is due at this local time; o.force posts today's day result now (staff/test). */
async function run(admin, o) {
  o = o || {}; const now = o.now || Date.now(), lp = parts(now, TZ), log = [];
  if (!o.force && !(lp.h >= 18 || lp.h < 3)) return { log: ['not 18:00 in ' + TZ + ' (' + lp.h + ':' + String(lp.min).padStart(2, '0') + ')'] };
  const ref = parts(now - 3 * 3600e3, TZ), y = ref.y, m = ref.m, d = ref.d, wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const done = await P.read(admin, 'results/posted.json', { keys: [] }), want = [];
  want.push({ key: 'day-' + ymd(y, m, d) });
  if (wd === 5) want.push({ key: 'week-' + ymd(y, m, d) });
  if (addDays(y, m, d, 1)[2] === 1) want.push({ key: 'month-' + y + '-' + String(m).padStart(2, '0') });
  const todo = want.filter(w => done.keys.indexOf(w.key) === -1);
  if (!todo.length) return { log: ['already posted ' + want.map(w => w.key).join(', ')] };
  const { m: acct, h, reader } = await master(admin), cur = acct.currency || 'USD';
  const Pst = await P.read(admin, 'posts.json', { posts: [] }); let t0 = Date.now();
  for (const w of todo) {
    const card = cardFor(w.key, h, cur);
    const x = card.x; delete card.x;
    Pst.posts.push({ id: Date.now().toString(36) + crypto.randomBytes(3).toString('hex'), a: P.midOf(reader.id), x, t: new Date(t0++).toISOString(), lk: [], c: [], ftm: true, card, res: w.key });
    done.keys.push(w.key); log.push('posted ' + w.key);
  }
  done.keys = done.keys.slice(-400);
  await P.write(admin, 'posts.json', Pst); await P.write(admin, 'results/posted.json', done);
  return { log };
}

/* The same result as an email, in the member's language (labels from the site's i18n files), times in FTM time (Berlin). */
const LOCALE = { zh: 'zh-CN', 'zh-tw': 'zh-TW', en: 'en-GB' };
function e(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
async function emailFor(card, lang, acct, who) {
  const loc = LOCALE[lang] || lang, t = x => P.tr(lang, x);
  const M = v => { const n = +v || 0; let a; try { a = Math.abs(n).toLocaleString(loc, { style: 'currency', currency: card.cur || 'USD', currencyDisplay: 'narrowSymbol', minimumFractionDigits: 2, maximumFractionDigits: 2 }); } catch (x) { a = Math.abs(n).toFixed(2) + ' ' + (card.cur || ''); } return (n > 0 ? '+' : n < 0 ? '-' : '') + a; };
  const PC = v => { const n = +v || 0; return (n > 0 ? '+' : n < 0 ? '-' : '') + Math.abs(n).toFixed(2) + '%'; }, col = v => v > 0 ? '#1f8a5b' : v < 0 ? '#b4232c' : '#0b1640';
  const D = (ymd, o) => { const a = String(ymd).split('-'); try { return new Date(Date.UTC(+a[0], +a[1] - 1, +a[2], 12)).toLocaleDateString(loc, Object.assign({ timeZone: 'UTC' }, o)); } catch (x) { return ymd; } };
  const hm = ms => ms ? new Date(ms).toLocaleTimeString(loc, { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : '—';
  let tzName = ''; try { tzName = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, timeZoneName: 'short' }).formatToParts(card.rows && card.rows[0] ? card.rows[0].c : Date.now()).find(p => p.type === 'timeZoneName').value; } catch (x) { tzName = ''; }
  const TH = x => '<td style="padding:8px 6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6b7194;font-weight:bold;border-bottom:1px solid #e6e9f2;white-space:nowrap;">' + e(x) + '</td>';
  const TD = (x, c, b) => '<td style="padding:9px 6px;font-size:14px;color:' + (c || '#0b1640') + ';' + (b ? 'font-weight:bold;' : '') + 'border-bottom:1px solid #e6e9f2;white-space:nowrap;">' + e(x) + '</td>';
  const kind = card.k === 'day' ? 'Daily result' : card.k === 'week' ? 'Weekly result' : card.st ? 'Monthly statement' : 'Monthly result';
  const summaryTiles = async () => { const tile = (l, v, s2, c) => '<td width="33%" valign="top" style="padding:12px 10px;background:#f7f8fb;border-radius:10px;"><p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7194;font-weight:bold;">' + e(l) + '</p><p style="margin:4px 0 0;font-size:18px;font-weight:bold;color:' + (c || '#0b1640') + ';">' + e(v) + '</p>' + (s2 ? '<p style="margin:2px 0 0;font-size:12px;color:#6b7194;">' + e(s2) + '</p>' : '') + '</td>';
    const w = card.wins != null ? card.wins : Math.round((card.win || 0) * card.n / 100);
    return '<table width="100%" cellpadding="0" cellspacing="6" style="margin:6px 0 0;"><tr>' + tile(await t('Trades'), card.n) + tile(await t('Winning trades'), card.n ? w + ' / ' + card.n : '—', card.n ? Math.round(w / card.n * 100) + '%' : '', card.n ? '#1f8a5b' : '') + tile(await t('Markets traded'), (card.mk || []).length) + '</tr></table>'; };
  const marketTable = async () => { if (!card.mk || !card.mk.length) return '';
    return '<p style="margin:16px 0 4px;font-size:12px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:#6b7194;">' + e(await t('By market')) + '</p><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>' + TH(await t('Market')) + TH(await t('Trades')) + TH(await t('Won')) + TH('P/L') + '</tr>'
      + card.mk.map(x => '<tr>' + TD(x.s) + TD(x.n) + TD(x.w + ' / ' + x.n) + TD(M(x.pl), col(x.pl), true) + '</tr>').join('') + '</table>'; };
  let head, sub = '', table = '';
  if (card.k === 'day') {
    head = D(card.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    { const [yy, mm2, dd2] = String(card.date).split('-').map(Number), f = ms => { try { return new Date(ms).toLocaleString(loc, { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); } catch (x) { return new Date(ms).toISOString().slice(0, 16); } };
      card.range = f(edge(yy, mm2, dd2)) + ' – ' + f(edge(...addDays(yy, mm2, dd2, 1))) + (tzName ? ' (' + tzName + ')' : ''); }
    sub = card.n ? (card.n === 1 ? await t('One trade closed this day.') : (await t('{} trades closed this day.')).replace('{}', card.n)) : await t('No trades closed this day.');
    sub = card.range + ' · ' + sub;
    if (card.rows && card.rows.length) {
      // owner 24 Nov: members do not need entry times or sizes; one line per market and direction with the combined result
      const G = {}; card.rows.forEach(r => { const dir = /buy/i.test(String(r.d || '')) ? 'Buy' : 'Sell', k = (r.s || '') + '|' + dir; const g = G[k] || (G[k] = { s: r.s || '', dir, pl: 0, first: r.c || 0 }); g.pl += +r.pl || 0; });
      table = '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:6px 0 0;"><tr>' + TH(await t('Market')) + TH(await t('Direction')) + TH('P/L') + '</tr>';
      for (const g of Object.values(G).sort((x, y) => x.first - y.first)) table += '<tr>' + TD(g.s, '', true) + TD(await t(g.dir), g.dir === 'Buy' ? '#1f8a5b' : '#b4232c', true) + TD(M(g.pl), col(g.pl), true) + '</tr>';
      table += '</table>';
      if (card.net < 0) table += '<table width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 0;background:#f7f8fb;border-left:4px solid #D4AF37;border-radius:10px;"><tr><td style="padding:12px 16px;font-size:14px;line-height:1.5;color:#46507a;">' + e(await t('Loss days are part of the plan. The real profit is in the long term, not in one day.')) + '</td></tr></table>';
    }
    if (card.why && !card.n) {
      const W = card.why, bal = W.bal != null ? M(W.bal).replace(/^\+/, '') : '', lines = [];
      if (W.open > 0) lines.push(W.open === 1 ? await t('One trade is still open on your account. It is counted on the day it closes.') : (await t('{} trades are still open on your account. They are counted on the day they close.')).replace('{}', W.open));
      else if (!W.mn) lines.push(await t('FTM MACHINE found no trade that met its rules today, on any account. Days without a trade are normal: not trading is also a decision.'));
      else if (W.bal != null && W.bal < 2000) { lines.push((await t('The FTM master account traded today. FTM MACHINE sizes every trade to your balance, and on an account of {} some trades come out smaller than your broker\'s smallest size (0.01 lot). FTM MACHINE then skips the trade rather than take more risk than your profile allows.')).replace('{}', bal)); lines.push(await t('Your account is below the recommended size, so it trades about 60% of the time.')); lines.push(await t('Accounts of 2,000 or more take part in more trades.')); }
      else lines.push(await t('The FTM master account traded today, but no trade opened on your account. If this happens again tomorrow, reply to this email or ask us in Ask here and we will check your connection.'));
      table += '<table width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 0;background:#f7f8fb;border-left:4px solid #D4AF37;border-radius:10px;"><tr><td style="padding:14px 16px;"><p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:#0b1640;">' + e(await t('Why no trade today?')) + '</p>'
        + lines.map(x => '<p style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#46507a;">' + e(x) + '</p>').join('') + '</td></tr></table>';
    }
  } else if (card.k === 'week') {
    head = D(card.from, { day: 'numeric', month: 'short' }) + ' – ' + D(card.to, { day: 'numeric', month: 'long', year: 'numeric' });
    sub = card.n === 1 ? await t('One trade closed this week.') : (await t('{} trades closed this week.')).replace('{}', card.n);
    table = await summaryTiles() + await marketTable();
  } else if (card.st) {
    const st = card.st, dl = ms => { try { return new Date(ms).toLocaleDateString(loc, { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }); } catch (x) { return ''; } };
    head = D(card.from, { month: 'long', year: 'numeric' }); sub = D(st.from, { day: 'numeric', month: 'short', year: 'numeric' }) + ' – ' + D(st.to, { day: 'numeric', month: 'short', year: 'numeric' });
    const row = (l, v, c, b) => '<tr><td style="padding:9px 0;font-size:14px;color:#46507a;border-bottom:1px solid #e6e9f2;' + (b ? 'font-weight:bold;color:#0b1640;' : '') + '">' + e(l) + '</td><td align="right" style="padding:9px 0;font-size:14px;font-weight:bold;white-space:nowrap;color:' + (c || '#0b1640') + ';border-bottom:1px solid #e6e9f2;">' + e(v) + '</td></tr>';
    const SG = v => (v > 0 ? '+' : v < 0 ? '-' : '') + M(Math.abs(v)).replace(/^[+-]/, '');
    table = '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:6px 0 12px;">' + row(await t('Opening balance'), M(st.open).replace(/^\+/, '')) + row(await t('Deposits'), SG(st.dep), '#1f8a5b') + row(await t('Withdrawals'), SG(-st.wd), st.wd ? '#b4232c' : '')
      + row(await t('Trading result'), SG(st.pl), col(st.pl)) + (st.adj ? row(await t('Dividends, tax & adjustments'), SG(st.adj), col(st.adj)) : '') + row(await t('Closing balance'), M(st.close).replace(/^\+/, ''), '', true) + '</table>';
    const tile = (l, v, s2, c) => '<td width="33%" valign="top" style="padding:12px 10px;background:#f7f8fb;border-radius:10px;"><p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7194;font-weight:bold;">' + e(l) + '</p><p style="margin:4px 0 0;font-size:17px;font-weight:bold;color:' + (c || '#0b1640') + ';">' + e(v) + '</p>' + (s2 ? '<p style="margin:2px 0 0;font-size:12px;color:#6b7194;">' + e(s2) + '</p>' : '') + '</td>';
    table += '<table width="100%" cellpadding="0" cellspacing="6" style="margin:0 0 6px;"><tr>' + tile(await t('Return'), PC(st.pct), '', col(st.pct)) + tile(await t('Highest balance'), M(st.hi.v).replace(/^\+/, ''), dl(st.hi.t)) + tile(await t('Lowest balance'), M(st.lo.v).replace(/^\+/, ''), dl(st.lo.t)) + '</tr></table>';
    const vs = st.days.filter(x => x.v != null).map(x => x.v), mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs), base = mn - Math.max((mx - mn) * 0.6, Math.abs(mx) * 0.01, 1), rg = mx - base;
    table += '<p style="margin:14px 0 6px;font-size:12px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:#6b7194;">' + e(await t('Account balance')) + '</p>'
      + '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:2px 0;height:110px;"><tr valign="bottom">' + st.days.map(x => '<td valign="bottom" style="height:110px;padding:0;" title="' + e(D(x.date, { day: 'numeric', month: 'short' }) + (x.v == null ? '' : ': ') + (x.v == null ? '' : M(x.v).replace(/^\+/, ''))) + '">' + (x.v == null ? '' : '<div style="height:' + Math.max(3, Math.round(104 * (x.v - base) / rg)) + 'px;background:#D4AF37;border-radius:3px 3px 0 0;font-size:0;line-height:0;">&nbsp;</div>') + '</td>').join('') + '</tr></table>'
      + '<table width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 0;"><tr><td style="font-size:11px;color:#6b7194;">' + e(D(st.from, { day: 'numeric', month: 'short' })) + '</td><td align="right" style="font-size:11px;color:#6b7194;">' + e(D(st.to, { day: 'numeric', month: 'short' })) + '</td></tr></table>';
    table += await marketTable();
  } else {
    head = D(card.from, { month: 'long', year: 'numeric' });
    table = await summaryTiles() + await marketTable();
  }
  const netCol = v => v > 0 ? '#6ee7a8' : v < 0 ? '#ff8a92' : '#ffffff';
  const body = '<div' + (['ar', 'he', 'fa', 'ur'].indexOf(lang) !== -1 ? ' dir="rtl"' : '') + '>'
    + '<p style="margin:0 0 4px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#B8902A;font-weight:bold;">' + e(acct ? (who || await t('Your account')) + (acct.number ? ' · ' + acct.number : '') : await t('FTM master account')) + '</p>'
    + '<p style="margin:0 0 4px;font-size:20px;font-weight:bold;color:#0b1640;">' + e(head) + '</p>' + (sub ? '<p style="margin:0 0 8px;font-size:14px;color:#6b7194;">' + e(sub) + '</p>' : '') + table
    + '<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#0b1640" style="' + Tpl.NAVY + 'border-radius:14px;margin:16px 0 6px;"><tr><td style="padding:16px 18px;color:#E3B62F;font-size:12px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;">' + Tpl.keep(e(await t('Net P&L'))) + '</td>'
    + '<td align="right" style="padding:16px 18px;"><p style="margin:0;font-size:26px;font-weight:bold;color:' + netCol(card.net) + ';font-family:Arial,Helvetica,sans-serif;">' + Tpl.keep(e(M(card.net))) + '</p><p style="margin:2px 0 0;font-size:14px;font-weight:bold;color:' + netCol(card.pct) + ';">' + Tpl.keep(e(PC(card.pct))) + '</p></td></tr></table>'
    + '<table cellpadding="0" cellspacing="0" style="margin:20px 0 22px;"><tr><td bgcolor="#E5323E" style="border-radius:999px;"><a href="https://www.ftmwealthnation.com/?open=' + (card.st && acct ? 'statement&from=' + card.st.from + '&to=' + card.st.to : (acct ? 'calendar' : 'community')) + '" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:999px;">' + e(await t(card.st && acct ? 'Download your statement (PDF)' : (acct ? 'Calendar' : 'FTM news'))) + ' &rarr;</a></td></tr></table></div>';
  return { subject: 'FTM · ' + (await t(kind)) + ': ' + head + (acct && acct.number ? ' · ' + acct.number : '') + ' · ' + M(card.net) + ' (' + PC(card.pct) + ')', html: Tpl.shell(await t(kind), body, { head: true }) };
}
/* Emails every confirmed login the result of THEIR OWN accounts for each period posted in the last 3 days that they
   have not had yet: the same calculation as the post, on their own history read from the engine as them. Never the master
   account (that is on FTM news). An account with no trades in the period gets an email only while it is trading.
   Four members at a time; stops taking new members at the deadline; progress is saved as it goes so nobody gets an email
   twice; a member whose engine read fails is retried on the next calls and skipped after 3 tries. */
function within(ms, p) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms))]); }
/* Own-account emails started on 17 Nov 2026; earlier posts were emailed (with the master's figures) and are not sent again. */
const OWN_SINCE = Date.parse('2026-11-17T12:00:00Z');
async function mail(admin, o) {
  o = o || {}; const deadline = o.deadline || (Date.now() + 30000), log = []; let more = false;
  const done = await P.read(admin, 'results/posted.json', { keys: [] }), keys = done.keys.slice(-6);
  if (!keys.length) return { more, log };
  const posts = (await P.read(admin, 'posts.json', { posts: [] })).posts;
  const due = [];
  for (const key of keys) {
    const st = await P.read(admin, 'results/own-' + key + '.json', null); if (st && st.finished) continue;
    const post = posts.find(x => x.res === key); if (!post || !post.card || Date.now() - Date.parse(post.t) > 3 * 864e5 || Date.parse(post.t) < OWN_SINCE) continue;
    const S = Object.assign({ done: [], sent: 0, failed: 0, none: 0 }, st || {}); S.tries = S.tries || {};
    due.push({ key, S, have: new Set(S.done), mn: post.card && post.card.n });
  }
  if (!due.length) return { more, log };
  const lock = await P.read(admin, 'results/mail-lock.json', null);
  if (!o.chain && lock && lock.until > Date.now()) return { more: false, log: ['emails already being sent'] };
  await P.write(admin, 'results/mail-lock.json', { until: deadline + 40000 });
  const Letter = require('./letter');
  let users = []; for (let page = 1; page <= 50; page++) { const r = await admin.auth.admin.listUsers({ page, perPage: 1000 }); if (r.error) throw new Error(r.error.message); users.push(...(r.data.users || [])); if ((r.data.users || []).length < 1000) break; }
  users = users.filter(u => u.email && u.email_confirmed_at);
  const queue = users.filter(u => due.some(w => !w.have.has(u.id)));
  let chain = Promise.resolve(); const mcache = new Map();
  const save = () => { chain = chain.then(() => Promise.all(due.map(w => P.write(admin, 'results/own-' + w.key + '.json', w.S)))).catch(() => {}); return chain; };
  const finish = (w, u) => { if (w.have.has(u.id)) return; w.S.done.push(u.id); w.have.add(u.id); delete w.S.tries[u.id]; };
  async function one(u) {
    const pend = due.filter(w => !w.have.has(u.id));
    let out;
    try {
      out = await within(20000, (async () => {
        const own = mailAccounts((await H.accounts(u)).mapped, StaffLib.owners().indexOf(String(u.email || '').toLowerCase()) !== -1);
        if (!own.length) return null;
        const lang = Letter.langOf(u, await P.getBox(admin, P.midOf(u.id)).catch(() => null)), list = [];
        for (const acct of own) {
          const mk = (acct.isMaster || acct.isPreview) ? 'm:' + acct.accountId : null;
          const h = mk ? (mcache.get(mk) || await (async () => { const x = await H.load(u, acct); mcache.set(mk, x); return x; })()) : await H.load(u, acct), cur = acct.currency || 'USD';
          for (const w of pend) { const card = cardFor(w.key, h, cur), mst = acct.isMaster || acct.isPreview;
            if (/^month-/.test(w.key)) { const q = w.key.split('-'); card.st = statementFor(h, +q[1], +q[2]); }
            const moved = card.st && (card.st.dep || card.st.wd || card.st.close || card.st.open);
            if (card.k === 'day' && !card.n && !mst) card.why = whyNone(w.mn, acct);
            if (mst || card.n || acct.active || moved) list.push({ w, m: await emailFor(card, lang, mst ? null : acct, nameOf(u)) }); }
        }
        return list;
      })());
    } catch (e) {
      pend.forEach(w => { const n = (w.S.tries[u.id] || 0) + 1; w.S.tries[u.id] = n; if (n >= 3) { w.S.failed++; finish(w, u); } });
      console.error('result email', String(e && e.message || e).slice(0, 120));
      return;
    }
    if (!out) { pend.forEach(w => { w.S.none++; finish(w, u); }); return; }
    pend.forEach(w => finish(w, u)); await save();
    for (const x of out) {
      try { const via = await Mail.sendMail({ to: u.email, subject: x.m.subject, html: x.m.html }); if (via) x.w.S.sent++; else x.w.S.failed++; } catch (e2) { x.w.S.failed++; }
    }
  }
  let i = 0;
  async function worker() { while (i < queue.length) { if (Date.now() > deadline) return; await one(queue[i++]); } }
  await Promise.all([0, 1, 2, 3].map(worker));
  for (const w of due) {
    if (users.every(u => w.have.has(u.id))) w.S.finished = new Date().toISOString(); else more = true;
    log.push('emailed ' + w.key + ': ' + w.S.sent + ' sent, ' + w.S.none + ' with no account of their own, ' + w.S.failed + ' failed' + (w.S.finished ? '' : ' so far'));
  }
  await save();
  await P.write(admin, 'results/mail-lock.json', { until: more ? Date.now() + 40000 : 0 });
  return { more, log };
}

/* Samples for the owners: the weekly summary (last completed week) and the monthly statement (this month so far) of the
   owner login's own accounts (the master and its copying account), emailed only to the owner mailboxes, at most once per
   10 minutes. Called by /api/v1/news-cron?sample=1. */
async function samples(admin, which) {
  const lock = await P.read(admin, 'results/sample-lock.json', null);
  if (lock && Date.now() - Date.parse(lock.at) < 10 * 60e3) return { log: ['samples were sent less than 10 minutes ago'] };
  await P.write(admin, 'results/sample-lock.json', { at: new Date().toISOString() });
  const owners = StaffLib.owners(), log = [], Letter = require('./letter');
  const users = []; for (let page = 1; page <= 50; page++) { const r = await admin.auth.admin.listUsers({ page, perPage: 1000 }); if (r.error) throw new Error(r.error.message); users.push(...(r.data.users || [])); if ((r.data.users || []).length < 1000) break; }
  const now = Date.now(), lp = parts(now, TZ); let fri = [lp.y, lp.m, lp.d]; for (let i = 0; i < 7 && new Date(Date.UTC(fri[0], fri[1] - 1, fri[2])).getUTCDay() !== 5; i++) fri = addDays(fri[0], fri[1], fri[2], -1);
  const wk = 'week-' + ymd(fri[0], fri[1], fri[2]), mo = 'month-' + lp.y + '-' + String(lp.m).padStart(2, '0');
  for (const u of users.filter(x => x.email && x.email_confirmed_at && owners.indexOf(String(x.email).toLowerCase()) !== -1)) {
    const A = mailAccounts((await H.accounts(u)).mapped, true), lang = Letter.langOf(u, await P.getBox(admin, P.midOf(u.id)).catch(() => null));
    for (const acct of A) {
      const h = await H.load(u, acct), cur = acct.currency || 'USD', mst = acct.isMaster || acct.isPreview;
      for (const key of (which === 'day' ? ['day-' + ymd(lp.y, lp.m, lp.d)] : [wk, mo])) {
        const card = cardFor(key, h, cur); if (/^month-/.test(key)) card.st = statementFor(h, lp.y, lp.m);
        const m = await emailFor(card, lang, mst ? null : acct, nameOf(u));
        await Mail.sendMail({ to: u.email, subject: 'SAMPLE · ' + m.subject, html: m.html }); log.push('sample ' + key + ' ' + (mst ? 'master' : acct.number || acct.accountId) + ' -> ' + u.email);
      }
    }
  }
  return { log };
}

module.exports = { master, run, mail, samples, emailFor, whyNone, cardFor, statementFor, ownAccounts, mailAccounts, parts, midnight, dayCard, periodCard, TZ };
