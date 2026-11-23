"""Build a morning video with the character rig.
[STYLE=drive|lofi|news|cinema|bright] [NARRATOR=voice] python3 social/tools/buildvid.py DATE social/videos/assets/scn-xxx.js [bpm] [chords 0-3]
Script = journey.json 'open' (as scene 'hook') + the day's scenes. Output: social/posts/v2/vid-DATE.mp4"""
import sys, os, json, shutil, subprocess, wave, numpy as np
date, scn = sys.argv[1], sys.argv[2]
bpm = int(sys.argv[3]) if len(sys.argv) > 3 else 100
chord = int(sys.argv[4]) if len(sys.argv) > 4 else 0
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(root, 'videos', 'assets')
day = next(d for d in json.load(open(os.path.join(root, 'plan', 'journey.json')))['days'] if d['date'] == date)
D = os.path.join(root, 'videos', date); os.makedirs(os.path.join(D, 'vo'), exist_ok=True)
base = open(os.path.join(A, 'base.html')).read().replace('/*__SCENES__*/', open(os.path.join(root, '..', scn) if not os.path.isabs(scn) and not os.path.exists(scn) else scn).read())
open(os.path.join(D, 'anim.html'), 'w').write(base)
shutil.copy(os.path.join(A, 'rig.js'), D)
shutil.copy(os.path.join(root, 'videos', '2026-11-20b', 'frames.js'), D)
fr = open(os.path.join(D, 'frames.js')).read()
fr = fr.replace("const r=await p.evaluate(([S,D])=>setup(S,D),[S,D]);", "const AMP=JSON.parse(fs.readFileSync('vo/amp.json'));const r=await p.evaluate(([S,D,A])=>setup(S,D,A),[S,D,AMP]);")
# every photo must be loaded before a frame is captured (23 Nov: the first frame = the cover was dark while the photo was still loading)
fr = fr.replace("x=>render(x)", "async x=>{render(x);await Promise.all([...document.images].map(i=>i.complete&&i.naturalWidth?0:new Promise(r=>{i.onload=i.onerror=r;setTimeout(r,4000)})))}")
open(os.path.join(D, 'frames.js'), 'w').write(fr)
mix = open(os.path.join(root, 'videos', '2026-11-20b', 'mix.py')).read()
CH = ['[[220,261.63,329.63],[174.61,220,261.63],[196,261.63,329.63],[196,246.94,293.66]]',
      '[[146.83,220,293.66],[116.54,174.61,233.08],[174.61,261.63,349.23],[130.81,196,261.63]]',
      '[[164.81,246.94,329.63],[130.81,196,261.63],[196,293.66,392],[146.83,220,293.66]]',
      '[[130.81,164.81,196],[110,130.81,164.81],[174.61,220,261.63],[196,246.94,293.66]]']
import re
mix = re.sub(r'bpm=\d+;beat=60/bpm;ch=\[\[.*?\]\]', 'bpm=%d;beat=60/bpm;ch=%s' % (bpm, CH[chord % 4]), mix)
STYLE = os.environ.get('STYLE', '')  # owner 23 Nov 2026: a different sound each video -> drive, lofi, news, cinema, bright (finbed.py)
if STYLE:
    mix = mix.replace("mus/=np.abs(mus).max()+1e-9;", "import sys as _s;_s.path.insert(0,%r);from finbed import finance_bed as _fb;_L,_R=_fb(tot,seed=%d,bpm=%d,style=%r);mus=((_L+_R)/2)[:n] if len(_L)>=n else np.pad((_L+_R)/2,(0,n-len(_L)));mus/=np.abs(mus).max()+1e-9;" % (os.path.dirname(os.path.abspath(__file__)), sum(map(ord, date)) % 97, bpm, STYLE), 1)
