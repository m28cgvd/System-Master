/*************************************************************************
 *  Apps.gs
 *    · My Apps — every web app / sheet / form link a person may open, grouped
 *      by department and section (imported from CG System Master V2), with
 *      their own login for that app (App Credentials) one tap away. Apps that
 *      now live INSIDE One Login open the section here instead.
 *    · Documents & Passwords (Vault) — the Director / MIS add logins,
 *      documents and notes and share them with people or whole roles.
 *
 *  Who sees an app: Access Rules (App) › the app row's Visible To All /
 *  Roles / Users / Departments / Designations / Locations columns.
 *  Directors and MIS (super users) see every app.
 *************************************************************************/

/** The facts access rules match on, for the caller. */
function ctxPerson_(ctx) {
  if (ctx._p) return ctx._p;
  ctx._p = accPersonOf_(ctx.uid, ctx.role, empById_(ctx.empId), ctx.home);
  return ctx._p;
}
function appVisible_(ctx, r) {
  if (!/^active$/i.test(str_(r['Status']) || 'Active')) return false;
  var res = accResolve_(ctxPerson_(ctx), 'App', str_(r['App ID']), appImplicitRules_(r));
  if (res) return res.acc !== 'No';
  return !!ctx.super;
}

/** Old stand-alone apps whose work now happens inside One Login → the section that replaces them. */
function appInside_(url) {
  var u = str_(url); if (!u) return '';
  var dep = function (x) { var m = str_(x).match(/\/s\/([^/]+)\/exec/); return m ? m[1] : ''; };
  var id = dep(u); if (!id) return '';
  if (id === dep(set_('Loan & Advance App URL', LA_APP_URL)) || LA_OLD_DEPLOYMENTS.indexOf(id) >= 0) return /page=admin/.test(u) ? 'approvals' : 'my_requests';
  if (id === dep(set_('Outlet Order App URL'))) return 'orders';
  var fixed = { 'AKfycbyjfvBxMnni9OQ_70G7sTLFktMFC2ulwy4cFPUT95HQwPlAD7zMiuH5rnCQVuVqJL10': 'hr_attendance',
    'AKfycbyEyog6fSWTbZmLTQo8NiI3yaiOH_sQrXz8dJ_l9U-u8nbQ_fW3Yg1v6ZIC8-Vct1hBcA': 'employees',
    'AKfycbz_S3Wr-A3U_q1hPKhANQuXLGV2fiD-E8Jmo1Ks8PU8iqqX4FRV5ZPbO1bDX2noa9KpeA': 'join',
    'AKfycbztBUwUlReqTAPuV1z1VZ12Vdf2Dtt0hkgpoURHemOvD9mslUotHJtuNFIqLAPETN8S': 'production' };
  if (fixed[id]) return fixed[id];
  if (checklists_().some(function (c) { return c.url && dep(c.url) === id; })) return 'checklist';
  return '';
}

function appsMine_(ctx) {
  var creds = {};
  readObjs_(SH.APPCRED).forEach(function (r) {
    if (str_(r['User ID']) !== ctx.uid) return;
    (creds[str_(r['App ID'])] = creds[str_(r['App ID'])] || []).push({ id: str_(r['Credential ID']), login: str_(r['Login ID']) });
  });
  var list = readObjs_(SH.APPS).filter(function (r) { return str_(r['App ID']) && str_(r['URL']) && appVisible_(ctx, r); })
    .map(function (r) {
      var id = str_(r['App ID']), here = appHere_(ctx, appInside_(r['URL']));
      var hide = appOldHidden_(ctx, here);
      return { id: id, name: str_(r['App Name']), company: str_(r['Company']), dept: str_(r['Department']) || 'Other',
        section: str_(r['Section']) || 'General', type: str_(r['Type']) || 'App Link', icon: str_(r['Icon']), sort: num_(r['Sort']) || 999,
        desc: str_(r['Description']), sso: !hide && yes_(r['SSO Enabled']), url: hide || yes_(r['SSO Enabled']) ? '' : str_(r['URL']),
        inside: here, oldHidden: hide, creds: hide ? [] : creds[id] || [] };
    }).sort(function (a, b) { return a.dept.localeCompare(b.dept) || a.section.localeCompare(b.section) || a.sort - b.sort || a.name.localeCompare(b.name); });
  return { apps: list, joinUrl: appUrl_() ? appUrl_() + '?page=join' : '' };
}
/**
 * An old app whose work now happens inside One Login is opened HERE only — its old link is not handed out
 * (the old Loan & Advance form and the prep sheet list every employee and let anyone apply for anyone).
 * MIS and the Directors keep the old link. Settings ▸ "Old App Links" = Yes gives it back to everyone.
 */
