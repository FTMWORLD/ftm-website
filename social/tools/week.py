"""Weekly summary data (owner 20 Nov: every Saturday 06:00, the week Sunday to Friday) from the site's day results.
python3 social/tools/week.py [FRIDAY=YYYY-MM-DD] > week.json   (default: the last Friday, Berlin time; PREVIEW=1 for a Friday not posted yet)
The week % chains the days' time-weighted %, the same way as every FTM figure."""
import json, sys, os, time, urllib.request, datetime as dt
from zoneinfo import ZoneInfo
now = dt.datetime.now(ZoneInfo('Europe/Berlin')).date()
fri = dt.date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else now - dt.timedelta(days=(now.weekday() - 4) % 7)
sun = fri - dt.timedelta(days=5)
days, rows_all = [], []
for i in range(6):
    d = (sun + dt.timedelta(days=i)).isoformat(); u = 'https://www.ftmwealthnation.com/api/v1/community?dayresult=' + d + ('&preview=1' if os.environ.get('PREVIEW') == '1' and d == fri.isoformat() else '')
    for k in range(3):
        try: j = json.load(urllib.request.urlopen(u, timeout=40)); break
        except Exception as e: j = {'ok': False, 'error': str(e)}; time.sleep(3)
    if not j.get('ok'): sys.exit('day %s: %s' % (d, j.get('error')))
    days.append({'date': d, 'pct': j['pct'], 'n': j['trades'], 'wins': j['wins'], 'losses': j['losses'], 'mtd': j.get('mtd'), 'balance': j.get('balance'), 'markets': j.get('markets') or [], 'cur': j.get('cur', 'USD')})
f = 1.0
for x in days: f *= 1 + x['pct'] / 100
out = {'from': sun.isoformat(), 'to': fri.isoformat(), 'pct': round((f - 1) * 100, 2), 'trades': sum(x['n'] for x in days), 'wins': sum(x['wins'] for x in days), 'losses': sum(x['losses'] for x in days),
       'mtd': days[-1]['mtd'], 'balance': days[-1]['balance'], 'cur': days[-1]['cur'], 'markets': sorted({m for x in days for m in x['markets']}),
       'days': [{k: x[k] for k in ('date', 'pct', 'n', 'wins', 'losses')} for x in days]}
print(json.dumps(out))
