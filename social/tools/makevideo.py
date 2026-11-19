"""Builds one morning story video from social/plan/journey.json.
python3 social/tools/makevideo.py 2026-11-21   ->  social/posts/v2/vid-2026-11-21.mp4
Template: social/intro2 (anim.html scenes, frames.js renderer, mix.py voice+music). Voice: Kokoro af_heart."""
import sys, os, json, shutil, subprocess
date = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
day = next(d for d in json.load(open(os.path.join(root, 'plan', 'journey.json')))['days'] if d['date'] == date)
D = os.path.join(root, 'videos', date); os.makedirs(os.path.join(D, 'vo'), exist_ok=True)
for f in ('anim.html', 'frames.js', 'mix.py', 'home.png'):
    shutil.copy(os.path.join(root, 'intro2', f), D)
json.dump([{'id': a, 'vo': b, 'see': ''} for a, b in day['scenes']], open(os.path.join(D, 'script.json'), 'w'), indent=1)
T = os.environ.get('TTS_DIR', '/tmp/claude-0/-home-user-ftm-website/bf2cab86-488a-5b85-ae97-884fa7cab310/scratchpad/tts')
from kokoro_onnx import Kokoro
import soundfile as sf
k = Kokoro(os.path.join(T, 'kokoro-v1.0.onnx'), os.path.join(T, 'voices-v1.0.bin'))
durs = []
for sid, vo in day['scenes']:
    txt = vo.replace('ftm wealth nation dot com', 'F T M wealth nation dot com').replace('FTM MACHINE', 'F T M Machine').replace('FTM', 'F T M')
    a, sr = k.create(txt, voice='af_heart', speed=1.02, lang='en-us'); sf.write(os.path.join(D, 'vo', sid + '.wav'), a, sr); durs.append(round(len(a) / sr, 2))
json.dump(durs, open(os.path.join(D, 'vo', 'durs.json'), 'w'))
env = dict(os.environ, OUT='video.mp4', NODE_PATH='/opt/node-tools/node_modules')
subprocess.run(['node', 'frames.js', 'full'], cwd=D, env=env, check=True, capture_output=True)
out = os.path.join(root, 'posts', 'v2', 'vid-%s.mp4' % date)
subprocess.run(['python3', 'mix.py', 'video.mp4', out], cwd=D, check=True)
for f in ('_v.wav', '_m.wav', '_mix.wav'):
    try: os.remove(os.path.join(D, f))
    except OSError: pass
print('ok', out)
