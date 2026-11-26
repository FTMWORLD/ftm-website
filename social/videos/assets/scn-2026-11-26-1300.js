window.NOCAP = 1;
const PH = n => '../assets/2026-11-26-1300/2026-11-26-1300-0' + n + '.jpg';
const STILL = (n, t, d, o) => IMG(PH(n), t, Object.assign({ z0: 1.03, dz: .07, d: d }, o || {})) + SHADE(.25, .88);
const say = (t, l1, l2, top, c2) => {
  const a = ease((t - .15) / .4), b = ease((t - .55) / .4);
  return `<div style="position:absolute;left:50px;right:50px;top:${top || 1260}px;text-align:center">
    <div style="font-size:70px;font-weight:900;letter-spacing:-.03em;line-height:1.08;white-space:nowrap;opacity:${a};transform:translateY(${(1 - a) * 24}px);text-shadow:0 8px 34px rgba(0,0,0,.8)">${l1}</div>
    ${l2 ? `<div style="font-size:70px;font-weight:900;letter-spacing:-.03em;line-height:1.08;white-space:nowrap;color:${c2 || '#E3B62F'};margin-top:10px;opacity:${b};transform:translateY(${(1 - b) * 24}px);text-shadow:0 8px 34px rgba(0,0,0,.8)">${l2}</div>` : ''}</div>`;
};
const who = (t, name, sub, top) => { const a = ease((t - .05) / .35); return `<div style="position:absolute;left:0;right:0;top:${top || 1150}px;text-align:center;opacity:${a}"><span style="display:inline-flex;align-items:center;gap:12px;padding:10px 24px;border-radius:40px;background:rgba(5,10,34,.62);border:1.5px solid rgba(212,175,55,.65);font-size:30px;font-weight:800;color:#fff"><i style="width:10px;height:10px;border-radius:50%;background:#E3B62F;display:inline-block"></i>${name}<span style="color:#c9d0ee;font-weight:600">· ${sub}</span></span></div>`; };
const SCN = {
  hook(t, d) { const a = ease(t / .3), b = ease((t - .45) / .4);
    return STILL(1, t, d) + `<div style="position:absolute;left:0;right:0;top:1150px;text-align:center">
      <div style="display:inline-block;padding:12px 30px;border-radius:40px;background:rgba(5,10,34,.6);border:2px solid rgba(212,175,55,.7);color:#E3B62F;font-weight:900;font-size:28px;letter-spacing:.14em;opacity:${a}">THANKSGIVING · 26 NOV</div>
      <div style="font-size:78px;font-weight:900;letter-spacing:-.03em;line-height:1.08;margin-top:22px;white-space:nowrap;opacity:${a};text-shadow:0 8px 34px rgba(0,0,0,.85)">“What are you thankful for,</div>
      <div style="font-size:78px;font-weight:900;letter-spacing:-.03em;color:#E3B62F;white-space:nowrap;opacity:${b};text-shadow:0 8px 34px rgba(0,0,0,.85)">Grandpa?”</div></div>`; },
  time(t, d) { const s = 1 + .04 * ease(t / .5);
    return STILL(2, t, d, { dz: .09 }) + who(t, 'Grandpa', '40 years at work', 1120) + `<div style="position:absolute;left:0;right:0;top:1220px;text-align:center">
      <div style="font-size:190px;font-weight:900;letter-spacing:-.05em;line-height:1;color:#E3B62F;transform:scale(${s});text-shadow:0 10px 50px rgba(0,0,0,.7)">“Time.”</div>
      <div style="font-size:52px;font-weight:900;white-space:nowrap;margin-top:18px;opacity:${ease((t - .9) / .4)};text-shadow:0 6px 30px rgba(0,0,0,.85)">40 years trading time for money.</div></div>`; },
  work(t, d) { return STILL(3, t, d, { dz: .05, dx: 10 }) + say(t, 'Every market move', 'happened while he worked.', 1300); },
  shut(t, d) { return STILL(4, t, d) + who(t, 'Today', 'US stock markets closed', 1120) + say(t, 'Wall Street is closed.', 'The world isn’t.', 1230) + `<div style="position:absolute;left:0;right:0;top:1490px;text-align:center;opacity:${ease((t - 1.1) / .4)}"><span style="display:inline-block;padding:14px 30px;border-radius:40px;background:rgba(5,10,34,.7);border:1.5px solid rgba(212,175,55,.6);font-size:34px;font-weight:800">Gold · Bitcoin · Asia still move</span></div>`; },
  machine(t, d) {
    const chip = (x, i) => { const a = ease((t - .7 - i * .25) / .35); return `<span style="display:inline-block;margin:8px;padding:14px 28px;border-radius:40px;background:rgba(5,10,34,.72);border:1.5px solid rgba(212,175,55,.6);font-size:36px;font-weight:800;opacity:${a};transform:translateY(${(1 - a) * 16}px)">${x}</span>`; };
    return STILL(5, t, d, { dz: .05, dx: -12 }) + say(t, 'FTM MACHINE trades.', 'He keeps his time.', 1180) + `<div style="position:absolute;left:60px;right:60px;top:1430px;text-align:center">${chip('5 markets', 0)}${chip('Fixed rules', 1)}${chip('Every trade shown', 2)}</div>`; },
  waste(t, d) { return STILL(6, t, d, { z0: 1.06, dz: .05 }) + say(t, '“Don’t waste the one thing', 'I didn’t have.”', 1250); },
  cta(t, d) {
    const opt = (k, x, i) => { const a = ease((t - .6 - i * .3) / .4); return `<div style="display:flex;align-items:center;gap:22px;width:820px;margin:0 auto 18px;padding:20px 28px;border-radius:28px;background:rgba(5,10,34,.72);border:2px solid ${k === 'A' ? 'rgba(212,175,55,.75)' : 'rgba(255,255,255,.28)'};opacity:${a};transform:translateX(${(1 - a) * (k === 'A' ? -40 : 40)}px)"><b style="flex:none;width:80px;height:80px;border-radius:22px;display:grid;place-items:center;font-size:48px;background:${k === 'A' ? '#D4AF37' : '#152a7a'};color:${k === 'A' ? '#0b1640' : '#fff'}">${k}</b><span style="font-size:52px;font-weight:800;white-space:nowrap">${x}</span></div>`; };
    return STILL(6, t + 4, 9, { z0: 1.1, dz: .03 }) + `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,9,31,.2) 0%,rgba(5,9,31,.6) 42%,rgba(5,9,31,.92) 100%)"></div>
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-30%);text-align:center">
        <div style="font-size:32px;font-weight:800;letter-spacing:.16em;color:#E3B62F;margin-bottom:18px;opacity:${ease(t / .4)}">THANKFUL FOR MORE… · TAP IN THE COMMENTS</div>
        ${opt('A', 'Time', 0)}${opt('B', 'Money', 1)}
        <div style="display:inline-block;margin-top:24px;padding:26px 56px;border-radius:70px;background:#E5323E;font-weight:900;font-size:48px;opacity:${ease((t - 1.4) / .4)};transform:scale(${1 + .03 * sin(t * 5)})">Tap the link in our bio</div>
        <div style="margin-top:22px;font-weight:700;font-size:34px;color:#dfe4ff;opacity:${ease((t - 1.8) / .4)}">Create your account · every trade at 6 p.m.</div></div>`;
  }
};
