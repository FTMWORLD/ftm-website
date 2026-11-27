"""Remove an object from a slow-push video by filling it with the same frame shifted (grass, walls).
python3 social/tools/cleanplate.py in.mp4 out.mp4 "x,y x,y ..." "x,y x,y ..." [feather]
  polygons: object outline on the first and on the last frame (same number of points); in between is interpolated.
  CP_SHIFT (default 200 px) / CP_SHIFTY: where the fill comes from; wide objects are filled in bands, each from the one before."""
import sys, os, subprocess, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter


def quad(s):
    return [tuple(float(v) for v in p.split(',')) for p in s.split()]


def shifted(a, sx, sy):
    h, w = a.shape[:2]; ys = np.clip(np.arange(h) - sy, 0, h - 1); xs = np.clip(np.arange(w) - sx, 0, w - 1)
    return a[ys][:, xs]


def main():
    src, out, q0, q1 = sys.argv[1], sys.argv[2], quad(sys.argv[3]), quad(sys.argv[4])
    fe = float(sys.argv[5]) if len(sys.argv) > 5 else 6
    w, h = [int(v) for v in subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout.strip().split(',')]
    fps = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout.strip()
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, stdin=subprocess.DEVNULL).stdout
    n = len(raw) // (w * h * 3)
    frame = lambda i: np.frombuffer(raw[i * w * h * 3:(i + 1) * w * h * 3], dtype=np.uint8).reshape(h, w, 3)
    poly = lambda t: [(p[0] + (r[0] - p[0]) * t, p[1] + (r[1] - p[1]) * t) for p, r in zip(q0, q1)]
    def mask(t, grow=0):
        m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).polygon(poly(t), fill=255)
        if grow: m = m.filter(ImageFilter.MaxFilter(grow))
        return np.asarray(m, dtype=np.float32) / 255
    sx = int(os.environ.get('CP_SHIFT', '200')); sy = int(os.environ.get('CP_SHIFTY', '0'))
    enc = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % (w, h), '-r', fps, '-i', '-', '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
    for i in range(n):
        a = frame(i); t = i / max(1, n - 1)
        m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).polygon(poly(t), fill=255)
        m = np.asarray(m.filter(ImageFilter.GaussianBlur(fe)), dtype=np.float32)[..., None] / 255
        xs = np.where(m[..., 0].max(0) > 0)[0]; x0 = xs.min(); c = a.astype(np.float32); k = 1
        while x0 + (k - 1) * abs(sx) <= xs.max():
            band = np.zeros((1, w, 1), np.float32); lo = x0 + (k - 1) * abs(sx) if sx > 0 else xs.max() - k * abs(sx); band[0, max(0, lo - 8):lo + abs(sx) + 8] = 1
            mk = m * band; c = c * (1 - mk) + shifted(c, sx, sy) * mk; k += 1
        mb = (m[..., 0] > .02).astype(np.uint8) * 255; ys, xx = np.where(mb > 0)
        ctr = ((xx.min() + xx.max() + 1) // 2, (ys.min() + ys.max() + 1) // 2)
        # light and shade from the surroundings (no copied stripes), grass texture from the copy
        bl = cv2.GaussianBlur(a.astype(np.float32), (0, 0), 4); lf = bl.copy(); prev = None
        for y in range(h):
            r = np.where(mb[y] > 0)[0]
            if len(r):
                xl = r.min(); seg = bl[y, max(0, xl - 110):max(1, xl - 15)]
                prev = seg.mean(0) if len(seg) else prev
                lf[y, r.min():r.max() + 1] = prev
        lf = cv2.GaussianBlur(lf, (0, 0), 6); hf = c - cv2.GaussianBlur(c, (0, 0), 10)
        tc = lf + hf; edge = int(os.environ.get('CP_KEEP_RIGHT', '0'))
        wp = np.clip((edge - np.arange(w)) / 40, 0, 1)[None, :, None] if edge else 1
        c = a * (1 - m) + np.clip(tc * wp + c * (1 - wp), 0, 255) * m
        enc.stdin.write(np.asarray(c, dtype=np.uint8).tobytes())
        if os.environ.get('CP_ONE'): break
    enc.stdin.close(); enc.wait(); print('ok', out, n, 'frames')


if __name__ == '__main__':
    main()
