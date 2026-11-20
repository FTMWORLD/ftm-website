/* Free sign-up pop-up (owner 20 Nov 2026): shown once per visitor, never again to an internet address (IP) that already saw it,
   signed up or logged in. IPs are stored only as a keyed hash (never the address itself) in nudge/ips.json. */
const crypto = require('crypto');
const P = require('./push');
const KEY = 'nudge/ips.json', MAX = 60000;
function ipOf(req) { return String((req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || '').split(',')[0].trim() || ''; }
function hashOf(ip) { return crypto.createHmac('sha256', String(process.env.SUPABASE_SERVICE_ROLE_KEY || 'ftm')).update('nudge|' + ip).digest('hex').slice(0, 24); }
async function seen(admin, ip) { if (!ip) return true; const d = await P.read(admin, KEY, { h: {} }); return !!(d.h || {})[hashOf(ip)]; }
async function mark(admin, ip, kind) {
  if (!ip) return; const d = await P.read(admin, KEY, { h: {} }); d.h = d.h || {}; const k = hashOf(ip), old = d.h[k];
  if (old && (old[0] === 'customer' || old[0] === kind)) return; // never downgrade a customer, never rewrite the same mark
  d.h[k] = [kind, Date.now()];
  const keys = Object.keys(d.h); if (keys.length > MAX) keys.sort((a, b) => d.h[a][1] - d.h[b][1]).slice(0, keys.length - MAX).forEach(x => { delete d.h[x]; });
  await P.write(admin, KEY, d);
}
module.exports = { ipOf, hashOf, seen, mark };
