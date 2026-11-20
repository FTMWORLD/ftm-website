/* Welcome emails (replace the old Brevo automations, owner 20 Nov 2026). Sent through api/_lib/mail.js like every FTM email,
   in the member's language (translated once per language and cached), with the FTM footer.
   Free members (no paid plan):  F0 day 0 welcome · F2 day 2 how FTM MACHINE works · F5 day 5 every day shown · F9 day 9 plans
   Paying members (Auto Trading): P0 "Welcome aboard" (connect your account) · P2 day 2 reminder only while no account is
   connected · P7 day 7 your client area.
   Days count from sign-up (free) or from the day the plan was first seen (paid). At most one email per member per run (one
   run a day), never the same step twice (journey/<mid>.json). Members who signed up long ago are not sent the whole series:
   steps more than 10 days overdue are marked skipped, so each member gets only what still makes sense. */
const P = require('./push');
const Mail = require('./mail');
const Tpl = require('./passwordEmail');
const StaffLib = require('./staff');
const SITE = () => (process.env.SITE_URL || 'https://www.ftmwealthnation.com').replace(/\/$/, '');
const DAY = 864e5, LATE = 10;

/* Each step: words (English, translated per language), the button and its link. Plain facts, no promises. */
const STEPS = {
  F0: { day: 0, free: true, subject: 'Welcome to FTM: your free account is ready', title: 'Welcome to FTM',
    p: ['Your free FTM account is ready. Here is what you can do with it today.', 'Watch the FTM master account live: every trade FTM MACHINE takes, as it happens.', 'Every evening at 11 p.m. (Berlin time) we post the day\'s result: good days and bad days.', 'Meet other people running FTM MACHINE in the FTM Community.'],
    btn: 'Open my client area', href: '/?open=metrics' },
  F2: { day: 2, free: true, subject: 'How FTM MACHINE works, in two minutes', title: 'How FTM MACHINE works',
    p: ['FTM MACHINE is software that trades for you by fixed rules, around the clock, five days a week.', 'Your money stays in your own trading account, with your own broker, in your name. FTM never holds it, and the access FTM MACHINE gets cannot withdraw money.', 'It trades five markets on one account: gold, Bitcoin, US Tech 100, USD/JPY and Hang Seng 50. You choose the risk profile: Conservative, Balanced or Growth 2×.', 'You can pause it at any time with one tap.'],
    btn: 'See how it works', href: '/#how' },
  F5: { day: 5, free: true, subject: 'Every day, shown. Even the red ones.', title: 'Every day, shown',
    p: ['Most trading offers show you their best days. FTM shows you every day.', 'The FTM master account\'s result is posted every evening at 11 p.m.: every trade, its size and its result, losing days included.', 'In your client area you can see the calendar of every day, the statistics and the full history.'],
    btn: 'See the results', href: '/?open=community' },
  F9: { day: 9, free: true, subject: 'Ready when you are', title: 'Start FTM MACHINE on your account',
    p: ['When you are ready, starting takes three steps and about two minutes.', 'One: choose your plan: Annual, 5 Years or Lifetime. Two: connect your MT5 trading account. Three: choose your risk profile, and FTM MACHINE starts trading.', 'Your free account stays as it is until then.'],
    btn: 'See the plans', href: '/#pricing' },
  P0: { day: 0, paid: true, subject: 'Welcome aboard: let\'s start FTM MACHINE', title: 'Welcome aboard',
    p: ['Thank you for joining FTM. One step is left: connect your MT5 trading account.', 'In your client area, choose Connect account and enter your broker\'s server, your account number and your master trading password. Then choose your risk profile.', 'FTM MACHINE starts trading from the next signal. Your figures appear in your client area from the first trade.'],
    safe: true, btn: 'Connect my trading account', href: '/?open=accounts' },
  P2: { day: 2, paid: true, onlyUnconnected: true, subject: 'Your FTM MACHINE is waiting for your account', title: 'One step left',
    p: ['Your plan is active, but no trading account is connected yet, so FTM MACHINE cannot trade for you.', 'Connecting takes about two minutes: your broker\'s server, your MT5 account number and your master trading password.', 'Stuck? Ask us in Ask here on the website, or reply to this email.'],
    safe: true, btn: 'Connect my trading account', href: '/?open=accounts' },
  P7: { day: 7, paid: true, subject: 'Your FTM client area, explained', title: 'Your client area',
    p: ['Everything FTM MACHINE does on your account is in your client area.', 'Calendar: every day\'s result. Statistics: win rate, best and worst periods, drawdown. Statements: download any period as a PDF. Trades: every single one.', 'Turn on phone notifications to hear about trades in profit and messages from the FTM Community.'],
    btn: 'Open my client area', href: '/?open=metrics' }
};
const ORDER_FREE = ['F0', 'F2', 'F5', 'F9'], ORDER_PAID = ['P0', 'P2', 'P7'];
const COMMON = { hello: 'Hello', hello_name: 'Hello {},', safe: 'Safety first: FTM only asks for your MT5 password inside the Connect account form. We never ask for it by email, chat or phone.' };

