/* Saturday weekly video (owner 20 Nov): TV newsroom, anchor + video wall with the week's REAL daily results, last Saturday to this Friday.
   WEEK = [[day, pct, trades], ...] from social/tools/week.py (set by weekvid.py). */
const WEEK = window.WEEK || /*__WEEK__*/[];
const WEEKPCT = (WEEK.reduce((f, x) => f * (1 + (x[1] || 0) / 100), 1) - 1) * 100;
const ANCHOR = {skin:'#e0ac69',hair:'#2b1810',hairStyle:'wavy',top:'#1F3A93',top2:'#14214f',ph:.8,collar:'<path d="M-30 -210 L0 -170 L30 -210" stroke="#E3B62F" stroke-width="6" fill="none"/>'};
const fmt = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + '%';
function newsroom(t) {
  let o = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0"><defs>
  <linearGradient id="nbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1238"/><stop offset="1" stop-color="#02040f"/></linearGradient>
  <linearGradient id="desk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26408a"/><stop offset="1" stop-color="#0b1640"/></linearGradient>
  <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f1d55"/><stop offset="1" stop-color="#081034"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#nbg)"/>`;
  for (let i = 0; i < 12; i++) o += `<rect x="${i * 95}" y="330" width="3" height="900" fill="#1F3A93" opacity=".25"/>`;
  for (let i = 0; i < 40; i++) { const x = (i * 211 + t * 30) % W, y = 360 + (i * 97) % 820; o += `<circle cx="${x}" cy="${y}" r="${2 + i % 3}" fill="#E3B62F" opacity="${.15 + .15 * sin(t * 2 + i)}"/>`; }
  return o;
}
function wall(t, mode) {
  const x0 = 90, y0 = 360, w = 900, h = 560, maxV = Math.max(3, ...WEEK.map(x => Math.abs(x[1] || 0)));
  let o = `<g><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="26" fill="url(#wall)" stroke="#D4AF37" stroke-width="4"/>
   <text x="${x0 + 40}" y="${y0 + 64}" font-family="Inter" font-weight="800" font-size="34" fill="#E3B62F" letter-spacing="5">THIS WEEK · FTM MASTER ACCOUNT</text>`;
  const nW = WEEK.length, bw = nW > 5 ? 92 : 120, gap = (w - 80 - bw * nW) / Math.max(1, nW - 1), negRoom = Math.max(0, ...WEEK.map(([, v]) => v != null && v < 0 ? -v / maxV * (WEEK.length > 5 ? 240 : 300) : 0)), base = y0 + h - 90 - negRoom;
  let best = -1e9, worst = 1e9; WEEK.forEach(([, v, n]) => { if (v != null && n !== 0) { best = Math.max(best, v); worst = Math.min(worst, v); } });
  WEEK.forEach(([d, v, n], i) => {
    if (n === 0) v = null;
    const bx = x0 + 40 + i * (bw + gap), g = ease((t - 0.3 - i * 0.35) / 0.6);
    const hh = v == null ? 0 : Math.abs(v) / maxV * (nW > 5 ? 240 : 300) * g, up = v == null || v >= 0;
    const hl = mode === 'best' && v != null && (v === best || v === worst);
    o += `<text x="${bx + bw / 2}" y="${base + negRoom + 50}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="32" fill="#aeb7dc">${d}</text>`;
    if (v == null) o += `<rect x="${bx}" y="${base - 60}" width="${bw}" height="60" rx="12" fill="none" stroke="#aeb7dc" stroke-dasharray="8 8" stroke-width="3"/><text x="${bx + bw / 2}" y="${base - 80}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="20" fill="#aeb7dc">no trades</text>`;
    else o += `<rect x="${bx}" y="${up ? base - hh : base}" width="${bw}" height="${hh}" rx="12" fill="${up ? '#2fbf71' : '#E5323E'}" opacity="${mode === 'best' && !hl ? .35 : 1}"/>
      <text x="${bx + bw / 2}" y="${up ? base - hh - 18 : base - 18}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="${nW > 5 ? 29 : 34}" fill="#fff" opacity="${g}">${fmt(v * g)}</text>
      ${hl ? `<rect x="${bx - 10}" y="${base - hh - 70}" width="${bw + 20}" height="${hh + 80}" rx="16" fill="none" stroke="#E3B62F" stroke-width="5" opacity="${.6 + .4 * sin(t * 6)}"/><text x="${bx + bw / 2}" y="${base - hh - 84}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="26" fill="#E3B62F">${v === best ? 'BEST' : 'LOWEST'}</text>` : ''}`;
  });
  return o + `<rect x="${x0 + 40}" y="${base}" width="${w - 80}" height="3" fill="#aeb7dc" opacity=".5"/></g>`;
}
function ticker(t) { let s = ''; let x = -((t * 180) % 1400); for (let r = 0; r < 3; r++) WEEK.forEach(([d, v, n]) => { s += `<text x="${x}" y="0" font-family="Inter" font-weight="800" font-size="34" fill="#fff">${d.toUpperCase()} ${n === 0 ? '· NO TRADES' : fmt(v)}</text>`; x += 280; }); return `<g transform="translate(0,1270)"><rect x="0" y="-48" width="${W}" height="68" fill="#E5323E"/><rect x="0" y="-48" width="200" height="68" fill="#0b1640"/><text x="24" y="-2" font-family="Inter" font-weight="900" font-size="34" fill="#fff">FTM NEWS</text><g transform="translate(220,0)"><svg x="0" y="-48" width="${W - 220}" height="68" viewBox="0 -48 ${W - 220} 68">${s}</svg></g></g>`; }
function anchorDesk(t, talk) { return person(Object.assign({}, ANCHOR, { x: 540, y: 1300, s: 1.05, t, talk, sit: 1, armL: 25, elL: 60, armR: 25, elR: 60, look: 0, mood: 'smile' })) + `<path d="M150 1060 L930 1060 L990 1230 L90 1230Z" fill="url(#desk)"/><rect x="430" y="1110" width="220" height="60" rx="12" fill="#0b1640" stroke="#D4AF37" stroke-width="3"/><text x="540" y="1152" text-anchor="middle" font-family="Inter" font-weight="900" font-size="36" fill="#fff">FTM</text>`; }
const SCN = {
  hook(t) { const n = Math.min(WEEK.length, Math.floor(t * 3) + 1); return newsroom(t) + `<g transform="translate(540,760)"><circle r="${250 + 10 * sin(t * 4)}" fill="#E3B62F" opacity=".08"/><text x="0" y="80" text-anchor="middle" font-family="Inter" font-weight="900" font-size="300" fill="#E3B62F">${n}</text></g>
   <text text-anchor="middle" font-family="Inter" font-weight="800" font-size="70" fill="#fff"><tspan x="540" y="1000">days. Saturday to Friday.</tspan></text><text text-anchor="middle" font-family="Inter" font-weight="800" font-size="62" fill="#fff" opacity="${ease((t - 1.6) / .4)}"><tspan x="540" y="1120">Every result,</tspan><tspan x="540" y="1200" fill="#E3B62F">good and bad.</tspan></text></svg>`; },
  week(t, d, talk) { return newsroom(t) + wall(t, 'week') + anchorDesk(t, talk) + ticker(t) + '</svg>'; },
  best(t, d, talk) { return newsroom(t) + wall(t + 3, 'best') + anchorDesk(t, talk) + ticker(t) + '</svg>'; },
  total(t, d, talk) { const tot = WEEKPCT; const g = ease(t / 1.2);
    return newsroom(t) + `<g transform="translate(540,640)"><rect x="-430" y="-250" width="860" height="500" rx="40" fill="#0b1640" stroke="#D4AF37" stroke-width="4"/><text x="0" y="-130" text-anchor="middle" font-family="Inter" font-weight="800" font-size="36" fill="#E3B62F" letter-spacing="5">THE WEEK</text><text x="0" y="40" text-anchor="middle" font-family="Inter" font-weight="900" font-size="190" fill="${tot >= 0 ? '#2fbf71' : '#E5323E'}">${fmt(tot * g)}</text><text x="0" y="150" text-anchor="middle" font-family="Inter" font-weight="700" font-size="34" fill="#aeb7dc">closed trades · FTM master account</text></g>` + anchorDesk(t, talk) + ticker(t) + '</svg>'; },
  cta(t, d, talk) { const p = 1 + .04 * sin(t * 5); return newsroom(t) + `<g transform="translate(540,620)"><rect x="-430" y="-230" width="860" height="460" rx="40" fill="#0b1640" stroke="#D4AF37" stroke-width="4"/><text x="0" y="-100" text-anchor="middle" font-family="Inter" font-weight="800" font-size="58" fill="#fff">A new week starts today.</text><text x="0" y="-20" text-anchor="middle" font-family="Inter" font-weight="800" font-size="58" fill="#E3B62F">Will you be in?</text><g transform="translate(0,110) scale(${p})"><rect x="-220" y="-56" width="440" height="112" rx="56" fill="#E5323E"/><text x="0" y="18" text-anchor="middle" font-family="Inter" font-weight="800" font-size="54" fill="#fff">Start free</text></g></g>` + anchorDesk(t, talk) + ticker(t) + '</svg>'; }
};
