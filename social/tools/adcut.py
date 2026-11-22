"""Short cut of an ad (research 21 Nov: 15–25 s versions to test against the full ad).
python3 social/tools/adcut.py <silent video> <voice wav> <voice offset s> <out.mp4> a1-b1 a2-b2 ...
Cuts the same ranges from picture and voice, lays a fresh FTM finance bed (finbed.py) under the voice with ducking, -14 LUFS."""
import sys, os, subprocess, wave, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from finbed import finance_bed
vid, vo, off, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
R = [tuple(map(float, r.split('-'))) for r in sys.argv[5:]]
sr = 48000; tmp = out + '.tmp'; os.makedirs(tmp, exist_ok=True)
parts = []
for i, (a, b) in enumerate(R):
    p = os.path.join(tmp, 'p%d.mp4' % i)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(a), '-to', str(b), '-i', vid, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', '30', p], check=True); parts.append(p)
lst = os.path.join(tmp, 'l.txt'); open(lst, 'w').write(''.join("file '%s'\n" % os.path.abspath(p) for p in parts))
v2 = os.path.join(tmp, 'v.mp4'); subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', v2], check=True)
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', vo, '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True).stdout
a = np.frombuffer(raw, np.float32).astype(float); voice = []; cuts = []; t = 0
for (s, e) in R:
    seg = np.zeros(int((e - s) * sr)); i0 = int((s - off) * sr); i1 = int((e - off) * sr)
    src = a[max(0, i0):max(0, min(len(a), i1))]; st = max(0, -i0); seg[st:st + len(src)] = src[:len(seg) - st]
    f = int(.02 * sr); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f); voice.append(seg); t += e - s; cuts.append(t)
v = np.concatenate(voice); tot = len(v) / sr
L, Rr = finance_bed(tot, cuts[:-1], sr)
# owner 22 Nov ("voice not clear"): the music dips smoothly and deeper under the voice and stays down between words (no pumping)
h = int(sr * .01); fr = np.array([np.abs(v[i:i + h]).max() for i in range(0, len(v), h)]) > .02
held = np.convolve(fr.astype(float), np.ones(71), 'same') > 0; g = np.zeros(len(held)); x = 0.
for i, on in enumerate(held): x += (on - x) * (.25 if on > x else .03); g[i] = x
duck = 1 - .75 * np.interp(np.arange(len(v)) / h, np.arange(len(g)), g)
# the voice gets its own clarity chain before it meets the music: low rumble off, presence up, gentle compression
vf = os.path.join(tmp, 'v.wav'); o = wave.open(vf, 'w'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes((np.clip(v, -1, 1) * 32767).astype(np.int16).tobytes()); o.close()
v = np.frombuffer(subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', vf, '-af', 'highpass=f=90,equalizer=f=250:t=q:w=1:g=-2,equalizer=f=3200:t=q:w=1.2:g=3,acompressor=threshold=-22dB:ratio=3:attack=6:release=150:makeup=3', '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True).stdout, np.float32).astype(float)[:len(v)]
if len(v) < len(duck): v = np.concatenate([v, np.zeros(len(duck) - len(v))])
L = L[:len(v)] * duck * .45; Rr = Rr[:len(v)] * duck * .45
st = np.empty(2 * len(v)); st[0::2] = L + v; st[1::2] = Rr + v
w = os.path.join(tmp, 'a.wav'); o = wave.open(w, 'w'); o.setnchannels(2); o.setsampwidth(2); o.setframerate(sr); o.writeframes((np.clip(st, -1, 1) * 32767).astype(np.int16).tobytes()); o.close()
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', v2, '-i', w, '-filter_complex', '[1]alimiter=limit=0.95,loudnorm=I=-14:TP=-1.5:LRA=8[a]', '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], check=True)
print('ok', out, round(tot, 1))
