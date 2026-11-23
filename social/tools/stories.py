"""FTM daily stories (owner 21 Nov 2026): 5 own stories a day at 08:00, 10:30, 13:00, 15:30, 18:00 (owner 21 Nov: nothing at 20:00; built here), plus the
reposts of the feed posts (06:05 morning video, 23:00 day result built by the daily result job with storyvid.js). Every story is a 10 s video: centred, moving, music,
a real figure, FOMO and a call to action. Figures come from /api/v1/community?dayresult= (never typed by hand).
python3 social/tools/stories.py YYYY-MM-DD [out-dir]  -> <out>/story-D-0800|1030|1300|1530|1800.mp4
python3 social/tools/stories.py YYYY-MM-DD out-dir night '<dayresult json>'  -> <out>/day-D-story.mp4 (23:00 result story)"""
import sys, json, os, subprocess, datetime, urllib.request

D = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else 'social/posts/v3'
MODE = sys.argv[3] if len(sys.argv) > 3 else 'day'
HERE = os.path.dirname(os.path.abspath(__file__))
MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
EVE = D >= '2026-11-23'  # owner 22 Nov: from Mon 23 Nov the result post is at 6 p.m. (yesterday's full result)
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
    {'kicker': 'Transparency', 'hook': 'Every trade. <b>Every day. Public.</b>', 'title': 'Profit days and loss days, posted at %s. <b>Nothing hidden.</b>' % ('6 p.m.' if EVE else '11 p.m.'),
     'cta': 'See it free'},
    {'kicker': 'How it works', 'hook': '3 steps. <b>About 10 minutes.</b>', 'title': 'You stay in control. <b>Pause any time.</b>',
     'chips': ['1 · Free account', '2 · Connect your broker', '3 · FTM MACHINE trades'], 'cta': 'Start step 1 free'},
    {'kicker': 'Community', 'hook': 'Meet people <b>running FTM MACHINE.</b>', 'title': 'Leaderboard, chat and every result. <b>Inside your free account.</b>',
     'cta': 'Join free in one tap'},
    {'kicker': 'Every evening' if EVE else 'Every night', 'hook': 'Today at <b>6 p.m.</b>' if EVE else 'Tonight at <b>11 p.m.</b>', 'title': ('Yesterday\'s real result, every single trade. ' if EVE else 'Today\'s real result, every single trade. ') + '<b>Follow so it finds you.</b>',
     'cta': 'Follow + start free'},
]


MYTHS = [  # owner 23 Nov 2026: more formats; every fact here is true and shown on the website
    ('You must watch the charts all day.', 'FTM MACHINE watches them 24/7. <b>You watch the result.</b>'),
    ('You have to send your money to the platform.', 'Your money stays in <b>your own broker account</b>, in your name.'),
    ('Once it starts, you can\'t stop it.', 'One tap pauses FTM MACHINE. <b>Any time.</b>'),
    ('It\'s only for traders.', 'It\'s built for <b>people with jobs, families and no time.</b>'),
    ('You only see results after you pay.', 'The live account and every trade are <b>free to watch.</b>'),
    ('One good month proves a strategy.', 'We tested 2020–2026: <b>7 of 7 years profitable.</b>'),
    ('Automated trading never has a loss day.', 'It does. <b>We post every loss day too.</b>'),
]
POVS = [
    ('POV: you\'re asleep and <b>Bitcoin moves at 3 a.m.</b>', 'FTM MACHINE was awake. <b>Every trade shown.</b>'),
    ('POV: you lost a trade and want it <b>back right now.</b>', 'That\'s revenge trading. <b>FTM MACHINE has no feelings.</b>'),
    ('POV: you check the app at lunch and the <b>move already happened.</b>', 'FTM MACHINE was there when it started.'),
    ('POV: you moved your stop <b>"just this once".</b>', 'FTM MACHINE never moves its stop. <b>Fixed rules.</b>'),
    ('POV: payday, and you don\'t know <b>where to start.</b>', 'Watch a live account first. <b>Free.</b>'),
    ('POV: the market opens in Tokyo <b>while you sleep in Berlin.</b>', 'FTM MACHINE trades 5 markets, <b>24/7.</b>'),
]
SOUNDS = ['drive', 'lofi', 'news', 'cinema', 'bright']


