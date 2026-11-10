/* POST /api/v1/community {action, ...}: the FTM Community (interim, until FTM ENGINE's Community goes live).
   Every call needs the customer's Supabase access token (Authorization: Bearer ...).
     me                          my profile (empty until I save one) and whether I may post
     save   {nickname,bio,country,visible}
     members                     visible members (not me, nobody I blocked or who blocked me)
     follow / unfollow {mid}     block / unblock {mid}     report {mid, reason}
     threads                     my conversations (last message, unread)
     messages {mid}              one conversation (marks it read)
     send {mid, text}            send a direct message (paid members; no links or contact details)
   Data lives in a private Supabase Storage bucket "community" (JSON files), reachable only through this function.
   Members are addressed by an opaque id (mid), never by their login id or email. */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'community';
const RESERVED = /^(ftm|admin|support|official|moderator|staff|system)$/i;
const LINKS = /(https?:\/\/|www\.|\b[\w-]+\.(com|net|org|io|me|ly|co|app|xyz|info|biz|link|gg|tv)\b|@[a-z0-9_]{3,}|\+?\d[\d\s().-]{7,}\d|t\.me|wa\.me|whatsapp|telegram)/i;
const SELLING = /\b(signals?\s+for\s+sale|sell(ing)?\s+signals?|paid\s+signals?|vip\s+signals?|account\s+management)\b/i;
let bucketReady = false;
const sent = new Map();

function key() { return crypto.createHmac('sha256', String(process.env.SUPABASE_SERVICE_ROLE_KEY || '')).update('ftm-community-v1').digest(); }
function midOf(uid) { return crypto.createHmac('sha256', key()).update(String(uid)).digest('hex').slice(0, 16); }
function clean(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n); }
function pair(a, b) { return a < b ? a + '__' + b : b + '__' + a; }

function store(admin) {
  const B = () => admin.storage.from(BUCKET);
  return {
    async ready() {
      if (bucketReady) return;
      const g = await admin.storage.getBucket(BUCKET);
      if (g.error) { const c = await admin.storage.createBucket(BUCKET, { public: false }); if (c.error && !/exist/i.test(c.error.message || '')) throw new Error('BUCKET: ' + c.error.message); }
      bucketReady = true;
    },
    async read(path, def) {
      const r = await B().download(path);
      if (r.error || !r.data) return def;
      try { return JSON.parse(await r.data.text()); } catch (e) { return def; }
    },
    async write(path, obj) {
      const r = await B().upload(path, Buffer.from(JSON.stringify(obj)), { upsert: true, contentType: 'application/json', cacheControl: '0' });
      if (r.error) throw new Error('WRITE: ' + r.error.message);
    }
  };
}

async function userFromToken(admin, req) {
  const h = String(req.headers.authorization || '');
  const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!tok) return null;
  const r = await admin.auth.getUser(tok);
  return (r && r.data && r.data.user) || null;
}

