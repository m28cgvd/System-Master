/*************************************************************************
 *  Admin.gs — only for people holding "User Management" / "Settings & Data"
 *  (MIS and the Directors by default).
 *************************************************************************/

function accessModuleCols_() {
  var m = {};
  heads_(SH.ACCESS).names.forEach(function (n) { var mod = moduleForHeader_(n); if (mod && !m[mod.key]) m[mod.key] = n; });
  return m;
}

/* ============================ USERS ============================ */
function usrList_(ctx) {
  var accBy = {};
  readObjs_(SH.ACCESS).forEach(function (r) { accBy[str_(r['User ID'])] = r; });
  var colFor = accessModuleCols_();
  var mods = modules_().map(function (m) { return { key: m.key, name: m.name, group: m.group, status: m.status }; });
  var withLogin = {};
  // logins switched off because the person left (Ex-Employees) are not listed — their records stay in the sheet
  var users = readObjs_(SH.LOGIN).filter(function (r) {
    if (!str_(r['User ID'])) return false;
    var eid = str_(r['Employee ID']);
    return !(eid && !/^active$/i.test(str_(r['Status'])) && !empById_(eid));
  }).map(function (r) {
    var uid = str_(r['User ID']), a = accBy[uid] || {}, grants = {};
    mods.forEach(function (m) { var c = colFor[m.key], v = c ? str_(a[c]) : ''; grants[m.key] = yes_(v) ? 'Yes' : no_(v) ? 'No' : ''; });
    var emp = empById_(str_(r['Employee ID']));
    if (str_(r['Employee ID'])) withLogin[str_(r['Employee ID']).toUpperCase()] = 1;
    var home = outletByAny_(a['Home Outlet']) || (emp ? outletById_(emp.outletId) : null);
    return { uid: uid, empId: str_(r['Employee ID']), name: str_(r['Full Name']), loginId: str_(r['Login ID']),
      hasPassword: !!str_(r['Password']), email: str_(r['Email']), mobile: str_(r['Mobile']), status: str_(r['Status']) || 'Active',
      lastLogin: fmt_(r['Last Login'], 'dd/MM/yyyy hh:mm a'), logins: num_(r['Login Count']), remarks: str_(r['Remarks']),
      role: str_(a['Role']) || 'Staff', outletAccess: str_(a['Outlet Access']), home: home ? home.id : '', homeName: home ? home.name : '',
      doer: str_(a['Checklist Doer Name']), designation: emp ? emp.designation : '', department: emp ? emp.department : '',
      location: home ? home.name : (emp ? emp.location : ''), homeType: home ? home.type : '', grants: grants, hasAccessRow: !!a['User ID'] };
  });
  var emps = employees_().filter(function (e) { return !withLogin[e.id.toUpperCase()]; })
    .map(function (e) { return { id: e.id, name: e.name, designation: e.designation, outletId: e.outletId, phone: e.phone, email: e.email }; });
  return { users: users, modules: mods, outlets: outlets_().map(function (o) { return { id: o.id, name: o.name, type: o.type }; }),
    roles: roles_().list.map(function (r) { return { name: r.name, title: r.title, desc: r.desc, grants: r.grants }; }),
    employees: emps, lastSync: setRaw_('Last Employee Sync'), me: ctx.uid };
}

