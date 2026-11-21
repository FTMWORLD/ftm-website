/* FTM affiliate programme (owner 21 Nov 2026).
   - Anyone applies; staff approve. An approved affiliate gets a code (e.g. BARNES) and a link https://www.ftmwealthnation.com/?ref=BARNES
   - The code is also a Stripe promotion code: 5% off the customer's first payment.
   - A customer belongs to the first affiliate that brought them (link before sign-up, or the code at checkout); never to themselves.
   - Commission: 10% of every subscription payment that customer makes (first payment and every renewal), never on investments.
   - A commission becomes payable 30 days after the payment; staff pay monthly (bank transfer or PayPal), minimum 50 EUR.
   Storage (private bucket, api/_lib/push.js): aff/index.json, aff/customers.json, aff/commissions.json, aff/clicks.json */
const P = require('./push');

const RATE = 0.10, HOLD_DAYS = 30, MIN_PAYOUT = 50, DISCOUNT_PCT = 5;
const IDX = 'aff/index.json', CUS = 'aff/customers.json', COM = 'aff/commissions.json', CLK = 'aff/clicks.json';
const SITE = () => (process.env.SITE_URL || 'https://www.ftmwealthnation.com').replace(/\/$/, '');
const clean = (s, n) => Array.from(String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, n).join('');
const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
const normEmail = e => String(e || '').trim().toLowerCase();

async function idx(admin) { const d = await P.read(admin, IDX, null) || {}; d.affs = d.affs || {}; return d; }
function byEmail(I, email) { email = normEmail(email); return Object.values(I.affs).find(a => a.email === email) || null; }
function linkOf(code) { return SITE() + '/?ref=' + code; }
function newCode(I, name, email) {
  let base = normCode(String(name || '').split(/\s+/)[0]) || normCode(String(email).split('@')[0]) || 'FTM';
  base = base.slice(0, 10); if (base.length < 3) base = (base + 'FTM').slice(0, 6);
  let c = base, n = 1; while (I.affs[c] || c === 'FTM') { n++; c = base + n; }
  return c;
}

async function apply(admin, b) {
  const email = normEmail(b.email), name = clean(b.name, 80);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return { ok: false, error: 'BAD_EMAIL' };
  if (name.length < 2) return { ok: false, error: 'NAME' };
  if (b.agree !== true) return { ok: false, error: 'AGREE' };
  const I = await idx(admin), old = byEmail(I, email);
  if (old && old.status !== 'rejected') return { ok: true, already: true, status: old.status, code: old.status === 'approved' ? old.code : undefined };
  const code = old ? old.code : newCode(I, name, email);
  I.affs[code] = Object.assign(old || {}, { code, email, name, country: clean(b.country, 60), channel: clean(b.channel, 300), audience: clean(b.audience, 60), message: clean(b.message, 800),
    lang: clean(b.lang, 8) || 'en', status: 'pending', applied: new Date().toISOString(), rejected: undefined });
  await P.write(admin, IDX, I);
  return { ok: true, status: 'pending', code, aff: I.affs[code] };
}

/* Stripe promotion code (5% off the first payment) for an approved affiliate. Needs a Stripe key that may write. */
async function stripePromo(code) {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || '';
  if (!key) return { error: 'NO_STRIPE_KEY' };
  const api = async (path, form) => { const r = await fetch('https://api.stripe.com/v1/' + path, { method: form ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + key, 'content-type': 'application/x-www-form-urlencoded' }, body: form ? new URLSearchParams(form).toString() : undefined });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error((j.error && j.error.message) || ('Stripe ' + r.status)); return j; };
  try {
    let coupon = process.env.STRIPE_AFF_COUPON || 'ftm-affiliate-5';
    try { await api('coupons/' + encodeURIComponent(coupon)); } catch (e) { await api('coupons', { id: coupon, percent_off: String(DISCOUNT_PCT), duration: 'once', name: 'FTM affiliate 5% off' }); }
    const found = await api('promotion_codes?code=' + encodeURIComponent(code) + '&limit=1');
    if (found.data && found.data[0]) return { id: found.data[0].id };
    const p = await api('promotion_codes', { coupon, code, 'metadata[ftm_affiliate]': code });
    return { id: p.id };
  } catch (e) { return { error: String(e.message || e).slice(0, 160) }; }
}

