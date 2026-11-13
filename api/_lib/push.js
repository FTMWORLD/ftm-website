/* Phone notifications (Web Push) for FTM members.
   - VAPID keys are derived from SUPABASE_SERVICE_ROLE_KEY on the server (nothing to set up, never leaves the server);
     VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in Vercel override them.
   - Subscriptions live in the private Supabase Storage bucket "community" at push/<mid>.json
     ({ subs: [{endpoint, keys, lang, ua, at}], prefs: {messages, follows, social, trades, leaderboard} }), mid = the
     member's community id (HMAC of the login id, same as api/v1/community.js).
   - Texts are translated with the site's own i18n files (i18n/<lang>.json); "{}" is replaced by the name or figure. */
const crypto = require('crypto');
const BUCKET = 'community';
const KINDS = ['messages', 'follows', 'social', 'trades', 'leaderboard'];
const SITE = () => (process.env.SITE_URL || 'https://www.ftmwealthnation.com').replace(/\/$/, '');

function b64u(buf) { return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function vapid() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) return { pub: process.env.VAPID_PUBLIC_KEY, priv: process.env.VAPID_PRIVATE_KEY };
  const seed = crypto.createHmac('sha256', String(process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing')).update('ftm-vapid-v1').digest();
  const n = BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551');
  let d = BigInt('0x' + seed.toString('hex')) % (n - 1n) + 1n;
  const priv = Buffer.from(d.toString(16).padStart(64, '0'), 'hex');
  const ecdh = crypto.createECDH('prime256v1'); ecdh.setPrivateKey(priv);
  return { pub: b64u(ecdh.getPublicKey()), priv: b64u(priv) };
}
function midOf(uid) {
  const key = crypto.createHmac('sha256', String(process.env.SUPABASE_SERVICE_ROLE_KEY || '')).update('ftm-community-v1').digest();
  return crypto.createHmac('sha256', key).update(String(uid)).digest('hex').slice(0, 16);
}
function within(ms, p) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms))]); }
async function read(admin, path, def) {
  const r = await within(6000, admin.storage.from(BUCKET).download(path));
  if (r.error || !r.data) return def;
  try { return JSON.parse(await r.data.text()); } catch (e) { return def; }
}
async function write(admin, path, obj) {
  const r = await within(6000, admin.storage.from(BUCKET).upload(path, Buffer.from(JSON.stringify(obj)), { upsert: true, contentType: 'application/json', cacheControl: '0' }));
  if (r.error) throw new Error('WRITE: ' + r.error.message);
}
async function getBox(admin, mid) {
  const b = await read(admin, 'push/' + mid + '.json', null) || {};
  b.subs = Array.isArray(b.subs) ? b.subs : []; b.prefs = Object.assign({ messages: true, follows: true, social: true, trades: true, leaderboard: true }, b.prefs || {});
  return b;
}
const i18nCache = new Map();
async function tr(lang, text) {
  lang = String(lang || 'en').toLowerCase().replace(/[^a-z-]/g, '').slice(0, 6);
  if (!lang || lang === 'en') return text;
  let d = i18nCache.get(lang);
  if (!d) { try { const r = await within(3000, fetch(SITE() + '/i18n/' + lang + '.json')); d = r.ok ? await r.json() : {}; } catch (e) { d = {}; } i18nCache.set(lang, d); }
  return d[text] || text;
}
// send({ mid | uid, kind, title, body, url, tag, args:{title:[...], body:[...]} }) -> number of devices reached
async function send(admin, o) {
  const mid = o.mid || midOf(o.uid);
  const box = await getBox(admin, mid);
  if (!box.subs.length || (o.kind && box.prefs[o.kind] === false)) return 0;
  const webpush = require('web-push'); const v = vapid();
  webpush.setVapidDetails('mailto:' + (process.env.SUPPORT_EMAIL || process.env.SMTP_USER || 'ftmwebnation@gmail.com'), v.pub, v.priv);
  let reached = 0, changed = false;
  for (const s of box.subs.slice()) {
    const fill = async (t, a) => { let x = await tr(s.lang, t); (a || []).forEach(v2 => { x = x.replace('{}', String(v2)); }); return x; };
    const payload = JSON.stringify({ title: await fill(o.title, o.args && o.args.title), body: await fill(o.body, o.args && o.args.body), url: o.url || '/', tag: o.tag || o.kind || 'ftm' });
    try { await within(8000, webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 86400, urgency: o.urgency || 'normal' })); reached++; }
    catch (e) { const st = e && e.statusCode; if (st === 404 || st === 410) { box.subs = box.subs.filter(x => x.endpoint !== s.endpoint); changed = true; } else console.error('push failed', st || '', String(e && e.message || e).slice(0, 120)); }
  }
  if (changed) await write(admin, 'push/' + mid + '.json', box).catch(() => {});
  return reached;
}
module.exports = { vapid, midOf, getBox, read, write, send, KINDS, BUCKET };
