/* The monthly Letter from FTM, fully automatic (daily cron /api/v1/letter-cron):
   in the first week of a month (normally the 1st) it writes last month's letter: figures from the FTM engine through the same calculation as every dashboard
   (ftm-calc.js), text from those figures and data/changes.json; owners get a preview by email.
   From the 2nd (09:00 UTC) it translates it into every member's language and sends it, once per member, then posts it on
   FTM news and sends a phone notification. Staff can edit it or press Hold in the staff console until it goes out.
   A letter staff saved for that month themselves is sent instead of writing a new one. */
const crypto = require('crypto');
const P = require('./push');
const Engine = require('./engineClient');
const Letter = require('./letter');
const Mail = require('./mail');
const StaffLib = require('./staff');
const Calc = require('../../ftm-calc.js');

const SEND_HOUR = 9;
const BAD = /guarantee|promise|risk[- ]free|sure profit|certain(ly)? (profit|gain)|trader|fundednext|deriv|ftmo|you will (make|earn|gain)|double your/i;

function within(ms, p) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms))]); }
async function eng(u, path, ms) {
  const r = await within(ms || 12000, Engine.callEngine(path, { authSubject: u.id, authEmail: u.email, timeoutMs: (ms || 12000) - 500 }));
  if (!r.ok) throw new Error('engine ' + path.split('?')[0] + ': ' + ((r.body && r.body.error) || r.status));
  return r.body;
}
async function allUsers(admin) {
  const out = []; for (let page = 1; page <= 50; page++) { const r = await admin.auth.admin.listUsers({ page, perPage: 1000 }); if (r.error) throw new Error(r.error.message); out.push(...(r.data.users || [])); if ((r.data.users || []).length < 1000) break; } return out;
}
function prevMonth(now) { const d = new Date(now); const y = d.getUTCMonth() === 0 ? d.getUTCFullYear() - 1 : d.getUTCFullYear(), m = d.getUTCMonth() === 0 ? 12 : d.getUTCMonth(); return y + '-' + String(m).padStart(2, '0'); }
function sendAt(now) { const d = new Date(now); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, SEND_HOUR)).toISOString(); }

/* The FTM master account's figures for one month, from the engine, through the shared dashboard calculation. */
async function masterFigures(admin, ym, users) {
  const owners = StaffLib.owners();
  const reader = users.find(u => owners.indexOf(String(u.email || '').toLowerCase()) !== -1 && u.email_confirmed_at) || users.find(u => u.email_confirmed_at);
  if (!reader) throw new Error('NO_READER');
  const acc = await eng(reader, '/api/v1/customer/accounts');
  const A = (acc.accounts || []).map(Calc.mapAccount), m = A.find(a => a.isMaster) || A.find(a => a.isPreview);
  if (!m || !m.accountId) throw new Error('NO_MASTER_ACCOUNT');
  const id = encodeURIComponent(m.accountId);
  let j = await eng(reader, '/api/v1/customer/accounts/' + id + '/stats?limit=2000', 20000);
  if (j && j.pending) throw new Error('STATS_PENDING');
  const key = r => String(r.ticket || r.deal || r.id || '') + '|' + (r.time || r.closed_at || '') + '|' + (r.type || '') + '|' + (r.net != null ? r.net : r.profit);
  for (let pg = 0; pg < 25 && j.history && +j.history_total > j.history.length; pg++) {
    const k = await eng(reader, '/api/v1/customer/accounts/' + id + '/stats?limit=2000&offset=' + j.history.length, 20000);
    const seen = new Set(j.history.map(key)), add = (k.history || []).filter(r => !seen.has(key(r))); if (!add.length) break; j.history = j.history.concat(add);
  }
  const es = Calc.mapStats(j, m.accountId);
  let closed = [];
  for (let off = 0, pg = 0; pg < 200; pg++) {
    const h = await eng(reader, '/api/v1/customer/accounts/' + id + '/history?limit=200&offset=' + off, 15000);
    closed = closed.concat((h.trades || []).map(Calc.mapExecution)); const p = h.page || {};
    if (p.offset == null || p.limit == null || p.total == null || p.offset + p.limit >= p.total) break; off = p.offset + p.limit;
  }
  const data = { accounts: [m], account: { currency: m.currency || null, deposits: es.deposits != null ? es.deposits : (m.deposits || 0), withdrawals: es.withdrawals != null ? es.withdrawals : (m.withdrawals || 0) }, closed, open: [] };
  const M = Calc.build({ data, live: m, es, flows: es.flows });
  const a0 = String(ym).split('-').map(Number), a = Date.UTC(a0[0], a0[1] - 1, 1), z = Date.UTC(a0[0], a0[1], 1), y0 = Date.UTC(a0[0], 0, 1);
  const inM = closed.filter(t => t.closeTime >= a && t.closeTime < z && t.pl != null), wins = inM.filter(t => t.pl > 0).length;
  return { month_pct: +M.seg(a, z).pct.toFixed(4), ytd_pct: +M.seg(y0, z).pct.toFixed(4), trades: inM.length, win_pct: inM.length ? wins / inM.length * 100 : null, account: String(m.number || 'MASTER'), at: new Date().toISOString() };
}

