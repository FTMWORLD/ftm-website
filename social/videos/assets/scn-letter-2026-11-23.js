/* Nov 23 09:30 "A letter from you at 65" (retirement). ChatGPT photos letter-01..06 (same man at 30, 45, 65), narrator bm_george.
   The letter's words are written on a paper note (the usual caption box is off). Real figures only: trust engine 2020-2026, 6,209 trades, 7 of 7 years profitable. */
window.NOCAP = 1;
const LP = n => '../assets/2026-11-23/' + n;
function ph(file, t, o) { return IMG(LP(file), t, Object.assign({ z0: 1.03, dz: 0.07, d: 7 }, o || {})) + SHADE(.42, .78); }
const LABEL = (t) => `<div style="position:absolute;left:0;right:0;top:330px;text-align:center;opacity:${ease(t / .5)}"><span style="display:inline-block;padding:12px 30px;border-radius:40px;background:rgba(5,10,34,.55);border:1.5px solid rgba(212,175,55,.6);color:#E3B62F;font-weight:800;font-size:30px;letter-spacing:.14em">A LETTER FROM YOU · AGE 65</span></div>`;
function note(t, dur, txt, sign) {
  const w = txt.split(' '), k = Math.floor(cl((t - .3) / Math.max(.8, (dur - .6) * .92)) * w.length + .999), a = ease(t / .45);
  return `<div style="position:absolute;left:84px;right:84px;top:${1250 + (1 - a) * 40}px;opacity:${a};transform:rotate(-1.2deg);background:linear-gradient(180deg,#fbf5e8,#f1e6cf);border-radius:18px;padding:40px 48px 44px;box-shadow:0 30px 70px rgba(0,0,0,.55);border-left:6px solid #D4AF37">
    <div style="font-family:'Liberation Serif','DejaVu Serif',serif;font-style:italic;font-size:56px;line-height:1.24;color:#0b1640">${w.map((x, j) => `<span style="opacity:${j < k ? 1 : .1}">${x}</span>`).join(' ')}</div>
    ${sign ? `<div style="margin-top:18px;text-align:right;font-family:'Liberation Serif',serif;font-style:italic;font-size:46px;color:#9a7a1f;opacity:${cl((t - dur * .7) / .4)}">${sign}</div>` : ''}</div>`;
}
const SCN = {
  hook(t, d) {
    const a = cl(t / .25 + .6);
    return ph('letter-01.jpg', t, { dz: .09 }) +
      `<div style="position:absolute;left:0;right:0;top:1120px;text-align:center;opacity:${a}">
        <div style="font-family:'Liberation Serif',serif;font-style:italic;font-size:124px;line-height:1.02;color:#fff;text-shadow:0 10px 40px rgba(0,0,0,.6)">A letter<br>from you.</div>
        <div style="display:inline-block;margin-top:34px;padding:16px 46px;border-radius:60px;background:#E3B62F;color:#0b1640;font-weight:900;font-size:56px;transform:scale(${.9 + .1 * back(t / .5)})">Age 65</div></div>`;
  },
  d1(t, d) { return ph('letter-01.jpg', t + 3, { z0: 1.12, dz: .05, dy: -20 }) + LABEL(t) + note(t, d, 'Dear me, I’m writing to you from the year 2061.'); },
  d2(t, d) { return ph('letter-02.jpg', t, { dx: -25 }) + LABEL(t) + note(t, d, 'You’re 30. You think there’s still time. There is, but only if you start.'); },
  d3(t, d) { return ph('letter-03.jpg', t, { dx: 25 }) + LABEL(t) + note(t, d, 'Saving alone wasn’t enough. Prices grew faster than my savings.'); },
  d4(t, d) { return ph('letter-04-ftm.jpg', t, { z0: 1.02, dz: .1, dy: -30 }) + LABEL(t) + note(t, d, 'What worked: a plan with fixed rules. No panic on loss days. No greed on profit days.'); },
  d5(t, d) { return ph('letter-05.jpg', t, { dx: -20 }) + LABEL(t) + note(t, d, 'A little every month. Every trade shown. Years, not days.'); },
  d6(t, d) { return ph('letter-06.jpg', t, { dz: .08 }) + LABEL(t) + note(t, d, 'Thank you for starting.', '– You, at 65'); },
  cta(t, d) {
    const chip = (i, txt) => { const a = ease((t - .5 - i * .25) / .4); return `<div style="opacity:${a};transform:translateY(${(1 - a) * 24}px);margin:0 auto 22px;width:940px;padding:24px 26px;border-radius:26px;background:rgba(255,255,255,.07);border:1.5px solid rgba(212,175,55,.45);font-weight:800;font-size:35px;white-space:nowrap;color:#fff">${txt}</div>`; };
    return `<div style="position:absolute;inset:0;background:radial-gradient(90% 60% at 50% 45%,#1d3590 0%,#0b1640 55%,#040822 100%)"></div>
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-46%);text-align:center">
        <div style="font-family:'Liberation Serif',serif;font-style:italic;font-size:96px;line-height:1.05;color:#fff;opacity:${ease(t / .4)}">Start your plan<br><span style="color:#E3B62F">for later.</span></div>
        <div style="height:56px"></div>
        ${chip(0, 'FTM MACHINE · fixed rules, no emotions')}${chip(1, 'Tested on 6,209 trades · 7 of 7 years profitable')}${chip(2, 'Live account: every trade shown, daily at 6 p.m.')}
        <div style="height:34px"></div>
        <div style="display:inline-block;padding:28px 60px;border-radius:70px;background:#E5323E;font-weight:900;font-size:50px;opacity:${ease((t - 1.4) / .4)};transform:scale(${1 + .03 * sin(t * 5)})">Free account · link in bio</div>
        <div style="margin-top:40px;font-weight:700;font-size:38px;color:#E3B62F;opacity:${ease((t - 1.8) / .4)}">Invest today, secure tomorrow.</div></div>`;
  }
};
