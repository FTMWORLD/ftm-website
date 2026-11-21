"""Animated, narrated weekly video (owner 20 Nov: like the newsroom week video, every day of the week shown, profit days and loss days).
python3 social/tools/weekvid.py week.json   (from social/tools/week.py)  -> social/posts/v2/vid-week-<to>.mp4"""
import json, sys, os, subprocess, datetime as dt
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = json.load(open(sys.argv[1]))
NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
days = [(dt.date.fromisoformat(x['date']), x) for x in W['days']]
week = [[NAMES[d.weekday()][:3], x['pct'], x['n']] for d, x in days]
said = lambda v: ('plus ' if v > 0 else 'minus ' if v < 0 else '') + ('%.2f' % abs(v)) + ' percent'
on = [(d, x) for d, x in days if x['n']]
best = max(on, key=lambda p: p[1]['pct']); low = min(on, key=lambda p: p[1]['pct'])
key = 'week-' + W['to']
scenes = [['week', 'Here is this week on FTM, day by day. Real numbers from the account.'],
          ['best', 'The best day was %s, %s. The lowest day was %s, %s. We show every single one.' % (NAMES[best[0].weekday()], said(best[1]['pct']), NAMES[low[0].weekday()], said(low[1]['pct']))],
          ['total', 'The week in total: %s, from %d closed trades.' % (said(W['pct']), W['trades'])],
          ['cta', 'See every trade live. Start free at ftm wealth nation dot com, and follow us for every result at 11 p.m.']]
J = json.load(open(os.path.join(root, 'plan', 'journey.json')))
J['days'] = [d for d in J['days'] if d.get('date') != key] + [{'date': key, 'stage': '2 · Proof', 'format': 'Weekly recap (newsroom, real figures)', 'title': 'This week on FTM',
             'open': '%s days, Saturday to Friday. Here is every result, profit days and loss days.' % ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'][len(week)], 'hook': 'Our week, in numbers.', 'scenes': scenes}]
json.dump(J, open(os.path.join(root, 'plan', 'journey.json'), 'w'), indent=1, ensure_ascii=False)
src = open(os.path.join(root, 'videos', 'assets', 'scn-week7.js')).read().replace('/*__WEEK__*/[]', json.dumps(week))
scn = os.path.join(root, 'videos', 'assets', 'scn-%s.js' % key); open(scn, 'w').write(src)
subprocess.run(['python3', os.path.join(root, 'tools', 'buildvid.py'), key, scn, '104', '0'], check=True)
print('ok', os.path.join(root, 'posts', 'v2', 'vid-%s.mp4' % key))
