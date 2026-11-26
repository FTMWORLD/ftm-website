window.NOCAP = 1;
const RW = '../assets/2026-11-27-1300s/', PH = n => '../assets/2026-11-27-1300/2026-11-27-1300-0' + n + '.jpg';
const CLIP = (k, t, d, o) => { const n = 126, f = 1 + Math.min(n - 1, Math.floor(Math.max(0, t) / Math.max(1, d) * (n - 1))); return IMG(RW + k + '/f' + String(f).padStart(3, '0') + '.jpg', t, Object.assign({ z0: 1.02, dz: .03, d: d }, o || {})) + SHADE(.3, .86); };
const STILL = (n, t, d, o) => IMG(PH(n), t, Object.assign({ z0: 1.03, dz: .07, d: d }, o || {})) + SHADE(.3, .86);
const say = (t, l1, l2, top, c2) => {
  const a = ease((t - .15) / .4), b = ease((t - .55) / .4);
  return `<div style="position:absolute;left:50px;right:50px;top:${top || 1260}px;text-align:center">
    <div style="font-size:70px;font-weight:900;letter-spacing:-.03em;line-height:1.08;white-space:nowrap;opacity:${a};transform:translateY(${(1 - a) * 24}px);text-shadow:0 8px 34px rgba(0,0,0,.8)">${l1}</div>
    ${l2 ? `<div style="font-size:70px;font-weight:900;letter-spacing:-.03em;line-height:1.08;white-space:nowrap;color:${c2 || '#E3B62F'};margin-top:10px;opacity:${b};transform:translateY(${(1 - b) * 24}px);text-shadow:0 8px 34px rgba(0,0,0,.8)">${l2}</div>` : ''}</div>`;
};
const SCN = {
  hook(t, d) { const a = ease(t / .3), b = ease((t - .5) / .4);
    return CLIP('1', t, d * 1.8) + `<div style="position:absolute;left:0;right:0;top:1150px;text-align:center">
      <div style="font-size:84px;font-weight:900;letter-spacing:-.03em;line-height:1.08;white-space:nowrap;opacity:${a};text-shadow:0 8px 34px rgba(0,0,0,.85)">Day 1 in hospital.</div>
      <div style="font-size:84px;font-weight:900;letter-spacing:-.03em;color:#ff8a92;white-space:nowrap;opacity:${b};text-shadow:0 8px 34px rgba(0,0,0,.85)">Day 1 without income.</div></div>`; },
  salary(t, d) { return CLIP('1', t + 2, d * 2.2, { z0: 1.06 }) + say(t, 'Your salary needs', 'you to show up.', 1260); },
  stat(t, d) { const v = Math.round(37 * Math.min(1, .5 + .5 * ease((t - .2) / 1.1)));
    return STILL(2, t, d) + `<div style="position:absolute;left:0;right:0;top:1080px;text-align:center">
      <div style="font-size:210px;font-weight:900;letter-spacing:-.05em;line-height:1;color:#E3B62F;font-variant-numeric:tabular-nums;text-shadow:0 10px 50px rgba(0,0,0,.6)">${v}%</div>
      <div style="font-size:50px;font-weight:900;white-space:nowrap;text-shadow:0 6px 30px rgba(0,0,0,.85)">of adults could not pay a small</div>
      <div style="font-size:50px;font-weight:900;white-space:nowrap;color:#E3B62F;text-shadow:0 6px 30px rgba(0,0,0,.85)">surprise bill in cash.</div>
      <div style="margin-top:14px;font-size:24px;font-weight:700;color:#c9d0ee">Source: US Federal Reserve, SHED 2025</div></div>`; },
  hands(t, d) { return CLIP('3', t, d * 1.4) + say(t, 'One income.', 'Your own two hands.', 1280); },
  whatif(t, d) { return STILL(4, t, d, { dz: .06 }) + say(t, 'What if something worked', 'even when you can’t?', 1260); },
  machine(t, d) {
    const chip = (x, i) => { const a = ease((t - .7 - i * .25) / .35); return `<span style="display:inline-block;margin:8px;padding:14px 28px;border-radius:40px;background:rgba(5,10,34,.72);border:1.5px solid rgba(212,175,55,.6);font-size:36px;font-weight:800;opacity:${a};transform:translateY(${(1 - a) * 16}px)">${x}</span>`; };
    return CLIP('5', t, d) + say(t, 'FTM MACHINE trades', 'with fixed rules.', 1180) + `<div style="position:absolute;left:60px;right:60px;top:1430px;text-align:center">${chip('On your own account', 0)}${chip('Every day', 1)}</div>`; },
  proof(t, d) { return CLIP('6', t, d) + say(t, 'No promises.', 'Every trade shown.', 1260); },
  cta(t, d) {
    const opt = (k, x, i) => { const a = ease((t - .6 - i * .3) / .4); return `<div style="display:flex;align-items:center;gap:22px;width:820px;margin:0 auto 18px;padding:20px 28px;border-radius:28px;background:rgba(5,10,34,.72);border:2px solid ${k === 'B' ? 'rgba(212,175,55,.75)' : 'rgba(255,255,255,.28)'};opacity:${a};transform:translateX(${(1 - a) * (k === 'B' ? 40 : -40)}px)"><b style="flex:none;width:80px;height:80px;border-radius:22px;display:grid;place-items:center;font-size:48px;background:${k === 'A' ? '#152a7a' : '#D4AF37'};color:${k === 'B' ? '#0b1640' : '#fff'}">${k}</b><span style="font-size:50px;font-weight:800;white-space:nowrap">${x}</span></div>`; };
    return CLIP('6', t + 5, 10, { z0: 1.08 }) + `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,9,31,.2) 0%,rgba(5,9,31,.6) 42%,rgba(5,9,31,.92) 100%)"></div>
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-30%);text-align:center">
        <div style="font-size:32px;font-weight:800;letter-spacing:.16em;color:#E3B62F;margin-bottom:18px;opacity:${ease(t / .4)}">HOW MANY INCOMES? · TAP IN THE COMMENTS</div>
        ${opt('A', 'Just one', 0)}${opt('B', 'More than one', 1)}
        <div style="display:inline-block;margin-top:24px;padding:26px 56px;border-radius:70px;background:#E5323E;font-weight:900;font-size:48px;opacity:${ease((t - 1.4) / .4)};transform:scale(${1 + .03 * sin(t * 5)})">Tap the link in our bio</div>
        <div style="margin-top:22px;font-weight:700;font-size:34px;color:#dfe4ff;opacity:${ease((t - 1.8) / .4)}">Create your account · every trade at 6 p.m.</div></div>`;
  }
};
