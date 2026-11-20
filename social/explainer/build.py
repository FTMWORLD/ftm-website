"""FTM 5-minute explainer (16:9). python3 social/explainer/build.py [vo|test|full]   TEST=t1,t2 for test frames."""
import sys, os, json, shutil, subprocess, numpy as np
D = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(D)
step = sys.argv[1] if len(sys.argv) > 1 else 'full'
V2 = os.environ.get('V2') == '1'; VO = 'vo2' if V2 else 'vo'
open(os.path.join(D, 'anim.html'), 'w').write(open(os.path.join(D, 'base.html')).read().replace('/*__SCENES__*/', open(os.path.join(root, 'ad', 'scn-ad.js')).read() + '\n' + open(os.path.join(D, 'scn-explainer.js')).read() + ('\n' + ''.join(open(os.path.join(D, f)).read() for f in ('qr.js', 'trades19.js', 'endimg.js', 'scn-explainer2.js')) if V2 else '')))
shutil.copy(os.path.join(root, 'videos', 'assets', 'rig.js'), D)
S = json.load(open(os.path.join(D, 'script2.json' if V2 else 'script.json'))); chap = ''
for s in S:
    if s['id'] == 'chap': s['id'] = 'chap%d' % s['n']; chap = 'Chapter %d · %s' % (s['n'], s['t'])
    s['chap'] = '' if s['id'] == 'endcard' else chap; s.setdefault('gap', 0.75); s.setdefault('vo', '')
json.dump(S, open(os.path.join(D, 'script.run.json'), 'w'), indent=1)
sr0 = 24000
if step == 'vo' or not os.path.exists(os.path.join(D, VO, 'durs.json')):
    os.makedirs(os.path.join(D, VO), exist_ok=True)
    T = os.environ.get('TTS_DIR', '/tmp/claude-0/-home-user-ftm-website/bf2cab86-488a-5b85-ae97-884fa7cab310/scratchpad/tts')
    from kokoro_onnx import Kokoro; import soundfile as sf
    k = Kokoro(os.path.join(T, 'kokoro-v1.0.onnx'), os.path.join(T, 'voices-v1.0.bin'))
    durs, amp = [], {}
    for s in S:
        if not s['vo']:
            a = np.zeros(int(s.get('dur', 2) * sr0), dtype=np.float32); sr = sr0
        else:
            txt = s['vo'].replace('ftm wealth nation dot com', 'F T M wealth nation dot com').replace('FTM MACHINE', 'F T M Machine').replace('FTM', 'F T M').replace('MT5', 'M T 5')
            a, sr = k.create(txt, voice=os.environ.get('VOICE', 'af_heart'), speed=float(os.environ.get('SPEED', '0.97')), lang='en-us')
        sf.write(os.path.join(D, VO, s['id'] + '.wav'), a, sr); durs.append(round(len(a) / sr, 2))
        hop = sr // 25; env = [float(np.sqrt(np.mean(a[i:i + hop] ** 2))) if len(a[i:i + hop]) else 0 for i in range(0, len(a), hop)]
        m = max(env) or 1; amp[s['id']] = [round(min(1, e / m * 1.4), 2) for e in env]
    json.dump(durs, open(os.path.join(D, VO, 'durs.json'), 'w')); json.dump(amp, open(os.path.join(D, VO, 'amp.json'), 'w'))
    print('vo', round(sum(durs) + 0.75 * len(S), 1), 's')
    if step == 'vo': sys.exit()
env = dict(os.environ, NODE_PATH='/opt/node-tools/node_modules', LAND='1', VO=VO)
if step == 'test':
    subprocess.run(['node', 'frames.js', 'test', os.environ.get('TEST', 'all')], cwd=D, env=env, check=True); sys.exit()
subprocess.run(['node', 'frames.js', 'full'], cwd=D, env=dict(env, OUT='_v.mp4'), check=True)
out = os.path.join(root, 'posts', 'v2', 'ftm-explainer-v2-16x9.mp4' if V2 else 'ftm-explainer-16x9.mp4')
subprocess.run(['python3', 'mix.py', '_v.mp4', out], cwd=D, check=True, env=env); print('ok', out)
