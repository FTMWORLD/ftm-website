"""FTM finance music bed (own synthesis, copyright-free): finance_bed(seconds, cut_times, sr, bpm, seed, style) -> (left, right).
Styles (owner 23 Nov 2026: every post must not sound the same): drive (default, pulsing minor), lofi (slow jazzy keys, vinyl),
news (ticking newsroom, tense), cinema (no drums, rising swell), bright (upbeat major, marimba). STYLES lists them."""
import numpy as np


STYLES = ('drive', 'lofi', 'news', 'cinema', 'bright', 'afro', 'house')  # owner 24 Nov: better, warmer sounds (afro = amapiano log-drum groove, house = uplifting four-on-the-floor)


def finance_bed(tot, cuts=(), sr=48000, bpm=122, seed=5, style='drive'):
    if style != 'drive': return _styled(tot, cuts, sr, bpm, seed, style)
    n = int(tot * sr); L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(seed)
    beat = 60 / bpm; bar = 4 * beat; s16 = beat / 4

    def add(a, sig, g=1.0, pan=0.0):
        a = int(a * sr); b = min(n, a + len(sig))
        if a < 0 or a >= n: return
        L[a:b] += g * (1 - max(0, pan)) * sig[:b - a]; R[a:b] += g * (1 + min(0, pan)) * sig[:b - a]

    def env(Ln, att, dec):  # every note fades out over its last 10 ms (owner 22 Nov: notes that stop mid-wave click)
        tt = np.arange(int(Ln * sr)) / sr; e = np.minimum(1, tt / att) * np.exp(-tt * dec); f = min(len(e), int(.01 * sr)); e[-f:] *= np.linspace(1, 0, f); return tt, e
    def saw(f, tt): return 2 * ((f * tt) % 1) - 1
    def lp(x, k): return np.convolve(x, np.ones(k) / k, 'same')
    # Am - F - C - G (A minor: serious, driving)
    CH = [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [261.63, 329.63, 392.0], [196.0, 246.94, 293.66]]
    BASS = [55.0, 43.65, 65.41, 49.0]
    pump = np.ones(n)
    k = 0
    while k * bar < tot + bar:
        s0 = k * bar; c = CH[k % 4]
        # pad (wide, slightly detuned saws, low-passed)
        tt, e = env(bar + .3, .08, .6)
        for j, f in enumerate(c):
            p = lp(saw(f, tt) + saw(f * 1.006, tt), 9) * e * .07
            add(s0, p, 1, -.5 + .5 * j)
        # pulsing 8th-note bass
        for j in range(8):
            tt, e = env(beat / 2 * .9, .004, 5)
            b = (np.sin(2 * np.pi * BASS[k % 4] * tt) + .35 * lp(saw(BASS[k % 4] * 2, tt), 5)) * e
            add(s0 + j * beat / 2, b, .5)
        # plucked stabs on the off-beats
        for j in (1, 3, 6):
            tt, e = env(.28, .002, 16)
            st = sum(np.sin(2 * np.pi * f * 2 * tt) + .4 * np.sin(4 * np.pi * f * 2 * tt) for f in c) / 3 * e
            add(s0 + j * beat / 2, st, .22, .35 if j % 2 else -.35)
        # bell motif (market ticker feel) every bar, answering phrase every second bar
        mot = [c[2] * 2, c[1] * 2, c[2] * 2, c[0] * 4] if k % 2 else [c[0] * 2, c[2] * 2]
        for j, f in enumerate(mot):
            tt, e = env(.6, .002, 6)
            add(s0 + (2 + j * .5) * beat, (np.sin(2 * np.pi * f * tt) + .25 * np.sin(2 * np.pi * f * 2.76 * tt)) * e, .1, .3)
        # drums: kick on every beat, clap on 2 and 4, 16th hats with accents
        for j in range(4):
            a = s0 + j * beat
            tt, e = env(.32, .001, 11); add(a, np.sin(2 * np.pi * (48 + 120 * np.exp(-tt * 32)) * tt) * e, .75)
            i0 = int(a * sr); w = int(.18 * sr)
            if 0 <= i0 < n: pump[i0:i0 + w] = np.minimum(pump[i0:i0 + w], .55 + .45 * (np.arange(min(w, n - i0)) / w))
            if j % 2 == 1:
                tt, e = env(.18, .001, 22); nz = rng.standard_normal(len(tt)); add(a, (nz - lp(nz, 3)) * e, .2)
        for j in range(16):
            tt, e = env(.05, .0005, 90 if j % 2 else 60); nz = np.diff(rng.standard_normal(len(tt) + 1))
            add(s0 + j * s16, nz * e, .05 if j % 4 == 2 else .028, .4 if j % 2 else -.4)
        k += 1
    # sidechain pump on the music (not on drums would be ideal; a gentle pump on everything keeps it vibrant)
    pump = np.convolve(pump, np.ones(int(.006 * sr)) / int(.006 * sr), 'same')  # owner 22 Nov: no instant gain steps (they click)
    L *= pump; R *= pump
    # impact at the start, riser + whoosh into every cut, final hit
    tt, e = env(2.2, .001, 2.2); boom = np.sin(2 * np.pi * (40 + 70 * np.exp(-tt * 9)) * tt) * e; add(0, boom, .6)
    tt, e = env(1.6, .001, 3); nz = lp(rng.standard_normal(len(tt)), 2) * e; add(0, nz, .08, -.3); add(0, nz[::-1][:len(nz)] * 0 + nz, .08, .3)
    for c0 in cuts:
        Lr = int(1.2 * sr); tr = np.arange(Lr) / sr; pr = tr / 1.2; nz = rng.standard_normal(Lr)
        add(c0 - 1.2, (nz - lp(nz, 6)) * pr ** 3 * .16, 1, -.2); add(c0 - 1.2, (nz - lp(nz, 6))[::-1] * pr ** 3 * .16, 1, .2)
        Lw = int(.7 * sr); x = lp(rng.standard_normal(Lw), 20) * np.sin(np.pi * np.arange(Lw) / Lw) ** 2; add(c0 - .35, x, .5)
        tt, e = env(.9, .001, 5); add(c0, np.sin(2 * np.pi * (45 + 60 * np.exp(-tt * 12)) * tt) * e, .35)
    tt, e = env(2.8, .002, 1.4)
    hit = sum(np.sin(2 * np.pi * f * tt) for f in [110, 220, 329.63, 440, 523.25]) / 5 * e; add(max(0, tot - 2.9), hit, .45)
    m = max(np.abs(L).max(), np.abs(R).max()) + 1e-9; fade = np.minimum(1, np.arange(n) / sr / .05) * np.minimum(1, (tot - np.arange(n) / sr) / 1.2)
    return L / m * .8 * fade, R / m * .8 * fade


