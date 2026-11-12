// Owner rule (12 Nov 2026): FTM makes no promise or guarantee of results or growth, anywhere.
// Scans the public pages and the Ask here facts for promise wording. Run: node .github/tests/no-promises.js
const fs=require('fs'), path=require('path'); const R=path.join(__dirname,'../..'); let bad=[];
const BAD=[/growth is certain/i,/(profit|growth|return|results?|income) (is|are) (certain|guaranteed|assured)/i,/guaranteed (profit|growth|returns?|income|results?)/i,/\brisk[- ]free (profit|returns?|income)\b/i,/money[- ]back guarantee/i,/satisfaction guarantee/i];
for(const f of ['index.html','performance.html','terms.html','privacy.html','api/v1/chat.js']){ const t=fs.readFileSync(path.join(R,f),'utf8');
  t.split('\n').forEach((l,i)=>BAD.forEach(re=>{ if(re.test(l) && !/\b(no|not|never|without|cannot|does not)\b[^.]{0,40}(guarantee|promise|certain)/i.test(l)) bad.push(f+':'+(i+1)+' '+l.trim().slice(0,120)); })); }
bad.forEach(x=>console.log('BROKEN promise wording: '+x)); console.log(bad.length?'FAILED: '+bad.length:'NO PROMISES OK'); process.exit(bad.length?1:0);
