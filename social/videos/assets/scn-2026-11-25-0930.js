/* 25 Nov 09:30 "Mum's second shift" (POV). ChatGPT photos 2026-11-25-0930-01..06, narrator af_heart, sound lofi.
   Statistic: ILO, women do 76.2% of all unpaid care work (more than three times as much as men). */
window.NOCAP = 1;
const LP = n => '../assets/2026-11-25-0930/2026-11-25-0930-0' + n + '.jpg';
const ph = (n, t, o) => IMG(LP(n), t, Object.assign({ z0: 1.03, dz: .07, d: 7 }, o || {})) + SHADE(.36, .86);
const say = (t, l1, l2, top, c2) => {
  const a = ease((t - .15) / .4), b = ease((t - .55) / .4);
  return `<div style="position:absolute;left:50px;right:50px;top:${top || 1210}px;text-align:center">
    <div style="font-size:76px;font-weight:900;letter-spacing:-.03em;line-height:1.08;white-space:nowrap;opacity:${a};transform:translateY(${(1 - a) * 24}px);text-shadow:0 8px 34px rgba(0,0,0,.75)">${l1}</div>
    ${l2 ? `<div style="font-size:76px;font-weight:900;letter-spacing:-.03em;line-height:1.08;white-space:nowrap;color:${c2 || '#E3B62F'};margin-top:10px;opacity:${b};transform:translateY(${(1 - b) * 24}px);text-shadow:0 8px 34px rgba(0,0,0,.75)">${l2}</div>` : ''}</div>`;
};
const pov = t => `<div style="position:absolute;left:0;right:0;top:360px;text-align:center;opacity:${ease(t / .3)}"><span style="display:inline-block;padding:14px 34px;border-radius:40px;background:rgba(5,10,34,.6);border:2px solid rgba(212,175,55,.7);color:#E3B62F;font-weight:900;font-size:34px;letter-spacing:.18em">POV</span></div>`;
const shift = (t, items) => `<div style="position:absolute;left:0;right:0;top:380px;text-align:center">${items.map((x, i) => { const a = ease((t - .2 - i * .45) / .35); return `<div style="display:inline-block;margin:8px;padding:16px 26px;border-radius:24px;background:rgba(5,10,34,.62);border:1.5px solid rgba(255,255,255,.22);font-size:34px;font-weight:800;opacity:${a};transform:translateY(${(1 - a) * 20}px)"><span style="color:#E3B62F;font-variant-numeric:tabular-nums">${x[0]}</span> · ${x[1]}</div>`; }).join('')}</div>`;
const SCN = {
  hook(t, d) { return ph(1, t, { dz: .09 }) + pov(t) + say(t, 'POV: you’re a mum.', 'Your day has no break.', 1180); },
  shift(t, d) { return ph(2, t, { dx: -20 }) + shift(t, [['06:00', 'school run'], ['09:00', 'laundry'], ['12:00', 'cooking'], ['16:00', 'cleaning']]) + say(t, 'School run. Laundry.', 'Cooking. Again.'); },
  stat(t, d) {
    const a = ease(t / .4), n = (76.2 * ease(t / 1.4)).toFixed(1);
    return ph(3, t, { dz: .06 }) + `<div style="position:absolute;left:70px;right:70px;top:380px;opacity:${a}"><div class="glass" style="position:relative;padding:30px 34px;text-align:center">
      <div style="font-size:30px;font-weight:800;letter-spacing:.14em;color:#E3B62F">UNPAID CARE WORK · WORLDWIDE</div>
      <div style="font-size:170px;font-weight:900;letter-spacing:-.05em;line-height:1;margin-top:8px;font-variant-numeric:tabular-nums">${n}%</div>
      <div style="font-size:36px;font-weight:700;color:#dfe4ff">is done by women · ILO</div></div></div>` + say(t, 'More than three times', 'as much as men.');
  },
  rice(t, d) { return ph(4, t, { dx: 20 }) + say(t, 'The markets kept moving.', 'You kept moving too.'); },
  machine(t, d) { return ph(5, t, { dz: .07 }) + say(t, 'FTM MACHINE trades for you.', 'Fixed rules. 24/7.'); },
  yours(t, d) { return ph(6, t, { dz: .07 }) + say(t, 'Your money stays yours.', 'Pause in one tap.'); },
  cta(t, d) {
    const opt = (k, x, i) => { const a = ease((t - .5 - i * .3) / .4); return `<div style="display:flex;align-items:center;gap:24px;width:900px;margin:0 auto 24px;padding:26px 30px;border-radius:30px;background:rgba(255,255,255,.07);border:2px solid ${k === 'A' ? 'rgba(255,255,255,.25)' : 'rgba(212,175,55,.7)'};opacity:${a};transform:translateX(${(1 - a) * (k === 'A' ? -40 : 40)}px)"><b style="flex:none;width:92px;height:92px;border-radius:24px;display:grid;place-items:center;font-size:56px;background:${k === 'A' ? '#152a7a' : '#D4AF37'};color:${k === 'A' ? '#fff' : '#0b1640'}">${k}</b><span style="font-size:54px;font-weight:800;white-space:nowrap">${x}</span></div>`; };
    return `<div style="position:absolute;inset:0;background:radial-gradient(90% 60% at 50% 45%,#1d3590 0%,#0b1640 55%,#040822 100%)"></div>
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center">
        <div style="font-size:34px;font-weight:800;letter-spacing:.16em;color:#E3B62F;opacity:${ease(t / .4)}">VOTE IN THE COMMENTS</div>
        <div style="font-size:80px;font-weight:900;letter-spacing:-.03em;line-height:1.1;margin:20px 0 46px;opacity:${ease(t / .4)};white-space:nowrap">Mums: when do you get<br>time for money?</div>
        ${opt('A', 'Never', 0)}${opt('B', 'Late at night', 1)}
        <div style="height:40px"></div>
        <div style="display:inline-block;padding:28px 60px;border-radius:70px;background:#E5323E;font-weight:900;font-size:50px;opacity:${ease((t - 1.3) / .4)};transform:scale(${1 + .03 * sin(t * 5)})">Tap the link in our bio</div>
        <div style="margin-top:30px;font-weight:700;font-size:36px;color:#dfe4ff;opacity:${ease((t - 1.7) / .4)}">Create your account · every trade at 6 p.m.</div></div>`;
  }
};
