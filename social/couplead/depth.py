"""Moving photos: split each plate into background + foreground by depth (Depth Anything V2 small, ONNX),
fill the background behind the people (inpaint), keep the keyed phone screen hole in the foreground layer."""
import cv2, numpy as np, onnxruntime as ort, glob, os, json
from huggingface_hub import hf_hub_download
sess = ort.InferenceSession(hf_hub_download('onnx-community/depth-anything-v2-small', 'onnx/model.onnx'))
out = {}
PCT = {'watch': 52, 'kitchen': 60}  # Otsu only finds the table here; take the nearest part that includes the person
for k in ['couple', 'hand', 'nurse', 'watch', 'courier', 'kitchen']:
    f = 'img/%s.png' % k if os.path.exists('img/%s.png' % k) else 'img/%s.jpg' % k
    im = cv2.imread(f, cv2.IMREAD_UNCHANGED); rgb = im[:, :, :3]; alpha = im[:, :, 3] if im.shape[2] == 4 else None
    x = cv2.resize(cv2.cvtColor(rgb, cv2.COLOR_BGR2RGB), (518, 924), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255
    x = ((x - [.485, .456, .406]) / [.229, .224, .225]).transpose(2, 0, 1)[None].astype(np.float32)
    d = sess.run(None, {'pixel_values': x})[0][0]; d = (d - d.min()) / (d.max() - d.min() + 1e-9)
    d = cv2.resize(d, (1080, 1920), interpolation=cv2.INTER_CUBIC)
    th, _ = cv2.threshold((d * 255).astype(np.uint8), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU); th = th / 255
    if k in PCT: th = np.percentile(d, PCT[k])
    m = (d > th).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)  # keep big pieces only
    keep = np.zeros_like(m)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] > 1080 * 1920 * .01: keep[lab == i] = 1
    keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (71, 71)))
    cs, _ = cv2.findContours(keep, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE); keep = cv2.drawContours(np.zeros_like(keep), cs, -1, 1, -1)  # fill holes inside people
    soft = cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 3)
    if alpha is not None: a = np.minimum(soft, alpha / 255.0); a[alpha < 250] = alpha[alpha < 250] / 255.0 * soft[alpha < 250]
    else: a = soft
    fg = np.dstack([rgb, (np.clip(a, 0, 1) * 255).astype(np.uint8)])
    hole = cv2.dilate(keep, np.ones((41, 41), np.uint8))
    small = cv2.resize(rgb, (540, 960)); hs = cv2.resize(hole, (540, 960), interpolation=cv2.INTER_NEAREST)
    bg = cv2.inpaint(small, hs, 9, cv2.INPAINT_TELEA); bg = cv2.resize(bg, (1080, 1920), interpolation=cv2.INTER_CUBIC)
    bg = np.where(hole[:, :, None] > 0, cv2.GaussianBlur(bg, (0, 0), 6), rgb)
    cv2.imwrite('img/%s-bg.jpg' % k, bg, [cv2.IMWRITE_JPEG_QUALITY, 93]); cv2.imwrite('img/%s-fg.png' % k, fg)
    ys, xs = np.nonzero(keep); out[k] = {'fg_share': round(float(keep.mean()), 3), 'cx': int(xs.mean()) if len(xs) else 540, 'cy': int(ys.mean()) if len(ys) else 960}
    cv2.imwrite('/tmp/claude-0/-home-user-ftm-website/bf2cab86-488a-5b85-ae97-884fa7cab310/scratchpad/ad3/m_%s.jpg' % k, cv2.resize(np.hstack([rgb, cv2.cvtColor((d * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR), cv2.cvtColor(keep * 255, cv2.COLOR_GRAY2BGR), bg]), (1080, 480)))
json.dump(out, open('layers.json', 'w')); print(out)
