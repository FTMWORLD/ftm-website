"""Prepare the photo plates for the owner voice ad: upscale ChatGPT scenes to 1080x1920, key the green phone screens
(alpha + despill near the phone only), and write each screen's corner quad as a CSS matrix3d for a W x H screen."""
import cv2, numpy as np, json
S = 1080 / 941
def order(p):
    p = sorted(p, key=lambda q: q[1]); t = sorted(p[:2]); b = sorted(p[2:]); return [t[0], t[1], b[1], b[0]]
def quads(im):
    b, g, r = [im[:, :, i].astype(int) for i in range(3)]
    m = ((g > 120) & (g > r + 50) & (g > b + 50)).astype(np.uint8)
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE); out = []
    for c in sorted(cs, key=cv2.contourArea, reverse=True):
        if cv2.contourArea(c) < 1500: break
        h = cv2.convexHull(c); e = .02
        while True:
            ap = cv2.approxPolyDP(h, e * cv2.arcLength(h, True), True)
            if len(ap) <= 4: break
            e += .005
        if len(ap) == 4: out.append(order(ap.reshape(-1, 2).astype(float).tolist()))
    return out, m
def m3d(q, W, H, grow=5):
    cx, cy = np.mean(q, 0); q = [[x + (x - cx) / max(1, abs(x - cx)) * grow, y + (y - cy) / max(1, abs(y - cy)) * grow] for x, y in q]
    M = cv2.getPerspectiveTransform(np.float32([[0, 0], [W, 0], [W, H], [0, H]]), np.float32(q))
    a, b, c, d, e, f, g, h, _ = M.flatten().tolist()
    return 'matrix3d(%s)' % ','.join('%.8f' % v for v in [a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, 1])
out = {}
for k, n in {'watch': 3, 'nurse': 2, 'courier': 4, 'kitchen': 5, 'hand': 6, 'world': 7, 'couple': 8}.items():
    im = cv2.imread('gpt/g-%03d.jpg' % n)
    im = cv2.resize(im, (1080, 1920), interpolation=cv2.INTER_LANCZOS4)
    bl = cv2.GaussianBlur(im, (0, 0), 1.2); im = cv2.addWeighted(im, 1.45, bl, -.45, 0)
    qs, m = quads(im)
    if not qs:
        cv2.imwrite('img/%s.jpg' % k, im, [cv2.IMWRITE_JPEG_QUALITY, 95]); out[k] = {'img': '%s.jpg' % k, 'q': []}; continue
    near = cv2.dilate(m, np.ones((25, 25), np.uint8)) > 0
    f = im.astype(float); b, g, r = f[:, :, 0], f[:, :, 1], f[:, :, 2]
    key = np.clip((g - np.maximum(r, b) - 25) / 45, 0, 1); a = np.where(near, 1 - key, 1.0)
    a = cv2.GaussianBlur(a, (3, 3), 0)
    g2 = np.where(near & (g > np.maximum(r, b)), np.maximum(r, b) + (g - np.maximum(r, b)) * .15, g); f[:, :, 1] = g2
    rgba = np.dstack([f.clip(0, 255).astype(np.uint8), (a * 255).astype(np.uint8)])
    cv2.imwrite('img/%s.png' % k, rgba)
    out[k] = {'img': '%s.png' % k, 'q': [[[round(x, 1), round(y, 1)] for x, y in q] for q in qs]}
    for i, q in enumerate(qs):
        wd = (np.hypot(*np.subtract(q[1], q[0])) + np.hypot(*np.subtract(q[2], q[3]))) / 2; ht = (np.hypot(*np.subtract(q[3], q[0])) + np.hypot(*np.subtract(q[2], q[1]))) / 2
        W = 540; H = round(W * ht / wd); out[k].setdefault('scr', []).append({'W': W, 'H': H, 'm': m3d(q, W, H)})
json.dump(out, open('plates.json', 'w'), indent=1)
for k, v in out.items(): print(k, v['img'], v['q'], [(s['W'], s['H']) for s in v.get('scr', [])])
