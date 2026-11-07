/* POST /api/v1/customer/welcome — called by the site after a paying customer is logged in. The first time,
   it adds them to the Brevo "Customers" list, which starts Brevo's "Welcome aboard" email. So that email
   arrives after the customer has created their password and logged in, not at payment. Sent once per
   customer (flag in Supabase app_metadata, which the customer cannot change). */

const { createClient } = require('@supabase/supabase-js');
const { verifyCustomer } = require('../../_lib/engineClient');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  const user = await verifyCustomer(req).catch(() => null);
  if (!user) return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });
  if (user.app_metadata && user.app_metadata.welcome_sent) return res.status(200).json({ ok: true, sent: false });
  try {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const p = await admin.from('profiles').select('products').eq('id', user.id).maybeSingle();
    const products = (p.data && p.data.products) || [];
    if (!products.length) return res.status(200).json({ ok: true, sent: false });
    const r = await require('../../stripe/webhook.js').addToCustomerList(user.email);
    if (r !== 'added') return res.status(200).json({ ok: true, sent: false, brevo: r });
    await admin.auth.admin.updateUserById(user.id, { app_metadata: Object.assign({}, user.app_metadata || {}, { welcome_sent: new Date().toISOString() }) });
    return res.status(200).json({ ok: true, sent: true });
  } catch (e) {
    console.error('welcome: failed for', user.email, e.message);
    return res.status(200).json({ ok: true, sent: false });
  }
};
