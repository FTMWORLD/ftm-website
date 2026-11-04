/* PUT /api/v1/customer/accounts/{accountId}/risk_tier — change the risk profile.
   Body {risk_tier, growth_acknowledged}. Growth without the flag returns
   409 GROWTH_ACKNOWLEDGEMENT_REQUIRED with acknowledgement_text. */

const { verifyCustomer, callEngine } = require('../../../../_lib/engineClient');

module.exports = async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  const user = await verifyCustomer(req).catch(() => null);
  if (!user) return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });
  const { accountId } = req.query;
  const b = req.body || {};
  const body = { risk_tier: String(b.risk_tier || '') };
  if (b.growth_acknowledged === true) body.growth_acknowledged = true;
  try {
    const r = await callEngine('/api/v1/customer/accounts/' + encodeURIComponent(accountId) + '/risk_tier', { method: 'PUT', body, authSubject: user.id, authEmail: user.email });
    if (r.ok) return res.status(r.status).json(r.body);
    const out = { ok: false, error: (r.body && r.body.error) || 'INTERNAL_SERVER_ERROR' };
    if (r.body && r.body.acknowledgement_text) out.acknowledgement_text = r.body.acknowledgement_text;
    return res.status(r.status || 500).json(out);
  } catch (e) {
    console.error('FTM risk tier: engine unreachable:', e.message);
    return res.status(502).json({ ok: false, error: 'ENGINE_UNREACHABLE' });
  }
};