function usrSave_(ctx, d) {
  var name = str_(d.name), loginId = str_(d.loginId), uid = str_(d.uid);
  if (!name) throw new Error('Enter the full name.');
  if (!loginId) throw new Error('Enter a login ID.');
  var role = roles_().byNorm[norm_(d.role)];
  if (!role) throw new Error('Pick a role.');
  var status = /^inactive$/i.test(str_(d.status)) ? 'Inactive' : 'Active';
  var outletAccess = d.outletAccess === 'ALL' ? 'ALL' : [].concat(d.outletAccess || []).map(str_).filter(String).join(', ');
  var clash = readObjs_(SH.LOGIN).filter(function (r) {
    return str_(r['User ID']) !== uid && str_(r['Login ID']).toLowerCase() === loginId.toLowerCase();
  });
  if (clash.length) throw new Error('Login ID "' + loginId + '" is already used by ' + str_(clash[0]['Full Name']) + '.');
  if (uid === ctx.uid) {
    if (status !== 'Active') throw new Error('You cannot deactivate your own login.');
    var keepsUsers = d.grants && d.grants.users ? d.grants.users === 'Yes' || (d.grants.users === '' && role.grants.users === 'Yes') : role.grants.users === 'Yes';
    if (!keepsUsers) throw new Error('You cannot remove your own User Management access.');
  }
  var colFor = accessModuleCols_();
  var res = lock_(function () {
    var now = new Date();
    var access = { 'Full Name': name, 'Role': role.name, 'Outlet Access': outletAccess, 'Home Outlet': str_(d.home),
      'Checklist Doer Name': str_(d.doer), 'Updated By': ctx.name, 'Updated At': now };
    Object.keys(d.grants || {}).forEach(function (k) {
      var c = colFor[k]; if (!c) return;
      var v = d.grants[k]; access[c] = v === 'Yes' ? 'Yes' : v === 'No' ? 'No' : '';
    });
    var created = false;
    if (!uid) {
      uid = nextId_(SH.LOGIN, 'User ID', 'USR-', 4);
      appendObj_(SH.LOGIN, { 'User ID': uid, 'Employee ID': str_(d.empId), 'Full Name': name, 'Login ID': loginId,
        'Password': str_(d.password), 'Email': str_(d.email), 'Mobile': str_(d.mobile), 'Status': status, 'Login Count': 0,
        'Remarks': 'Created by ' + ctx.name + ' on ' + fmt_(now, 'dd/MM/yyyy') });
      access['User ID'] = uid;
      appendObj_(SH.ACCESS, access);
      created = true;
    } else {
      var L = findObj_(SH.LOGIN, 'User ID', uid);
      if (!L) throw new Error('User not found.');
      var lp = { 'Employee ID': str_(d.empId), 'Full Name': name, 'Login ID': loginId, 'Email': str_(d.email), 'Mobile': str_(d.mobile), 'Status': status };
      if (str_(d.password)) { lp['Password'] = str_(d.password); lp['Remarks'] = 'Password set by ' + ctx.name + ' on ' + fmt_(now, 'dd/MM/yyyy HH:mm'); }
      updateObj_(SH.LOGIN, L._row, lp);
      var A = findObj_(SH.ACCESS, 'User ID', uid);
      if (A) updateObj_(SH.ACCESS, A._row, access);
      else { access['User ID'] = uid; appendObj_(SH.ACCESS, access); }
      if (status !== 'Active') endSessions_(uid, '');
    }
    bumpGen_('users');
    log_(ctx, created ? 'User created' : 'User updated', uid + ' ' + name + ' · ' + role.name);
    return { message: (created ? 'Created ' : 'Saved ') + name + ' (' + uid + ').', uid: uid, incharge: norm_(role.name) === 'outletincharge' };
  });
  if (res.incharge && setYes_('Sync Loan & Advance Admin Access')) { try { delete __M.laInc; laSyncAdminAccess_(); } catch (e) {} }
  return res;
}

