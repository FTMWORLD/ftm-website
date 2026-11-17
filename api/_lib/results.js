/* FTM news: the FTM master account's results, posted automatically (daily job /api/v1/news-cron, see vercel.json).
   Every day at 23:00 (FTM time, Europe/Berlin) the day's closed trades and result, exactly as the client-area Calendar shows
   them; on Fridays also the week (Saturday to Friday); on the 1st also last month. Figures from the FTM engine through
   ftm-calc.js (the dashboards' own calculation). Each post appears in Community (For you, Following and FTM news).
   Posts carry a `card` the feed draws in the FTM design, in each member's language and local time; `x` is a short text
   for share links. Never posts the same period twice. */
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
  const a = midnight(y, m, d, TZ), [y2, m2, d2] = addDays(y, m, d, 1), z = midnight(y2, m2, d2, TZ), sg = h.M.seg(a, z);
  const T = h.closed.filter(t => t.closeTime >= a && t.closeTime < z && t.pl != null).sort((p, q) => p.closeTime - q.closeTime);
  const card = { k: 'day', date: ymd(y, m, d), cur, net: +sg.pl.toFixed(2), pct: +sg.pct.toFixed(4), n: T.length,
    rows: T.slice(0, 60).map(t => ({ o: t.openTime || null, c: t.closeTime, s: t.symbol, d: t.dir, v: t.lots, pl: +(+t.pl).toFixed(2) })) };
  const wd = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  card.x = 'FTM MACHINE · ' + wd + ', ' + d + ' ' + MONTHS[m - 1] + ' ' + y + ': ' + (T.length ? T.length + ' trade' + (T.length === 1 ? '' : 's') + ' closed, net ' + money(sg.pl, cur) + ' (' + pct(sg.pct) + ').' : 'no trades closed today.');
  return card;
}
function periodCard(k, h, cur, from, to, label) {
  const a = midnight(from[0], from[1], from[2], TZ), z = midnight(to[0], to[1], to[2], TZ), sg = h.M.seg(a, z);
  const T = h.closed.filter(t => t.closeTime >= a && t.closeTime < z && t.pl != null), wins = T.filter(t => t.pl > 0).length;
  const days = []; let cur3 = from.slice();
  for (let i = 0; i < 32; i++) { const s = midnight(cur3[0], cur3[1], cur3[2], TZ); if (s >= z) break; const nx = addDays(cur3[0], cur3[1], cur3[2], 1), e = midnight(nx[0], nx[1], nx[2], TZ);
    const n = T.filter(t => t.closeTime >= s && t.closeTime < e).length; if (n) { const g = h.M.seg(s, e); days.push({ date: ymd(cur3[0], cur3[1], cur3[2]), n, pl: +g.pl.toFixed(2), pct: +g.pct.toFixed(4) }); } cur3 = nx; }
  const best = days.length ? days.reduce((p, q) => q.pct > p.pct ? q : p) : null, worst = days.length ? days.reduce((p, q) => q.pct < p.pct ? q : p) : null;
  const card = { k, from: ymd(from[0], from[1], from[2]), to: ymd(...addDays(to[0], to[1], to[2], -1)), cur, net: +sg.pl.toFixed(2), pct: +sg.pct.toFixed(4), n: T.length, win: T.length ? +(wins / T.length * 100).toFixed(1) : null,
    days: k === 'week' ? days : undefined, best: best ? { date: best.date, pct: best.pct, pl: best.pl } : null, worst: worst ? { date: worst.date, pct: worst.pct, pl: worst.pl } : null, tdays: days.length };
  card.x = 'FTM MACHINE · ' + label + ': ' + T.length + ' trade' + (T.length === 1 ? '' : 's') + ', net ' + money(sg.pl, cur) + ' (' + pct(sg.pct) + ').';
  return card;
}

