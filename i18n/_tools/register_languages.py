"""Adds every finished language (i18n/<code>.json with >= 690 entries) to LANGS in index.html.
Usage: python3 i18n/_tools/register_languages.py"""
import json,os,re
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))
NAMES={'hi':'हिन्दी','ur':'اردو','id':'Bahasa Indonesia','ja':'日本語','mr':'मराठी','te':'తెలుగు','tr':'Türkçe','th':'ไทย','gu':'ગુજરાતી','fa':'فارسی','kn':'ಕನ್ನಡ','ml':'മലയാളം','ha':'Hausa','my':'မြန်မာဘာသာ','pa':'ਪੰਜਾਬੀ','uk':'Українська','fil':'Filipino','nl':'Nederlands','ro':'Română','yo':'Yorùbá','ig':'Igbo','am':'አማርኛ','ms':'Bahasa Melayu','ne':'नेपाली','he':'עברית','el':'Ελληνικά','cs':'Čeština','sv':'Svenska','hu':'Magyar','zu':'isiZulu','km':'ខ្មែរ','uz':'Oʻzbekcha'}
p=os.path.join(ROOT,'index.html'); s=open(p,encoding='utf-8').read()
m=re.search(r'const LANGS=(\{[^}]*\})',s); langs=json.loads(m.group(1))
added=[]
for code,name in NAMES.items():
    f=os.path.join(ROOT,'i18n',code+'.json')
    if code in langs or not os.path.exists(f): continue
    if len(json.load(open(f,encoding='utf-8')))>=690:
        langs[code]=name; added.append(code)
if added:
    s=s.replace(m.group(1),json.dumps(langs,ensure_ascii=False),1); open(p,'w',encoding='utf-8').write(s)
print('registered:',added,'| total languages:',len(langs))
