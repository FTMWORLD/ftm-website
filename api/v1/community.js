/* POST /api/v1/community {action, ...}: the FTM Community (interim, until FTM ENGINE's Community goes live).
   Every call needs the customer's Supabase access token (Authorization: Bearer ...).
     me                          my profile (empty until I save one) and whether I may post
     save   {nickname,bio,country,visible}
     members                     visible members (not me, nobody I blocked or who blocked me)
     follow / unfollow {mid}     block / unblock {mid}     report {mid, reason}
     threads                     my conversations (last message, unread)
     messages {mid}              one conversation (marks it read)
     send {mid, text, reply?}    send a direct message (paid members; no links or contact details)
     react {mid, t, e}           toggle a reaction on a message; unsend {mid, t} removes your own message
     typing {mid}                'is typing' signal; profile {mid} one member's public card
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
function within(ms, p, what) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT ' + what)), ms))]); }

function key() { return crypto.createHmac('sha256', String(process.env.SUPABASE_SERVICE_ROLE_KEY || '')).update('ftm-community-v1').digest(); }
function midOf(uid) { return crypto.createHmac('sha256', key()).update(String(uid)).digest('hex').slice(0, 16); }
function clean(s, n) { return Array.from(String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, n).join(''); }
const REACTIONS = ['\u2764\uFE0F', '\uD83D\uDC4D', '\uD83D\uDE02', '\uD83D\uDE2E', '\uD83D\uDE22', '\uD83D\uDE4F', '\uD83D\uDD25', '\uD83C\uDF89'];
function outMsg(x, me) { const o = { from: x.f === me ? 'me' : 'them', text: x.d ? '' : x.x, t: x.t }; if (x.d) o.removed = true; if (x.r) { const r = {}; Object.keys(x.r).forEach(k => { r[k === me ? 'me' : 'them'] = x.r[k]; }); o.reactions = r; } if (x.q && !x.d) o.reply = { from: x.q.f === me ? 'me' : 'them', text: x.q.x, t: x.q.t }; return o; }
function pair(a, b) { return a < b ? a + '__' + b : b + '__' + a; }

function store(admin) {
  const B = () => admin.storage.from(BUCKET);
  return {
    async ready() {
      if (bucketReady) return;
      const g = await within(6000, admin.storage.getBucket(BUCKET), 'getBucket');
      if (g.error) { const c = await within(6000, admin.storage.createBucket(BUCKET, { public: false }), 'createBucket'); if (c.error && !/exist/i.test(c.error.message || '')) throw new Error('BUCKET: ' + c.error.message); }
      bucketReady = true;
    },
    async read(path, def) {
      const r = await within(6000, B().download(path), 'download');
      if (r.error || !r.data) return def;
      try { return JSON.parse(await r.data.text()); } catch (e) { return def; }
    },
    async write(path, obj) {
      const r = await within(6000, B().upload(path, Buffer.from(JSON.stringify(obj)), { upsert: true, contentType: 'application/json', cacheControl: '0' }), 'upload');
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
  if (req.method === 'GET' && req.query && req.query.avatar) {
    // profile pictures: /api/v1/community?avatar=<mid>&v=<version> (only members' opaque ids; images are small JPEGs)
    const m = String(req.query.avatar).replace(/[^a-f0-9]/g, '').slice(0, 16);
    try {
      const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const r = await within(6000, admin.storage.from(BUCKET).download('avatars/' + m + '.jpg'), 'avatar');
      if (r.error || !r.data) return res.status(404).end();
      const buf = Buffer.from(await r.data.arrayBuffer());
      res.setHeader('Content-Type', 'image/jpeg'); res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).end(buf);
    } catch (e) { return res.status(404).end(); }
  }
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
    const pres = await S.read('presence.json', {});
    const nowIso = new Date().toISOString();
    if (mine && (!pres[me] || Date.parse(nowIso) - Date.parse(pres[me]) > 60000)) { pres[me] = nowIso; S.write('presence.json', pres).catch(() => {}); }
    const follows = soc.follows[me] || [], blocks = soc.blocks[me] || [];
    const blockedBy = Object.keys(soc.blocks).filter(k => (soc.blocks[k] || []).indexOf(me) !== -1);
    const hidden = new Set(blocks.concat(blockedBy));
    const followers = m => Object.keys(soc.follows).filter(k => (soc.follows[k] || []).indexOf(m) !== -1 && !hidden.has(k)).length;
    const followingOf = m => (soc.follows[m] || []).filter(k => idx.members[k] && !hidden.has(k)).length;
    const pub = m => { const x = idx.members[m]; return { mid: m, nickname: x.nickname, country: x.country || '', bio: x.bio || '', since: x.since, av: x.av || null, sub: !!x.sub, seen: pres[m] || null, following: follows.indexOf(m) !== -1, follows_you: (soc.follows[m] || []).indexOf(me) !== -1, followers: followers(m), following_count: followingOf(m) }; };
    const okTarget = m => m && m !== me && idx.members[m] && idx.members[m].visible && !hidden.has(m);

    if (action === 'me') {
      const paid = await isPaid(admin, user.id);
      if (mine && !!mine.sub !== paid) { mine.sub = paid; await S.write('index.json', idx); }
      return res.status(200).json({ ok: true, mid: me, paid,
        profile: mine ? { nickname: mine.nickname, bio: mine.bio || '', country: mine.country || '', visible: !!mine.visible, since: mine.since, av: mine.av || null } : { nickname: '', bio: '', country: '', visible: false, since: null, av: null },
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

    if (action === 'avatar') {
      if (!mine || !mine.nickname) return res.status(400).json({ ok: false, error: 'PROFILE_FIRST' });
      if (body.remove) { delete mine.av; await S.write('index.json', idx); return res.status(200).json({ ok: true, av: null }); }
      const mm = String(body.image || '').match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
      if (!mm) return res.status(400).json({ ok: false, error: 'IMAGE_INVALID' });
      const buf = Buffer.from(mm[1], 'base64');
      if (buf.length > 300000 || buf[0] !== 0xFF || buf[1] !== 0xD8) return res.status(400).json({ ok: false, error: 'IMAGE_INVALID' });
      const r = await within(8000, admin.storage.from(BUCKET).upload('avatars/' + me + '.jpg', buf, { upsert: true, contentType: 'image/jpeg', cacheControl: '0' }), 'avatar upload');
      if (r.error) throw new Error('AVATAR: ' + r.error.message);
      mine.av = Date.now().toString(36); await S.write('index.json', idx);
      return res.status(200).json({ ok: true, av: mine.av });
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
      const list = Object.keys(inbox.threads).filter(m => idx.members[m] && !hidden.has(m)).map(m => { const t = inbox.threads[m]; return { mid: m, av: idx.members[m].av || null, seen: pres[m] || null, nickname: idx.members[m].nickname, last: t.last, from: t.from === me ? 'me' : 'them', t: t.t, unread: t.from !== me && (!t.read || t.read < t.t) }; }).sort((a, b) => String(b.t).localeCompare(String(a.t)));
      return res.status(200).json({ ok: true, threads: list });
    }

    if (action === 'messages') {
      const m = String(body.mid || '');
      if (!idx.members[m] || hidden.has(m)) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      const th = await S.read('threads/' + pair(me, m) + '.json', { msgs: [] });
      const inbox = await S.read('inbox/' + me + '.json', { threads: {} });
      if (inbox.threads[m] && inbox.threads[m].from !== me && (!inbox.threads[m].read || inbox.threads[m].read < inbox.threads[m].t)) { inbox.threads[m].read = new Date().toISOString(); await S.write('inbox/' + me + '.json', inbox); }
      const theirs = await S.read('inbox/' + m + '.json', { threads: {} }), tr = theirs.threads[me] || {};
      const ty = await S.read('typing/' + pair(me, m) + '.json', {}), lastTheirs = th.msgs.filter(x => x.f === m).map(x => x.t).pop() || '', typing = !!(ty[m] && ty[m] > lastTheirs && Date.now() - Date.parse(ty[m]) < 7000);
      return res.status(200).json({ ok: true, nickname: idx.members[m].nickname, av: idx.members[m].av || null, seen_at: tr.read || null, online: pres[m] || null, typing, messages: th.msgs.map(x => outMsg(x, me)) });
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
      const th = await S.read(p, { msgs: [] }), nm = { f: me, x: text, t: at };
      const q = body.reply ? th.msgs.filter(x => x.t === String(body.reply) && !x.d)[0] : null; if (q) nm.q = { f: q.f, x: Array.from(q.x).slice(0, 90).join(''), t: q.t };
      th.msgs.push(nm); if (th.msgs.length > 500) th.msgs = th.msgs.slice(-500);
      await S.write(p, th);
      for (const [a, b] of [[me, m], [m, me]]) { const ib = await S.read('inbox/' + a + '.json', { threads: {} }); ib.threads[b] = Object.assign({}, ib.threads[b], { last: text.slice(0, 120), from: me, t: at }, a === me ? { read: at } : {}); await S.write('inbox/' + a + '.json', ib); }
      return res.status(200).json({ ok: true, message: outMsg(nm, me) });
    }

    if (action === 'react' || action === 'unsend') {
      const m = String(body.mid || ''), t = String(body.t || '');
      if (!mine || !mine.nickname) return res.status(400).json({ ok: false, error: 'PROFILE_FIRST' });
      if (!idx.members[m] || hidden.has(m) || m === me) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      const p = 'threads/' + pair(me, m) + '.json', th = await S.read(p, { msgs: [] });
      const x = th.msgs.filter(z => z.t === t)[0];
      if (!x || x.d) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      if (action === 'react') {
        const e = String(body.e || '');
        if (e && REACTIONS.indexOf(e) === -1) return res.status(400).json({ ok: false, error: 'INVALID' });
        x.r = x.r || {}; if (!e || x.r[me] === e) delete x.r[me]; else x.r[me] = e; if (!Object.keys(x.r).length) delete x.r;
      } else {
        if (x.f !== me) return res.status(403).json({ ok: false, error: 'NOT_YOURS' });
        x.d = 1; x.x = ''; delete x.r; delete x.q;
        const last = th.msgs[th.msgs.length - 1] === x;
        if (last) for (const [a, b] of [[me, m], [m, me]]) { const ib = await S.read('inbox/' + a + '.json', { threads: {} }); if (ib.threads[b]) { ib.threads[b].last = ''; await S.write('inbox/' + a + '.json', ib); } }
      }
      await S.write(p, th);
      return res.status(200).json({ ok: true, message: outMsg(x, me) });
    }

    if (action === 'typing') {
      const m = String(body.mid || '');
      if (!mine || !idx.members[m] || hidden.has(m)) return res.status(200).json({ ok: true });
      const p = 'typing/' + pair(me, m) + '.json', ty = await S.read(p, {}); ty[me] = new Date().toISOString(); await S.write(p, ty);
      return res.status(200).json({ ok: true });
    }

    if (action === 'profile') {
      const m = String(body.mid || '');
      if (!idx.members[m] || hidden.has(m)) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      if (m !== me && !idx.members[m].visible) { const ib = await S.read('inbox/' + me + '.json', { threads: {} }); if (!ib.threads[m]) return res.status(404).json({ ok: false, error: 'NOT_FOUND' }); }
      return res.status(200).json({ ok: true, member: pub(m) });
    }

    return res.status(400).json({ ok: false, error: 'INVALID_ACTION' });
  } catch (e) {
    console.error('community:', action, e && e.message);
    return res.status(500).json({ ok: false, error: 'COMMUNITY_FAILED', detail: String((e && e.message) || '').replace(/[^\w :.-]/g, '').slice(0, 80) });
  }
};
