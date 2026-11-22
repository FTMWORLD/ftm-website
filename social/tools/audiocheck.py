"""Listen check before posting (owner 22 Nov 2026: "before you send out, listen to it yourself").
Finds what people hear as hiccups or glitches in a finished video:
  dropouts  - the sound suddenly falls silent (> 120 ms) in the middle of the video
  clicks    - single-sample jumps far above the surrounding sound
  pauses    - dead air longer than MAXPAUSE s between spoken lines (voice band 300-3400 Hz well below speech)
  jumps     - the background level jumps by more than 12 dB from one 50 ms step to the next while nobody speaks
python3 social/tools/audiocheck.py video.mp4 [MAXPAUSE=0.9]   -> prints findings, exit 1 if any"""
import sys, subprocess, numpy as np

def load(path, sr=48000):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-vn', '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(float), sr

def db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)

def check(path, maxpause=0.9):
    a, sr = load(path); out = []
    n = len(a) / sr; hop = int(sr * .01)
    lv = np.array([db(a[i:i + hop]) for i in range(0, len(a) - hop, hop)])
    # dropouts: > 12 consecutive 10 ms frames below -55 dB, not in the first or last 0.5 s
    low = lv < -55; run = 0
    for i, l in enumerate(low):
        run = run + 1 if l else 0
        if run == 12 and .5 < i / 100 < n - .5: out.append('dropout at %.2f s' % ((i - 11) / 100))
    # clicks: one isolated sample step (a cut without a fade) far bigger than every other step in the 4 ms around it
    d = np.abs(np.diff(a)); w = int(sr * .002); cand = np.where(d > .05)[0]; last = -1
    for k in cand:
        if k - last < sr * .05 or k < w or k > len(d) - w: continue
        around = np.concatenate([d[k - w:k - 1], d[k + 2:k + w]])
        if d[k] > 4 * around.max(): out.append('click at %.3f s' % (k / sr)); last = k
    # voice band envelope: speech vs pause
    import numpy.fft as F
    spec_hop = int(sr * .05); vb = []
    for i in range(0, len(a) - spec_hop, spec_hop):
        X = np.abs(F.rfft(a[i:i + spec_hop] * np.hanning(spec_hop))); f = F.rfftfreq(spec_hop, 1 / sr)
        vb.append(20 * np.log10(np.sqrt(np.mean(X[(f > 300) & (f < 3400)] ** 2)) + 1e-9))
    vb = np.array(vb); speech = vb > np.percentile(vb, 85) - 14
    idx = np.where(speech)[0]
    if len(idx):
        for p, q in zip(idx[:-1], idx[1:]):
            if (q - p) * .05 > maxpause: out.append('pause %.1f s at %.2f s' % ((q - p) * .05, p * .05))
    # level jumps: compare 250 ms blocks (a drum hit is short, a noise switching on or off lasts)
    B = 5; tot = np.array([db(a[i * spec_hop:(i + B) * spec_hop]) for i in range(0, len(vb) - B, B)])
    sp = [speech[i:i + B].any() for i in range(0, len(vb) - B, B)]
    for i in range(1, len(tot)):
        if not any(sp[max(0, i - 2):i + 2]) and abs(tot[i] - tot[i - 1]) > 10 and 1 < i * B * .05 < n - 1.5:
            out.append('level jump %+.0f dB at %.2f s' % (tot[i] - tot[i - 1], i * B * .05))
    return out

if __name__ == '__main__':
    r = check(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else .9)
    print('\n'.join(r) if r else 'clean: no dropouts, clicks, long pauses or level jumps')
    sys.exit(1 if r else 0)
