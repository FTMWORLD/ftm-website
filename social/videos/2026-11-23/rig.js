/* FTM character rig: original 2D animated people (shaded, blinking, lip-sync). person(o) returns an SVG <g>.
 o: x,y (feet), s scale, skin, skinDark, hair, hairStyle(bun|short|long|curly|bald|wavy), top, top2, collar, pants, shoes,
    t time, talk 0..1 (mouth open), look -1..1, armL/armR angles (deg, 0 = down), mood(smile|neutral|worried|surprised),
    prop: 'phone'|'coffee'|'laptop'|null (held in right hand), sit, flip, glasses, beard */
let __id = 0;
function person(o) {
  const id = 'p' + (__id++), s = o.s || 1, t = o.t || 0, look = o.look || 0, talk = o.talk || 0;
  const blink = ((t + (o.ph || 0)) % 3.7) < 0.12 ? 0.1 : 1, breathe = 1 + 0.012 * Math.sin(t * 2.2 + (o.ph || 0));
  const sk = o.skin || '#c98d5e', skd = o.skinDark || shade(sk, -0.18), hr = o.hair || '#2a1c14', top = o.top || '#2c4a8c', top2 = o.top2 || shade(top, -0.2);
  const pants = o.pants || '#1c2440', shoes = o.shoes || '#141414';
  const mood = o.mood || 'smile';
  const defs = `<defs>
   <radialGradient id="${id}f" cx="45%" cy="38%" r="65%"><stop offset="0" stop-color="${shade(sk, 0.1)}"/><stop offset=".7" stop-color="${sk}"/><stop offset="1" stop-color="${skd}"/></radialGradient>
   <linearGradient id="${id}t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(top, 0.12)}"/><stop offset="1" stop-color="${top2}"/></linearGradient>
   <linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(hr, 0.25)}"/><stop offset=".5" stop-color="${hr}"/><stop offset="1" stop-color="${shade(hr, -0.25)}"/></linearGradient>
   <linearGradient id="${id}p" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(pants, 0.1)}"/><stop offset="1" stop-color="${shade(pants, -0.15)}"/></linearGradient></defs>`;
  const hand = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="15" ry="17" fill="url(#${id}f)"/><ellipse cx="${x - 9}" cy="${y - 6}" rx="6" ry="9" fill="${sk}" transform="rotate(-25 ${x - 9} ${y - 6})"/>`;
  const propSvg = {
    phone: `<g transform="translate(-14,70) rotate(-10)"><rect x="-22" y="-40" width="44" height="80" rx="8" fill="#0b0f1f" stroke="#D4AF37" stroke-opacity=".6" stroke-width="2"/><rect x="-18" y="-35" width="36" height="66" rx="5" fill="#1F3A93"/><path d="M-12 18 L-4 8 L3 13 L12 -2" stroke="#E3B62F" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="-18" y="-35" width="36" height="66" rx="5" fill="#9cc7ff" opacity="${0.12 + 0.06 * Math.sin(t * 4)}"/></g>`,
    coffee: `<g transform="translate(-6,74)"><path d="M-18 -22 h36 l-4 40 h-28z" fill="#f3efe8"/><rect x="-19" y="-28" width="38" height="8" rx="3" fill="#6b4423"/><path d="M18 -12 q14 2 10 14 q-4 8 -12 6" stroke="#f3efe8" stroke-width="5" fill="none"/><path d="M-6 -36 q4 -10 0 -18 M6 -36 q4 -10 0 -18" stroke="#fff" stroke-opacity="${0.35 + 0.2 * Math.sin(t * 3)}" stroke-width="3" fill="none"/></g>`,
    laptop: ''
  }[o.prop] || '';
  const arm = (side, deg, el) => { el = el || 0; return `<g transform="translate(${side * 64},-176) rotate(${deg * side})">
      <path d="M-19 -4 Q-24 30 -17 62 L17 62 Q22 30 17 -4 Z" fill="url(#${id}t)"/>
      <g transform="translate(0,58) rotate(${el * side})"><path d="M-17 0 Q-20 30 -15 58 L15 58 Q19 30 17 0 Z" fill="url(#${id}t)"/><path d="M-15 52 h30 v9 h-30z" fill="${top2}"/>
      ${hand(0, 72)}${side > 0 ? `<g transform="translate(0,-56)">${propSvg}</g>` : ''}</g></g>`; };
  const legs = o.sit ? `<path d="M-50 -22 h100 v34 q0 14 -14 14 h-72 q-14 0 -14 -14z" fill="url(#${id}p)"/>` :
    (() => { const sw = o.walk ? 24 * Math.sin(t * (o.walkSpeed || 7)) : 0;
      return `<g transform="rotate(${sw} -27 -40)"><path d="M-46 -40 L-8 -40 L-12 92 L-44 92 Z" fill="url(#${id}p)"/><path d="M-50 90 h42 q8 0 8 10 v6 h-56 q-4 0 -4 -6z" fill="${shoes}"/></g>
     <g transform="rotate(${-sw} 27 -40)"><path d="M8 -40 L46 -40 L44 92 L12 92 Z" fill="url(#${id}p)"/><path d="M8 90 h42 q8 0 8 10 v6 h-50z" fill="${shoes}"/></g>`; })();
  const mouthOpen = Math.max(0, Math.min(1, talk));
  const mouth = mouthOpen > 0.08 ? `<path d="M-15 30 Q0 ${30 + 6 + 16 * mouthOpen} 15 30 Q0 ${34 + 4 * mouthOpen} -15 30Z" fill="#5a1f22"/><path d="M-9 ${31 + 9 * mouthOpen} q9 5 18 0" stroke="#e98a8a" stroke-width="4" fill="none" opacity="${mouthOpen}"/>`
    : { smile: '<path d="M-16 28 Q0 42 16 28" stroke="#6a2a2a" stroke-width="4.5" fill="none" stroke-linecap="round"/>', neutral: '<path d="M-12 32 Q0 35 12 32" stroke="#6a2a2a" stroke-width="4.5" fill="none" stroke-linecap="round"/>',
        worried: '<path d="M-13 36 Q0 28 13 36" stroke="#6a2a2a" stroke-width="4.5" fill="none" stroke-linecap="round"/>', surprised: '<ellipse cx="0" cy="34" rx="8" ry="10" fill="#5a1f22"/>' }[mood];
  const brow = mood === 'worried' ? [[-30, -26, -12, -32], [12, -32, 30, -26]] : mood === 'surprised' ? [[-30, -36, -12, -38], [12, -38, 30, -36]] : [[-30, -30, -12, -32], [12, -32, 30, -30]];
  const eye = (cx) => `<g transform="translate(${cx + look * 4},0)"><ellipse cx="0" cy="-6" rx="11" ry="${12 * blink}" fill="#fff"/>${blink > .5 ? `<circle cx="${look * 3}" cy="-5" r="7" fill="#3b2516"/><circle cx="${look * 3}" cy="-5" r="3.6" fill="#0b0b0b"/><circle cx="${look * 3 + 2.5}" cy="-8" r="2.2" fill="#fff"/>` : ''}<path d="M-12 ${-9 - 3 * blink} Q0 ${-18 * blink - 2} 12 ${-9 - 3 * blink}" stroke="${shade(sk, -0.45)}" stroke-width="3" fill="none"/></g>`;
  const hairBack = { long: `<path d="M-66 -10 Q-80 -92 0 -96 Q80 -92 66 -10 L70 110 Q40 120 0 118 Q-40 120 -70 110Z" fill="url(#${id}h)"/>`, bun: `<circle cx="0" cy="-92" r="30" fill="url(#${id}h)"/>`, wavy: `<path d="M-66 0 Q-80 -90 0 -94 Q80 -90 66 0 Q70 40 50 56 L-50 56 Q-70 40 -66 0Z" fill="url(#${id}h)"/>` }[o.hairStyle] || '';
  const hairFront = {
    short: `<path d="M-60 -18 Q-66 -86 0 -84 Q64 -88 62 -18 Q54 -50 26 -54 Q-6 -46 -34 -56 Q-52 -48 -60 -18Z" fill="url(#${id}h)"/>`,
    bun: `<path d="M-60 -10 Q-64 -82 0 -80 Q64 -82 60 -10 Q56 -52 0 -56 Q-56 -52 -60 -10Z" fill="url(#${id}h)"/>`,
    long: `<path d="M-62 -14 Q-62 -84 0 -82 Q62 -84 62 -14 Q52 -60 10 -62 Q-34 -56 -62 -14Z" fill="url(#${id}h)"/>`,
    curly: [[-50, -40], [-40, -62], [-20, -76], [2, -80], [24, -76], [44, -62], [54, -40], [-58, -18], [60, -18], [-30, -58], [10, -64], [32, -54]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${15 + (i % 3) * 3}" fill="url(#${id}h)"/><circle cx="${x - 4}" cy="${y - 5}" r="4" fill="#fff" opacity=".12"/>`).join(''),
    wavy: `<path d="M-62 -8 Q-60 -82 0 -82 Q60 -84 62 -8 Q48 -60 10 -58 Q-20 -40 -62 -8Z" fill="url(#${id}h)"/>`,
    bald: `<path d="M-56 -40 Q0 -90 56 -40" stroke="${shade(sk, -0.1)}" stroke-width="6" fill="none" opacity=".4"/>`
  }[o.hairStyle || 'short'];
  const beard = o.beard ? `<path d="M-50 4 Q-46 60 0 66 Q46 60 50 4 Q40 40 0 44 Q-40 40 -50 4Z" fill="${hr}" opacity=".85"/>` : '';
  const glasses = o.glasses ? `<g fill="none" stroke="#1a1a1a" stroke-width="3.5"><rect x="-38" y="-20" width="30" height="24" rx="8"/><rect x="8" y="-20" width="30" height="24" rx="8"/><path d="M-8 -10 h16"/></g>` : '';
  const collar = o.collar || '';
  return `<g transform="translate(${o.x},${o.y - (o.walk ? 8 * Math.abs(Math.sin(t * (o.walkSpeed || 7))) : 0) - (o.jump || 0)}) rotate(${o.lean || 0}) scale(${(o.flip ? -1 : 1) * s},${s})">${defs}
    <ellipse cx="0" cy="${o.sit ? 30 : 104}" rx="${o.sit ? 90 : 70}" ry="14" fill="#000" opacity=".25"/>
    ${legs}
    <g transform="scale(1,${breathe})" style="transform-origin:0 -40px">
     ${arm(-1, (o.armL == null ? 8 : o.armL) + (o.walk ? -18 * Math.sin(t * (o.walkSpeed || 7)) : 0), o.elL || 0)}
     <path d="M-66 -196 Q-74 -120 -58 -36 L58 -36 Q74 -120 66 -196 Q34 -214 0 -214 Q-34 -214 -66 -196Z" fill="url(#${id}t)"/>
     <path d="M-58 -36 L58 -36 L56 -24 L-56 -24Z" fill="${shade(top2, -0.15)}"/>${collar}
     <path d="M-16 -222 h32 v28 q-16 10 -32 0z" fill="${skd}"/>
     ${arm(1, (o.armR == null ? 8 : o.armR) + (o.walk && !o.prop ? 18 * Math.sin(t * (o.walkSpeed || 7)) : 0), o.elR || 0)}
     <g transform="translate(${look * 3},-286) rotate(${o.tilt || 0})">
      ${hairBack}<ellipse cx="-62" cy="4" rx="11" ry="16" fill="${skd}"/><ellipse cx="62" cy="4" rx="11" ry="16" fill="${skd}"/>
      <path d="M-60 -8 Q-62 -76 0 -78 Q62 -76 60 -8 Q60 52 0 70 Q-60 52 -60 -8Z" fill="url(#${id}f)"/>
      <ellipse cx="-34" cy="20" rx="12" ry="7" fill="#e86a6a" opacity=".18"/><ellipse cx="34" cy="20" rx="12" ry="7" fill="#e86a6a" opacity=".18"/>
      ${eye(-22)}${eye(22)}
      ${brow.map(b => `<path d="M${b[0]} ${b[1]} Q${(b[0] + b[2]) / 2} ${Math.min(b[1], b[3]) - 5} ${b[2]} ${b[3]}" stroke="${shade(hr, 0.05)}" stroke-width="6" fill="none" stroke-linecap="round"/>`).join('')}
      <path d="M-3 0 Q-7 16 -1 18 Q4 20 8 16" stroke="${skd}" stroke-width="4" fill="none" stroke-linecap="round"/>
      ${beard}${mouth}${glasses}${hairFront}
     </g>
    </g></g>`;
}
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const m = c => Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f); return '#' + [m(r), m(g), m(b)].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join(''); }
/* talk level from the voice track (AMP[sceneId] = array of 0..1 at 25 fps), filled by the page */
window.AMP = window.AMP || {};
function talkAt(sid, lt) { const a = window.AMP[sid]; if (!a) return 0; const i = Math.floor(lt * 25); return a[i] || 0; }
