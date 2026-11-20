"""Owner's video library: one page with every FTM video, a preview picture and a download link.
python3 social/tools/videopage.py  -> social/library/index.html (+ thumbs/). Then publish it with the Artifact tool (same file path)."""
import json, os, subprocess, html
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); L = os.path.join(R, 'library')
V = json.load(open(os.path.join(L, 'videos.json'))); SITE = 'https://www.ftmwealthnation.com/social/posts/'
cards = []
for v in sorted(V, key=lambda x: (x['date'], x['kind'] != 'Coming next'), reverse=True):
    src = os.path.join(R, 'posts', v['file']); name = os.path.basename(v['file'])[:-4] + '.jpg'; th = os.path.join(L, 'thumbs', name)
    if not os.path.exists(th) and os.path.exists(src):
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(v.get('at', 3)), '-i', src, '-frames:v', '1', '-vf', 'scale=480:-2', '-q:v', '5', th], check=True)
    dur = ''
    try: s = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout); dur = '%d:%02d' % (s // 60, s % 60)
    except Exception: pass
    wide = '16x9' in name or 'intro-16' in name
    cards.append(f'''<article class="v{' wide' if wide else ''}"><a class="pic" href="{SITE + v['file']}" target="_blank" rel="noopener"><img src="thumbs/{name}" alt="" loading="lazy"><span class="dur">{dur}</span></a>
<div class="meta"><span class="kind">{html.escape(v['kind'])}</span><h2>{html.escape(v['title'])}</h2><p>{html.escape(v['date'])}</p>
<a class="dl" href="{SITE + v['file']}" target="_blank" rel="noopener">Open video to save or share</a><code>{SITE + v['file']}</code></div></article>''')
page = open(os.path.join(L, 'template.html')).read().replace('<!--CARDS-->', '\n'.join(cards)).replace('<!--N-->', str(len(V)))
open(os.path.join(L, 'index.html'), 'w').write(page); print('ok', len(V), 'videos')