var OLD_LINK_HIDDEN = ['my_requests', 'approvals', 'production', 'prod_entry', 'employees', 'join', 'hr_attendance', 'checklist'];
/** The section of One Login this person opens instead of the old app ('' = none he can open). */
function appHere_(ctx, inside) {
  if (!inside) return '';
  if (inside === 'join') return inside;
  if (inside === 'production' && !can_(ctx, 'production') && can_(ctx, 'prod_entry')) return 'prod_entry';   // the prep sheet's doers
  return can_(ctx, inside) ? inside : '';
}
function appOldHidden_(ctx, inside) {
  return !!inside && !ctx.super && OLD_LINK_HIDDEN.indexOf(inside) >= 0 && !setYes_('Old App Links');
}

function appsOpen_(ctx, d) {
  var r = findObj_(SH.APPS, 'App ID', str_(d.id));
  if (!r || !appVisible_(ctx, r)) throw new Error('That app is not available to you.');
  var here = appHere_(ctx, appInside_(r['URL']));
  if (appOldHidden_(ctx, here)) throw new Error('This app now works inside One Login — open it here (Open here), signed in as yourself.');
  var url = str_(r['URL']);
  if (yes_(r['SSO Enabled'])) url += (url.indexOf('?') >= 0 ? '&' : '?') + 'cgsso=' + encodeURIComponent(ssoTicket_(ctx, str_(r['App ID'])));
  log_(ctx, 'App opened', str_(r['App Name']));
  return { url: url };
}

function appsReveal_(ctx, d) {
  var r = findObj_(SH.APPCRED, 'Credential ID', str_(d.id));
  if (!r || str_(r['User ID']) !== ctx.uid) throw new Error('Not allowed.');
  log_(ctx, 'App password viewed', str_(r['App Name']));
  return { login: str_(r['Login ID']), password: str_(r['Password']), notes: str_(r['Notes']) };
}

/* ============================ CG SYSTEM MASTER V2 → MY APPS ============================ */
var SM_TYPES = ['FMS', 'Checklist', 'PMS', 'Training Video', 'Flowchart / Docs', 'Google Sheet', 'Template', 'Google Form', 'App Link'];
/** System Master department → who sees the app here by default (only for NEW rows; MIS changes it any time). */
function smVisibility_(dept) {
  var d = norm_(dept);
  if (d === 'hr') return { 'Visible To Departments': 'HR' };
  if (d === 'accounts') return { 'Visible To Departments': 'Accounts and Finance' };
  if (/^(operation|operations|production|maintenance)$/.test(d)) return { 'Visible To Roles': 'Outlet Incharge' };
  return {};
}
/**
 * Reads the live CG System Master V2 (Settings ▸ System Master Sheet ID): the "System Master" grid
 * (Company · Department · Section · Item · one column per resource type) and the "AppData" tab, and
 * keeps the Apps tab in step — new links are added, renamed / moved links are updated. Nothing is deleted.
 */