function changesFor(ym) { let C = []; try { C = require('../../data/changes.json'); } catch (e) { C = []; } return (Array.isArray(C) ? C : []).filter(c => String(c.date || '').slice(0, 7) === ym && c.text).map(c => String(c.text)); }
function pc(v) { return v == null || !isFinite(v) ? '' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + '%'; }

function plainText(f, ym, changes) {
  const mn = Letter.monthName(ym).split(' ')[0], up = f.month_pct >= 0;
  return {
    title: mn + (up ? ': a month in profit' : ': a month in the red'),
    intro: up ? 'Here is how ' + mn + ' went for FTM MACHINE, with the figures straight from the FTM engine.' : mn + ' was a harder month for FTM MACHINE. Here are the figures straight from the FTM engine, and what they mean.',
    did: 'In ' + mn + ' FTM MACHINE closed ' + f.trades + ' trade' + (f.trades === 1 ? '' : 's') + ' on the FTM master account' + (f.win_pct != null ? ', and ' + Math.round(f.win_pct) + '% of them closed in profit' : '') + '. The month ended at ' + pc(f.month_pct) + ', and the account stands at ' + pc(f.ytd_pct) + ' since 1 January.\n\nYour own month is in your Calendar, calculated the same way.',
    changed: changes.length ? changes.join('\n\n') : '',
    next: 'FTM MACHINE keeps trading the same strategy and the same risk profiles. Next month\'s letter comes on the 2nd.'
  };
}
/* Text written from the figures and the month's changes; checked before use, otherwise the plain text above. */
async function writeText(f, ym, changes) {
  const base = plainText(f, ym, changes);
  if (!process.env.ANTHROPIC_API_KEY) return base;
  try {
    const Anthropic = require('@anthropic-ai/sdk'); const client = new Anthropic();
    const allowed = [pc(f.month_pct), pc(f.ytd_pct), f.win_pct != null ? Math.round(f.win_pct) + '%' : ''].filter(Boolean);
    const r = await within(40000, client.beta.messages.create({
      model: 'claude-opus-5-5', max_tokens: 3000, output_config: { effort: 'low' }, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
      system: 'You write the monthly Letter from FTM (Follow The Market), a financial company whose system FTM MACHINE trades its members\' own accounts. '
        + 'Tone: calm, warm, plain English, short sentences, like a letter from a careful fund manager. Facts only from the data given. '
        + 'Never promise, guarantee or predict results; never say "risk-free"; no risk warnings (the email footer has them); call customers "members" or "people", never "traders"; never name a broker. '
        + 'Use only these percentages, written exactly like this: ' + allowed.join(', ') + '. Use the trade count exactly as given. No other numbers except dates. '
        + 'If the month is negative, say so plainly and calmly, without excuses. "changed" lists the month\'s changes in plain words, one short paragraph each, from the list given (empty string if none). '
        + 'Answer with JSON only: {"title": "max 70 characters", "intro": "2-3 sentences", "did": "1-2 short paragraphs about the month\'s trading and figures", "changed": "...", "next": "1-2 sentences about what comes next, no predictions of returns"}.',
      messages: [{ role: 'user', content: JSON.stringify({ month: Letter.monthName(ym), master_account: { result_this_month: pc(f.month_pct), since_1_january: pc(f.ytd_pct), trades_closed: f.trades, share_closed_in_profit: allowed[2] || null }, changes_this_month: changes }) }]
    }));
    const t = r.content.filter(b => b.type === 'text').map(b => b.text).join('').trim(), j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
    const out = {}; for (const k of ['title', 'intro', 'did', 'changed', 'next']) out[k] = String(j[k] || '').trim();
    if (!out.title || !out.intro || !out.did || out.title.length > 90) return base;
    const all = Object.values(out).join('\n');
    if (BAD.test(all)) return base;
    const pcts = all.match(/[+\-−]?\d+(?:[.,]\d+)?\s?%/g) || [];
    if (pcts.some(x => allowed.indexOf(x.replace(/\s/g, '').replace(/^-/, '−').replace(',', '.')) === -1 && allowed.indexOf('+' + x.replace(/\s/g, '')) === -1)) return base;
    if (changes.length && !out.changed) out.changed = base.changed;
    return out;
  } catch (e) { console.error('letter text', e.message); return base; }
}

