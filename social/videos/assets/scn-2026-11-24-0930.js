/* 24 Nov 09:30 "The market never sleeps. You do." Day in the life with clock stamps. ChatGPT photos 2026-11-24-0930-01..06, narrator bf_emma, sound news. */
window.NOCAP = 1;
const LP = n => '../assets/2026-11-24-0930/2026-11-24-0930-0' + n + '.jpg';
const ph = (n, t, o) => IMG(LP(n), t, Object.assign({ z0: 1.03, dz: .07, d: 7 }, o || {})) + SHADE(.38, .86);
const clock = (t, hm, place) => {
  const a = ease(t / .35), [h, m] = hm.split(':');
  return `<div style="position:absolute;left:0;right:0;top:${380 + (1 - a) * 30}px;text-align:center;opacity:${a}">
    <div style="display:inline-flex;align-items:center;gap:22px;padding:18px 40px;border-radius:30px;background:rgba(5,10,34,.62);border:2px solid rgba(212,175,55,.7);box-shadow:0 20px 60px rgba(0,0,0,.5)">
      <svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" stroke="#D4AF37" stroke-width="4"/><line x1="32" y1="32" x2="${32 + 16 * Math.sin((+h % 12) / 12 * 2 * PI)}" y2="${32 - 16 * Math.cos((+h % 12) / 12 * 2 * PI)}" stroke="#fff" stroke-width="5" stroke-linecap="round"/><line x1="32" y1="32" x2="${32 + 22 * Math.sin((+m / 60 + t * .02) * 2 * PI)}" y2="${32 - 22 * Math.cos((+m / 60 + t * .02) * 2 * PI)}" stroke="#E3B62F" stroke-width="3" stroke-linecap="round"/></svg>
      <span style="font-size:96px;font-weight:900;letter-spacing:-.03em;font-variant-numeric:tabular-nums">${h}<span style="opacity:${.4 + .6 * (Math.floor(t * 2) % 2)}">:</span>${m}</span></div>
    ${place ? `<div style="margin-top:18px;font-size:32px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#E3B62F;text-shadow:0 4px 20px rgba(0,0,0,.7)">${place}</div>` : ''}</div>`;
};
const say = (t, l1, l2, top) => {
  const a = ease((t - .15) / .4), b = ease((t - .55) / .4);
  return `<div style="position:absolute;left:60px;right:60px;top:${top || 1210}px;text-align:center">
    <div style="font-size:78px;font-weight:900;letter-spacing:-.03em;line-height:1.08;white-space:nowrap;opacity:${a};transform:translateY(${(1 - a) * 24}px);text-shadow:0 8px 34px rgba(0,0,0,.75)">${l1}</div>
    ${l2 ? `<div style="font-size:78px;font-weight:900;letter-spacing:-.03em;line-height:1.08;white-space:nowrap;color:#E3B62F;margin-top:10px;opacity:${b};transform:translateY(${(1 - b) * 24}px);text-shadow:0 8px 34px rgba(0,0,0,.75)">${l2}</div>` : ''}</div>`;
};
const pulse = (t, label) => {
  let d = ''; for (let i = 0; i <= 60; i++) { const x = i * 14, y = 60 - 34 * Math.sin(i * .35 + t * 3) * Math.exp(-Math.pow((i - 30 - t * 6) % 60, 2) / 400) - 6 * Math.sin(i * .9); d += (i ? 'L' : 'M') + x + ' ' + y; }
  return `<div style="position:absolute;left:120px;right:120px;top:640px;opacity:${ease((t - .4) / .5)}"><div class="glass" style="position:relative;padding:22px 30px 18px"><div style="font-size:28px;font-weight:800;letter-spacing:.12em;color:#E3B62F">${label}</div>
    <svg width="780" height="110" viewBox="0 0 840 110"><path d="${d}" fill="none" stroke="#5fe39b" stroke-width="5" stroke-linecap="round"/></svg></div></div>`;
};
const SCN = {
  hook(t, d) { return ph(1, t, { dz: .09 }) + clock(t, '03:12', '') + say(t, 'You’re asleep.', 'The market isn’t.', 1180); },
  btc(t, d) { return ph(1, t + 4, { z0: 1.16, dz: .05, dx: -30 }) + clock(t, '03:12', 'Bitcoin · while the world sleeps') + pulse(t, 'BITCOIN · LIVE') + say(t, 'Bitcoin moves.', 'Nobody is watching.'); },
  tokyo(t, d) { return ph(2, t, { dx: -25 }) + clock(t, '08:40', 'Tokyo · the yen') + say(t, 'Tokyo trades the yen.', 'You’re in traffic.'); },
  ny(t, d) { return ph(3, t, { dx: 25 }) + clock(t, '15:30', 'New York opens · Berlin time') + say(t, 'New York opens.', 'You’re in a meeting.'); },
  gold(t, d) { return ph(4, t, { dz: .08 }) + clock(t, '19:00', 'Gold · still moving') + say(t, 'Dinner with friends.', 'Gold is still moving.'); },
  machine(t, d) {
    const chip = (i, x) => { const a = ease((t - .5 - i * .18) / .35); return `<span style="display:inline-block;margin:8px;padding:16px 26px;border-radius:40px;background:rgba(11,22,64,.7);border:1.5px solid rgba(212,175,55,.6);font-size:34px;font-weight:800;opacity:${a};transform:translateY(${(1 - a) * 20}px)">${x}</span>`; };
    return ph(5, t, { dz: .1 }) + `<div style="position:absolute;left:0;right:0;top:560px;text-align:center"><div style="font-size:30px;font-weight:800;letter-spacing:.16em;color:#E3B62F">FTM MACHINE</div>
      <div style="font-size:150px;font-weight:900;letter-spacing:-.05em;line-height:1;margin-top:10px;opacity:${ease(t / .4)}">24/7</div></div>
      <div style="position:absolute;left:70px;right:70px;top:880px;text-align:center">${['Gold', 'Bitcoin', 'US Tech 100', 'USD/JPY', 'Hang Seng 50'].map((x, i) => chip(i, x)).join('')}</div>` + say(t, '5 markets. Fixed rules.', 'One machine.');
  },
  proof(t, d) { return ph(6, t, { dz: .07 }) + say(t, 'Every trade shown.', 'Watch every one.'); },
  cta(t, d) {
    const opt = (k, x, i) => { const a = ease((t - .5 - i * .3) / .4); return `<div style="display:flex;align-items:center;gap:24px;width:900px;margin:0 auto 24px;padding:26px 30px;border-radius:30px;background:rgba(255,255,255,.07);border:2px solid ${k === 'A' ? 'rgba(255,255,255,.25)' : 'rgba(212,175,55,.7)'};opacity:${a};transform:translateX(${(1 - a) * (k === 'A' ? -40 : 40)}px)"><b style="flex:none;width:92px;height:92px;border-radius:24px;display:grid;place-items:center;font-size:56px;background:${k === 'A' ? '#152a7a' : '#D4AF37'};color:${k === 'A' ? '#fff' : '#0b1640'}">${k}</b><span style="font-size:54px;font-weight:800;white-space:nowrap">${x}</span></div>`; };
    return `<div style="position:absolute;inset:0;background:radial-gradient(90% 60% at 50% 45%,#1d3590 0%,#0b1640 55%,#040822 100%)"></div>
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center">
        <div style="font-size:34px;font-weight:800;letter-spacing:.16em;color:#E3B62F;opacity:${ease(t / .4)}">VOTE IN THE COMMENTS</div>
        <div style="font-size:84px;font-weight:900;letter-spacing:-.03em;line-height:1.08;margin:20px 0 46px;opacity:${ease(t / .4)};white-space:nowrap">When do you check<br>the markets?</div>
        ${opt('A', 'Every hour', 0)}${opt('B', 'Only after work', 1)}
        <div style="height:40px"></div>
        <div style="display:inline-block;padding:28px 60px;border-radius:70px;background:#E5323E;font-weight:900;font-size:50px;opacity:${ease((t - 1.3) / .4)};transform:scale(${1 + .03 * sin(t * 5)})">Tap the link in our bio</div>
        <div style="margin-top:30px;font-weight:700;font-size:36px;color:#dfe4ff;opacity:${ease((t - 1.7) / .4)}">Create your account · every trade at 6 p.m.</div></div>`;
  }
};