/* One run. Posts what is due at this local time; o.force posts today's day result now (staff/test). */
async function run(admin, o) {
  o = o || {}; const now = o.now || Date.now(), lp = parts(now, TZ), log = [];
  if (!o.force && !(lp.h >= 23 || lp.h < 3)) return { log: ['not 23:00 in ' + TZ + ' (' + lp.h + ':' + String(lp.min).padStart(2, '0') + ')'] };
  const ref = parts(now - 3 * 3600e3, TZ), y = ref.y, m = ref.m, d = ref.d, wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const done = await P.read(admin, 'results/posted.json', { keys: [] }), want = [];
  want.push({ key: 'day-' + ymd(y, m, d) });
  if (wd === 5) want.push({ key: 'week-' + ymd(y, m, d) });
  if (d === 1) { const pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y; want.push({ key: 'month-' + py + '-' + String(pm).padStart(2, '0'), py, pm }); }
  const todo = want.filter(w => done.keys.indexOf(w.key) === -1);
  if (!todo.length) return { log: ['already posted ' + want.map(w => w.key).join(', ')] };
  const { m: acct, h, reader } = await master(admin), cur = acct.currency || 'USD';
  const Pst = await P.read(admin, 'posts.json', { posts: [] }); let t0 = Date.now();
  for (const w of todo) {
    let card;
    if (w.key.indexOf('day-') === 0) card = dayCard(h, cur, y, m, d);
    else if (w.key.indexOf('week-') === 0) { const s = addDays(y, m, d, -6); card = periodCard('week', h, cur, s, addDays(y, m, d, 1), 'week of ' + s[2] + ' ' + MONTHS[s[1] - 1] + ' to ' + d + ' ' + MONTHS[m - 1] + ' ' + y); }
    else { const nm = w.pm === 12 ? [w.py + 1, 1, 1] : [w.py, w.pm + 1, 1]; card = periodCard('month', h, cur, [w.py, w.pm, 1], nm, MONTHS[w.pm - 1] + ' ' + w.py); }
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
async function emailFor(card, lang) {
  const loc = LOCALE[lang] || lang, t = x => P.tr(lang, x);
  const M = v => { const n = +v || 0; let a; try { a = Math.abs(n).toLocaleString(loc, { style: 'currency', currency: card.cur || 'USD', currencyDisplay: 'narrowSymbol', minimumFractionDigits: 2, maximumFractionDigits: 2 }); } catch (x) { a = Math.abs(n).toFixed(2) + ' ' + (card.cur || ''); } return (n > 0 ? '+' : n < 0 ? '-' : '') + a; };
  const PC = v => { const n = +v || 0; return (n > 0 ? '+' : n < 0 ? '-' : '') + Math.abs(n).toFixed(2) + '%'; }, col = v => v > 0 ? '#1f8a5b' : v < 0 ? '#b4232c' : '#0b1640';
  const D = (ymd, o) => { const a = String(ymd).split('-'); try { return new Date(Date.UTC(+a[0], +a[1] - 1, +a[2], 12)).toLocaleDateString(loc, Object.assign({ timeZone: 'UTC' }, o)); } catch (x) { return ymd; } };
  const hm = ms => ms ? new Date(ms).toLocaleTimeString(loc, { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : '—';
  let tzName = ''; try { tzName = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, timeZoneName: 'short' }).formatToParts(card.rows && card.rows[0] ? card.rows[0].c : Date.now()).find(p => p.type === 'timeZoneName').value; } catch (x) { tzName = ''; }
  const TH = x => '<td style="padding:8px 6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6b7194;font-weight:bold;border-bottom:1px solid #e6e9f2;white-space:nowrap;">' + e(x) + '</td>';
  const TD = (x, c, b) => '<td style="padding:9px 6px;font-size:14px;color:' + (c || '#0b1640') + ';' + (b ? 'font-weight:bold;' : '') + 'border-bottom:1px solid #e6e9f2;white-space:nowrap;">' + e(x) + '</td>';
  const kind = card.k === 'day' ? 'Daily result' : card.k === 'week' ? 'Weekly result' : 'Monthly result';
  let head, sub = '', table = '';
  if (card.k === 'day') {
    head = D(card.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    sub = card.n ? (card.n === 1 ? await t('One trade closed this day.') : (await t('{} trades closed this day.')).replace('{}', card.n)) : await t('No trades closed this day.');
    if (card.rows && card.rows.length) table = '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:6px 0 0;"><tr>' + TH(await t('Opened')) + TH((await t('Closed')) + (tzName ? ' (' + tzName + ')' : '')) + TH(await t('Market')) + TH(await t('Direction')) + TH(await t('Size')) + TH('P/L') + '</tr>'
      + card.rows.map(r => '<tr>' + TD(hm(r.o)) + TD(hm(r.c)) + TD(r.s || '') + TD(r.d || '') + TD(r.v != null ? (+r.v).toFixed(2) : '') + TD(M(r.pl), col(r.pl), true) + '</tr>').join('') + '</table>';
  } else if (card.k === 'week') {
    head = D(card.from, { day: 'numeric', month: 'short' }) + ' – ' + D(card.to, { day: 'numeric', month: 'long', year: 'numeric' });
    sub = card.n === 1 ? await t('One trade closed this week.') : (await t('{} trades closed this week.')).replace('{}', card.n);
    if (card.days && card.days.length) table = '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:6px 0 0;"><tr>' + TH(await t('Day')) + TH(await t('Trades')) + TH('P/L') + TH('%') + '</tr>'
      + card.days.map(x => '<tr>' + TD(D(x.date, { weekday: 'long', day: 'numeric', month: 'short' })) + TD(x.n) + TD(M(x.pl), col(x.pl), true) + TD(PC(x.pct), col(x.pct), true) + '</tr>').join('') + '</table>';
  } else {
    head = D(card.from, { month: 'long', year: 'numeric' });
    const tile = (l, v, s2, c) => '<td width="25%" valign="top" style="padding:12px 8px;background:#f7f8fb;border-radius:10px;"><p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7194;font-weight:bold;">' + e(l) + '</p><p style="margin:4px 0 0;font-size:18px;font-weight:bold;color:' + (c || '#0b1640') + ';">' + e(v) + '</p>' + (s2 ? '<p style="margin:2px 0 0;font-size:12px;color:#6b7194;">' + e(s2) + '</p>' : '') + '</td>';
    table = '<table width="100%" cellpadding="0" cellspacing="6" style="margin:6px 0 0;"><tr>' + tile(await t('Trades'), card.n) + tile(await t('Winning trades'), card.win != null ? Math.round(card.win) + '%' : '—')
      + tile(await t('Best day'), card.best ? PC(card.best.pct) : '—', card.best ? D(card.best.date, { day: 'numeric', month: 'short' }) : '', card.best ? col(card.best.pct) : '') + tile(await t('Worst day'), card.worst ? PC(card.worst.pct) : '—', card.worst ? D(card.worst.date, { day: 'numeric', month: 'short' }) : '', card.worst ? col(card.worst.pct) : '') + '</tr></table>';
  }
  const netCol = v => v > 0 ? '#6ee7a8' : v < 0 ? '#ff8a92' : '#ffffff';
  const body = '<div' + (['ar', 'he', 'fa', 'ur'].indexOf(lang) !== -1 ? ' dir="rtl"' : '') + '>'
    + '<p style="margin:0 0 4px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#B8902A;font-weight:bold;">' + e(await t('FTM master account')) + '</p>'
    + '<p style="margin:0 0 4px;font-size:20px;font-weight:bold;color:#0b1640;">' + e(head) + '</p>' + (sub ? '<p style="margin:0 0 8px;font-size:14px;color:#6b7194;">' + e(sub) + '</p>' : '') + table
    + '<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#0b1640" style="background-color:#0b1640;border-radius:14px;margin:16px 0 6px;"><tr><td style="padding:16px 18px;color:#E3B62F;font-size:12px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;">' + e(await t('Net P&L')) + '</td>'
    + '<td align="right" style="padding:16px 18px;"><p style="margin:0;font-size:26px;font-weight:bold;color:' + netCol(card.net) + ';font-family:Arial,Helvetica,sans-serif;">' + e(M(card.net)) + '</p><p style="margin:2px 0 0;font-size:14px;font-weight:bold;color:' + netCol(card.pct) + ';">' + e(PC(card.pct)) + '</p></td></tr></table>'
    + '<table cellpadding="0" cellspacing="0" style="margin:20px 0 22px;"><tr><td bgcolor="#E5323E" style="border-radius:999px;"><a href="https://www.ftmwealthnation.com/?open=community" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:999px;">' + e(await t('FTM news')) + ' &rarr;</a></td></tr></table></div>';
  return { subject: 'FTM · ' + (await t(kind)) + ': ' + head + ' · ' + M(card.net) + ' (' + PC(card.pct) + ')', html: Tpl.shell(await t(kind), body) };
}
/* Emails every confirmed login the result posts of the last 3 days they have not had yet; stops at the deadline. */
async function mail(admin, o) {
  o = o || {}; const deadline = o.deadline || (Date.now() + 40000), log = []; let more = false;
  const done = await P.read(admin, 'results/posted.json', { keys: [] }), keys = done.keys.slice(-6);
  if (!keys.length) return { more, log };
  const posts = (await P.read(admin, 'posts.json', { posts: [] })).posts;
  const Letter = require('./letter');
  let users = null;
  for (const key of keys) {
    const st = await P.read(admin, 'results/mail-' + key + '.json', null); if (st && st.finished) continue;
    const post = posts.find(x => x.res === key); if (!post || !post.card || Date.now() - Date.parse(post.t) > 3 * 864e5) continue;
    if (!users) { users = []; for (let page = 1; page <= 50; page++) { const r = await admin.auth.admin.listUsers({ page, perPage: 1000 }); if (r.error) throw new Error(r.error.message); users.push(...(r.data.users || [])); if ((r.data.users || []).length < 1000) break; } users = users.filter(u => u.email && u.email_confirmed_at); }
    const S = st || { done: [], sent: 0, failed: 0 }, have = new Set(S.done), cache = {};
    for (const u of users) {
      if (have.has(u.id)) continue; if (Date.now() > deadline) { more = true; break; }
      const lang = Letter.langOf(u, await P.getBox(admin, P.midOf(u.id)).catch(() => null));
      try { const m = cache[lang] || (cache[lang] = await emailFor(post.card, lang)); const via = await Mail.sendMail({ to: u.email, subject: m.subject, html: m.html }); if (via) S.sent++; else S.failed++; } catch (x) { S.failed++; }
      S.done.push(u.id); have.add(u.id);
      if (S.done.length % 20 === 0) await P.write(admin, 'results/mail-' + key + '.json', S);
    }
    if (!more) S.finished = new Date().toISOString();
    await P.write(admin, 'results/mail-' + key + '.json', S); log.push('emailed ' + key + ': ' + S.sent + (more ? ' so far' : ''));
    if (more) break;
  }
  return { more, log };
}

module.exports = { run, mail, emailFor, parts, midnight, dayCard, periodCard, TZ };