function e(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function words(step) { const s = STEPS[step], W = { subject: s.subject, title: s.title, btn: s.btn }; s.p.forEach((x, i) => { W['p' + i] = x; }); return Object.assign(W, COMMON); }
async function wordsIn(admin, step, lang) {
  const W = words(step); if (lang === 'en') return W;
  const key = 'journey/i18n-' + lang + '-' + step + '.json', have = await P.read(admin, key, null);
  if (have && have.src === JSON.stringify(W)) return have.w;
  try { const w = await require('./letter').translate(W, lang); await P.write(admin, key, { src: JSON.stringify(W), w }); return w; }
  catch (x) { console.error('journey translate', lang, x.message); return W; }
}
function html(step, w, name, lang) {
  const s = STEPS[step], P2 = t => '<p style="font-size:16px;line-height:1.55;color:#333;margin:0 0 14px;">' + t + '</p>';
  const first = String(name || '').split(' ')[0];
  const body = '<div' + (['ar', 'he', 'fa', 'ur'].indexOf(lang) !== -1 ? ' dir="rtl"' : '') + '>' + P2(first ? e(w.hello_name.replace('{}', first)) : e(w.hello) + ',')
    + s.p.map((x, i) => P2(e(w['p' + i]))).join('')
    + '<table cellpadding="0" cellspacing="0" style="margin:22px 0 26px;"><tr><td bgcolor="#E5323E" style="border-radius:999px;"><a href="' + e(SITE() + s.href) + '" style="display:inline-block;padding:15px 30px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:999px;">' + e(w.btn) + ' &rarr;</a></td></tr></table>'
    + (s.safe ? '<p style="font-size:14px;line-height:1.55;color:#555;margin:0 0 14px;">' + e(w.safe) + '</p>' : '') + '</div>';
  return { subject: w.subject, html: Tpl.shell(w.title, body) };
}
function nameOf(u) { const m = (u && u.user_metadata) || {}; return String(m.full_name || m.name || [m.first_name, m.last_name].filter(Boolean).join(' ') || '').replace(/\s+/g, ' ').trim().slice(0, 60); }

/* Which step a member is due for now (or null), and the steps to mark skipped. st = their journey file. */
function due(st, paid, connected, now, since, since0) {
  const order = paid ? ORDER_PAID : ORDER_FREE, start = since, skip = []; since0 = since0 == null ? since : since0;
  for (const k of order) {
    if (st.sent[k] || st.skip[k]) continue;
    const s = STEPS[k], at = start + s.day * DAY;
    if (now < at) return { step: null, skip };
    if (s.onlyUnconnected && connected) { skip.push(k); continue; }
    if (k === 'P0' && connected && now - since0 > 3 * DAY) { skip.push(k); continue; }
    if (k !== 'P0' && k !== order[order.length - 1] && now - at > LATE * DAY) { skip.push(k); continue; }
    return { step: k, skip };
  }
  return { step: null, skip };
}

async function allUsers(admin) { const out = []; for (let page = 1; page <= 50; page++) { const r = await admin.auth.admin.listUsers({ page, perPage: 1000 }); if (r.error) throw new Error(r.error.message); out.push(...(r.data.users || [])); if ((r.data.users || []).length < 1000) break; } return out; }
async function paidIds(admin) { const ids = new Set(); for (let from = 0; from < 100000; from += 1000) { const r = await admin.from('profiles').select('id,products').range(from, from + 999); if (r.error) throw new Error(r.error.message); (r.data || []).forEach(x => { if (Array.isArray(x.products) && x.products.indexOf('auto') !== -1) ids.add(x.id); }); if ((r.data || []).length < 1000) break; } return ids; }

/* One run: o.deadline, o.now (tests), o.only (array of emails: send only to these, for samples), o.dry (no sending). */
async function run(admin, o) {
  o = o || {}; const now = o.now || Date.now(), deadline = o.deadline || (now + 40000), log = [], sentLog = [];
  const users = (await allUsers(admin)).filter(u => u.email && u.email_confirmed_at && (!o.only || o.only.indexOf(String(u.email).toLowerCase()) !== -1));
  const paid = await paidIds(admin), H = require('./accountHistory'), Letter = require('./letter'), staff = StaffLib.owners();
  let more = false, sent = 0;
  for (const u of users) {
    if (Date.now() > deadline) { more = true; break; }
    const mail = String(u.email).toLowerCase(); if (!o.only && staff.indexOf(mail) !== -1) continue;
    const mid = P.midOf(u.id), key = 'journey/' + mid + '.json', st = Object.assign({ sent: {}, skip: {} }, await P.read(admin, key, null) || {});
    const isPaid = paid.has(u.id);
    const created = Date.parse(u.created_at || new Date(now).toISOString());
    if (isPaid && !st.paidSince) st.paidSince = new Date(now - created < 2 * DAY ? created : now).toISOString();
    const since = isPaid ? Date.parse(st.paidSince) : created;
    if (st.last && now - Date.parse(st.last) < 20 * 3600e3 && !o.only) { await P.write(admin, key, st); continue; }
    let connected = false;
    if (isPaid) { try { const A = (await H.accounts(u)).mapped || []; connected = A.some(a => a && a.accountId && !a.isMaster && !a.isPreview); } catch (x) { connected = false; } }
    const d = due(st, isPaid, connected, now, since, created); d.skip.forEach(k => { st.skip[k] = new Date(now).toISOString(); });
    if (d.step) {
      const lang = Letter.langOf(u, await P.getBox(admin, mid).catch(() => null)), w = await wordsIn(admin, d.step, lang), m = html(d.step, w, nameOf(u), lang);
      let via = null; if (!o.dry) { try { via = await Mail.sendMail({ to: u.email, subject: m.subject, html: m.html }); } catch (x) { via = null; } }
      if (via || o.dry) { st.sent[d.step] = new Date(now).toISOString(); st.last = st.sent[d.step]; sent++; sentLog.push(d.step + ' ' + lang); }
    }
    await P.write(admin, key, st);
  }
  log.push('welcome emails: ' + sent + ' sent' + (sentLog.length ? ' (' + sentLog.slice(0, 20).join(', ') + ')' : '') + (more ? ', more to do' : ''));
  return { more, log, sent };
}

/* Samples: every step to the owner mailboxes (StaffLib.owners), in English or o.lang; nothing is recorded. */
async function samples(admin, o) {
  o = o || {}; const lang = o.lang || 'en', log = [];
  for (const step of ORDER_FREE.concat(ORDER_PAID)) { const w = await wordsIn(admin, step, lang), m = html(step, w, 'Gospel', lang);
    for (const to of StaffLib.owners().slice(0, 2)) { await Mail.sendMail({ to, subject: 'SAMPLE ' + step + ' · ' + m.subject, html: m.html }); log.push('sample ' + step + ' -> ' + to); } }
  return { log };
}

module.exports = { samples, run, due, html, words, STEPS, ORDER_FREE, ORDER_PAID };
