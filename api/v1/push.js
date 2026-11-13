/* /api/v1/push: phone notifications.
   GET  ?key=1                                   the public key the browser needs to subscribe
   POST {action:'subscribe', sub, lang}          (member token) save this device
   POST {action:'unsubscribe', endpoint}         (member token) remove this device
   POST {action:'status', endpoint?}             (member token) my settings, device count, whether this device is on
   POST {action:'prefs', prefs:{messages,follows,social,trades,leaderboard}}   (member token)
   POST {action:'test'}                          (member token) send a test notification to my devices
   POST {event, user_id|email, ...}              FTM ENGINE (header x-ftm-engine-key = ENGINE_PUSH_SECRET):
        event 'trade_profit'   {symbol, profit, currency, account_number?}
        event 'leaderboard_up' {rank, previous_rank?, period?}
        event 'account_connected' {account_number?} */
const { createClient } = require('@supabase/supabase-js');
const P = require('../_lib/push');

async function userFromToken(admin, req) {
  const h = String(req.headers.authorization || ''); const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!tok) return null; const r = await admin.auth.getUser(tok); return (r && r.data && r.data.user) || null;
}
async function userByEmail(admin, email) {
  email = String(email || '').toLowerCase();
  for (let page = 1; page <= 20; page++) { const r = await admin.auth.admin.listUsers({ page, perPage: 1000 }); if (r.error) throw new Error(r.error.message);
    const hit = (r.data.users || []).find(u => String(u.email || '').toLowerCase() === email); if (hit) return hit; if ((r.data.users || []).length < 1000) break; }
  return null;
}
function num(v) { const n = parseFloat(v); return isFinite(n) ? n : null; }

module.exports = async function handler(req, res) {
  if (req.method === 'GET') { res.setHeader('Cache-Control', 'public, max-age=3600'); return res.status(200).json({ ok: true, key: P.vapid().pub }); }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  let body = req.body || {}; if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  try {
    if (body.event) {
      const secret = process.env.ENGINE_PUSH_SECRET || '';
      if (secret.length < 16 || req.headers['x-ftm-engine-key'] !== secret) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
      const user = body.user_id ? { id: String(body.user_id) } : await userByEmail(admin, body.email);
      if (!user) return res.status(404).json({ ok: false, error: 'NO_USER' });
      let n = 0;
      if (body.event === 'trade_profit') {
        const p = num(body.profit); if (p == null || p <= 0) return res.status(400).json({ ok: false, error: 'NOT_A_PROFIT' });
        const money = '+' + p.toFixed(2) + (body.currency ? ' ' + String(body.currency).replace(/[^A-Z]/g, '').slice(0, 3) : '');
        n = await P.send(admin, { uid: user.id, kind: 'trades', tag: 'trade', url: '/?open=perf', title: 'Trade closed in profit', body: '{} closed with {}', args: { body: [String(body.symbol || '').replace(/[^\w.]/g, '').slice(0, 12) || 'FTM', money] } });
      } else if (body.event === 'leaderboard_up') {
        const r = parseInt(body.rank, 10), pr = parseInt(body.previous_rank, 10); if (!(r > 0)) return res.status(400).json({ ok: false, error: 'BAD_RANK' });
        n = await P.send(admin, { uid: user.id, kind: 'leaderboard', tag: 'board', url: '/?open=board', title: 'You climbed on the leaderboard', body: pr > r ? 'You are now #{} (was #{}).' : 'You are now #{}.', args: { body: pr > r ? [r, pr] : [r] } });
      } else if (body.event === 'account_connected') {
        n = await P.send(admin, { uid: user.id, kind: 'trades', tag: 'connected', url: '/', title: 'Auto Trading connected', body: 'FTM MACHINE now trades for you from the next signal.' });
      } else return res.status(400).json({ ok: false, error: 'UNKNOWN_EVENT' });
      return res.status(200).json({ ok: true, devices: n });
    }
    const user = await userFromToken(admin, req); if (!user) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
    const mid = P.midOf(user.id), path = 'push/' + mid + '.json', box = await P.getBox(admin, mid), action = String(body.action || '');
    if (action === 'subscribe') {
      const s = body.sub || {}; if (!/^https:\/\//.test(String(s.endpoint || '')) || !s.keys || !s.keys.p256dh || !s.keys.auth) return res.status(400).json({ ok: false, error: 'BAD_SUBSCRIPTION' });
      box.subs = box.subs.filter(x => x.endpoint !== s.endpoint);
      box.subs.push({ endpoint: String(s.endpoint).slice(0, 800), keys: { p256dh: String(s.keys.p256dh).slice(0, 200), auth: String(s.keys.auth).slice(0, 100) }, lang: String(body.lang || 'en').slice(0, 6), ua: String(req.headers['user-agent'] || '').slice(0, 120), at: new Date().toISOString() });
      if (box.subs.length > 10) box.subs = box.subs.slice(-10);
      await P.write(admin, path, box); return res.status(200).json({ ok: true, devices: box.subs.length });
    }
    if (action === 'unsubscribe') { box.subs = box.subs.filter(x => x.endpoint !== String(body.endpoint || '')); await P.write(admin, path, box); return res.status(200).json({ ok: true, devices: box.subs.length }); }
    if (action === 'prefs') { const pr = body.prefs || {}; P.KINDS.forEach(k => { if (typeof pr[k] === 'boolean') box.prefs[k] = pr[k]; }); await P.write(admin, path, box); return res.status(200).json({ ok: true, prefs: box.prefs }); }
    if (action === 'status') return res.status(200).json({ ok: true, prefs: box.prefs, devices: box.subs.length, this_device: !!box.subs.find(x => x.endpoint === String(body.endpoint || '')) });
    if (action === 'test') { const n = await P.send(admin, { mid, tag: 'test', url: '/', title: 'FTM notifications are on', body: 'You will get messages, new followers, trades closed in profit and leaderboard moves here.' }); return res.status(200).json({ ok: true, devices: n }); }
    return res.status(400).json({ ok: false, error: 'UNKNOWN_ACTION' });
  } catch (e) { console.error('push', e.message); return res.status(500).json({ ok: false, error: 'PUSH_FAILED' }); }
};
