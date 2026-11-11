// Exchange rates for showing figures in another currency. Base USD, refreshed hourly.
let memo = null;
const SOURCES = [
  async () => { const r = await fetch('https://open.er-api.com/v6/latest/USD'); const j = await r.json(); if (j && j.result === 'success' && j.rates) return { rates: j.rates, time: j.time_last_update_utc || null }; throw new Error('er-api'); },
  async () => { const r = await fetch('https://api.frankfurter.app/latest?from=USD'); const j = await r.json(); if (j && j.rates) { j.rates.USD = 1; return { rates: j.rates, time: j.date || null }; } throw new Error('frankfurter'); }
];
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (memo && Date.now() - memo.at < 3600e3) { res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400'); return res.status(200).json(memo.body); }
  for (const src of SOURCES) {
    try {
      const x = await src(); const rates = {};
      Object.keys(x.rates).forEach(k => { const v = +x.rates[k]; if (/^[A-Z]{3}$/.test(k) && v > 0 && isFinite(v)) rates[k] = v; });
      if (!rates.EUR) continue;
      const body = { ok: true, base: 'USD', time: x.time, rates };
      memo = { at: Date.now(), body };
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json(body);
    } catch (e) { /* next source */ }
  }
  if (memo) return res.status(200).json(memo.body);
  return res.status(503).json({ ok: false, error: 'RATES_UNAVAILABLE' });
};
