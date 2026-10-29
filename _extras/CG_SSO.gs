/*************************************************************************
 *  CG ONE LOGIN — single sign-on snippet for your OTHER Apps Script apps
 *  (Loan & Advance, DSR, Outlet Order app, checklist apps, Attendance …)
 *
 *  NOT part of the One Login project. Paste this file into the other app's
 *  project as  CG_SSO.gs  when you move that app behind the one login.
 *
 *  1. One Login ▸ Settings & Data ▸ Tools ▸ SSO secret ▸ Copy
 *     Other app ▸ Project Settings ▸ Script Properties ▸ add
 *        CG_SSO_SECRET = <paste>
 *  2. One Login ▸ Settings & Data ▸ Apps & links ▸ open that app ▸ tick
 *     "Single sign-on". Opening it from My Apps now adds ?cgsso=<ticket>.
 *  3. In the other app's doGet(e):
 *
 *        var who = cgSsoVerify(e && e.parameter && e.parameter.cgsso);
 *        if (who) {
 *          // who = { uid, name, email, mobile, role, outlets:[OUT-001…], app }
 *          // look the person up in THIS app's own user list (by mobile / email /
 *          // name / outlet) and start this app's own session for them, e.g. put
 *          // a session token into the page template so its login screen is skipped.
 *        }
 *
 *  The ticket is signed (HMAC-SHA256), lives 5 minutes and works once.
 *************************************************************************/

function cgSsoVerify(ticket) {
  if (!ticket) return null;
  var parts = String(ticket).split('.');
  if (parts.length !== 2) return null;
  var secret = PropertiesService.getScriptProperties().getProperty('CG_SSO_SECRET');
  if (!secret) return null;
  var sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(parts[0], secret)).replace(/=+$/, '');
  if (sig !== parts[1]) return null;
  var body = parts[0] + '==='.slice((parts[0].length + 3) % 4);
  var p;
  try { p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(body)).getDataAsString()); } catch (e) { return null; }
  if (!p || !p.x || p.x < Date.now()) return null;
  var cache = CacheService.getScriptCache(), key = 'cgsso_' + parts[1].substring(0, 40);
  if (cache.get(key)) return null;               // already used
  cache.put(key, '1', 600);
  return { uid: p.u, name: p.n, email: p.e, mobile: p.m, role: p.r,
    outlets: String(p.o || '').split(',').filter(String), app: p.a };
}
