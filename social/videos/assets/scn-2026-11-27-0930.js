/* 27 Nov 09:30 "Black Friday: the sale nobody tells you about" (young workers; ChatGPT pictures + Runway moving shots; ElevenLabs mixed voices).
   Statistic: NRF, 64% of shoppers plan to buy most of their holiday gifts over Thanksgiving weekend. */
window.NOCAP = 1;
const RW = '../assets/2026-11-27-0930s/', PH = n => '../assets/2026-11-27-0930/2026-11-27-0930-0' + n + '.jpg';
const CLIP = (k, t, d, o) => { const n = 126, f = 1 + Math.min(n - 1, Math.floor(Math.max(0, t) / Math.max(1, d) * (n - 1))); return IMG(RW + k + '/f' + String(f).padStart(3, '0') + '.jpg', t, Object.assign({ z0: 1.02, dz: .03, d: d }, o || {})) + SHADE(.3, .86); };
const STILL = (n, t, d, o) => IMG(PH(n), t, Object.assign({ z0: 1.03, dz: .07, d: d }, o || {})) + SHADE(.3, .86);
const say = (t, l1, l2, top, c2) => {
  const a = ease((t - .15) / .4), b = ease((t - .55) / .4);
  return `<div style="position:absolute;left:50px;right:50px;top:${top || 1250}px;text-align:center">
    <div style="font-size:70px;font-weight:900;letter-spacing:-.03em;line-height:1.08;white-space:nowrap;opacity:${a};transform:translateY(${(1 - a) * 24}px);text-shadow:0 8px 34px rgba(0,0,0,.8)">${l1}</div>
    ${l2 ? `<div style="font-size:70px;font-weight:900;letter-spacing:-.03em;line-height:1.08;white-space:nowrap;color:${c2 || '#E3B62F'};margin-top:10px;opacity:${b};transform:translateY(${(1 - b) * 24}px);text-shadow:0 8px 34px rgba(0,0,0,.8)">${l2}</div>` : ''}</div>`;
};
const who = (t, name, sub, top) => { const a = ease((t - .05) / .35); return `<div style="position:absolute;left:0;right:0;top:${top || 1130}px;text-align:center;opacity:${a}"><span style="display:inline-flex;align-items:center;gap:12px;padding:10px 24px;border-radius:40px;background:rgba(5,10,34,.62);border:1.5px solid rgba(212,175,55,.65);font-size:30px;font-weight:800;color:#fff"><i style="width:10px;height:10px;border-radius:50%;background:#E3B62F;display:inline-block"></i>${name}<span style="color:#c9d0ee;font-weight:600">· ${sub}</span></span></div>`; };
const num = (t, n, label, top) => { const a = ease((t - .1) / .35); return `<div style="position:absolute;left:0;right:0;top:${top || 1040}px;text-align:center;opacity:${a}"><span style="display:inline-grid;place-items:center;width:110px;height:110px;border-radius:50%;background:#E5323E;font-size:70px;font-weight:900;box-shadow:0 18px 50px rgba(229,50,62,.45);transform:scale(${.7 + .3 * back(Math.min(1, t / .45))})">${n}</span><div style="margin-top:16px;font-size:30px;font-weight:800;letter-spacing:.16em;color:#E3B62F">${label}</div></div>`; };
const SCN = {
  hook(t, d) { const a = ease(t / .3), b = ease((t - .5) / .4);
    return CLIP('1', t, d) + `<div style="position:absolute;left:0;right:0;top:1080px;text-align:center">
      <div style="display:inline-block;padding:14px 34px;border-radius:40px;background:#E5323E;font-weight:900;font-size:40px;letter-spacing:.12em;opacity:${a};transform:rotate(-3deg) scale(${.8 + .2 * a})">BLACK FRIDAY</div>
      <div style="font-size:92px;font-weight:900;letter-spacing:-.03em;line-height:1.05;margin-top:22px;opacity:${b};text-shadow:0 8px 34px rgba(0,0,0,.8)">3 things</div>
      <div style="font-size:72px;font-weight:900;letter-spacing:-.03em;color:#E3B62F;opacity:${b};white-space:nowrap;text-shadow:0 8px 34px rgba(0,0,0,.8)">nobody tells you.</div></div>`; },
  one(t, d) { const v = Math.round(64 * Math.min(1, .5 + .5 * ease((t - .3) / 1.1)));
    return CLIP('2', t, d) + num(t, '1', 'THING ONE', 880) + `<div style="position:absolute;left:0;right:0;top:1120px;text-align:center">
      <div style="font-size:200px;font-weight:900;letter-spacing:-.05em;line-height:1;color:#E3B62F;font-variant-numeric:tabular-nums;text-shadow:0 10px 50px rgba(0,0,0,.6)">${v}%</div>
      <div style="font-size:52px;font-weight:900;white-space:nowrap;text-shadow:0 6px 30px rgba(0,0,0,.85)">of shoppers buy most gifts</div>
      <div style="font-size:52px;font-weight:900;white-space:nowrap;color:#E3B62F;text-shadow:0 6px 30px rgba(0,0,0,.85)">this one weekend.</div>
      <div style="margin-top:14px;font-size:24px;font-weight:700;color:#c9d0ee">Source: National Retail Federation survey</div></div>`; },
  two(t, d) { return STILL(3, t, d, { dz: .06 }) + num(t, '2', 'THING TWO', 1060) + say(t, 'A discount is still', 'money leaving.', 1300, '#ff8a92'); },
  three(t, d) { return CLIP('4', t, d) + num(t, '3', 'THING THREE', 1060) + say(t, 'Your future self', 'gets no sale.', 1300); },
  machine(t, d) { return STILL(5, t, d, { dz: .05, dx: -15 }) + say(t, 'FTM MACHINE works', 'for your future.', 1180) + `<div style="position:absolute;left:0;right:0;top:1440px;text-align:center;opacity:${ease((t - 1) / .4)}"><span style="display:inline-block;padding:14px 30px;border-radius:40px;background:rgba(5,10,34,.7);border:1.5px solid rgba(212,175,55,.6);font-size:34px;font-weight:800">Fixed rules · every day of the year</span></div>`; },
  watch(t, d) { return CLIP('6', t, d * 1.6) + say(t, 'Before you buy anything:', 'watch the live account.', 1260); },
  cta(t, d) {
    const opt = (k, x, i) => { const a = ease((t - .6 - i * .3) / .4); return `<div style="display:flex;align-items:center;gap:22px;width:860px;margin:0 auto 18px;padding:20px 28px;border-radius:28px;background:rgba(5,10,34,.72);border:2px solid ${k === 'B' ? 'rgba(212,175,55,.75)' : 'rgba(255,255,255,.28)'};opacity:${a};transform:translateX(${(1 - a) * (k === 'B' ? 40 : -40)}px)"><b style="flex:none;width:80px;height:80px;border-radius:22px;display:grid;place-items:center;font-size:48px;background:${k === 'A' ? '#E5323E' : '#D4AF37'};color:${k === 'B' ? '#0b1640' : '#fff'}">${k}</b><span style="font-size:48px;font-weight:800;white-space:nowrap">${x}</span></div>`; };
    return CLIP('6', t + 5, 9) + `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,9,31,.2) 0%,rgba(5,9,31,.6) 42%,rgba(5,9,31,.92) 100%)"></div>
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-30%);text-align:center">
        <div style="font-size:32px;font-weight:800;letter-spacing:.16em;color:#E3B62F;margin-bottom:18px;opacity:${ease(t / .4)}">BLACK FRIDAY: YOU… · TAP IN THE COMMENTS</div>
        ${opt('A', 'Bought on impulse', 0)}${opt('B', 'Kept my money', 1)}
        <div style="display:inline-block;margin-top:24px;padding:26px 56px;border-radius:70px;background:#E5323E;font-weight:900;font-size:48px;opacity:${ease((t - 1.4) / .4)};transform:scale(${1 + .03 * sin(t * 5)})">Tap the link in our bio</div>
        <div style="margin-top:22px;font-weight:700;font-size:34px;color:#dfe4ff;opacity:${ease((t - 1.8) / .4)}">Create your account · every trade at 6 p.m.</div></div>`;
  }
};
