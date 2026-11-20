/* Explainer v2 (owner 20 Nov): a human host, a cold open with last Thursday's real trades, benefit-led follow and a QR / link
   to the free account. Loaded after scn-ad.js, scn-explainer.js, qr.js and trades19.js. */
const HOST = { skin: '#8d5524', skinDark: '#6e3f19', hair: '#120c08', hairStyle: 'long', top: '#152a7a', top2: '#0b1640', ph: .4,
  collar: '<path d="M-30 -214 L0 -170 L30 -214" stroke="#f4f1ea" stroke-width="12" fill="none"/><circle cx="0" cy="-150" r="7" fill="#E3B62F"/>' };
function studio(t, screen) {
  let o = `<rect x="-700" y="-100" width="2500" height="1400" fill="#071033"/>`;
  for (let i = 0; i < 18; i++) { const x = (i * 377) % 2200 - 560, y = 80 + (i * 211) % 700, r = 30 + (i * 13) % 70; o += `<circle cx="${x + 20 * sin(t * .3 + i)}" cy="${y}" r="${r}" fill="${i % 3 ? '#E3B62F' : '#4f7dff'}" opacity="${.05 + .04 * (.5 + .5 * sin(t * .8 + i))}"/>`; }
  o += `<rect x="-700" y="930" width="2500" height="400" fill="#0b1640"/><rect x="-700" y="930" width="2500" height="3" fill="#E3B62F" opacity=".35"/>`;
  o += `<g transform="translate(560,120)"><rect x="0" y="0" width="1000" height="640" rx="26" fill="#03061a" stroke="rgba(212,175,55,.5)" stroke-width="3"/><rect x="0" y="0" width="1000" height="640" rx="26" fill="url(#scr)" opacity=".35"/><defs><linearGradient id="scr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1F3A93"/><stop offset="1" stop-color="#03061a"/></linearGradient></defs>${screen || ''}</g>`;
  return o;
}
function host(t, talk, o) {
  o = o || {}; const g = talk > .25 ? 1 : 0, wave = o.wave && t < 1.6;
  const armR = wave ? 150 + 14 * sin(t * 9) : 22 + 26 * talk + 8 * sin(t * 1.7), elR = wave ? 30 : 55 + 30 * talk;
  const armL = 12 + 10 * sin(t * 1.3 + 1) + 14 * talk * g, elL = 40 + 20 * sin(t * 1.1);
  return P(HOST, { x: o.x || 120, y: o.y || 1430, s: o.s || 3.25, t, talk, mood: 'smile', look: .25 + .1 * sin(t * .7), armL, elL, armR, elR, tilt: 1.5 * sin(t * .9) });
}
function qr(x, y, size, label) {
  const n = QR.length, c = size / n; let o = `<g transform="translate(${x},${y})"><rect x="-18" y="-18" width="${size + 36}" height="${size + 36}" rx="18" fill="#fff"/>`;
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (QR[r][k]) o += `<rect x="${(k * c).toFixed(2)}" y="${(r * c).toFixed(2)}" width="${(c + .3).toFixed(2)}" height="${(c + .3).toFixed(2)}" fill="#0b1640"/>`;
  return o + (label ? `<text x="${size / 2}" y="${size + 62}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="28" fill="#fff">${label}</text>` : '') + '</g>';
}
function followPill(t, x, y, a) { return `<g transform="translate(${x},${y})" opacity="${a}"><rect x="-330" y="-40" width="660" height="80" rx="40" fill="#0b1640" stroke="#E3B62F" stroke-width="3"/><g transform="translate(-280,0) rotate(${12 * sin(t * 6)})"><path d="M-14 8 q0 -26 14 -26 q14 0 14 26 l6 6 h-40z" fill="#E3B62F"/><circle cy="20" r="5" fill="#E3B62F"/></g><text x="20" y="11" text-anchor="middle" font-family="Inter" font-weight="800" font-size="30" fill="#fff">Follow: every day's real result, 11 p.m.</text></g>`; }
const lower = (t, title, sub) => `<g opacity="${ex((t - .3) / .5)}" transform="translate(${-520 + 40 * (1 - ex((t - .3) / .5))},1010)"><rect width="640" height="96" rx="16" fill="#0b1640" stroke="rgba(212,175,55,.6)" stroke-width="2"/><rect width="10" height="96" rx="5" fill="#E3B62F"/><text x="34" y="44" font-family="Inter" font-weight="900" font-size="34" fill="#fff">${title}</text><text x="34" y="80" font-family="Inter" font-weight="700" font-size="24" fill="#E3B62F">${sub}</text></g>`;

