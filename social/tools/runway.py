"""Runway (owner 25 Nov 2026): pictures and moving shots for FTM videos, made by Claude through the Runway API.
The key lives only in the environment's network secrets (host api.dev.runwayml.com); this file never holds it.

  python3 social/tools/runway.py image OUT.jpg "prompt"              -> one 9:16 picture (gen4_image, 1080x1920)
  python3 social/tools/runway.py video IN.jpg OUT.mp4 "motion" [5]   -> a 5 or 10 s moving shot from a picture (gen4_turbo, 720x1280)
  python3 social/tools/runway.py frames IN.mp4 DIR                   -> DIR/f000.jpg… at 25 fps, for CLIP() in a scene file
  python3 social/tools/runway.py credits                             -> credit balance

Costs (Nov 2026): a 1080p picture about 8 credits, a moving shot 5 credits per second. 1,000 credits = 10 USD."""
import sys, os, json, time, base64, subprocess, urllib.request

API = 'https://api.dev.runwayml.com/v1/'
HDR = {'Content-Type': 'application/json', 'X-Runway-Version': '2024-11-06'}


def call(path, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body is not None else None, headers=HDR, method='POST' if body is not None else 'GET')
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise SystemExit('Runway %s: HTTP %s %s' % (path, e.code, e.read().decode(errors='ignore')[:400]))


def wait(task_id, every=6, limit=900):
    t0 = time.time()
    while time.time() - t0 < limit:
        j = call('tasks/' + task_id)
        if j.get('status') == 'SUCCEEDED':
            return j['output'][0]
        if j.get('status') in ('FAILED', 'CANCELLED'):
            raise SystemExit('Runway task %s: %s %s' % (task_id, j.get('status'), j.get('failure') or j.get('failureCode')))
        time.sleep(every)
    raise SystemExit('Runway task %s: timed out' % task_id)


def fetch(url, out):
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with urllib.request.urlopen(url, timeout=300) as r, open(out, 'wb') as f:
        f.write(r.read())
    return out


def data_uri(path):
    mime = 'image/png' if path.lower().endswith('.png') else 'image/jpeg'
    return 'data:%s;base64,%s' % (mime, base64.b64encode(open(path, 'rb').read()).decode())


STYLE = (' Photorealistic, natural light, real people, shot on a phone camera, 9:16 vertical, cinematic depth of field,'
         ' subtle navy blue and warm gold tones, no text, no letters, no logos, no watermarks, calm empty space in the top fifth and the bottom third.')


def image(out, prompt, refs=None):
    body = {'model': 'gen4_image', 'promptText': (prompt + STYLE)[:1000], 'ratio': '1080:1920'}
    if refs:
        body['referenceImages'] = [{'uri': data_uri(p), 'tag': t} for t, p in refs]
    return fetch(wait(call('text_to_image', body)['id']), out)


def video(img, out, prompt, dur=5):
    body = {'model': 'gen4_turbo', 'promptImage': data_uri(img), 'promptText': prompt[:1000], 'ratio': '720:1280', 'duration': int(dur)}
    return fetch(wait(call('image_to_video', body)['id']), out)


def frames(mp4, d):
    os.makedirs(d, exist_ok=True)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', mp4, '-vf', 'fps=25,scale=1080:1920:flags=lanczos', '-q:v', '3', os.path.join(d, 'f%03d.jpg')], check=True)
    return len([f for f in os.listdir(d) if f.endswith('.jpg')])


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == 'image': print(image(a[1], a[2]))
    elif a[0] == 'video': print(video(a[1], a[2], a[3], a[4] if len(a) > 4 else 5))
    elif a[0] == 'frames': print(frames(a[1], a[2]), 'frames')
    elif a[0] == 'credits': print(call('organization').get('creditBalance'))
