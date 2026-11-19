// Daily closing prices for the "Compare with" line (markets FTM does not trade). Cached 6 hours.
const LIST = {
  XAGUSD: { y: 'SI=F', s: 'xagusd' },
  US500: { y: '^GSPC', s: '^spx' },
  NVDA: { y: 'NVDA', s: 'nvda.us' },
  AAPL: { y: 'AAPL', s: 'aapl.us' },
  MSFT: { y: 'MSFT', s: 'msft.us' },
  AMZN: { y: 'AMZN', s: 'amzn.us' },
  GOOGL: { y: 'GOOGL', s: 'googl.us' }
};
const memo = {};
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; price-check)', Accept: '*/*' };
const clean = rows => rows.filter(k => isFinite(k.t) && k.c > 0 && k.o > 0).sort((a, b) => a.t - b.t);
const SOURCES = [
  async m => {
    let last;
    for (const host of ['query1', 'query2']) {
      try {
        const r = await fetch('https://' + host + '.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(m.y) + '?range=5y&interval=1d', { headers: UA });
        const j = await r.json(); const x = j && j.chart && j.chart.result && j.chart.result[0];
        const ts = (x && x.timestamp) || [], q = (x && x.indicators && x.indicators.quote && x.indicators.quote[0]) || {};
        const rows = clean(ts.map((t, i) => ({ t: t * 1000, o: +(q.open || [])[i], c: +(q.close || [])[i] })));
        if (rows.length > 1) return rows;
        last = new Error('yahoo empty');
      } catch (e) { last = e; }
    }
    throw last || new Error('yahoo');
  },
  async m => {
    const r = await fetch('https://stooq.com/q/d/l/?s=' + encodeURIComponent(m.s) + '&i=d', { headers: UA });
    const txt = await r.text(); const lines = String(txt || '').trim().split(/\r?\n/);
    if (!/^Date,Open/i.test(lines[0] || '')) throw new Error('stooq');
    const rows = clean(lines.slice(1).map(l => { const p = l.split(','); return { t: Date.parse(p[0] + 'T00:00:00Z'), o: +p[1], c: +p[4] }; }));
    if (rows.length > 1) return rows.slice(-1300);
    throw new Error('stooq empty');
  }
];
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  const sym = String((req.query && req.query.symbol) || '').toUpperCase(), m = LIST[sym];
  if (!m) return res.status(404).json({ ok: false, error: 'UNKNOWN_SYMBOL' });
  const hit = memo[sym];
  if (hit && Date.now() - hit.at < 6 * 3600e3) { res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400'); return res.status(200).json(hit.body); }
  for (const src of SOURCES) {
    try {
      const candles = await src(m);
      const body = { ok: true, symbol: sym, tf: '1d', candles };
      memo[sym] = { at: Date.now(), body };
      res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
      return res.status(200).json(body);
    } catch (e) { /* next source */ }
  }
  if (hit) return res.status(200).json(hit.body);
  return res.status(503).json({ ok: false, error: 'PRICES_UNAVAILABLE' });
};
