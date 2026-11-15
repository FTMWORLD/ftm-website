/* Customer notices in the FTM email design, used by the engine (/api/v1/push event copying_resumed)
   and by FTM staff (/api/v1/community action staff_notice). One email per account per 12 hours. */
const P = require('./push');
const Mail = require('./mail');
const Tpl = require('./passwordEmail');

async function copyingResumed(admin, uid, o) {
  o = o || {};
  const acct = String(o.account || '').replace(/[^\w-]/g, '').slice(0, 24), mid = P.midOf(uid), key = 'mail/resumed-' + mid + '-' + (acct || 'all') + '.json';
  const prev = await P.read(admin, key, {}); if (prev.at && Date.now() - Date.parse(prev.at) < 12 * 3600e3) return { duplicate: true };
  const full = (await admin.auth.admin.getUserById(uid)).data; const u = full && full.user; if (!u || !u.email) return { error: 'NO_USER' };
  const meta = u.user_metadata || {}, since = o.since && !isNaN(Date.parse(o.since)) ? o.since : '';
  let via = null; try { via = await Mail.sendMail({ to: u.email, subject: 'FTM: copying is running again, everything is restored', html: Tpl.html('copying_resumed', { name: meta.full_name || meta.name || '', account: acct, since, cause: o.cause === 'broker_maintenance' ? 'broker_maintenance' : '' }) }); } catch (e) { console.error('resumed mail', e.message); }
  let devices = 0; try { devices = await P.send(admin, { uid, kind: 'trades', tag: 'resumed', url: '/?open=perf', title: 'Copying is running again', body: 'Everything is restored. Your figures and leaderboard place are unchanged.' }); } catch (e) { console.error('resumed push', e.message); }
  if (via) await P.write(admin, key, { at: new Date().toISOString(), via, account: acct });
  return { via, devices };
}

async function custom(admin, u, o) {
  const meta = u.user_metadata || {};
  let via = null; try { via = await Mail.sendMail({ to: u.email, subject: o.subject, html: Tpl.html('notice', { name: meta.full_name || meta.name || '', title: o.title, text: o.text, button: o.button, link: o.link }) }); } catch (e) { console.error('notice mail', e.message); }
  return { via };
}

module.exports = { copyingResumed, custom };
