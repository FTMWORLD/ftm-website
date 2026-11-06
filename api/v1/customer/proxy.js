/* /api/v1/customer/proxy (reached through the vercel.json rewrite of /api/v1/customer/<chat|investment|investments|leaderboard>/...) — pass-through to the FTM engine for the
   support chat, the investment page and the leaderboard (engine contract 2026-11-06.2, docs/engine-contract.json).
   Only the routes listed in ALLOW are forwarded; everything else is 404. The customer is always the verified
   Supabase user, never anything the request claims. Files that exist (investments.js) are served before the rewrite. */

const { verifyCustomer, callEngine } = require('../../_lib/engineClient');

const ID = '[A-Za-z0-9_-]{1,64}';
const ALLOW = [
  ['GET', '^chat$'],
  ['GET', '^chat/messages$'],
  ['POST', '^chat/messages$'],
  ['POST', '^chat/read$'],
  ['GET', '^investment$'],
  ['GET', '^investments$'],
  ['POST', '^investments/' + ID + '/withdraw$'],
  ['POST', '^investment/contracts$'],
  ['POST', '^investment/deposits$'],
  ['POST', '^investment/withdrawals$'],
  ['POST', '^investment/refund$'],
  ['DELETE', '^investment/requests/' + ID + '$'],
  ['GET', '^investment/ledger$'],
  ['GET', '^investment/statements$'],
  ['GET', '^investment/statements/\\d{4}-\\d{2}$'],
  ['GET', '^leaderboard$'],
  ['GET', '^leaderboard/profile$'],
  ['PUT', '^leaderboard/profile$']
].map(([m, re]) => [m, new RegExp(re)]);

const QUERY_KEYS = ['after', 'before', 'limit', 'board'];

module.exports = async function handler(req, res) {
  // vercel.json rewrites /api/v1/customer/<chat|investment|investments|leaderboard>/... here with ?__p=<sub-path>
  const sub = String(req.query.__p || '').replace(/\/+$/, '');
  const method = req.method;
  if (!ALLOW.some(([m, re]) => m === method && re.test(sub))) {
    return res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'This page does not exist.' });
  }
  const user = await verifyCustomer(req).catch(() => null);
  if (!user) return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED', message: 'Your session has expired. Log in again and retry.' });

  const q = new URLSearchParams();
  QUERY_KEYS.forEach(k => { const v = req.query[k]; if (typeof v === 'string' && v.length <= 64) q.set(k, v); });
  const path = '/api/v1/customer/' + sub + (q.toString() ? '?' + q.toString() : '');
  const body = (method === 'POST' || method === 'PUT') ? (req.body && typeof req.body === 'object' ? req.body : {}) : null;

  try {
    const r = await callEngine(path, { method, body, authSubject: user.id, authEmail: user.email });
    res.setHeader('cache-control', 'no-store');
    if (r.ok) return res.status(r.status).json(r.body);
    const b = r.body || {};
    const out = Object.assign({}, b, { ok: false, error: b.error || 'INTERNAL_SERVER_ERROR' });
    if (typeof out.message === 'string') out.message = out.message.slice(0, 300);
    return res.status(r.status || 500).json(out);
  } catch (e) {
    console.error('FTM customer proxy: engine unreachable for', method, sub, e.message);
    return res.status(502).json({ ok: false, error: 'ENGINE_UNREACHABLE', message: 'Could not reach FTM. Try again shortly.' });
  }
};
