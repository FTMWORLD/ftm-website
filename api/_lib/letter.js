/* The monthly Letter from FTM: drafts, translation into each member's language (once per language, stored),
   the designed email, and the record of what was sent. Used by /api/v1/staff (ops letter_*). */
const P = require('./push');
const Mail = require('./mail');
const Tpl = require('./passwordEmail');

const LANG_EN = { en: 'English', ar: 'Arabic', fr: 'French', es: 'Spanish', pt: 'Portuguese', ru: 'Russian', it: 'Italian', vi: 'Vietnamese', de: 'German', bn: 'Bengali', sw: 'Swahili', ko: 'Korean', pl: 'Polish', si: 'Sinhala', zh: 'Chinese (Simplified, Mandarin)', 'zh-tw': 'Chinese (Traditional, Taiwan)', mn: 'Mongolian', ta: 'Tamil', hi: 'Hindi', id: 'Indonesian', ur: 'Urdu', ja: 'Japanese', tr: 'Turkish', nl: 'Dutch', uk: 'Ukrainian', ro: 'Romanian', th: 'Thai', he: 'Hebrew', el: 'Greek', cs: 'Czech', sv: 'Swedish', hu: 'Hungarian', ms: 'Malay', fil: 'Filipino (Tagalog)', fa: 'Persian (Farsi)', mr: 'Marathi', te: 'Telugu', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi', ne: 'Nepali', my: 'Burmese (Myanmar)', km: 'Khmer', uz: 'Uzbek', ha: 'Hausa', yo: 'Yoruba', ig: 'Igbo', am: 'Amharic', zu: 'Zulu' };
const RTL = new Set(['ar', 'he', 'fa', 'ur']);
const INDEX = 'letters/index.json';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function langOf(u, box) {
  const m = (u && u.user_metadata) || {};
  let l = String(m.ftm_lang || '').toLowerCase();
  if (!LANG_EN[l] && box && box.subs && box.subs.length) l = String(box.subs[box.subs.length - 1].lang || '').toLowerCase();
  return LANG_EN[l] ? l : 'en';
}
function monthName(ym) { const a = String(ym || '').split('-'); const m = +a[1]; return m >= 1 && m <= 12 ? MONTHS[m - 1] + ' ' + a[0] : ''; }

/* The English words of one letter. Every visible word of the email is here, so a translation covers all of it. */
function words(L) {
  const mn = monthName(L.month);
  return {
    subject: 'Letter from FTM: ' + mn, kicker: 'Letter from FTM', month: mn, title: L.title, hello: 'Hello', intro: L.intro,
    h_did: 'What FTM MACHINE did', did: L.did, h_changed: 'What changed and why', changed: L.changed, h_next: 'What comes next', next: L.next,
    f_month: 'This month', f_ytd: 'Since 1 January', f_trades: 'Trades', f_win: 'Winning trades', f_src: 'FTM master account. Figures from the FTM engine, time-weighted: deposits and withdrawals do not change them.',
    button: 'See your own month', sign_for: 'For everyone at FTM'
  };
}

async function translate(W, lang) {
  if (lang === 'en') return W;
  const Anthropic = require('@anthropic-ai/sdk'); const client = new Anthropic();
  const keys = Object.keys(W).filter(k => W[k]);
  const src = {}; keys.forEach(k => { src[k] = W[k]; });
  const r = await client.beta.messages.create({
    model: 'claude-opus-5-5', max_tokens: 6000, output_config: { effort: 'low' }, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
    system: 'You translate the monthly letter of FTM (Follow The Market), a financial company, for its members. Translate every JSON value into ' + LANG_EN[lang] + '. '
      + 'Write natural, warm, professional language a native speaker would use for a letter from their financial company. Keep the meaning exact: no added promises, guarantees or claims. '
      + 'Keep these names exactly as they are: FTM, FTM MACHINE, FTM engine, MT5, Growth 2×, and every person\'s name. Keep every number, %, currency code and date figure exactly. Keep line breaks. '
      + 'Call customers "members" or "people", never "traders". Answer with the JSON object only, same keys, no other text.',
    messages: [{ role: 'user', content: JSON.stringify(src) }]
  });
  const txt = r.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
  const j = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
  const out = Object.assign({}, W); keys.forEach(k => { if (typeof j[k] === 'string' && j[k].trim()) out[k] = j[k].trim(); });
  return out;
}

function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function paras(t) { return String(t || '').split(/\n{2,}/).map(s => s.trim()).filter(Boolean).map(s => '<p style="font-size:16px;line-height:1.6;color:#333;margin:0 0 14px;">' + esc(s).replace(/\n/g, '<br>') + '</p>').join(''); }
function pct(v) { if (v == null || !isFinite(+v)) return '—'; const n = +v; return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(2) + '%'; }

/* The email. W = words in the member's language, L = the letter (figures), name = the member's first name. */
function html(L, W, name, lang) {
  const f = L.figs || {}, rtl = RTL.has(lang), dir = rtl ? ' dir="rtl"' : '', al = rtl ? 'right' : 'left';
  const H3 = t => '<p style="font-size:18px;font-weight:bold;color:#0b1640;margin:28px 0 10px;">' + esc(t) + '</p>';
  const cell = (label, value, up) => '<td width="25%" valign="top" style="padding:14px 10px;text-align:center;"><p style="margin:0;font-size:22px;font-weight:bold;color:' + (up === true ? '#E3B62F' : '#ffffff') + ';font-family:Arial,Helvetica,sans-serif;">' + esc(value) + '</p><p style="margin:6px 0 0;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#aab3d6;">' + esc(label) + '</p></td>';
  const hasFigs = f.month_pct != null || f.ytd_pct != null;
  const figs = hasFigs ? '<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#0b1640" style="background-color:#0b1640;border-radius:14px;margin:8px 0 6px;"><tr>'
    + cell(W.f_month, pct(f.month_pct), +f.month_pct > 0) + cell(W.f_ytd, pct(f.ytd_pct), +f.ytd_pct > 0) + cell(W.f_trades, f.trades != null ? String(f.trades) : '—') + cell(W.f_win, f.win_pct != null ? Math.round(f.win_pct) + '%' : '—')
    + '</tr></table><p style="font-size:12px;line-height:1.5;color:#777;margin:0 0 6px;">' + esc(W.f_src) + '</p>' : '';
  const first = name ? String(name).split(' ')[0] : '';
  const body = '<div' + dir + ' style="text-align:' + al + ';">'
    + '<p style="margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#B8902A;font-weight:bold;">' + esc(W.kicker) + ' · ' + esc(W.month) + '</p>'
    + '<p style="font-size:16px;line-height:1.6;color:#333;margin:14px 0 14px;">' + esc(W.hello) + (first ? ' ' + esc(first) : '') + ',</p>'
    + paras(W.intro) + figs
    + (W.did ? H3(W.h_did) + paras(W.did) : '') + (W.changed ? H3(W.h_changed) + paras(W.changed) : '') + (W.next ? H3(W.h_next) + paras(W.next) : '')
    + '<table cellpadding="0" cellspacing="0" style="margin:24px 0 26px;"><tr><td bgcolor="#E5323E" style="border-radius:999px;"><a href="https://www.ftmwealthnation.com/?open=calendar" style="display:inline-block;padding:15px 30px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:999px;">' + esc(W.button) + '</a></td></tr></table>'
    + '<p style="font-size:16px;line-height:1.5;color:#0b1640;margin:0 0 4px;font-weight:bold;">' + esc(L.sign || 'FTM') + '</p><p style="font-size:14px;color:#777;margin:0 0 18px;">' + esc(W.sign_for) + '</p></div>';
  return Tpl.shell(W.title, body);
}

async function readIndex(admin) { return P.read(admin, INDEX, { items: [] }); }
async function get(admin, id) { return /^[a-z0-9]{6,24}$/.test(String(id || '')) ? P.read(admin, 'letters/' + id + '.json', null) : null; }
async function save(admin, L) {
  await P.write(admin, 'letters/' + L.id + '.json', L);
  const ix = await readIndex(admin), row = { id: L.id, month: L.month, title: L.title, status: L.status, at: L.updated, by: L.by, sent: L.sent || null };
  const i = ix.items.findIndex(x => x.id === L.id); if (i === -1) ix.items.push(row); else ix.items[i] = row;
  ix.items.sort((a, b) => String(b.month).localeCompare(String(a.month)) || String(b.at).localeCompare(String(a.at))); ix.items = ix.items.slice(0, 60);
  await P.write(admin, INDEX, ix);
}
async function wordsFor(admin, L, lang) {
  if (lang === 'en') return words(L);
  const key = 'letters/' + L.id + '-' + lang + '.json', c = await P.read(admin, key, null);
  if (c && c.v === L.v && c.w) return c.w;
  return null;
}
async function prepare(admin, L, lang) {
  const hit = await wordsFor(admin, L, lang); if (hit) return { lang, cached: true };
  const w = await translate(words(L), lang);
  await P.write(admin, 'letters/' + L.id + '-' + lang + '.json', { v: L.v, at: new Date().toISOString(), w });
  return { lang, cached: false };
}
/* One member: in their language when that translation is ready, otherwise in English. Once per letter per member. */
async function sendTo(admin, L, u) {
  const mid = P.midOf(u.id), box = await P.getBox(admin, mid), lang = langOf(u, box);
  const hit = await wordsFor(admin, L, lang), W = hit || words(L), used = hit ? lang : 'en';
  const meta = u.user_metadata || {};
  const via = await Mail.sendMail({ to: u.email, subject: W.subject, html: html(L, W, meta.full_name || meta.name || '', used) });
  return { via, lang: used };
}

module.exports = { LANG_EN, RTL, words, translate, html, get, save, readIndex, prepare, sendTo, langOf, monthName, wordsFor };
