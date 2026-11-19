"""Turns result slides into a 9:16 video with FTM's own calm finance music (no third-party music, so no copyright claims).
python3 social/tools/slidevideo.py out.mp4 slide1.jpg slide2.jpg ...   (each slide 5 s, slow zoom, soft crossfade)"""
import sys, subprocess, wave, numpy as np, os, tempfile
out, slides = sys.argv[1], sys.argv[2:]
per, fade, sr = float(os.environ.get('PER', 5)), 0.6, 48000
tot = per * len(slides) - fade * (len(slides) - 1)
tmp = tempfile.mkdtemp()
# video: each slide centred on a navy 1080x1920 canvas with a slow zoom, then crossfades
parts = []
for i, s in enumerate(slides):
    p = os.path.join(tmp, 'p%d.mp4' % i)
    vf = ("scale=1080:-1,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x0b1640,"
          "zoompan=z='min(zoom+0.0007,1.04)':d=%d:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,format=yuv420p" % int(per * 30))
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-loop', '1', '-i', s, '-vf', vf, '-t', str(per), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', p], check=True)
    parts.append(p)
if len(parts) == 1:
    vid = parts[0]
else:
    inputs = sum([['-i', p] for p in parts], [])
    fc, last, off = '', '[0:v]', 0.0
    for i in range(1, len(parts)):
        off += per - fade
        lab = '[v%d]' % i
        fc += '%s[%d:v]xfade=transition=fade:duration=%s:offset=%s%s;' % (last, i, fade, round(off, 2), lab)
        last = lab
    vid = os.path.join(tmp, 'v.mp4')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y'] + inputs + ['-filter_complex', fc.rstrip(';'), '-map', last, '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', vid], check=True)
# music: warm piano-like chords, plucked arpeggio, soft kick and hat at 100 bpm (corporate finance feel)
n = int(tot * sr); t = np.arange(n) / sr; mus = np.zeros(n)
bpm = 100; beat = 60 / bpm; bar = beat * 4
ch = [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 261.63, 329.63], [196, 246.94, 293.66]]
def add(a, sig):
    a = int(a * sr); b = min(n, a + len(sig))
    if 0 <= a < n: mus[a:b] += sig[:b - a]
rng = np.random.default_rng(3); k = 0
while k * bar < tot:
    c = ch[k % 4]; L = int((bar + .6) * sr); tt = np.arange(L) / sr; env = np.minimum(1, tt / .25) * np.exp(-tt * .35)
    add(k * bar, env * .6 * (sum(np.sin(2 * np.pi * f * tt + .3 * np.sin(2 * np.pi * 5 * tt)) * .33 for f in c) + .5 * np.sin(2 * np.pi * c[0] / 2 * tt)))
    for j in range(8):
        L2 = int(.4 * sr); t2 = np.arange(L2) / sr; f = c[[0, 1, 2, 1, 2, 0, 1, 2][j]] * 2
        add(k * bar + j * beat / 2, .22 * np.exp(-t2 * 7) * (np.sin(2 * np.pi * f * t2) + .3 * np.sin(4 * np.pi * f * t2)))
    for j in range(4):
        L3 = int(.25 * sr); t3 = np.arange(L3) / sr
        add(k * bar + j * beat, .55 * np.sin(2 * np.pi * (50 + 90 * np.exp(-t3 * 30)) * t3) * np.exp(-t3 * 14))
        L4 = int(.05 * sr); add(k * bar + j * beat + beat / 2, .05 * rng.standard_normal(L4) * np.exp(-np.arange(L4) / sr * 90))
    k += 1
mus /= np.abs(mus).max() + 1e-9; mus *= .5 * np.minimum(1, t / 1.2) * np.minimum(1, (tot - t) / 2)
wav = os.path.join(tmp, 'm.wav')
o = wave.open(wav, 'w'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes((np.clip(mus, -1, 1) * 32767).astype(np.int16).tobytes()); o.close()
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', vid, '-i', wav, '-filter_complex', '[1]loudnorm=I=-16:TP=-1.5[a]', '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-shortest', '-movflags', '+faststart', out], check=True)
print('ok', out, round(tot, 1))