Object.assign(SCN, {
  hook(t, d, talk) {
    // frame 1 already shows the hook; then the real trades of Thursday 19 Nov fly in, the day total counts up
    const n = Math.min(T19.length, Math.floor(t * 1.7) + 3); let rows = '';
    T19.slice(0, n).forEach((r, i) => { const a = ex((t - (i - 3) / 1.7) / .35), y = 250 + (i % 8) * 92 - 0, col = i < 8 ? 0 : 1; if (i >= 8 && n <= 8) return;
      const x = 500 + col * 525; rows += `<g opacity="${i < 3 ? 1 : a}" transform="translate(${x + 40 * (1 - (i < 3 ? 1 : a))},${y})"><rect width="505" height="76" rx="14" fill="rgba(255,255,255,.06)"/><text x="18" y="48" font-family="Inter" font-weight="700" font-size="24" fill="#aeb7dc">${r[0]}</text><text x="100" y="48" font-family="Inter" font-weight="800" font-size="26" fill="#fff">${r[1]}</text><rect x="262" y="22" width="70" height="34" rx="17" fill="${r[2] === 'BUY' ? 'rgba(47,191,113,.25)' : 'rgba(229,50,62,.28)'}"/><text x="297" y="46" text-anchor="middle" font-family="Inter" font-weight="900" font-size="18" fill="${r[2] === 'BUY' ? '#5fe39b' : '#ff8a92'}">${r[2]}</text><text x="492" y="48" text-anchor="end" font-family="Inter" font-weight="900" font-size="26" fill="${r[3] >= 0 ? '#E3B62F' : '#ff8a92'}">${r[3] >= 0 ? '+' : '−'}$${Math.abs(r[3]).toLocaleString('en-US', { minimumFractionDigits: 2 })}</text></g>`; });
    const pct = 1.7 * ex(cl((t - 2) / (d * .7)));
    return { bg: 'radial-gradient(120% 90% at 30% 30%,#16307a 0%,#060c2a 60%,#01030c 100%)', zoom: 1 + .04 * cl(t / d), core: `${amb(t)}
      <text x="-500" y="300" font-family="Inter" font-weight="900" font-size="140" fill="#fff" letter-spacing="-5">15 trades.</text>
      <text x="-500" y="440" font-family="Inter" font-weight="900" font-size="140" fill="#E3B62F" letter-spacing="-5">1 day.</text>
      <text x="-496" y="530" font-family="Inter" font-weight="800" font-size="40" fill="#c9d0ee">Thursday, 19 November · FTM master account</text>
      ${rows}
      <g opacity="${ex((t - 2) / .6)}"><text x="-500" y="760" font-family="Inter" font-weight="800" font-size="36" fill="#aeb7dc">The day</text><text x="-500" y="900" font-family="Inter" font-weight="900" font-size="150" fill="#5fe39b">+${pct.toFixed(2)}%</text></g>
      ${t > d * .78 ? `<text x="-496" y="980" font-family="Inter" font-weight="800" font-size="40" fill="#fff" opacity="${ex((t - d * .78) / .5)}">Nobody watched a chart.</text>` : ''}` };
  },
  host1(t, d, talk) {
    const scr = `<text x="500" y="230" text-anchor="middle" font-family="Inter" font-weight="900" font-size="90" fill="#fff">5 minutes.</text><text x="500" y="340" text-anchor="middle" font-family="Inter" font-weight="900" font-size="72" fill="#E3B62F">Real numbers.</text><text x="500" y="440" text-anchor="middle" font-family="Inter" font-weight="800" font-size="56" fill="#c9d0ee" opacity="${ex((t - d * .35) / .5)}">Bad days included.</text><text x="500" y="560" text-anchor="middle" font-family="Inter" font-weight="800" font-size="40" fill="#5fe39b" opacity="${ex((t - d * .7) / .5)}">Watch it live, free.</text>`;
    return { bg: '#071033', zoom: 1 + .03 * cl(t / d), core: studio(t, scr) + host(t, talk, { wave: 1 }) + lower(t, 'FTM', 'Follow The Market') };
  },
  host2(t, d, talk) {
    let bars = ''; for (let i = 0; i < 12; i++) { const h = 60 + ((i * 53) % 220), red = [3, 7].indexOf(i) >= 0, a = ex((t - .3 - i * .08) / .4); bars += `<rect x="${90 + i * 72}" y="${520 - h * a}" width="52" height="${h * a}" rx="8" fill="${red ? '#E5323E' : '#2fbf71'}"/>`; }
    const scr = `<text x="500" y="150" text-anchor="middle" font-family="Inter" font-weight="900" font-size="64" fill="#fff">Our numbers</text><text x="500" y="220" text-anchor="middle" font-family="Inter" font-weight="800" font-size="44" fill="#ff8a92" opacity="${ex((t - d * .5) / .5)}">and the red days too</text>${bars}`;
    return { bg: '#071033', zoom: 1 + .03 * cl(t / d), core: studio(t, scr) + host(t, talk) };
  },
  host3(t, d, talk) {
    const step = (i, txt, c) => `<g opacity="${ex((t - .4 - i * d * .22) / .5)}" transform="translate(110,${190 + i * 140})"><circle r="40" fill="${c}"/><text y="14" text-anchor="middle" font-family="Inter" font-weight="900" font-size="38" fill="#0b1640">${i + 1}</text><text x="70" y="14" font-family="Inter" font-weight="800" font-size="46" fill="#fff">${txt}</text></g>`;
    const scr = `<text x="500" y="100" text-anchor="middle" font-family="Inter" font-weight="900" font-size="54" fill="#E3B62F">Try it first, free</text>${step(0, 'Free account: just your email', '#E3B62F')}${step(1, 'Watch the master trade live', '#E3B62F')}${step(2, 'Start only if you like it', '#2fbf71')}`;
    return { bg: '#071033', zoom: 1 + .03 * cl(t / d), core: studio(t, scr) + host(t, talk) };
  },
  cta(t, d, talk) {
    const p = 1 + .045 * sin(t * 5);
    const scr = `<text x="380" y="130" text-anchor="middle" font-family="Inter" font-weight="900" font-size="56" fill="#fff">Open your free account</text><g transform="translate(380,250) scale(${p})"><rect x="-230" y="-56" width="460" height="112" rx="56" fill="#E5323E"/><text y="18" text-anchor="middle" font-family="Inter" font-weight="900" font-size="48" fill="#fff">Tap the link below</text></g><text x="380" y="400" text-anchor="middle" font-family="Inter" font-weight="800" font-size="40" fill="#E3B62F">ftmwealthnation.com</text><text x="380" y="470" text-anchor="middle" font-family="Inter" font-weight="700" font-size="28" fill="#c9d0ee">On a TV or laptop? Scan the code →</text>${qr(760, 150, 200, 'Scan')}${followPill(t, 500, 570, ex((t - d * .55) / .5))}`;
    return { bg: '#071033', nocap: 0, zoom: 1 + .02 * cl(t / d), core: studio(t, scr) + host(t, talk) };
  },
  endcard(t, d) {
    const a1 = ex((t - .2) / .6), a2 = ex((t - .5) / .6), play = 1 + .06 * sin(t * 4);
    const watch = `<g opacity="${a1}" transform="translate(-260,${460 + (1 - a1) * 40})"><rect x="-10" y="-10" width="620" height="368" rx="26" fill="#E3B62F" opacity=".9"/><clipPath id="ecw"><rect width="600" height="338" rx="20"/></clipPath><image href="${ENDIMG}" width="600" height="338" preserveAspectRatio="xMidYMid slice" clip-path="url(#ecw)"/><rect width="600" height="338" rx="20" fill="#000" opacity=".25"/><g transform="translate(300,169) scale(${play})"><circle r="56" fill="#E5323E"/><path d="M-16 -26 L30 0 L-16 26Z" fill="#fff"/></g><text x="300" y="410" text-anchor="middle" font-family="Inter" font-weight="900" font-size="38" fill="#fff">Watch next: Meet FTM MACHINE</text></g>`;
    const phone = `<g opacity="${a2}" transform="translate(600,${440 + (1 - a2) * 40})"><rect x="0" y="0" width="340" height="470" rx="40" fill="#000" stroke="#D4AF37" stroke-opacity=".7" stroke-width="4"/><rect x="14" y="14" width="312" height="442" rx="30" fill="#13246a"/><text x="170" y="80" text-anchor="middle" font-family="Inter" font-weight="800" font-size="22" fill="#E3B62F" letter-spacing="2">TODAY · 11 P.M.</text><text x="170" y="170" text-anchor="middle" font-family="Inter" font-weight="900" font-size="64" fill="#5fe39b">+1.70%</text><text x="170" y="215" text-anchor="middle" font-family="Inter" font-weight="700" font-size="21" fill="#c9d0ee">15 trades · every one shown</text><g transform="translate(170,320)"><rect x="-110" y="-36" width="220" height="72" rx="36" fill="#E5323E"/><g transform="translate(-70,0) rotate(${14 * sin(t * 6)})"><path d="M-12 7 q0 -22 12 -22 q12 0 12 22 l5 5 h-34z" fill="#fff"/></g><text x="16" y="11" text-anchor="middle" font-family="Inter" font-weight="900" font-size="30" fill="#fff">Follow</text></g><text x="170" y="420" text-anchor="middle" font-family="Inter" font-weight="700" font-size="20" fill="#c9d0ee">Tomorrow's result finds you</text></g>`;
    return { bg: DEEP, nocap: 1, core: `${amb(t)}${particles(t, 40, GOLD, 120)}${LOGO(540, 150, .9, 0)}<text x="540" y="300" text-anchor="middle" font-family="Inter" font-weight="900" font-size="60" fill="#fff">Tomorrow's real result: 11 p.m.</text><text x="540" y="370" text-anchor="middle" font-family="Inter" font-weight="800" font-size="40" fill="#E3B62F">Follow so it finds you.</text>${watch}${phone}${qr(1170, 490, 230, 'Free account')}<text x="540" y="1040" text-anchor="middle" font-family="Inter" font-weight="800" font-size="36" fill="#c9d0ee">ftmwealthnation.com · Invest today, secure tomorrow.</text>` };
  }
});
// live result with the follow reason under it
const _present = SCN.present;
SCN.present = function (t, d, talk) { const r = _present(t, d, talk); r.core += followPill(t, 540, 1010, ex((t - d * .72) / .5)); return r; };
/* The record, all three risk profiles (owner 20 Nov): Portfolio backtest 2020–2026, log scale, each line with its total and
   its deepest drop, as on the website's performance report. */
