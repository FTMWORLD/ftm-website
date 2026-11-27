window.NOCAP = 1;
const PH = n => '../assets/2026-11-28-0930/2026-11-28-0930-0' + n + '.jpg';
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
  hook(t, d) { return STILL(1, t, d * 1.6) + big(t, '−' + cnt(t, 0, 3.43, .8).toFixed(2) + '%', '#ff8a92', 'Our worst day this month.', '6 November · live account'); },
  again(t, d) { return STILL(1, t + 2, d * 2, { z0: 1.08 }) + big(t, '−' + cnt(t, 0, 3.38, .7).toFixed(2) + '%', '#ff8a92', 'Three days later. Again.', '9 November · live account'); },
  quit(t, d) { return STILL(3, t, d) + say(t, 'Most people quit right there.', 'Or trade harder to win it back.', 1240, '#ff8a92'); },
  rules(t, d) { return STILL(4, t, d) + say(t, 'FTM MACHINE did neither.', 'Same rules. Next day.', 1240); },
  best(t, d) { return STILL(2, t, d) + big(t, '+' + cnt(t, 0, 10.16, .9).toFixed(2) + '%', '#E3B62F', 'Three days later. In one day.', '12 November · live account'); },
  month(t, d) { return STILL(2, t + 3, d * 1.6, { z0: 1.09 }) + big(t, '+' + cnt(t, 0, 7.6, .9).toFixed(1) + '%', '#E3B62F', 'November so far.', 'Live account · by Friday 27 November'); },
  cta(t, d) {
    const opt = (k, x, i) => { const a = ease((t - .5 - i * .25) / .35); return `<div style="display:flex;align-items:center;gap:22px;width:820px;margin:0 auto 18px;padding:20px 28px;border-radius:28px;background:rgba(5,10,34,.72);border:2px solid ${k === 'B' ? 'rgba(212,175,55,.75)' : 'rgba(255,255,255,.28)'};opacity:${a};transform:translateX(${(1 - a) * (k === 'B' ? 40 : -40)}px)"><b style="flex:none;width:80px;height:80px;border-radius:22px;display:grid;place-items:center;font-size:48px;background:${k === 'A' ? '#152a7a' : '#D4AF37'};color:${k === 'B' ? '#0b1640' : '#fff'}">${k}</b><span style="font-size:50px;font-weight:800;white-space:nowrap">${x}</span></div>`; };
    return STILL(4, t + 4, 10, { z0: 1.1 }) + `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,9,31,.2) 0%,rgba(5,9,31,.6) 42%,rgba(5,9,31,.92) 100%)"></div>
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-30%);text-align:center">
        <div style="font-size:32px;font-weight:800;letter-spacing:.14em;color:#E3B62F;margin-bottom:18px;opacity:${ease(t / .4)}">AFTER 2 LOSS DAYS, YOU… · TAP IN THE COMMENTS</div>
        ${opt('A', 'Quit', 0)}${opt('B', 'Stay with the rules', 1)}
        <div style="display:inline-block;margin-top:24px;padding:26px 56px;border-radius:70px;background:#E5323E;font-weight:900;font-size:48px;opacity:${ease((t - 1.2) / .4)};transform:scale(${1 + .03 * sin(t * 5)})">Tap the link in our bio</div>
        <div style="margin-top:22px;font-weight:700;font-size:34px;color:#dfe4ff;opacity:${ease((t - 1.6) / .4)}">Create your account · every trade at 6 p.m.</div></div>`;
  }
};
