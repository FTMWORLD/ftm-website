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
    const scr = `<text x="500" y="100" text-anchor="middle" font-family="Inter" font-weight="900" font-size="54" fill="#E3B62F">Try it with zero risk</text>${step(0, 'Free account: just your email', '#E3B62F')}${step(1, 'Watch the master trade live', '#E3B62F')}${step(2, 'Start only if you like it', '#2fbf71')}`;
    return { bg: '#071033', zoom: 1 + .03 * cl(t / d), core: studio(t, scr) + host(t, talk) };
  },
  cta(t, d, talk) {
    const p = 1 + .045 * sin(t * 5);
    const scr = `<text x="380" y="130" text-anchor="middle" font-family="Inter" font-weight="900" font-size="56" fill="#fff">Open your free account</text><g transform="translate(380,250) scale(${p})"><rect x="-230" y="-56" width="460" height="112" rx="56" fill="#E5323E"/><text y="18" text-anchor="middle" font-family="Inter" font-weight="900" font-size="48" fill="#fff">Tap the link below</text></g><text x="380" y="400" text-anchor="middle" font-family="Inter" font-weight="800" font-size="40" fill="#E3B62F">ftmwealthnation.com</text><text x="380" y="470" text-anchor="middle" font-family="Inter" font-weight="700" font-size="28" fill="#c9d0ee">On a TV or laptop? Scan the code →</text>${qr(760, 150, 200, 'Scan')}${followPill(t, 500, 570, ex((t - d * .55) / .5))}`;
    return { bg: '#071033', nocap: 0, zoom: 1 + .02 * cl(t / d), core: studio(t, scr) + host(t, talk) };
  },
  endcard(t, d) {
    const slot = (x, lab) => `<g transform="translate(${x},600)"><rect x="-300" y="-170" width="600" height="340" rx="24" fill="rgba(255,255,255,.04)" stroke="rgba(212,175,55,.35)" stroke-width="3" stroke-dasharray="12 10"/><text y="220" text-anchor="middle" font-family="Inter" font-weight="800" font-size="30" fill="#c9d0ee">${lab}</text></g>`;
    return { bg: DEEP, nocap: 1, core: `${amb(t)}${particles(t, 50, GOLD, 120)}${LOGO(540, 150, .9, 0)}<text x="540" y="300" text-anchor="middle" font-family="Inter" font-weight="900" font-size="60" fill="#fff">Tomorrow's real result: 11 p.m.</text><text x="540" y="370" text-anchor="middle" font-family="Inter" font-weight="800" font-size="40" fill="#E3B62F">Follow so it finds you.</text>${slot(-80, 'Watch next')}${slot(620, 'Subscribe')}${qr(1150, 460, 230, 'Free account')}<text x="540" y="1000" text-anchor="middle" font-family="Inter" font-weight="800" font-size="36" fill="#c9d0ee">ftmwealthnation.com · Invest today, secure tomorrow.</text>` };
  }
});
// live result with the follow reason under it
const _present = SCN.present;
SCN.present = function (t, d, talk) { const r = _present(t, d, talk); r.core += followPill(t, 540, 1010, ex((t - d * .72) / .5)); return r; };
