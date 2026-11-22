"""Couple ad: music bed + sound design under the two voices, mixed to -14 LUFS. Event times come from timing.json."""
import json, wave, subprocess, numpy as np, sys
vid, out = sys.argv[1], sys.argv[2]
TM = json.load(open('timing.json')); EV = TM['ev']; OFF = TM['OFF']
sr = 48000; tot = TM['TOTAL']; n = int(tot * sr); t = np.arange(n) / sr; rng = np.random.default_rng(7)
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', 'vo.wav', '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True).stdout
vo = np.zeros(n); d = np.frombuffer(raw, np.float32).astype(float); o0 = int(OFF * sr); vo[o0:o0 + len(d)] = d[:n - o0]
mus = np.zeros(n); fx = np.zeros(n)
def add(buf, a, sig, g=1.0):
    a = int(a * sr); b = min(n, a + len(sig))
    if 0 <= a < n: buf[a:b] += g * sig[:b - a]
def S(*xs):
    m = max(len(x) for x in xs); o = np.zeros(m)
    for x in xs: o[:len(x)] += x
    return o
def lp(x, k): return np.convolve(x, np.ones(k) / k, 'same')
def tone(f, L, dec, h=(1, .35, .12)): tt = np.arange(int(L * sr)) / sr; return np.exp(-tt * dec) * sum(a * np.sin(2 * np.pi * f * (i + 1) * tt) for i, a in enumerate(h)) * np.minimum(1, tt / .004)
FLIP = EV['t11']; END = EV['end']
bpm = 92; beat = 60 / bpm; bar = 4 * beat
ch = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]]
k = 0
while k * bar < tot:
    s0 = k * bar; c = ch[k % 4]; L = int((bar + 1) * sr); tt = np.arange(L) / sr
    env = np.minimum(1, tt / .5) * np.exp(-tt * .25)
    pad = sum(np.sin(2 * np.pi * f * tt + .3 * np.sin(2 * np.pi * 5 * tt)) + .4 * np.sin(2 * np.pi * f * 1.004 * tt) + .2 * np.sin(2 * np.pi * f * 2.002 * tt) for f in c) / 3
    add(mus, s0, pad * env, .5)
    for j in range(8):
        st = s0 + j * beat / 2
        if st >= tot: break
        if st > FLIP - .05: add(mus, st, tone(c[[0, 2, 1, 2, 0, 2, 1, 2][j]] * 2, .5, 7), .16)
    for j in range(4):
        st = s0 + j * beat
        if FLIP <= st < END:
            L3 = int(.3 * sr); t3 = np.arange(L3) / sr; add(mus, st, np.sin(2 * np.pi * (46 + 100 * np.exp(-t3 * 30)) * t3) * np.exp(-t3 * 12), .55)
            add(mus, st, np.sin(2 * np.pi * c[0] / 4 * t3) * np.exp(-t3 * 4) * np.minimum(1, t3 / .01), .35)
            hat = np.diff(rng.standard_normal(int(.04 * sr) + 1)) * np.exp(-np.arange(int(.04 * sr)) / sr * 90); add(mus, st + beat / 2, hat, .04)
    k += 1
mus *= np.where(t < FLIP, .55, 1.0)
# hook: clock ticks, riser, impact + chime on 23:00
for i in range(2):
    tk = np.diff(rng.standard_normal(int(.035 * sr) + 1)) * np.exp(-np.arange(int(.035 * sr)) / sr * 160); add(fx, i * FLIP / 2 + .02, S(tk, .5 * tone(2400, .05, 90)), .55)
Lr = int(min(1.4, FLIP) * sr); tr = np.arange(Lr) / sr; pr = tr / (Lr / sr); nz = rng.standard_normal(Lr); add(fx, FLIP - Lr / sr, (nz - lp(nz, 6)) * pr ** 2.5 * .35 + np.sin(2 * np.pi * np.cumsum(300 + 1200 * pr ** 2) / sr) * pr ** 3 * .2, .9)
Li = int(2.4 * sr); ti = np.arange(Li) / sr; add(fx, FLIP, np.sin(2 * np.pi * (36 + 70 * np.exp(-ti * 8)) * ti) * np.exp(-ti * 1.8) * .9 + lp(rng.standard_normal(Li), 2) * np.exp(-ti * 4) * .15)
add(fx, FLIP + .02, S(tone(1318.5, 1.6, 3), .6 * tone(1975.5, 1.4, 3.5), .4 * tone(2637, 1.2, 4)), .16)
# whooshes on cuts and screen swipes
for a, g in [(s[1], .32) for s in TM['SH'][1:]] + [(EV['slide'], .2), (EV['su'], .2), (END, .5)]:
    L = int(.6 * sr); x = lp(rng.standard_normal(L), 18); add(fx, a - .38, x * np.sin(np.pi * np.arange(L) / L) ** 2, g)
