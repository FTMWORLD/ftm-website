"""Draw a rising trading chart onto a laptop lid in a video (owner 27 Nov 2026: the chart must blend with the
silver laptop, no black box). The lid corners are given for the first and the last frame; the frames in between
are interpolated (Runway shots move with a slow, steady camera push).

python3 social/tools/lidchart.py in.mp4 out.mp4 "x,y x,y x,y x,y" "x,y x,y x,y x,y" [seed] [silver]
  corners: top-left, top-right, bottom-right, bottom-left (pixels of the video frame)
  silver: 1 = first paint the area silver (when the clip shows a black screen there)"""
import sys, os, subprocess, random, numpy as np
from PIL import Image, ImageDraw, ImageFilter


def chart(seed, W=900, H=640):
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    random.seed(seed); n = 15; bars = []; p = 0
    for _ in range(n):
        up = random.random() < 0.8; ch = random.uniform(0.6, 1.6) * (1 if up else -0.7); o = p; cl = p + ch
        bars.append((o, cl, max(o, cl) + random.uniform(.1, .4), min(o, cl) - random.uniform(.1, .4))); p = cl
    mn = min(b[3] for b in bars); mx = max(b[2] for b in bars); Y = lambda v: 560 - (v - mn) / (mx - mn) * 460
    step = (W - 160) / n; pts = []
    for i, (o, cl, hi, lo) in enumerate(bars):
        x = 80 + i * step + step / 2; col = (18, 170, 90, 235) if cl >= o else (214, 52, 64, 235)
        d.line([(x, Y(hi)), (x, Y(lo))], fill=col, width=7)
        d.rectangle([x - step * .34, Y(max(o, cl)), x + step * .34, Y(min(o, cl))], fill=col); pts.append((x, Y(cl)))
    d.line(pts, fill=(200, 150, 30, 240), width=8)
    return c.filter(ImageFilter.GaussianBlur(1.4))


def coeffs(pa, pb):
    m = []
    for p1, p2 in zip(pa, pb):
        m.append([p1[0], p1[1], 1, 0, 0, 0, -p2[0] * p1[0], -p2[0] * p1[1]]); m.append([0, 0, 0, p1[0], p1[1], 1, -p2[1] * p1[0], -p2[1] * p1[1]])
    return np.linalg.solve(np.array(m, dtype=float), np.array(pb).reshape(8))


def quad(s):
    return [tuple(float(v) for v in p.split(',')) for p in s.split()]


def main():
    src, out, q0, q1 = sys.argv[1], sys.argv[2], quad(sys.argv[3]), quad(sys.argv[4])
    seed = int(sys.argv[5]) if len(sys.argv) > 5 else 7; silver = len(sys.argv) > 6 and sys.argv[6] == '1'
    w, h = [int(v) for v in subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout.strip().split(',')]
    fps = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout.strip()
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    n = len(raw) // (w * h * 3); C = chart(seed); CW, CH = C.size
    enc = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % (w, h), '-r', fps, '-i', '-', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
    for i in range(n):
        f = Image.frombytes('RGB', (w, h), raw[i * w * h * 3:(i + 1) * w * h * 3]); t = i / max(1, n - 1)
        q = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for a, b in zip(q0, q1)]
        if silver:
            m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).polygon(q, fill=255); m = m.filter(ImageFilter.GaussianBlur(1.2))
            ys = [p[1] for p in q]; y0, y1 = min(ys), max(ys)
            g = np.linspace(0, 1, h)[:, None] * np.ones((1, w)); g = np.clip((np.arange(h)[:, None] - y0) / max(1, y1 - y0), 0, 1) * np.ones((1, w))
            top, bot = np.array([150, 153, 160]), np.array([112, 115, 122])
            arr = (top[None, None, :] * (1 - g[..., None]) + bot[None, None, :] * g[..., None]).astype('uint8')
            lid = Image.fromarray(arr, 'RGB'); f.paste(lid, (0, 0), m)
        cx = sum(p[0] for p in q) / 4; cy = sum(p[1] for p in q) / 4
        ins = float(os.environ.get('LID_INSET', '0.82')); qi = [(cx + (p[0] - cx) * ins, cy + (p[1] - cy) * (ins - .04)) for p in q]
        warp = C.transform((w, h), Image.PERSPECTIVE, coeffs(qi, [(0, 0), (CW, 0), (CW, CH), (0, CH)]), Image.BICUBIC)
        f.paste(warp, (0, 0), warp)
        enc.stdin.write(f.tobytes())
    enc.stdin.close(); enc.wait(); print('ok', out, n, 'frames')


if __name__ == '__main__':
    main()
