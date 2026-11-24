/* Plan renewal reminders (daily job /api/v1/renew-cron, see vercel.json).
   A plan that will really end (5 Years, or an Annual subscription that was cancelled and will not renew by itself; Lifetime
   never ends) gets an email from 30 days before its end date, then once a week until it is renewed. After the end date
   the member has one month of grace (the website logs them out after it, see GRACE in index.html) and gets the weekly
   email during that month too. A renewal (later end date) stops the emails. One email per member per week at most. */
const P = require('./push');
const Mail = require('./mail');
const Tpl = require('./passwordEmail');
const DAY = 864e5, LEAD = 30 * DAY, GRACE = 30 * DAY, EVERY = 7 * DAY - 3600e3;
const LOCALE = { zh: 'zh-CN', 'zh-tw': 'zh-TW', en: 'en-GB' };
const SITE = 'https://www.ftmwealthnation.com';

function esc(x) { return String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function day(ms, lang) { try { return new Date(ms).toLocaleDateString(LOCALE[lang] || lang, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' }); } catch (e) { return new Date(ms).toISOString().slice(0, 10); } }
function money(v, cur) { const sym = { USD: '$', EUR: '€', GBP: '£' }[cur] || ''; const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); return (v < 0 ? '-' : '+') + (sym ? sym + s : s + ' ' + (cur || '')); }

/* What is due for one plan now: 'ending' (last 30 days), 'ended' (grace month), or null. */
function phase(b, now) {
  if (!b || b.lifetime || !b.period_end) return null;
  const st = String(b.status || 'ACTIVE').toUpperCase();
  if (['ACTIVE', 'NONE', 'CANCELED', 'EXPIRED', 'PAST_DUE'].indexOf(st) === -1) return null;
  if (b.renews === true && st !== 'CANCELED' && st !== 'EXPIRED') return null;
  if (b.plan === 'ANNUAL' && b.renews == null && (st === 'ACTIVE' || st === 'NONE' || st === 'PAST_DUE')) return null;
  const end = Date.parse(b.period_end); if (!isFinite(end)) return null;
  if (now < end && end - now <= LEAD) return 'ending';
  if (now >= end && now < end + GRACE) return 'ended';
  return null;
}

async function emailFor(kind, b, lang, gain) {
  const t = x => P.tr(lang, x), end = Date.parse(b.period_end), plan = { ANNUAL: 'Annual', FIVE_YEARS: '5 Years' }[b.plan] || '';
  const title = await t(kind === 'ending' ? 'Your FTM plan ends soon' : 'Your FTM plan has ended');
  const first = kind === 'ending'
    ? (plan ? (await t('Your {} plan ends on {}.')).replace('{}', await t(plan)).replace('{}', day(end, lang)) : (await t('Your plan ends on {}.')).replace('{}', day(end, lang))) + ' ' + await t('Renew before then to keep FTM MACHINE trading for you without a break.')
    : (await t('Your plan ended on {}. You can still log in until {}.')).replace('{}', day(end, lang)).replace('{}', day(end + GRACE, lang));
  const stops = [await t('FTM MACHINE stops trading on your accounts.'), await t('No new results are added to your statistics, calendar and statements.'), await t('One month after your plan ends you are logged out until you renew.')];
  const g = gain ? '<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 18px;"><tr><td bgcolor="#0b1640" style="' + Tpl.NAVY + 'border-radius:14px;padding:16px 18px;color:#ffffff;font-size:15px;line-height:1.5;">'
    + Tpl.keep('<span style="color:#ffffff;">' + esc((await t('Since you joined, FTM MACHINE has made {} ({}) on your account.')).replace('{}', money(gain.pl, gain.cur)).replace('{}', (gain.pct >= 0 ? '+' : '') + gain.pct.toFixed(2) + '%')) + '</span>') + '</td></tr></table>' : '';
  const body = '<p style="margin:0 0 16px;font-size:15.5px;line-height:1.6;color:#0b1640;">' + esc(first) + '</p>' + g
    + '<p style="margin:0 0 8px;font-weight:bold;color:#0b1640;">' + esc(await t('If you do not renew:')) + '</p>'
    + '<ul style="margin:0 0 18px;padding-left:20px;color:#3d4566;line-height:1.7;">' + stops.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>'
    + '<p style="margin:0 0 20px;color:#3d4566;line-height:1.6;">' + esc(await t('Renew with the same email address and everything continues where it stopped: your accounts, history and settings stay as they are.')) + '</p>'
    + '<a href="' + SITE + '/#pricing" style="display:inline-block;background:#E5323E;color:#ffffff;font-weight:bold;text-decoration:none;padding:13px 26px;border-radius:99px;">' + esc(await t('Renew now')) + '</a>'
    + '<p style="margin:20px 0 0;font-size:12.5px;color:#6b7394;">' + esc(await t('You get this reminder once a week until your plan is renewed.')) + '</p>';
  return { subject: title, html: Tpl.shell(title, body, { head: true }) };
}

/* One run. o.now, o.statusOf(user), o.gainOf(user), o.send({to,subject,html}), o.users, o.deadline for tests and the cron. */
async function run(admin, o) {
  o = o || {}; const now = o.now || Date.now(), deadline = o.deadline || (now + 45000), log = [];
  const Letter = require('./letter');
  const statusOf = o.statusOf || (u => require('../v1/customer/billing').statusFor(u, { renews: true }));
  const send = o.send || (m => Mail.sendMail(m));
  let users = o.users;
  if (!users) { users = []; for (let page = 1; page <= 50; page++) { const r = await admin.auth.admin.listUsers({ page, perPage: 1000 }); if (r.error) throw new Error(r.error.message); users.push(...(r.data.users || [])); if ((r.data.users || []).length < 1000) break; } }
  const paid = new Set();
  if (o.paid) o.paid.forEach(x => paid.add(x));
  else for (let from = 0; from < 50000; from += 1000) { const r = await admin.from('profiles').select('id,products').range(from, from + 999); if (r.error) break; (r.data || []).forEach(p => { if (Array.isArray(p.products) && p.products.indexOf('auto') !== -1) paid.add(p.id); }); if ((r.data || []).length < 1000) break; }
  const S = await P.read(admin, 'renewals/state.json', { users: {}, day: '' });
  const today = new Date(now).toISOString().slice(0, 10); if (S.day !== today) { S.day = today; S.checked = []; }
  const checked = new Set(S.checked || []);
  const queue = users.filter(u => u.email && u.email_confirmed_at && paid.has(u.id) && !checked.has(u.id));
  let i = 0, sent = 0, more = false;
  async function one(u) {
    let b = null; try { b = await statusOf(u); } catch (e) { b = null; }
    checked.add(u.id);
    const k = phase(b, now), rec = S.users[u.id] || {};
    if (!k) { if (rec.end && b && b.period_end !== rec.end) delete S.users[u.id]; return; }
    if (rec.end === b.period_end && rec.last && now - Date.parse(rec.last) < EVERY) return;
    let gain = null; try { gain = o.gainOf ? await o.gainOf(u) : await gainOf(u); } catch (e) { gain = null; }
    const lang = Letter.langOf(u, await P.getBox(admin, P.midOf(u.id)).catch(() => null));
    const m = await emailFor(k, b, lang, gain && gain.pl > 0 ? gain : null);
    S.users[u.id] = { end: b.period_end, last: new Date(now).toISOString(), kind: k, n: (rec.end === b.period_end ? (rec.n || 0) : 0) + 1 };
    try { await send({ to: u.email, subject: m.subject, html: m.html }); sent++; log.push(k + ' ' + u.email); } catch (e) { S.users[u.id] = rec; log.push('failed ' + u.email); }
  }
  async function worker() { while (i < queue.length) { if (Date.now() > deadline) { more = true; return; } await one(queue[i++]); } }
  await Promise.all([0, 1, 2, 3].map(worker));
  S.checked = [...checked];
  await P.write(admin, 'renewals/state.json', S);
  log.push('renewal reminders: ' + sent + ' sent, ' + checked.size + ' plans checked today' + (more ? ', more to do' : ''));
  return { more, log, sent };
}

/* The member's result with FTM since they joined, on their own account (engine history through ftm-calc.js). */
async function gainOf(u) {
  const H = require('./accountHistory');
  const A = ((await H.accounts(u)).mapped || []).filter(a => a && a.accountId && !a.isMaster && !a.isPreview);
  const a = A.find(x => x.active) || A[0]; if (!a) return null;
  const h = await H.load(u, a); const sg = h && h.M && h.M.seg ? h.M.seg(null, null) : null;
  return sg && isFinite(sg.pl) && isFinite(sg.pct) ? { pl: sg.pl, pct: sg.pct, cur: a.currency || 'USD' } : null;
}

module.exports = { run, phase, emailFor, GRACE, LEAD };
