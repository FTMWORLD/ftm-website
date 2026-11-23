/* /api/v1/affiliate — FTM affiliate programme (owner 21 Nov 2026; rules in api/_lib/affiliate.js).
   POST {action:'apply', name, email, country, channel, audience, message, agree, lang}   anyone; staff approve later
   POST {action:'click', code}                                                            a visitor opened an affiliate link
   GET  ?code=XXX                                                                         is this code live (no counting)
   POST {action:'me'}                     (logged in)  the member's affiliate page: status, link, code, figures, commissions
   POST {action:'payout', method, holder, iban, bic, paypal}  (logged in, approved)      where to send the money */
const { createClient } = require('@supabase/supabase-js');
const A = require('../_lib/affiliate');

async function findUser(admin, email) {
  for (let page = 1; page <= 20; page++) {
    const r = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (r.error) throw new Error(r.error.message);
    const hit = (r.data.users || []).find(u => String(u.email || '').toLowerCase() === email);
    if (hit) return hit;
    if ((r.data.users || []).length < 1000) break;
  }
  return null;
}
/* Applying also opens a free FTM account (owner 23 Nov 2026), the same way as the free sign-up: a secure
   "create your password" link that logs them straight into their Affiliate page. Someone who already has a
   password just logs in. */
async function freeAccount(admin, email, name) {
  const user = await findUser(admin, email), md = (user && user.user_metadata) || {};
  if (md.password_set) return { existing: true };
  const m = await require('../_lib/passwordEmail').makeLink(admin, email, true, '&open=aff');
  const uid = (user && user.id) || m.userId;
  if (uid && name && !md.full_name) { try { await admin.auth.admin.updateUserById(uid, { user_metadata: Object.assign({}, md, { full_name: name, ftm_src: md.ftm_src || 'affiliate' }) }); } catch (e) { console.error('aff: name not saved', e.message); } }
  return { link: m.link };
}

const hits = new Map();
function limited(req) { const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x', now = Date.now(), h = (hits.get(ip) || []).filter(t => now - t < 3600e3); h.push(now); hits.set(ip, h); return h.length > 8; }
async function userFromToken(admin, req) {
  const h = String(req.headers.authorization || ''); const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!tok) return null; const r = await admin.auth.getUser(tok); return (r && r.data && r.data.user) || null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  let admin; try { admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); } catch (e) { return res.status(503).json({ ok: false, error: 'UNAVAILABLE' }); }
  try {
    if (req.method === 'GET') {
      const code = A.normCode(req.query && req.query.code); if (!code) return res.status(400).json({ ok: false });
      const I = await A.idx(admin), a = I.affs[code]; return res.status(200).json({ ok: true, valid: !!(a && a.status === 'approved') });
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false });
    let b = req.body || {}; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
    const act = String(b.action || '');
    if (act === 'apply') {
      if (limited(req)) return res.status(429).json({ ok: false, error: 'TOO_MANY' });
      const r = await A.apply(admin, b);
      if (r.ok && !r.already && r.aff) {
        let acct = null; try { acct = await freeAccount(admin, r.aff.email, r.aff.name); } catch (e) { console.error('aff free account', e.message); }
        r.account = acct ? (acct.existing ? 'existing' : 'created') : 'failed';
        try { await require('../_lib/affMail').received(r.aff, acct); } catch (e) { console.error('aff mail', e.message); }
      }
      if (r.aff) delete r.aff;
      return res.status(r.ok ? 200 : 400).json(r);
    }
    if (act === 'click') return res.status(200).json(await A.click(admin, b.code));
    const me = await userFromToken(admin, req);
    if (!me) return res.status(401).json({ ok: false, error: 'NOT_LOGGED_IN' });
    if (act === 'me') return res.status(200).json(await A.summary(admin, me.email));
    if (act === 'payout') { const r = await A.setPayout(admin, me.email, b); return res.status(r.ok ? 200 : 400).json(r); }
    return res.status(400).json({ ok: false, error: 'UNKNOWN_ACTION' });
  } catch (e) { console.error('affiliate', e.message); return res.status(500).json({ ok: false, error: 'UNAVAILABLE' }); }
};
