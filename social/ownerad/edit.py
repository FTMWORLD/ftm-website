"""Owner voice ad: shorten long pauses in the cleaned take, keep everything spoken. Writes vo.wav + vo.amp.json (25 fps)."""
import subprocess, json, numpy as np, wave
sr = 48000
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', '../voice/owner-take1-clean.wav', '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True).stdout
a = np.frombuffer(raw, np.float32).astype(float)
# (gap start, gap end, length to keep) from the silence map of the take
G = [(0.0, 0.79, .12), (1.35, 1.75, .22), (3.98, 4.97, .32), (6.71, 7.08, .22), (7.87, 9.31, .26), (9.86, 10.21, .2), (13.25, 13.98, .34),
     (18.0, 18.79, .42), (22.36, 23.97, .3), (26.88, 29.04, .5), (31.08, 32.05, .2), (32.8, 33.52, .26), (35.91, 36.75, .42), (38.83, 39.95, .05)]
keep, pos, mp = [], 0.0, []
for s, e, k in G:
    keep.append((pos, s + k / 2)); pos = e - k / 2
keep.append((pos, len(a) / sr))
out, t0 = [], 0.0
for s, e in keep:
    if e <= s: continue
    seg = a[int(s * sr):int(e * sr)].copy(); f = int(.012 * sr)
    seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
    mp.append([round(s, 3), round(e, 3), round(t0, 3)]); out.append(seg); t0 += len(seg) / sr
v = np.concatenate([np.zeros(int(.15 * sr)), np.concatenate(out), np.zeros(int(.1 * sr))])
o = wave.open('vo.wav', 'w'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes((np.clip(v, -1, 1) * 32767).astype(np.int16).tobytes()); o.close()
hop = sr // 25; env = np.array([np.sqrt(np.mean(v[i:i + hop] ** 2)) for i in range(0, len(v), hop)]); env = np.clip(env / np.percentile(env, 97), 0, 1)
json.dump([round(float(x), 3) for x in env], open('vo.amp.json', 'w')); json.dump(mp, open('vo.map.json', 'w'))
print('voice', round(len(v) / sr, 2), 's')
