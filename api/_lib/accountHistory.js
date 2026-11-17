/* One account's full engine history, read as its owner, through ftm-calc.js (the dashboards' own calculation):
   used by the monthly Letter (master figures) and by the staff trade export. Read-only. */
const Engine = require('./engineClient');
const Calc = require('../../ftm-calc.js');

function within(ms, p) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms))]); }
async function eng(u, path, ms) {
  const r = await within(ms || 12000, Engine.callEngine(path, { authSubject: u.id, authEmail: u.email, timeoutMs: (ms || 12000) - 500 }));
  if (!r.ok) throw new Error('engine ' + path.split('?')[0].replace(/[0-9a-f-]{20,}/g, ':id') + ': ' + ((r.body && r.body.error) || r.status));
  return r.body;
}
async function accounts(u) { const acc = await eng(u, '/api/v1/customer/accounts'); return { raw: acc.accounts || [], mapped: (acc.accounts || []).map(Calc.mapAccount) }; }
async function load(u, m) {
  const id = encodeURIComponent(m.accountId);
  const j = await eng(u, '/api/v1/customer/accounts/' + id + '/stats?limit=2000', 20000);
  if (j && j.pending) throw new Error('STATS_PENDING');
  const key = r => String(r.ticket || r.deal || r.id || '') + '|' + (r.time || r.closed_at || '') + '|' + (r.type || '') + '|' + (r.net != null ? r.net : r.profit);
  for (let pg = 0; pg < 25 && j.history && +j.history_total > j.history.length; pg++) {
    const k = await eng(u, '/api/v1/customer/accounts/' + id + '/stats?limit=2000&offset=' + j.history.length, 20000);
    const seen = new Set(j.history.map(key)), add = (k.history || []).filter(r => !seen.has(key(r))); if (!add.length) break; j.history = j.history.concat(add);
  }
  const rawHistory = (j.history || []).slice();
  const es = Calc.mapStats(j, m.accountId);
  let closed = [], rawTrades = [];
  for (let off = 0, pg = 0; pg < 200; pg++) {
    const h = await eng(u, '/api/v1/customer/accounts/' + id + '/history?limit=200&offset=' + off, 15000);
    rawTrades = rawTrades.concat(h.trades || []); closed = closed.concat((h.trades || []).map(Calc.mapExecution)); const p = h.page || {};
    if (p.offset == null || p.limit == null || p.total == null || p.offset + p.limit >= p.total) break; off = p.offset + p.limit;
  }
  const data = { accounts: [m], account: { currency: m.currency || null, deposits: es.deposits != null ? es.deposits : (m.deposits || 0), withdrawals: es.withdrawals != null ? es.withdrawals : (m.withdrawals || 0) }, closed, open: [] };
  const M = Calc.build({ data, live: m, es, flows: es.flows });
  return { es, closed, rawTrades, rawHistory, M };
}
module.exports = { eng, accounts, load };
