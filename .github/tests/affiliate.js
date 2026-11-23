// FTM affiliate programme (owner 21 Nov 2026): apply -> staff approve -> link/code -> customers -> 10% of every subscription payment
// (first and renewals, never investments, never self-referral), payable 30 days after the payment, monthly payout from 50 EUR.
// Run: node .github/tests/affiliate.js (site on :8765)
const path = require('path'), Module = require('module'); let fails = 0; const ok = (c, m) => { console.log((c ? 'OK     ' : 'BROKEN ') + m); if (!c) fails++; };
const BASE = process.argv[2] || 'http://localhost:8765';
(async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'k'; process.env.SUPABASE_URL = 'https://x.supabase.co'; delete process.env.STRIPE_SECRET_KEY; delete process.env.STRIPE_API_KEY; delete process.env.ANTHROPIC_API_KEY;
  const files = {}, mails = [];
  const engine = []; process.env.FTM_ENGINE_URL = 'https://engine.test'; process.env.FTM_WEBSITE_API_TOKEN = 't';
  const users = [{ id: 'old', email: 'has@pw.com', user_metadata: { password_set: true } }], links = [];
  const fake = { createClient: () => ({ auth: { getUser: async t => ({ data: { user: t === 'tokA' ? { id: 'a', email: 'aff@x.com' } : t === 'tokC' ? { id: 'c', email: 'cust@x.com' } : null } }),
      admin: { listUsers: async () => ({ data: { users } }), updateUserById: async (id, o) => { const u = users.find(x => x.id === id); if (u) u.user_metadata = o.user_metadata; return {}; },
        generateLink: async o => { links.push(o); let u = users.find(x => x.email === o.email); if (!u) { u = { id: 'u' + users.length, email: o.email, user_metadata: {} }; users.push(u); } return { data: { user: u, properties: { action_link: 'https://auth/link?to=' + encodeURIComponent(o.options.redirectTo) } } }; } } },
    storage: { from: () => ({ download: async p => files[p] ? { data: { text: async () => files[p] } } : { error: { message: 'nf' } }, upload: async (p, b) => { files[p] = b.toString(); return { error: null }; } }) } }) };
  const orig = Module._load; Module._load = function (r, ...a) { if (r === '@supabase/supabase-js') return fake; if (r === 'stripe') return function () { return { webhooks: { constructEvent: () => ({}) } }; }; if (/_lib\/mail$/.test(r) || r === './mail') return { sendMail: async o => { mails.push(o); return 'test'; } }; if (r === './engineClient') return { callEngine: async (pth, o) => { engine.push([pth, o]); return pth.endsWith('/investment') ? { ok: true, body: { contract: null, terms: { terms_version: '2026-11-06' } } } : { ok: true, body: { recorded: true } }; } }; return orig.call(this, r, ...a); };
  const A = require(path.join(__dirname, '../../api/_lib/affiliate.js')), H = require(path.join(__dirname, '../../api/v1/affiliate.js'));
  const call = (body, tok, method) => new Promise(res => { const r = { s: 0, setHeader() {}, status(c) { this.s = c; return this; }, json(j) { res([this.s, j]); } }; H({ method: method || 'POST', headers: tok ? { authorization: 'Bearer ' + tok } : {}, body, query: body }, r); });
  // apply
  let r = await call({ action: 'apply', name: 'Ada Lovelace', email: 'aff@x.com', country: 'Germany', channel: 'Instagram', audience: '1k-10k', agree: true });
  ok(r[0] === 200 && r[1].status === 'approved' && r[1].code === 'ADA', 'apply: approved automatically, code from the first name (' + JSON.stringify(r[1]) + ')');
  ok(mails.some(m => m.to === 'aff@x.com' && /received your FTM affiliate application/.test(m.subject)) && mails.some(m => /New FTM affiliate application/.test(m.subject)), 'apply: the applicant and FTM support get an email');
  ok(r[1].account === 'created' && users.some(u => u.email === 'aff@x.com' && u.user_metadata.full_name === 'Ada Lovelace'), 'apply: a free FTM account is created with their name (' + r[1].account + ')');
  { const m = mails.find(m => m.to === 'aff@x.com'); ok(/Create my password/.test(m.html) && /within 24 hours/.test(m.html) && !/working days/.test(m.html) && /setpw%3D1.*open%3Daff/.test(m.html), 'apply: the first email says "within 24 hours" and carries the create-password button that opens the Affiliate page'); }
  { const m = mails.filter(m => m.to === 'aff@x.com')[1]; ok(m && /^Congratulations/.test(m.subject) && /Congratulations, Ada Lovelace!/.test(m.html) && /USDT/.test(m.html) && !/PayPal|bank transfer/.test(m.html), 'approval email: Congratulations, link and code, paid in USDT'); }
  r = await call({ action: 'apply', name: 'Has Pw', email: 'has@pw.com', agree: true });
  ok(r[1].account === 'existing' && /Open my affiliate page/.test(mails.filter(m => m.to === 'has@pw.com').pop().html), 'apply with an existing FTM login: no new account, the email says log in to the Affiliate page');
  r = await call({ action: 'apply', name: 'Ada', email: 'aff@x.com', agree: true }); ok(r[1].already && r[1].status === 'approved', 'apply twice: no second application');
  r = await call({ action: 'apply', name: 'Bob', email: 'bob@x.com', agree: false }); ok(r[0] === 400 && r[1].error === 'AGREE', 'apply: the rules must be accepted');
  const admin = fake.createClient();
  r = await call({ code: 'ADA' }, null, 'GET'); ok(r[1].valid === true, 'the code is live straight after applying');
  { const rv = await A.revoke(admin, 'ADA', 'owner@ftm'); const g = await call({ code: 'ADA' }, null, 'GET');
    ok(rv.ok && g[1].valid === false && (await A.attribute(admin, 'cust@x.com', 'ADA')).ok === false, 'staff Revoke: the code stops working and brings no new customers');
    r = await call({ action: 'apply', name: 'Ada', email: 'aff@x.com', agree: true }); ok(r[1].already && r[1].status === 'revoked', 'a revoked affiliate cannot re-approve themselves by applying again');
    ok((await A.restore(admin, 'ADA')).ok && (await call({ code: 'ADA' }, null, 'GET'))[1].valid === true, 'staff Restore: the code works again'); }
  // approve (no Stripe key here: the 5% code is reported, the programme still works)
  const ap = await A.approve(admin, 'ADA');
  ok(ap.ok && ap.aff.status === 'approved' && /\/\?ref=ADA$/.test(ap.link) && ap.aff.promoError === 'NO_STRIPE_KEY', 'approve: link ' + ap.link + ', Stripe code problem reported to staff');
  { const gf = global.fetch; let n = 0; process.env.STRIPE_SECRET_KEY = 'rk_test';
    global.fetch = async (u, o) => { n++; const J = (st, b) => ({ ok: st < 300, status: st, json: async () => b });
      if (/coupons\/ftm-affiliate-5$/.test(u)) return J(404, { error: { message: 'No such coupon' } }); if (/\/coupons$/.test(u)) return J(200, { id: 'ftm-affiliate-5' });
      if (/promotion_codes\?code=/.test(u)) return J(200, { data: [] }); if (/\/promotion_codes$/.test(u)) return J(200, { id: 'promo_ada' }); return J(404, {}); };
    const rp = await A.retryPromo(admin, 'ADA'); global.fetch = gf; delete process.env.STRIPE_SECRET_KEY;
    ok(rp.ok && !rp.promoError && (await A.idx(admin)).affs.ADA.promoId === 'promo_ada' && n === 4, 'staff "Create Stripe code again" creates the 5% code once the key is allowed'); }
  r = await call({ action: 'click', code: 'ada' }); r = await call({ action: 'click', code: 'ADA' }); ok(r[1].valid === true && JSON.parse(files['aff/clicks.json']).ADA.n === 2, 'link visits are counted (any letter case)');
  r = await call({ code: 'ADA' }, null, 'GET'); ok(r[1].valid === true, 'GET ?code= says whether a code is live');
  // customers
  ok((await A.attribute(admin, 'aff@x.com', 'ADA')).ok === false, 'an affiliate is never their own customer');
  ok((await A.attribute(admin, 'cust@x.com', 'ADA')).code === 'ADA', 'a sign-up through the link belongs to the affiliate');
  await A.apply(admin, { name: 'Zed', email: 'zed@x.com', agree: true }); await A.approve(admin, 'ZED');
  ok((await A.attribute(admin, 'cust@x.com', 'ZED')).code === 'ADA', 'the first affiliate keeps the customer');
  // payments through the Stripe webhook
  const W = require(path.join(__dirname, '../../api/stripe/webhook.js'));
  const ev = (type, o) => ({ type, created: Math.floor(Date.now() / 1000), data: { object: o } });
  let x = await W._affiliatePayment(ev('checkout.session.completed', { id: 'cs_1', mode: 'subscription', payment_status: 'paid', amount_total: 49900, customer_details: { email: 'cust@x.com' } }));
  ok(x === 'invoice counts', 'a subscription checkout waits for its invoice (never counted twice)');
  x = await W._affiliatePayment(ev('invoice.paid', { id: 'in_1', amount_paid: 49900, currency: 'eur', customer_email: 'cust@x.com', billing_reason: 'subscription_create', created: Math.floor(Date.now() / 1000) - 40 * 86400 }));
  ok(x.ok && x.row.commission === 49.9 && x.row.code === 'ADA', '10% of the first payment: ' + (x.row && x.row.commission));
  x = await W._affiliatePayment(ev('invoice.paid', { id: 'in_1', amount_paid: 49900, currency: 'eur', customer_email: 'cust@x.com' })); ok(x.skipped === 'already counted', 'the same payment is never counted twice');
  x = await W._affiliatePayment(ev('invoice.paid', { id: 'in_2', amount_paid: 49900, currency: 'eur', customer_email: 'cust@x.com', billing_reason: 'subscription_cycle' })); ok(x.ok && x.row.kind === 'renewal' && x.row.commission === 49.9, 'renewals earn 10% too');
  x = await W._affiliatePayment(ev('checkout.session.completed', { id: 'cs_inv', mode: 'payment', payment_status: 'paid', amount_total: 500000, payment_link: 'plink_1NItdgAZWClTb7yxGcXgPDLP', customer_details: { email: 'cust@x.com' } })); ok(x === 'investment', 'never on investments');
  x = await W._affiliatePayment(ev('checkout.session.completed', { id: 'cs_life', mode: 'payment', payment_status: 'paid', amount_total: 474905, payment_link: 'plink_1USfs7AZWClTb7yxxDVMAKmY', customer_details: { email: 'new@x.com' }, discounts: [] }));
  ok(x.skipped === 'no affiliate', 'a customer without an affiliate earns nobody anything');
  x = await W._affiliatePayment(ev('invoice.paid', { id: 'in_3', amount_paid: 47405, currency: 'eur', customer_email: 'coded@x.com', discounts: [], discount: { promotion_code: 'promo_unknown' } }));
  ok(x.skipped === 'no affiliate', 'an unknown promotion code earns nobody anything');
  const I = JSON.parse(files['aff/index.json']); I.affs.ZED.promoId = 'promo_zed'; files['aff/index.json'] = JSON.stringify(I);
  x = await W._affiliatePayment(ev('invoice.paid', { id: 'in_4', amount_paid: 47405, currency: 'eur', customer_email: 'coded@x.com', discounts: [{ promotion_code: 'promo_zed' }] }));
  ok(x.ok && x.row.code === 'ZED' && x.row.commission === 47.41, 'a customer who typed the code at checkout belongs to that affiliate (10% of what they paid after the 5%)');
  // affiliate page
  r = await call({ action: 'me' }, 'tokA');
  const s = r[1].stats || {};
  ok(r[0] === 200 && r[1].aff.status === 'approved' && s.signups === 1 && s.paying === 1 && s.payable === 49.9 && s.pending === 49.9 && s.paid === 0 && s.clicks === 2, 'affiliate page: customers, payable after 30 days, pending before (' + JSON.stringify(s) + ')');
  ok(r[1].list.every(l => /^cu•••@x\.com$/.test(l.customer)), 'customers are shown masked');
  r = await call({ action: 'me' }, 'tokC'); ok(r[0] === 200 && r[1].aff === null, 'a member who is not an affiliate sees the application');
  r = await call({ action: 'me' }, null); ok(r[0] === 401, 'the affiliate page needs a login');
  r = await call({ action: 'payout', network: 'TRC20', address: '0x12' }, 'tokA'); ok(r[0] === 400 && r[1].error === 'ADDRESS', 'a wrong USDT address for the network is refused');
  r = await call({ action: 'payout', network: 'TRC20', address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE' }, 'tokA'); ok(r[0] === 200 && r[1].payout.method === 'usdt' && r[1].payout.network === 'TRC20', 'the USDT payout wallet is saved');
  r = await call({ action: 'wallet' }, 'tokA'); ok(r[1].wallet && r[1].wallet.address === 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE', 'the same wallet is used for every FTM payment to this member');
  r = await call({ action: 'payout', method: 'paypal', paypal: 'x@y.com' }, 'tokC'); ok(r[0] === 400, 'only affiliates save payout details');
  // staff payout
  const L1 = await A.staffList(admin), ada = L1.affiliates.find(a => a.code === 'ADA');
  ok(ada.payable === 49.9 && ada.pending === 49.9 && ada.payout && ada.payout.method === 'usdt' && ada.payout.address, 'staff see what is owed and the USDT wallet to pay it to');
  const mp = await A.markPaid(admin, 'ADA', 'owner@ftm', '0xabc123'); ok(mp.ok && mp.paid === 49.9 && mp.n === 1, 'mark paid pays everything payable');
  ok((await A.markPaid(admin, 'ADA')).error === 'NOTHING_PAYABLE', 'nothing is paid twice');
  ok(JSON.parse(files['aff/commissions.json']).list.find(x => x.id === 'in_1').tx === '0xabc123', 'the USDT transaction hash is kept with the payout');
  r = await call({ action: 'me' }, 'tokA'); ok(r[1].stats.paid === 49.9 && r[1].stats.payable === 0 && r[1].list.some(l => l.status === 'paid'), 'the affiliate sees the payout');
  // Master affiliate (owner 23 Nov 2026): 20% from the 10th paying customer, or set by staff
  let paying = new Set(JSON.parse(files['aff/commissions.json']).list.filter(r => r.code === 'ADA').map(r => r.customer)).size, last;
  for (let k = 1; paying < 10; k++) { const em = 'm' + k + '@x.com'; await A.attribute(admin, em, 'ADA');
    last = await W._affiliatePayment(ev('invoice.paid', { id: 'in_m' + k, amount_paid: 10000, currency: 'eur', customer_email: em })); paying++;
    if (paying === 9) ok(last.row.commission === 10 && !last.promoted, '9 paying customers: still 10% (' + last.row.commission + ')'); }
  ok(last.promoted && last.row.commission === 20 && last.row.rate === 20, 'the 10th paying customer makes the affiliate a Master affiliate, and that payment is already 20%');
  ok(JSON.parse(files['aff/index.json']).affs.ADA.master === true && JSON.parse(files['aff/index.json']).affs.ADA.masterBy === 'auto', 'master is saved (automatic)');
  ok(mails.some(m => m.to === 'aff@x.com' && /Master affiliate/.test(m.subject)) && mails.some(m => /New FTM Master affiliate/.test(m.subject)), 'the new Master affiliate and FTM support get an email');
  x = await W._affiliatePayment(ev('invoice.paid', { id: 'in_m_ren', amount_paid: 10000, currency: 'eur', customer_email: 'm1@x.com', billing_reason: 'subscription_cycle' }));
  ok(x.row.commission === 20, 'renewals of every customer now earn 20%');
  ok(JSON.parse(files['aff/commissions.json']).list.find(r => r.id === 'in_1').commission === 49.9, 'earlier commissions keep their 10%');
  r = await call({ action: 'me' }, 'tokA'); ok(r[1].aff.master === true && r[1].aff.rate === 20 && r[1].stats.paying >= 10, 'affiliate page says Master affiliate, 20%');
  let sm = await A.setMaster(admin, 'ZED', true, 'owner@ftm'); ok(sm.ok && sm.master, 'staff can make any affiliate a Master affiliate');
  x = await W._affiliatePayment(ev('invoice.paid', { id: 'in_z2', amount_paid: 10000, currency: 'eur', customer_email: 'coded@x.com' })); ok(x.row.code === 'ZED' && x.row.commission === 20, 'a staff-made Master affiliate earns 20% at once');
  const zl = (await A.staffList(admin)).affiliates.find(a => a.code === 'ZED'); ok(zl.master && zl.rate === 20 && /^staff/.test(zl.masterBy), 'staff list shows master, rate and who set it');
  sm = await A.setMaster(admin, 'ZED', false, 'owner@ftm'); x = await W._affiliatePayment(ev('invoice.paid', { id: 'in_z3', amount_paid: 10000, currency: 'eur', customer_email: 'coded@x.com' })); ok(x.row.commission === 10, 'staff can take master back: 10% again');
  ok((await A.setMaster(admin, 'NOPE', true)).ok === false, 'only approved affiliates can become master');
  { const I2 = JSON.parse(files['aff/index.json']); I2.affs.ADA.master = false; files['aff/index.json'] = JSON.stringify(I2);
    await A.staffList(admin); ok(JSON.parse(files['aff/index.json']).affs.ADA.master === true, 'an affiliate who already has 10 paying customers becomes master automatically (catch-up)'); }
  // invest instead of withdrawing
  x = await W._affiliatePayment(ev('invoice.paid', { id: 'in_old2', amount_paid: 30000, currency: 'eur', customer_email: 'm2@x.com', created: Math.floor(Date.now() / 1000) - 45 * 86400 }));
  r = await call({ action: 'me' }, 'tokA'); const pay0 = r[1].stats.payable;
  r = await call({ action: 'invest' }, 'tokA');
  ok(r[0] === 200 && r[1].invested === pay0 && pay0 > 0, 'Invest instead of withdrawing moves everything payable (' + pay0 + ') into the FTM investment');
  ok(engine.some(e => /investment\/contracts$/.test(e[0]) && e[1].body.amount === pay0.toFixed(2) && e[1].authEmail === 'aff@x.com'), 'the engine records it as the affiliate\'s own investment');
  r = await call({ action: 'me' }, 'tokA'); ok(r[1].stats.payable === 0 && r[1].stats.invested === pay0 && r[1].list.some(l => l.status === 'invested'), 'the affiliate page shows it as invested, nothing left to pay');
  ok(mails.some(m => m.to === 'aff@x.com' && /invested in FTM/.test(m.subject)), 'the affiliate gets an email confirming the investment');
  r = await call({ action: 'invest' }, 'tokA'); ok(r[0] === 400 && r[1].error === 'NOTHING_PAYABLE', 'nothing is invested twice');
  r = await call({ action: 'withdraw_note', amount: 120, network: 'ERC20', address: '0x' + 'a'.repeat(40) }, 'tokC'); ok(r[0] === 200 && mails.some(m => /USDT/.test(m.subject) && /0xaaaa/.test(m.html)), 'investor withdrawal: the USDT wallet is saved and FTM support is told where to pay');
  // browser
  let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
  const b = await pw.chromium.launch();
  for (const [label, vp] of [['laptop', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }], ['small phone', { width: 360, height: 740 }]]) {
    const p = await b.newPage({ viewport: vp }); const errs = []; p.on('pageerror', e => errs.push(e.message)); const posted = [];
    await p.route('**/api/v1/affiliate', rt => { const d = JSON.parse(rt.request().postData() || '{}'); posted.push(d); const J = o => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (d.action === 'me') return J({ ok: true, aff: { code: 'ADA', status: 'approved', link: 'https://www.ftmwealthnation.com/?ref=ADA', payout: null }, stats: { clicks: 12, signups: 3, paying: 2, pending: 49.9, payable: 99.8, paid: 0, currency: 'EUR' },
        list: [{ at: new Date().toISOString(), customer: 'cu•••@x.com', amount: 499, commission: 49.9, currency: 'EUR', status: 'pending', payable: new Date(Date.now() + 30 * 864e5).toISOString() }, { at: '2026-10-01T10:00:00Z', customer: 'bo•••@y.com', amount: 998, commission: 99.8, currency: 'EUR', status: 'payable', payable: '2026-10-31T10:00:00Z' }] });
      return J({ ok: true, valid: true, status: 'pending' }); });
    await p.goto(BASE + '/?ref=ada'); await p.waitForTimeout(800);
    const ref = await p.evaluate(() => ({ s: localStorage.getItem('ftm_ref'), url: location.search }));
    ok(/"c":"ADA"/.test(ref.s || '') && ref.url === '' && posted.some(d => d.action === 'click' && d.code === 'ADA'), '[' + label + '] ?ref= is remembered, counted once and removed from the address');
    const href = await p.evaluate(() => { const a = document.querySelector('a[href^="https://buy.stripe.com/fZubJ00Dx6Fm8Nsfw87wA0j"]'); a.addEventListener('click', e => e.preventDefault()); a.click(); return a.getAttribute('href'); });
    ok(/prefilled_promo_code=ADA/.test(href), '[' + label + '] the plan checkout carries the code (5% off, credited to the affiliate): ' + href);
    // public application
    await p.evaluate(() => FTM.affApply()); await p.waitForTimeout(300);
    const m = await p.evaluate(() => { const c = document.querySelector('#afModal .af-mcard').getBoundingClientRect(); return { vis: !document.getElementById('afModal').hidden, fit: c.left >= 0 && c.right <= document.documentElement.clientWidth + 1, f: !!document.querySelector('#afModal form') }; });
    ok(m.vis && m.fit && m.f, '[' + label + '] "Become an FTM affiliate" opens the application and fits the screen');
    await p.click('#afModal button[type=submit]'); ok(/Please enter your name/.test(await p.textContent('#afModal .af-err')), '[' + label + '] the form says what is missing');
    await p.fill('#afModal #afName', 'Ada'); await p.fill('#afModal #afEmail', 'a@b.com'); await p.check('#afModal #afAgree'); await p.click('#afModal button[type=submit]'); await p.waitForTimeout(300);
    ok(/being reviewed/.test(await p.textContent('#afModal')) && posted.some(d => d.action === 'apply' && d.name === 'Ada' && d.agree === true), '[' + label + '] the application is sent and confirmed');
    await p.keyboard.press('Escape');
    const pc = await p.evaluate(() => ({ cards: [...document.querySelectorAll('#partner .partner-card h3')].map(h => h.textContent), first: (document.querySelector('#partner .partner-card a') || {}).getAttribute && document.querySelector('#partner .partner-card a').getAttribute('href'), agent: /Payment agent/.test(document.body.innerHTML) }));
    ok(pc.cards.join('|') === 'FTM affiliate programme|Deriv affiliate via FTM|Introducing broker' && pc.first === '#affiliate' && !pc.agent, '[' + label + '] Partner with FTM: FTM affiliate first, then Deriv, then Introducing broker; no payment agent ' + JSON.stringify(pc));
    // client area page
    await p.evaluate(() => { const F = window.FTM; F.auth = Object.assign(F.auth || {}, { ready: () => true, getAccessToken: () => Promise.resolve('tok'), signOut: () => Promise.resolve() }); F.session = { email: 'aff@x.com', products: ['auto'], name: 'A' }; });
    await p.evaluate(() => FTM.loadLive().then(() => FTM.openArea('auto'))).catch(() => {}); await p.waitForTimeout(1500);
    await p.click('#appView .um-btn'); await p.waitForTimeout(250); await p.click('#acctA .js-aff-apply'); await p.waitForTimeout(500);
    ok(await p.evaluate(() => !document.querySelector('.app-view[data-view="aff"]').hidden), '[' + label + '] the account menu opens the affiliate page (one tap on phones)');
    await p.evaluate(() => { const n = document.querySelector('.app-nav-item[data-view="aff"]'); n.scrollIntoView(); n.click(); }); await p.waitForTimeout(700);
    const v = await p.evaluate(() => { const V = document.getElementById('affView'), W = document.documentElement.clientWidth; const over = [...V.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > W + 1 || r.left < -1); }).map(e => e.className).slice(0, 5);
      return { link: (V.querySelector('.af-copy code') || {}).textContent, kpis: [...V.querySelectorAll('.af-kpis b')].map(b => b.textContent), rows: V.querySelectorAll('.af-tbl tbody tr').length, st: [...V.querySelectorAll('.af-st')].map(s => s.textContent), pay: !!V.querySelector('.af-pay'), over }; });
    ok(v.link === 'https://www.ftmwealthnation.com/?ref=ADA' && v.kpis[0] === '12' && v.kpis[1] === '3' && v.rows === 2 && v.st.join() === 'Pending,Payable' && v.pay, '[' + label + '] affiliate page: link, code, figures, commissions, payout form');
    ok(!v.over.length, '[' + label + '] affiliate page fits the screen ' + JSON.stringify(v.over));
    const u = await p.evaluate(() => { const V = document.getElementById('affView'); return { inv: !!V.querySelector('#afInvest'), invTxt: (V.querySelector('#afInvest') || {}).textContent || '', net: [...V.querySelectorAll('#afNet option')].map(o => o.value).join(','), noBank: !/IBAN|PayPal/.test(V.textContent) }; });
    ok(u.inv && /Invest/.test(u.invTxt) && u.net === 'TRC20,ERC20,BEP20,SOL,POLYGON' && u.noBank, '[' + label + '] affiliate page: Invest in FTM button and USDT wallet (no bank or PayPal)');
    const pg = await p.evaluate(() => { const c = document.querySelector('#affView .af-prog'); return c ? c.textContent : ''; });
    ok(/2 of 10 paying customers/.test(pg) && /20%/.test(pg), '[' + label + '] progress to Master affiliate: ' + pg.slice(0, 80));
    await p.unroute('**/api/v1/affiliate'); await p.route('**/api/v1/affiliate', rt => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, aff: { code: 'ADA', status: 'approved', master: true, rate: 20, link: 'https://www.ftmwealthnation.com/?ref=ADA', payout: null }, stats: { clicks: 40, signups: 14, paying: 11, pending: 0, payable: 0, paid: 0, currency: 'EUR' }, list: [] }) }));
    await p.evaluate(() => FTM.affLoad()); await p.waitForTimeout(500);
    const mv = await p.evaluate(() => { const V = document.getElementById('affView'), W = document.documentElement.clientWidth; return { badge: !!V.querySelector('.af-mb'), pct: V.querySelector('.af-pts b').textContent, prog: !!V.querySelector('.af-prog'), txt: V.querySelector('.af-hero p').textContent, over: [...V.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > W + 1; }).length }; });
    ok(mv.badge && mv.pct === '20%' && !mv.prog && /20%/.test(mv.txt) && !mv.over, '[' + label + '] Master affiliate page: badge, 20%, no progress bar, fits the screen');
    ok(!errs.length, '[' + label + '] no script errors ' + errs.join(' | '));
    await p.close();
  }
  await b.close();
  console.log(fails ? fails + ' BROKEN' : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
