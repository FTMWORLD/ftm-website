// iPhones turn long numbers (balances, account numbers, codes, Client ID) into "call this number" links.
// Every page and every email must switch that off. Run: node .github/tests/no-phone-links.js
const fs = require('fs'), path = require('path'); let fails = 0; const ok = (c, m) => { console.log((c ? 'OK     ' : 'BROKEN ') + m); if (!c) fails++; };
const R = f => fs.readFileSync(path.join(__dirname, '../..', f), 'utf8');
for (const f of ['index.html', 'performance.html', 'terms.html', 'privacy.html']) ok(/<meta name="format-detection" content="telephone=no[^"]*"/.test(R(f)), f + ': numbers are not turned into phone links');
const T = require(path.join(__dirname, '../../api/_lib/passwordEmail.js')), html = T.shell('Test', '<p>Account 41234567, balance 104,250.00</p>');
ok(/format-detection" content="telephone=no/.test(html) && /x-apple-data-detectors/.test(html), 'emails: numbers are not turned into phone links');
console.log(fails ? fails + ' BROKEN' : 'NO PHONE LINKS OK'); process.exit(fails ? 1 : 0);
