/* FTM finance (owner 25 Nov 2026): everything FTM pays for, in one place in the staff console.
   Stored in staff/finance.json. Owners read and change it; other staff never see it.
   Each item: subscription, salary, advertising or other cost, its priority group, amount, billing cycle and renewal date.
   Amounts nobody has given us yet stay empty (null) until the owner fills them in: never guessed. */
const P = require('./push');
const FILE = 'staff/finance.json';
const GROUPS = ['mandatory', 'important', 'optional'];
const KINDS = ['sub', 'salary', 'ads', 'other'];
const CYCLES = ['month', 'year', 'week', 'day', 'once'];
const STATUS = ['active', 'planned', 'paused', 'ended'];
const CURS = ['EUR', 'USD', 'GBP', 'NGN'];

const SEED = [
  { name: 'Contabo', what: 'Server that runs FTM MACHINE (the engine)', group: 'mandatory', kind: 'sub', cycle: 'month', status: 'active', note: 'Paid with PayPal; one payment failed before, so check the card.' },
  { name: 'Vercel', what: 'Hosting of ftmwealthnation.com and its daily jobs', group: 'mandatory', kind: 'sub', cycle: 'month', status: 'active' },
  { name: 'Supabase', what: 'Logins and the customer database', group: 'mandatory', kind: 'sub', cycle: 'month', status: 'active' },
  { name: 'Domain ftmwealthnation.com', what: 'The website address and its email (Cloudflare)', group: 'mandatory', kind: 'sub', cycle: 'year', status: 'active' },
  { name: 'Anthropic (Claude)', what: 'Ask here assistant on the site, and Claude for the work on FTM', group: 'mandatory', kind: 'sub', cycle: 'month', status: 'active' },
  { name: 'Metricool', what: 'Posts every video to Instagram, Facebook, TikTok, YouTube and LinkedIn', group: 'important', kind: 'sub', cycle: 'month', status: 'active' },
  { name: 'Runway', what: 'Turns our pictures into moving video for ads and posts', group: 'important', kind: 'sub', cycle: 'month', status: 'active' },
  { name: 'ElevenLabs', what: 'Human-sounding voices for every video', group: 'important', kind: 'sub', amount: 22, cur: 'USD', cycle: 'month', status: 'planned', note: 'Creator plan: 11 the first month, then 22 a month.' },
  { name: 'ChatGPT', what: 'Realistic pictures for the 9:30 and 1 p.m. videos', group: 'important', kind: 'sub', cycle: 'month', status: 'active' },
  { name: 'Meta ads: 7-day test', what: 'First paid ad on Instagram and Facebook', group: 'important', kind: 'ads', amount: 10, cur: 'EUR', cycle: 'day', status: 'planned', note: 'Plan: 10 a day for 7 days = 70. Range 10 to 20 a day (70 to 140 for the week, about 300 to 600 a month if it brings sign-ups).' },
  { name: 'Trustpilot paid plan', what: 'Shows our reviews on the website automatically', group: 'optional', kind: 'sub', cycle: 'month', status: 'planned', note: 'Decide when we have about 20 reviews.' },
  { name: 'X (Twitter) posting', what: 'Posting on X through Metricool or our own connection', group: 'optional', kind: 'sub', amount: 10, cur: 'EUR', cycle: 'month', status: 'planned', note: 'Metricool add-on about 10 a month, or our own connection about 1 to 3 a month.' }
];

function id() { return Math.random().toString(36).slice(2, 10); }
function clean(x) {
  const s = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
  const amt = x.amount === '' || x.amount == null ? null : +x.amount;
  const d = s(x.renews, 10);
  return {
    id: /^[a-z0-9]{4,12}$/.test(String(x.id || '')) ? String(x.id) : id(),
    name: s(x.name, 80) || 'Unnamed', what: s(x.what, 160), note: s(x.note, 400),
    group: GROUPS.indexOf(x.group) !== -1 ? x.group : 'important', kind: KINDS.indexOf(x.kind) !== -1 ? x.kind : 'sub',
    amount: amt != null && isFinite(amt) && amt >= 0 ? Math.round(amt * 100) / 100 : null,
    cur: CURS.indexOf(String(x.cur || '').toUpperCase()) !== -1 ? String(x.cur).toUpperCase() : 'EUR',
    cycle: CYCLES.indexOf(x.cycle) !== -1 ? x.cycle : 'month', status: STATUS.indexOf(x.status) !== -1 ? x.status : 'active',
    renews: /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null
  };
}
/* What one item costs per month (a yearly bill is spread over 12 months; one-off costs are not monthly). */
function monthly(x) {
  if (x.amount == null || x.status === 'ended' || x.status === 'paused') return 0;
  return { month: 1, year: 1 / 12, week: 52 / 12, day: 365 / 12, once: 0 }[x.cycle] * x.amount;
}
async function get(admin) {
  const f = await P.read(admin, FILE, null);
  if (f && Array.isArray(f.items)) return f;
  return { items: SEED.map(clean), updated: null, by: null };
}
async function save(admin, items, by) {
  if (!Array.isArray(items) || items.length > 500) return { ok: false, error: 'BAD_ITEMS' };
  const out = { items: items.map(clean), updated: new Date().toISOString(), by: String(by || '') };
  await P.write(admin, FILE, out);
  return Object.assign({ ok: true }, out);
}
module.exports = { get, save, clean, monthly, SEED, GROUPS, KINDS, CYCLES, STATUS, CURS };