async function approve(admin, code) {
  code = normCode(code); const I = await idx(admin), a = I.affs[code];
  if (!a) return { ok: false, error: 'NOT_FOUND' };
  a.status = 'approved'; a.approved = a.approved || new Date().toISOString();
  if (!a.promoId) { const s = await stripePromo(code); if (s.id) { a.promoId = s.id; a.promoError = undefined; } else a.promoError = s.error; }
  await P.write(admin, IDX, I);
  return { ok: true, aff: a, link: linkOf(code) };
}
async function reject(admin, code) {
  code = normCode(code); const I = await idx(admin), a = I.affs[code];
  if (!a) return { ok: false, error: 'NOT_FOUND' };
  a.status = 'rejected'; a.rejected = new Date().toISOString(); await P.write(admin, IDX, I); return { ok: true, aff: a };
}

/* A visitor opened an affiliate link: count it (per day) and say whether the code is live. */
async function click(admin, code) {
  code = normCode(code); const I = await idx(admin), a = I.affs[code];
  if (!a || a.status !== 'approved') return { ok: true, valid: false };
  const C = await P.read(admin, CLK, {}) || {}, d = new Date().toISOString().slice(0, 10);
  C[code] = C[code] || { n: 0, days: {} }; C[code].n++; C[code].days[d] = (C[code].days[d] || 0) + 1;
  Object.keys(C[code].days).sort().slice(0, -120).forEach(k => delete C[code].days[k]);
  await P.write(admin, CLK, C);
  return { ok: true, valid: true };
}

/* Tie a customer to an affiliate. The first affiliate wins; an affiliate never earns on their own payments. */
async function attribute(admin, email, code, how) {
  email = normEmail(email); code = normCode(code); if (!email || !code) return { ok: false };
  const I = await idx(admin), a = I.affs[code];
  if (!a || a.status !== 'approved' || a.email === email) return { ok: false, error: 'NOT_VALID' };
  const C = await P.read(admin, CUS, {}) || {};
  if (C[email]) return { ok: true, code: C[email].code, kept: true };
  C[email] = { code, at: new Date().toISOString(), how: how || 'link' }; await P.write(admin, CUS, C);
  return { ok: true, code };
}

/* A subscription payment arrived (Stripe webhook). id = invoice / checkout session id (one commission per payment). */
async function onPayment(admin, p) {
  const email = normEmail(p.email), cents = Math.round(Number(p.amountCents) || 0);
  if (!p.id || !email || cents <= 0) return { ok: false, skipped: 'no payment' };
  const I = await idx(admin);
  let code = p.promoId ? (Object.values(I.affs).find(a => a.promoId === p.promoId) || {}).code : null;
  if (!code && p.promoCode) code = normCode(p.promoCode);
  if (code) await attribute(admin, email, code, 'code');
  const C = await P.read(admin, CUS, {}) || {}, owner = C[email] && C[email].code;
  const a = owner && I.affs[owner];
  if (!a || a.status !== 'approved' || a.email === email) return { ok: true, skipped: 'no affiliate' };
  const L = await P.read(admin, COM, { list: [] }) || { list: [] }; L.list = L.list || [];
  if (L.list.some(x => x.id === p.id)) return { ok: true, skipped: 'already counted' };
  const at = p.at ? new Date(p.at) : new Date();
  const row = { id: p.id, code: owner, customer: email, amount: cents / 100, commission: Math.round(cents * RATE) / 100, currency: String(p.currency || 'eur').toUpperCase(),
    at: at.toISOString(), payable: new Date(at.getTime() + HOLD_DAYS * 864e5).toISOString(), kind: p.kind || 'payment' };
  L.list.push(row); await P.write(admin, COM, L);
  return { ok: true, row };
}

function statusOf(r, now) { return r.paidOut ? 'paid' : (Date.parse(r.payable) <= (now || Date.now()) ? 'payable' : 'pending'); }
const mask = e => { const [u, d] = String(e).split('@'); return (u || '').slice(0, 2) + '•••@' + (d || ''); };

