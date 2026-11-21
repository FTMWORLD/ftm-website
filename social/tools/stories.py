"""FTM daily stories (owner 21 Nov 2026): 5 stories a day in total = 06:05 morning video, 11:00, 17:00, 20:00 (built here),
23:00 day result (built by the daily result job with storyvid.js). Every story is a 10 s video: centred, moving, music,
a real figure, FOMO and a call to action. Figures come from /api/v1/community?dayresult= (never typed by hand).
python3 social/tools/stories.py YYYY-MM-DD [out-dir]  -> <out>/story-D-11.mp4, story-D-17.mp4, story-D-20.mp4
python3 social/tools/stories.py YYYY-MM-DD out-dir night '<dayresult json>'  -> <out>/day-D-story.mp4 (23:00 result story)"""
import sys, json, os, subprocess, datetime, urllib.request

D = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else 'social/posts/v3'
MODE = sys.argv[3] if len(sys.argv) > 3 else 'day'
HERE = os.path.dirname(os.path.abspath(__file__))
MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
WD = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']


def pc(v):
    return ('+' if v > 0 else '−' if v < 0 else '') + '%.2f%%' % abs(v)


def fetch(day):
    url = 'https://www.ftmwealthnation.com/api/v1/community?dayresult=' + day
    req = urllib.request.Request(url, headers={'User-Agent': 'ftm-social'})
    return json.load(urllib.request.urlopen(req, timeout=30))


def latest_before(d):
    day = datetime.date.fromisoformat(d)
    for k in range(1, 8):
        x = (day - datetime.timedelta(days=k)).isoformat()
        try:
            j = fetch(x)
            if j.get('ok') and j.get('trades', 0) > 0:
                return j
        except Exception:
            pass
    raise SystemExit('no posted day result in the last 7 days')


def render(cfg, out):
    env = dict(os.environ, NODE_PATH=os.environ.get('NODE_PATH', '/opt/node-tools/node_modules'))
    subprocess.run(['node', os.path.join(HERE, 'storyvid.js'), json.dumps(cfg), out], check=True, env=env)


def month_facts(j):
    cal = j.get('cal') or []
    return {'trades': sum(c.get('n', 0) for c in cal), 'green': sum(1 for c in cal if c.get('pct', 0) > 0),
            'red': sum(1 for c in cal if c.get('pct', 0) < 0)}


BRAND = [
    {'kicker': 'Portfolio · 2020 to 2026', 'hook': 'Five markets. <b>One account.</b>', 'big': '+98,644%', 'bigTone': 'gold',
     'bigLabel': 'Growth profile · full backtest', 'title': '7 of 7 years profitable. <b>Every trade on the trust engine.</b>', 'cta': 'See every trade free'},
    {'kicker': 'Your money', 'hook': 'Your money never <b>leaves your account.</b>', 'title': 'FTM MACHINE trades on your own broker account, in your name.',
     'chips': ['Pause any time', 'Every trade shown'], 'cta': 'Start free in one tap'},
    {'kicker': 'Around the clock', 'hook': 'Markets move <b>at 3 a.m.</b>', 'title': 'FTM MACHINE doesn\'t sleep. <b>You can.</b>',
     'chips': ['Gold', 'Bitcoin', 'US Tech 100', 'USD/JPY', 'Hang Seng 50'], 'cta': 'Start free in one tap'},
    {'kicker': 'Built for', 'hook': 'Nurses, pilots, drivers, <b>parents.</b>', 'title': 'Too busy to watch the markets? <b>FTM is built for you.</b>',
     'cta': 'Create your free account'},
    {'kicker': 'Free account', 'hook': 'See it all <b>before you pay.</b>', 'title': 'The live account, every trade, every day. <b>Free.</b>',
     'chips': ['No card needed', 'One tap'], 'cta': 'Open your free account'},
    {'kicker': 'Every night', 'hook': 'Tonight at <b>11 p.m.</b>', 'title': 'Today\'s real result, every single trade. <b>Follow so it finds you.</b>',
     'cta': 'Follow + start free'},
]


