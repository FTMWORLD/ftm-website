// Every script the public pages load comes from our own site, or from an outside site with an exact version,
// so an outside release can never change or break FTM without us. Run: node .github/tests/scripts-pinned.js
const fs=require('fs'), path=require('path'); let fails=0;
for(const f of ['index.html','performance.html','terms.html','privacy.html']){ const p=path.join(__dirname,'../..',f); if(!fs.existsSync(p)) continue;
  const html=fs.readFileSync(p,'utf8'); for(const m of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)){ const u=m[1];
    const own=u.startsWith('/')&&!u.startsWith('//'), pinned=/@\d+\.\d+\.\d+/.test(u);
    const ok=own||pinned; console.log((ok?'OK     ':'BROKEN ')+f+': '+u); if(!ok) fails++; } }
for(const f of ['index.html','performance.html']){ const html=fs.readFileSync(path.join(__dirname,'../..',f),'utf8'), m=html.match(/<meta property="og:image" content="https:\/\/www\.ftmwealthnation\.com\/([^"]+)"/), file=m&&path.join(__dirname,'../..',m[1]);
  let ok=!!(file&&fs.existsSync(file)); if(ok){ const b=fs.readFileSync(file); ok=b.readUInt32BE(16)===1200&&b.readUInt32BE(20)===630; } ok=ok&&/twitter:card" content="summary_large_image"/.test(html);
  console.log((ok?'OK     ':'BROKEN ')+f+': link previews show the large 1200x630 FTM picture'); if(!ok) fails++; }
console.log(fails?'FAILED: '+fails:'SCRIPTS PINNED OK'); process.exit(fails?1:0);