function usrSessions_(ctx, d) {
  var uid = str_(d.uid), now = Date.now();
  return { sessions: readObjs_(SH.SESSIONS).filter(function (r) {
    var e = parseAny_(r['Expires At']);
    return (!uid || str_(r['User ID']) === uid) && str_(r['Status']) === 'Active' && e && e.getTime() > now;
  }).map(function (r) {
    return { sid: str_(r['Session ID']).substring(0, 8) + '…', uid: str_(r['User ID']), name: str_(r['Full Name']),
      created: fmt_(r['Created At'], 'dd/MM/yyyy hh:mm a'), expires: fmt_(r['Expires At'], 'dd/MM/yyyy hh:mm a'),
      lastSeen: fmt_(r['Last Seen'], 'dd/MM/yyyy hh:mm a'), remember: str_(r['Remember Me']), device: str_(r['Device']) };
  }).reverse().slice(0, 300) };
}
function usrEndSessions_(ctx, d) {
  var uid = str_(d.uid); if (!uid) throw new Error('Pick a user.');
  var n = endSessions_(uid, '');
  log_(ctx, 'Sessions ended', uid + ' · ' + n);
  return { message: n + ' session(s) ended — they will be asked to sign in again.' };
}
function usrBulk_(ctx, d) {
  var uids = (d.uids || []).map(str_).filter(String), st = /^inactive$/i.test(str_(d.status)) ? 'Inactive' : 'Active';
  if (!uids.length) throw new Error('Tick at least one user.');
  if (uids.indexOf(ctx.uid) >= 0 && st !== 'Active') throw new Error('You cannot deactivate yourself.');
  return lock_(function () {
    var n = 0;
    readObjs_(SH.LOGIN).forEach(function (r) {
      if (uids.indexOf(str_(r['User ID'])) < 0) return;
      updateObj_(SH.LOGIN, r._row, { 'Status': st }); n++;
      if (st !== 'Active') endSessions_(str_(r['User ID']), '');
    });
    bumpGen_('users');
    return { message: n + ' user(s) set to ' + st + '.' };
  });
}

/* ============================ SETTINGS ============================ */
function setGet_(ctx) {
  var rows = [];
  var sh = sheet_(SH.SETTINGS);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues().forEach(function (r) {
    var k = str_(r[0]); if (!k) return;
    if (k.indexOf('──') === 0) rows.push({ group: k.replace(/─/g, '').trim() });
    else rows.push({ key: k, value: r[1] instanceof Date ? fmt_(r[1], 'dd/MM/yyyy HH:mm') : str_(r[1]), notes: str_(r[2]) });
  });
  var counts = {};
  [SH.LOGIN, SH.APPS, SH.APPCRED, SH.VAULT, SH.CHECKLISTS, SH.MISMATCH, SH.RULES, SH.CHK_DOERS].forEach(function (n) { try { counts[n] = readObjs_(n).length; } catch (e) { counts[n] = 0; } });
  return { rows: rows, info: { webApp: appUrl_(), sheet: db_().getUrl(), version: APP.VERSION + ' (' + APP.BUILD + ')',
    ssoSecret: ssoSecret_(), lastSync: setRaw_('Last Employee Sync'), lastDoerSync: setRaw_('Last Checklist Doer Sync'), counts: counts,
    joinUrl: appUrl_() ? appUrl_() + '?page=join' : '',
    employees: employees_().length, noPassword: readObjs_(SH.LOGIN).filter(function (r) { return !str_(r['Password']); }).length } };
}

function setSave_(ctx, d) {
  var vals = d.values || {};
  var sh = sheet_(SH.SETTINGS), lr = sh.getLastRow();
  if (lr < 2) throw new Error('Run setup first.');
  var keys = sh.getRange(2, 1, lr - 1, 1).getValues(), n = 0, seen = {};
  keys.forEach(function (r, i) {
    var k = str_(r[0]); seen[k.toLowerCase()] = 1;
    if (k && vals.hasOwnProperty(k) && k !== 'Setup Version') { sh.getRange(i + 2, 2).setValue(str_(vals[k])); n++; }
  });
  // a setting added by a newer version (e.g. Operated Models) before setup was re-run: add its row
  SETTING_DEFAULTS_().forEach(function (dft) {
    if (vals.hasOwnProperty(dft[0]) && !seen[dft[0].toLowerCase()] && dft[0].indexOf('──') !== 0) { sh.appendRow([dft[0], str_(vals[dft[0]]), dft[2]]); n++; }
  });
  cacheDel_(['cg_settings_v1']); __M.settings = null; bumpGen_('cfg');
  var mv = vals.hasOwnProperty('Loan & Advance App URL') ? moveLoanAdvanceUrl_() : '';
  log_(ctx, 'Settings saved', n + ' value(s)');
  return { message: 'Saved ' + n + ' setting(s).' + (mv ? ' ' + mv + '.' : '') };
}

