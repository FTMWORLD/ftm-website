window.NOCAP = 1;
const RW = '../assets/ad-ng-1/', PH = '../assets/ad-ng-2/';
const CLIP = (k, t, d, o) => { const n = 126, f = 1 + Math.min(n - 1, Math.floor(Math.max(0, t) / Math.max(1, d) * (n - 1))); return IMG(RW + k + '/f' + String(f).padStart(3, '0') + '.jpg', t, Object.assign({ z0: 1.02, dz: .04, d: d }, o || {})) + SHADE(.25, .85); };
const STILL = (f, t, d, o) => IMG(PH + f, t, Object.assign({ z0: 1.04, dz: .1, d: d }, o || {})) + SHADE(.25, .85);
const say = (t, l1, l2, top, c2) => {
  const a = ease((t - .03) / .2), b = ease((t - .18) / .2);
  return `<div style="position:absolute;left:50px;right:50px;top:${top || 1250}px;text-align:center">
    <div style="font-size:80px;font-weight:900;letter-spacing:-.03em;line-height:1.06;white-space:nowrap;opacity:${a};transform:scale(${.88 + .12 * a});text-shadow:0 8px 34px rgba(0,0,0,.85)">${l1}</div>
    ${l2 ? `<div style="font-size:80px;font-weight:900;letter-spacing:-.03em;line-height:1.06;white-space:nowrap;color:${c2 || '#E3B62F'};margin-top:8px;opacity:${b};transform:scale(${.88 + .12 * b});text-shadow:0 8px 34px rgba(0,0,0,.85)">${l2}</div>` : ''}</div>`;
};
const SCN = {
  hook(t, d) { return CLIP('m1', t, d * 1.6) + say(t, 'Stuck in', 'Lagos traffic?', 1240); },
  fuel(t, d) { return STILL('fuel.jpg', t, d, { dx: -14 }) + say(t, 'Hours in a', 'fuel queue?', 1240); },
  shop(t, d) { return STILL('market.jpg', t, d, { dx: 14 }) + say(t, 'Busy at your', 'shop all day?', 1240); },
  missed(t, d) { return CLIP('m2', t, d * 1.3) + say(t, 'Gold moves.', 'You miss it.', 1260, '#ff8a92'); },
  machine(t, d) {
    const chip = (x, i) => { const a = ease((t - .9 - i * .2) / .25); return `<div style="display:inline-block;margin:8px;padding:14px 28px;border-radius:40px;background:rgba(5,10,34,.75);border:2px solid rgba(212,175,55,.7);font-size:40px;font-weight:800;opacity:${a};transform:translateY(${(1 - a) * 16}px)">${x}</div>`; };
    return CLIP('m3', t, d * 1.1) + say(t, 'FTM MACHINE trades.', 'Fixed rules. No emotions.', 1150) + `<div style="position:absolute;left:40px;right:40px;top:1410px;text-align:center">${chip('Your own account', 0)}${chip('Pause any time', 1)}</div>`; },
  cta(t, d) {
    return CLIP('m4', t, d * 1.2) + `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,9,31,.15) 0%,rgba(5,9,31,.55) 45%,rgba(5,9,31,.92) 100%)"></div>
      <div style="position:absolute;left:0;right:0;top:52%;transform:translateY(-20%);text-align:center">
        <div style="font-size:72px;font-weight:900;letter-spacing:-.03em;opacity:${ease(t / .2)};text-shadow:0 8px 30px rgba(0,0,0,.7)">See every trade.</div>
        <div style="font-size:56px;font-weight:900;color:#E3B62F;margin:8px 0 30px;opacity:${ease((t - .2) / .2)}">All public on our website.</div>
        <div style="display:inline-block;padding:26px 60px;border-radius:70px;background:#E5323E;font-weight:900;font-size:52px;opacity:${ease((t - .4) / .25)};transform:scale(${1 + .04 * sin(t * 6)})">Learn more</div>
        <div style="margin-top:26px;font-weight:700;font-size:34px;color:#dfe4ff;opacity:${ease((t - .6) / .25)}">FTM MACHINE · automated trading software</div>
        <div style="margin-top:18px;font-weight:600;font-size:24px;color:#aab3d8;opacity:${ease((t - .7) / .25)}">Capital at risk. Trading can lose money. Past results do not guarantee future results.</div></div>`;
  }
};
