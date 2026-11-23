/* 24 Nov 13:00 "Nvidia's boss is back. Who caught the move?" News reaction with headline cards. ChatGPT photos 2026-11-24-1300-01..06, narrator am_adam, sound drive.
   Facts (CNN, CNBC, Yahoo Finance 23 Nov 2026; Reuters week to 20 Nov): CEO reinstated 23 Nov, stock nearly +30% in morning trading (never a close); week to 20 Nov Nvidia -23%, Nasdaq worst week since March 2020. */
window.NOCAP = 1;
const LP = n => '../assets/2026-11-24-1300/2026-11-24-1300-0' + n + '.jpg';
const ph = (n, t, o) => IMG(LP(n), t, Object.assign({ z0: 1.03, dz: .07, d: 7 }, o || {})) + SHADE(.4, .88);
const say = (t, l1, l2, top, c2) => {
  const a = ease((t - .15) / .4), b = ease((t - .55) / .4);
  return `<div style="position:absolute;left:50px;right:50px;top:${top || 1210}px;text-align:center">
    <div style="font-size:78px;font-weight:900;letter-spacing:-.03em;line-height:1.08;white-space:nowrap;opacity:${a};transform:translateY(${(1 - a) * 24}px);text-shadow:0 8px 34px rgba(0,0,0,.75)">${l1}</div>
    ${l2 ? `<div style="font-size:78px;font-weight:900;letter-spacing:-.03em;line-height:1.08;white-space:nowrap;color:${c2 || '#E3B62F'};margin-top:10px;opacity:${b};transform:translateY(${(1 - b) * 24}px);text-shadow:0 8px 34px rgba(0,0,0,.75)">${l2}</div>` : ''}</div>`;
};
const news = (t, kicker, head, src, tone) => {
  const a = ease(t / .4);
  return `<div style="position:absolute;left:70px;right:70px;top:${330 + (1 - a) * 40}px;opacity:${a}">
    <div style="background:#fff;color:#0b1640;border-radius:26px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.55)">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 28px;background:${tone || '#E5323E'};color:#fff;font-size:28px;font-weight:900;letter-spacing:.14em"><span style="width:14px;height:14px;border-radius:50%;background:#fff;opacity:${.4 + .6 * (Math.floor(t * 2.5) % 2)}"></span>${kicker}</div>
      <div style="padding:26px 30px 24px;font-size:50px;font-weight:900;letter-spacing:-.02em;line-height:1.14;white-space:nowrap">${head}</div>
      <div style="padding:0 30px 22px;font-size:26px;font-weight:700;color:#5a648c">${src}</div></div></div>`;
};
const SCN = {
  hook(t, d) {
    const a = ease(t / .3);
    return ph(4, t, { dz: .1 }) + `<div style="position:absolute;left:0;right:0;top:1080px;text-align:center;opacity:${a}">
      <div style="font-size:48px;font-weight:800;letter-spacing:.04em;color:#fff;text-shadow:0 6px 30px rgba(0,0,0,.8)">Nearly</div>
      <div style="font-size:230px;font-weight:900;letter-spacing:-.06em;line-height:.95;color:#5fe39b;text-shadow:0 10px 50px rgba(0,0,0,.6);transform:scale(${.92 + .08 * back(t / .5)})">+30%</div>
      <div style="font-size:72px;font-weight:900;letter-spacing:-.03em;margin-top:10px;text-shadow:0 6px 30px rgba(0,0,0,.8)">in one morning.</div></div>`;
  },
  back(t, d) { return ph(1, t, { dx: -20 }) + news(t, 'BREAKING · 23 NOV', 'Nvidia brings its CEO back.<br>The stock jumps.', 'CNN · CNBC · Yahoo Finance') + say(t, 'The CEO is back.', 'The stock jumped.'); },
  fear(t, d) { return ph(2, t, { dx: 25 }) + news(t, 'THE WEEK BEFORE · TO 20 NOV', 'Nvidia −23%.<br>Nasdaq: worst week since 2020.', 'Reuters', '#152a7a') + say(t, 'Many people', 'sold in fear.', 1210, '#ff8a92'); },
  work(t, d) { return ph(3, t, { dz: .08 }) + say(t, 'Then the move came.', 'You were at work.'); },
  rules(t, d) { return ph(5, t, { dz: .07 }) + say(t, 'Fear sells.', 'Rules don’t.'); },
  machine(t, d) {
    const chip = (i, x) => { const a = ease((t - .5 - i * .2) / .35); return `<span style="display:inline-block;margin:8px;padding:16px 28px;border-radius:40px;background:rgba(11,22,64,.75);border:1.5px solid rgba(212,175,55,.6);font-size:36px;font-weight:800;opacity:${a};transform:translateY(${(1 - a) * 20}px)">${x}</span>`; };
    return ph(6, t, { dz: .07 }) + `<div style="position:absolute;left:60px;right:60px;top:1000px;text-align:center">${['US Tech 100', 'Fixed rules', '24/7'].map((x, i) => chip(i, x)).join('')}</div>` + say(t, 'FTM MACHINE:', 'rules, not headlines.', 1200);
  },
  cta(t, d) {
    const opt = (k, x, i) => { const a = ease((t - .5 - i * .3) / .4); return `<div style="display:flex;align-items:center;gap:24px;width:900px;margin:0 auto 24px;padding:26px 30px;border-radius:30px;background:rgba(255,255,255,.07);border:2px solid ${k === 'A' ? 'rgba(255,255,255,.25)' : 'rgba(212,175,55,.7)'};opacity:${a};transform:translateX(${(1 - a) * (k === 'A' ? -40 : 40)}px)"><b style="flex:none;width:92px;height:92px;border-radius:24px;display:grid;place-items:center;font-size:56px;background:${k === 'A' ? '#152a7a' : '#D4AF37'};color:${k === 'A' ? '#fff' : '#0b1640'}">${k}</b><span style="font-size:54px;font-weight:800;white-space:nowrap">${x}</span></div>`; };
    return `<div style="position:absolute;inset:0;background:radial-gradient(90% 60% at 50% 45%,#1d3590 0%,#0b1640 55%,#040822 100%)"></div>
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center">
        <div style="font-size:34px;font-weight:800;letter-spacing:.16em;color:#E3B62F;opacity:${ease(t / .4)}">VOTE IN THE COMMENTS</div>
        <div style="font-size:84px;font-weight:900;letter-spacing:-.03em;line-height:1.08;margin:20px 0 46px;opacity:${ease(t / .4)};white-space:nowrap">Nvidia this month:<br>what did you do?</div>
        ${opt('A', 'Sold in fear', 0)}${opt('B', 'Held on', 1)}
        <div style="height:40px"></div>
        <div style="display:inline-block;padding:28px 60px;border-radius:70px;background:#E5323E;font-weight:900;font-size:50px;opacity:${ease((t - 1.3) / .4)};transform:scale(${1 + .03 * sin(t * 5)})">Tap our name for the link</div>
        <div style="margin-top:30px;font-weight:700;font-size:36px;color:#dfe4ff;opacity:${ease((t - 1.7) / .4)}">Watch every FTM trade</div></div>`;
  }
};