function setRun_(ctx, d) {
  var job = str_(d.job), res;
  if (job === 'sync') { res = syncEmployees(true); log_(ctx, 'Employee sync', res); return { message: 'Synced ' + res.active + ' active employees into ' + res.sheets + ' location sheets · ' + res.newLogins + ' new login(s) created' + (res.deactivated ? ' · ' + res.deactivated + ' deactivated' : '') + (res.unknownLocation.length ? ' · unknown location: ' + res.unknownLocation.slice(0, 5).join(', ') : '') + '.' }; }
  if (job === 'creds') { res = importAppCredentials_(); log_(ctx, 'Import credentials', res); return { message: res }; }
  if (job === 'apps') { res = importApps_(false); log_(ctx, 'Import apps', res); return { message: res }; }
  if (job === 'audit') { res = runAudit_(); log_(ctx, 'Audit', res); return { message: res }; }
  if (job === 'setup') { res = setupOneLogin(true); return { message: 'Setup checked every tab. ' + res.join(' · ') }; }
  if (job === 'doers') { res = chkSyncDoers_(); log_(ctx, 'Checklist doer sync', res); return { message: 'Checklist doers: ' + res.doers + ' found in ' + res.checklists + ' checklist(s), ' + res.linked + ' linked to a login.' + (res.errors.length ? ' Problems: ' + res.errors.join(' · ') : '') }; }
  if (job === 'sysmaster') { return smImport_(ctx); }
  if (job === 'lasync') { res = laSyncAdminAccess_(); markDirty_('la'); log_(ctx, 'L&A Admin Access sync', res); return { message: res }; }
  if (job === 'laclose' || job === 'laopen') { res = laFormSwitch_(job === 'laopen'); log_(ctx, 'Old Loan & Advance form', res); return { message: res }; }
  if (job === 'poster') { res = lock_(function () { return posterSeed_(); }); return { message: res || 'Poster tabs are already filled.' }; }
  if (job === 'attcfg') { res = atEnsureConfig_(); atBump_(); return { message: 'Attendance workbook checked — ' + res + ' missing Config key(s) added.' }; }
  if (job === 'cache') { bumpGen_('cfg'); bumpGen_('users'); bumpGen_('emps'); bumpGen_('att'); bumpGen_('data'); cacheDel_(['cg_settings_v1', 'ord_catalog_v1', 'ord_recent_v1', 'prep_master_v1']); return { message: 'Cache cleared — everyone gets fresh data now.' }; }
  throw new Error('Unknown job.');
}

