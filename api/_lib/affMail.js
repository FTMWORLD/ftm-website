/* Affiliate emails: application received (to the applicant + a note to FTM support) and approval (link + code).
   Written in English and translated into the applicant's language with the same translator as the monthly letter. */
const Tpl = require('./passwordEmail');
const { sendMail } = require('./mail');
const SUPPORT = () => process.env.SUPPORT_EMAIL || 'ftmwebnation@gmail.com';
const esc = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function words(W, lang) {
  if (!lang || lang === 'en' || !process.env.ANTHROPIC_API_KEY) return W;
  try { const L = require('./letter'); if (!L.LANG_EN[lang]) return W; return Object.assign({}, W, await L.translate(W, lang)); } catch (e) { return W; }
}
const p = t => '<p style="font-size:15px;line-height:1.6;color:#1a2246;margin:0 0 14px;">' + t + '</p>';
const box = t => '<p style="font-size:16px;line-height:1.5;color:#0b1640;margin:0 0 12px;padding:14px 16px;border:1px solid #D4AF37;border-radius:10px;background:#fbf7e8;"><b>' + t + '</b></p>';

const BTN = (href, t) => '<p style="margin:22px 0 8px;"><a href="' + esc(href) + '" style="display:inline-block;background:#E5323E;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:999px;">' + esc(t) + '</a></p>';
async function received(a, acct) {
  acct = acct || {};
  const w = await words({ subject: 'We received your FTM affiliate application', title: 'Thank you for applying', hi: 'Hello ' + a.name + ',',
    l1: 'We received your application to become an FTM affiliate. Our team reviews every application, usually within two working days.',
    l2: 'When you are approved, you get your own link and code by email, and your affiliate page opens in your FTM client area.',
    acc: 'Your free FTM account is ready. Create your password to log in: you can follow the FTM master account and see your application on your Affiliate page.',
    cta: 'Create my password', ex: 'Log in to FTM with your account to follow your application on your Affiliate page.', cta2: 'Open my affiliate page' }, a.lang);
  const site = (process.env.SITE_URL || 'https://www.ftmwealthnation.com').replace(/\/$/, '');
  const more = acct.link ? box(esc(w.acc)) + BTN(acct.link, w.cta) : acct.existing ? p(esc(w.ex)) + BTN(site + '/?open=aff', w.cta2) : '';
  await sendMail({ to: a.email, subject: w.subject, html: Tpl.shell(w.title, p(esc(w.hi)) + p(esc(w.l1)) + more + p(esc(w.l2))) });
  await sendMail({ to: SUPPORT(), subject: 'New FTM affiliate application: ' + a.name, html: Tpl.shell('New affiliate application',
    p('<b>' + esc(a.name) + '</b> (' + esc(a.email) + '), ' + esc(a.country || '') + '<br>Where they will share FTM: ' + esc(a.channel || '') + '<br>Audience: ' + esc(a.audience || '') + '<br>' + esc(a.message || '')) + p('Approve or reject it in the staff console, tab Affiliates.')) }).catch(() => {});
}

async function approved(a, link, r) {
  const w = await words({ subject: 'You are now an FTM affiliate', title: 'Welcome to the FTM affiliate programme', hi: 'Hello ' + a.name + ',',
    l1: 'Your application is approved. Share your link or your code:',
    l2: 'You earn ' + r.rate + '% of every subscription payment your customers make, for as long as they stay subscribed. Your customers get ' + r.discount + '% off their first payment with your code.',
    l3: 'Commission becomes payable ' + r.holdDays + ' days after each payment and is paid every month by bank transfer or PayPal, from ' + r.minPayout + ' EUR. Add your payout details on your affiliate page.',
    l4: 'Please never promise profits or income, always say that you are an FTM affiliate, and do not run paid ads on the FTM name.',
    link: 'Your link', code: 'Your code', cta: 'Open my affiliate page' }, a.lang);
  const body = p(esc(w.hi)) + p(esc(w.l1)) + box(esc(w.link) + ': <a href="' + esc(link) + '" style="color:#0b1640;">' + esc(link) + '</a><br>' + esc(w.code) + ': ' + esc(a.code))
    + p(esc(w.l2)) + p(esc(w.l3)) + p(esc(w.l4))
    + '<p style="margin:22px 0 8px;"><a href="' + esc(link.replace(/\/\?ref=.*/, '/?open=aff')) + '" style="display:inline-block;background:#E5323E;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:999px;">' + esc(w.cta) + '</a></p>';
  await sendMail({ to: a.email, subject: w.subject, html: Tpl.shell(w.title, body) });
}

async function master(a, link, r) {
  const w = await words({ subject: 'You are now an FTM Master affiliate', title: 'Welcome to Master affiliate', hi: 'Hello ' + a.name + ',',
    l1: 'Congratulations: you are now an FTM Master affiliate.',
    l2: 'From today you earn ' + r.rate + '% of every subscription payment of the customers you bring to FTM, the first payment and every renewal, for as long as they stay subscribed.',
    l3: 'Your link and your code stay the same. Thank you for growing FTM with us.',
    cta: 'Open my affiliate page' }, a.lang);
  const body = p(esc(w.hi)) + box(esc(w.l1)) + p(esc(w.l2)) + p(esc(w.l3))
    + '<p style="margin:22px 0 8px;"><a href="' + esc(link.replace(/\/\?ref=.*/, '/?open=aff')) + '" style="display:inline-block;background:#E5323E;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:999px;">' + esc(w.cta) + '</a></p>';
  await sendMail({ to: a.email, subject: w.subject, html: Tpl.shell(w.title, body) });
  await sendMail({ to: SUPPORT(), subject: 'New FTM Master affiliate: ' + a.name, html: Tpl.shell('New Master affiliate', p('<b>' + esc(a.name) + '</b> (' + esc(a.email) + ', code ' + esc(a.code) + ') is now a Master affiliate and earns ' + r.rate + '%. ' + (a.masterBy === 'auto' ? 'Reached ' + r.at + ' paying customers.' : 'Set in the staff console.'))) }).catch(() => {});
}

module.exports = { received, approved, master };
