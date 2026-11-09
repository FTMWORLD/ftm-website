/* POST /api/v1/client-log: records why a customer action stopped in the browser (no personal data),
   so a failed connect can be traced in the server logs. */
const recent = new Map();
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const now = Date.now(), hits = (recent.get(ip) || []).filter(t => now - t < 60000);
  if (hits.length >= 20) return res.status(204).end();
  hits.push(now); recent.set(ip, hits);
  const clean = v => String(v == null ? '' : v).replace(/[^\w:.\- ]/g, '').slice(0, 60);
  console.log('client-log', JSON.stringify({ ev: clean(b.ev), reason: clean(b.reason), live: !!b.live, at: clean(b.at), ua: clean(String(req.headers['user-agent'] || '').slice(0, 60)) }));
  return res.status(204).end();
};