SCN.past = function (t, d, talk) {
  const P3 = [['Conservative', 1772, -12.01, '#7fb2ff', Math.log10(18.72)], ['Balanced', 12137, -22.26, '#E3B62F', Math.log10(122.37)], ['Growth', 98644, -39.13, '#5fe39b', Math.log10(987.44)]];
  const X = i => -440 + i * 200, Y = v => 860 - v / 3.1 * 560, yrs = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const shape = j => { const k = j / 60; return Math.pow(k, 1.15) + .025 * sin(j * .9) - (k > .3 && k < .4 ? .05 : 0); };
  let o = yrs.map((y, i) => `<line x1="${X(i)}" y1="290" x2="${X(i)}" y2="870" stroke="#fff" stroke-opacity=".05"/><text x="${X(i)}" y="910" text-anchor="middle" font-family="Inter" font-weight="700" font-size="26" fill="#aeb7dc">${y}</text>`).join('');
  P3.forEach((p, n) => { const pts = []; for (let j = 0; j <= 60; j++) pts.push([X(0) + j / 60 * (X(6) - X(0)), Y(Math.max(0, shape(j)) * p[4])]);
    const pr = (t - .4 - n * (d * .17)) / (d * .3); o += drawn(pts, pr, { sw: n === 2 ? 9 : 6, c: p[3] });
    if (pr >= 1) { const e = pts[60]; o += `<g opacity="${ex((pr - 1) * 3)}"><circle cx="${e[0]}" cy="${e[1]}" r="10" fill="${p[3]}"/><text x="${e[0] + 22}" y="${e[1] + 10}" font-family="Inter" font-weight="900" font-size="34" fill="${p[3]}">+${p[1].toLocaleString('en-US')}%</text></g>`; } });
  const rows = P3.map((p, n) => { const a = ex((t - d * .55 - n * .3) / .4); return `<g opacity="${a}" transform="translate(1070,${370 + n * 120})"><rect width="450" height="100" rx="18" fill="rgba(255,255,255,.05)" stroke="${p[3]}" stroke-opacity=".6" stroke-width="2"/><circle cx="34" cy="50" r="12" fill="${p[3]}"/><text x="60" y="44" font-family="Inter" font-weight="900" font-size="28" fill="#fff">${p[0]}</text><text x="60" y="80" font-family="Inter" font-weight="700" font-size="20" fill="#c9d0ee">deepest drop ${p[2].toFixed(2).replace('-', '−')}%</text><text x="432" y="44" text-anchor="end" font-family="Inter" font-weight="900" font-size="28" fill="${p[3]}">+${p[1].toLocaleString('en-US')}%</text></g>`; }).join('');
  const head = `<text x="-470" y="235" font-family="Inter" font-weight="900" font-size="64" fill="#fff">Every profile grew</text><text x="-466" y="285" font-family="Inter" font-weight="700" font-size="30" fill="#c9d0ee">Portfolio · backtest 2020–2026 · log scale</text>`;
  const yrsOk = `<g opacity="${ex((t - d * .78) / .5)}">${chip('Every year in profit: 2020–2026', 1250, 780, { fs: 28, st: GREEN, c: '#5fe39b' })}</g>`;
  return { bg: DEEP, zoom: camera(t, d, .03), core: `${amb(t)}${head}${o}${rows}${yrsOk}` };
};
