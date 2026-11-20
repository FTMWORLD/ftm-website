/* Brand cut v2 (boostable, vertical): strong first second, the FTM presenter on stage, "Software that puts your money to work,
   24/7", plain words in 50 languages, community, one-tap free account. No trades, no figures, no returns. */
const BIG = (txt, y, size, col, t, d0) => { const k = ex((t - d0) / .45); return `<text x="540" y="${y + (1 - k) * 40}" text-anchor="middle" font-family="Inter" font-weight="900" font-size="${size}" fill="${col}" opacity="${k}" letter-spacing="-2">${txt}</text>`; };
function stageV(t, screen) {
  let o = `<defs><linearGradient id="hallV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1440"/><stop offset="1" stop-color="#040824"/></linearGradient><linearGradient id="beamV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9b0" stop-opacity=".22"/><stop offset="1" stop-color="#ffe9b0" stop-opacity="0"/></linearGradient><linearGradient id="scrV" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1F3A93"/><stop offset="1" stop-color="#03061a"/></linearGradient><filter id="dof"><feGaussianBlur stdDeviation="5"/></filter><radialGradient id="vig" cx="50%" cy="45%" r="70%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient></defs><g filter="url(#dof)"><rect x="-700" y="-500" width="2480" height="2600" fill="url(#hallV)"/>`;
  [[200, .8], [540, 1], [880, .8]].forEach(([x, a], i) => { o += `<path d="M${x - 24} -330 L${x + 24} -330 L${x + 220} 1300 L${x - 220} 1300Z" fill="url(#beamV)" opacity="${a * (.75 + .25 * sin(t * .7 + i))}"/>`; });
  o += `</g><g transform="translate(70,-40)"><rect x="-12" y="-12" width="964" height="604" rx="22" fill="#020414"/><rect width="940" height="580" rx="14" fill="#03061a"/><rect width="940" height="580" rx="14" fill="url(#scrV)" opacity=".5"/>${screen || ''}</g>`;
  o += `<rect x="-700" y="1180" width="2480" height="900" fill="#0b1640"/><rect x="-700" y="1180" width="2480" height="4" fill="#E3B62F" opacity=".7"/><ellipse cx="540" cy="1300" rx="300" ry="40" fill="#E3B62F" opacity=".08"/><ellipse cx="540" cy="1338" rx="170" ry="22" fill="#000" opacity=".45"/>`;
  return o;
}
function crowdV(t) { let o = ''; [[1470, 1.0, '#060c2c'], [1545, 1.25, '#030719']].forEach(([y, s, c], row) => { for (let i = 0; i < 8; i++) { const x = -40 + i * 165 + row * 82, b = 4 * sin(t * 1.3 + i * 1.7 + row); o += `<g transform="translate(${x},${y + b}) scale(${s})"><ellipse cx="0" cy="40" rx="78" ry="60" fill="${c}"/><circle cx="0" cy="-30" r="38" fill="${c}"/><path d="M-36 -40 q36 -30 72 0" stroke="#3a5bd0" stroke-opacity=".55" stroke-width="4" fill="none"/></g>`; } }); return o; }
function hostV(t, talk, wave) {
  const armR = wave && t < 1.6 ? 150 + 14 * sin(t * 9) : 30 + 34 * talk + 10 * sin(t * 1.6), elR = wave && t < 1.6 ? 30 : 70 + 26 * talk;
  return P(HOST2, { x: 540, y: 1330, s: 1.75, t, talk, mood: 'smile', look: .1 * sin(t * .6), armL: 10 + 8 * sin(t * 1.2 + 1), elL: 60 + 18 * sin(t * 1.05), armR, elR, tilt: 1.2 * sin(t * .8) }) + crowdV(t);
}
Object.assign(SCN, {
  v_hook(t, d, talk) {
    // frame 1 already shows the hook; the day flies past behind it
    const tk = ['06:30 · Hospital', '09:00 · Meetings', '13:00 · School run', '18:00 · On the road', '22:00 · Still busy'];
    let chips = ''; tk.forEach((c, i) => { const y = ((i * 240 + t * 260) % 1400) - 300; chips += `<g transform="translate(${i % 2 ? 760 : 320},${y})" opacity=".55"><rect x="-200" y="-36" width="400" height="72" rx="36" fill="#13246a" stroke="rgba(212,175,55,.5)" stroke-width="2"/><text y="12" text-anchor="middle" font-family="Inter" font-weight="800" font-size="30" fill="#fff">${c}</text></g>`; });
    return { bg: 'radial-gradient(100% 80% at 50% 30%,#1d3590 0%,#0b1640 60%,#02040f 100%)', core: `${chips}<rect x="40" y="250" width="1000" height="460" rx="40" fill="rgba(3,6,26,.85)" stroke="#E3B62F" stroke-width="4"/>
      <text x="540" y="420" text-anchor="middle" font-family="Inter" font-weight="900" font-size="128" fill="#fff" letter-spacing="-3">Busy all day?</text>${BIG('Your money shouldn\'t', 545, 72, '#E3B62F', t, .9)}${BIG('sit still.', 635, 72, '#E3B62F', t, 1.2)}` };
  },
  v_meet(t, d, talk) {
    const scr = `${LOGO(470, 110, .9, 0)}<text x="470" y="270" text-anchor="middle" font-family="Inter" font-weight="900" font-size="58" fill="#fff">Software that puts</text><text x="470" y="345" text-anchor="middle" font-family="Inter" font-weight="900" font-size="58" fill="#fff">your money to work,</text><text x="470" y="470" text-anchor="middle" font-family="Inter" font-weight="900" font-size="120" fill="#E3B62F" opacity="${ex((t - d * .45) / .4)}">24/7</text>`;
    return { bg: '#071033', core: stageV(t, scr) + hostV(t, talk, 1) };
  },
  v_clear(t, d, talk) { return SCN.b_clear(t, d, talk); },
  v_comm(t, d, talk) { return SCN.b_comm(t, d, talk); },
  v_cta(t, d, talk) {
    const p = 1 + .05 * sin(t * 5);
    const scr = `<text x="470" y="150" text-anchor="middle" font-family="Inter" font-weight="900" font-size="70" fill="#fff">Free account</text><text x="470" y="235" text-anchor="middle" font-family="Inter" font-weight="900" font-size="70" fill="#E3B62F">1 tap</text><g transform="translate(470,370) scale(${p})"><rect x="-250" y="-62" width="500" height="124" rx="62" fill="#E5323E"/><text y="20" text-anchor="middle" font-family="Inter" font-weight="900" font-size="54" fill="#fff">Learn more</text></g><text x="470" y="510" text-anchor="middle" font-family="Inter" font-weight="800" font-size="40" fill="#fff">ftmwealthnation.com</text>`;
    return { bg: '#071033', nocap: 1, core: stageV(t, scr) + hostV(t, talk) + `<text x="540" y="1420" text-anchor="middle" font-family="Inter" font-weight="800" font-size="40" fill="#E3B62F" opacity="${ex((t - d * .5) / .5)}">Invest today, secure tomorrow.</text>` };
  }
});