# notification, cards, stamps, toggle, typing, button, success
add(fx, EV['notif'] + .01, S(tone(1567.98, .5, 7), .7 * tone(2093, .5, 7)), .1); add(fx, EV['notif'] + .15, tone(2093, .6, 6), .08)
for a in (EV['bad'], EV['good']):
    L = int(.25 * sr); tt = np.arange(L) / sr; add(fx, a, np.sin(2 * np.pi * (180 + 500 * np.exp(-tt * 25)) * tt) * np.exp(-tt * 18), .35)
for a, f in ((EV['good'] + .25, 880), (EV['bad'] + .25, 330)):
    L = int(.3 * sr); tt = np.arange(L) / sr; add(fx, a, np.sin(2 * np.pi * (60 + 90 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 14) + .3 * tone(f, .3, 10)[:L] if len(tone(f, .3, 10)) >= L else 0, .45)
L = int(.06 * sr); add(fx, EV['tap'] + .05, S(np.diff(rng.standard_normal(L + 1)) * np.exp(-np.arange(L) / sr * 120), tone(1800, .06, 80)), .35)
for i in range(32): L = int(.03 * sr); add(fx, (EV['url'] + i * 1.0 / 19) if i < 19 else (EV['email'] + (i - 19) * .8 / 13) + rng.uniform(-.01, .01), lp(np.diff(rng.standard_normal(L + 1)), 2) * np.exp(-np.arange(L) / sr * 200), .18)
L = int(.12 * sr); add(fx, EV['tapb'], np.sin(2 * np.pi * 900 * np.arange(L) / sr) * np.exp(-np.arange(L) / sr * 40), .12)
add(fx, EV['created'], S(tone(1046.5, .7, 5), tone(1318.5, .7, 5) * .8), .1); add(fx, EV['created'] + .12, tone(1568, .8, 4.5), .1)
# end: soft impact, final sting after "see you at 11"
Li = int(2.5 * sr); ti = np.arange(Li) / sr; add(fx, END, np.sin(2 * np.pi * (40 + 60 * np.exp(-ti * 8)) * ti) * np.exp(-ti * 1.6) * .7)
Ls = int(3.4 * sr); ts = np.arange(Ls) / sr; add(fx, EV['see'] + 1.3, sum(np.sin(2 * np.pi * f * ts) * (1 / (1 + i * .3)) for i, f in enumerate([220, 329.63, 440, 554.37, 659.25])) * np.exp(-ts * .9) * np.minimum(1, ts / .02) / 4, .5)
add(fx, EV['see'] + 1.3, S(tone(1760, 2.5, 1.6), .5 * tone(2637, 2, 1.8)), .07)
mus /= np.abs(mus).max() + 1e-9; mus *= .24; mus *= np.minimum(1, t / .3) * np.minimum(1, (tot - t) / 2.2)
fx /= np.abs(fx).max() + 1e-9; fx *= .4
def duck(vo, sr, depth):  # owner 22 Nov: music dips smoothly under the voice and stays down between words (no pumping / hiccups)
    h = int(sr * .01); fr = np.array([np.abs(vo[i:i + h]).max() for i in range(0, len(vo), h)]) > .02
    held = np.convolve(fr.astype(float), np.ones(71), 'same') > 0   # bridge gaps up to 0.35 s on each side
    g = np.zeros(len(held)); x = 0.
    for i, v in enumerate(held): x += (v - x) * (.25 if v > x else .03); g[i] = x   # ~40 ms down, ~330 ms back up
    return 1 - depth * np.interp(np.arange(len(vo)) / h, np.arange(len(g)), g)
mus *= duck(vo, sr, .55)
for name, arr in (('_v.wav', vo), ('_m.wav', mus + fx)):
    o = wave.open(name, 'w'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes((np.clip(arr, -1, 1) * 32767).astype(np.int16).tobytes()); o.close()
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', '_v.wav', '-i', '_m.wav', '-filter_complex', '[0]acompressor=threshold=-20dB:ratio=2.5:attack=5:release=120,volume=1.6[v];[1]aecho=0.8:0.5:45|80:0.2|0.12,pan=stereo|c0=c0|c1=c0[m];[v]pan=stereo|c0=c0|c1=c0[vs];[vs][m]amix=inputs=2:normalize=0,alimiter=limit=0.9,loudnorm=I=-14:TP=-1.5:LRA=9', '-ar', '48000', '-ac', '2', '_mix.wav'], check=True)
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', vid, '-i', '_mix.wav', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], check=True)
print('ok', out)
