/* /api/v1/staff: the FTM staff console (staff logins only, see api/_lib/staff.js). POST {op, ...}:
   dashboard {force?}       board figures: customers, sign-ups per day, plans, payments (Stripe), connected accounts (engine,
                            read for every paying customer as that customer), money under copy, problems with suggested fixes
   lookup {q}               one customer: email, account number, client ID (FTM-...), Community or leaderboard nickname
   account_stats {uid, account_id}   the engine statistics of one account
   export_trades {uid, account_id}   every closed position with balance at open (owners and staff; read-only)
   act {uid, do, ...}       reset_email | login_email | password_email | confirm_email | signout_all | repair_plan |
                            push_test | push_clear | community_hide | community_show | email (own message)
   broadcast {segment, channel:'email'|'push', subject,title,text,button,link | title,body, dry?, id?, template?:'topup2000'}
                            segments: paying | free | no_account | attention | small (an account below 2,000) | everyone; sends in batches, resumable by id
   letter_list | letter_get {id} | letter_save {id?, month, title, intro, did, changed, next, sign, figs} | letter_delete {id}
   letter_langs {id, segment}   the languages of the members who will get it, and which translations are ready
   letter_translate {id, lang}  translate once into one language (kept until the letter changes)
   letter_preview {id, lang}    the email as a member in that language receives it
   letter_send {id, segment, dry?}   in batches, once per member, each in their own language
   letter_auto                  write last month's letter now (normally the daily job does it on the 1st)
   letter_hold {id, hold}       stop or release an automatic letter before it goes out
   log                      the last staff actions
   team | team_add {email, role, name} | team_role {email, role} | team_remove {email}   owners only
   Every action is written to the staff log. */
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const StaffLib = require('../_lib/staff');
const Engine = require('../_lib/engineClient');
const P = require('../_lib/push');
const Notices = require('../_lib/notices');
const Tpl = require('../_lib/passwordEmail');
const Letter = require('../_lib/letter');

const CRAWL = 'staff/crawl.json', LOG = 'staff/log.json';
function within(ms, p) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms))]); }
function clean(s, n) { return Array.from(String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, n).join(''); }
function cleanLong(s, n) { return Array.from(String(s == null ? '' : s).replace(/[\u0000-\u0009\u000b-\u001f<>]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()).slice(0, n).join(''); }
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const day = 864e5;

async function userFromToken(admin, req) {
  const h = String(req.headers.authorization || ''); const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!tok) return null; const r = await admin.auth.getUser(tok); return (r && r.data && r.data.user) || null;
}
async function allUsers(admin) {
  const out = []; for (let page = 1; page <= 50; page++) { const r = await admin.auth.admin.listUsers({ page, perPage: 1000 }); if (r.error) throw new Error(r.error.message); out.push(...(r.data.users || [])); if ((r.data.users || []).length < 1000) break; } return out;
}
async function allProfiles(admin) {
  const out = {}; for (let from = 0; from < 50000; from += 1000) { const r = await admin.from('profiles').select('id,products').range(from, from + 999); if (r.error) throw new Error(r.error.message); (r.data || []).forEach(p => { out[p.id] = Array.isArray(p.products) ? p.products : []; }); if ((r.data || []).length < 1000) break; } return out;
}
async function eng(u, path, ms) {
  try { const r = await within(ms || 9000, Engine.callEngine(path, { authSubject: u.id, authEmail: u.email, timeoutMs: (ms || 9000) - 500 })); return r.ok ? r.body : { _error: (r.body && r.body.error) || ('HTTP ' + r.status) }; }
  catch (e) { return { _error: e.message }; }
}
async function pool(items, n, fn) { const out = new Array(items.length); let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } })); return out; }
function slimAccount(a) {
  return { id: a.account_id, number: a.account_number || null, broker: a.name || null, server: a.server || null, currency: a.currency || null, balance: num(a.balance), equity: num(a.equity),
    floating: num(a.floating_profit), open: parseInt(a.open_positions, 10) || 0, status: a.display_status || null, reason: a.status_reason || null, text: a.status_text || null, trading: !!a.is_trading,
    tier: a.risk_tier || null, mode: a.trade_mode || null, validated: a.last_validated_at || null, vstart: a.validation_started_at || null, vdelay: a.validation_delay_text || a.validation_delay_reason || null,
    view_only: !!(a.view_only || a.preview) };
}
function stripeKey() { return process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || process.env.STRIPE_RESTRICTED_KEY || ''; }
async function stripePayments(since) {
  const key = stripeKey(); if (!key) return null;
  const out = []; let after = null;
  for (let i = 0; i < 6; i++) {
    const url = 'https://api.stripe.com/v1/checkout/sessions?limit=100&created[gte]=' + Math.floor(since / 1000) + (after ? '&starting_after=' + after : '');
    const r = await within(8000, fetch(url, { headers: { Authorization: 'Bearer ' + key } })); if (!r.ok) break; const j = await r.json();
    (j.data || []).forEach(s => { if (s.status === 'complete' && (s.payment_status === 'paid' || s.payment_status === 'no_payment_required')) out.push({ id: s.id, at: new Date(s.created * 1000).toISOString(), amount: (s.amount_total || 0) / 100, currency: String(s.currency || '').toUpperCase(), email: (s.customer_details && s.customer_details.email) || s.customer_email || '', link: s.payment_link || null }); });
    if (!j.has_more || !j.data.length) break; after = j.data[j.data.length - 1].id;
  }
  return out;
}
async function stripeFor(email) {
  const key = stripeKey(); if (!key) return null;
  try { const r = await within(8000, fetch('https://api.stripe.com/v1/checkout/sessions?limit=20&customer_details[email]=' + encodeURIComponent(email), { headers: { Authorization: 'Bearer ' + key } })); if (!r.ok) return null; const j = await r.json();
    return (j.data || []).map(s => ({ at: new Date(s.created * 1000).toISOString(), amount: (s.amount_total || 0) / 100, currency: String(s.currency || '').toUpperCase(), status: s.status, paid: s.payment_status })); } catch (e) { return null; }
}
function planOf(link) { try { const W = require('../stripe/webhook.js'); const p = (W.PAYMENT_LINK_PRODUCT || {})[link]; if (!p) return 'Other'; if (p === 'invest') return 'Investment'; const m = (W.PLAN_MONTHS || {})[link]; return m === null ? 'Lifetime' : m >= 60 ? '5 Years' : 'Annual'; } catch (e) { return 'Other'; } }