open(os.path.join(D, 'mix.py'), 'w').write(mix)
lines = [['hook', day['open']]] + day['scenes']
json.dump([{'id': a, 'vo': b, 'see': ''} for a, b in lines], open(os.path.join(D, 'script.json'), 'w'), indent=1)
T = os.environ.get('TTS_DIR', '/tmp/claude-0/-home-user-ftm-website/bf2cab86-488a-5b85-ae97-884fa7cab310/scratchpad/tts')
from kokoro_onnx import Kokoro
import soundfile as sf
k = Kokoro(os.path.join(T, 'kokoro-v1.0.onnx'), os.path.join(T, 'voices-v1.0.bin'))
durs, amp = [], {}
def clean_own(a, sr):
    """Owner/wife recordings: remove steady room noise, trim the silence at both ends to 60 ms, fade 25 ms in and out."""
    import noisereduce as nr
    hop = int(.01 * sr); env = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2)) for i in range(0, max(1, len(a) - hop), hop)])
    q = np.argsort(env)[:max(5, len(env) // 8)]  # the quietest 10 ms frames = the noise sample
    noise = np.concatenate([a[i * hop:(i + 1) * hop] for i in q])
    if len(noise) > sr // 10: a = nr.reduce_noise(y=a, sr=sr, y_noise=noise, stationary=True, prop_decrease=.9)
    env = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2)) for i in range(0, max(1, len(a) - hop), hop)])
    on = np.where(env > env.max() * .06)[0]
    if len(on): a = a[max(0, on[0] - 6) * hop:min(len(a), (on[-1] + 7) * hop)].copy()
    f = min(int(.025 * sr), len(a) // 4); a[:f] *= np.linspace(0, 1, f) ** 2; a[-f:] *= np.linspace(1, 0, f) ** 2
    return a
OWN = os.environ.get('OWN_VO')  # owner 22 Nov: folder of the owner's own recordings, one <scene id>.wav each
for sid, vo in lines:
    txt = re.sub(r'\b([Ll])ive (your|the|life|well|it|a|more)\b', r'\1iv \2', vo)  # owner 22 Nov: verb 'live' = /lɪv/, not 'lyve'
    txt = txt.replace('ftm wealth nation dot com', 'F T M wealth nation dot com').replace('FTM MACHINE', 'F T M Machine').replace('FTM', 'F T M')
    if OWN and os.path.exists(os.path.join(OWN, sid + '.wav')):
        a, sr = sf.read(os.path.join(OWN, sid + '.wav')); a = a if a.ndim == 1 else a.mean(1)
        a = clean_own(a, sr)  # owner 22 Nov: no background noise, no clicks, no long pauses ("hiccups") between the lines
        sf.write(os.path.join(D, 'vo', sid + '.wav'), a, sr); durs.append(round(max(.3, len(a) / sr - .2), 2))  # 0.6 s scene pad - 0.2 = a natural 0.4 s turn
        hop = sr // 25; env = [float(np.sqrt(np.mean(a[i:i + hop] ** 2))) for i in range(0, len(a), hop)]
        m = max(env) or 1; amp[sid] = [round(min(1, (e / m) * 1.4), 2) for e in env]; continue
    voice = os.environ.get('NARRATOR', 'af_heart')  # NARRATOR=bm_george etc. for one narrator; couple videos: "HIM:" male, "HER:" female
    if txt.startswith('HIM:'): voice, txt = 'am_michael', txt[4:].strip()
    elif txt.startswith('HER:'): txt = txt[4:].strip()
    a, sr = k.create(txt, voice=voice, speed=float(os.environ.get('SPEED', '1.02')), lang='en-gb' if voice.startswith('b') else 'en-us'); sf.write(os.path.join(D, 'vo', sid + '.wav'), a, sr); durs.append(round(len(a) / sr, 2))
    hop = sr // 25; env = [float(np.sqrt(np.mean(a[i:i + hop] ** 2))) for i in range(0, len(a), hop)]
    m = max(env) or 1; amp[sid] = [round(min(1, (e / m) * 1.4), 2) for e in env]
json.dump(durs, open(os.path.join(D, 'vo', 'durs.json'), 'w')); json.dump(amp, open(os.path.join(D, 'vo', 'amp.json'), 'w'))
env = dict(os.environ, NODE_PATH='/opt/node-tools/node_modules')
if os.environ.get('TEST'):
    subprocess.run(['node', 'frames.js', 'test', os.environ['TEST']], cwd=D, env=env, check=True); print('test frames in', D); sys.exit()
subprocess.run(['node', 'frames.js', 'full'], cwd=D, env=dict(env, OUT='video.mp4'), check=True, capture_output=True)
out = os.path.join(root, 'posts', 'v2', 'vid-%s.mp4' % date)
subprocess.run(['python3', 'mix.py', 'video.mp4', out], cwd=D, check=True)
for f in ('_v.wav', '_m.wav', '_mix.wav'):
    try: os.remove(os.path.join(D, f))
    except OSError: pass
cov = out[:-4] + '-cover.jpg'  # owner 22 Nov: the cover is the first frame (TikTok / YouTube Shorts show frame 1)
if os.path.exists(cov):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import coverfirst; coverfirst.apply(out, cov)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audiocheck  # owner 22 Nov: listen before posting - dropouts, clicks, long pauses, noise jumps
bad = audiocheck.check(out)
print('SOUND CHECK:', '; '.join(bad) if bad else 'clean')
print('ok', out)