async function isPaid(admin, uid) {
  try { const p = await admin.from('profiles').select('products').eq('id', uid).maybeSingle(); const pr = (p && p.data && p.data.products) || []; return Array.isArray(pr) && pr.length > 0; } catch (e) { return false; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const action = String(body.action || '');
  try {
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const user = await userFromToken(admin, req);
    if (!user) return res.status(401).json({ ok: false, error: 'NOT_LOGGED_IN' });
    const S = store(admin); await S.ready();
    const me = midOf(user.id);
    const idx = await S.read('index.json', { members: {} });
    const soc = await S.read('social.json', { follows: {}, blocks: {} });
    const mine = idx.members[me] || null;
    const follows = soc.follows[me] || [], blocks = soc.blocks[me] || [];
    const blockedBy = Object.keys(soc.blocks).filter(k => (soc.blocks[k] || []).indexOf(me) !== -1);
    const hidden = new Set(blocks.concat(blockedBy));
    const followers = m => Object.keys(soc.follows).filter(k => (soc.follows[k] || []).indexOf(m) !== -1 && !hidden.has(k)).length;
    const pub = m => { const x = idx.members[m]; return { mid: m, nickname: x.nickname, country: x.country || '', bio: x.bio || '', since: x.since, following: follows.indexOf(m) !== -1, followers: followers(m) }; };
    const okTarget = m => m && m !== me && idx.members[m] && idx.members[m].visible && !hidden.has(m);

    if (action === 'me') {
      return res.status(200).json({ ok: true, mid: me, paid: await isPaid(admin, user.id),
        profile: mine ? { nickname: mine.nickname, bio: mine.bio || '', country: mine.country || '', visible: !!mine.visible, since: mine.since } : { nickname: '', bio: '', country: '', visible: false, since: null },
        followers: followers(me), following: follows.length, blocked: blocks.filter(m => idx.members[m]).map(m => ({ mid: m, nickname: idx.members[m].nickname })) });
    }

    if (action === 'save') {
      const nick = clean(body.nickname, 24), bio = clean(body.bio, 160), country = clean(body.country, 40).toUpperCase().slice(0, 2), visible = !!body.visible;
      if (!/^[A-Za-z0-9_-]{3,24}$/.test(nick)) return res.status(400).json({ ok: false, error: 'NICKNAME_INVALID' });
      if (RESERVED.test(nick) || /^ftm[_-]?/i.test(nick)) return res.status(400).json({ ok: false, error: 'NICKNAME_RESERVED' });
      const taken = Object.keys(idx.members).some(k => k !== me && String(idx.members[k].nickname).toLowerCase() === nick.toLowerCase());
      if (taken) return res.status(409).json({ ok: false, error: 'NICKNAME_TAKEN' });
      if (LINKS.test(bio) || SELLING.test(bio)) return res.status(400).json({ ok: false, error: 'NO_LINKS' });
      idx.members[me] = Object.assign({}, mine || { since: new Date().toISOString() }, { nickname: nick, bio, country, visible, updated: new Date().toISOString() });
      await S.write('index.json', idx);
      return res.status(200).json({ ok: true, profile: { nickname: nick, bio, country, visible, since: idx.members[me].since } });
    }

    if (action === 'members') {
      const list = Object.keys(idx.members).filter(okTarget).map(pub).sort((a, b) => (b.followers - a.followers) || String(b.since).localeCompare(String(a.since)));
      return res.status(200).json({ ok: true, members: list });
    }

    if (['follow', 'unfollow', 'block', 'unblock'].indexOf(action) !== -1) {
      const m = String(body.mid || '');
      if (!idx.members[m] || m === me) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      const k = action.indexOf('block') !== -1 ? 'blocks' : 'follows', on = action === 'follow' || action === 'block';
      const L = (soc[k][me] || []).filter(x => x !== m); if (on) L.push(m); soc[k][me] = L;
      if (action === 'block') soc.follows[me] = (soc.follows[me] || []).filter(x => x !== m);
      await S.write('social.json', soc);
      return res.status(200).json({ ok: true });
    }

    if (action === 'report') {
      const m = String(body.mid || '');
      await S.write('reports/' + Date.now() + '_' + me + '.json', { by: me, about: m, nickname: idx.members[m] && idx.members[m].nickname, reason: clean(body.reason, 500), at: new Date().toISOString() });
      return res.status(200).json({ ok: true });
    }

    if (action === 'threads') {
      const inbox = await S.read('inbox/' + me + '.json', { threads: {} });
      const list = Object.keys(inbox.threads).filter(m => idx.members[m] && !hidden.has(m)).map(m => { const t = inbox.threads[m]; return { mid: m, nickname: idx.members[m].nickname, last: t.last, from: t.from === me ? 'me' : 'them', t: t.t, unread: t.from !== me && (!t.read || t.read < t.t) }; }).sort((a, b) => String(b.t).localeCompare(String(a.t)));
      return res.status(200).json({ ok: true, threads: list });
    }

    if (action === 'messages') {
      const m = String(body.mid || '');
      if (!idx.members[m] || hidden.has(m)) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      const th = await S.read('threads/' + pair(me, m) + '.json', { msgs: [] });
      const inbox = await S.read('inbox/' + me + '.json', { threads: {} });
      if (inbox.threads[m] && inbox.threads[m].from !== me && (!inbox.threads[m].read || inbox.threads[m].read < inbox.threads[m].t)) { inbox.threads[m].read = new Date().toISOString(); await S.write('inbox/' + me + '.json', inbox); }
      return res.status(200).json({ ok: true, nickname: idx.members[m].nickname, messages: th.msgs.map(x => ({ from: x.f === me ? 'me' : 'them', text: x.x, t: x.t })) });
    }

    if (action === 'send') {
      const m = String(body.mid || ''), text = clean(body.text, 1000);
      if (!mine || !mine.nickname) return res.status(400).json({ ok: false, error: 'PROFILE_FIRST' });
      if (!okTarget(m)) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      if (!text) return res.status(400).json({ ok: false, error: 'EMPTY' });
      if (!(await isPaid(admin, user.id))) return res.status(403).json({ ok: false, error: 'READ_ONLY' });
      if (LINKS.test(text) || SELLING.test(text)) return res.status(400).json({ ok: false, error: 'NO_LINKS' });
      const now = Date.now(), hits = (sent.get(me) || []).filter(t => now - t < 864e5); if (hits.length >= 200) return res.status(429).json({ ok: false, error: 'RATE_LIMIT' });
      hits.push(now); sent.set(me, hits);
      const at = new Date().toISOString(), p = 'threads/' + pair(me, m) + '.json';
      const th = await S.read(p, { msgs: [] }); th.msgs.push({ f: me, x: text, t: at }); if (th.msgs.length > 500) th.msgs = th.msgs.slice(-500);
      await S.write(p, th);
      for (const [a, b] of [[me, m], [m, me]]) { const ib = await S.read('inbox/' + a + '.json', { threads: {} }); ib.threads[b] = Object.assign({}, ib.threads[b], { last: text.slice(0, 120), from: me, t: at }, a === me ? { read: at } : {}); await S.write('inbox/' + a + '.json', ib); }
      return res.status(200).json({ ok: true, message: { from: 'me', text, t: at } });
    }

    return res.status(400).json({ ok: false, error: 'INVALID_ACTION' });
  } catch (e) {
    console.error('community:', action, e && e.message);
    return res.status(500).json({ ok: false, error: 'COMMUNITY_FAILED' });
  }
};
