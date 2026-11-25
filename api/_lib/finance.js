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

const SEED_V = 2;
// Ranges: amount = what FTM pays now (or the lowest), max = what it costs when FTM grows (about 1,000 members).
// Sources: the FTM budget PDF (FTM FINANCE session, Nov 2026), the owner (Contabo about 33 now), official price pages (25 Nov 2026).
const SEED = [
  { name: 'Vercel Pro', what: 'Website and customer login hosting, daily jobs', group: 'mandatory', kind: 'sub', amount: 20, max: 50, cur: 'USD', cycle: 'month', status: 'active', note: 'Pro is 20 per seat; more traffic is billed on top, so up to about 50 when FTM grows. If unpaid: the website and logins go offline.' },
  { name: 'Domain ftmwealthnation.com', what: 'Website address and FTM email addresses (Cloudflare)', group: 'mandatory', kind: 'sub', amount: 10.5, max: 20, cur: 'EUR', cycle: 'year', status: 'active', note: 'Cloudflare renews .com at cost (about 10.50 a year); budget allowed 20. If unpaid: website and emails unreachable.' },
  { name: 'Supabase Pro', what: 'Customer logins, database and files', group: 'mandatory', kind: 'sub', amount: 25, max: 75, cur: 'USD', cycle: 'month', status: 'active', note: 'Pro is 25; more members need more compute and storage (about 75 at 1,000 members). If unpaid: logins and accounts pause.' },
  { name: 'Contabo server', what: 'Runs FTM MACHINE (the engine) and the copy accounts', group: 'mandatory', kind: 'sub', amount: 33, max: 150, cur: 'EUR', cycle: 'month', status: 'active', note: 'About 33 now. More connected accounts need a bigger server (Cloud VPS or VDS): about 150 a month for 1,000 members. If unpaid: FTM MACHINE stops trading. Paid with PayPal; check the card.' },
  { name: 'Anthropic API (Ask here)', what: 'The Ask here assistant on the website', group: 'mandatory', kind: 'sub', amount: 20, max: 30, cur: 'EUR', cycle: 'month', status: 'active', note: 'Prepaid usage. Part of it can be covered by the API credit that comes with the Claude Max plan.' },
  { name: 'Resend (emails)', what: 'Sends every FTM email: results, logins, letters', group: 'mandatory', kind: 'sub', amount: 0, max: 20, cur: 'USD', cycle: 'month', status: 'active', note: 'Free up to 3,000 emails a month and 100 a day; Pro (20) is needed once the daily result emails pass 100 a day.' },
  { name: 'Claude (Anthropic)', what: 'Claude, who builds and runs the website, videos and posting', group: 'important', kind: 'sub', amount: 100, max: 200, cur: 'USD', cycle: 'month', status: 'active', note: 'Max plan 100 (5x) or 200 (the biggest plan); the budget PDF counts 200.' },
  { name: 'ChatGPT', what: 'Realistic pictures for the 9:30 and 1 p.m. videos', group: 'important', kind: 'sub', amount: 23, max: 100, cur: 'EUR', cycle: 'month', status: 'active', note: 'Plus about 23; the Pro tier is 100 if we need more pictures.' },
  { name: 'Metricool', what: 'Posts every video to Instagram, Facebook, TikTok, YouTube and LinkedIn', group: 'important', kind: 'sub', amount: 20, max: 54, cur: 'EUR', cycle: 'month', status: 'active', note: 'Starter 20 (one brand). Advanced 54 if we add brands. X add-on 10 extra.' },
  { name: 'Runway', what: 'Turns our pictures into moving video for ads and posts', group: 'important', kind: 'sub', amount: 15, max: 35, cur: 'USD', cycle: 'month', status: 'active', note: 'Standard 15, Pro 35. Using it through Claude needs separate developer credits (from about 10).' },
  { name: 'ElevenLabs', what: 'Human-sounding voices for every video', group: 'important', kind: 'sub', amount: 22, max: 99, cur: 'USD', cycle: 'month', status: 'active', note: 'Creator: 11 the first month, then 22. Pro 99 if we make many more videos.' },
  { name: 'FTM Media production', what: 'Videos, pictures and other media work', group: 'important', kind: 'other', amount: 100, max: 200, cur: 'EUR', cycle: 'month', status: 'planned', note: 'From the FTM budget PDF.' },
  { name: 'Prop firm account, company registration and legal', what: 'Prop firm account, company papers and lawyer', group: 'important', kind: 'other', amount: 500, max: 1000, cur: 'EUR', cycle: 'month', status: 'planned', note: 'From the FTM budget PDF ("Other").' },
  { name: 'Media manager', what: 'FTM Media: the person who runs our media', group: 'important', kind: 'salary', amount: 150, max: 150, cur: 'EUR', cycle: 'month', status: 'planned', note: 'From the FTM budget PDF. Set to Active when the first salary is paid.' },
  { name: 'Meta ads', what: 'Paid ads on Instagram and Facebook', group: 'important', kind: 'ads', amount: 10, max: 20, cur: 'EUR', cycle: 'day', status: 'planned', note: 'First test: 10 a day for 7 days (70). A normal small budget is 5 to 20 a day per ad set (about 300 to 600 a month).' },
  { name: 'Stripe and GitHub', what: 'Card payments and the code home', group: 'mandatory', kind: 'other', amount: 0, max: 0, cur: 'EUR', cycle: 'month', status: 'active', note: 'No monthly fee. Stripe takes about 1.5% + 0.25 of each card payment in Europe.' },
  { name: 'Trustpilot paid plan', what: 'Shows our reviews on the website automatically', group: 'optional', kind: 'sub', amount: 99, max: 299, cur: 'USD', cycle: 'month', status: 'planned', note: 'Decide at about 20 reviews. Plans are sold by quote; reported from about 99 a month.' },
  { name: 'X (Twitter) posting', what: 'Posting on X through Metricool', group: 'optional', kind: 'sub', amount: 10, max: 10, cur: 'EUR', cycle: 'month', status: 'planned', note: 'Metricool X add-on 10 a month (needs Starter).' }
];