/* Everything an affiliate sees on their page. */
async function summary(admin, email) {
  const I = await idx(admin), a = byEmail(I, email);
  if (!a) return { ok: true, aff: null };
  const out = { ok: true, aff: { code: a.code, name: a.name, status: a.status, applied: a.applied, approved: a.approved || null, payout: a.payout || null } , rules: { rate: RATE * 100, holdDays: HOLD_DAYS, minPayout: MIN_PAYOUT, discount: DISCOUNT_PCT } };
  if (a.status !== 'approved') return out;
  const [C, L, K] = await Promise.all([P.read(admin, CUS, {}), P.read(admin, COM, { list: [] }), P.read(admin, CLK, {})]);
  const mine = ((L && L.list) || []).filter(r => r.code === a.code).sort((x, y) => y.at.localeCompare(x.at)), now = Date.now();
  const sum = s => Math.round(mine.filter(r => statusOf(r, now) === s).reduce((t, r) => t + r.commission, 0) * 100) / 100;
  const custs = Object.keys(C || {}).filter(e => C[e].code === a.code), paying = new Set(mine.map(r => r.customer));
  out.aff.link = linkOf(a.code);
  out.stats = { clicks: (K && K[a.code] && K[a.code].n) || 0, signups: custs.length, paying: paying.size, pending: sum('pending'), payable: sum('payable'), paid: sum('paid'),
    total: Math.round(mine.reduce((t, r) => t + r.commission, 0) * 100) / 100, currency: (mine[0] && mine[0].currency) || 'EUR' };
  out.list = mine.slice(0, 200).map(r => ({ at: r.at, customer: mask(r.customer), amount: r.amount, commission: r.commission, currency: r.currency, status: statusOf(r, now), payable: r.payable, paidOut: r.paidOut || null }));
  return out;
}
async function setPayout(admin, email, b) {
  const I = await idx(admin), a = byEmail(I, email);
  if (!a || a.status !== 'approved') return { ok: false, error: 'NOT_AFFILIATE' };
  const method = b.method === 'paypal' ? 'paypal' : 'bank';
  a.payout = { method, holder: clean(b.holder, 80), iban: method === 'bank' ? clean(b.iban, 40).toUpperCase() : '', bic: method === 'bank' ? clean(b.bic, 15).toUpperCase() : '', paypal: method === 'paypal' ? normEmail(b.paypal).slice(0, 120) : '', at: new Date().toISOString() };
  await P.write(admin, IDX, I); return { ok: true, payout: a.payout };
}

/* Staff: every affiliate with what is owed; markPaid pays out everything payable for one affiliate. */
async function staffList(admin) {
  const [I, L, C, K] = await Promise.all([idx(admin), P.read(admin, COM, { list: [] }), P.read(admin, CUS, {}), P.read(admin, CLK, {})]), now = Date.now();
  const rows = Object.values(I.affs).map(a => { const mine = ((L && L.list) || []).filter(r => r.code === a.code), s = st => Math.round(mine.filter(r => statusOf(r, now) === st).reduce((t, r) => t + r.commission, 0) * 100) / 100;
    return { code: a.code, name: a.name, email: a.email, country: a.country, channel: a.channel, audience: a.audience, message: a.message, status: a.status, applied: a.applied, approved: a.approved || null, promoError: a.promoError || null,
      payout: a.payout || null, clicks: (K && K[a.code] && K[a.code].n) || 0, signups: Object.keys(C || {}).filter(e => C[e].code === a.code).length, pending: s('pending'), payable: s('payable'), paid: s('paid') }; });
  rows.sort((x, y) => (x.status === 'pending' ? 0 : 1) - (y.status === 'pending' ? 0 : 1) || String(y.applied).localeCompare(String(x.applied)));
  return { ok: true, affiliates: rows, minPayout: MIN_PAYOUT };
}
async function markPaid(admin, code, by) {
  code = normCode(code); const L = await P.read(admin, COM, { list: [] }) || { list: [] }, now = Date.now(), t = new Date().toISOString(); let total = 0, n = 0;
  (L.list || []).forEach(r => { if (r.code === code && statusOf(r, now) === 'payable') { r.paidOut = t; r.paidBy = by || null; total += r.commission; n++; } });
  if (!n) return { ok: false, error: 'NOTHING_PAYABLE' };
  await P.write(admin, COM, L); return { ok: true, paid: Math.round(total * 100) / 100, n };
}

module.exports = { RATE, HOLD_DAYS, MIN_PAYOUT, DISCOUNT_PCT, normCode, linkOf, apply, approve, reject, click, attribute, onPayment, summary, setPayout, staffList, markPaid, statusOf, byEmail, idx };
