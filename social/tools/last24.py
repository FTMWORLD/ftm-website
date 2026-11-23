"""The 6 p.m. post's data: every trade closed in the last 24 hours, 18:00 yesterday to 18:00 today, Berlin time
(owner 23 Nov 2026: "instead of yesterday on FTM, write last 24 hours on FTM"). Percentages only on social media.
python3 social/tools/last24.py [YYYY-MM-DD today] > /tmp/l24.json   -> JSON for render.js day / stories.py night (when = last24)"""
import sys, json, datetime, urllib.request
from zoneinfo import ZoneInfo
TZ = ZoneInfo('Europe/Berlin'); SITE = 'https://www.ftmwealthnation.com/api/v1/community?dayresult='
T = datetime.date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else datetime.datetime.now(TZ).date(); Y = T - datetime.timedelta(days=1)
def get(d, preview):
    try:
        with urllib.request.urlopen(SITE + d.isoformat() + ('&preview=1' if preview else '') + '&last24=1', timeout=60) as r: return json.load(r)
    except Exception: return {}
y, t = get(Y, False), get(T, True)
if not y.get('ok'): y = get(Y, True)
a = int(datetime.datetime(Y.year, Y.month, Y.day, 18, tzinfo=TZ).timestamp() * 1000); b = int(datetime.datetime(T.year, T.month, T.day, 18, tzinfo=TZ).timestamp() * 1000)
rows = sorted([r for r in (y.get('rows') or []) + (t.get('rows') or []) if a <= r['c'] < b], key=lambda r: r['c'])
seen, R = set(), []
for r in rows:
    k = (r['c'], r['s'], r.get('pl')); 
    if k not in seen: seen.add(k); R.append(r)
bal = t.get('balance') if t.get('balance') is not None else y.get('balance')
f = 1.0; run = (bal - sum(r['pl'] for r in R)) if bal else None
for r in R:
    if run: f *= 1 + r['pl'] / run; run += r['pl']
wd = lambda d: d.strftime('%a %-d %b')
L = t.get('last24') or {}
if L.get('n') == len(R) and L.get('pct') is not None: f = 1 + L['pct'] / 100   # the site's shared seg (same formula as every FTM view) decides the figure
out = {'ok': True, 'date': T.isoformat(), 'when': 'last24', 'range': '%s 18:00 – %s 18:00' % (wd(Y), wd(T)), 'pct': round((f - 1) * 100, 2) if R else 0,
       'trades': len(R), 'wins': sum(1 for r in R if r['pl'] > 0), 'losses': sum(1 for r in R if r['pl'] < 0), 'markets': sorted({r['s'] for r in R}),
       'mtd': t.get('mtd', y.get('mtd')), 'balance': bal, 'rows': R, 'cur': t.get('cur') or y.get('cur'), 'floating': t.get('floating') or y.get('floating'), 'cal': t.get('cal') or y.get('cal')}
print(json.dumps(out))