def pick(lst, o, k=0):
    return lst[(o + k) % len(lst)]


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
           'chips': ['6 p.m. today: yesterday\'s result' if EVE else 'Tonight 11 p.m.: today\'s result'], 'cta': 'Start free in one tap', 'seed': dt.day * 3 + 1})
    m = y.get('mtd')
    s17 = {'kicker': 'Live account · ' + mon, 'hook': 'While you were busy,', 'big': pc(m) if m is not None else '%d trades' % f['trades'],
           'bigTone': 'up' if (m or 0) >= 0 else 'down', 'bigLabel': mon + ' so far on FTM',
           'title': 'Every trade shown. <b>%d profit days, %d loss days.</b>' % (f['green'], f['red']),
           'chips': ['%d trades' % f['trades'], '5 markets', '24/7'], 'cta': 'Start free in one tap', 'seed': dt.day * 3 + 2}
    o = datetime.date.fromisoformat(d).toordinal() * 3
    br = []
    for k in range(3):
        b = dict(BRAND[(o + k) % len(BRAND)]); b['seed'] = dt.day * 5 + 3 + k; br.append(b)
    od = datetime.date.fromisoformat(d).toordinal()
    my, fa = pick(MYTHS, od)
    myth = {'kicker': 'Myth vs fact', 'hook': 'Heard this <b>before?</b>', 'myth': my, 'fact': fa, 'theme': 'night', 'cta': 'See the facts free', 'seed': dt.day * 5 + 11}
    ph, pt = pick(POVS, od)
    pov = {'kicker': 'POV', 'hook': ph, 'title': pt, 'theme': 'navy', 'cta': 'Start free in one tap', 'seed': dt.day * 5 + 13}
    quiz = {'kicker': 'Quick question', 'hook': 'Today on FTM: <b>profit day or loss day?</b>', 'opts': ['Profit day', 'Loss day'],
            'title': 'Reply with A or B. <b>The answer: tomorrow at 6 p.m.</b>', 'theme': 'gold', 'cta': 'Follow for the answer', 'seed': dt.day * 5 + 17}
    try:
        news = json.load(open(os.path.join(HERE, '..', 'plan', 'news.json'))).get(d)
    except Exception:
        news = None
    s17['theme'] = 'gold' if s17.get('bigTone') == 'up' else 'navy'
    first = dict(news, seed=dt.day * 5 + 19) if news else (myth if od % 2 else pov)
    mid = quiz if news or od % 2 == 0 else myth
    plan = [('0800', first), ('1030', s11), ('1300', mid), ('1530', s17), ('1800', pov if (news or od % 2) else br[0])]
    used = None
    for i, (slot, cfg) in enumerate(plan):
        if not cfg.get('sound'):
            snd = SOUNDS[(od + i * 2) % len(SOUNDS)]
            if snd == used: snd = SOUNDS[(SOUNDS.index(snd) + 1) % len(SOUNDS)]
            cfg['sound'] = snd
        used = cfg['sound']
    return plan


def night(d, j):
    dt = datetime.date.fromisoformat(d); mon = MON[dt.month - 1]; fl = j.get('floating') or {}
    if j.get('trades', 0) == 0:
        cal = j.get('cal') or []; best = max(cal, key=lambda c: c.get('pct', 0)) if cal else None
        Y = j.get('when') == 'yesterday'  # owner 22 Nov: 18:00 post = yesterday's result
        cfg = {'kicker': ('No trades yesterday · %d %s' if Y else 'No trades today · %d %s') % (dt.day, mon[:3]), 'hook': 'Not every day <b>needs a trade.</b>',
               'big': pc(j['mtd']) if j.get('mtd') is not None else '0 trades', 'bigTone': 'up' if (j.get('mtd') or 0) >= 0 else 'down',
               'bigLabel': mon + ' so far on FTM', 'title': 'FTM MACHINE waits for its setups. <b>Waiting is part of the plan.</b>'}
        if best and best.get('pct', 0) > 0:
            bd = datetime.date.fromisoformat(best['date']); cfg['chips0'] = ['Best day: %s (%d %s)' % (pc(best['pct']), bd.day, mon[:3])]
    else:
        Y = j.get('when') == 'yesterday'; L24 = j.get('when') == 'last24'
        cfg = {'kicker': 'Last 24 hours on FTM' if L24 else ('Yesterday on FTM · %d %s' if Y else 'Today on FTM · %d %s') % (dt.day, mon[:3]), 'hook': 'The last 24 hours:' if L24 else ('Yesterday\'s result:' if Y else 'Today\'s result:'), 'big': pc(j['pct']),
               'bigTone': 'up' if j['pct'] >= 0 else 'down', 'bigLabel': '%d trades · every one shown' % j['trades'],
               'title': (('Small wins add up. <b>%s so far: %s</b>' if 0 <= j['pct'] < 0.5 else '%s so far: <b>%s</b>') % (mon, pc(j['mtd']))) if j.get('mtd') is not None else ''}  # owner 23 Nov: the words fit the day
    chips = cfg.pop('chips0', [])
    if fl.get('n') and (fl.get('pct') or 0) > 0:  # owner 23 Nov: open trades only when in profit
        chips.append('Open trades: %s' % pc(fl.get('pct', 0)))  # owner 23 Nov: percentages only on social media
    chips.append('Swipe the post for every trade' if j.get('trades', 0) else 'Swipe the post for the numbers')
    chips = chips[:2]
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
