/*************************************************************************
 *  People.gs — employees kept one sheet per location, synced from the
 *  CG Employee Master, and the login / access rows created for them.
 *************************************************************************/

function empSheetNames_() {
  return db_().getSheets().map(function (s) { return s.getName(); })
    .filter(function (n) { return n.indexOf(EMP_PREFIX) === 0; });
}

function employees_() {
  if (__M.emps) return __M.emps;
  var key = 'cg_emps_' + gen_('emps');
  var hit = cacheGetJ_(key);
  if (hit) { __M.emps = hit; return hit; }
  var out = [];
  empSheetNames_().forEach(function (n) {
    readObjs_(n).forEach(function (r) {
      var id = str_(r['Employee ID']); if (!id) return;
      out.push({ id: id, name: str_(r['Full Name']), designation: str_(r['Designation']),
        desigId: str_(r['Designation ID']), department: str_(r['Department']), deptId: str_(r['Department ID']),
        outletId: str_(r['Outlet ID']), location: str_(r['Location']), phone: str_(r['Phone']),
        email: str_(r['Email']), doj: iso_(r['Date Of Joining']), status: str_(r['Status']) || 'Active',
        uid: str_(r['User ID']), sheet: n });
    });
  });
  cachePutJ_(key, out, 600);
  __M.emps = out;
  return out;
}
function empById_(id) {
  id = str_(id).toUpperCase(); if (!id) return null;
  var list = employees_();
  for (var i = 0; i < list.length; i++) if (list[i].id.toUpperCase() === id) return list[i];
  return null;
}
function empsOfOutlet_(outletId) {
  return employees_().filter(function (e) { return e.outletId === outletId && !/inactive|left/i.test(e.status); })
    .sort(function (a, b) { return a.name.localeCompare(b.name); });
}
/** Employee ID → outlet, from the per-location sheets (falls back to the master's location text). */
function empOutletMap_() {
  var m = {};
  employees_().forEach(function (e) { m[e.id.toUpperCase()] = e.outletId; });
  return m;
}

/* ============================ SYNC FROM THE MASTER ============================ */
/**
 * Reads CG EMPLOYEE MASTER (Active rows), rewrites one "Emp - <Location>" sheet per
 * location, adds missing Departments / Designations, and creates a Login + Access
 * row (password blank) for every employee that has none yet.
 */
