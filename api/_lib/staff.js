/* FTM staff roles. Only a login whose email is confirmed can be staff.
   owner   : the FTM mailbox ftmwebnation@gmail.com, addresses in FTM_COMMUNITY_ADMINS, or a team member made owner.
             Owners manage the team (staff console > Team).
   staff   : any @ftmwealthnation.com login, or a team member with role staff. Every console tool.
   support : a team member with role support. Customers, problems and one-to-one fixes and emails; no group sends,
             no FTM news posts, no payments, no team.
   The team list lives in the private community bucket at staff/team.json and is changed only from the console. */
const P = require('./push');
const TEAM = 'staff/team.json';
let cache = { at: 0, members: null };
function owners() { return ('ftmwebnation@gmail.com,' + String(process.env.FTM_COMMUNITY_ADMINS || '')).toLowerCase().split(',').map(x => x.trim()).filter(Boolean); }
async function team(admin, fresh) {
  if (!fresh && cache.members && Date.now() - cache.at < 30000) return cache.members;
  const t = await P.read(admin, TEAM, { members: [] }); cache = { at: Date.now(), members: Array.isArray(t.members) ? t.members : [] }; return cache.members;
}
async function saveTeam(admin, members) { await P.write(admin, TEAM, { members }); cache = { at: Date.now(), members }; }
async function role(admin, user) {
  const e = String((user && user.email) || '').toLowerCase();
  if (!e || !(user && user.email_confirmed_at)) return null;
  if (owners().indexOf(e) !== -1) return 'owner';
  let m = null; try { m = (await team(admin)).find(x => x.email === e); } catch (err) { m = null; }
  if (m) return ['owner', 'staff', 'support'].indexOf(m.role) !== -1 ? m.role : 'support';
  if (/@ftmwealthnation\.com$/.test(e)) return 'staff';
  return null;
}
function isStaff(user) {
  const e = String((user && user.email) || '').toLowerCase();
  return !!e && !!(user && user.email_confirmed_at) && (/@ftmwealthnation\.com$/.test(e) || owners().indexOf(e) !== -1);
}
module.exports = { role, isStaff, team, saveTeam, owners, _reset: () => { cache = { at: 0, members: null }; } };
