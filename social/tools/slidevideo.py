"""Turns result slides into a 9:16 video with FTM's own vibrant finance music (no third-party music, so no copyright claims).
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
# music (owner 20 Nov: "a more finance sound that is vibrant"): a driving market-news bed at 122 bpm, minor chords,
# pulsing bass with a soft sidechain pump, plucked stabs, a bell motif, crisp hats and claps, a riser and whoosh into every
# slide change, an impact at the start and a final hit. Stereo. Our own synthesis, so no copyright claims.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from finbed import finance_bed
cuts = [round((per - fade) * i, 3) for i in range(1, len(slides))]
L, R = finance_bed(tot, cuts, sr)
wav = os.path.join(tmp, 'm.wav')
st = np.empty(2 * len(L)); st[0::2], st[1::2] = L, R
o = wave.open(wav, 'w'); o.setnchannels(2); o.setsampwidth(2); o.setframerate(sr); o.writeframes((np.clip(st, -1, 1) * 32767).astype(np.int16).tobytes()); o.close()
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', vid, '-i', wav, '-filter_complex', '[1]loudnorm=I=-14:TP=-1.5:LRA=7[a]', '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-shortest', '-movflags', '+faststart', out], check=True)
print('ok', out, round(tot, 1))
