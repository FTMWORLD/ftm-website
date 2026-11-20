"""FTM YouTube ad. python3 social/ad/build.py [vo|test|full]  (TEST=times, MODE land|vert)"""
import sys, os, json, shutil, subprocess, numpy as np
D = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(D)
step = sys.argv[1] if len(sys.argv) > 1 else 'full'
open(os.path.join(D, 'anim.html'), 'w').write(open(os.path.join(D, 'adbase.html')).read().replace('/*__SCENES__*/', open(os.path.join(D, 'scn-ad.js')).read()))
shutil.copy(os.path.join(root, 'videos', 'assets', 'rig.js'), D)
S = json.load(open(os.path.join(D, 'script.json')))
if step == 'vo' or not os.path.exists(os.path.join(D, 'vo', 'durs.json')):
    os.makedirs(os.path.join(D, 'vo'), exist_ok=True)
    T = os.environ.get('TTS_DIR', '/tmp/claude-0/-home-user-ftm-website/bf2cab86-488a-5b85-ae97-884fa7cab310/scratchpad/tts')
    from kokoro_onnx import Kokoro; import soundfile as sf
    k = Kokoro(os.path.join(T, 'kokoro-v1.0.onnx'), os.path.join(T, 'voices-v1.0.bin'))
    durs, amp = [], {}
    for s in S:
        txt = s['vo'].replace('ftm wealth nation dot com', 'F T M wealth nation dot com').replace('FTM MACHINE', 'F T M Machine').replace('FTM', 'F T M')
        a, sr = k.create(txt, voice=os.environ.get('VOICE', 'af_heart'), speed=float(os.environ.get('SPEED', '1.0')), lang='en-us')
        sf.write(os.path.join(D, 'vo', s['id'] + '.wav'), a, sr); durs.append(round(len(a) / sr, 2))
        hop = sr // 25; env = [float(np.sqrt(np.mean(a[i:i + hop] ** 2))) for i in range(0, len(a), hop)]
        m = max(env) or 1; amp[s['id']] = [round(min(1, e / m * 1.4), 2) for e in env]
    json.dump(durs, open(os.path.join(D, 'vo', 'durs.json'), 'w')); json.dump(amp, open(os.path.join(D, 'vo', 'amp.json'), 'w'))
    print('vo', durs, sum(durs))
    if step == 'vo': sys.exit()
env = dict(os.environ, NODE_PATH='/opt/node-tools/node_modules')
mode = os.environ.get('MODE', 'land')
if step == 'test':
    subprocess.run(['node', 'frames.js', 'test', os.environ.get('TEST', 'all')], cwd=D, env=dict(env, LAND='1' if mode == 'land' else '0'), check=True); sys.exit()
for mode in (os.environ.get('MODES', 'land,vert').split(',')):
    v = '_%s.mp4' % mode
    subprocess.run(['node', 'frames.js', 'full'], cwd=D, env=dict(env, LAND='1' if mode == 'land' else '0', OUT=v), check=True)
    out = os.path.join(root, 'posts', 'v2', 'ftm-yt-ad-%s.mp4' % ('16x9' if mode == 'land' else '9x16'))
    subprocess.run(['python3', 'mix.py', v, out], cwd=D, check=True)
    print('ok', out)
