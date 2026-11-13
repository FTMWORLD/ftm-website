/* /api/v1/login-alert: "New sign-in to your FTM account" security emails.
   POST {device, lang} (member token): called by the website after every login / session restore.
     - Known device: nothing happens (last seen is refreshed at most every 6 h).
     - New device, and the member already used FTM on another device: email "Was this you?" (max 3 per hour).
     - The very first device of a member is only remembered.
     - If the member pressed "This wasn't me" after this session started: {signout:true} and the website signs out.
   GET ?notme=<signed link>: signs every device out (all sessions older than now are refused by the website),
     forgets the known devices and emails a link to choose a new password.
   Known devices live in the login's app_metadata.ftm_devices (only the server can write it). */
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { sendMail } = require('../_lib/mail');
const { sendResetEmail } = require('../_lib/passwordEmail');
const SITE = () => (process.env.SITE_URL || 'https://www.ftmwealthnation.com').replace(/\/$/, '');

function hkey() { return crypto.createHmac('sha256', String(process.env.SUPABASE_SERVICE_ROLE_KEY || '')).update('ftm-login-alert-v1').digest(); }
function sign(s) { return crypto.createHmac('sha256', hkey()).update(s).digest('hex').slice(0, 32); }
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function device(ua) {
  ua = String(ua || '');
  const b = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'a browser';
  const o = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'an unknown device';
  return b + ' on ' + o;
}
function place(req) {
  let city = ''; try { city = decodeURIComponent(String(req.headers['x-vercel-ip-city'] || '')); } catch (e) {}
  const c = String(req.headers['x-vercel-ip-country'] || '').toUpperCase().slice(0, 2);
  let country = c; try { if (c) country = new Intl.DisplayNames(['en'], { type: 'region' }).of(c) || c; } catch (e) {}
  return [city, country].filter(Boolean).join(', ') || 'an unknown location';
}
function claims(tok) { try { return JSON.parse(Buffer.from(String(tok).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch (e) { return {}; } }
function shell(title, body) {
  return '<table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;background:#f4f6fb;"><tr><td align="center" style="padding:28px 12px;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;"><tr><td style="padding:30px 26px;color:#1f2a4d;font-size:15px;line-height:1.6;">'
    + '<p style="font-size:22px;font-weight:bold;color:#0b1640;margin:0 0 14px;">' + esc(title) + '</p>' + body + '</td></tr>'
    + '<tr><td align="center" bgcolor="#0b1640" style="background-color:#0b1640;background-image:linear-gradient(#0b1640,#0b1640);padding:28px 20px;"><p style="margin:0 0 14px;color:#D4AF37;font-size:18px;font-weight:bold;">Invest today, secure tomorrow.</p>'
    + '<table cellpadding="0" cellspacing="0"><tr><td style="padding-right:10px;"><img src="https://www.ftmwealthnation.com/email-logo.png" width="40" height="40" alt="" style="display:block;border-radius:10px;"></td><td style="color:#fff;font-size:26px;font-weight:bold;">FTM</td></tr></table>'
    + '<p style="margin:14px 0 0;color:#9aa3c7;font-size:11px;">Follow The Market Ltd. · Security email about your FTM account.</p></td></tr></table></td></tr></table>';
}
async function userFromToken(admin, req) {
  const h = String(req.headers.authorization || ''); const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!tok) return {}; const r = await admin.auth.getUser(tok); return { user: (r && r.data && r.data.user) || null, tok };
}

module.exports = async function handler(req, res) {
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (req.method === 'GET' && req.query && req.query.notme) {
    const parts = String(req.query.notme).split('.'); const [uid, dev, exp, sig] = parts;
    const page = (t, b) => res.status(200).setHeader('content-type', 'text/html; charset=utf-8').end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FTM security</title><body style="margin:0;background:#0B1440;font-family:Arial,Helvetica,sans-serif;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box"><div style="background:#fff;border-radius:20px;max-width:440px;padding:30px 26px;color:#1f2a4d;line-height:1.6"><p style="font-size:22px;font-weight:bold;color:#0b1640;margin:0 0 10px">' + esc(t) + '</p><p style="margin:0 0 18px">' + esc(b) + '</p><a href="/" style="display:inline-block;background:#D4AF37;color:#0B1440;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:99px">Go to FTM</a></div></body>');
    if (parts.length !== 4 || sign(uid + '.' + dev + '.' + exp) !== sig || Date.now() > +exp) return page('This link has expired', 'For your security this link works for 7 days. If you think someone else used your account, open FTM, choose "Forgot password" and set a new one.');
    try {
      const g = await admin.auth.admin.getUserById(uid); const user = g && g.data && g.data.user; if (!user) return page('Account not found', 'We could not find this FTM account.');
      const meta = Object.assign({}, user.app_metadata || {}, { ftm_revoked_at: new Date().toISOString(), ftm_devices: [] });
      await admin.auth.admin.updateUserById(uid, { app_metadata: meta });
      await sendResetEmail(admin, user.email, {}).catch(e => console.error('notme reset', e.message));
      console.log('login-alert notme', uid.slice(0, 8));
      return page('Your account is secured', 'Every device was signed out of FTM. We emailed you a link to choose a new password. Use it before you log in again.');
    } catch (e) { console.error('notme', e.message); return page('Something went wrong', 'Please open FTM, choose "Forgot password" and set a new password.'); }
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  let body = req.body || {}; if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  try {
    const { user, tok } = await userFromToken(admin, req); if (!user) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
    const meta = Object.assign({}, user.app_metadata || {}), cl = claims(tok);
    if (meta.ftm_revoked_at && cl.iat && cl.iat * 1000 < Date.parse(meta.ftm_revoked_at)) return res.status(200).json({ ok: true, signout: true });
    const dev = String(body.device || ''); if (!/^[a-z0-9-]{8,64}$/i.test(dev)) return res.status(400).json({ ok: false, error: 'BAD_DEVICE' });
    const devices = Array.isArray(meta.ftm_devices) ? meta.ftm_devices.slice() : [], now = new Date().toISOString();
    const known = devices.find(d => d.id === dev), name = device(req.headers['user-agent']), where = place(req);
    if (known) {
      if (Date.now() - Date.parse(known.last || 0) > 6 * 3600e3) { known.last = now; meta.ftm_devices = devices; await admin.auth.admin.updateUserById(user.id, { app_metadata: meta }); }
      return res.status(200).json({ ok: true, known: true });
    }
    const first = devices.length === 0;
    devices.push({ id: dev, name, where, first: now, last: now }); meta.ftm_devices = devices.slice(-10);
    let emailed = false;
    const recent = (Array.isArray(meta.ftm_alerts) ? meta.ftm_alerts : []).filter(t => Date.now() - Date.parse(t) < 3600e3);
    if (!first && recent.length < 3) {
      const exp = String(Date.now() + 7 * 864e5), link = SITE() + '/api/v1/login-alert?notme=' + [user.id, dev, exp, sign(user.id + '.' + dev + '.' + exp)].join('.');
      const when = new Date().toUTCString().replace(' GMT', ' UTC');
      const html = shell('New sign-in to your FTM account',
        '<p style="margin:0 0 14px;">Your FTM account was just opened on a device we have not seen before:</p>'
        + '<table cellpadding="0" cellspacing="0" style="margin:0 0 18px;font-size:14.5px;"><tr><td style="color:#6b7394;padding:3px 14px 3px 0;">Device</td><td style="font-weight:bold;color:#0b1640;">' + esc(name) + '</td></tr>'
        + '<tr><td style="color:#6b7394;padding:3px 14px 3px 0;">Place</td><td style="font-weight:bold;color:#0b1640;">' + esc(where) + ' (approximate)</td></tr>'
        + '<tr><td style="color:#6b7394;padding:3px 14px 3px 0;">Time</td><td style="font-weight:bold;color:#0b1640;">' + esc(when) + '</td></tr></table>'
        + '<p style="margin:0 0 6px;"><b>Was this you?</b> Then you do not need to do anything.</p>'
        + '<p style="margin:0 0 20px;">If it was <b>not</b> you, tap the button below. FTM signs every device out of your account and sends you a link to choose a new password.</p>'
        + '<a href="' + esc(link) + '" style="display:inline-block;background:#E5323E;color:#ffffff;font-weight:bold;text-decoration:none;padding:13px 24px;border-radius:99px;">This wasn\'t me</a>'
        + '<p style="margin:20px 0 0;font-size:12.5px;color:#6b7394;">FTM will never ask for your password or MT5 password by email, phone or chat.</p>');
      try { await sendMail({ to: user.email, subject: 'New sign-in to your FTM account', html, fromName: 'FTM security' }); emailed = true; recent.push(now); }
      catch (e) { console.error('login-alert mail', e.message); }
    }
    meta.ftm_alerts = recent;
    await admin.auth.admin.updateUserById(user.id, { app_metadata: meta });
    return res.status(200).json({ ok: true, known: false, emailed });
  } catch (e) { console.error('login-alert', e.message); return res.status(500).json({ ok: false, error: 'FAILED' }); }
};