async function crawl(admin, force) {
  const cached = await P.read(admin, CRAWL, null);
  if (!force && cached && Date.now() - Date.parse(cached.at) < 5 * 60e3) return cached;
  const t0 = Date.now(), users = await allUsers(admin), prof = await allProfiles(admin);
  const paid = users.filter(u => (prof[u.id] || []).indexOf('auto') !== -1);
  const rows = await pool(paid, 8, async u => {
    const [acc, bill, me] = await Promise.all([eng(u, '/api/v1/customer/accounts'), eng(u, '/api/v1/billing/status'), eng(u, '/api/v1/customer/me')]);
    return { uid: u.id, email: u.email, accounts: acc._error ? null : (acc.accounts || []).map(slimAccount).filter(a => !a.view_only), err: acc._error || null,
      billing: bill._error ? null : { status: bill.status || null, period_end: bill.period_end || null, lifetime: !!bill.lifetime }, client_id: (me && me.client_id) || null };
  });
  const out = { at: new Date().toISOString(), ms: Date.now() - t0, customers: rows };
  try { await P.write(admin, CRAWL, out); } catch (e) { console.error('staff crawl write', e.message); }
  return out;
}
function problems(users, prof, cr) {
  const now = Date.now(), list = [], byUid = {}; users.forEach(u => { byUid[u.id] = u; });
  (cr.customers || []).forEach(c => {
    const u = byUid[c.uid] || {};
    if (c.err) list.push({ sev: 2, kind: 'engine', uid: c.uid, email: c.email, title: 'Engine did not answer for this customer', detail: c.err, fix: 'lookup' });
    else if (c.accounts && !c.accounts.length && now - Date.parse(u.created_at || 0) > day) list.push({ sev: 2, kind: 'no_account', uid: c.uid, email: c.email, title: 'Paid, but no trading account connected', detail: 'Customer since ' + String(u.created_at || '').slice(0, 10), fix: 'email_connect' });
    (c.accounts || []).forEach(a => {
      if (a.status === 'ACTIVE' || a.status === 'PAUSED' && a.reason === 'PAUSED') return;
      const since = a.vstart ? Math.round((now - Date.parse(a.vstart)) / 60000) : null;
      list.push({ sev: /FAILED|ACTION|ERROR/.test(String(a.status) + String(a.reason)) ? 3 : 2, kind: 'account', uid: c.uid, email: c.email, account: a.number, title: 'Account ' + (a.number || '') + ': ' + (a.text || a.status || 'not trading'), detail: [a.reason, a.vdelay, since != null ? 'waiting ' + since + ' min' : null].filter(Boolean).join(' · '), fix: 'lookup' });
    });
    smallOf(c.accounts).forEach(a => list.push({ sev: 1, kind: 'small', uid: c.uid, email: c.email, account: a.number, title: 'Account ' + a.number + ' is below 2,000 (' + a.balance.toFixed(2) + ' ' + (a.currency || '') + ')', detail: 'It skips many FTM trades. Send the upgrade email once; it is not sent twice within 30 days', fix: 'email_topup' }));
    if (c.billing) {
      if (c.billing.status && ['ACTIVE', 'EXEMPT', 'TRIALING', 'LIFETIME'].indexOf(String(c.billing.status).toUpperCase()) === -1) list.push({ sev: 3, kind: 'billing', uid: c.uid, email: c.email, title: 'Has a plan on the website, but the engine says billing is ' + c.billing.status, detail: 'Repair plan checks Stripe for a payment from this email. If it finds none, ask FTM ENGINE to correct the billing', fix: 'repair_plan' });
      else if (!c.billing.lifetime && c.billing.period_end) { const d = Math.ceil((Date.parse(c.billing.period_end) - now) / day); if (d >= 0 && d <= 14) list.push({ sev: 1, kind: 'renewal', uid: c.uid, email: c.email, title: 'Plan ends in ' + d + ' day' + (d === 1 ? '' : 's'), detail: c.billing.period_end.slice(0, 10), fix: 'email_renew' }); }
    }
  });
  users.forEach(u => {
    const paidU = (prof[u.id] || []).length > 0;
    if (paidU && !u.last_sign_in_at && now - Date.parse(u.created_at) > day) list.push({ sev: 2, kind: 'never_logged_in', uid: u.id, email: u.email, title: 'Paid, never logged in', detail: 'Since ' + String(u.created_at).slice(0, 10), fix: 'password_email' });
  });
  return list.sort((a, b) => b.sev - a.sev);
}
const SMALL = 2000;
function smallOf(accounts) { return (accounts || []).filter(a => !a.view_only && a.balance > 0 && a.balance < SMALL).map(a => ({ number: a.number, balance: a.balance, currency: a.currency })); }
async function logIt(admin, by, op, target, detail) {
  try { const L = await P.read(admin, LOG, { items: [] }); L.items.push({ at: new Date().toISOString(), by, op, target: target || '', detail: String(detail || '').slice(0, 200) }); if (L.items.length > 500) L.items = L.items.slice(-500); await P.write(admin, LOG, L); } catch (e) { console.error('staff log', e.message); }
}
async function findUser(admin, q) {
  q = String(q || '').trim(); if (!q) return null;
  const users = await allUsers(admin);
  if (/@/.test(q)) return users.find(u => String(u.email || '').toLowerCase() === q.toLowerCase()) || null;
  const cr = await P.read(admin, CRAWL, { customers: [] });
  if (/^FTM-/i.test(q)) { const c = cr.customers.find(x => String(x.client_id || '').toUpperCase() === q.toUpperCase()); return c ? users.find(u => u.id === c.uid) || null : null; }
  if (/^\d{4,}$/.test(q)) { const c = cr.customers.find(x => (x.accounts || []).some(a => String(a.number) === q)); return c ? users.find(u => u.id === c.uid) || null : null; }
  const idx = await P.read(admin, 'index.json', { members: {} }), n = q.toLowerCase();
  const mid = Object.keys(idx.members).find(k => String(idx.members[k].nickname || '').toLowerCase() === n || String(idx.members[k].lb || '').toLowerCase() === n);
  return mid ? users.find(u => P.midOf(u.id) === mid) || null : null;
}
async function segmentList(admin, seg) {
  const [users, prof] = await Promise.all([allUsers(admin), allProfiles(admin)]);
  let list, smallMap = null;
  if (seg === 'paying') list = users.filter(u => (prof[u.id] || []).indexOf('auto') !== -1);
  else if (seg === 'free') list = users.filter(u => !(prof[u.id] || []).length);
  else if (seg === 'everyone') list = users;
  else if (seg === 'small') { const cr = await crawl(admin, false); smallMap = {}; (cr.customers || []).forEach(c => { const sm = smallOf(c.accounts); if (sm.length) smallMap[c.uid] = sm; }); list = users.filter(u => smallMap[u.id]); }
  else if (seg === 'no_account' || seg === 'attention') { const cr = await crawl(admin, false); const ids = new Set((cr.customers || []).filter(c => seg === 'no_account' ? (c.accounts && !c.accounts.length) : (c.accounts || []).some(a => !(a.status === 'ACTIVE' || a.status === 'PAUSED' && a.reason === 'PAUSED'))).map(c => c.uid)); list = users.filter(u => ids.has(u.id)); }
  else return null;
  return { list: list.filter(u => u.email), smallMap };
}
async function customer360(admin, u) {
  const prof = await admin.from('profiles').select('products').eq('id', u.id).maybeSingle();
  const products = (prof && prof.data && prof.data.products) || [];
  const [acc, bill, me, lb, kyc, pay] = await Promise.all([eng(u, '/api/v1/customer/accounts'), eng(u, '/api/v1/billing/status'), eng(u, '/api/v1/customer/me'), eng(u, '/api/v1/customer/leaderboard/profile'), eng(u, '/api/v1/customer/kyc-profile'), stripeFor(u.email)]);
  const mid = P.midOf(u.id), idx = await P.read(admin, 'index.json', { members: {} }), cm = idx.members[mid] || null, box = await P.getBox(admin, mid);
  const meta = u.app_metadata || {}, um = u.user_metadata || {};
  return { uid: u.id, email: u.email, name: um.full_name || um.name || '', created: u.created_at, last_login: u.last_sign_in_at || null, confirmed: !!u.email_confirmed_at, products,
    client_id: me.client_id || null, kyc: kyc._error ? null : (kyc.profile || kyc), billing: bill._error ? { error: bill._error } : { status: bill.status || null, period_end: bill.period_end || null, lifetime: !!bill.lifetime },
    accounts: acc._error ? { error: acc._error } : (acc.accounts || []).map(slimAccount), leaderboard: lb._error ? null : (lb.profile || null),
    community: cm ? { mid, nickname: cm.nickname, visible: !!cm.visible, sub: !!cm.sub, since: cm.since, lb: cm.lb || null } : null,
    push: { devices: box.subs.length, prefs: box.prefs }, devices: (meta.ftm_devices || []).map(d => ({ name: d.name || 'device', place: d.where || null, first: d.first || null, last: d.last || null })).slice(-10), signed_out_at: meta.ftm_revoked_at || null,
    payments: pay };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  let body = req.body || {}; if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  res.setHeader('Cache-Control', 'no-store');
  try {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const me = await userFromToken(admin, req);
    const role = me ? await StaffLib.role(admin, me) : null;
    if (!role) return res.status(403).json({ ok: false, error: 'STAFF_ONLY' });
    const op = String(body.op || ''), by = me.email;
    if (role === 'support' && (op === 'broadcast' || op.indexOf('letter_') === 0)) return res.status(403).json({ ok: false, error: 'NOT_FOR_SUPPORT' });
    if (op.indexOf('team') === 0 && role !== 'owner') return res.status(403).json({ ok: false, error: 'OWNERS_ONLY' });

    if (op === 'team') {
      const T = await StaffLib.team(admin, true), users = await allUsers(admin), byMail = {}; users.forEach(u => { if (u.email) byMail[u.email.toLowerCase()] = u; });
      const row = (e, r, fixed, extra) => { const u = byMail[e]; return Object.assign({ email: e, role: r, fixed: !!fixed, has_login: !!u, confirmed: !!(u && u.email_confirmed_at), last_login: u ? u.last_sign_in_at || null : null }, extra || {}); };
      const list = StaffLib.owners().map(e => row(e, 'owner', true)).concat(T.filter(m => StaffLib.owners().indexOf(m.email) === -1).map(m => row(m.email, m.role, false, { name: m.name || '', added_by: m.by || '', added_at: m.at || null })));
      users.forEach(u => { const e = String(u.email || '').toLowerCase(); if (/@ftmwealthnation\.com$/.test(e) && !list.some(x => x.email === e)) list.push(row(e, 'staff', true)); });
      return res.status(200).json({ ok: true, me: by, members: list });
    }
    if (op === 'team_add' || op === 'team_role' || op === 'team_remove') {
      const e = String(body.email || '').trim().toLowerCase(), r = ['owner', 'staff', 'support'].indexOf(body.role) !== -1 ? body.role : 'support';
      if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e)) return res.status(400).json({ ok: false, error: 'EMAIL_INVALID' });
      if (StaffLib.owners().indexOf(e) !== -1) return res.status(400).json({ ok: false, error: 'FIXED_OWNER' });
      if (e === String(by).toLowerCase()) return res.status(400).json({ ok: false, error: 'NOT_YOURSELF' });
      const T = (await StaffLib.team(admin, true)).slice(), i = T.findIndex(m => m.email === e);
      if (op === 'team_remove') {
        if (i === -1) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
        T.splice(i, 1); await StaffLib.saveTeam(admin, T);
        const u = (await allUsers(admin)).find(x => String(x.email || '').toLowerCase() === e);
        if (u) await admin.auth.admin.updateUserById(u.id, { app_metadata: Object.assign({}, u.app_metadata || {}, { ftm_revoked_at: new Date().toISOString(), ftm_devices: [] }) });
        await logIt(admin, by, 'team_remove', e, 'Removed from staff and signed out');
        return res.status(200).json({ ok: true, message: e + ' is no longer staff and was signed out.' });
      }
      if (op === 'team_role') {
        if (i === -1) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
        T[i] = Object.assign({}, T[i], { role: r }); await StaffLib.saveTeam(admin, T); await logIt(admin, by, 'team_role', e, r);
        return res.status(200).json({ ok: true, message: e + ' is now ' + r + '.' });
      }
      const name = clean(body.name, 60);
      if (i === -1) T.push({ email: e, role: r, name, by, at: new Date().toISOString() }); else T[i] = Object.assign({}, T[i], { role: r, name: name || T[i].name });
      await StaffLib.saveTeam(admin, T);
      const u = (await allUsers(admin)).find(x => String(x.email || '').toLowerCase() === e);
      let msg;
      if (!u || !u.last_sign_in_at) { await Tpl.sendPasswordEmail(admin, e, { free: true, fresh: !!u, name }); msg = e + ' was added as ' + r + '. They got an email to create their password; the FTM staff menu appears after they log in.'; }
      else { await Notices.custom(admin, u, { subject: 'You now have access to the FTM staff console', title: 'Welcome to the FTM team', text: 'You were added to the FTM staff console as ' + r + '.\n\nLog in as usual: the menu now shows FTM staff.', button: 'Open FTM', link: 'https://www.ftmwealthnation.com/' }); msg = e + ' was added as ' + r + '. They see FTM staff at their next login.'; }
      await logIt(admin, by, 'team_add', e, r);
      return res.status(200).json({ ok: true, message: msg });
    }

    if (op === 'dashboard') {
      const [users, prof, cr] = await Promise.all([allUsers(admin), allProfiles(admin), crawl(admin, !!body.force)]);
      const now = Date.now(), paidIds = new Set(Object.keys(prof).filter(k => prof[k].indexOf('auto') !== -1)), invIds = new Set(Object.keys(prof).filter(k => prof[k].indexOf('invest') !== -1));
      const days = []; for (let i = 29; i >= 0; i--) { const d = new Date(now - i * day).toISOString().slice(0, 10); days.push({ d, signups: 0, logins: 0 }); }
      const dmap = {}; days.forEach(x => { dmap[x.d] = x; });
      users.forEach(u => { const c = String(u.created_at || '').slice(0, 10); if (dmap[c]) dmap[c].signups++; const l = String(u.last_sign_in_at || '').slice(0, 10); if (dmap[l]) dmap[l].logins++; });
      const accounts = [], money = {}; let open = 0, trading = 0;
      (cr.customers || []).forEach(c => (c.accounts || []).forEach(a => { accounts.push(Object.assign({ email: c.email, uid: c.uid }, a)); if (a.trading) trading++; open += a.open; const k = a.currency || '?'; money[k] = money[k] || { balance: 0, equity: 0, floating: 0, accounts: 0 }; money[k].balance += a.balance; money[k].equity += a.equity; money[k].floating += a.floating; money[k].accounts++; }));
      const count = (f) => accounts.reduce((o, a) => { const k = f(a) || 'unknown'; o[k] = (o[k] || 0) + 1; return o; }, {});
      let pay = null; try { const list = await stripePayments(now - 90 * day); if (list) { const mStart = new Date(); mStart.setUTCDate(1); mStart.setUTCHours(0, 0, 0, 0); const sum = (L) => L.reduce((o, p) => { o[p.currency] = (o[p.currency] || 0) + p.amount; return o; }, {});
        pay = { mtd: sum(list.filter(p => Date.parse(p.at) >= mStart.getTime())), d30: sum(list.filter(p => Date.parse(p.at) >= now - 30 * day)), d90: sum(list), count30: list.filter(p => Date.parse(p.at) >= now - 30 * day).length,
          plans: list.reduce((o, p) => { const k = planOf(p.link); o[k] = (o[k] || 0) + 1; return o; }, {}), recent: list.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12).map(p => Object.assign({ plan: planOf(p.link) }, p)) }; } } catch (e) { console.error('staff stripe', e.message); }
      const idx = await P.read(admin, 'index.json', { members: {} }), pres = await P.read(admin, 'presence.json', {}), posts = (await P.read(admin, 'posts.json', { posts: [] })).posts;
      const stats = { customers: users.length, paying: paidIds.size, investors: invIds.size, free: users.filter(u => !(prof[u.id] || []).length).length,
        new_1d: users.filter(u => now - Date.parse(u.created_at) < day).length, new_7d: users.filter(u => now - Date.parse(u.created_at) < 7 * day).length, new_30d: users.filter(u => now - Date.parse(u.created_at) < 30 * day).length,
        active_1d: users.filter(u => now - Date.parse(u.last_sign_in_at || 0) < day).length, active_7d: users.filter(u => now - Date.parse(u.last_sign_in_at || 0) < 7 * day).length,
        paying_with_account: (cr.customers || []).filter(c => (c.accounts || []).length).length, accounts: accounts.length, trading, open_positions: open, real: accounts.filter(a => a.mode === 'REAL').length, demo: accounts.filter(a => a.mode === 'DEMO').length,
        community: Object.keys(idx.members).length, online: Object.keys(pres).filter(k => now - Date.parse(pres[k]) < 300000).length, posts_7d: posts.filter(x => now - Date.parse(x.t) < 7 * day).length };
      stats.no_account = (cr.customers || []).filter(c => c.accounts && !c.accounts.length).length;
      stats.attention = accounts.filter(a => !(a.status === 'ACTIVE' || a.status === 'PAUSED' && a.reason === 'PAUSED')).length;
      stats.conversion = stats.customers ? Math.round(stats.paying / stats.customers * 1000) / 10 : 0;
      // sign-ups by link (?start=ig|fb|tt|yt|wa...), last 30 days and all time
      stats.sources_30d = users.filter(u => now - Date.parse(u.created_at) < 30 * day).reduce((o, u) => { const k = (u.user_metadata && u.user_metadata.ftm_src) || 'direct'; o[k] = (o[k] || 0) + 1; return o; }, {});
      if (role === 'support') pay = null;
      return res.status(200).json({ ok: true, role, at: cr.at, crawl_ms: cr.ms, stats, days, money, by_status: count(a => a.status), by_tier: count(a => a.tier), by_broker: count(a => a.broker), payments: pay,
        accounts: accounts.sort((a, b) => b.equity - a.equity), problems: problems(users, prof, cr),
        free: users.filter(u => !(prof[u.id] || []).length).map(u => { const m = u.user_metadata || {}; return { uid: u.id, email: u.email || '', name: String(m.full_name || m.name || [m.first_name, m.last_name].filter(Boolean).join(' ') || '').slice(0, 60), joined: u.created_at || null, last: u.last_sign_in_at || null, confirmed: !!u.email_confirmed_at }; }).sort((a, b) => String(b.joined || '').localeCompare(String(a.joined || ''))) });
    }

    if (op === 'lookup') {
      const u = await findUser(admin, body.q); if (!u) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      return res.status(200).json({ ok: true, customer: await customer360(admin, u) });
    }

    if (op === 'export_trades') {
      if (role === 'support') return res.status(403).json({ ok: false, error: 'NOT_FOR_SUPPORT' });
      const r = await admin.auth.admin.getUserById(String(body.uid || '')); const u = r.data && r.data.user; if (!u) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      const H = require('../_lib/accountHistory'), A = (await H.accounts(u)).mapped, m = A.find(a => String(a.accountId) === String(body.account_id || ''));
      if (!m) return res.status(404).json({ ok: false, error: 'ACCOUNT_NOT_FOUND' });
      const h = await H.load(u, m), pick = (o, ks) => { for (const k of ks) if (o && o[k] != null && o[k] !== '') return o[k]; return null; };
      const outDeal = {}; h.rawHistory.forEach(d => { if (String(d.entry || '').toUpperCase() === 'OUT' && d.position_ref) outDeal[d.position_ref] = d; });
      const rows = h.closed.map((t, i) => { const raw = h.rawTrades[i] || {}, d = outDeal[t.positionRef] || {};
        return { position: t.positionRef, open_time: t.openTime ? new Date(t.openTime).toISOString() : null, close_time: t.closeTime ? new Date(t.closeTime).toISOString() : null, symbol: t.symbol, side: t.dir, volume: t.lots,
          open_price: t.open, close_price: t.close, sl: pick(raw, ['sl', 'stop_loss', 'sl_price']) ?? pick(d, ['sl', 'stop_loss']), tp: pick(raw, ['tp', 'take_profit', 'tp_price']) ?? pick(d, ['tp', 'take_profit']),
          comment: pick(raw, ['comment']) ?? pick(d, ['comment']), magic: pick(raw, ['magic', 'magic_number']) ?? pick(d, ['magic', 'magic_number']),
          commission: t.commission, swap: t.swap, net_profit: t.pl, balance_at_open: t.openTime ? +h.M.balAt(t.openTime).toFixed(2) : null, balance_after_close: t.closeTime ? +h.M.balAt(t.closeTime + 1).toFixed(2) : null,
          close_reason: t.closeReason, closed_by: t.closedBy, copied_by_ftm: t.copiedByFtm };
      }).sort((a, b) => String(a.close_time).localeCompare(String(b.close_time)));
      await logIt(admin, by, 'export_trades', u.email, (m.number || m.accountId) + ' (' + rows.length + ' trades)');
      return res.status(200).json({ ok: true, account: { number: m.number, currency: m.currency, master: !!m.isMaster }, rows });
    }
    if (op === 'account_stats') {
      const r = await admin.auth.admin.getUserById(String(body.uid || '')); const u = r.data && r.data.user; if (!u) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      const id = String(body.account_id || '').replace(/[^\w-]/g, ''); const s = await eng(u, '/api/v1/customer/accounts/' + id + '/stats', 15000);
      if (s._error) return res.status(502).json({ ok: false, error: s._error });
      const flat = {}; const src = s.stats || s; Object.keys(src).forEach(k => { const v = src[k]; if (v == null || typeof v !== 'object') flat[k] = v; });
      return res.status(200).json({ ok: true, stats: flat });
    }

    if (op === 'act') {
      const r = await admin.auth.admin.getUserById(String(body.uid || '')); const u = r.data && r.data.user; if (!u) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      const what = String(body.do || ''), um = u.user_metadata || {}, name = um.full_name || um.name || '';
      const prof = await admin.from('profiles').select('products').eq('id', u.id).maybeSingle(); const products = (prof && prof.data && prof.data.products) || [];
      let msg = '';
      if (what === 'reset_email') { await Tpl.sendResetEmail(admin, u.email, { name }); msg = 'Password reset email sent.'; }
      else if (what === 'login_email') { await Tpl.sendLoginEmail(admin, u.email, { name }); msg = 'Login code email sent.'; }
      else if (what === 'password_email') { await Tpl.sendPasswordEmail(admin, u.email, { name, fresh: true, free: !products.length }); msg = 'Create-password email sent.'; }
      else if (what === 'confirm_email') { const w = await admin.auth.admin.updateUserById(u.id, { email_confirm: true }); if (w.error) throw new Error(w.error.message); msg = 'Email marked as confirmed.'; }
      else if (what === 'signout_all') { const w = await admin.auth.admin.updateUserById(u.id, { app_metadata: Object.assign({}, u.app_metadata || {}, { ftm_revoked_at: new Date().toISOString(), ftm_devices: [] }) }); if (w.error) throw new Error(w.error.message); msg = 'Signed out on every device.'; }
      else if (what === 'repair_plan') {
        const E = require('./customer/entitlements.js'); let found = [];
        try { const s = await E.paidProductsFromStripe(u.email); found = s.products; if (!s.checked && await E.activeOnEngine(u)) found = ['auto']; } catch (e) { console.error('repair', e.message); }
        if (!found.length) msg = 'No payment found for this email. Plan unchanged.';
        else { const keep = [...new Set(products.concat(found))]; const w = await admin.from('profiles').upsert({ id: u.id, products: keep }); if (w.error) throw new Error(w.error.message); msg = 'Payment found. Plan: ' + keep.join(', ') + '.'; }
      }
      else if (what === 'push_test') { const n = await P.send(admin, { uid: u.id, tag: 'test', url: '/', title: 'FTM notifications are on', body: 'You will get messages, new followers, trades closed in profit and leaderboard moves here.' }); msg = 'Test notification sent to ' + n + ' device' + (n === 1 ? '' : 's') + '.'; }
      else if (what === 'push_clear') { const mid = P.midOf(u.id), box = await P.getBox(admin, mid); box.subs = []; await P.write(admin, 'push/' + mid + '.json', box); msg = 'Phone notifications reset. The phone asks again at the next login.'; }
      else if (what === 'community_hide' || what === 'community_show') { const mid = P.midOf(u.id), idx = await P.read(admin, 'index.json', { members: {} }); if (!idx.members[mid]) return res.status(404).json({ ok: false, error: 'NO_COMMUNITY_PROFILE' }); idx.members[mid].visible = what === 'community_show'; idx.members[mid].vis_set = true; await P.write(admin, 'index.json', idx); msg = what === 'community_show' ? 'Community profile visible.' : 'Community profile hidden.'; }
      else if (what === 'email_topup') {
        const acc = await eng(u, '/api/v1/customer/accounts'); if (acc._error) throw new Error('engine: ' + acc._error);
        const sm = smallOf((acc.accounts || []).map(slimAccount)); if (!sm.length) return res.status(400).json({ ok: false, error: 'NO_ACCOUNT_BELOW_2000' });
        const r = await Notices.topup(admin, u, sm); msg = r.duplicate ? 'Already sent in the last 30 days. Not sent again.' : r.via ? 'Upgrade email sent (' + sm.map(a => a.number).join(', ') + ').' : 'Email failed.';
      }
      else if (what === 'email') {
        const subject = clean(body.subject, 120), title = clean(body.title, 80), text = cleanLong(body.text, 4000); if (!subject || !title || !text) return res.status(400).json({ ok: false, error: 'MESSAGE_INCOMPLETE' });
        const s = await Notices.custom(admin, u, { subject, title, text, button: clean(body.button, 40), link: String(body.link || '').slice(0, 300) }); msg = s.via ? 'Email sent.' : 'Email failed.';
      }
      else return res.status(400).json({ ok: false, error: 'UNKNOWN_ACTION' });
      await logIt(admin, by, what, u.email, msg);
      return res.status(200).json({ ok: true, message: msg });
    }

    if (op === 'broadcast') {
      const channel = body.channel === 'push' ? 'push' : 'email', seg = String(body.segment || '');
      const sl = await segmentList(admin, seg); if (!sl) return res.status(400).json({ ok: false, error: 'UNKNOWN_SEGMENT' });
      const list = sl.list, smallMap = sl.smallMap;
      if (body.dry) return res.status(200).json({ ok: true, count: list.length });
      const subject = clean(body.subject, 120), title = clean(body.title, 80), text = cleanLong(body.text, 4000), pbody = clean(body.body, 160);
      const tpl = body.template === 'topup2000' ? 'topup2000' : '';
      if (tpl && (channel !== 'email' || seg !== 'small')) return res.status(400).json({ ok: false, error: 'TOPUP_ONLY_FOR_SMALL' });
      if (channel === 'email' && !tpl && (!subject || !title || !text)) return res.status(400).json({ ok: false, error: 'MESSAGE_INCOMPLETE' });
      if (channel === 'push' && (!title || !pbody)) return res.status(400).json({ ok: false, error: 'MESSAGE_INCOMPLETE' });
      const id = /^[a-z0-9]{6,20}$/.test(String(body.id || '')) ? body.id : Date.now().toString(36) + crypto.randomBytes(3).toString('hex'), key = 'staff/broadcast-' + id + '.json';
      const st = await P.read(admin, key, { done: [], failed: 0, sent: 0 }); const done = new Set(st.done);
      const todo = list.filter(u => !done.has(u.id)).slice(0, channel === 'email' ? 60 : 300); const t0 = Date.now();
      await pool(todo, channel === 'email' ? 6 : 12, async u => {
        if (Date.now() - t0 > 45000) return;
        try { if (tpl) { const r = await Notices.topup(admin, u, smallMap[u.id]); if (r.via) st.sent++; else if (r.duplicate) st.skipped = (st.skipped || 0) + 1; else st.failed++; }
          else if (channel === 'email') { const r = await Notices.custom(admin, u, { subject, title, text, button: clean(body.button, 40), link: String(body.link || '').slice(0, 300) }); if (r.via) st.sent++; else st.failed++; }
          else { const n = await P.send(admin, { uid: u.id, tag: 'ftm-news', url: '/?open=community', title, body: pbody }); if (n) st.sent++; } } catch (e) { st.failed++; }
        st.done.push(u.id);
      });
      await P.write(admin, key, st);
      const left = list.filter(u => st.done.indexOf(u.id) === -1).length;
      if (!left) await logIt(admin, by, 'broadcast_' + (tpl || channel), seg + ' (' + list.length + ')', tpl ? 'Why we recommend 2,000 or more' : channel === 'email' ? subject : title + ': ' + pbody);
      return res.status(200).json({ ok: true, id, total: list.length, sent: st.sent, failed: st.failed, skipped: st.skipped || 0, left });
    }

    if (op.indexOf('letter_') === 0) {
      if (op === 'letter_list') { const ix = await Letter.readIndex(admin); return res.status(200).json({ ok: true, items: ix.items }); }
      if (op === 'letter_auto') {
        const Auto = require('../_lib/letterAuto'), ym = Auto.prevMonth(Date.now()), ix = await Letter.readIndex(admin);
        if (ix.items.some(x => x.month === ym)) return res.status(409).json({ ok: false, error: 'ALREADY_EXISTS' });
        const L = await Auto.generate(admin, ym, await allUsers(admin)); await logIt(admin, by, 'letter_auto', Letter.monthName(ym), L.title);
        return res.status(200).json({ ok: true, letter: L });
      }
      if (op === 'letter_save') {
        const month = /^20\d\d-(0[1-9]|1[0-2])$/.test(String(body.month || '')) ? body.month : '';
        const title = clean(body.title, 90), intro = cleanLong(body.intro, 2500); if (!month || !title || !intro) return res.status(400).json({ ok: false, error: 'LETTER_INCOMPLETE' });
        let L = body.id ? await Letter.get(admin, body.id) : null; if (body.id && !L) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
        if (L && L.sent && L.sent.sent) return res.status(409).json({ ok: false, error: 'ALREADY_SENT' });
        const fg = body.figs || {}, fnum = v => (v === null || v === undefined || v === '' || !isFinite(+v)) ? null : +v;
        const figs = { month_pct: fnum(fg.month_pct), ytd_pct: fnum(fg.ytd_pct), trades: fnum(fg.trades) === null ? null : Math.round(+fg.trades), win_pct: fnum(fg.win_pct), account: clean(fg.account, 24), at: clean(fg.at, 30) };
        const next = { month, title, intro, did: cleanLong(body.did, 2500), changed: cleanLong(body.changed, 2500), next: cleanLong(body.next, 2500), sign: clean(body.sign, 60) || 'FTM', figs };
        const now = new Date().toISOString();
        if (!L) L = { id: Date.now().toString(36) + crypto.randomBytes(3).toString('hex'), created: now, v: 0, status: 'draft' };
        const changed = ['month', 'title', 'intro', 'did', 'changed', 'next', 'sign'].some(k => L[k] !== next[k]) || JSON.stringify(L.figs || {}) !== JSON.stringify(figs);
        Object.assign(L, next, { updated: now, by }); if (changed) L.v = (L.v || 0) + 1;
        await Letter.save(admin, L); await logIt(admin, by, 'letter_save', Letter.monthName(month), title);
        return res.status(200).json({ ok: true, letter: L });
      }
      const L = await Letter.get(admin, body.id); if (!L) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      if (op === 'letter_get') return res.status(200).json({ ok: true, letter: L });
      if (op === 'letter_hold') {
        if (L.status === 'sent') return res.status(409).json({ ok: false, error: 'ALREADY_SENT' });
        L.held = !!body.hold; if (!L.held && L.status === 'draft') { L.status = 'scheduled'; L.send_at = L.send_at || new Date().toISOString(); L.segment = L.segment || 'everyone'; }
        L.updated = new Date().toISOString(); await Letter.save(admin, L); await logIt(admin, by, L.held ? 'letter_hold' : 'letter_release', Letter.monthName(L.month), L.title);
        return res.status(200).json({ ok: true, letter: L });
      }
      if (op === 'letter_delete') { if (L.sent && L.sent.sent) return res.status(409).json({ ok: false, error: 'ALREADY_SENT' }); const ix = await Letter.readIndex(admin); ix.items = ix.items.filter(x => x.id !== L.id); await P.write(admin, 'letters/index.json', ix); await logIt(admin, by, 'letter_delete', Letter.monthName(L.month), L.title); return res.status(200).json({ ok: true }); }
      if (op === 'letter_preview') {
        const lang = Letter.LANG_EN[body.lang] ? body.lang : 'en', W = (await Letter.wordsFor(admin, L, lang)) || null;
        const w = W || Letter.words(L), used = W ? lang : 'en';
        return res.status(200).json({ ok: true, lang: used, ready: !!W, subject: w.subject, html: Letter.html(L, w, me.user_metadata && (me.user_metadata.full_name || me.user_metadata.name) || '', used) });
      }
      if (op === 'letter_translate') {
        if (!Letter.LANG_EN[body.lang]) return res.status(400).json({ ok: false, error: 'UNKNOWN_LANGUAGE' });
        if (!process.env.ANTHROPIC_API_KEY && body.lang !== 'en') return res.status(503).json({ ok: false, error: 'TRANSLATION_NOT_CONFIGURED' });
        const r = await Letter.prepare(admin, L, body.lang); return res.status(200).json({ ok: true, lang: r.lang, cached: r.cached });
      }
      const seg = String(body.segment || 'paying'), sl = await segmentList(admin, seg); if (!sl || seg === 'small') return res.status(400).json({ ok: false, error: 'UNKNOWN_SEGMENT' });
      const boxes = {}; await pool(sl.list, 12, async u => { boxes[u.id] = await P.getBox(admin, P.midOf(u.id)).catch(() => null); });
      if (op === 'letter_langs') {
        const count = {}; sl.list.forEach(u => { const l = Letter.langOf(u, boxes[u.id]); count[l] = (count[l] || 0) + 1; });
        const langs = await pool(Object.keys(count), 8, async l => ({ lang: l, name: Letter.LANG_EN[l], members: count[l], ready: l === 'en' || !!(await Letter.wordsFor(admin, L, l)) }));
        return res.status(200).json({ ok: true, total: sl.list.length, langs: langs.sort((a, b) => b.members - a.members) });
      }
      if (op === 'letter_send') {
        const st = L.sent && L.sent.segment === seg ? L.sent : { segment: seg, done: [], sent: 0, failed: 0, langs: {}, started: new Date().toISOString(), v: L.v };
        if (body.dry) return res.status(200).json({ ok: true, total: sl.list.length, left: sl.list.filter(u => st.done.indexOf(u.id) === -1).length });
        const done = new Set(st.done), todo = sl.list.filter(u => !done.has(u.id)).slice(0, 60), t0 = Date.now();
        await pool(todo, 6, async u => {
          if (Date.now() - t0 > 45000) return;
          try { const r = await Letter.sendTo(admin, L, u); if (r.via) { st.sent++; st.langs[r.lang] = (st.langs[r.lang] || 0) + 1; } else st.failed++; } catch (e) { st.failed++; }
          st.done.push(u.id);
        });
        const left = sl.list.filter(u => st.done.indexOf(u.id) === -1).length;
        L.sent = st; L.status = left ? 'sending' : 'sent'; if (!left) st.finished = new Date().toISOString();
        await Letter.save(admin, L);
        if (!left) await logIt(admin, by, 'letter_send', seg + ' (' + sl.list.length + ')', Letter.monthName(L.month) + ': ' + L.title);
        return res.status(200).json({ ok: true, total: sl.list.length, sent: st.sent, failed: st.failed, left, langs: st.langs });
      }
      return res.status(400).json({ ok: false, error: 'UNKNOWN_OP' });
    }

    if (op === 'log') { const L = await P.read(admin, LOG, { items: [] }); return res.status(200).json({ ok: true, items: L.items.slice(-100).reverse() }); }

    return res.status(400).json({ ok: false, error: 'UNKNOWN_OP' });
  } catch (e) { console.error('staff', e.message); return res.status(500).json({ ok: false, error: 'STAFF_FAILED', detail: String(e.message || '').slice(0, 120) }); }
};
