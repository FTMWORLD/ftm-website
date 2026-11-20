/* FTM brand cut (boostable): people, plain words, 50 languages, community, free account. No trading, markets, figures or
   returns. Vertical first (core square y 0..1080, with room above to y -300). Uses helpers from scn-ad.js / scn-explainer.js. */
const MOM = { skin: '#c68642', hair: '#2a1a10', hairStyle: 'curly', top: '#E3B62F', top2: '#b8901f', ph: .9 };
Object.assign(SCN, {
  b_hook(t, d, talk) {
    const sun = 560 - 140 * ex(t / d);
    let notes = ''; ['Email · Monday report', 'School run · 7:40', 'Meeting · 9:00'].forEach((n, i) => { const a = ex((t - .6 - i * .6) / .4); notes += `<g opacity="${a}" transform="translate(${560 + (1 - a) * 200},${230 + i * 96})"><rect width="440" height="78" rx="20" fill="#fff"/><circle cx="40" cy="39" r="18" fill="${['#1F3A93', '#E3B62F', '#E5323E'][i]}"/><text x="72" y="48" font-family="Inter" font-weight="800" font-size="26" fill="#0b1640">${n}</text></g>`; });
    return { bg: 'linear-gradient(180deg,#ffd9a0 0%,#f2a65a 45%,#2a3566 100%)', nocap: 0, core: `<rect x="-700" y="-500" width="2480" height="2600" fill="#f7e3c4"/><rect x="60" y="140" width="420" height="460" rx="24" fill="#9cc7ff"/><circle cx="270" cy="${sun}" r="80" fill="#ffd56b"/><rect x="60" y="140" width="420" height="460" rx="24" fill="none" stroke="#fff" stroke-width="18"/><line x1="270" y1="140" x2="270" y2="600" stroke="#fff" stroke-width="10"/>
      <rect x="-700" y="760" width="2480" height="1400" fill="#c9a27a"/><rect x="-700" y="740" width="2480" height="30" fill="#a07a52"/>
      <text x="540" y="110" text-anchor="middle" font-family="Inter" font-weight="900" font-size="130" fill="#0b1640">7:00 a.m.</text>${notes}${P(MOM, { x: 300, y: 1060, s: .95, t, prop: 'coffee', armR: 18, elR: 110, mood: 'neutral', talk: 0 })}` };
  },
  b_busy(t, d, talk) { return SCN.busy(t, d, talk); },
  b_reveal(t, d, talk) {
    const b = ex(t / .6); let rays = ''; for (let i = 0; i < 18; i++) { const a = i * PI / 9 + t * .2; rays += `<path d="M540 380 L${540 + 1500 * cos(a - .05)} ${380 + 1500 * sin(a - .05)} L${540 + 1500 * cos(a + .05)} ${380 + 1500 * sin(a + .05)}Z" fill="#E3B62F" opacity="${.06 * b}"/>`; }
    const C = [NURSE, OFFICE, MOM, CHEF]; let ppl = ''; C.forEach((c, i) => { const k = ex((t - .3 - i * .15) / 1); ppl += P(c, { x: 150 + i * 260, y: 1080 + (1 - k) * 200, s: .62, t, mood: 'smile' }); });
    return { bg: 'radial-gradient(90% 70% at 50% 30%,#1d3590 0%,#0b1640 60%,#02040f 100%)', core: `${rays}${particles(t, 60, '#E3B62F', 200)}${LOGO(540, 200, 1.4 * back(t / .6), 0)}<text x="540" y="470" text-anchor="middle" font-family="Inter" font-weight="900" font-size="${86 * back((t - .2) / .5)}" fill="#fff">Built for people</text><text x="540" y="570" text-anchor="middle" font-family="Inter" font-weight="900" font-size="${86 * back((t - .45) / .5)}" fill="#E3B62F">like you.</text>${ppl}` };
  },
  b_clear(t, d, talk) {
    const L = [['Hello', 'English'], ['Hola', 'Español'], ['Bonjour', 'Français'], ['Hallo', 'Deutsch'], ['你好', '中文'], ['مرحبا', 'العربية'], ['Olá', 'Português'], ['こんにちは', '日本語'], ['Jambo', 'Kiswahili'], ['नमस्ते', 'हिन्दी'], ['Ẹ n lẹ', 'Yorùbá'], ['Sannu', 'Hausa']];
    const i = Math.floor(t / .55) % L.length, k = ex(((t % .55)) / .2);
    const phone = `<g transform="translate(540,600) scale(.88)"><rect x="-230" y="-430" width="460" height="860" rx="60" fill="#000" stroke="#D4AF37" stroke-opacity=".7" stroke-width="5"/><rect x="-210" y="-410" width="420" height="820" rx="44" fill="#13246a"/>
      <text x="0" y="-290" text-anchor="middle" font-family="Inter" font-weight="800" font-size="26" fill="#E3B62F" letter-spacing="3">YOUR LANGUAGE</text>
      <text x="0" y="${-90 + (1 - k) * 30}" text-anchor="middle" font-family="Inter" font-weight="900" font-size="96" fill="#fff" opacity="${k}">${L[i][0]}</text><text x="0" y="0" text-anchor="middle" font-family="Inter" font-weight="700" font-size="34" fill="#c9d0ee" opacity="${k}">${L[i][1]}</text>
      ${[0, 1, 2].map(j => `<rect x="-160" y="${90 + j * 70}" width="${320 - j * 60}" height="22" rx="11" fill="rgba(255,255,255,.14)"/>`).join('')}<rect x="-150" y="320" width="300" height="70" rx="35" fill="#E5323E"/><text x="0" y="366" text-anchor="middle" font-family="Inter" font-weight="900" font-size="30" fill="#fff">Plain words</text></g>`;
    return { bg: 'radial-gradient(100% 80% at 50% 40%,#1d3590 0%,#0b1640 60%,#02040f 100%)', core: `${amb(t)}<text x="540" y="90" text-anchor="middle" font-family="Inter" font-weight="900" font-size="100" fill="#E3B62F">50 languages</text>${phone}` };
  },
  b_comm(t, d, talk) {
    const C = [NURSE, OFFICE, DRIVER, CHEF, MOM, PILOT]; let o = `<circle cx="540" cy="600" r="300" fill="#0b1f4d" stroke="#7fe3ff" stroke-opacity=".5" stroke-width="3"/>`;
    for (let i = -3; i <= 3; i++) o += `<ellipse cx="540" cy="600" rx="${Math.abs(i) * 90 + ((t * 30) % 90)}" ry="300" fill="none" stroke="#7fe3ff" stroke-opacity=".12"/>`;
    const msg = ['Good morning from Lagos', 'Learning so much!', 'Hello from Berlin', 'Saludos desde Lima', 'Welcome, new members', 'Great explanation'];
    C.forEach((c, i) => { const ang = i / 6 * 2 * PI + t * .3, x = 540 + 400 * cos(ang), y = 600 + 300 * sin(ang), a = ex((t - i * .2) / .5); o += `<g opacity="${a}">${P(c, { x, y: y + 130, s: .32, t, mood: 'smile', prop: 'phone', armR: 12, elR: 118 })}</g>`;
      if (sin(t * 1.4 + i * 1.7) > 0) o += `<g transform="translate(${x},${y - 80})"><rect x="-150" y="-38" width="300" height="54" rx="20" fill="#fff"/><text y="-3" text-anchor="middle" font-family="Inter" font-weight="700" font-size="22" fill="#0b1640">${msg[i]}</text></g>`; });
    return { bg: 'radial-gradient(100% 80% at 50% 40%,#16307a 0%,#0b1640 60%,#02040f 100%)', core: `${amb(t)}<text x="540" y="90" text-anchor="middle" font-family="Inter" font-weight="900" font-size="96" fill="#fff">FTM Community</text>${o}` };
  },
  b_cta(t, d, talk) {
    const p = 1 + .045 * sin(t * 5), C = [NURSE, OFFICE, MOM, CHEF]; let ppl = '';
    C.forEach((c, i) => { const tx = 150 + i * 260, k = ex((t - i * .12) / 1.2), sx = i < 2 ? -300 : 1380; ppl += P(c, { x: sx + (tx - sx) * k, y: 1090, s: .6, t, walk: k < .97 ? 1 : 0, prop: 'phone', armR: 12, elR: 118, mood: 'smile' }); });
    return { bg: 'radial-gradient(100% 80% at 50% 30%,#1d3590 0%,#0b1640 60%,#02040f 100%)', nocap: 1, core: `${amb(t)}${LOGO(540, 60, 1, 0)}<text x="540" y="230" text-anchor="middle" font-family="Inter" font-weight="900" font-size="78" fill="#fff">Start with a</text><text x="540" y="320" text-anchor="middle" font-family="Inter" font-weight="900" font-size="78" fill="#E3B62F">free account</text>
      <g transform="translate(540,470) scale(${p})"><rect x="-270" y="-66" width="540" height="132" rx="66" fill="#E5323E"/><text y="22" text-anchor="middle" font-family="Inter" font-weight="900" font-size="58" fill="#fff">Learn more</text></g><text x="540" y="610" text-anchor="middle" font-family="Inter" font-weight="800" font-size="48" fill="#fff">ftmwealthnation.com</text><text x="540" y="690" text-anchor="middle" font-family="Inter" font-weight="800" font-size="40" fill="#E3B62F" opacity="${ex((t - d * .55) / .5)}">Invest today, secure tomorrow.</text>${ppl}` };
  }
});