function syncEmployees(silent) {
  return lock_(function () {
    var t = extRead_(set_('Employee Master Sheet ID'), set_('Employee Master Tab', 'CG EMPLOYEE MASTER'), { headerRow: 1 });
    var H = t.head;
    var c = {
      status: col_(H, ['Status']), loc: col_(H, ['Location']), id: col_(H, ['Employee Id', 'Employee ID', 'Emp ID']),
      name: col_(H, ['Name', 'Full Name']), desig: col_(H, ['Designation']), dept: col_(H, ['Department']),
      phone: col_(H, ['Phone No.', 'Phone', 'Mobile']), email: col_(H, ['Email Address', 'Email']),
      doj: col_(H, ['Date Of Joining', 'Joining Date', 'DOJ'])
    };
    if (c.id < 0 || c.name < 0) throw new Error('The employee master needs "Employee Id" and "Name" columns.');

    var depts = readObjs_(SH.DEPTS), desigs = readObjs_(SH.DESIGS);
    var deptBy = {}, desigBy = {};
    depts.forEach(function (d) {
      deptBy[norm_(d['Department Name'])] = d;
      list_(d['Aliases']).forEach(function (a) { if (!deptBy[norm_(a)]) deptBy[norm_(a)] = d; });
    });
    desigs.forEach(function (d) { desigBy[norm_(d['Designation'])] = d; });
    var newDepts = [], newDesigs = [];
    var nextDep = nextIds_(SH.DEPTS, 'Department ID', 'DEP-', 3, 50), nextDes = nextIds_(SH.DESIGS, 'Designation ID', 'DES-', 3, 80);

    var logins = readObjs_(SH.LOGIN), loginByEmp = {};
    logins.forEach(function (r) { var e = str_(r['Employee ID']).toUpperCase(); if (e) loginByEmp[e] = r; });

    var bySheet = {}, seen = {}, stats = { active: 0, sheets: 0, newLogins: 0, deactivated: 0, reactivated: 0, unknownLocation: [] };
    var masterStatus = {};
    var now = new Date();

    t.rows.forEach(function (r) {
      var id = str_(r[c.id]); if (!id) return;
      var st = c.status >= 0 ? str_(r[c.status]) : 'Active';
      masterStatus[id.toUpperCase()] = st;
      if (!/^active$/i.test(st)) return;
      if (seen[id.toUpperCase()]) return;
      seen[id.toUpperCase()] = 1;
      stats.active++;

      var locText = c.loc >= 0 ? str_(r[c.loc]) : '';
      var o = outletByAny_(locText);
      if (!o && locText) stats.unknownLocation.push(id + ' (' + locText + ')');
      var sheetName = o ? EMP_PREFIX + o.name : EMP_OTHER;

      var deptName = c.dept >= 0 ? str_(r[c.dept]) : '';
      var dep = deptName ? deptBy[norm_(deptName)] : null;
      if (deptName && !dep) {
        dep = { 'Department ID': nextDep.shift(), 'Department Name': deptName, 'Aliases': '', 'Status': 'Active' };
        newDepts.push(dep); deptBy[norm_(deptName)] = dep;
      }
      var desName = c.desig >= 0 ? str_(r[c.desig]) : '';
      var des = desName ? desigBy[norm_(desName)] : null;
      if (desName && !des) {
        des = { 'Designation ID': nextDes.shift(), 'Designation': desName, 'Department': dep ? dep['Department Name'] : deptName,
          'Default Role': 'Staff', 'Code Prefix': /^(bhanpuri|hq|head)/i.test(c.loc >= 0 ? str_(r[c.loc]) : '') ? 'HQ' : 'CG', 'Status': 'Active' };
        newDesigs.push(des); desigBy[norm_(desName)] = des;
      }

      var login = loginByEmp[id.toUpperCase()];
      var rowObj = {
        'Employee ID': id, 'Full Name': str_(r[c.name]), 'Designation': desName, 'Designation ID': des ? des['Designation ID'] : '',
        'Department': dep ? dep['Department Name'] : deptName, 'Department ID': dep ? dep['Department ID'] : '',
        'Outlet ID': o ? o.id : '', 'Location': locText, 'Phone': c.phone >= 0 ? str_(r[c.phone]).replace(/\.0$/, '') : '',
        'Email': c.email >= 0 ? str_(r[c.email]) : '', 'Date Of Joining': c.doj >= 0 ? (parseAny_(r[c.doj]) || '') : '',
        'Status': 'Active', 'User ID': login ? str_(login['User ID']) : '', 'Last Synced': now,
        _role: des ? str_(des['Default Role']) || 'Staff' : 'Staff', _outlet: o ? o.id : ''
      };
      (bySheet[sheetName] = bySheet[sheetName] || []).push(rowObj);
    });

    if (newDepts.length) appendObjs_(SH.DEPTS, newDepts);
    if (newDesigs.length) appendObjs_(SH.DESIGS, newDesigs);

    // Logins for everyone who has none — password left blank for MIS to fill.
    var newLogin = [], newAccess = [];
    var ids = nextIds_(SH.LOGIN, 'User ID', 'USR-', 4, stats.active + 5);
    Object.keys(bySheet).forEach(function (sn) {
      bySheet[sn].forEach(function (e) {
        if (e['User ID']) return;
        var uid = ids.shift();
        e['User ID'] = uid;
        newLogin.push({ 'User ID': uid, 'Employee ID': e['Employee ID'], 'Full Name': e['Full Name'],
          'Login ID': e['Employee ID'], 'Password': '', 'Email': e['Email'], 'Mobile': e['Phone'],
          'Status': 'Active', 'Login Count': 0, 'Remarks': 'Created by employee sync ' + fmt_(now, 'dd/MM/yyyy') });
        newAccess.push({ 'User ID': uid, 'Full Name': e['Full Name'], 'Role': e._role,
          'Outlet Access': e._outlet, 'Home Outlet': e._outlet, 'Checklist Doer Name': '' });
      });
    });
    if (newLogin.length) { appendObjs_(SH.LOGIN, newLogin); appendObjs_(SH.ACCESS, newAccess); stats.newLogins = newLogin.length; }

    // Leavers: the master keeps only Active rows; people who left sit on "Ex-Employees"
    // (their code is in its "Outlet ID" column). Anyone found there — or marked not
    // active on the master — loses their login. Manual users are never touched.
    try {
      var ex = extRead_(set_('Employee Master Sheet ID'), set_('Employee Ex Tab', 'Ex-Employees'), { headerRow: 1 });
      var xi = col_(ex.head, ['Outlet ID', 'Employee Id', 'Employee ID']), xs = col_(ex.head, ['Status']);
      if (xi >= 0) ex.rows.forEach(function (r) {
        var id = str_(r[xi]).toUpperCase();
        if (id.indexOf('-') < 0 || seen[id]) return;            // bare location codes (CG005) are not people
        masterStatus[id] = (xs >= 0 && str_(r[xs])) || 'Inactive';
        if (/^active$/i.test(masterStatus[id])) masterStatus[id] = 'Inactive';
      });
    } catch (e) {}
    readObjs_(SH.LOGIN).forEach(function (r) {
      var e = str_(r['Employee ID']).toUpperCase();
      var ms = masterStatus[e];
      if (e && ms && !/^active$/i.test(ms) && !seen[e] && /^active$/i.test(str_(r['Status']))) {
        updateObj_(SH.LOGIN, r._row, { 'Status': 'Inactive', 'Remarks': 'Deactivated by sync — ' + (ms === 'Inactive' ? 'moved to Ex-Employees' : 'master status "' + ms + '"') });
        try { endSessions_(str_(r['User ID']), ''); } catch (x) {}
        stats.deactivated++;
      } else if (e && seen[e] && /^inactive$/i.test(str_(r['Status'])) && /^deactivated by sync/i.test(str_(r['Remarks']))) {
        updateObj_(SH.LOGIN, r._row, { 'Status': 'Active', 'Remarks': 'Reactivated by sync — back on the employee master ' + fmt_(now, 'dd/MM/yyyy') });
        stats.reactivated++;
      }
    });

    // Rewrite each location sheet.
    var keep = {};
    Object.keys(bySheet).forEach(function (sn) {
      keep[sn] = 1;
      var sh = sheet_(sn);
      ensureHeader_(sh, HEAD.EMP);
      var h = heads_(sn);
      if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, h.names.length).clearContent();
      var rows = bySheet[sn].sort(function (a, b) { return a['Full Name'].localeCompare(b['Full Name']); })
        .map(function (o) { return rowFromObj_(h, o); });
      sh.getRange(2, 1, rows.length, h.names.length).setValues(rows);
      dropMemo_(sn);
      stats.sheets++;
    });
    // A location sheet with nobody left in it is emptied, not deleted.
    empSheetNames_().forEach(function (sn) {
      if (keep[sn]) return;
      var sh = sheet_(sn);
      if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
      dropMemo_(sn);
    });

    saveSetting_('Last Employee Sync', fmt_(now, 'dd/MM/yyyy HH:mm'));
    bumpGen_('emps'); bumpGen_('users'); resetMemo_();
    return stats;
  });
}

/** Daily trigger target. */
function dailyMaintenance() {
  try { syncEmployees(true); } catch (e) { Logger.log('sync failed: ' + e); }
  try { cleanupSessions_(); } catch (e) { Logger.log('session cleanup failed: ' + e); }
}

/** Removes sessions that ended more than 14 days ago — keeps the Sessions tab small. */
function cleanupSessions_() {
  var cut = Date.now() - 14 * 86400000, del = [];
  readObjs_(SH.SESSIONS).forEach(function (r) {
    var exp = parseAny_(r['Expires At']);
    var ended = str_(r['Status']) !== 'Active' || (exp && exp.getTime() < Date.now());
    var last = parseAny_(r['Last Seen']) || exp;
    if (ended && last && last.getTime() < cut) del.push(r._row);
  });
  if (del.length > 400) del = del.slice(0, 400);
  deleteRows_(SH.SESSIONS, del);
  return del.length;
}
