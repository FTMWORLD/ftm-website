/* Explainer v3 (owner 20 Nov, evening): a finance-dressed presenter on a stage in front of an audience, an opening with three
   real days (12, 17 and 19 Nov), and the affiliate chapter. Overrides studio() and host() from scn-explainer2.js. */
const HOST2 = { skin: '#8d5524', skinDark: '#6e3f19', hair: '#120c08', hairStyle: 'bun', top: '#0d1a4f', top2: '#070f33', pants: '#0d1a4f', shoes: '#111', ph: .4,
  collar: '<path d="M-36 -214 L0 -146 L36 -214Z" fill="#f4f1ea"/><path d="M-36 -214 L-70 -196 L-22 -96 L0 -146Z" fill="#070f33"/><path d="M36 -214 L70 -196 L22 -96 L0 -146Z" fill="#070f33"/>'
    + [-22, -14, -6, 0, 6, 14, 22].map((x, i) => `<circle cx="${x}" cy="${-206 + Math.abs(x) * -.35 + 22}" r="4.2" fill="#fbf6ea"/>`).join('') + '<rect x="-46" y="-110" width="10" height="10" rx="2" fill="#E3B62F"/>' };
function studio(t, screen) {
  let o = `<defs><linearGradient id="hall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1440"/><stop offset="1" stop-color="#040824"/></linearGradient><linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9b0" stop-opacity=".22"/><stop offset="1" stop-color="#ffe9b0" stop-opacity="0"/></linearGradient><linearGradient id="scr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1F3A93"/><stop offset="1" stop-color="#03061a"/></linearGradient></defs>
    <rect x="-700" y="-100" width="2500" height="1400" fill="url(#hall)"/>`;
  // glass wall with the city at night on the left
  o += `<g opacity=".9"><rect x="-560" y="40" width="520" height="760" fill="#081239"/>`;
  for (let i = 0; i < 9; i++) { const x = -560 + i * 58, h = 200 + (i * 97) % 300; o += `<rect x="${x}" y="${800 - h}" width="50" height="${h}" fill="#0f1d55"/>`; for (let r = 0; r < h / 40 - 1; r++) if ((i + r + Math.floor(t)) % 3 === 0) o += `<rect x="${x + 10 + (r % 2) * 20}" y="${800 - h + 14 + r * 40}" width="10" height="14" fill="#E3B62F" opacity=".5"/>`; }
  for (let i = 0; i < 5; i++) o += `<rect x="${-560 + i * 130}" y="40" width="6" height="760" fill="#1b2a66"/>`;
  o += `</g>`;
  // spotlights
  [[300, .9], [1000, .7], [1500, .8]].forEach(([x, a], i) => { o += `<path d="M${x - 30} -40 L${x + 30} -40 L${x + 260} 1000 L${x - 260} 1000Z" fill="url(#beam)" opacity="${a * (.75 + .25 * sin(t * .7 + i))}"/>`; });
  // the big LED wall
  o += `<g transform="translate(560,70)"><rect x="-14" y="-14" width="1028" height="668" rx="20" fill="#020414"/><rect x="0" y="0" width="1000" height="640" rx="12" fill="#03061a"/><rect x="0" y="0" width="1000" height="640" rx="12" fill="url(#scr)" opacity=".45"/>${screen || ''}</g>`;
  // ticker band under the screen
  const tk = ['GOLD', 'BITCOIN', 'US TECH 100', 'USD/JPY', 'HANG SENG 50', 'FTM MACHINE', 'FOLLOW THE MARKET'];
  let tape = '', W = 0; const lens = tk.map(w => w.length * 17 + 90), cyc = lens.reduce((a, b) => a + b, 0); for (let r = 0; r < 3; r++) tk.forEach((w, i) => { const x = ((W - t * 90) % (cyc * 3) + cyc * 3) % (cyc * 3) - 700; W += lens[i]; tape += `<text x="${x}" y="760" font-family="Inter" font-weight="800" font-size="24" fill="${i % 2 ? '#E3B62F' : '#7fb2ff'}" letter-spacing="3">${w}</text>`; });
  o += `<rect x="-700" y="728" width="2500" height="48" fill="#050a26"/>${tape}`;
  // stage
  o += `<rect x="-700" y="860" width="2500" height="400" fill="#0b1640"/><rect x="-700" y="860" width="2500" height="4" fill="#E3B62F" opacity=".7"/><ellipse cx="200" cy="980" rx="260" ry="40" fill="#E3B62F" opacity=".08"/>`;
  return o;
}
function audience(t) {
  let o = ''; [[1150, 1.15, '#060c2c'], [1225, 1.4, '#030719']].forEach(([y, s, c], row) => {
    for (let i = 0; i < 13; i++) { const x = -620 + i * 190 + row * 95 + ((i * 37) % 30), b = 4 * sin(t * 1.3 + i * 1.7 + row), ph = (i * 7 + row * 3) % 9 === 0;
      o += `<g transform="translate(${x},${y + b}) scale(${s})"><ellipse cx="0" cy="40" rx="78" ry="60" fill="${c}"/><circle cx="0" cy="-30" r="38" fill="${c}"/><path d="M-36 -40 q36 -30 72 0" stroke="#3a5bd0" stroke-opacity=".55" stroke-width="4" fill="none"/>${ph ? `<rect x="30" y="-6" width="26" height="44" rx="5" fill="#9cc7ff" opacity="${.45 + .2 * sin(t * 3 + i)}" transform="rotate(-12 43 16)"/>` : ''}</g>`; } });
  return o;
}
function host(t, talk, o) {
  o = o || {}; const wave = o.wave && t < 1.6;
  const armR = wave ? 150 + 14 * sin(t * 9) : 30 + 34 * talk + 10 * sin(t * 1.6), elR = wave ? 30 : 70 + 26 * talk;
  const armL = 10 + 8 * sin(t * 1.2 + 1), elL = 60 + 18 * sin(t * 1.05);
  return P(HOST2, { x: o.x || 190, y: o.y || 1010, s: o.s || 2.05, t, talk, mood: 'smile', look: .35 + .1 * sin(t * .6), armL, elL, armR, elR, tilt: 1.2 * sin(t * .8) }) + audience(t);
}
Object.assign(SCN, {
  hook(t, d, talk) {
    const D3 = [['12 November', T12, 0], ['17 November', T17, d * .26], ['19 November', { pct: 1.7, n: 15, rows: T19 }, d * .48]];
    let cards = ''; D3.forEach(([lab, day, at], k) => { const a = k === 0 ? 1 : ex((t - at) / .5), x = -490 + k * 690, cnt = day.pct * ex(cl((t - at) / 1.6)), won = day.rows.filter(r => r[3] > 0).length;
      let rows = ''; day.rows.slice().sort((p, q) => q[3] - p[3]).slice(0, 3).forEach((r, j) => { const b = ex((t - at - .5 - j * .25) / .4); rows += `<g opacity="${b}" transform="translate(30,${330 + j * 78})"><rect width="580" height="64" rx="12" fill="rgba(255,255,255,.06)"/><text x="18" y="41" font-family="Inter" font-weight="700" font-size="22" fill="#aeb7dc">${r[0]}</text><text x="100" y="41" font-family="Inter" font-weight="800" font-size="24" fill="#fff">${r[1]}</text><text x="330" y="41" font-family="Inter" font-weight="900" font-size="18" fill="${r[2] === 'BUY' ? '#5fe39b' : '#ff8a92'}">${r[2]}</text><text x="560" y="42" text-anchor="end" font-family="Inter" font-weight="900" font-size="24" fill="#E3B62F">+$${r[3].toLocaleString('en-US', { minimumFractionDigits: 2 })}</text></g>`; });
      cards += `<g opacity="${a}" transform="translate(${x},${235 + (1 - a) * 60})"><rect width="640" height="575" rx="30" fill="rgba(3,6,26,.82)" stroke="${k === 0 ? '#E3B62F' : 'rgba(212,175,55,.45)'}" stroke-width="${k === 0 ? 4 : 2}"/><text x="32" y="64" font-family="Inter" font-weight="800" font-size="30" fill="#E3B62F" letter-spacing="2">${lab.toUpperCase()}</text><text x="30" y="200" font-family="Inter" font-weight="900" font-size="128" fill="#5fe39b" letter-spacing="-4">+${cnt.toFixed(2)}%</text><text x="34" y="270" font-family="Inter" font-weight="700" font-size="30" fill="#c9d0ee">${day.n} trades · ${won} won</text>${rows}</g>`; });
    const end = ex((t - d * .74) / .5);
    return { bg: 'radial-gradient(120% 90% at 30% 20%,#16307a 0%,#060c2a 60%,#01030c 100%)', zoom: 1 + .035 * cl(t / d), core: `${amb(t)}<text x="540" y="175" text-anchor="middle" font-family="Inter" font-weight="900" font-size="84" fill="#fff" letter-spacing="-3">3 days. <tspan fill="#E3B62F">31 trades.</tspan></text>${cards}<g opacity="${end}"><rect x="-500" y="845" width="2040" height="110" rx="55" fill="#E3B62F"/><text x="520" y="918" text-anchor="middle" font-family="Inter" font-weight="900" font-size="54" fill="#0b1640">Nobody sat in front of a chart.</text></g>` };
  },
  host4(t, d, talk) {
    const it = (i, a, b) => `<g opacity="${ex((t - .3 - i * .35) / .4)}" transform="translate(${90 + i * 300},280)"><circle cx="110" cy="70" r="70" fill="#13246a" stroke="#E3B62F" stroke-width="3"/>${a}<text x="110" y="200" text-anchor="middle" font-family="Inter" font-weight="800" font-size="30" fill="#fff">${b}</text></g>`;
    const scr = `<text x="500" y="150" text-anchor="middle" font-family="Inter" font-weight="900" font-size="72" fill="#E3B62F">Earn with FTM</text>${it(0, '<g transform="translate(110,70) rotate(-35)" fill="none" stroke="#E3B62F" stroke-width="9"><rect x="-44" y="-16" width="50" height="32" rx="16"/><rect x="-6" y="-16" width="50" height="32" rx="16"/></g>', 'Refer')}${it(1, '<g fill="#E3B62F"><circle cx="88" cy="56" r="16"/><circle cx="132" cy="56" r="16"/><path d="M58 104 q30 -40 60 0z M102 104 q30 -40 60 0z"/></g>', 'Community')}${it(2, '<g><circle cx="110" cy="70" r="36" fill="#E3B62F"/><text x="110" y="86" text-anchor="middle" font-family="Inter" font-weight="900" font-size="44" fill="#0b1640">$</text></g>', 'Local agent')}`;
    return { bg: '#071033', zoom: 1 + .03 * cl(t / d), core: studio(t, scr) + host(t, talk) };
  },
  affiliate(t, d, talk) {
    const card = (i, at, title, sub, pts, col) => { const a = ex((t - at) / .55); return `<g opacity="${a}" transform="translate(${-480 + i * 700},${300 + (1 - a) * 70})"><rect width="640" height="560" rx="30" fill="rgba(3,6,26,.85)" stroke="${col}" stroke-width="3"/><text x="40" y="80" font-family="Inter" font-weight="900" font-size="48" fill="#fff">${title}</text><text x="40" y="130" font-family="Inter" font-weight="700" font-size="28" fill="${col}">${sub}</text>${pts.map((p, j) => `<g opacity="${ex((t - at - .5 - j * .3) / .4)}"><circle cx="58" cy="${214 + j * 92}" r="18" fill="${col}"/><path d="M48 ${214 + j * 92} l8 8 l14 -16" stroke="#0b1640" stroke-width="5" fill="none"/><text x="92" y="${224 + j * 92}" font-family="Inter" font-weight="800" font-size="30" fill="#fff">${p}</text></g>`).join('')}</g>`; };
    const badge = `<g transform="translate(540,170)"><rect x="-430" y="-56" width="860" height="112" rx="56" fill="#0b1640" stroke="#E3B62F" stroke-width="3"/><text y="16" text-anchor="middle" font-family="Inter" font-weight="900" font-size="44" fill="#fff">FTM · master affiliate of <tspan fill="#E3B62F">Deriv</tspan></text></g>`;
    return { bg: DEEP, zoom: camera(t, d, .025), core: `${amb(t)}${badge}
      ${card(0, .3, 'Affiliate', 'Refer people, earn commission', ['Revenue share, CPA or both', 'Your link the same day', 'Marketing kit included', 'Help from our team'], '#E3B62F')}
      ${card(1, d * .55, 'Introducing broker', 'Bring your community', ['Earn on what members trade', 'Tiered rewards', 'Sub-affiliate tracking', 'Your own partner manager'], '#5fe39b')}
      ${card(2, d * .76, 'Payment agent', 'Local deposits and withdrawals', ['Help people near you', 'Set your own fee', 'Verified agent listing', 'Fast settlement'], '#7fb2ff')}
      <text x="540" y="935" text-anchor="middle" font-family="Inter" font-weight="700" font-size="24" fill="#8f98c0" opacity="${ex((t - d * .8) / .5)}">Commission terms are set by Deriv.</text>` };
  }
});