function id() { return Math.random().toString(36).slice(2, 10); }
function clean(x) {
  const s = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
  const amt = x.amount === '' || x.amount == null ? null : +x.amount, mx = x.max === '' || x.max == null ? null : +x.max;
  const d = s(x.renews, 10);
  return {
    id: /^[a-z0-9]{4,12}$/.test(String(x.id || '')) ? String(x.id) : id(),
    name: s(x.name, 80) || 'Unnamed', what: s(x.what, 160), note: s(x.note, 400),
    group: GROUPS.indexOf(x.group) !== -1 ? x.group : 'important', kind: KINDS.indexOf(x.kind) !== -1 ? x.kind : 'sub',
    amount: amt != null && isFinite(amt) && amt >= 0 ? Math.round(amt * 100) / 100 : null,
    max: mx != null && isFinite(mx) && mx >= 0 ? Math.round(mx * 100) / 100 : null,
    cur: CURS.indexOf(String(x.cur || '').toUpperCase()) !== -1 ? String(x.cur).toUpperCase() : 'EUR',
    cycle: CYCLES.indexOf(x.cycle) !== -1 ? x.cycle : 'month', status: STATUS.indexOf(x.status) !== -1 ? x.status : 'active',
    renews: /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null
  };
}
/* What one item costs per month (a yearly bill is spread over 12 months; one-off costs are not monthly). */
function monthly(x, high) {
  const v = high && x.max != null ? Math.max(x.max, x.amount || 0) : x.amount;
  if (v == null || x.status === 'ended' || x.status === 'paused') return 0;
  return { month: 1, year: 1 / 12, week: 52 / 12, day: 365 / 12, once: 0 }[x.cycle] * v;
}
async function get(admin) {
  const f = await P.read(admin, FILE, null);
  if (f && Array.isArray(f.items) && (f.by || f.seed === SEED_V)) return f;
  return { items: SEED.map(clean), updated: null, by: null, seed: SEED_V };
}
async function save(admin, items, by) {
  if (!Array.isArray(items) || items.length > 500) return { ok: false, error: 'BAD_ITEMS' };
  const out = { items: items.map(clean), updated: new Date().toISOString(), by: String(by || '') };
  await P.write(admin, FILE, out);
  return Object.assign({ ok: true }, out);
}
module.exports = { get, save, clean, monthly, SEED, SEED_V, GROUPS, KINDS, CYCLES, STATUS, CURS };