function smImport_(ctx) {
  var ss = extSS_(set_('System Master Sheet ID', '1Ol74iL3R-8T1TliLFsF02ASLHrCMirlAVebnIWruYY8'));
  var found = [];
  ['System Master', 'Master'].forEach(function (tab) {
    if (found.length) return;
    var sh = ss.getSheetByName(tab); if (!sh || sh.getLastRow() < 3) return;
    var lr = sh.getLastRow(), lc = Math.min(sh.getLastColumn(), 20);
    var vals = sh.getRange(1, 1, lr, lc).getValues(), rich = null, hr = -1;
    for (var i = 0; i < Math.min(8, vals.length); i++) if (vals[i].map(norm_).indexOf('submoduleitem') >= 0) { hr = i; break; }
    if (hr < 0) return;
    try { rich = sh.getRange(1, 1, lr, lc).getRichTextValues(); } catch (e) { rich = null; }
    var H = vals[hr].map(str_), ci = col_(H, ['Company']), di = col_(H, ['Department']), si = col_(H, ['Section']), ii = col_(H, ['Sub-Module / Item']);
    var co = '', de = '', se = '';
    for (var r = hr + 1; r < vals.length; r++) {
      var row = vals[r];
      if (str_(row[ci])) co = str_(row[ci]);
      if (str_(row[di])) { de = str_(row[di]); se = ''; }
      if (str_(row[si])) se = str_(row[si]);
      var item = str_(row[ii]); if (!item) continue;
      SM_TYPES.forEach(function (t) {
        var c = H.indexOf(t); if (c < 0) return;
        var url = str_(row[c]);
        if (!/^https?:\/\//i.test(url) && rich) { try { url = str_(rich[r][c].getLinkUrl()); } catch (e) { url = ''; } }
        if (!/^https?:\/\//i.test(url)) return;
        found.push({ company: co, dept: de, section: se || 'General', item: item, type: t, url: url });
      });
    }
  });
  var ad = ss.getSheetByName('AppData');
  if (ad && ad.getLastRow() > 1) {
    var av = ad.getRange(1, 1, ad.getLastRow(), ad.getLastColumn()).getValues(), AH = av[0].map(str_);
    var c = { dept: col_(AH, ['Department']), name: col_(AH, ['AppName', 'App Name']), type: col_(AH, ['AppType', 'App Type']), url: col_(AH, ['URL']),
      desc: col_(AH, ['Description']), st: col_(AH, ['Status']) };
    av.slice(1).forEach(function (r) {
      var url = str_(r[c.url]);
      if (!/^https?:\/\//i.test(url) || (c.st >= 0 && !/active/i.test(str_(r[c.st])))) return;
      var extra = r.slice(AH.filter(String).length);          // AppData rows carry Section, Company after the named columns
      found.push({ company: str_(extra[1]) || '', dept: str_(r[c.dept]), section: str_(extra[0]) || 'General', item: str_(r[c.name]),
        type: str_(r[c.type]) || 'App Link', url: url, desc: c.desc >= 0 ? str_(r[c.desc]) : '' });
    });
  }
  if (!found.length) throw new Error('No links were found in the System Master (tabs "System Master" / "AppData").');
  var CO = { GV: 'GV – Govindam Ventures', CG: 'CG – Chai Govindam', GFP: 'GFP – Gauri Food Products' };
  return lock_(function () {
    var apps = readObjs_(SH.APPS), byBase = {};
    var base = function (u) {                     // the same app under another URL form is the same app
      var raw = str_(u), gid = (raw.match(/[?&#]gid=(\d+)/) || [])[1] || '';
      u = raw.split('#')[0].replace(/[?&]usp=[^&]*/g, '').replace(/\/+$/, '');
      var gas = u.match(/script\.google\.com\/.*\/s\/([A-Za-z0-9_-]{20,})\/(?:exec|dev)/);
      if (gas) return 'gas:' + gas[1] + ':' + ((u.match(/[?&]page=([^&]+)/) || [])[1] || '');
      var doc = u.match(/docs\.google\.com\/(spreadsheets|document|forms|presentation)\/d\/(?:e\/)?([A-Za-z0-9_-]{20,})/);
      if (doc) return doc[1] + ':' + doc[2] + ':' + gid;
      return u.toLowerCase();
    };
    apps.forEach(function (a) { byBase[base(a['URL'])] = a; });
    var ids = nextIds_(SH.APPS, 'App ID', 'APP-', 3, found.length + 5), add = [], upd = 0, seen = {};
    found.forEach(function (f, i) {
      var b = base(f.url); if (seen[b]) return; seen[b] = 1;
      var name = f.type === 'App Link' ? f.item : f.item + ' — ' + f.type;
      var company = CO[str_(f.company).toUpperCase()] || f.company || 'GV – Govindam Ventures';
      var row = { 'App Name': name, 'Company': company, 'Department': f.dept || 'Other', 'Section': f.section || 'General', 'Type': f.type };
      if (f.desc) row['Description'] = f.desc;
      var ex = byBase[b];
      if (ex) {
        if (/system master/i.test(str_(ex['Source'])) && (str_(ex['App Name']) !== name || str_(ex['Department']) !== row['Department'] || str_(ex['Section']) !== row['Section'])) {
          updateObj_(SH.APPS, ex._row, row); upd++;
        }
        return;
      }
      row['App ID'] = ids.shift(); row['URL'] = f.url; row['Visible To All'] = 'No'; row['SSO Enabled'] = 'No'; row['Sort'] = i + 1;
      row['Status'] = 'Active'; row['Source'] = 'CG System Master';
      var vis = smVisibility_(f.dept); Object.keys(vis).forEach(function (k) { row[k] = vis[k]; });
      add.push(row);
    });
    if (add.length) appendObjs_(SH.APPS, add);
    moveLoanAdvanceUrl_();
    bumpGen_('cfg');
    if (ctx) log_(ctx, 'System Master import', add.length + ' added, ' + upd + ' updated');
    return { message: 'System Master: ' + found.length + ' link(s) read · ' + add.length + ' added · ' + upd + ' updated. Nothing was deleted.' };
  });
}

/* ============================ VAULT ============================ */
function vaultSharedWith_(ctx, r) {
  if (!/^active$/i.test(str_(r['Status']) || 'Active')) return false;
  if (str_(r['Owner User ID']) === ctx.uid) return true;
  var users = list_(r['Shared With Users']).map(function (s) { return s.toUpperCase(); });
  var roles = list_(r['Shared With Roles']).map(norm_);
  return users.indexOf('ALL') >= 0 || roles.indexOf('all') >= 0 || users.indexOf(ctx.uid.toUpperCase()) >= 0 || roles.indexOf(norm_(ctx.role)) >= 0;
}
function vaultObj_(r, admin) {
  var o = { id: str_(r['Item ID']), type: str_(r['Type']) || 'Credential', title: str_(r['Title']), category: str_(r['Category']),
    login: str_(r['Login ID']), hasPassword: !!str_(r['Password']), url: str_(r['URL']), notes: str_(r['Notes']),
    fileId: str_(r['File ID']), fileName: str_(r['File Name']), updated: fmt_(r['Updated At'], 'dd/MM/yyyy') };
  if (admin) { o.users = list_(r['Shared With Users']); o.roles = list_(r['Shared With Roles']); o.owner = str_(r['Owner User ID']); }
  return o;
}
function vaultMine_(ctx) {
  return { items: readObjs_(SH.VAULT).filter(function (r) { return vaultSharedWith_(ctx, r); }).map(function (r) { return vaultObj_(r, false); })
    .sort(function (a, b) { return a.category.localeCompare(b.category) || a.title.localeCompare(b.title); }) };
}
function vaultReveal_(ctx, d) {
  var r = findObj_(SH.VAULT, 'Item ID', str_(d.id));
  if (!r || !(vaultSharedWith_(ctx, r) || can_(ctx, 'vault_admin'))) throw new Error('Not allowed.');
  log_(ctx, 'Vault password viewed', str_(r['Item ID']) + ' ' + str_(r['Title']));
  return { login: str_(r['Login ID']), password: str_(r['Password']) };
}
function vaultAll_(ctx) {
  var users = readObjs_(SH.LOGIN).filter(function (r) { return /^active$/i.test(str_(r['Status'])); })
    .map(function (r) { return { uid: str_(r['User ID']), name: str_(r['Full Name']) }; })
    .sort(function (a, b) { return a.name.localeCompare(b.name); });
  return { items: readObjs_(SH.VAULT).filter(function (r) { return !/deleted/i.test(str_(r['Status'])); }).map(function (r) { return vaultObj_(r, true); }),
    users: users, roles: roles_().list.map(function (r) { return r.name; }) };
}
function vaultSave_(ctx, d) {
  var title = str_(d.title);
  if (!title) throw new Error('Give it a title.');
  var type = ['Credential', 'Document', 'Note'].indexOf(d.type) >= 0 ? d.type : 'Credential';
  if (type === 'Document' && !str_(d.fileId) && !str_(d.id)) throw new Error('Attach the document.');
  var now = new Date();
  var base = { 'Type': type, 'Title': title, 'Category': str_(d.category) || 'General', 'Login ID': str_(d.login), 'URL': str_(d.url),
    'Notes': str_(d.notes), 'Shared With Users': (d.users || []).map(str_).filter(String).join(', '),
    'Shared With Roles': (d.roles || []).map(str_).filter(String).join(', '), 'Updated At': now };
  if (str_(d.password) || d.clearPassword) base['Password'] = d.clearPassword ? '' : str_(d.password);
  if (str_(d.fileId)) { base['File ID'] = str_(d.fileId); base['File URL'] = driveUrl_(d.fileId); base['File Name'] = str_(d.fileName); }
  return lock_(function () {
    if (str_(d.id)) {
      var r = findObj_(SH.VAULT, 'Item ID', str_(d.id));
      if (!r) throw new Error('Item not found.');
      updateObj_(SH.VAULT, r._row, base);
      log_(ctx, 'Vault item updated', str_(d.id));
      return { message: 'Saved.', id: str_(d.id) };
    }
    var id = nextId_(SH.VAULT, 'Item ID', (type === 'Document' ? 'DOC-' : 'VLT-'), 4);
    base['Item ID'] = id; base['Owner User ID'] = ctx.uid; base['Created At'] = now; base['Status'] = 'Active';
    if (!base.hasOwnProperty('Password')) base['Password'] = '';
    appendObj_(SH.VAULT, base);
    log_(ctx, 'Vault item added', id + ' ' + title);
    return { message: title + ' saved.', id: id };
  });
}
function vaultRemove_(ctx, d) {
  var r = findObj_(SH.VAULT, 'Item ID', str_(d.id));
  if (!r) throw new Error('Item not found.');
  updateObj_(SH.VAULT, r._row, { 'Status': 'Deleted', 'Updated At': new Date() });
  log_(ctx, 'Vault item removed', str_(d.id));
  return { message: 'Removed.' };
}
