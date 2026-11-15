/* Who is FTM staff: a confirmed login on @ftmwealthnation.com, the FTM mailbox, or an address in FTM_COMMUNITY_ADMINS. */
function isStaff(user) {
  const e = String((user && user.email) || '').toLowerCase();
  const L = ('ftmwebnation@gmail.com,' + String(process.env.FTM_COMMUNITY_ADMINS || '')).toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
  return !!e && !!(user && user.email_confirmed_at) && (/@ftmwealthnation\.com$/.test(e) || L.indexOf(e) !== -1);
}
module.exports = { isStaff };
