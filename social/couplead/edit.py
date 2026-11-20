"""Couple ad: clean the two-voice take, cut it into lines, level both voices to match, tighten the gaps.
Writes vo.wav, vo.lines.json [[start,end,speaker]], vo.amp.json."""
import subprocess, json, numpy as np, wave
sr = 48000
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', '../voice/couple-take1.m4a', '-af', 'highpass=f=85,afftdn=nf=-30:tn=1,equalizer=f=250:t=q:w=1.2:g=-2.5,equalizer=f=3800:t=q:w=1:g=2.5,equalizer=f=9000:t=q:w=1:g=1', '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True).stdout
a = np.frombuffer(raw, np.float32).astype(float)
def rms(x): return np.sqrt(np.mean(x ** 2) + 1e-12)
# split point between line 5 (her) and 6 (him): quietest 40 ms between 12.2 and 12.75 s
h = int(.02 * sr); w = a[int(12.2 * sr):int(12.75 * sr)]; en = [rms(w[i:i + 2 * h]) for i in range(0, len(w) - 2 * h, h)]; cut = 12.2 + (int(np.argmin(en)) * h + h) / sr
L = [(1.01, 3.55, 'her'), (4.11, 6.43, 'him'), (6.8, 7.58, 'her'), (8.18, 10.84, 'him'), (11.33, cut, 'her'), (cut, 16.17, 'him'), (16.88, 18.29, 'her'), (19.02, 24.73, 'him'),
     (25.47, 26.73, 'her'), (27.78, 30.37, 'him'), (31.05, 32.1, 'her'), (32.75, 39.0, 'him'), (40.17, 40.87, 'her'), (41.86, 43.46, 'him')]
GAP = {1: .28, 3: .22, 5: .2, 7: .3, 9: .3, 11: .28, 13: .55}
out = [np.zeros(int(.12 * sr))]; t0 = .12; lines = []
for i, (s, e, who) in enumerate(L):
    s0 = max(0, s - (0 if i == 5 else .07)); e0 = e + (0 if i == 4 else .1)
    seg = a[int(s0 * sr):int(e0 * sr)].copy()
    loud = seg[np.abs(seg) > np.percentile(np.abs(seg), 60)]; seg *= (10 ** (-17 / 20)) / rms(loud)  # same loudness for both voices
    f = int(.015 * sr); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
    lines.append([round(t0, 3), round(t0 + len(seg) / sr, 3), who]); out.append(seg); t0 += len(seg) / sr
    g = GAP.get(i, .25); out.append(np.zeros(int(g * sr))); t0 += g
v = np.concatenate(out + [np.zeros(int(.2 * sr))])
o = wave.open('_raw.wav', 'w'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes((np.clip(v, -1, 1) * 32767).astype(np.int16).tobytes()); o.close()
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', '_raw.wav', '-af', 'acompressor=threshold=-24dB:ratio=3:attack=4:release=110:makeup=2,deesser=i=0.4,loudnorm=I=-16:TP=-1.5:LRA=6', '-ar', str(sr), '-ac', '1', 'vo.wav'], check=True)
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', 'vo.wav', '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True).stdout
v = np.frombuffer(raw, np.float32).astype(float); hop = sr // 30
env = np.array([rms(v[i:i + hop]) for i in range(0, len(v), hop)]); env = np.clip(env / np.percentile(env, 97), 0, 1)
json.dump([round(float(x), 3) for x in env], open('vo.amp.json', 'w')); json.dump(lines, open('vo.lines.json', 'w'))
print('cut', round(cut, 2), 'voice', round(len(v) / sr, 2), lines)
