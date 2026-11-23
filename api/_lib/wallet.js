/* USDT payout wallets (owner 23 Nov 2026: every payment FTM makes, to affiliates and investors, is paid in USDT).
   One wallet per member (email), kept in the private bucket: pay/wallets.json { email: { network, address, at } }. */
const P = require('./push');
const FILE = 'pay/wallets.json';
const NETWORKS = {
  TRC20: { name: 'TRON (TRC-20)', re: /^T[1-9A-HJ-NP-Za-km-z]{33}$/ },
  ERC20: { name: 'Ethereum (ERC-20)', re: /^0x[0-9a-fA-F]{40}$/ },
  BEP20: { name: 'BNB Smart Chain (BEP-20)', re: /^0x[0-9a-fA-F]{40}$/ },
  SOL: { name: 'Solana', re: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/ },
  POLYGON: { name: 'Polygon', re: /^0x[0-9a-fA-F]{40}$/ }
};
const norm = e => String(e || '').trim().toLowerCase();
function check(network, address) {
  const n = NETWORKS[String(network || '').toUpperCase()], a = String(address || '').trim();
  if (!n) return { ok: false, error: 'NETWORK' };
  if (!n.re.test(a)) return { ok: false, error: 'ADDRESS' };
  return { ok: true, network: String(network).toUpperCase(), address: a };
}
async function get(admin, email) { const W = await P.read(admin, FILE, {}) || {}; return W[norm(email)] || null; }
async function set(admin, email, network, address) {
  const c = check(network, address); if (!c.ok) return c;
  const W = await P.read(admin, FILE, {}) || {}; W[norm(email)] = { network: c.network, address: c.address, at: new Date().toISOString() };
  await P.write(admin, FILE, W); return { ok: true, wallet: W[norm(email)] };
}
const label = w => w ? 'USDT ' + (NETWORKS[w.network] ? NETWORKS[w.network].name : w.network) + ' ' + w.address : '';
module.exports = { NETWORKS, check, get, set, label };
