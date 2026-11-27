window.NOCAP = 1;
const PH = n => '../assets/2026-11-28-1300/2026-11-28-1300-0' + n + '.jpg';
const STILL = (n, t, d, o) => IMG(PH(n), t, Object.assign({ z0: 1.03, dz: .08, d: d }, o || {})) + SHADE(.3, .86);
const say = (t, l1, l2, top, c2) => {
  const a = ease((t - .1) / .3), b = ease((t - .4) / .3);
  return `<div style="position:absolute;left:50px;right:50px;top:${top || 1240}px;text-align:center">
    <div style="font-size:70px;font-weight:900;letter-spacing:-.03em;line-height:1.08;white-space:nowrap;opacity:${a};transform:translateY(${(1 - a) * 24}px);text-shadow:0 8px 34px rgba(0,0,0,.8)">${l1}</div>
    ${l2 ? `<div style="font-size:70px;font-weight:900;letter-spacing:-.03em;line-height:1.08;white-space:nowrap;color:${c2 || '#E3B62F'};margin-top:10px;opacity:${b};transform:translateY(${(1 - b) * 24}px);text-shadow:0 8px 34px rgba(0,0,0,.8)">${l2}</div>` : ''}</div>`;
};
const big = (t, v, col, sub1, sub2) => { const a = ease(t / .3);
  return `<div style="position:absolute;left:0;right:0;top:1000px;text-align:center">
    <div style="font-size:200px;font-weight:900;letter-spacing:-.05em;line-height:1;color:${col};font-variant-numeric:tabular-nums;opacity:${a};transform:scale(${.92 + .08 * a});text-shadow:0 10px 50px rgba(0,0,0,.6)">${v}</div>
    <div style="margin-top:18px;font-size:58px;font-weight:900;white-space:nowrap;text-shadow:0 6px 30px rgba(0,0,0,.85);opacity:${ease((t - .3) / .3)}">${sub1}</div>
    ${sub2 ? `<div style="font-size:40px;font-weight:700;color:#c9d0ee;margin-top:8px;opacity:${ease((t - .5) / .3)}">${sub2}</div>` : ''}</div>`; };
const cnt = (t, from, to, dur) => from + (to - from) * ease(Math.min(1, Math.max(0, t / dur)));
const SCN = {
  hook(t, d) { return STILL(2, t, d * 1.5) + say(t, 'My savings are shrinking.', 'Quietly. Every single day.', 1200, '#ff8a92'); },
  rates(t, d) {
    const row = (x, v, i) => { const a = ease((t - .2 - i * .45) / .35); return `<div style="display:flex;justify-content:space-between;align-items:baseline;width:840px;margin:0 auto 16px;padding:22px 34px;border-radius:26px;background:rgba(5,10,34,.74);border:1.5px solid rgba(212,175,55,.5);opacity:${a};transform:translateY(${(1 - a) * 20}px)"><span style="font-size:46px;font-weight:800;white-space:nowrap">${x}</span><b style="font-size:72px;font-weight:900;color:#ff8a92;font-variant-numeric:tabular-nums">${v}</b></div>`; };
    return STILL(1, t, d) + `<div style="position:absolute;left:0;right:0;top:980px;text-align:center">
      <div style="display:inline-block;padding:12px 30px;border-radius:40px;background:rgba(5,10,34,.8);font-size:36px;font-weight:800;letter-spacing:.14em;color:#E3B62F;margin-bottom:22px">INFLATION · OCTOBER 2026</div>
      ${row('Nigeria', '14.06%', 0)}${row('Nigeria, food', '19.13%', 1)}${row('Euro area', '4.0%', 2)}
      <div style="margin-top:14px;font-size:26px;font-weight:700;color:#c9d0ee">Sources: NBS · Eurostat</div></div>`; },
  less(t, d) { return t < d * .5 ? STILL(3, t, d) + say(t, 'Same money.', 'Less bread. Less fuel.', 1240, '#ff8a92') : STILL(4, t - d * .5, d) + say(t - d * .5, 'Saving alone', 'is not growing anymore.', 1260); },
  tin(t, d) { return STILL(4, t, d) + say(t, 'Saving alone', 'is not growing anymore.', 1260); },
  daughter(t, d) {
    const chip = (x, i) => { const a = ease((t - .6 - i * .25) / .35); return `<span style="display:inline-block;margin:8px;padding:14px 28px;border-radius:40px;background:rgba(5,10,34,.72);border:1.5px solid rgba(212,175,55,.6);font-size:36px;font-weight:800;opacity:${a};transform:translateY(${(1 - a) * 16}px)">${x}</span>`; };
    return STILL(5, t, d) + say(t, 'FTM MACHINE trades', 'with fixed rules.', 1180) + `<div style="position:absolute;left:60px;right:60px;top:1430px;text-align:center">${chip('Every trade public', 0)}${chip('On your own account', 1)}</div>`; },
  backtest(t, d) { return STILL(6, t, d) + big(t, '7 of 7', '#E3B62F', 'years in profit.', 'Backtest 2020–2026'); },
  cta(t, d) {
    const opt = (k, x, i) => { const a = ease((t - .5 - i * .25) / .35); return `<div style="display:flex;align-items:center;gap:22px;width:820px;margin:0 auto 18px;padding:20px 28px;border-radius:28px;background:rgba(5,10,34,.72);border:2px solid ${k === 'B' ? 'rgba(212,175,55,.75)' : 'rgba(255,255,255,.28)'};opacity:${a};transform:translateX(${(1 - a) * (k === 'B' ? 40 : -40)}px)"><b style="flex:none;width:80px;height:80px;border-radius:22px;display:grid;place-items:center;font-size:48px;background:${k === 'A' ? '#152a7a' : '#D4AF37'};color:${k === 'B' ? '#0b1640' : '#fff'}">${k}</b><span style="font-size:50px;font-weight:800;white-space:nowrap">${x}</span></div>`; };
    return STILL(6, t + 4, 10, { z0: 1.1 }) + `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,9,31,.2) 0%,rgba(5,9,31,.6) 42%,rgba(5,9,31,.92) 100%)"></div>
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-30%);text-align:center">
        <div style="font-size:32px;font-weight:800;letter-spacing:.14em;color:#E3B62F;margin-bottom:18px;opacity:${ease(t / .4)}">WHAT HURTS MOST? · TAP IN THE COMMENTS</div>
        ${opt('A', 'Food prices', 0)}${opt('B', 'Rent', 1)}
        <div style="display:inline-block;margin-top:24px;padding:26px 56px;border-radius:70px;background:#E5323E;font-weight:900;font-size:48px;opacity:${ease((t - 1.2) / .4)};transform:scale(${1 + .03 * sin(t * 5)})">Tap the link in our bio</div>
        <div style="margin-top:22px;font-weight:700;font-size:34px;color:#dfe4ff;opacity:${ease((t - 1.6) / .4)}">Create your account · every trade at 6 p.m.</div></div>`;
  }
};
