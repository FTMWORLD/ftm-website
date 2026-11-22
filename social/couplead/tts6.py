"""Video A with our own voices (owner 22 Nov 2026: "take out our audio, only your audio from now on").
Builds vo.wav, vo.lines.json, vo.words.json and vo.amp.json for ad.html from the 14 lines below (Kokoro TTS: her = af_heart,
him = am_michael). Word timings come from faster-whisper on each line, mapped onto the display words.
python3 tts6.py <kokoro dir>"""
import sys, json, subprocess, wave, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
from faster_whisper import WhisperModel
T = sys.argv[1]; k = Kokoro(T + '/kokoro-v1.0.onnx', T + '/voices-v1.0.bin'); sr = 48000
m = WhisperModel('small.en', device='cpu', compute_type='int8')
VOICE = {'her': 'af_heart', 'him': 'am_michael'}
# (speaker, words shown on screen, words spoken) - the animation looks for: 6, loss, That, on, while, tap, email, started
L = [('her', "It's 6 p.m. Why are you smiling at your phone?", "It's six P M. Why are you smiling at your phone?"),
     ('him', "FTM just posted yesterday's results.", "F T M just posted yesterday's results."),
     ('her', "Every day?", "Every day?"),
     ('him', "Yes, every day. Every single trade.", "Yes, every day. Every single trade."),
     ('her', "Even the loss days?", "Even the loss days?"),
     ('him', "Of course. Even the loss days. That's why I trust them.", "Of course. Even the loss days. That's why I trust them."),
     ('her', "And who's doing this trading?", "And who's doing this trading?"),
     ('him', "The FTM MACHINE. It trades on your account while you are at work.", "The F T M Machine. It trades on your account while you are at work."),
     ('her', "And what if I want to stop?", "And what if I want to stop?"),
     ('him', "Just one tap, and you can pause any time.", "Just one tap, and you can pause any time."),
     ('her', "So how do I start?", "So how do I start?"),
     ('him', "Create a free account with just your email, and you get started.", "Create a free account with just your email, and you get started."),
     ('her', "Link below.", "Link below."),
     ('him', "See you at 6.", "See you at six.")]
GAP = .3
def clip(txt, voice):
    a, r = k.create(txt, voice=voice, speed=1.0, lang='en-us')
    a = np.interp(np.arange(int(len(a) * sr / r)) * r / sr, np.arange(len(a)), a)
    nz = np.where(np.abs(a) > .003)[0]; a = a[max(0, nz[0] - int(.02 * sr)):nz[-1] + int(.06 * sr)]
    f = int(.01 * sr); a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f); return a
def rms(x): return np.sqrt(np.mean(x ** 2) + 1e-12)
out = [np.zeros(int(.12 * sr))]; t0 = .12; lines = []; words = []
for who, show, say in L:
    a = clip(say, VOICE[who]); a = a * (10 ** (-17 / 20)) / rms(a[np.abs(a) > np.percentile(np.abs(a), 60)])
    x16 = np.interp(np.arange(int(len(a) / 3)) * 3, np.arange(len(a)), a).astype('float32')
    segs, _ = m.transcribe(x16, language='en', word_timestamps=True)
    ws = [(w.start, w.end) for s in segs for w in s.words]; dw = show.split()
    if len(ws) != len(dw):  # fall back to timing by word length
        n = sum(len(w) + 2 for w in dw); dur = len(a) / sr - .08; c = .02; ws = []
        for w in dw: d = dur * (len(w) + 2) / n; ws.append((c, c + d)); c += d
    for (s, e), w in zip(ws, dw): words.append([round(t0 + s, 3), round(t0 + e, 3), w])
    lines.append([round(t0, 3), round(t0 + len(a) / sr, 3), who]); out.append(a); t0 += len(a) / sr
    out.append(np.zeros(int(GAP * sr))); t0 += GAP
v = np.concatenate(out + [np.zeros(int(.2 * sr))])
o = wave.open('_raw.wav', 'w'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes((np.clip(v, -1, 1) * 32767).astype(np.int16).tobytes()); o.close()
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', '_raw.wav', '-af', 'equalizer=f=3200:t=q:w=1.2:g=2,acompressor=threshold=-22dB:ratio=2.5:attack=8:release=160:makeup=2,loudnorm=I=-16:TP=-1.5:LRA=7', '-ar', str(sr), '-ac', '1', 'vo.wav'], check=True)
v = np.frombuffer(subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', 'vo.wav', '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True).stdout, np.float32).astype(float)
h = sr // 30; e2 = np.array([rms(v[i:i + h]) for i in range(0, len(v), h)]); e2 = np.clip(e2 / np.percentile(e2, 97), 0, 1)
json.dump([round(float(x), 3) for x in e2], open('vo.amp.json', 'w')); json.dump(lines, open('vo.lines.json', 'w')); json.dump(words, open('vo.words.json', 'w'))
print('voice', round(len(v) / sr, 2), 'words', len(words))