/* ============================ APPS & LINKS ============================ */
function setApps_(ctx) {
  var creds = {};
  readObjs_(SH.APPCRED).forEach(function (r) { var a = str_(r['App ID']); creds[a] = (creds[a] || 0) + 1; });
  var meta = accMeta_(ctx);
  return { apps: readObjs_(SH.APPS).filter(function (r) { return str_(r['App ID']); }).map(function (r) {
      return { id: str_(r['App ID']), name: str_(r['App Name']), company: str_(r['Company']), dept: str_(r['Department']),
        section: str_(r['Section']), type: str_(r['Type']), url: str_(r['URL']), all: yes_(r['Visible To All']),
        roles: list_(r['Visible To Roles']), users: list_(r['Visible To Users']), depts: list_(r['Visible To Departments']),
        desigs: list_(r['Visible To Designations']), locs: list_(r['Visible To Locations']), desc: str_(r['Description']),
        sso: yes_(r['SSO Enabled']), sort: num_(r['Sort']), status: str_(r['Status']) || 'Active', source: str_(r['Source']),
        creds: creds[str_(r['App ID'])] || 0, inside: appInside_(r['URL']) };
    }), roles: roles_().list.map(function (r) { return r.name; }),
    users: readObjs_(SH.LOGIN).filter(function (r) { return /^active$/i.test(str_(r['Status'])); }).map(function (r) { return { uid: str_(r['User ID']), name: str_(r['Full Name']) }; }),
    depts: meta.who.Department.map(function (d) { return d.name; }), desigs: meta.who.Designation.map(function (d) { return d.name; }),
    locs: meta.who.Location.map(function (l) { return { id: l.id, name: l.name }; }) };
}
function setAppSave_(ctx, d) {
  var name = str_(d.name), url = str_(d.url);
  if (!name) throw new Error('Enter the app name.');
  if (url && !/^https?:\/\//i.test(url)) throw new Error('The link must start with https://');
  var j = function (a) { return (a || []).map(str_).filter(String).join(', '); };
  var row = { 'App Name': name, 'Company': str_(d.company), 'Department': str_(d.dept), 'Section': str_(d.section),
    'Type': str_(d.type) || 'App Link', 'URL': url, 'Visible To All': d.all ? 'Yes' : 'No',
    'Visible To Roles': j(d.roles), 'Visible To Users': j(d.users), 'Visible To Departments': j(d.depts),
    'Visible To Designations': j(d.desigs), 'Visible To Locations': j(d.locs), 'Description': str_(d.desc), 'SSO Enabled': d.sso ? 'Yes' : 'No',
    'Sort': num_(d.sort) || 99, 'Status': str_(d.status) || 'Active' };
  return lock_(function () {
    bumpGen_('cfg');
    if (str_(d.id)) {
      var r = findObj_(SH.APPS, 'App ID', str_(d.id)); if (!r) throw new Error('App not found.');
      updateObj_(SH.APPS, r._row, row); return { message: 'Saved ' + name + '.' };
    }
    row['App ID'] = nextId_(SH.APPS, 'App ID', 'APP-', 3); row['Source'] = 'Added by ' + ctx.name;
    appendObj_(SH.APPS, row);
    return { message: 'Added ' + name + ' (' + row['App ID'] + ').' };
  });
}
function setAppRemove_(ctx, d) {
  var r = findObj_(SH.APPS, 'App ID', str_(d.id)); if (!r) throw new Error('App not found.');
  updateObj_(SH.APPS, r._row, { 'Status': 'Inactive' });
  bumpGen_('cfg');
  return { message: 'Hidden from everyone.' };
}

/* ============================ CHECKLIST REGISTRY ============================ */
function setChecklists_(ctx) {
  return { rows: readObjs_(SH.CHECKLISTS).filter(function (r) { return str_(r['Checklist ID']); }).map(function (r) {
      return { id: str_(r['Checklist ID']), name: str_(r['Checklist Name']), ssId: str_(r['Spreadsheet ID']), tab: str_(r['Tab']) || 'Master',
        outletId: str_(r['Outlet ID']), dept: str_(r['Department']), url: str_(r['Web App URL']), assigned: list_(r['Assigned Users']),
        status: str_(r['Status']) || 'Active' };
    }), outlets: outlets_().map(function (o) { return { id: o.id, name: o.name }; }),
    users: readObjs_(SH.LOGIN).filter(function (r) { return /^active$/i.test(str_(r['Status'])); }).map(function (r) { return { uid: str_(r['User ID']), name: str_(r['Full Name']) }; }) };
}
function setChecklistSave_(ctx, d) {
  var name = str_(d.name), ssId = str_(d.ssId).replace(/^.*\/d\/([a-zA-Z0-9_-]+).*$/, '$1');
  if (!name || !ssId) throw new Error('Enter the name and the spreadsheet link / ID.');
  var row = { 'Checklist Name': name, 'Spreadsheet ID': ssId, 'Tab': str_(d.tab) || 'Master', 'Outlet ID': str_(d.outletId),
    'Department': str_(d.dept), 'Web App URL': str_(d.url), 'Assigned Users': (d.assigned || []).join(', '), 'Status': str_(d.status) || 'Active' };
  return lock_(function () {
    if (str_(d.id)) {
      var r = findObj_(SH.CHECKLISTS, 'Checklist ID', str_(d.id)); if (!r) throw new Error('Checklist not found.');
      updateObj_(SH.CHECKLISTS, r._row, row); bumpGen_('users'); return { message: 'Saved ' + name + '.' };
    }
    row['Checklist ID'] = nextId_(SH.CHECKLISTS, 'Checklist ID', 'CHK-', 3);
    appendObj_(SH.CHECKLISTS, row); bumpGen_('users');
    return { message: 'Added ' + name + '.' };
  });
}

/* ============================ OUTLETS (type · model · who runs it) ============================ */
function setOutlets_(ctx) {
  var staff = {};
  employees_().forEach(function (e) { if (!/inactive|left/i.test(e.status) && e.outletId) staff[e.outletId] = (staff[e.outletId] || 0) + 1; });
  return { models: OUTLET_MODELS.slice(), run: opModels_(),
    rows: outlets_().map(function (o) {
      return { id: o.id, name: o.name, code: o.code, short: o.short, type: o.type, model: o.model, location: o.location,
        status: o.active ? 'Active' : 'Inactive', staff: staff[o.id] || 0, run: outletRun_(o) };
    }) };
}
function setOutletSave_(ctx, d) {
  var id = str_(d.id), type = str_(d.type) || 'Outlet', model = str_(d.model).toUpperCase(), status = /inactive/i.test(str_(d.status)) ? 'Inactive' : 'Active';
  if (['Outlet', 'Head Office', 'Factory', 'Warehouse'].indexOf(type) < 0) throw new Error('Pick the type.');
  if (model && OUTLET_MODELS.indexOf(model) < 0) throw new Error('Model must be one of ' + OUTLET_MODELS.join(', ') + '.');
  if (type === 'Outlet' && !model) throw new Error('Pick the model of this outlet (' + OUTLET_MODELS.join(' / ') + ').');
  return lock_(function () {
    var r = findObj_(SH.OUTLETS, 'Outlet ID', id); if (!r) throw new Error('Outlet not found.');
    ensureHeader_(sheet_(SH.OUTLETS), HEAD[SH.OUTLETS]); dropMemo_(SH.OUTLETS);
    r = findObj_(SH.OUTLETS, 'Outlet ID', id);
    updateObj_(SH.OUTLETS, r._row, { 'Type': type, 'Model': model, 'Status': status });
    bumpGen_('cfg'); bumpGen_('users'); resetMemo_();
    var o = outletById_(id);
    log_(ctx, 'Outlet saved', id + ' · ' + type + ' · ' + (model || '-') + ' · ' + status);
    return { message: str_(r['Outlet Name']) + ' saved — ' + (outletRun_(o) ? 'run by us: attendance, penalties, salary and checklists are on.' : 'not run by us: employee records only (no attendance, penalties, salary or checklists).') };
  });
}

function setMismatches_(ctx) {
  return { rows: readObjs_(SH.MISMATCH).map(function (r) {
    return { id: str_(r['Mismatch ID']), area: str_(r['Area']), issue: str_(r['Issue']), detail: str_(r['Detail']),
      fix: str_(r['Suggested Fix']), by: str_(r['Found By']), at: fmt_(r['Found At'], 'dd/MM/yyyy'), status: str_(r['Status']) || 'Open' };
  }).reverse() };
}
