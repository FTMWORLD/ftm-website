(function(){
  var RTL={ar:1,he:1,fa:1,ur:1};
  var ALIAS={'tl':'fil','zh-hant':'zh-tw','zh-hk':'zh-tw','zh-mo':'zh-tw','zh-tw':'zh-tw','zh-hans':'zh','zh-cn':'zh','zh-sg':'zh','iw':'he','in':'id','pa-guru':'pa'};
  var ATTRS=['placeholder','aria-label','title','alt'];
  var SKIP={SCRIPT:1,STYLE:1,NOSCRIPT:1,TEXTAREA:1,CODE:1,PRE:1,SELECT:1,OPTION:1};
  var INLINE={A:1,B:1,I:1,EM:1,STRONG:1,SPAN:1,BR:1,SMALL:1,U:1};
  var NOTE='This is a translation for your convenience. If it differs from the English version, the English version applies.';
  var READ_EN='Read in English';
  var LABEL='Language';
  var dict={}, langs={"en": "English", "ar": "العربية", "fr": "Français", "es": "Español", "pt": "Português", "ru": "Русский", "it": "Italiano", "vi": "Tiếng Việt", "de": "Deutsch", "bn": "বাংলা", "sw": "Kiswahili", "ko": "한국어", "pl": "Polski", "si": "සිංහල", "zh": "简体中文", "zh-tw": "繁體中文", "mn": "Монгол", "ta": "தமிழ்", "hi": "हिन्दी", "id": "Bahasa Indonesia", "ur": "اردو", "ja": "日本語", "tr": "Türkçe", "nl": "Nederlands", "uk": "Українська", "ro": "Română", "th": "ไทย", "he": "עברית", "el": "Ελληνικά", "cs": "Čeština", "sv": "Svenska", "hu": "Magyar", "ms": "Bahasa Melayu", "fil": "Filipino", "fa": "فارسی", "mr": "मराठी", "te": "తెలుగు", "gu": "ગુજરાતી", "kn": "ಕನ್ನಡ", "ml": "മലയാളം", "pa": "ਪੰਜਾਬੀ", "ne": "नेपाली", "my": "မြန်မာဘာသာ", "km": "ខ្មែរ", "uz": "Oʻzbekcha", "ha": "Hausa", "yo": "Yorùbá", "ig": "Igbo", "am": "አማርኛ", "zu": "isiZulu"}, cur='en', origTitle=document.title, done=[];
  function norm(t){ return String(t).replace(/⁠/g,'').replace(/‑/g,'-').replace(/\s+/g,' ').trim(); }
  function tr(k){ return dict[norm(k)]||null; }
  function skipEl(el){ return !el||SKIP[el.nodeName]||(el.closest&&el.closest('svg,[data-no-i18n]')); }
  function isBlock(el){
    if(!el.children.length||SKIP[el.nodeName]||el.nodeName==='A'||el.nodeName==='BUTTON') return false;
    if(el.querySelector('[id],[class*="js-"],button,input,select,textarea,svg,img')) return false;
    var all=el.getElementsByTagName('*');
    for(var i=0;i<all.length;i++){ if(!INLINE[all[i].nodeName]) return false; }
    for(var c=el.firstChild;c;c=c.nextSibling){ if(c.nodeType===3&&/\S/.test(c.nodeValue)) return true; }
    return false;
  }
  function remember(fn){ done.push(fn); }
  function translateTree(root){
    var els=[root].concat([].slice.call(root.getElementsByTagName('*'))), handled=[];
    els.forEach(function(el){
      if(skipEl(el)) return;
      for(var h=0;h<handled.length;h++){ if(handled[h].contains(el)) return; }
      ATTRS.forEach(function(a){
        if(!el.hasAttribute(a)) return; var en=el.getAttribute(a), t=tr(en);
        if(t){ el.setAttribute(a,t); remember(function(){ el.setAttribute(a,en); }); }
      });
      if(isBlock(el)){
        var en=el.innerHTML, t=tr(en);
        if(t){ el.innerHTML=t; handled.push(el); remember(function(){ el.innerHTML=en; }); }
      }
    });
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null), n, list=[];
    while((n=w.nextNode())) list.push(n);
    list.forEach(function(tn){
      if(skipEl(tn.parentNode)||!/\S/.test(tn.nodeValue)) return;
      if(handled.some(function(h){ return h.contains(tn); })) return;
      var en=tn.nodeValue, t=tr(en); if(!t) return;
      tn.nodeValue=en.match(/^\s*/)[0]+t+en.match(/\s*$/)[0];
      remember(function(){ tn.nodeValue=en; });
    });
  }
  function restore(){ while(done.length) done.pop()(); document.title=origTitle; var b=document.getElementById('lgNote'); if(b) b.remove(); }
  function note(){
    var c=document.querySelector('.crumb'); if(!c) return;
    var d=document.createElement('p'); d.id='lgNote'; d.className='lg-note';
    d.appendChild(document.createTextNode((dict[NOTE]||NOTE)+' '));
    var a=document.createElement('a'); a.href='?lang=en'; a.textContent=dict[READ_EN]||READ_EN;
    a.addEventListener('click',function(e){ e.preventDefault(); choose('en'); });
    d.appendChild(a); c.parentNode.insertBefore(d,c.nextSibling);
  }
  function apply(code){
    restore(); cur=code;
    document.documentElement.lang=code; document.documentElement.dir=RTL[code]?'rtl':'ltr';
    var sel=document.getElementById('lgSel'); if(sel){ sel.value=code; }
    if(code==='en'){ dict={}; return Promise.resolve(); }
    return fetch('/i18n/legal/'+code+'.json').then(function(r){ return r.ok?r.json():{}; }).catch(function(){ return {}; }).then(function(d){
      if(cur!==code) return;
      dict=d; translateTree(document.body);
      var t=tr(origTitle); if(t) document.title=t;
      if(sel) sel.setAttribute('aria-label',dict[LABEL]||LABEL);
      note();
    });
  }
  function choose(code){
    try{ localStorage.setItem('ftm-lang',code); localStorage.setItem('ftm-lang-manual','1'); }catch(e){}
    try{ var u=new URL(location.href); u.searchParams.delete('lang'); history.replaceState(null,'',u.pathname+u.search+u.hash); }catch(e){}
    apply(code);
  }
  function detect(){
    var list=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'en']).map(function(x){ return String(x).toLowerCase(); });
    for(var i=0;i<list.length;i++){
      var tag=list[i], p=tag.split('-'), ks=[tag,p.slice(0,2).join('-'),p[0]];
      for(var j=0;j<ks.length;j++){ var c=ALIAS[ks[j]]||ks[j]; if(langs[c]) return c; }
    }
    return 'en';
  }
  function picker(){
    var host=document.querySelector('.top-inner'); if(!host||document.getElementById('lgSel')) return;
    var s=document.createElement('select'); s.id='lgSel'; s.className='lg-sel'; s.setAttribute('aria-label',LABEL);
    Object.keys(langs).forEach(function(c){ var o=document.createElement('option'); o.value=c; o.textContent=langs[c]; s.appendChild(o); });
    s.addEventListener('change',function(){ choose(s.value); });
    var back=host.querySelector('.back'); host.insertBefore(s,back||null);
  }
  function start(){
    picker();
    var code='en';
    try{ code=localStorage.getItem('ftm-lang-manual')==='1'?(localStorage.getItem('ftm-lang')||'en'):detect(); }catch(e){ code=detect(); }
    try{ var q=new URLSearchParams(location.search).get('lang'); if(q&&langs[q]) code=q; }catch(e){}
    apply(langs[code]?code:'en');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
