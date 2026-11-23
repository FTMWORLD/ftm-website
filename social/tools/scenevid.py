"""Multi-scene text video from storyvid.js scenes (owner 23 Nov 2026: sharp no-trade-day posts at 18:00 —
a real loss day or emotion hook in the first 3 s, why FTM MACHINE did not trade, a real statistic, call to action).
python3 social/tools/scenevid.py scenes.json out.mp4 [sound style] [seconds per scene]
scenes.json = [storyvid scene, ...]; middle scenes usually carry "cta": false, "tap": false. One music track over all scenes."""
import sys, os, json, subprocess, tempfile, wave, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from finbed import finance_bed
sc, out = json.load(open(sys.argv[1])), sys.argv[2]
style = sys.argv[3] if len(sys.argv) > 3 else 'cinema'; per = float(sys.argv[4]) if len(sys.argv) > 4 else 6.5
tmp = tempfile.mkdtemp(); env = dict(os.environ, DUR=str(per), NODE_PATH=os.environ.get('NODE_PATH', '/opt/node-tools/node_modules'))
procs = [subprocess.Popen(['node', os.path.join(HERE, 'storyvid.js'), json.dumps(s), os.path.join(tmp, 's%d.mp4' % i)], env=env, stdout=subprocess.DEVNULL) for i, s in enumerate(sc)]
for p in procs: p.wait()
open(os.path.join(tmp, 'l.txt'), 'w').write(''.join('file s%d.mp4\n' % i for i in range(len(sc))))
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', os.path.join(tmp, 'l.txt'), '-an', '-c:v', 'copy', os.path.join(tmp, 'v.mp4')], check=True)
tot = per * len(sc); L, R = finance_bed(tot, cuts=tuple(per * i for i in range(1, len(sc))), seed=len(out) * 7 % 97, style=style)
x = np.stack([L, R], 1); w = wave.open(os.path.join(tmp, 'm.wav'), 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(48000); w.writeframes((x * 32767).astype('<i2').tobytes()); w.close()
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(tmp, 'v.mp4'), '-i', os.path.join(tmp, 'm.wav'), '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], check=True)
print(out)
