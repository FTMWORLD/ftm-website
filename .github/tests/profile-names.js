// Owner 27 Nov 2026: the risk profiles are only "Growth", "Balanced" and "Conservative". "Growth 2×" (2x, ×2, 2&times;) must never appear
// on the website, in the client area, emails, Ask here, letters or any language file. Run: node .github/tests/profile-names.js
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const BAD = /Growth\s?(2\s?×|2x\b|×\s?2|x2\b|2&times;|2&#215;|2\s?times|two times)/i;
const files = ['index.html', 'performance.html', 'terms.html', 'privacy.html', 'legal-i18n.js', 'ftm-calc.js'];
const walk = d => fs.readdirSync(path.join(R, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const d of ['api', 'i18n']) files.push(...walk(d).filter(f => /\.(js|json)$/.test(f)));
let bad = 0;
for (const f of files) {
  const p = path.join(R, f); if (!fs.existsSync(p)) continue;
  fs.readFileSync(p, 'utf8').split('\n').forEach((l, i) => { const m = l.match(BAD); if (m) { bad++; console.log('BROKEN ' + f + ':' + (i + 1) + ' "' + m[0] + '"'); } });
}
console.log(bad ? bad + ' mentions of Growth 2×' : 'OK     no "Growth 2×" anywhere (' + files.length + ' files)');
process.exit(bad ? 1 : 0);