async function generate(admin, ym, users, now) {
  now = now || Date.now();
  const figs = await masterFigures(admin, ym, users), changes = changesFor(ym), T = await writeText(figs, ym, changes), stamp = new Date().toISOString();
  const L = Object.assign({ id: Date.now().toString(36) + crypto.randomBytes(3).toString('hex'), created: stamp, updated: stamp, by: 'automatic', v: 1, month: ym, sign: 'The FTM team', figs, auto: true, status: 'scheduled', send_at: sendAt(now), segment: 'everyone' }, T);
  await Letter.save(admin, L);
  const ownerSet = new Set(StaffLib.owners()); (await StaffLib.team(admin, true)).forEach(m => { if (m.role === 'owner') ownerSet.add(m.email); });
  const W = Letter.words(L), when = new Date(L.send_at).toUTCString().replace(':00 GMT', ' UTC').replace(/:00 UTC$/, ' UTC');
  for (const to of ownerSet) { if (!users.some(u => String(u.email || '').toLowerCase() === to)) continue;
    try { await Mail.sendMail({ to, subject: 'Preview: ' + W.subject + ' (goes out automatically ' + when + ')', html: Letter.html(L, W, '', 'en') }); } catch (e) { console.error('letter preview', e.message); } }
  return L;
}

async function postNews(admin, L) {
  const f = L.figs || {}, t = ['Letter from FTM · ' + Letter.monthName(L.month), '', L.title, '', L.intro];
  if (f.month_pct != null) t.push('', 'FTM master account: ' + pc(f.month_pct) + ' this month, ' + pc(f.ytd_pct) + ' since 1 January' + (f.trades != null ? ', ' + f.trades + ' trades' : '') + (f.win_pct != null ? ', ' + Math.round(f.win_pct) + '% closed in profit' : '') + '.');
  [['What FTM MACHINE did', L.did], ['What changed and why', L.changed], ['What comes next', L.next]].forEach(s => { if (s[1]) t.push('', s[0], s[1]); });
  const Pst = await P.read(admin, 'posts.json', { posts: [] }), owner = (await allUsers(admin)).find(u => StaffLib.owners().indexOf(String(u.email || '').toLowerCase()) !== -1);
  Pst.posts.push({ id: Date.now().toString(36) + crypto.randomBytes(3).toString('hex'), a: owner ? P.midOf(owner.id) : 'ftm', x: t.join('\n').slice(0, 2000), t: new Date().toISOString(), lk: [], c: [], ftm: true, letter: L.id });
  await P.write(admin, 'posts.json', Pst);
}

