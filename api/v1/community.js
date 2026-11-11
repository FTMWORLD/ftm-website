/* POST /api/v1/community {action, ...}: the FTM Community (interim, until FTM ENGINE's Community goes live).
   Every call needs the customer's Supabase access token (Authorization: Bearer ...).
     me                          my profile (empty until I save one) and whether I may post
     save   {nickname,bio,country,visible}   every subscriber is visible by default (auto profile member_xxxx); a save records their own choice (vis_set)
     members                     visible members (not me, nobody I blocked or who blocked me)
     follow / unfollow {mid}     block / unblock {mid}     report {mid, reason}
     threads                     my conversations (last message, unread)
     messages {mid}              one conversation (marks it read)
     send {mid, text, reply?}    send a direct message (paid members; no links or contact details)
     react {mid, t, e}           toggle a reaction on a message; unsend {mid, t} removes your own message
     typing {mid}                'is typing' signal; profile {mid} one member's public card
     feed {scope:all|following|ftm|<mid>, before?}   posts, newest first (pinned FTM posts on top)
     post {text, image?}         new post (paid members and FTM); like {id}; comment {id, text}; delpost {id}; delcomment {id, cid}; pin {id} (FTM)
     notifs {read?}              likes, comments, new followers and FTM posts for me
     post also takes images[] (up to 4) and poll {options[2-4]}; vote {id, i}; bookmark {id} (scope 'saved'); edit {id, text}; clike {id, cid}; trending
     GET ?postjson=<id>          public view of one post for share links (/p/<id>); GET ?share=<id> the share page with preview tags
   FTM staff = a login on @ftmwealthnation.com or listed in FTM_COMMUNITY_ADMINS (comma-separated emails); their posts show as FTM.
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
const postsSent = new Map();
function isStaff(user) { const e = String((user && user.email) || '').toLowerCase(); const L = String(process.env.FTM_COMMUNITY_ADMINS || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean); return !!e && (/@ftmwealthnation\.com$/.test(e) || L.indexOf(e) !== -1); }
function cleanLong(s, n) { return Array.from(String(s == null ? '' : s).replace(/[\u0000-\u0009\u000b-\u001f<>]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()).slice(0, n).join(''); }
function postImgs(x) { const n = x.imgs || (x.img ? 1 : 0), v = x.img || ''; const L = []; for (let i = 0; i < n; i++) L.push('/api/v1/community?postimg=' + x.id + (i ? '_' + i : '') + '&v=' + v); return L; }
function tagsOf(t) { const m = String(t || '').match(/#[\p{L}\p{N}_]{2,30}/gu) || []; return Array.from(new Set(m.map(x => x.slice(1).toLowerCase()))); }
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
      res.setHeader('Content-Type', 'image/jpeg'); res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.status(200).end(buf);
    } catch (e) { return res.status(404).end(); }
  }
  if (req.method === 'GET' && req.query && req.query.postimg) {
    const id = String(req.query.postimg).replace(/[^a-z0-9_]/g, '').slice(0, 28);
    try {
      const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const r = await within(6000, admin.storage.from(BUCKET).download('posts/' + id + '.jpg'), 'postimg');
      if (r.error || !r.data) return res.status(404).end();
      const buf = Buffer.from(await r.data.arrayBuffer());
      res.setHeader('Content-Type', 'image/jpeg'); res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.status(200).end(buf);
    } catch (e) { return res.status(404).end(); }
  }
  if (req.method === 'GET' && req.query && (req.query.postjson || req.query.share)) {
    const id = String(req.query.postjson || req.query.share).replace(/[^a-z0-9]/g, '').slice(0, 24);
    let x = null, nick = '';
    try {
      const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY), S = store(admin);
      const P = await S.read('posts.json', { posts: [] }); x = P.posts.filter(p => p.id === id)[0] || null;
      if (x && !x.ftm) { const idx = await S.read('index.json', { members: {} }); const m = idx.members[x.a]; if (!m) x = null; else nick = m.nickname; }
    } catch (e) { x = null; }
    const SITE = String(process.env.SITE_URL || 'https://www.ftmwealthnation.com').replace(/\/$/, '');
    const imgs = x ? postImgs(x).map(u => SITE + u) : [];
    if (req.query.postjson) {
      res.setHeader('Cache-Control', 'public, max-age=60');
      if (!x) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      return res.status(200).json({ ok: true, post: { id: x.id, author: x.ftm ? 'FTM' : nick, ftm: !!x.ftm, text: x.x, imgs, t: x.t, likes: (x.lk || []).length, comments: (x.c || []).length } });
    }
    const h = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const title = x ? (x.ftm ? 'FTM' : nick) + ' · FTM Community' : 'FTM Community', desc = x ? Array.from(x.x || '').slice(0, 200).join('') : 'Invest today, secure tomorrow.';
    const img = imgs[0] || SITE + '/email-logo.png', url = SITE + '/p/' + id;
    res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(x ? 200 : 404).end('<!doctype html><html><head><meta charset="utf-8"><title>' + h(title) + '</title><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta property="og:type" content="article"><meta property="og:site_name" content="FTM"><meta property="og:title" content="' + h(title) + '"><meta property="og:description" content="' + h(desc) + '"><meta property="og:image" content="' + h(img) + '"><meta property="og:url" content="' + h(url) + '">' +
      '<meta name="twitter:card" content="' + (imgs[0] ? 'summary_large_image' : 'summary') + '"><meta name="twitter:title" content="' + h(title) + '"><meta name="twitter:description" content="' + h(desc) + '"><meta name="twitter:image" content="' + h(img) + '">' +
      '<link rel="canonical" href="' + h(url) + '"><meta http-equiv="refresh" content="0;url=' + h(SITE + '/?post=' + id) + '"><style>body{margin:0;background:#0b1440}</style></head><body><a href="' + h(SITE + '/?post=' + id) + '" style="color:#D4AF37;font:16px sans-serif;display:block;padding:24px">FTM</a></body></html>');
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
    let mine = idx.members[me] || null;
    const pres = await S.read('presence.json', {});
    const nowIso = new Date().toISOString();
    if (mine && (!pres[me] || Date.parse(nowIso) - Date.parse(pres[me]) > 60000)) { pres[me] = nowIso; S.write('presence.json', pres).catch(() => {}); }
    const follows = soc.follows[me] || [], blocks = soc.blocks[me] || [];
    const blockedBy = Object.keys(soc.blocks).filter(k => (soc.blocks[k] || []).indexOf(me) !== -1);
    const hidden = new Set(blocks.concat(blockedBy));
    const followers = m => Object.keys(soc.follows).filter(k => (soc.follows[k] || []).indexOf(m) !== -1 && !hidden.has(k)).length;
    const followingOf = m => (soc.follows[m] || []).filter(k => idx.members[k] && !hidden.has(k)).length;
    let postsCache = null; const postCount = m => { return (postsCache || []).filter(x => x.a === m && !x.ftm).length; };
    if (action === 'members' || action === 'profile') postsCache = (await S.read('posts.json', { posts: [] })).posts;
    const pub = m => { const x = idx.members[m]; return { mid: m, nickname: x.nickname, country: x.country || '', bio: x.bio || '', since: x.since, av: x.av || null, sub: !!x.sub, seen: pres[m] || null, following: follows.indexOf(m) !== -1, follows_you: (soc.follows[m] || []).indexOf(me) !== -1, followers: followers(m), following_count: followingOf(m), posts: postCount(m) }; };
    const notify = async (m, n) => { if (!m || m === me) return; const p = 'notif/' + m + '.json', nb = await S.read(p, { items: [], read: '' }); n.t = new Date().toISOString(); nb.items = nb.items.filter(z => !(z.k === n.k && z.by === n.by && z.post === n.post && n.k !== 'comment')); nb.items.push(n); if (nb.items.length > 100) nb.items = nb.items.slice(-100); await S.write(p, nb); };
    const okTarget = m => m && m !== me && idx.members[m] && idx.members[m].visible && !hidden.has(m);

    if (action === 'me') {
      const paid = await isPaid(admin, user.id);
      let dirty = false;
      if (paid && !mine) {
        const used = new Set(Object.keys(idx.members).map(k => String(idx.members[k].nickname).toLowerCase()));
        let nick = 'member_' + me.slice(0, 4); for (let i = 1; used.has(nick.toLowerCase()) && i < 12; i++) nick = 'member_' + me.slice(i, i + 4 + Math.floor(i / 4));
        mine = idx.members[me] = { since: nowIso, nickname: nick, bio: '', country: '', visible: true, auto: true, updated: nowIso }; dirty = true;
      } else if (paid && mine && !mine.visible && !mine.vis_set) { mine.visible = true; dirty = true; }
      if (mine && !!mine.sub !== paid) { mine.sub = paid; dirty = true; }
      if (dirty) await S.write('index.json', idx);
      const nb = await S.read('notif/' + me + '.json', { items: [], read: '' });
      const ftmNew = (await S.read('posts.json', { posts: [] })).posts.filter(x => x.ftm && x.a !== me && x.t > (nb.read || '') && x.t > (mine && mine.since || '')).length;
      return res.status(200).json({ ok: true, mid: me, paid, staff: isStaff(user), notif_unread: nb.items.filter(x => x.t > (nb.read || '')).length + ftmNew,
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
      idx.members[me] = Object.assign({}, mine || { since: new Date().toISOString() }, { nickname: nick, bio, country, visible, vis_set: true, auto: false, updated: new Date().toISOString() });
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
      if (action === 'follow') await notify(m, { k: 'follow', by: me });
      return res.status(200).json({ ok: true });
    }

    if (action === 'report') {
      const m = String(body.mid || '');
      await S.write('reports/' + Date.now() + '_' + me + '.json', { by: me, about: m, post: body.post ? String(body.post).slice(0, 24) : undefined, nickname: idx.members[m] && idx.members[m].nickname, reason: clean(body.reason, 500), at: new Date().toISOString() });
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

    if (['feed', 'post', 'like', 'comment', 'delpost', 'delcomment', 'pin', 'notifs', 'vote', 'bookmark', 'edit', 'clike', 'trending'].indexOf(action) !== -1) {
      const staff = isStaff(user);
      const P = await S.read('posts.json', { posts: [] });
      const who = m => { const x = idx.members[m] || {}; return { mid: m, nickname: x.nickname || '', av: x.av || null, country: x.country || '', sub: !!x.sub }; };
      const saves = (soc.saves && soc.saves[me]) || [];
      const outPost = x => ({ id: x.id, author: x.ftm ? { mid: x.a, nickname: 'FTM', ftm: true } : who(x.a), text: x.x, imgs: postImgs(x), img: postImgs(x)[0] || null, t: x.t, edited: !!x.ed, saved: saves.indexOf(x.id) !== -1, tags: tagsOf(x.x),
        poll: x.poll ? { options: x.poll.o.map(o => ({ text: o.t, votes: o.v.length })), total: x.poll.o.reduce((n, o) => n + o.v.length, 0), mine: x.poll.o.findIndex(o => o.v.indexOf(me) !== -1) } : null,
        likes: (x.lk || []).filter(m => !hidden.has(m)).length, liked: (x.lk || []).indexOf(me) !== -1, pinned: !!x.pin, mine: x.a === me, can_delete: x.a === me || staff,
        comments: (x.c || []).filter(c => !hidden.has(c.a)).map(c => ({ id: c.id, author: c.ftm ? { mid: c.a, nickname: 'FTM', ftm: true } : who(c.a), text: c.x, t: c.t, mine: c.a === me, likes: (c.lk || []).length, liked: (c.lk || []).indexOf(me) !== -1, can_delete: c.a === me || x.a === me || staff })) });
      const find = id => P.posts.filter(x => x.id === String(id || ''))[0];
      if (action === 'feed') {
        const sc = String(body.scope || 'all'), fol = new Set(follows);
        let L = P.posts.filter(x => !hidden.has(x.a) && (x.ftm || idx.members[x.a]));
        if (sc === 'following') L = L.filter(x => x.ftm || x.a === me || fol.has(x.a));
        else if (sc === 'ftm') L = L.filter(x => x.ftm);
        else if (sc === 'saved') L = L.filter(x => saves.indexOf(x.id) !== -1);
        else if (sc.charAt(0) === '#') { const tg = sc.slice(1).toLowerCase(); L = L.filter(x => tagsOf(x.x).indexOf(tg) !== -1); }
        else if (sc !== 'all') L = L.filter(x => x.a === sc && !x.ftm);
        if (body.before) L = L.filter(x => x.t < String(body.before));
        L.sort((a, b) => ((b.pin ? 1 : 0) - (a.pin ? 1 : 0)) || String(b.t).localeCompare(String(a.t)));
        return res.status(200).json({ ok: true, staff, posts: L.slice(0, 30).map(outPost), more: L.length > 30 });
      }
      if (action === 'trending') {
        const since = new Date(Date.now() - 14 * 864e5).toISOString(), cnt = {};
        P.posts.filter(x => x.t > since && !hidden.has(x.a)).forEach(x => tagsOf(x.x).forEach(t => { cnt[t] = (cnt[t] || 0) + 1 + (x.lk || []).length * 0.2; }));
        return res.status(200).json({ ok: true, tags: Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, 8) });
      }
      if (action === 'bookmark') {
        const id = String(body.id || ''); if (!find(id)) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
        soc.saves = soc.saves || {}; const L = (soc.saves[me] || []).filter(z => z !== id), on = L.length === (soc.saves[me] || []).length; if (on) L.push(id); soc.saves[me] = L.slice(-300);
        await S.write('social.json', soc); return res.status(200).json({ ok: true, saved: on });
      }
      if (action === 'notifs') {
        const nb = await S.read('notif/' + me + '.json', { items: [], read: '' }), prev = nb.read || '';
        const ftmItems = P.posts.filter(x => x.ftm && x.a !== me && x.t > (mine && mine.since || '')).slice(-30).map(x => ({ k: 'ftm', by: x.a, post: x.id, x: Array.from(x.x || '').slice(0, 90).join(''), t: x.t }));
        const items = nb.items.concat(ftmItems).filter(n => !hidden.has(n.by) && (n.k === 'ftm' || idx.members[n.by])).sort((a, b) => String(b.t).localeCompare(String(a.t))).slice(0, 60)
          .map(n => ({ kind: n.k, by: n.k === 'ftm' ? { mid: n.by, nickname: 'FTM', ftm: true } : who(n.by), post: n.post || null, text: n.x || '', t: n.t, unread: n.t > prev }));
        if (body.read) { nb.read = new Date().toISOString(); await S.write('notif/' + me + '.json', nb); }
        return res.status(200).json({ ok: true, items, unread: items.filter(n => n.unread).length });
      }
      if (!staff && (!mine || !mine.nickname)) return res.status(400).json({ ok: false, error: 'PROFILE_FIRST' });
      if (action === 'post') {
        const text = cleanLong(body.text, 2000), images = (Array.isArray(body.images) ? body.images : (body.image ? [body.image] : [])).slice(0, 4).map(String);
        const pollIn = body.poll && Array.isArray(body.poll.options) ? body.poll.options.map(o => clean(o, 80)).filter(Boolean).slice(0, 4) : null;
        if (pollIn && pollIn.length < 2) return res.status(400).json({ ok: false, error: 'POLL_INVALID' });
        if (!text && !images.length) return res.status(400).json({ ok: false, error: 'EMPTY' });
        if (!staff && !(await isPaid(admin, user.id))) return res.status(403).json({ ok: false, error: 'READ_ONLY' });
        if (!staff && (LINKS.test(text) || SELLING.test(text) || (pollIn && pollIn.some(o => LINKS.test(o))))) return res.status(400).json({ ok: false, error: 'NO_LINKS' });
        const now = Date.now(), hits = (postsSent.get(me) || []).filter(t => now - t < 864e5); if (!staff && hits.length >= 20) return res.status(429).json({ ok: false, error: 'RATE_LIMIT' });
        const id = now.toString(36) + crypto.randomBytes(3).toString('hex'), x = { id, a: me, x: text, t: new Date().toISOString(), lk: [], c: [] };
        if (staff) x.ftm = true;
        const bufs = [];
        for (const img of images) {
          const mm = img.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/); if (!mm) return res.status(400).json({ ok: false, error: 'IMAGE_INVALID' });
          const buf = Buffer.from(mm[1], 'base64'); if (buf.length > 700000 || buf[0] !== 0xFF || buf[1] !== 0xD8) return res.status(400).json({ ok: false, error: 'IMAGE_INVALID' });
          bufs.push(buf);
        }
        for (let i = 0; i < bufs.length; i++) { const r = await within(8000, admin.storage.from(BUCKET).upload('posts/' + id + (i ? '_' + i : '') + '.jpg', bufs[i], { upsert: true, contentType: 'image/jpeg', cacheControl: '31536000' }), 'post image'); if (r.error) throw new Error('POSTIMG: ' + r.error.message); }
        if (bufs.length) { x.img = now.toString(36); x.imgs = bufs.length; }
        if (pollIn) x.poll = { o: pollIn.map(t => ({ t, v: [] })) };
        hits.push(now); postsSent.set(me, hits);
        P.posts.push(x); if (P.posts.length > 600) P.posts = P.posts.filter(p => p.pin).concat(P.posts.filter(p => !p.pin).slice(-580));
        await S.write('posts.json', P);
        return res.status(200).json({ ok: true, post: outPost(x) });
      }
      const x = find(body.id);
      if (!x || hidden.has(x.a)) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      if (action === 'like') {
        x.lk = x.lk || []; const on = x.lk.indexOf(me) === -1; x.lk = x.lk.filter(m => m !== me); if (on) x.lk.push(me);
        await S.write('posts.json', P); if (on && x.a !== me && !x.ftm) await notify(x.a, { k: 'like', by: me, post: x.id });
        return res.status(200).json({ ok: true, post: outPost(x) });
      }
      if (action === 'vote') {
        if (!x.poll) return res.status(400).json({ ok: false, error: 'INVALID' }); const i = +body.i;
        const had = x.poll.o.findIndex(o => o.v.indexOf(me) !== -1); x.poll.o.forEach(o => { o.v = o.v.filter(m => m !== me); });
        if (x.poll.o[i] && had !== i) x.poll.o[i].v.push(me);
        await S.write('posts.json', P); return res.status(200).json({ ok: true, post: outPost(x) });
      }
      if (action === 'edit') {
        if (x.a !== me && !staff) return res.status(403).json({ ok: false, error: 'NOT_YOURS' });
        const text = cleanLong(body.text, 2000); if (!text && !x.img) return res.status(400).json({ ok: false, error: 'EMPTY' });
        if (!staff && (LINKS.test(text) || SELLING.test(text))) return res.status(400).json({ ok: false, error: 'NO_LINKS' });
        x.x = text; x.ed = new Date().toISOString(); await S.write('posts.json', P); return res.status(200).json({ ok: true, post: outPost(x) });
      }
      if (action === 'clike') {
        const c = (x.c || []).filter(z => z.id === String(body.cid || ''))[0]; if (!c) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
        c.lk = c.lk || []; const on = c.lk.indexOf(me) === -1; c.lk = c.lk.filter(m => m !== me); if (on) c.lk.push(me);
        await S.write('posts.json', P); return res.status(200).json({ ok: true, post: outPost(x) });
      }
      if (action === 'comment') {
        const text = cleanLong(body.text, 600); if (!text) return res.status(400).json({ ok: false, error: 'EMPTY' });
        if (!staff && !(await isPaid(admin, user.id))) return res.status(403).json({ ok: false, error: 'READ_ONLY' });
        if (!staff && (LINKS.test(text) || SELLING.test(text))) return res.status(400).json({ ok: false, error: 'NO_LINKS' });
        x.c = x.c || []; const c = { id: Date.now().toString(36) + crypto.randomBytes(2).toString('hex'), a: me, x: text, t: new Date().toISOString() }; if (staff) c.ftm = true;
        x.c.push(c); if (x.c.length > 200) x.c = x.c.slice(-200);
        await S.write('posts.json', P); if (x.a !== me && !x.ftm) await notify(x.a, { k: 'comment', by: me, post: x.id, x: Array.from(text).slice(0, 90).join('') });
        return res.status(200).json({ ok: true, post: outPost(x) });
      }
      if (action === 'delpost') {
        if (x.a !== me && !staff) return res.status(403).json({ ok: false, error: 'NOT_YOURS' });
        P.posts = P.posts.filter(p => p !== x); await S.write('posts.json', P);
        return res.status(200).json({ ok: true });
      }
      if (action === 'delcomment') {
        const c = (x.c || []).filter(z => z.id === String(body.cid || ''))[0]; if (!c) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
        if (c.a !== me && x.a !== me && !staff) return res.status(403).json({ ok: false, error: 'NOT_YOURS' });
        x.c = x.c.filter(z => z !== c); await S.write('posts.json', P);
        return res.status(200).json({ ok: true, post: outPost(x) });
      }
      if (action === 'pin') {
        if (!staff) return res.status(403).json({ ok: false, error: 'NOT_YOURS' });
        x.pin = !x.pin; await S.write('posts.json', P);
        return res.status(200).json({ ok: true, post: outPost(x) });
      }
    }

    return res.status(400).json({ ok: false, error: 'INVALID_ACTION' });
  } catch (e) {
    console.error('community:', action, e && e.message);
    return res.status(500).json({ ok: false, error: 'COMMUNITY_FAILED', detail: String((e && e.message) || '').replace(/[^\w :.-]/g, '').slice(0, 80) });
  }
};
