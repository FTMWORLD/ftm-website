/* GET /api/v1/health — no customer identity involved. Proxies the engine's
   own health endpoint through the Cloudflare Access tunnel. This is the
   endpoint that proves the whole transport chain end to end: this Vercel
   function, the bearer token, the Access headers, the tunnel, and the
   engine itself — with nothing customer-scoped at stake if something's
   wrong. Get this green before anything else on this list. */

const { callEngine } = require('../_lib/engineClient');

module.exports = async function handler(req, res) {
  try {
    const result = await callEngine('/api/v1/health', { method: 'GET' });
    res.status(result.status).json(result.body);
  } catch (e) {
    // Network/DNS/tunnel failure — the engine never responded at all.
    console.error('FTM health check failed to reach engine:', e.message);
    res.status(502).json({ ok: false, error: 'ENGINE_UNREACHABLE', message: 'Could not reach the FTM engine.' });
  }
};
