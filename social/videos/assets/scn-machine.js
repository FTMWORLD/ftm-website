/* Nov 23: the machine tells its own day. Holographic control room, a friendly robot narrator, world sessions. */
function robot(x, y, s, t, talk, armUp) {
  const eye = 0.5 + 0.5 * Math.abs(sin(t * 1.3)) > 0.97 ? 0.15 : 1, bob = 6 * sin(t * 2.4);
  return `<g transform="translate(${x},${y + bob}) scale(${s})"><defs><linearGradient id="rb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9eefc"/><stop offset="1" stop-color="#9fb0dc"/></linearGradient>
   <radialGradient id="rg"><stop offset="0" stop-color="#7fe3ff"/><stop offset="1" stop-color="#7fe3ff" stop-opacity="0"/></radialGradient></defs>
   <ellipse cx="0" cy="250" rx="120" ry="18" fill="#000" opacity=".3"/>
   <g transform="translate(-118,-10) rotate(${armUp ? 140 + 10 * sin(t * 3) : 18})"><rect x="-20" y="0" width="40" height="120" rx="20" fill="url(#rb)"/><circle cx="0" cy="130" r="26" fill="#cfd8f2"/></g>
   <g transform="translate(118,-10) rotate(${-18 - 6 * sin(t * 2)})"><rect x="-20" y="0" width="40" height="120" rx="20" fill="url(#rb)"/><circle cx="0" cy="130" r="26" fill="#cfd8f2"/></g>
   <rect x="-110" y="-40" width="220" height="240" rx="60" fill="url(#rb)"/><rect x="-70" y="20" width="140" height="110" rx="26" fill="#0b1640"/>
   <path d="M-42 104 L-12 70 L8 88 L42 46" stroke="#E3B62F" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
   <rect x="-20" y="-66" width="40" height="30" rx="10" fill="#9fb0dc"/>
   <rect x="-150" y="-260" width="300" height="200" rx="80" fill="url(#rb)"/><rect x="-118" y="-224" width="236" height="128" rx="60" fill="#0b1640"/>
   <ellipse cx="-50" cy="-162" rx="24" ry="${26 * eye}" fill="#7fe3ff"/><ellipse cx="50" cy="-162" rx="24" ry="${26 * eye}" fill="#7fe3ff"/><circle cx="-50" cy="-162" r="44" fill="url(#rg)" opacity=".35"/><circle cx="50" cy="-162" r="44" fill="url(#rg)" opacity=".35"/>
   <rect x="${-26 - 10 * talk}" y="-122" width="${52 + 20 * talk}" height="${6 + 16 * talk}" rx="6" fill="#7fe3ff" opacity=".9"/>
   <line x1="0" y1="-260" x2="0" y2="-310" stroke="#9fb0dc" stroke-width="8"/><circle cx="0" cy="-318" r="14" fill="#E3B62F" opacity="${.6 + .4 * sin(t * 6)}"/></g>`;
}
function room(t, hue) {
  let o = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0"><defs><radialGradient id="crb" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="${hue || '#0e2a5c'}"/><stop offset="1" stop-color="#020617"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#crb)"/>`;
  for (let i = 0; i < 26; i++) o += `<line x1="${i * 45}" y1="1180" x2="${540 + (i * 45 - 540) * 3}" y2="${H}" stroke="#7fe3ff" stroke-opacity=".12" stroke-width="2"/>`;
  for (let j = 0; j < 8; j++) o += `<line x1="0" y1="${1180 + j * j * 12}" x2="${W}" y2="${1180 + j * j * 12}" stroke="#7fe3ff" stroke-opacity=".1"/>`;
  for (let i = 0; i < 60; i++) { const y = (i * 53 + t * 40 * (1 + i % 3)) % 1100 + 300; o += `<rect x="${(i * 97) % W}" y="${y}" width="3" height="${10 + i % 20}" fill="#7fe3ff" opacity="${.08 + .1 * (i % 4)}"/>`; }
  return o;
}
const CITIES = [['Tokyo', 880, 520, 'm0'], ['London', 500, 470, 'm1'], ['New York', 270, 500, 'm2']];
function map(t, active) {
  let o = `<g opacity=".95"><ellipse cx="540" cy="560" rx="440" ry="250" fill="#0b1f4d" stroke="#7fe3ff" stroke-opacity=".5" stroke-width="3"/>`;
  for (let i = -4; i <= 4; i++) o += `<ellipse cx="540" cy="560" rx="${Math.abs(i) * 50}" ry="250" fill="none" stroke="#7fe3ff" stroke-opacity=".12"/>`;
  for (let j = -3; j <= 3; j++) o += `<line x1="${540 - 440 * Math.sqrt(1 - (j / 4) ** 2)}" y1="${560 + j * 62}" x2="${540 + 440 * Math.sqrt(1 - (j / 4) ** 2)}" y2="${560 + j * 62}" stroke="#7fe3ff" stroke-opacity=".12"/>`;
  [[300, 470, 90, 60], [500, 450, 70, 50], [560, 560, 60, 90], [800, 500, 140, 70], [860, 650, 50, 40], [330, 620, 50, 70]].forEach(([x, y, rx, ry]) => o += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#1F3A93" opacity=".8"/>`);
  CITIES.forEach(([n, x, y, k]) => { const on = active === k; o += `<circle cx="${x}" cy="${y}" r="${on ? 14 + 6 * sin(t * 6) : 9}" fill="${on ? '#E3B62F' : '#7fe3ff'}"/>${on ? `<circle cx="${x}" cy="${y}" r="${30 + (t * 40) % 50}" fill="none" stroke="#E3B62F" stroke-opacity="${1 - ((t * 40) % 50) / 50}" stroke-width="4"/>` : ''}<text x="${x}" y="${y - 30}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="30" fill="${on ? '#E3B62F' : '#cfe8ff'}">${n}</text>`; });
  return o + '</g>';
}
function clock(label) { return `<g transform="translate(540,900)"><rect x="-270" y="-46" width="540" height="92" rx="46" fill="#0b1640" stroke="#7fe3ff" stroke-opacity=".6" stroke-width="3"/><text x="0" y="16" text-anchor="middle" font-family="Inter" font-weight="900" font-size="44" fill="#7fe3ff">${label}</text></g>`; }
function holoChart(t, x, y, w, h) { let d = ''; for (let i = 0; i <= 50; i++) { const px = x + i / 50 * w, v = .6 + .2 * sin(i * .45 + t * 2) + .08 * sin(i * 1.7) - i / 50 * .4; d += (i ? 'L' : 'M') + px.toFixed(1) + ' ' + (y + v * h).toFixed(1); } return `<rect x="${x - 20}" y="${y - 20}" width="${w + 40}" height="${h + 40}" rx="20" fill="#0b1f4d" opacity=".6" stroke="#7fe3ff" stroke-opacity=".4"/><path d="${d}" stroke="#E3B62F" stroke-width="7" fill="none" stroke-linejoin="round"/><text x="${x}" y="${y + 10}" font-family="Inter" font-weight="800" font-size="30" fill="#E3B62F">GOLD</text>`; }
const SCN = {
  hook(t) { const L = ["> I never sleep.", "> Let me show you my day."]; const n = Math.floor(t * 22); let a = L[0].slice(0, n), b = n > L[0].length + 4 ? L[1].slice(0, n - L[0].length - 4) : '';
    return room(t, '#08153a') + `<g transform="translate(540,760)"><rect x="-470" y="-230" width="940" height="460" rx="30" fill="#020617" stroke="#7fe3ff" stroke-width="3" opacity=".95"/>
    <text x="-420" y="-90" font-family="ui-monospace,Menlo,monospace" font-weight="700" font-size="70" fill="#7fe3ff">${a}${b ? '' : (Math.floor(t * 3) % 2 ? '▌' : '')}</text>
    <text x="-420" y="40" font-family="ui-monospace,Menlo,monospace" font-weight="700" font-size="60" fill="#E3B62F">${b}${b && Math.floor(t * 3) % 2 ? '▌' : ''}</text></g>` + robot(540, 1190 - 0, 0.55, t, 0.4) + '</svg>'; },
  m0(t, d, talk) { return room(t) + map(t, 'm0') + clock('00:00 · TOKYO OPENS') + robot(540, 1200, .62, t, talk) + '</svg>'; },
  m1(t, d, talk) { return room(t, '#16306e') + holoChart(t, 160, 380, 760, 360) + clock('09:00 · LONDON') + robot(540, 1200, .62, t, talk, 1) + '</svg>'; },
  m2(t, d, talk) { return room(t, '#1b2e66') + map(t, 'm2') + clock('15:30 · NEW YORK') + robot(540, 1200, .62, t, talk) + '</svg>'; },
  m3(t, d, talk) { let st = ''; for (let i = 0; i < 40; i++) st += `<circle cx="${(i * 137) % W}" cy="${(i * 71) % 500 + 330}" r="${1.5 + i % 3}" fill="#fff" opacity="${.3 + .4 * sin(t * 2 + i)}"/>`;
    return room(t, '#050b24') + st + `<circle cx="820" cy="430" r="70" fill="#f5f0c8"/><circle cx="795" cy="410" r="70" fill="#050b24"/>
    <g transform="translate(380,700)"><rect x="-220" y="0" width="440" height="110" rx="26" fill="#2a3566"/><rect x="-220" y="-20" width="120" height="70" rx="30" fill="#e8ecff"/><path d="M-100 20 Q60 -20 220 10 L220 70 L-100 70Z" fill="#5b4a9e"/>
     <circle cx="-150" cy="-10" r="48" fill="#c68642"/><path d="M-170 -14 h18 M-140 -14 h18" stroke="#3b2516" stroke-width="5" stroke-linecap="round"/>
     <text x="40" y="-60" font-family="Inter" font-weight="800" font-size="${46 + 6 * sin(t * 2)}" fill="#cfe8ff" opacity=".8">z z z</text></g>` + clock('03:00 · YOU SLEEP') + robot(780, 1200, .55, t, talk) + '</svg>'; },
  cta(t, d, talk) { const p = 1 + .04 * sin(t * 5); return room(t, '#16306e') + `<g transform="translate(540,600)"><rect x="-430" y="-220" width="860" height="440" rx="40" fill="#020617" stroke="#E3B62F" stroke-width="4"/><text x="0" y="-90" text-anchor="middle" font-family="Inter" font-weight="800" font-size="64" fill="#fff">I work. You live.</text><text x="0" y="-10" text-anchor="middle" font-family="Inter" font-weight="800" font-size="46" fill="#7fe3ff">Tonight I'm trading again.</text><g transform="translate(0,110) scale(${p})"><rect x="-220" y="-56" width="440" height="112" rx="56" fill="#E5323E"/><text x="0" y="18" text-anchor="middle" font-family="Inter" font-weight="800" font-size="54" fill="#fff">Start free</text></g></g>` + robot(540, 1210, .5, t, talk, 1) + '</svg>'; }
};
