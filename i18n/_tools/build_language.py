import json,re,sys,os
SITE=os.path.abspath(os.path.join(os.path.dirname(__file__),"..",".."))
keep=json.load(open(os.path.join(os.path.dirname(__file__),'source_strings.json')))+json.load(open(os.path.join(os.path.dirname(__file__),'source_strings_js.json')))
SKIP=set([13,14,15,16,21,22,23,27,28,35,57,108,339,344,352,354,364,365,366,367,368,369,370,371,522])|set(range(272,332))
need=[i for i in range(len(keep)) if i not in SKIP]
EXTRA=[i for i in need if i>=616]
def tags(s): return sorted(re.findall(r'<[^>]+>',s))
def build(lang,txt,final=False,only_extra=False):
    got={}
    for line in txt.strip().split('\n'):
        if not line.strip(): continue
        i,_,t=line.partition('|'); i=int(i); got[i]=t.strip()
    bad=[]; out={}
    for i,t in got.items():
        en=keep[i][0]
        if tags(en)!=tags(t): bad.append((i,'tag mismatch'))
        elif not t: bad.append((i,'empty'))
        else: out[en]=t
    miss=[i for i in (EXTRA if only_extra else need) if i not in got]
    path=os.path.join(SITE,'i18n',lang+'.json')
    cur=json.load(open(path)) if os.path.exists(path) else {}
    cur.update(out)
    json.dump(cur,open(path,'w'),ensure_ascii=False,indent=0,sort_keys=True)
    print(lang,'added',len(out),'| total in file',len(cur),'| missing ids:',miss[:40],'| BAD:',bad[:20])
if __name__=='__main__':
    lang=sys.argv[1]  # usage: python3 build_language.py <code> <file with 'id|translation' lines> [extras]
    build(lang,open(sys.argv[2]).read(),only_extra=len(sys.argv)>3)
