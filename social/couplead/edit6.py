"""Video A, 6 p.m. version (owner 22 Nov 2026): clean the owner's re-recorded take, cut it into the 14 lines the animation expects,
remove the long pause and the false start ("and you are ... and you are started") and the extra "yes" at the end, level the voices,
tighten the gaps. Writes vo.wav, vo.lines.json [[start,end,speaker]], vo.amp.json, vo.words.json [[start,end,word]].
python3 edit6.py <take.m4a> <words.json from faster-whisper: [[start,end,word], ...]>"""
import subprocess, json, sys, numpy as np, wave
src, wpath = sys.argv[1], sys.argv[2]
sr = 48000
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', src, '-af', 'highpass=f=85,equalizer=f=250:t=q:w=1.2:g=-2.5,equalizer=f=3800:t=q:w=1:g=2.5,equalizer=f=9000:t=q:w=1:g=1',
                      '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True).stdout
a = np.frombuffer(raw, np.float32).astype(float)
# owner 22 Nov: no background noise. The room hum was audible inside every line and silent between lines, so it switched on and off
# at each cut ("hiccups"). Remove it properly with spectral gating, using the quiet 2 s in the take as the noise sample.
import noisereduce as nr
NOISE = tuple(float(x) for x in (sys.argv[3].split('-') if len(sys.argv) > 3 else ('34.0', '36.0')))
a = nr.reduce_noise(y=a, sr=sr, y_noise=a[int(NOISE[0] * sr):int(NOISE[1] * sr)], stationary=True, prop_decrease=0.6, n_fft=2048)  # gentle: strong settings gate the voice into choppy holes between words
W = json.load(open(wpath))
def rms(x): return np.sqrt(np.mean(x ** 2) + 1e-12)
hop = int(.01 * sr); env = np.array([rms(a[i:i + hop]) for i in range(0, len(a) - hop, hop)]); thr = np.percentile(env, 15) * 4.0  # about 12 dB above the room noise
def on(t0, t1):   # first speech frame in [t0, t1]
    for i in range(max(0, int(t0 * 100)), min(len(env), int(t1 * 100))):
        if env[i] > thr and env[i:i + 4].mean() > thr: return i / 100
    return t0
def off(t0, t1):  # last speech frame in [t0, t1]
    for i in range(min(len(env) - 1, int(t1 * 100)), max(0, int(t0 * 100)), -1):
        if env[i] > thr and env[max(0, i - 3):i + 1].mean() > thr: return (i + 1) / 100
    return t1
# (pieces as [coarse start, coarse end] from the word timings, speaker); refined by the energy envelope below
L = [([(0.0, 3.78)], 'her'), ([(3.78, 6.58)], 'him'), ([(6.58, 7.68)], 'her'), ([(7.68, 11.18)], 'him'), ([(11.18, 12.72)], 'her'),
     ([(12.72, 16.76)], 'him'), ([(16.76, 18.18)], 'her'), ([(18.18, 23.18)], 'him'), ([(23.18, 25.08)], 'her'), ([(25.08, 28.92)], 'him'),
     ([(28.92, 30.30)], 'her'), ([(30.30, 32.82), (36.2, 37.02)], "him"), ([(37.02, 38.20)], 'her'), ([(39.0, 40.22)], "him")]  # the breath before 'See you at 6' is cut
GAP = {1: .26, 3: .22, 5: .22, 7: .3, 9: .3, 11: .28, 13: .4}
# owner 22 Nov ("glitches, stuttering"): never cut to digital silence. A continuous room tone from the take runs under the whole
# track and every piece is cross-faded into it, so the background never switches on and off and there are no dead holes.
room = a[int(NOISE[0] * sr):int(NOISE[1] * sr)].copy()
def tone(n):
    out = np.zeros(n); pos = 0; x = int(.05 * sr); rng = np.random.default_rng(3)
    while pos < n:
        k = int(rng.integers(0, len(room) - sr // 2)); seg = room[k:k + sr // 2].copy(); m = min(len(seg), n - pos)
        w = np.ones(len(seg)); w[:x] = np.linspace(0, 1, x); w[-x:] = np.linspace(1, 0, x)
        out[pos:pos + m] += (seg * w)[:m]; pos += len(seg) - x
    return out
pieces = []; t0 = .12; lines = []; words = []
for i, (pcs, who) in enumerate(L):
    segs = []
    for (cs, ce) in pcs:
        inside = [w for w in W if cs - .01 <= w[0] < ce]
        before = [w for w in W if w[0] < cs - .01]; after = [w for w in W if w[0] >= ce]
        lo = before[-1][1] + .02 if before else 0
        hi = after[0][0] - .02 if after else len(a) / sr
        last = inside[-1] if inside else (cs, ce, '')
        s0 = max(lo, on(max(lo, cs - .25), ce) - .05)
        e0 = min(hi, off(last[0], min(hi, last[1] + .2)) + .07)
        segs.append((s0, e0))
    # level the whole line once (her and his voice match), before it goes onto the room tone
    x = np.concatenate([a[int(s0 * sr):int(e0 * sr)] for s0, e0 in segs]); loud = x[np.abs(x) > np.percentile(np.abs(x), 60)]
    g = (10 ** (-17 / 20)) / rms(loud) if len(loud) else 1.
    line_start = t0
    for k, (s0, e0) in enumerate(segs):
        seg = a[int(s0 * sr):int(e0 * sr)] * g
        for (ws, we, w) in W:
            if we > s0 + .04 and ws < e0 - .04:
                words.append([round(t0 + max(0, ws - s0), 3), round(t0 + max(.05, min(we, e0) - s0), 3), w])
        pieces.append((t0, seg)); t0 += len(seg) / sr
        if k < len(segs) - 1: t0 += .1
    lines.append([round(line_start, 3), round(t0, 3), who])
    t0 += GAP.get(i, .24)
n = int((t0 + .2) * sr); room_g = np.median([(10 ** (-17 / 20)) / rms(p[np.abs(p) > np.percentile(np.abs(p), 60)]) for _, p in pieces])
v = tone(n) * room_g   # the room tone at the same gain as the voices
f = int(.03 * sr)
for (st, seg) in pieces:
    i0 = int(st * sr); w = np.ones(len(seg)); w[:f] = np.sin(np.linspace(0, np.pi / 2, f)) ** 2; w[-f:] = np.cos(np.linspace(0, np.pi / 2, f)) ** 2
    v[i0:i0 + len(seg)] = v[i0:i0 + len(seg)] * (1 - w) + seg * w
o = wave.open('_raw.wav', 'w'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes((np.clip(v, -1, 1) * 32767).astype(np.int16).tobytes()); o.close()
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', '_raw.wav', '-af', 'acompressor=threshold=-24dB:ratio=2.5:attack=8:release=160:makeup=2,deesser=i=0.3,loudnorm=I=-16:TP=-1.5:LRA=7', '-ar', str(sr), '-ac', '1', 'vo.wav'], check=True)
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', 'vo.wav', '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True).stdout
v = np.frombuffer(raw, np.float32).astype(float); h = sr // 30
e2 = np.array([rms(v[i:i + h]) for i in range(0, len(v), h)]); e2 = np.clip(e2 / np.percentile(e2, 97), 0, 1)
json.dump([round(float(x), 3) for x in e2], open('vo.amp.json', 'w')); json.dump(lines, open('vo.lines.json', 'w')); json.dump(words, open('vo.words.json', 'w'))
print('voice', round(len(v) / sr, 2)); [print(i, l) for i, l in enumerate(lines)]