def day_set(d):
    y = latest_before(d)
    dt = datetime.date.fromisoformat(y['date']); mon = MON[dt.month - 1]; f = month_facts(y)
    yd = 'Yesterday' if (datetime.date.fromisoformat(d) - dt).days == 1 else WD[dt.weekday()]
    up = y['pct'] >= 0
    if up:
        s11 = {'kicker': yd + ' on FTM', 'hook': yd + ', while you worked:', 'big': pc(y['pct']), 'bigTone': 'up',
               'bigLabel': '%d trades on the live account' % y['trades']}
    else:  # owner 18 Oct: lead with the best results -> the month's best real day
        bd = max(y.get('cal') or [{'date': y['date'], 'pct': y['pct']}], key=lambda c: c.get('pct', 0)); bdt = datetime.date.fromisoformat(bd['date'])
        s11 = {'kicker': 'Best day in ' + mon, 'hook': 'One day. <b>One account.</b>', 'big': pc(bd['pct']), 'bigTone': 'up',
               'bigLabel': '%s %d %s on the live account' % (WD[bdt.weekday()], bdt.day, mon[:3])}
    s11.update({'title': ('%s so far: <b>%s</b>' % (mon, pc(y['mtd']))) if y.get('mtd') is not None else 'Every trade shown.',
           'chips': ['Tonight 11 p.m.: today\'s result'], 'cta': 'Start free in one tap', 'seed': dt.day * 3 + 1})
    m = y.get('mtd')
    s17 = {'kicker': 'Live account · ' + mon, 'hook': 'While you were busy,', 'big': pc(m) if m is not None else '%d trades' % f['trades'],
           'bigTone': 'up' if (m or 0) >= 0 else 'down', 'bigLabel': mon + ' so far on FTM',
           'title': 'Every trade shown. <b>%d green days, %d red.</b>' % (f['green'], f['red']),
           'chips': ['%d trades' % f['trades'], '5 markets', '24/7'], 'cta': 'Start free in one tap', 'seed': dt.day * 3 + 2}
    b = dict(BRAND[datetime.date.fromisoformat(d).toordinal() % len(BRAND)]); b['seed'] = dt.day * 3 + 3
    return [('11', s11), ('17', s17), ('20', b)]


def night(d, j):
    dt = datetime.date.fromisoformat(d); mon = MON[dt.month - 1]; fl = j.get('floating') or {}
    if j.get('trades', 0) == 0:
        cfg = {'kicker': 'Today on FTM · %d %s' % (dt.day, mon[:3]), 'hook': 'No trades today.', 'big': '0 trades', 'bigTone': 'gold',
               'bigLabel': 'Waiting is part of the plan', 'title': ('%s so far: <b>%s</b>' % (mon, pc(j['mtd']))) if j.get('mtd') is not None else ''}
    else:
        cfg = {'kicker': 'Today on FTM · %d %s' % (dt.day, mon[:3]), 'hook': 'Today\'s result:', 'big': pc(j['pct']),
               'bigTone': 'up' if j['pct'] >= 0 else 'down', 'bigLabel': '%d trades · every one shown' % j['trades'],
               'title': ('%s so far: <b>%s</b>' % (mon, pc(j['mtd']))) if j.get('mtd') is not None else ''}
    chips = []
    if fl.get('n'):
        chips.append('Open trades: %s%s (%s)' % ('+' if fl.get('pl', 0) >= 0 else '−', '${:,.0f}'.format(abs(fl.get('pl', 0))), pc(fl.get('pct', 0))))
    chips.append('Swipe the post for every trade')
    cfg.update({'chips': chips, 'cta': 'Start free in one tap', 'seed': dt.day * 3 + 4})
    return cfg


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    if MODE == 'night':
        j = json.loads(sys.argv[4]) if len(sys.argv) > 4 else fetch(D)
        out = os.path.join(OUT, 'day-%s-story.mp4' % D); render(night(D, j), out); print(out)
    else:
        for slot, cfg in day_set(D):
            out = os.path.join(OUT, 'story-%s-%s.mp4' % (D, slot)); render(cfg, out); print(out)