/* One run: write last month's letter if due, then send any scheduled letter whose time has come, until the deadline.
   Returns { more } when work is left (the endpoint then calls itself again). */
async function run(admin, o) {
  o = o || {}; const now = o.now || Date.now(), deadline = o.deadline || (Date.now() + 45000), log = [];
  const users = await allUsers(admin), ym = prevMonth(now), ix = await Letter.readIndex(admin);
  const forMonth = ix.items.filter(x => x.month === ym);
  if (!forMonth.length && new Date(now).getUTCDate() <= 7) { try { const L = await generate(admin, ym, users, now); log.push('written ' + ym + ' (' + L.id + ')'); } catch (e) { log.push('not written: ' + e.message); console.error('letter generate', e.message); } }
  else if (!forMonth.some(x => ['scheduled', 'sending', 'sent'].indexOf(x.status) !== -1)) {
    const d = forMonth.find(x => x.status === 'draft'), L = d && await Letter.get(admin, d.id);
    if (L) { L.status = 'scheduled'; L.send_at = L.send_at || sendAt(now); L.segment = L.segment || 'everyone'; L.updated = new Date().toISOString(); await Letter.save(admin, L); log.push('staff draft scheduled ' + L.id); }
  }
  let more = false;
  for (const row of (await Letter.readIndex(admin)).items.filter(x => x.status === 'scheduled' || x.status === 'sending')) {
    const L = await Letter.get(admin, row.id); if (!L || L.held || Date.parse(L.send_at || 0) > now) continue;
    const list = users.filter(u => u.email && u.email_confirmed_at);
    const langs = new Set(); for (const u of list) langs.add(Letter.langOf(u, await P.getBox(admin, P.midOf(u.id)).catch(() => null)));
    for (const l of langs) { if (Date.now() > deadline) { more = true; break; } if (l === 'en' || await Letter.wordsFor(admin, L, l)) continue; try { await Letter.prepare(admin, L, l); log.push('translated ' + l); } catch (e) { log.push('translation ' + l + ' failed: ' + e.message); } }
    if (more) break;
    const st = L.sent && L.sent.segment === (L.segment || 'everyone') ? L.sent : { segment: L.segment || 'everyone', done: [], sent: 0, failed: 0, langs: {}, started: new Date().toISOString(), v: L.v };
    const done = new Set(st.done); let n = 0;
    for (const u of list) {
      if (done.has(u.id)) continue; if (Date.now() > deadline) { more = true; break; }
      try { const r = await Letter.sendTo(admin, L, u); if (r.via) { st.sent++; st.langs[r.lang] = (st.langs[r.lang] || 0) + 1; } else st.failed++; } catch (e) { st.failed++; }
      st.done.push(u.id); done.add(u.id);
      if (++n % 10 === 0) { L.sent = st; L.status = 'sending'; await Letter.save(admin, L); }
    }
    const left = list.filter(u => !done.has(u.id)).length;
    L.sent = st; L.status = left ? 'sending' : 'sent'; if (!left && !st.finished) st.finished = new Date().toISOString();
    await Letter.save(admin, L);
    if (!left) {
      if (!L.news) { try { await postNews(admin, L); L.news = new Date().toISOString(); await Letter.save(admin, L); } catch (e) { console.error('letter news', e.message); } }
      const pd = new Set(L.pushed || []);
      for (const u of list) { if (pd.has(u.id)) continue; if (Date.now() > deadline) { more = true; break; }
        try { await P.send(admin, { uid: u.id, tag: 'ftm-letter', url: '/?open=community', title: 'Letter from FTM', body: 'This month\u2019s letter from FTM is in your inbox.' }); } catch (e) { /* phone notifications off */ }
        pd.add(u.id); }
      L.pushed = Array.from(pd); L.status = more ? 'sending' : 'sent'; await Letter.save(admin, L);
      if (!more) log.push('sent ' + L.id + ' to ' + st.sent);
    }
    if (more) break;
  }
  return { more, log };
}

module.exports = { run, generate, masterFigures, writeText, plainText, changesFor, prevMonth };
