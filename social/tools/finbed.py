"""FTM finance music bed (own synthesis, copyright-free): finance_bed(seconds, cut_times, sr) -> (left, right) float arrays."""
import numpy as np


def finance_bed(tot, cuts=(), sr=48000, bpm=122, seed=5):
    n = int(tot * sr); L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(seed)
    beat = 60 / bpm; bar = 4 * beat; s16 = beat / 4

    def add(a, sig, g=1.0, pan=0.0):
        a = int(a * sr); b = min(n, a + len(sig))
        if a < 0 or a >= n: return
        L[a:b] += g * (1 - max(0, pan)) * sig[:b - a]; R[a:b] += g * (1 + min(0, pan)) * sig[:b - a]

    def env(Ln, att, dec): tt = np.arange(int(Ln * sr)) / sr; return tt, np.minimum(1, tt / att) * np.exp(-tt * dec)
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
