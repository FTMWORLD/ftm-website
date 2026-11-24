/* 26 Nov 09:30 "Myth or fact?" (myth vs fact, students). ChatGPT photos 2026-11-26-0930-01..06, narrator am_michael, sound bright.
   Statistic: Chague, De-Losso & Giovannetti (2019), "Day Trading for a Living?": 97% of people who day-traded Brazilian futures for more than 300 days lost money. */
window.NOCAP = 1;
const LP = n => '../assets/2026-11-26-0930/2026-11-26-0930-0' + n + '.jpg';
const ph = (n, t, o) => IMG(LP(n), t, Object.assign({ z0: 1.03, dz: .07, d: 7 }, o || {})) + SHADE(.34, .88);
const say = (t, l1, l2, top, c2) => {
  const a = ease((t - .15) / .4), b = ease((t - .55) / .4);
  return `<div style="position:absolute;left:50px;right:50px;top:${top || 1250}px;text-align:center">
    <div style="font-size:74px;font-weight:900;letter-spacing:-.03em;line-height:1.08;white-space:nowrap;opacity:${a};transform:translateY(${(1 - a) * 24}px);text-shadow:0 8px 34px rgba(0,0,0,.75)">${l1}</div>
    ${l2 ? `<div style="font-size:74px;font-weight:900;letter-spacing:-.03em;line-height:1.08;white-space:nowrap;color:${c2 || '#E3B62F'};margin-top:10px;opacity:${b};transform:translateY(${(1 - b) * 24}px);text-shadow:0 8px 34px rgba(0,0,0,.75)">${l2}</div>` : ''}</div>`;
};
// the verdict stamp: MYTH (red, crossed) or FACT (green, ticked), popping in
const stamp = (t, kind, top) => {
  const a = back(Math.min(1, t / .45)), myth = kind === 'MYTH', c = myth ? '#E5323E' : '#1fae6b';
  return `<div style="position:absolute;left:0;right:0;top:${top || 1080}px;text-align:center;opacity:${Math.min(1, t / .2)}"><span style="display:inline-flex;align-items:center;gap:18px;padding:16px 40px;border-radius:22px;border:5px solid ${c};color:#fff;background:${c};font-weight:900;font-size:66px;letter-spacing:.12em;transform:rotate(-4deg) scale(${.6 + .4 * a});box-shadow:0 18px 50px rgba(0,0,0,.45)">${myth ? '✕' : '✓'} ${kind}</span></div>`;
};
const SCN = {
  hook(t, d) {
    const n = Math.round(97 * Math.min(1, .6 + .4 * ease(t / 1.1)));
    return ph(3, t, { dz: .09 }) + `<div style="position:absolute;left:0;right:0;top:1080px;text-align:center">
      <div style="display:inline-block;padding:12px 30px;border-radius:40px;background:rgba(5,10,34,.6);border:2px solid rgba(212,175,55,.7);color:#E3B62F;font-weight:900;font-size:30px;letter-spacing:.14em">DAY TRADING STUDY · 2019</div>
      <div style="font-size:230px;font-weight:900;letter-spacing:-.05em;line-height:1;margin-top:14px;color:#ff8a92;font-variant-numeric:tabular-nums;text-shadow:0 10px 50px rgba(0,0,0,.6)">${n}%</div>
      <div style="font-size:58px;font-weight:900;letter-spacing:-.02em;white-space:nowrap;text-shadow:0 6px 30px rgba(0,0,0,.8)">of people who day-traded</div>
      <div style="font-size:58px;font-weight:900;letter-spacing:-.02em;white-space:nowrap;color:#E3B62F;margin-top:6px;opacity:${ease((t - .9) / .4)};text-shadow:0 6px 30px rgba(0,0,0,.8)">for 300+ days lost money.</div></div>`;
  },
  quiz(t, d) {
    const a = ease(t / .35);
    return ph(2, t, { dx: -20 }) + `<div style="position:absolute;left:0;right:0;top:1060px;text-align:center;opacity:${a}"><span style="display:inline-block;padding:14px 36px;border-radius:40px;background:rgba(5,10,34,.62);border:2px solid rgba(212,175,55,.75);color:#E3B62F;font-weight:900;font-size:40px;letter-spacing:.16em">STUDENTS · MYTH OR FACT?</span></div>` + say(t, 'Investing is only', 'for rich people.', 1200, '#ffffff');
  },
  rich(t, d) { return ph(1, t, { dz: .08 }) + stamp(t, 'MYTH', 1060) + say(t, 'It is about rules,', 'not riches.', 1240); },
  charts(t, d) { return ph(5, t, { dx: 20 }) + stamp(t, 'MYTH', 1060) + say(t, 'Watch charts all day?', 'FTM MACHINE does. 24/7.', 1240); },
  yours(t, d) { return ph(4, t, { dz: .07 }) + stamp(t, 'MYTH', 1060) + say(t, 'Hand your money over?', 'It stays in your account.', 1240); },
  fact(t, d) { return ph(6, t, { dz: .07 }) + stamp(t, 'FACT', 1060) + say(t, 'Loss days happen.', 'We show every one.', 1240); },
  cta(t, d) {
    const opt = (k, x, i) => { const a = ease((t - .5 - i * .3) / .4); return `<div style="display:flex;align-items:center;gap:24px;width:900px;margin:0 auto 22px;padding:24px 30px;border-radius:30px;background:rgba(255,255,255,.07);border:2px solid ${k === 'B' ? 'rgba(212,175,55,.7)' : 'rgba(255,255,255,.25)'};opacity:${a};transform:translateX(${(1 - a) * (k === 'B' ? 40 : -40)}px)"><b style="flex:none;width:88px;height:88px;border-radius:24px;display:grid;place-items:center;font-size:54px;background:${k === 'A' ? '#152a7a' : k === 'B' ? '#D4AF37' : '#E5323E'};color:${k === 'B' ? '#0b1640' : '#fff'}">${k}</b><span style="font-size:52px;font-weight:800;white-space:nowrap">${x}</span></div>`; };
    return `<div style="position:absolute;inset:0;background:radial-gradient(90% 60% at 50% 45%,#1d3590 0%,#0b1640 55%,#040822 100%)"></div>
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center">
        <div style="font-size:34px;font-weight:800;letter-spacing:.16em;color:#E3B62F;opacity:${ease(t / .4)}">VOTE IN THE COMMENTS</div>
        <div style="font-size:82px;font-weight:900;letter-spacing:-.03em;line-height:1.08;margin:20px 0 44px;opacity:${ease(t / .4)};white-space:nowrap">Which myth did<br>you believe?</div>
        ${opt('A', 'Only for the rich', 0)}${opt('B', 'Charts all day', 1)}${opt('C', 'Give my money away', 2)}
        <div style="height:36px"></div>
        <div style="display:inline-block;padding:28px 60px;border-radius:70px;background:#E5323E;font-weight:900;font-size:50px;opacity:${ease((t - 1.4) / .4)};transform:scale(${1 + .03 * sin(t * 5)})">Tap the link in our bio</div>
        <div style="margin-top:30px;font-weight:700;font-size:36px;color:#dfe4ff;opacity:${ease((t - 1.8) / .4)}">Create your account · every trade at 6 p.m.</div></div>`;
  }
};
