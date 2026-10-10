"""Lists every visible English string in the site's HTML pages that a language file cannot translate.

Mirrors the I18NE engine in index.html: text nodes, the attributes placeholder / aria-label /
title / alt, and "blocks" (an element holding text plus only inline tags, translated as one
innerHTML key). Keys with {} are patterns that match numbers and amounts.

Usage:
  python3 i18n/_tools/check_translations.py            # summary, exit 1 if anything is missing
  python3 i18n/_tools/check_translations.py --list     # every missing string, numbered
  python3 i18n/_tools/check_translations.py --lang de  # one language only
New messages built in JavaScript must be added to i18n/_tools/source_strings_js.json.
Strings that must stay English (names, codes, brands) go in i18n/_tools/keep_english.json.
"""
import json, os, re, sys, glob
from html.parser import HTMLParser

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PAGES = ['index.html']
ATTRS = ['placeholder', 'aria-label', 'title', 'alt']
SKIP = {'script', 'style', 'noscript', 'textarea', 'code', 'pre'}
INLINE = {'a', 'b', 'i', 'em', 'strong', 'span', 'br', 'small', 'u'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}

def norm(t): return re.sub(r'\s+', ' ', t).strip()

class El:
    def __init__(self, tag, attrs, parent):
        self.tag, self.attrs, self.parent, self.kids = tag, dict(attrs), parent, []
    def walk(self):
        yield self
        for k in self.kids:
            if isinstance(k, El): yield from k.walk()

class Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.root = El('#root', [], None); self.cur = self.root
    def handle_starttag(self, tag, attrs):
        e = El(tag, attrs, self.cur); self.cur.kids.append(e)
        e.raw = self.get_starttag_text()
        if tag not in VOID: self.cur = e
    def handle_startendtag(self, tag, attrs):
        e = El(tag, attrs, self.cur); e.raw = self.get_starttag_text(); self.cur.kids.append(e)
    def handle_endtag(self, tag):
        n = self.cur
        while n is not self.root and n.tag != tag: n = n.parent
        if n is not self.root: self.cur = n.parent
    def handle_data(self, d):
        k = self.cur.kids
        if k and isinstance(k[-1], str): k[-1] += d
        else: k.append(d)
    def handle_entityref(self, name): self.handle_data('&%s;' % name)
    def handle_charref(self, name): self.handle_data('&#%s;' % name)

def unesc(s):
    import html; return html.unescape(s)

def inner(e):
    out = []
    for k in e.kids:
        if isinstance(k, str): out.append(k)
        else:
            out.append(k.raw)
            if k.tag not in VOID: out.append(inner(k) + '</%s>' % k.tag)
    return ''.join(out)

def skipped(e):
    n = e
    while n is not None:
        if n.tag in SKIP or n.tag in ('svg', 'head') or 'data-no-i18n' in n.attrs: return True
        n = n.parent
    return False

def is_block(e):
    kids = [k for k in e.kids if isinstance(k, El)]
    if not kids or e.tag in SKIP or e.tag in ('a', 'button'): return False
    for d in e.walk():
        if d is e: continue
        if 'id' in d.attrs or 'js-' in d.attrs.get('class', '') or d.tag in ('button', 'input', 'select', 'textarea', 'svg', 'img'): return False
        if d.tag not in INLINE: return False
    return any(isinstance(k, str) and k.strip() for k in e.kids)

def collect(path):
    t = Tree(); t.feed(open(path, encoding='utf-8').read())
    items = []  # (kind, key, fallback_texts)
    for e in t.root.walk():
        if e is t.root or skipped(e): continue
        for a in ATTRS:
            v = e.attrs.get(a)
            if v and v.strip(): items.append(('attr', norm(unesc(v)), None))
        if is_block(e):
            items.append(('block', norm(browser_html(inner(e))), [norm(unesc(k)) for k in strings_in(e)]))
            e.blocked = True
    for e in t.root.walk():
        if e is t.root or skipped(e) or under_block(e): continue
        for k in e.kids:
            if isinstance(k, str) and k.strip():
                items.append(('text', norm(unesc(k)), None))
    return items

def browser_html(h):
    # innerHTML as a browser serialises it: entities decoded except & < > and no-break space.
    import html
    out = re.split(r'(<[^>]*>)', h)
    for i in range(0, len(out), 2):
        t = html.unescape(out[i])
        out[i] = t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('\u00a0', '&nbsp;')
    return ''.join(out)

def strings_in(e):
    for k in e.kids:
        if isinstance(k, str):
            if k.strip(): yield k
        else: yield from strings_in(k)

def under_block(e):
    n = e
    while n is not None:
        if getattr(n, 'blocked', False): return True
        n = n.parent
    return False

def matcher(d):
    pats = []
    for k, v in d.items():
        if '{}' in k:
            slot = '(.+)' if 'running on' in k else r'([+\-−]?[$€]?\d[\d.,  ]*[$€%]?)'
            pats.append(re.compile('^' + re.escape(k).replace(r'\{\}', slot) + '$'))
    return lambda s: s in d or any(p.match(s) for p in pats)

def needs_words(s):
    return bool(re.search(r'[A-Za-z]{2,}', s))

def main():
    args = sys.argv[1:]
    keep = set(json.load(open(os.path.join(ROOT, 'i18n/_tools/keep_english.json'), encoding='utf-8')))
    items = []
    for p in PAGES: items += collect(os.path.join(ROOT, p))
    # Messages that scripts show (alerts, status lines): listed by hand in source_strings_js.json.
    js = json.load(open(os.path.join(ROOT, 'i18n/_tools/source_strings_js.json'), encoding='utf-8'))
    items += [('text', norm(k), None) for k, _ in js]
    langs = sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(ROOT, 'i18n/*.json')) if not os.path.basename(f).startswith('_'))
    if '--lang' in args: langs = [args[args.index('--lang') + 1]]
    missing = {}
    for code in langs:
        has = matcher(json.load(open(os.path.join(ROOT, 'i18n', code + '.json'), encoding='utf-8')))
        for kind, key, parts in items:
            if key in keep or not needs_words(key) or has(key): continue
            if kind == 'block' and all(p in keep or not needs_words(p) or has(p) for p in parts): continue
            missing.setdefault(key, set()).add(code)
    if '--json' in args:
        print(json.dumps(sorted(missing), ensure_ascii=False, indent=1)); return
    if '--list' in args:
        for i, k in enumerate(sorted(missing)): print('%d|%s' % (i, k))
    total = len(langs)
    print('%d strings missing in at least one of %d languages' % (len(missing), total), file=sys.stderr)
    for k in sorted(missing)[:15]:
        print('  [%d/%d] %s' % (len(missing[k]), total, k[:100]), file=sys.stderr)
    sys.exit(1 if missing else 0)

if __name__ == '__main__': main()
