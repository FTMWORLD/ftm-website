/* 26 Nov 09:30 "Two students, one system" (students; Runway moving shots, ElevenLabs mixed voices).
   Hook: Save the Student, National Student Money Survey 2026 (UK): 46% considered dropping out over money. */
window.NOCAP = 1;
const RW = '../assets/2026-11-26-0930s/';
const CLIP = (k, t, d, o) => { const n = 126, f = 1 + Math.min(n - 1, Math.floor(Math.max(0, t) / Math.max(1, d) * (n - 1))); return IMG(RW + k + '/f' + String(f).padStart(3, '0') + '.jpg', t, Object.assign({ z0: 1.02, dz: .03, d: d }, o || {})) + SHADE(.3, .86); };
const say = (t, l1, l2, top, c2) => {
  const a = ease((t - .15) / .4), b = ease((t - .55) / .4);
  return `<div style="position:absolute;left:50px;right:50px;top:${top || 1250}px;text-align:center">
    <div style="font-size:70px;font-weight:900;letter-spacing:-.03em;line-height:1.08;white-space:nowrap;opacity:${a};transform:translateY(${(1 - a) * 24}px);text-shadow:0 8px 34px rgba(0,0,0,.8)">${l1}</div>
    ${l2 ? `<div style="font-size:70px;font-weight:900;letter-spacing:-.03em;line-height:1.08;white-space:nowrap;color:${c2 || '#E3B62F'};margin-top:10px;opacity:${b};transform:translateY(${(1 - b) * 24}px);text-shadow:0 8px 34px rgba(0,0,0,.8)">${l2}</div>` : ''}</div>`;
};
const who = (t, name, sub, top) => { const a = ease((t - .05) / .35); return `<div style="position:absolute;left:0;right:0;top:${top || 1130}px;text-align:center;opacity:${a}"><span style="display:inline-flex;align-items:center;gap:12px;padding:10px 24px;border-radius:40px;background:rgba(5,10,34,.62);border:1.5px solid rgba(212,175,55,.65);font-size:30px;font-weight:800;color:#fff"><i style="width:10px;height:10px;border-radius:50%;background:#E3B62F;display:inline-block"></i>${name}<span style="color:#c9d0ee;font-weight:600">· ${sub}</span></span></div>`; };
const SCN = {
  hook(t, d) {
    const n = Math.round(46 * Math.min(1, .5 + .5 * ease(t / 1.1)));
    return CLIP('a', t, d) + `<div style="position:absolute;left:0;right:0;top:1040px;text-align:center">
      <div style="display:inline-block;padding:12px 30px;border-radius:40px;background:rgba(5,10,34,.6);border:2px solid rgba(212,175,55,.7);color:#E3B62F;font-weight:900;font-size:28px;letter-spacing:.14em">UK STUDENT MONEY SURVEY · 2026</div>
      <div style="font-size:230px;font-weight:900;letter-spacing:-.05em;line-height:1;margin-top:14px;color:#ff8a92;font-variant-numeric:tabular-nums;text-shadow:0 10px 50px rgba(0,0,0,.6)">${n}%</div>
      <div style="font-size:56px;font-weight:900;letter-spacing:-.02em;white-space:nowrap;text-shadow:0 6px 30px rgba(0,0,0,.85)">of students thought about quitting</div>
      <div style="font-size:56px;font-weight:900;letter-spacing:-.02em;white-space:nowrap;color:#E3B62F;margin-top:6px;opacity:${ease((t - .9) / .4)};text-shadow:0 6px 30px rgba(0,0,0,.85)">because of money.</div></div>`;
  },
  shift(t, d) { return CLIP('b', t, d) + who(t, 'Dayo', 'student, works nights') + say(t, 'Lectures till 4.', 'Shifts till midnight.', 1230); },
  lost(t, d) { return CLIP('c', t, d) + who(t, 'Dayo', 'tried trading once') + say(t, 'Lost in two days.', 'Never again.', 1230, '#ff8a92'); },
  friend(t, d) { return CLIP('d', t, d) + who(t, 'Priya', 'student, uses FTM') + say(t, 'FTM MACHINE trades for me.', 'Around the clock. Fixed rules.', 1230); },
  risk(t, d) {
    const a = ease((t - .2) / .4), row = (i, l, v) => { const b = ease((t - .5 - i * .35) / .4); return `<div style="display:flex;justify-content:space-between;align-items:center;gap:20px;padding:18px 26px;border-radius:20px;background:rgba(5,10,34,.72);border:1.5px solid rgba(212,175,55,.45);margin:12px 0;opacity:${b};transform:translateY(${(1 - b) * 18}px)"><span style="font-size:36px;font-weight:700;color:#c9d0ee">${l}</span><b style="font-size:40px;font-weight:900;color:#E3B62F;white-space:nowrap">${v}</b></div>`; };
    return CLIP('d', t + 5, d + 5, { z0: 1.08, dz: .02 }) + `<div style="position:absolute;left:90px;right:90px;top:1040px">
      <div style="text-align:center;margin-bottom:22px;opacity:${a}"><span style="display:inline-block;padding:14px 32px;border-radius:40px;background:#fff;color:#0b1640;font-size:38px;font-weight:900">“And when it loses?”</span></div>
      ${row(0, 'Loss days', 'Every one shown')}${row(1, 'Her risk profile', 'Conservative')}${row(2, 'Normal dips', '10–20%')}</div>` + say(t, 'You choose the risk.', 'You see every trade.', 1500);
  },
  cta(t, d) {
    const opt = (k, x, i) => { const a = ease((t - .9 - i * .3) / .4); return `<div style="display:flex;align-items:center;gap:22px;width:880px;margin:0 auto 18px;padding:20px 28px;border-radius:28px;background:rgba(5,10,34,.7);border:2px solid ${k === 'B' ? 'rgba(212,175,55,.75)' : 'rgba(255,255,255,.28)'};opacity:${a};transform:translateX(${(1 - a) * (k === 'B' ? 40 : -40)}px)"><b style="flex:none;width:80px;height:80px;border-radius:22px;display:grid;place-items:center;font-size:48px;background:${k === 'A' ? '#152a7a' : k === 'B' ? '#D4AF37' : '#E5323E'};color:${k === 'B' ? '#0b1640' : '#fff'}">${k}</b><span style="font-size:46px;font-weight:800;white-space:nowrap">${x}</span></div>`; };
    return CLIP('e', t, d, { z0: 1.0, dz: .04 }) + `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,9,31,.25) 0%,rgba(5,9,31,.55) 40%,rgba(5,9,31,.9) 100%)"></div>
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-40%);text-align:center">
        <div style="font-size:64px;font-weight:900;letter-spacing:-.03em;line-height:1.1;opacity:${ease(t / .4)};text-shadow:0 8px 30px rgba(0,0,0,.7)">Study. Work. Rest.</div>
        <div style="font-size:56px;font-weight:900;letter-spacing:-.03em;color:#E3B62F;margin:8px 0 34px;opacity:${ease((t - .4) / .4)};white-space:nowrap">FTM MACHINE watches the market.</div>
        <div style="font-size:30px;font-weight:800;letter-spacing:.16em;color:#E3B62F;margin-bottom:16px;opacity:${ease((t - .8) / .4)}">STUDENT LIFE RIGHT NOW? · TAP IN THE COMMENTS</div>
        ${opt('A', 'Studying and working', 0)}${opt('B', 'Tried trading, lost', 1)}${opt('C', 'Ready for a system', 2)}
        <div style="display:inline-block;margin-top:22px;padding:26px 56px;border-radius:70px;background:#E5323E;font-weight:900;font-size:48px;opacity:${ease((t - 1.8) / .4)};transform:scale(${1 + .03 * sin(t * 5)})">Tap the link in our bio</div>
        <div style="margin-top:24px;font-weight:700;font-size:34px;color:#dfe4ff;opacity:${ease((t - 2.1) / .4)}">Create your account · every trade at 6 p.m.</div></div>`;
  }
};