def _styled(tot, cuts, sr, bpm, seed, style):
    n = int(tot * sr); L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(seed)
    bpm = {'lofi': 78, 'news': 100, 'cinema': 70, 'bright': 112, 'afro': 112, 'house': 122}.get(style, bpm) + (seed % 5) - 2
    beat = 60 / bpm; bar = 4 * beat

    def add(a, sig, g=1.0, pan=0.0):
        a = int(a * sr); b = min(n, a + len(sig))
        if a < 0 or a >= n: return
        L[a:b] += g * (1 - max(0, pan)) * sig[:b - a]; R[a:b] += g * (1 + min(0, pan)) * sig[:b - a]

    def env(Ln, att, dec):
        tt = np.arange(int(Ln * sr)) / sr; e = np.minimum(1, tt / att) * np.exp(-tt * dec); f = min(len(e), int(.01 * sr)); e[-f:] *= np.linspace(1, 0, f); return tt, e
    def lp(x, k): return np.convolve(x, np.ones(k) / k, 'same')
    def ep(f, tt): return np.sin(2 * np.pi * f * tt) + .3 * np.sin(4 * np.pi * f * tt) * np.exp(-tt * 3) + .12 * np.sin(6 * np.pi * f * tt)
    if style == 'lofi':
        CH = [[146.83, 174.61, 220.0, 261.63], [196.0, 246.94, 293.66, 349.23], [130.81, 164.81, 196.0, 246.94], [110.0, 130.81, 164.81, 196.0]]
        BASS = [73.42, 98.0, 65.41, 55.0]
    elif style == 'bright':
        CH = [[261.63, 329.63, 392.0], [196.0, 246.94, 293.66], [220.0, 261.63, 329.63], [174.61, 220.0, 261.63]]
        BASS = [65.41, 49.0, 55.0, 43.65]
    elif style == 'afro':  # warm major-7 piano (Fmaj7 - Em7 - Dm7 - Cmaj7)
        CH = [[174.61, 220.0, 261.63, 329.63], [164.81, 196.0, 246.94, 293.66], [146.83, 174.61, 220.0, 261.63], [130.81, 164.81, 196.0, 246.94]]
        BASS = [43.65, 41.2, 36.71, 32.7]
    elif style == 'house':  # uplifting minor-to-major (Am - F - C - G) in a higher voicing
        CH = [[220.0, 261.63, 329.63, 440.0], [174.61, 220.0, 261.63, 349.23], [196.0, 261.63, 329.63, 392.0], [196.0, 246.94, 293.66, 392.0]]
        BASS = [55.0, 43.65, 65.41, 49.0]
    else:
        CH = [[130.81, 155.56, 196.0], [103.83, 130.81, 155.56], [116.54, 146.83, 174.61], [98.0, 123.47, 146.83]]
        BASS = [65.41, 51.91, 58.27, 49.0]
    k = 0
    while k * bar < tot + bar:
        s0 = k * bar; c = CH[k % 4]; bs = BASS[k % 4]
        if style == 'lofi':
            for j, f in enumerate(c):
                tt, e = env(bar + .25, .01, .3); add(s0 + j * .012, ep(f, tt) * e * .09, 1, -.4 + .27 * j)
            tt, e = env(bar + .2, .01, .45); add(s0, np.sin(2 * np.pi * bs * tt) * e, .35)
            for j in range(4):
                sw = .06 * beat if j % 2 else 0
                tt, e = env(.3, .002, 14); add(s0 + j * beat + sw, np.sin(2 * np.pi * (45 + 60 * np.exp(-tt * 25)) * tt) * e, .45 if j % 2 == 0 else .0)
                if j % 2: tt, e = env(.12, .002, 30); nz = rng.standard_normal(len(tt)); add(s0 + j * beat, lp(nz, 4) * e, .12)
                for h in (0, .5):
                    tt, e = env(.04, .0005, 80); nz = np.diff(rng.standard_normal(len(tt) + 1)); add(s0 + (j + h) * beat + (sw if h else 0), nz * e, .02)
        elif style == 'news':
            tt, e = env(bar + .4, .25, .12)
            for j, f in enumerate(c): add(s0, (np.sin(2 * np.pi * f * 2 * tt) + .5 * np.sin(2 * np.pi * f * 2.01 * tt)) * e * .11, 1, -.3 + .3 * j)
            for j in range(16):
                tt, e = env(.03, .0003, 160); clk = np.sin(2 * np.pi * (2400 if j % 4 == 0 else 1800) * tt) * e
                add(s0 + j * beat / 4, clk, .07 if j % 4 == 0 else .035, .5 if j % 2 else -.5)
            for j in (0, 1.5, 2, 3.5):
                tt, e = env(.4, .003, 6); add(s0 + j * beat, np.sin(2 * np.pi * bs * tt) * e, .45)
            tt, e = env(.3, .001, 10); add(s0, np.sin(2 * np.pi * (50 + 90 * np.exp(-tt * 30)) * tt) * e, .5)
        elif style == 'afro':
            s16 = beat / 4
            for j, f in enumerate(c):  # syncopated piano stabs on 1, the and of 2, and 4
                for pos in (0, 6, 12):
                    tt, e = env(.55, .004, 5.5); add(s0 + pos * s16 + j * .006, ep(f, tt) * e * .06, 1, -.35 + .23 * j)
            for pos in (0, 3, 6, 10, 11, 14):  # log drum: pitched, gliding, warm
                f0 = bs * (2 if pos in (10, 11) else 1) * 2
                tt, e = env(.42, .002, 9); ph = 2 * np.pi * np.cumsum(f0 * (1 + .45 * np.exp(-tt * 45))) / sr
                add(s0 + pos * s16, np.tanh(2.2 * np.sin(ph)) * e, .32)
            for pos in (0, 8):
                tt, e = env(.3, .001, 13); add(s0 + pos * s16, np.sin(2 * np.pi * (46 + 70 * np.exp(-tt * 28)) * tt) * e, .55)
            for j in range(16):  # shaker: 16ths with a swung accent
                tt, e = env(.06, .002, 55); nz = np.diff(rng.standard_normal(len(tt) + 1))
                add(s0 + j * s16 + (.012 if j % 2 else 0), nz * e, .045 if j % 4 == 2 else .022, .35)
            for pos in (4, 12):  # rim on 2 and 4
                tt, e = env(.08, .0005, 60); add(s0 + pos * s16, np.sin(2 * np.pi * 1700 * tt) * e, .06, -.2)
        elif style == 'house':
            for half in range(8):  # off-beat chord stabs, classic house
                if half % 2 == 0: continue
                for j, f in enumerate(c):
                    tt, e = env(.3, .004, 8); add(s0 + half * beat / 2 + j * .004, lp(ep(f, tt), 3) * e * .055, 1, -.3 + .2 * j)
            tt, e = env(bar + .3, .3, .25)
            for j, f in enumerate(c[:3]): add(s0, np.sin(2 * np.pi * f * 2 * tt) * e * .025, 1, -.4 + .4 * j)  # airy pad
            for j in range(4):
                tt, e = env(.3, .001, 10); add(s0 + j * beat, np.sin(2 * np.pi * (48 + 110 * np.exp(-tt * 30)) * tt) * e, .62)
                tt, e = env(.22, .004, 9); add(s0 + j * beat + beat / 2, np.sin(2 * np.pi * bs * tt) * e, .42)  # off-beat bass
                tt, e = env(.12, .001, 26); nz = np.diff(rng.standard_normal(len(tt) + 1)); add(s0 + j * beat + beat / 2, nz * e, .05, .3)  # open hat
                if j % 2: tt, e = env(.16, .001, 24); nz = rng.standard_normal(len(tt)); add(s0 + j * beat, (nz - lp(nz, 3)) * e, .17, -.1)
        elif style == 'cinema':
            tt = np.arange(int((bar + .5) * sr)) / sr; sw = np.minimum(1, tt / bar) ** 1.5 * np.exp(-np.maximum(0, tt - bar) * 4); sw[-int(.06 * sr):] *= np.linspace(1, 0, int(.06 * sr))
            for j, f in enumerate(c + [c[0] * 2]): add(s0, lp(np.sin(2 * np.pi * f * tt) + .4 * np.sin(2 * np.pi * f * 2.001 * tt), 5) * sw * .06, 1, -.4 + .25 * j)
            add(s0, np.sin(2 * np.pi * bs / 2 * tt) * sw * .5, 1)
            for j, f in enumerate([c[2] * 2, c[1] * 2]):
                tt2, e = env(1.4, .003, 2.2); add(s0 + (j * 2 + .5) * beat, ep(f, tt2) * e, .09, .25)
        else:
            for j in range(8):
                f = c[(j * 2 + k) % 3] * 2; tt, e = env(.35, .001, 12)
                add(s0 + j * beat / 2, (np.sin(2 * np.pi * f * tt) + .45 * np.sin(2 * np.pi * f * 3.99 * tt) * np.exp(-tt * 30)) * e, .16, .3 if j % 2 else -.3)
            tt, e = env(bar, .02, .8)
            for j, f in enumerate(c): add(s0, np.sin(2 * np.pi * f * tt) * e * .05, 1, -.3 + .3 * j)
            for j in range(4):
                tt, e = env(.28, .001, 12); add(s0 + j * beat, np.sin(2 * np.pi * (50 + 110 * np.exp(-tt * 30)) * tt) * e, .6)
                tt, e = env(.25, .003, 7); add(s0 + j * beat + beat / 2, np.sin(2 * np.pi * bs * 2 * tt) * e, .35)
                if j % 2: tt, e = env(.16, .001, 24); nz = rng.standard_normal(len(tt)); add(s0 + j * beat, (nz - lp(nz, 3)) * e, .22)
        k += 1
    if style == 'lofi':
        cr = np.zeros(n); idx = rng.integers(0, n, int(tot * 9)); cr[idx] = rng.standard_normal(len(idx)) * .5; hiss = lp(rng.standard_normal(n), 3) * .006
        L += cr * .05 + hiss; R += np.roll(cr, 300) * .05 + hiss
    for c0 in cuts:
        Lw = int(.7 * sr); x = lp(rng.standard_normal(Lw), 20) * np.sin(np.pi * np.arange(Lw) / Lw) ** 2; add(c0 - .35, x, .35 if style != 'lofi' else .15)
    tt, e = env(2.6, .002, 1.5)
    hit = sum(np.sin(2 * np.pi * f * tt) for f in [CH[0][0], CH[0][1] * 2, CH[0][2] * 2]) / 3 * e; add(max(0, tot - 2.7), hit, .4)
    m = max(np.abs(L).max(), np.abs(R).max()) + 1e-9; fade = np.minimum(1, np.arange(n) / sr / .05) * np.minimum(1, (tot - np.arange(n) / sr) / 1.2)
    return L / m * .8 * fade, R / m * .8 * fade
