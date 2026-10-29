/*************************************************************************
 *  Setup.gs — run  setupOneLogin()  once (or the menu  CG One Login ▸ Set up).
 *  Safe to run again at any time: it only ADDS what is missing — tabs,
 *  columns, dropdowns, seed rows — and never deletes or overwrites data.
 *************************************************************************/

function onOpen() {
  SpreadsheetApp.getUi().createMenu('CG One Login')
    .addItem('① Set up / repair every tab', 'menuSetup')
    .addItem('② Sync employees from the Employee Master', 'menuSync')
    .addItem('③ Import app credentials from every app', 'menuCreds')
    .addItem('④ Run the mismatch audit', 'menuAudit')
    .addSeparator()
    .addItem('Sync checklist doers (who does which checklist)', 'menuDoers')
    .addItem('Import My Apps from CG System Master V2', 'menuSysMaster')
    .addItem('Write outlet incharges into Loan & Advance "Admin Access"', 'menuLaSync')
    .addSeparator()
    .addItem('Allow downloads (one time)', 'menuAllow')
    .addItem('Show the web app link', 'menuUrl')
    .addItem('Clear the cache (after editing tabs by hand)', 'menuCache')
    .addSeparator()
    .addItem('Fast server: show its settings', 'menuFastConfig')
    .addItem('Fast server: share the sheets with a service account', 'menuFast')
    .addToUi();
}
function menuFastConfig() {
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(fastConfigHtml_()).setWidth(600).setHeight(300), 'Fast server');
}
function menuFast() {
  var ui = SpreadsheetApp.getUi(), acct = str_(setRaw_('Fast Server Account'));
  if (!acct) {
    var r = ui.prompt('Fast server', 'Service account e-mail', ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() !== ui.Button.OK) return;
    acct = str_(r.getResponseText());
    if (!acct) { menuFastConfig(); return; }
  }
  if (!/^[^@\s]+@[^@\s]+\.iam\.gserviceaccount\.com$/i.test(acct)) { ui.alert('That is not a service account e-mail (it ends in .iam.gserviceaccount.com).'); return; }
  saveSetting_('Fast Server Account', acct);
  var res = fastShare_(acct);
  ui.showModalDialog(HtmlService.createHtmlOutput(fastSetupHtml_(acct, res)).setWidth(640).setHeight(560), 'Fast server');
}
function menuDoers() { var r = chkSyncDoers_(); SpreadsheetApp.getUi().alert('Checklist doers ✅\n\n' + r.doers + ' doers in ' + r.checklists + ' checklists, ' + r.linked + ' linked to a login.' + (r.errors.length ? '\n\n' + r.errors.join('\n') : '')); }
function menuSysMaster() { SpreadsheetApp.getUi().alert(smImport_(null).message); }
function menuLaSync() { SpreadsheetApp.getUi().alert(laSyncAdminAccess_()); }
function menuSetup() { var r = setupOneLogin(true); SpreadsheetApp.getUi().alert('Setup complete ✅\n\n' + r.join('\n') + '\n\nNext: fill the Password column on the Login tab, then Deploy ▸ New deployment ▸ Web app.'); }
function menuSync() { var s = syncEmployees(true); SpreadsheetApp.getUi().alert('Employees synced ✅\n\nActive: ' + s.active + '\nLocation sheets: ' + s.sheets + '\nNew logins (password blank): ' + s.newLogins + '\nDeactivated: ' + s.deactivated + (s.unknownLocation.length ? '\n\nUnknown locations:\n' + s.unknownLocation.join('\n') : '')); }
function authorizeOneLogin() {
  var out = [];
  UrlFetchApp.fetch('https://www.googleapis.com/discovery/v1/apis?name=drive', { muteHttpExceptions: true });
  out.push('Excel and PDF downloads, Excel uploads');
  DriveApp.getRootFolder().getName();
  out.push('Drive files');
  MailApp.getRemainingDailyQuota();
  out.push('e-mails');
  ScriptApp.getOAuthToken();
  return out;
}
function menuAllow() { SpreadsheetApp.getUi().alert('Permissions given ✅\n\n' + authorizeOneLogin().join(' · ') + '\n\nDownloads now work for everyone — no new deployment is needed.'); }
function menuCreds() { SpreadsheetApp.getUi().alert(importAppCredentials_()); }
function menuAudit() { SpreadsheetApp.getUi().alert(runAudit_()); }
function menuUrl() {
  var u = appUrl_(), m = /\/s\/([A-Za-z0-9_-]{20,})\/exec\b/.exec(str_(props_()['CG_WEBAPP_URL']));
  var api = m ? '\n\nFor the fast web copy (web ▸ config.js):\n' + 'https://script.google.com/macros/s/' + m[1] + '/exec' : '';
  SpreadsheetApp.getUi().alert(u ? 'Link to share with everyone:\n\n' + u + (/\/dev\b/.test(u) ? '\n\n(This is the test link — open the /exec link of your deployment once, then ask again.)' :
    '\n\nUse this form of the link: the plain script.google.com/macros/s/… link shows "Sorry, unable to open the file at present" on phones signed in to several Google accounts.') + api
    : 'Not deployed yet — Deploy ▸ New deployment ▸ Web app (Execute as: Me · Who has access: Anyone), then open its link once.');
}
function menuCache() { bumpGen_('cfg'); bumpGen_('users'); bumpGen_('emps'); bumpGen_('att'); bumpGen_('data'); cacheDel_(['cg_settings_v1', 'ord_catalog_v1', 'ord_recent_v1', 'prep_master_v1']); SpreadsheetApp.getUi().alert('Cache cleared ✅'); }

/* ============================ SETUP ============================ */
function setupOneLogin(quiet) {
  var log = [];
  var ss = db_();
  try { ss.setSpreadsheetTimeZone(APP.TZ); } catch (e) {}
  PropertiesService.getScriptProperties().setProperty('HUB_SHEET_ID', ss.getId());
  secret_(); ssoSecret_();

  // 1. every tab, in a sensible order
  var wasV1 = /^1\./.test(setRaw_('Setup Version'));
  var order = [SH.README, SH.SETTINGS, SH.LOGIN, SH.ACCESS, SH.RULES, SH.ROLES, SH.MODULES, SH.SESSIONS, SH.OUTLETS, SH.DEPTS, SH.DESIGS,
    SH.CHECKLISTS, SH.CHK_DOERS, SH.CHK_ASSIGN, SH.TASKS, SH.APPS, SH.APPCRED, SH.VAULT, SH.ORDER_LOG, SH.VEG_ITEMS, SH.VEG_ORDERS,
    SH.STOCK_CATS, SH.STOCK_ITEMS, SH.STOCK_REG, SH.GRN, SH.GRN_LINES, SH.FOOD_ITEMS, SH.FOOD_CLOSE, SH.EXP_CATS, SH.EXPENSES,
    SH.SHIFTS, SH.ROSTER, SH.CERTS, SH.SAL_MAP, SH.PAY_RUNS, SH.SLIP_LOG, SH.POSTER_SET, SH.POSTER_OUT, SH.POSTER_ROLES,
    SH.POSTER_BEN, SH.POSTER_SEC, SH.POSTER_LOG, SH.FMS, SH.TICKETS, SH.TICKET_LOG, SH.EMP_CHANGES, SH.ITEM_REQ, SH.HOLIDAYS, SH.LOG, SH.MISMATCH];
  var made = 0;
  order.forEach(function (n) {
    var existed = !!ss.getSheetByName(n);
    var sh = sheet_(n);
    if (HEAD[n]) ensureHeader_(sh, HEAD[n]);
    if (!existed) made++;
  });
  log.push(made + ' new tab(s)');

  // 2. modules → roles / access columns
  seedIfEmpty_(SH.MODULES, MODULE_DEFAULTS_());
  addMissingKeys_(SH.MODULES, 'Module Key', MODULE_DEFAULTS_());
  bumpGen_('cfg'); resetMemo_();
  var modNames = modules_().map(function (m) { return m.name; });
  ensureHeader_(sheet_(SH.ROLES), HEAD[SH.ROLES].concat(modNames));
  ensureHeader_(sheet_(SH.ACCESS), HEAD[SH.ACCESS].concat(modNames).concat(['Updated By', 'Updated At']));
  resetMemo_();

  // 3. seed lists
  seedSettings_();
  if (!readObjs_(SH.ROLES).length) {
    var rh = heads_(SH.ROLES);
    appendObjs_(SH.ROLES, ROLE_DEFAULTS_().map(function (r) {
      var o = { 'Role ID': r.id, 'Role Name': r.name, 'Workspace Title': r.title, 'Description': r.desc, 'Status': 'Active' };
      modules_().forEach(function (m) { o[m.name] = r.grants[m.key] || 'No'; });
      return o;
    }));
    log.push('roles seeded');
  } else {
    if (wasV1) { log.push(upgradeRolesV2_()); }
    fillRoleGaps_();
  }
  seedIfEmpty_(SH.OUTLETS, OUTLET_SEED_());
  var mo = migrateOutletsV2_(); if (mo) log.push(mo);
  var m32 = upgradeOutletsV232_(); if (m32) log.push(m32);
  seedIfEmpty_(SH.DEPTS, DEPT_SEED_());
  if (!readObjs_(SH.DESIGS).length) {
    appendObjs_(SH.DESIGS, DESIG_SEED_().map(function (r, i) {
      return { 'Designation ID': 'DES-' + pad_(i + 1, 3), 'Designation': r[0], 'Department': r[1], 'Default Role': r[2], 'Code Prefix': r[3], 'Status': 'Active' };
    }));
  } else fillCodePrefix_();
  seedIfEmpty_(SH.CHECKLISTS, CHECKLIST_SEED_());
  try { chkAddMissing_(); } catch (e) {}
  seedIfEmpty_(SH.VEG_ITEMS, VEG_SEED_());
  seedIfEmpty_(SH.STOCK_CATS, STOCK_CAT_SEED_());
  seedIfEmpty_(SH.STOCK_ITEMS, STOCK_ITEM_SEED_());
  seedIfEmpty_(SH.FOOD_ITEMS, FOOD_SEED_());
  seedIfEmpty_(SH.EXP_CATS, EXP_CAT_SEED_());
  seedIfEmpty_(SH.SHIFTS, SHIFT_SEED_());
  seedIfEmpty_(SH.FMS, FMS_SEED_());
  seedHolidays_();
  if (!readObjs_(SH.APPS).length) log.push(importApps_(true));
  else { var mv = moveLoanAdvanceUrl_(); if (mv) log.push(mv); }
  if (!readObjs_(SH.LOGIN).length) {
    appendObjs_(SH.LOGIN, [
      { 'User ID': 'USR-0001', 'Full Name': 'MIS Admin', 'Login ID': 'mis', 'Password': 'CG@mis2026', 'Email': 'mis@chaigovindam.com', 'Status': 'Active', 'Login Count': 0, 'Remarks': 'First admin — change this password.' },
      { 'User ID': 'USR-0002', 'Full Name': 'Namit Sir', 'Login ID': 'namit', 'Password': '', 'Status': 'Active', 'Login Count': 0, 'Remarks': 'Director — set the password.' },
      { 'User ID': 'USR-0003', 'Full Name': 'Vivek Sir', 'Login ID': 'vivek', 'Password': '', 'Email': 'vivek@chaigovindam.com', 'Status': 'Active', 'Login Count': 0, 'Remarks': 'Director — set the password.' }
    ]);
    appendObjs_(SH.ACCESS, [
      { 'User ID': 'USR-0001', 'Full Name': 'MIS Admin', 'Role': 'MIS Admin', 'Outlet Access': 'ALL', 'Home Outlet': 'OUT-001' },
      { 'User ID': 'USR-0002', 'Full Name': 'Namit Sir', 'Role': 'Director', 'Outlet Access': 'ALL', 'Home Outlet': 'OUT-007' },
      { 'User ID': 'USR-0003', 'Full Name': 'Vivek Sir', 'Role': 'Director', 'Outlet Access': 'ALL', 'Home Outlet': 'OUT-007' }
    ]);
    log.push('first admin login: mis / CG@mis2026');
  }
  seedMismatches_();
  writeReadme_();
  bumpGen_('cfg'); bumpGen_('users'); resetMemo_();

  // 4. dropdowns, formats, looks
  applyValidations_();
  applyFormats_();
  log.push('dropdowns applied');

  // 5. people + credentials (best effort — they need access to the other sheets)
  try { var s = syncEmployees(true); log.push(s.active + ' employees synced · ' + s.newLogins + ' logins created'); }
  catch (e) { log.push('employee sync skipped: ' + e.message); }
  try { var hu = upgradeHrV231_(); if (hu) log.push(hu); } catch (e) { log.push('HR access upgrade skipped: ' + e.message); }
  try { var ea = upgradeV270_(); if (ea) log.push(ea); } catch (e) { log.push('Executive Assistant upgrade skipped: ' + e.message); }
  try { var se = upgradeV280_(); if (se) log.push(se); } catch (e) { log.push('Store Executive upgrade skipped: ' + e.message); }
  try { log.push(importAppCredentials_()); } catch (e) { log.push('credential import skipped: ' + e.message); }
  try { var dz = chkSyncDoers_(); log.push('checklist doers: ' + dz.linked + '/' + dz.doers + ' linked'); } catch (e) { log.push('doer sync skipped: ' + e.message); }
  try { log.push(smImport_(null).message); } catch (e) { log.push('System Master import skipped: ' + e.message); }
  try { log.push(laSyncAdminAccess_()); } catch (e) { log.push('Loan & Advance Admin Access sync skipped: ' + e.message); }
  try { ensureHeader_(sheet_(SH.TASKS), HEAD[SH.TASKS]); var di = dlgImportOld_(); if (di) log.push(di); } catch (e) { log.push('delegation import skipped: ' + e.message); }
  try { var ps = posterSeed_(); if (ps) log.push(ps); } catch (e) { log.push('poster tabs skipped: ' + e.message); }
  try { if (setRaw_('Attendance Sheet ID')) { log.push('attendance workbook: ' + atEnsureConfig_() + ' config key(s) added'); log.push(atUpgradeV231_()); log.push(atUpgradeV232_()); log.push(atUpgradeV254_()); log.push(atUpgradeV292_()); } } catch (e) { log.push('attendance check skipped: ' + e.message); }
  try { log.push(runAudit_()); } catch (e) { log.push('audit skipped: ' + e.message); }

  // 6. the daily job
  try {
    var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'dailyMaintenance'; });
    if (!has) { ScriptApp.newTrigger('dailyMaintenance').timeBased().atHour(5).everyDays(1).create(); log.push('daily 5 AM sync scheduled'); }
  } catch (e) { log.push('trigger not created: ' + e.message); }

  saveSetting_('Setup Version', APP.VERSION + ' · ' + fmt_(new Date(), 'dd/MM/yyyy HH:mm'));
  try { PropertiesService.getScriptProperties().setProperty('CG_UPGRADED', APP.VERSION); } catch (e) {}
  try { ss.setActiveSheet(ss.getSheetByName(SH.README)); ss.moveActiveSheet(1); } catch (e) {}
  bumpGen_('cfg'); bumpGen_('users');
  return log;
}

function HOLIDAY_SEED_() {
  return [['2026-01-26', 'Republic Day'], ['2026-03-03', 'Holika Dahan'], ['2026-03-04', 'Holi'], ['2026-08-15', 'Independence Day'],
    ['2026-08-28', 'Raksha Bandhan'], ['2026-10-02', 'Gandhi Jayanti'], ['2026-11-08', 'Diwali (Deepavali)'], ['2026-11-09', 'Govardhan Puja'], ['2026-11-11', 'Bhai Duj']];
}
function seedHolidays_() {
  if (readObjs_(SH.HOLIDAYS).length) return false;
  var now = new Date();
  appendObjs_(SH.HOLIDAYS, HOLIDAY_SEED_().map(function (x, i) {
    var d = isoToDate_(x[0]);
    return { 'Holiday ID': 'HOL-' + pad_(i + 1, 3), 'Date': d, 'Day': fmt_(d, 'EEEE'), 'Holiday': x[1], 'Every Year': 'Yes', 'Added By': 'Holiday list 2026', 'Added At': now };
  }));
  try { var h = heads_(SH.HOLIDAYS); h.sh.getRange(2, h.idx['Date'] + 1, 9, 1).setNumberFormat('dd/mm/yyyy'); } catch (e) {}
  bumpGen_('cal');
  return true;
}
function seedIfEmpty_(name, rows) {
  if (readObjs_(name).length) return false;
  var h = heads_(name);
  var vals = rows.map(function (r) { var a = r.slice(0, h.names.length); while (a.length < h.names.length) a.push(''); return a; });
  if (!vals.length) return false;
  h.sh.getRange(2, 1, vals.length, h.names.length).setValues(vals);
  dropMemo_(name);
  return true;
}
function addMissingKeys_(name, keyCol, rows) {
  var have = {}; readObjs_(name).forEach(function (r) { have[str_(r[keyCol])] = 1; });
  var h = heads_(name);
  var add = rows.filter(function (r) { return !have[r[0]]; }).map(function (r) { var a = r.slice(0, h.names.length); while (a.length < h.names.length) a.push(''); return a; });
  if (add.length) { h.sh.getRange(h.sh.getLastRow() + 1, 1, add.length, h.names.length).setValues(add); dropMemo_(name); }
}
function seedSettings_() {
  var sh = sheet_(SH.SETTINGS), have = {};
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r) { have[str_(r[0]).toLowerCase()] = 1; });
  var add = SETTING_DEFAULTS_().filter(function (r) { return !have[r[0].toLowerCase()]; });
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, 3).setValues(add);
  // a sheet / folder ID left blank by an older version (e.g. Attendance Sheet ID) gets the known ID
  var ids = {}; SETTING_DEFAULTS_().forEach(function (r) { if (/(sheet|folder) id$/i.test(r[0]) && /^[A-Za-z0-9_-]{20,}$/.test(r[1])) ids[r[0].toLowerCase()] = r[1]; });
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r, i) {
    var id = ids[str_(r[0]).toLowerCase()];
    if (id && str_(r[1]) === '') sh.getRange(i + 2, 2).setValue(id);
  });
  var lr = sh.getLastRow();
  if (lr > 1) sh.getRange(2, 1, lr - 1, 1).getValues().forEach(function (r, i) {
    if (str_(r[0]).indexOf('──') === 0) sh.getRange(i + 2, 1, 1, 3).setBackground('#F4C97E').setFontWeight('bold');
  });
  try { sh.setColumnWidth(1, 240); sh.setColumnWidth(2, 380); sh.setColumnWidth(3, 520); } catch (e) {}
  dropMemo_(SH.SETTINGS); cacheDel_(['cg_settings_v1']); __M.settings = null;
}
/** A module added later gets its role column filled from the role defaults. */
function fillRoleGaps_() {
  var defs = {}; ROLE_DEFAULTS_().forEach(function (r) { defs[norm_(r.name)] = r.grants; });
  var mods = modules_();
  readObjs_(SH.ROLES).forEach(function (r) {
    var patch = {}, g = defs[norm_(r['Role Name'])];
    mods.forEach(function (m) { if (str_(r[m.name]) === '') patch[m.name] = g ? (g[m.key] || 'No') : (m.key === 'tickets' ? 'Yes' : 'No'); });
    if (Object.keys(patch).length) updateObj_(SH.ROLES, r._row, patch);
  });
}

/** v2.7.0 — the Executive Assistant role (the Directors' screens without their approvals) for every active EA login still on Staff. */
function upgradeV280_() {
  var log = [];
  readObjs_(SH.DESIGS).forEach(function (r) {
    if (/^store executive$/i.test(str_(r['Designation'])) && (!str_(r['Default Role']) || norm_(r['Default Role']) === 'staff')) { updateObj_(SH.DESIGS, r._row, { 'Default Role': 'Store Executive' }); log.push(str_(r['Designation']) + ' → Store Executive'); }
  });
  var emp = {}; employees_().forEach(function (e) { emp[str_(e.id).toUpperCase()] = e; });
  var login = {}; readObjs_(SH.LOGIN).forEach(function (r) { login[str_(r['User ID'])] = r; });
  readObjs_(SH.ACCESS).forEach(function (a) {
    var L = login[str_(a['User ID'])]; if (!L || !/^active$/i.test(str_(L['Status']) || 'Active')) return;
    var e = emp[str_(L['Employee ID']).toUpperCase()];
    if (!e || !/^store executive$/i.test(str_(e.designation))) return;
    if (str_(a['Role']) && norm_(a['Role']) !== 'staff') return;
    updateObj_(SH.ACCESS, a._row, { 'Role': 'Store Executive' });
    log.push(str_(a['Full Name']) + ' → Store Executive');
  });
  if (log.length) { bumpGen_('cfg'); bumpGen_('users'); resetMemo_(); }
  return log.length ? 'Store Executive: ' + log.join(' · ') : '';
}

function upgradeV270_() {
  var log = [], have = {}, mods = modules_();
  readObjs_(SH.ROLES).forEach(function (r) { have[norm_(r['Role Name'])] = 1; });
  ROLE_DEFAULTS_().forEach(function (r) {
    if (have[norm_(r.name)]) return;
    var o = { 'Role ID': r.id, 'Role Name': r.name, 'Workspace Title': r.title, 'Description': r.desc, 'Status': 'Active' };
    mods.forEach(function (m) { o[m.name] = r.grants[m.key] || 'No'; });
    appendObj_(SH.ROLES, o); log.push('role ' + r.name + ' added');
  });
  readObjs_(SH.DESIGS).forEach(function (r) {
    if (/^executive assistant/i.test(str_(r['Designation'])) && (!str_(r['Default Role']) || norm_(r['Default Role']) === 'staff')) { updateObj_(SH.DESIGS, r._row, { 'Default Role': 'Executive Assistant' }); log.push(str_(r['Designation']) + ' → Executive Assistant'); }
  });
  var emp = {}; employees_().forEach(function (e) { emp[str_(e.id).toUpperCase()] = e; });
  var login = {}; readObjs_(SH.LOGIN).forEach(function (r) { login[str_(r['User ID'])] = r; });
  readObjs_(SH.ACCESS).forEach(function (a) {
    var L = login[str_(a['User ID'])]; if (!L || !/^active$/i.test(str_(L['Status']) || 'Active')) return;
    var e = emp[str_(L['Employee ID']).toUpperCase()];
    if (!e || !/executive assistant/i.test(str_(e.designation))) return;
    if (str_(a['Role']) && norm_(a['Role']) !== 'staff') return;
    updateObj_(SH.ACCESS, a._row, { 'Role': 'Executive Assistant', 'Outlet Access': 'ALL' });
    log.push(str_(a['Full Name']) + ' → Executive Assistant');
  });
  if (log.length) { bumpGen_('cfg'); bumpGen_('users'); resetMemo_(); }
  return log.length ? 'Executive Assistant: ' + log.join(' · ') : '';
}

/**
 * v2.3.1 — the HR team gets every HR section: the HR role gets HR Dashboard, FMS Summary and Attendance rules & config;
 * HR Intern / HR Assistant Intern are HR designations; an active HR-department login with no role (or Staff) becomes HR,
 * and one with no outlet (or only the Head Office) gets every outlet — attendance, leave and penalties of all outlets.
 */
function upgradeHrV231_() {
  var log = [], mods = modules_();
  readObjs_(SH.ROLES).forEach(function (r) {
    if (norm_(r['Role Name']) !== 'hr') return;
    var patch = {};
    ['hr_dashboard', 'fms', 'att_config', 'reports'].forEach(function (k) { var m = mods.filter(function (x) { return x.key === k; })[0]; if (m && !yes_(r[m.name])) patch[m.name] = 'Yes'; });
    if (Object.keys(patch).length) { updateObj_(SH.ROLES, r._row, patch); log.push('HR role +' + Object.keys(patch).length + ' sections'); }
  });
  var have = {}; readObjs_(SH.DESIGS).forEach(function (r) { have[norm_(r['Designation'])] = 1; });
  DESIG_SEED_().forEach(function (d) {
    if (have[norm_(d[0])]) return;
    appendObj_(SH.DESIGS, { 'Designation ID': nextId_(SH.DESIGS, 'Designation ID', 'DES-', 3), 'Designation': d[0], 'Department': d[1], 'Default Role': d[2], 'Code Prefix': d[3], 'Status': 'Active' });
    log.push('designation ' + d[0]);
  });
  var acc = {}; readObjs_(SH.ACCESS).forEach(function (r) { acc[str_(r['User ID'])] = r; });
  readObjs_(SH.LOGIN).forEach(function (l) {
    if (!/^active$/i.test(str_(l['Status']))) return;
    var e = empById_(str_(l['Employee ID'])), a = acc[str_(l['User ID'])];
    if (!e || !a || norm_(e.department) !== 'hr') return;
    var patch = {}, outs = list_(a['Outlet Access']);
    if (!str_(a['Role']) || norm_(a['Role']) === 'staff') patch['Role'] = 'HR';
    if (!outs.length || outs.every(function (t) { var o = outletByAny_(t); return !o || o.type !== 'Outlet'; })) patch['Outlet Access'] = 'ALL';
    if (Object.keys(patch).length) { updateObj_(SH.ACCESS, a._row, patch); log.push(e.name + ' (' + Object.keys(patch).map(function (k) { return k + ' ' + patch[k]; }).join(', ') + ')'); }
  });
  if (log.length) { bumpGen_('users'); bumpGen_('cfg'); }
  return log.length ? 'HR access: ' + log.join(' · ') : '';
}

/**
 * The first request after a new version is deployed brings the sheets up to date by itself — the same steps as
 * CG One Login ▸ Setup for what changed since 2.3.0 (new tabs, settings, sections, HQ / GFP split, Chanderi rules),
 * so nobody has to remember to run Setup. Runs once per version (Script Properties ▸ CG_UPGRADED).
 */
function autoUpgrade_() {
  var ck = 'cg_upg_' + APP.VERSION;
  if (__M.upgChecked || cacheGetJ_(ck)) return;
  __M.upgChecked = true;
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty('CG_UPGRADED') === APP.VERSION) { cachePutJ_(ck, 1, 21600); return; }
  // claim the upgrade (a short lock only — the steps below take their own locks)
  var l = LockService.getScriptLock();
  if (!l.tryLock(5000)) return;
  try {
    var busy = Number(p.getProperty('CG_UPGRADING') || 0);
    if (p.getProperty('CG_UPGRADED') === APP.VERSION || (busy && Date.now() - busy < 5 * 60000)) return;   // done, or someone is on it
    p.setProperty('CG_UPGRADING', String(Date.now()));
  } finally { try { l.releaseLock(); } catch (e) {} }
  var log = [];
  try {
    var step = function (name, fn) { try { var r = fn(); if (r) log.push(r); } catch (e) { log.push(name + ' skipped: ' + e.message); } };
    step('tabs', function () {
      var ss = db_(), made = 0;
      [SH.FMS, SH.TICKETS, SH.TICKET_LOG, SH.EMP_CHANGES, SH.TASKS, SH.ITEM_REQ, SH.STOCK_REG, SH.HOLIDAYS, SH.ROSTER].forEach(function (n) { var had = !!ss.getSheetByName(n), sh = sheet_(n); if (HEAD[n]) ensureHeader_(sh, HEAD[n]); if (!had) made++; });
      resetMemo_(); applyDv_(SH.TASKS, 'Status', dv_(TASK_STATUSES));
      return made ? made + ' new tab(s)' : '';
    });
    step('sections', function () {
      addMissingKeys_(SH.MODULES, 'Module Key', MODULE_DEFAULTS_());
      bumpGen_('cfg'); resetMemo_();
      var modNames = modules_().map(function (m) { return m.name; });
      ensureHeader_(sheet_(SH.ROLES), HEAD[SH.ROLES].concat(modNames));
      ensureHeader_(sheet_(SH.ACCESS), HEAD[SH.ACCESS].concat(modNames).concat(['Updated By', 'Updated At']));
      resetMemo_(); fillRoleGaps_();
      return 'sections checked';
    });
    step('settings', function () { seedSettings_(); return 'settings checked'; });
    step('fms', function () { seedIfEmpty_(SH.FMS, FMS_SEED_()); return ''; });
    step('holidays', function () { return seedHolidays_() ? 'holidays added' : ''; });
    step('checklists', function () { return chkAddMissing_(); });
    step('outlets', function () { return upgradeOutletsV232_(); });
    step('hr', function () { return upgradeHrV231_(); });
    step('executive assistant', function () { return upgradeV270_(); });
    step('store executive', function () { return upgradeV280_(); });
    step('attendance', function () {
      if (!setRaw_('Attendance Sheet ID')) return '';
      var a = atEnsureConfig_(), b = atUpgradeV231_(), c = atUpgradeV232_(), e = atUpgradeV254_(), f = atUpgradeV292_();
      return 'attendance: ' + a + ' config key(s) · ' + b + ' · ' + c + ' · ' + e + ' · ' + f;
    });
    step('employees', function () { var s = syncEmployees(true); return s.active + ' employees synced'; });
    step('delegation', function () { return dlgImportOld_(); });
    step('checklist doers', function () { var z = chkSyncDoers_(); return 'checklist doers: ' + z.linked + '/' + z.doers + ' linked'; });
    step('old tabs', function () { return upgradeOutletsV232_(); });
    step('mismatches', function () { seedMismatches_(); return ''; });
    step('read me', function () { writeReadme_(); return 'Read Me refreshed'; });
    p.setProperty('CG_UPGRADED', APP.VERSION);
    saveSetting_('Setup Version', APP.VERSION + ' · auto ' + fmt_(new Date(), 'dd/MM/yyyy HH:mm'));
    bumpGen_('cfg'); bumpGen_('users'); bumpGen_('emps'); resetMemo_();
    cachePutJ_(ck, 1, 21600);
    try { log_(null, 'Auto upgrade to ' + APP.VERSION, log.join(' · ')); } catch (e) {}
  } finally { try { p.deleteProperty('CG_UPGRADING'); } catch (e) {} }
}

/** Bhanpuri is two places everywhere: HQ (Bhanpuri HQ) and GFP (Bhanpuri GFP); Chanderi is run by us (COCO). 2.3.2's "MDO" becomes HQ. */
function upgradeOutletsV232_() {
  var log = [];
  readObjs_(SH.OUTLETS).forEach(function (r) {
    var id = str_(r['Outlet ID']), nm = str_(r['Outlet Name']), patch = {};
    if (id === 'OUT-007' && /^(bhanpuri\s*\(?hq\)?|mdo)$/i.test(nm)) patch['Outlet Name'] = 'HQ';
    if (id === 'OUT-008' && /^bhanpuri\s*\(?gfp\)?$/i.test(nm)) patch['Outlet Name'] = 'GFP';
    if (id === 'OUT-006' && /^foco$/i.test(str_(r['Model']))) patch['Model'] = 'COCO';
    if (patch['Outlet Name']) {
      var al = list_(r['Aliases']), want = [patch['Outlet Name'], nm].concat(id === 'OUT-007' ? ['Bhanpuri', 'Bhanpuri HQ', 'Bhanpuri (HQ)', 'MDO', '000 MDO'] : ['Bhanpuri GFP', 'Bhanpuri (GFP)']);
      want.forEach(function (a) { if (al.map(norm_).indexOf(norm_(a)) < 0) al.push(a); });
      patch['Aliases'] = al.join(', ');
    }
    if (Object.keys(patch).length) { updateObj_(SH.OUTLETS, r._row, patch); log.push(nm + ' → ' + Object.keys(patch).map(function (k) { return k === 'Aliases' ? '' : k + ' ' + patch[k]; }).filter(String).join(', ')); }
  });
  // the empty employee tab left behind by the old name
  try { ['Emp - MDO', 'Emp - Bhanpuri (HQ)', 'Emp - Bhanpuri (GFP)'].forEach(function (n) { var sh = db_().getSheetByName(EMP_PREFIX + n.replace(/^Emp - /, '')); if (sh && sh.getLastRow() < 2) { db_().deleteSheet(sh); log.push('empty tab ' + n + ' removed'); } }); } catch (e) {}
  if (log.length) { bumpGen_('cfg'); bumpGen_('users'); __M.outlets = null; delete __M.rows[SH.OUTLETS]; }
  return log.length ? 'Outlets: ' + log.join(' · ') : '';
}

/** v1 → v2: the six built-in roles get the v2 sections (My Profile, requests, approvals, HR …). Custom roles are untouched. */
function upgradeRolesV2_() {
  var defs = {}; ROLE_DEFAULTS_().forEach(function (r) { defs[norm_(r.name)] = r.grants; });
  var mods = modules_(), n = 0;
  readObjs_(SH.ROLES).forEach(function (r) {
    var g = defs[norm_(r['Role Name'])]; if (!g) return;
    var patch = {};
    mods.forEach(function (m) { if (g[m.key] !== undefined) patch[m.name] = g[m.key]; });
    updateObj_(SH.ROLES, r._row, patch); n++;
  });
  return n + ' built-in role(s) upgraded to v2 sections';
}
/** Bhanpuri HQ and GFP are Head Office, never outlets; Chanderi's other spellings. */
function migrateOutletsV2_() {
  var n = 0, models = 0, seed = {};
  OUTLET_SEED_().forEach(function (r) { seed[r[0]] = r; });
  readObjs_(SH.OUTLETS).forEach(function (r) {
    var id = str_(r['Outlet ID']), s0 = seed[id], patch = {};
    if (!s0) return;
    if (s0[4] === 'Head Office' && str_(r['Type']) !== 'Head Office') patch['Type'] = 'Head Office';
    var al = list_(r['Aliases']), add = list_(s0[8]).filter(function (a) { return al.map(norm_).indexOf(norm_(a)) < 0; });
    if (add.length) patch['Aliases'] = al.concat(add).join(', ');
    if (s0[13] && !str_(r['Model'])) { patch['Model'] = s0[13]; models++; }      // COCO / FOCO = run by us (Pandri, Chanderi); the rest FOFO
    if (Object.keys(patch).length) { updateObj_(SH.OUTLETS, r._row, patch); n++; }
  });
  if (n) bumpGen_('cfg');
  return n ? n + ' outlet row(s) updated' + (models ? ' (model filled on ' + models + ': Pandri COCO, Chanderi FOCO, others FOFO)' : '') : '';
}
function fillCodePrefix_() {
  var seed = {}; DESIG_SEED_().forEach(function (r) { seed[norm_(r[0])] = r[3]; });
  readObjs_(SH.DESIGS).forEach(function (r) {
    if (str_(r['Code Prefix'])) return;
    var p = seed[norm_(r['Designation'])] || (/hq|head|admin|account|hr|mis|store|purchase|logistic|director/i.test(str_(r['Department']) + ' ' + str_(r['Designation'])) ? 'HQ' : 'CG');
    updateObj_(SH.DESIGS, r._row, { 'Code Prefix': p });
  });
}
function seedMismatches_() {
  var have = {}, now = new Date();
  var seed = {}; MISMATCH_SEED_().forEach(function (m) { seed[m[0] + '|' + m[1]] = m; });
  readObjs_(SH.MISMATCH).forEach(function (r) {
    var k = str_(r['Area']) + '|' + str_(r['Issue']), s = seed[k];
    have[k] = r;
    if (/blank Status/i.test(str_(r['Issue'])) && !/fixed/i.test(str_(r['Status']))) updateObj_(SH.MISMATCH, r._row, { 'Status': 'Fixed', 'Suggested Fix': str_(r['Suggested Fix']) + ' — The master now keeps only Active rows; leavers are on Ex-Employees and the sync switches their logins off.' });
    // an open finding written by an earlier version gets the newer wording
    else if (s && s[4] && str_(r['Found By']) === 'Code review' && !/fixed/i.test(str_(r['Status'])))
      updateObj_(SH.MISMATCH, r._row, { 'Status': s[4], 'Detail': s[2], 'Suggested Fix': s[3] });
    else if (s && str_(r['Found By']) === 'Code review' && /^open$/i.test(str_(r['Status'])) && (str_(r['Detail']) !== s[2] || str_(r['Suggested Fix']) !== s[3]))
      updateObj_(SH.MISMATCH, r._row, { 'Detail': s[2], 'Suggested Fix': s[3] });
  });
  var add = MISMATCH_SEED_().filter(function (m) { return !have[m[0] + '|' + m[1]]; });
  if (!add.length) return;
  var ids = nextIds_(SH.MISMATCH, 'Mismatch ID', 'MM-', 3, add.length);
  appendObjs_(SH.MISMATCH, add.map(function (m, i) {
    return { 'Mismatch ID': ids[i], 'Area': m[0], 'Issue': m[1], 'Detail': m[2], 'Suggested Fix': m[3], 'Found By': 'Code review', 'Found At': now, 'Status': m[4] || 'Open' };
  }));
}

/* ============================ DROPDOWNS & FORMATS ============================ */
function dv_(list) { return SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(false).build(); }
function applyDv_(name, col, rule) {
  var h = heads_(name), c = h.idx[col];
  if (c === undefined) return;
  var n = Math.max(h.sh.getMaxRows() - 1, 1);
  try { h.sh.getRange(2, c + 1, n, 1).setDataValidation(rule); } catch (e) {}
}
function applyValidations_() {
  var yn = dv_(['Yes', 'No']);
  var ss = db_();
  modules_().forEach(function (m) { applyDv_(SH.ACCESS, m.name, yn); applyDv_(SH.ROLES, m.name, yn); });
  var roleRange = ss.getSheetByName(SH.ROLES).getRange('B2:B200'), outRange = ss.getSheetByName(SH.OUTLETS).getRange('A2:A200');
  applyDv_(SH.ACCESS, 'Role', SpreadsheetApp.newDataValidation().requireValueInRange(roleRange, true).setAllowInvalid(false).build());
  applyDv_(SH.ACCESS, 'Home Outlet', SpreadsheetApp.newDataValidation().requireValueInRange(outRange, true).setAllowInvalid(true).build());
  applyDv_(SH.DESIGS, 'Default Role', SpreadsheetApp.newDataValidation().requireValueInRange(roleRange, true).setAllowInvalid(false).build());
  applyDv_(SH.CHECKLISTS, 'Outlet ID', SpreadsheetApp.newDataValidation().requireValueInRange(outRange, true).setAllowInvalid(true).build());
  applyDv_(SH.LOGIN, 'Status', dv_(['Active', 'Inactive']));
  applyDv_(SH.ROLES, 'Status', dv_(['Active', 'Inactive']));
  applyDv_(SH.MODULES, 'Status', dv_(['Active', 'Soon', 'Hidden']));
  applyDv_(SH.OUTLETS, 'Status', dv_(['Active', 'Inactive']));
  applyDv_(SH.OUTLETS, 'Type', dv_(['Outlet', 'Head Office', 'Factory', 'Warehouse']));
  applyDv_(SH.OUTLETS, 'Model', SpreadsheetApp.newDataValidation().requireValueInList(OUTLET_MODELS, true).setAllowInvalid(true)
    .setHelpText('COCO / FOCO = run by us (attendance, penalties, salary, checklists). FOFO / COFO = franchise-run: employee records only.').build());
  [SH.DEPTS, SH.DESIGS, SH.CHECKLISTS, SH.VEG_ITEMS, SH.STOCK_CATS, SH.STOCK_ITEMS, SH.FOOD_ITEMS, SH.EXP_CATS, SH.SHIFTS]
    .forEach(function (n) { applyDv_(n, 'Status', dv_(['Active', 'Inactive'])); });
  applyDv_(SH.APPS, 'Status', dv_(['Active', 'Inactive', 'Needs URL']));
  applyDv_(SH.APPS, 'Visible To All', yn);
  applyDv_(SH.APPS, 'SSO Enabled', yn);
  applyDv_(SH.APPS, 'Type', dv_(['App Link', 'Google Sheet', 'Google Form', 'Checklist', 'FMS', 'PMS', 'Flowchart / Docs', 'Training Video', 'Template', 'Other']));
  applyDv_(SH.VAULT, 'Type', dv_(['Credential', 'Document', 'Note']));
  applyDv_(SH.VAULT, 'Status', dv_(['Active', 'Deleted']));
  applyDv_(SH.TASKS, 'Status', dv_(TASK_STATUSES));
  applyDv_(SH.TASKS, 'Priority', dv_(TASK_PRIORITIES));
  applyDv_(SH.CHK_ASSIGN, 'Status', dv_(['Assigned', 'Done', 'Reassigned', 'Cancelled']));
  applyDv_(SH.VEG_ITEMS, 'Section', dv_(['Vegetables', 'Staff Food', 'Extra']));
  applyDv_(SH.VEG_ORDERS, 'Status', dv_(['Pending', 'Received', 'Not Received', 'Cancelled']));
  applyDv_(SH.EXPENSES, 'Payment Mode', dv_(PAYMENT_MODES));
  applyDv_(SH.EXPENSES, 'Status', dv_(['Recorded', 'Verified', 'Deleted']));
  applyDv_(SH.CERTS, 'Status', dv_(['Active', 'Deleted']));
  applyDv_(SH.SESSIONS, 'Status', dv_(['Active', 'Ended', 'Logged Out']));
  applyDv_(SH.MISMATCH, 'Status', dv_(['Open', 'Fixed', 'Ignore']));
  applyDv_(SH.RULES, 'Item Type', dv_(['Section', 'Checklist', 'App']));
  applyDv_(SH.RULES, 'Who Type', dv_(['Everyone', 'Location', 'Department', 'Designation', 'Role', 'User']));
  applyDv_(SH.RULES, 'Access', dv_(['Yes', 'No', 'Manage']));
  applyDv_(SH.RULES, 'Status', dv_(['Active', 'Inactive', 'Deleted']));
  applyDv_(SH.DESIGS, 'Code Prefix', dv_(['CG', 'HQ']));
  var yN = dv_(['YES', 'NO']);
  applyDv_(SH.POSTER_OUT, 'Active', yN); applyDv_(SH.POSTER_ROLES, 'Active', yN); applyDv_(SH.POSTER_BEN, 'Active', yN);
  applyDv_(SH.POSTER_BEN, 'Default', yN); applyDv_(SH.POSTER_SEC, 'Active', yN); applyDv_(SH.POSTER_SEC, 'Print on Poster', yN);
  applyDv_(SH.POSTER_SEC, 'Type', dv_(['paragraph', 'bullets', 'benefits']));
  var yesNoSettings = ['Single Session Per User', 'Test Mode', 'Send Task Emails', 'DSR Allow Re-edit', 'Stock Bill Image Required', 'Stock Bill Number Required',
    'Leave Incharge Step', 'Sync Loan & Advance Admin Access', 'Joining Form Enabled'];
  var st = ss.getSheetByName(SH.SETTINGS);
  if (st.getLastRow() > 1) st.getRange(2, 1, st.getLastRow() - 1, 1).getValues().forEach(function (r, i) {
    if (yesNoSettings.indexOf(str_(r[0])) >= 0) { try { st.getRange(i + 2, 2).setDataValidation(yn); } catch (e) {} }
  });
}

var DATE_COLS = ['Date', 'Order Date', 'GRN Date', 'Due Date', 'Week Start', 'Certificate Date', 'Expiry Date', 'Date Of Joining'];
var STAMP_COLS = ['Last Login', 'Created At', 'Expires At', 'Last Seen', 'Updated At', 'Assigned At', 'Done At', 'Completed At',
  'Timestamp', 'Received At', 'Uploaded At', 'Found At', 'Last Synced', 'Planned'];
function applyFormats_() {
  db_().getSheets().forEach(function (sh) {
    var n = sh.getName();
    if (n === SH.README || n === SH.SETTINGS) return;
    var h = heads_(n), rows = Math.max(sh.getMaxRows() - 1, 1);
    h.names.forEach(function (c, i) {
      try {
        if (DATE_COLS.indexOf(c) >= 0) sh.getRange(2, i + 1, rows, 1).setNumberFormat('dd/MM/yyyy');
        else if (STAMP_COLS.indexOf(c) >= 0) sh.getRange(2, i + 1, rows, 1).setNumberFormat('dd/MM/yyyy HH:mm');
      } catch (e) {}
    });
    try { if (sh.getFrozenRows() < 1) sh.setFrozenRows(1); } catch (e) {}
  });
  var acc = db_().getSheetByName(SH.ACCESS);
  try {
    acc.setFrozenColumns(3);
    var n = HEAD[SH.ACCESS].length, m = modules_().length;
    acc.getRange(1, n + 1, 1, m).setBackground('#8B5A2B');
    acc.getRange(1, 1).setNote('Blank Yes/No cell = the Role\'s value (Roles tab). Yes / No here overrides it for this one person.\nOutlet Access: ALL, or Outlet IDs / names separated by commas.');
    var lg = db_().getSheetByName(SH.LOGIN);
    lg.getRange(1, 5).setNote('Plain password. Leave blank to block sign-in until you set one.');
    lg.setFrozenColumns(3);
  } catch (e) {}
}

function writeReadme_() {
  var sh = sheet_(SH.README);
  sh.clear();
  var lines = [
    ['CHAI GOVINDAM — ONE LOGIN  (v' + APP.VERSION + ')'],
    ['Everyone signs in on one page and sees only what their login is given. No other app needs its own login any more.'],
    [''],
    ['HOW TO GIVE SOMEONE ACCESS'],
    ['1. Login tab: their row is created automatically by the employee sync (Login ID = Employee ID). Type a Password. Status = Active.'],
    ['2. Access tab: pick a Role — that is enough, the Role gives the sections (Roles tab). Outlet Access = the outlet(s) an incharge runs; an Outlet Incharge never gets ALL.'],
    ['3. Access Rules tab (or the app ▸ Access Control): give or block one section, one checklist or one app for a location, department, designation, role or one person.'],
    ['   Most specific wins: User › Designation › Department › Role › Location › Everyone. A Yes / No typed on the person\'s own Access row beats every rule.'],
    ['4. Checklists: everyone found in a checklist\'s Doer List gets that checklist (Checklist Doers tab links doer → login; sync from the menu). "Manage" = team view + give tasks.'],
    ['   Chanderi has its own four (Cashier, Housekeeping, Maintenance, Kitchen — Checklists tab, Outlet ID OUT-006); a checklist missing from the Checklists tab is added by itself.'],
    ['LOGO: Settings ▸ Logo Mark = the logo without any text (Drive file ID or image link) for the login screen and the top bar; Logo URL = the full logo.'],
    ['   A person with no checklist, no outlet or no Employee ID simply does not see those sections.'],
    [''],
    ['WHERE THINGS LIVE'],
    ['Leave · Advance · Reimbursement → Loan & Advance month tabs (same columns as the old form). Outlet Incharge (every outlet; none for Bhanpuri HQ / GFP) → HR → Admin (Directors: above ₹5,000 and every HQ / GFP request, otherwise automatic) → Accounts — all approve here (Approvals section).'],
    ['   The incharge step is his Leave Approval / Advance Approval sections. Head Office (HQ / GFP) advances have no incharge step; an outlet with no incharge login → HR decides it directly.'],
    ['   Admin rejects → HR re-sends it (same or new amount) or rejects it too (closed). Approvals ▸ Advance tracker follows every advance to "Paid"; staff follow their own in My requests.'],
    ['   Everyone applies only for himself — no list of other employees. Settings & Data ▸ Tools ▸ "Close the old Loan & Advance form" switches the old public form off.'],
    ['Production Entry → the prep sheet (Daily Entry): start / finish a batch with photos; the doer is the person signed in. Prep kitchen staff (Settings ▸ Prep Entry Departments) get it.'],
    ['   Keep the Loan & Advance spreadsheet locale on India (File ▸ Settings) so dates stay day/month — a US locale swaps them and a leave can look like it never ends.'],
    ['Attendance Manager → the Attendance Report workbook (Settings ▸ Attendance Sheet ID): upload the machine file, fix unmatched names, rules, month reports.'],
    ['Penalty → the same workbook: automatic penalties come from the punches and the Location Rules; penalties given by hand go to its Manual Penalty tab.'],
    ['   HR, MIS and Directors see every location and can change amounts. An Outlet Incharge sees only his own outlet, gives at the fixed amount and can take back only his own.'],
    ['Employees / joining form → CG Employee Detail NEW (staff see their own details without salary). Salary preparation & slips → SGSPL Salary Master (one tab per month).'],
    ['Hiring posters → Poster tabs here. My Apps → Apps tab (import from CG System Master V2).'],
    ['Checklists are marked done in each checklist\'s own Master tab. Bhanpuri HQ and Bhanpuri GFP are Head Office (Outlets ▸ Type), never outlets.'],
    ['OUTLETS WE RUN: Outlets ▸ Model = COCO / FOCO (Settings ▸ Operated Models) — today Pandri (COCO) and Chanderi (FOCO). Attendance, penalties, salary preparation and checklists'],
    ['   are kept only for these and the Head Office. FOFO outlets keep employee records, orders, DSR, leave and the rest. Change a model in the app: Settings & Data ▸ Outlets.'],
    ['THE LINK: share script.google.com/a/macros/<your domain>/s/<id>/exec (Settings & Data ▸ Tools ▸ Copy link). The plain /macros/s/ link fails on phones signed in to several Google accounts.'],
    ['FAST WEB COPY (2.6.0): the web folder (on Vercel) holds the screens; the data still comes from this web app. config.js = the /exec link of this deployment.'],
    ['   Deploy a new version on the SAME deployment (Manage deployments ▸ Edit ▸ New version) so the link stays the same, then upload the new web folder. Settings ▸ Web App Link = the Vercel'],
    ['   link makes e-mails and the copy-link button use the fast copy (?page=join still opens the joining form here).'],
    ['SPEED: every screen opens at once from the copy kept on the phone / PC (a thin line at the top = checking for newer data). Changes made in this app show at once for everyone;'],
    ['   rows typed straight into the other sheets show within 3–10 minutes, or at once with the Refresh button (↻). Menu ▸ Clear cache refreshes everything for everyone.'],
    ['FAST SERVER (2.9.0, on Vercel since 2.9.4): the screens read the sheets themselves through the Google Sheets API (read only) — Apps Script is not started for them.'],
    ['   Everything that saves (approve, save, upload, sign in …), every Excel / PDF export and anything the fast server cannot do goes to this web app as before, which still holds the lock.'],
    ['   After a save, the next screen of that person and of everyone else reads the changed tabs fresh; rows typed straight into a sheet show within FAST_TTL seconds (120, a Vercel environment variable).'],
    ['   2.9.1: a screen is answered at once from the server\'s copy (up to 10 minutes old) and the copy is read again from Google straight after; Google\'s read limit per minute only'],
    ['   pauses the reading, the copies are still used. Excel files in Drive (HR Calling Record …) are kept as hidden tabs "XL <file id>" here, listed on the Excel Copies tab, and copied'],
    ['   again only when the file changes (checked every 30 minutes).'],
    ['   Setup: menu ▸ Fast server: show its settings (CG_FAST_CONFIG for Vercel). Steps: SETUP_GUIDE.md ▸ 0.'],
    ['   Settings ▸ Fast Reads = Yes: this web app too reads the sheets a request needs in parallel through the Sheets API (No = one by one, as before).'],
    ['ATTENDANCE FILES (2.9.2): two Petpooja files — HQ · GFP · Pandri and Chanderi — each with its own upload box. Uploading one file replaces only that file\'s rows of the dates in it;'],
    ['   the other file\'s rows stay. Location Rules ▸ Upload File says which file a location comes in. An Employee ID in the file counts for that master employee only when the names'],
    ['   are close (Config ▸ MATCH_NAME_CHECK, NAME_MATCH_MIN); otherwise the name decides, and a person found twice on one date is counted once. Absent rows start from the joining date.'],
    ['ROSTER TIMING (2.9.2): a roster timing for a person on a date (Roster ▸ prepare) is used for late in / early out and their penalties; without it Employee Shift, then Shift Config.'],
    ['   Config ▸ SHIFT_FROM_ROSTER = No switches this off. HR prepares the roster of Pandri and Chanderi from the Roster screen (Outlet field).'],
    ['HOLIDAYS (2.9.2): the Holidays tab feeds the Calendar on the dashboard with the staff birthdays. Every Year = Yes repeats a holiday on the same date each year until a holiday'],
    ['   with the same name is added for that year. Admins add / change / remove holidays from the Calendar.'],
    ['ROSTER (2.9.3): Prepare for Tomorrow / another day — pick the location, then each person\'s shift timing (Shifts tab rows with a start and end, Leave, Manual timing). Approved leave'],
    ['   comes in as Leave; a person on Leave gets a Replacement (same or other department), kept on the Roster tab and written on the leave row of the Loan & Advance sheet.'],
    ['ONE FILE FOR ALL LOCATIONS (2.9.3): Upload attendance ▸ All locations in one file splits the rows by person and replaces both files\' rows of the dates in it. Punches edited'],
    ['   by hand are kept when a day is uploaded again.'],
    [''],
    ['IDs'],
    ['User USR-0001 · Outlet OUT-001 · Department DEP-001 · Designation DES-001 · Rule RUL-0001 · App APP-001 · Credential CRD-0001 · Document DOC-0001 · Checklist CHK-001 · Salary run PAY-0001.'],
    ['Employees keep their Employee Master ID (CG-00001, HQ-00001 …), one sheet per location: Emp - Pandri, Emp - Chanderi, Emp - GFP, Emp - HQ …'],
    [''],
    ['MENU'],
    ['CG One Login ▸ ① Set up · ② Sync employees · ③ Import app credentials · ④ Mismatch audit · Sync checklist doers · Import My Apps · Loan & Advance Admin Access · Clear cache.'],
    ['More tools (fill the poster tabs, check the attendance workbook, repair tabs) are in the web app ▸ Settings & Data ▸ Tools.'],
    ['Joining form for new employees: the web app link + ?page=join'],
    [''],
    ['HOW EACH SCREEN WORKS  (the web app shows no instructions — they are all here)'],
    ['LOCATIONS: attendance, penalties, overtime, salary preparation and roster run for HQ (Bhanpuri HQ — everyone at Bhanpuri who is not GFP), GFP (Bhanpuri GFP), Pandri and Chanderi only.'],
    ['   Other outlets (franchise) keep their employee records, orders, DSR and leave. HR logins list only Pandri and Chanderi in the outlet picker.'],
    ['SIDEBAR (HR, MIS): Dashboard · Approvals · then HR: Payroll · Recruitment · Roster · Accommodation (Soon). Attendance, Penalty, Hiring Poster, FMS Summary, Employees, Salary Slips and Reports open from those sections.'],
    ['DIRECTORS: the dashboard has four cards. Pending Checklists: Location filter (All · HQ · GFP · Chanderi · Pandri), one card per checklist with Pending, Overdue and Done.'],
    ['   A checklist counts daily tasks of today, weekly tasks of this week (Monday–Sunday) and monthly tasks of this month. Overdue = not done after its planned time; Pending = not due yet.'],
    ['   Filter By (Pending · Overdue · Done · All, with counts), doer and search — view only: tick tasks and give them to someone of the checklist\'s own department. Scores: one card per checklist.'],
    ['   The same Overdue rule is used in Checklist ▸ My tasks and the Team view: older daily tasks never done are not listed any more.'],
    ['   Approvals · Issues Raised (Raise Issue is replaced by Overdue of Chanderi and Pandri) · Delegated Tasks: the Delegated Tasks tab — Pending, Pending with EA and Done with a doer filter,'],
    ['   and Delegate Task: pick anyone with a login from the employee master; one row per doer (new Task ID DT-, the due date, Pending).'],
    ['   Sidebar: HR Dashboard (Payroll · Advance · Reimbursement) · Accommodation (Soon) · DSR Daily Sales (Pandri first) · GRN Summary (Pandri, Chanderi, GFP) · Expense Records (DSR expenses of Pandri and Chanderi)'],
    ['   · Cash Management (Cash_Management_Database — Settings ▸ Cash Management Sheet ID: one day per counter and shift, or a date range; tap an entry for its notes and coins) · Production Records'],
    ['   · Daily Food Closing (Pandri Material Closing Sheet ▸ Stock Closing — Settings ▸ Food Closing Sheet ID; a closing before 3 AM belongs to the day before) · Wastage Report'],
    ['   · Orders Summary (today / yesterday, dispatched quantity, Item Not Dispatch sheet) · Certificates · Sale Report · Employee View.'],
    ['   · FMS Summary: Indent to Offer Letter (pending this week · overdue · offer letters sent this month) · Onboarding to Probation · Outlet Order to Dispatch (this week: overdue, pending'],
    ['     and done steps step by step; today: pending and overdue steps).'],
    ['   In Approvals a Director can approve at every step: Outlet Incharge, HR, Director, payment (Operations Manager / Accountant) and reimbursement. "Waiting for me" lists only'],
    ['   what reached his own step through the earlier approvals (Pending with Director, Pending with MIS / Director); the count on each card is that number.'],
    ['EXECUTIVE ASSISTANT (2.7.0, Role = Executive Assistant): the Directors\' dashboard and sidebar (HR Dashboard, DSR, GRN, Expense Records, Cash Management, Daily Food Closing,'],
    ['   Orders Summary, FMS Summary …) plus Checklist and My Delegated Tasks; the Directors\' approval steps stay with the Directors. Every sidebar item is a section in User Management ▸'],
    ['   her login ▸ Sections: set one to No to hide it from her (Director screens: HR Dashboard, DSR Daily Sales, GRN Summary, Expense Records, Cash Management, Daily Food Closing,'],
    ['   Orders Summary, FMS Summary). Setup moves an active EA login that was on Staff to this role with Outlet Access = ALL.'],
    ['ACCOMMODATION (Soon): in the sidebar of HR and the Directors; the screen comes later.'],
    ['OPERATIONS MANAGER (Sandeep Rajput — Outlet Incharge of Pandri + Chanderi): approves leave and advance at the Outlet Incharge step for both outlets and marks their advances Paid;'],
    ['   approves the reimbursements of every location (HQ, GFP, Pandri, Chanderi …) in place of the Accountant. His own requests are shown but someone else approves them.'],
    ['DOWNLOADS: Excel / PDF reports need a one-time permission from the owner of this sheet: CG One Login ▸ Allow downloads (one time) ▸ Allow. Until then PDFs still download, Excel does not.'],
    ['LOCATION PICKER (top bar): Directors, MIS, an Outlet Incharge of more than one outlet (the Operations Manager: Pandri + Chanderi) and Settings ▸ Outlet Picker For (Admin).'],
    ['   Everyone else works only on the places they belong to. Passwords are changed by MIS (User Management), not from My Profile.'],
    ['DASHBOARD: My pending tasks · Approvals (approvers) or My requests · Issues (red; HQ, GFP, Admins and the Pandri / Chanderi Outlet Incharge) — and quick actions: leave, advance, reimbursement.'],
    ['   Below the cards the pending work is listed straight away, each with its own Done button: Checklist (today, this week, this month), Delegated tasks and FMS steps'],
    ['   (a step whose WHO is the person\'s designation, department or name, planned in the last FMS My Steps Days). FMS Done writes Status = DONE in that FMS sheet.'],
    ['   HR logins (Recruitment) also see Hiring · <month>: No. of calling · Interview scheduled · Offer letters given · Onboarding · Joining — tap one for its list in Recruitment.'],
    ['BACK: every screen has a back arrow next to its title (and the phone\'s back button works in the fast web copy). Inside a section the arrow first closes the open card or list.'],
    ['DELEGATED TASKS (2.6.0): kept here in the Delegated Tasks tab — the old Delegation Sheet NEW is not read any more (its open tasks and those done in the last Delegation Done Days'],
    ['   were copied once, Old Task ID = its Task ID). Doers = every active employee with a login (the employee master), not the Doer List. Done (optional link, remark and file)'],
    ['   = Pending with EA; the EA (Settings ▸ Delegation Approvers) approves it — only then is it Done — or sends it back with what is missing (Reopened, Revisions + 1).'],
    ['   The EA approves from the dashboard or My Delegated Tasks ▸ To approve; Directors and MIS may approve too. Nobody approves his own task.'],
    ['APPROVALS: one card per kind the login can see — Advance, Leave, Reimbursement, Employee detail changes, New joinings — each showing how many are pending, and Tracking.'],
    ['   Each request shows where it is pending now: Pending with Outlet Incharge, Pending with HR, Pending with Director, Pending with Operations Manager. Filter By: All pending, Pending with …,'],
    ['   Waiting for me (only what you can approve now), From – To, location, search. HR may still approve a request that is pending with the Outlet Incharge.'],
    ['   TRACKING (this month; Month picks any of the last six): Advance and Leave Tracking for MIS, the Directors, HR and the Outlet Incharge (his outlet only); Reimbursement Tracking for MIS, the Directors and the'],
    ['   Operations Manager (every location). One line each:'],
    ['   where it is pending (Pending with Outlet Incharge, HR, Director or Operations Manager — he marks it Paid) or the final result (approved, paid, rejected); tap it for every step.'],
    ['   Advance, Leave and Reimbursement show only this month\'s tabs (Advance / Leave / Reimbursement <Month YYYY>), dated by when the request was made. Refresh re-reads the sheet.'],
    ['   Employee master changes and Under review joinings show everything still waiting, whatever the month.'],
    ['   CHANGE A DECIDED LEAVE (2.7.0): Leave Tracking ▸ the leave ▸ Change to approved / Change to rejected — for HR and anyone with Access ▸ Leave — final decision. A reason is required;'],
    ['   Final Status, its name and date are rewritten and "Changed from X to Y by NAME on date: reason" is added to Remarks. Attendance follows at once.'],
    ['   Tick several rows to approve or reject them together; the bulk bar shows only while something is ticked.'],
    ['ATTENDANCE: upload the Petpooja punch file in Payroll ▸ Upload attendance — one day, or a whole month at once (the Petpooja "Attendance-Master" bulk file: every row is kept).'],
    ['   Upload back dates only: Petpooja does not have the full current day, so rows of today are left out (Config ▸ ALLOW_TODAY_UPLOAD).'],
    ['   People marked "(Inactive)" / "(Terminated)" in Petpooja are kept in the data but not reported. A location with no rows in the file that day is "not in the punch file" — nobody there is marked absent or charged.'],
    ['   REGULARISED DAYS: no punch in and no punch out but working hours (e.g. 9h 30m, regularised by HR in Petpooja) = present, judged by those hours: Full Day Hours or more = Full Day,'],
    ['   above Absent Max Hours (3) = Half Day (Config ▸ REGULARISED_BY_HOURS). No missing-punch penalty on those days.'],
    ['   Cards: Upload attendance · Penalty applied (this month) · Last upload · Penalty in last upload. Penalties by type (All, Late punch in, Unapproved leave, Not in uniform, Not fully groomed,'],
    ['   Misbehaviour): HR changes or waives any amount — automatic penalties keep the change in the Penalty Override tab of the Attendance workbook, by-hand ones in Manual Penalty.'],
    ['   Shift: each person is matched to the nearest shift of his location (Attendance workbook ▸ Shift Config), unless Employees ▸ Shift timings pins him to a shift, gives his OWN timing'],
    ['   (start / end — for anyone outside Shift 1 / Shift 2, e.g. 05:00 AM – 03:00 PM) or "No shift checks". Late punch in / left early are worked out from that timing (grace: Config ▸ OWN_SHIFT_*_GRACE_MIN).'],
    ['   OWN TIMINGS (2.7.0): Payroll ▸ Rules ▸ Employee shift ▸ Set a timing — pick the employee from the list of active employees, then Punch in and Punch out (hour, minute, AM / PM)'],
    ['   and Save timing. HR, MIS and the Directors may set, change or remove a timing (saved in Attendance workbook ▸ Employee Shift). Punching in after that time + the grace = late punch in penalty.'],
    ['   The Pandri roster of 23 Oct 2026 gave own timings to the ten people outside Shift 1 (04:00 AM – 02:00 PM) and Shift 2 (01:00 PM – 11:00 PM).'],
    ['UNAPPROVED LEAVE: absent in the punch file with no approved leave in the Loan & Advance sheet = unapproved leave at Pandri, Chanderi, HQ and GFP (Penalty Rules, type UNAPPROVED_LEAVE).'],
    ['   2.7.0: each day is charged at 2× the daily wage (monthly salary in the employee master ÷ 30 × 2 — Config ▸ UNAPPROVED_LEAVE_WAGE_TIMES). The fixed Rs 200 a day of the Penalty Rules'],
    ['   is worked out beside it. Payroll ▸ Unapproved leave lists every person of the month with days, both totals and the amount charged; HR, MIS and the Directors choose per person'],
    ['   (or tick several) "2× daily wage", "Fixed amount" or "Waived" (2.8.0: nothing charged for that month) — kept in the Unapproved Leave Basis tab of the Attendance workbook,'],
    ['   one row per person and month. No row = 2× daily wage.'],
    ['   Someone without a salary in the employee master is charged the fixed amount ("No salary found"). The chosen amount goes to penalties, reports and Salary preparation.'],
    ['   A day with approved leave is never charged, even when the person punched for part of it (half day). Leave filed under an old Employee ID is matched by name.'],
    ['   Charged from Config ▸ UNAPPROVED_LEAVE_CHARGE_FROM (days before it are listed, not charged). Leave waiting for approval counts as unapproved (PENDING_LEAVE_IS_UNAPPROVED).'],
    ['   A week off counts when it is on the roster as WO (WEEK_OFF_FROM_ROSTER) or falls on the Week Off day of the location (Location Rules ▸ Week Off: HQ and GFP = Sunday).'],
    ['HQ AND GFP PENALTIES (from 2.5.4): same rules as Pandri — late punch in Rs 100 after 10 minutes of grace on the 9:00 AM – 6:00 PM shift, unapproved leave (2× daily wage or Rs 200), and the by-hand ones.'],
    ['   Penalty Rules ▸ Start Date = the first day a rule is charged (HQ / GFP: 1 Oct 2026); blank = always. Someone with another timing: Employees ▸ Shift timings ▸ own start / end.'],
    ['OVERTIME: only where Location Rules ▸ Overtime = Yes (Pandri, Chanderi), once the person really worked Standard Hours + OT After Extra Hours (10 + 2 = 12 h).'],
    ['   The worked time is rounded to whole hours — 30 minutes or more counts as the next hour (13h 22m → 13 h, 13h 32m → 14 h; Config ▸ OT_ROUND_UP_MINUTES) — and OT = rounded hours − Standard Hours.'],
    ['   Hourly rate = monthly salary ÷ 30 ÷ Standard Hours × OT Rate. It goes to the O/T column of Salary Preparation.'],
    ['PENALTIES: automatic ones come from the punches and the Penalty Rules (late punch in …); by hand (Not In Uniform, Misbehaviour, Not Groomed …) from Penalty ▸ Day board / Give a penalty, with a remark.'],
    ['   They are worked out again on every screen, report and Salary preparation with the rules in force, so a rule change (an own timing, Chanderi\'s Apply Penalty = No, approved leave)'],
    ['   applies to every past day as well — nothing has to be cleared by hand.'],
    ['   WAIVE OR CHANGE SEVERAL (2.8.0): Payroll ▸ Penalty applied or Penalty in last upload (any From – To, Location and type): tick the penalties (or Select all), then Waive, or type an'],
    ['   amount and Set amount, with a remark; Automatic amount puts them back. Waived lines stay in the list at Rs 0 marked waived (Penalty Override tab; by-hand ones in Manual Penalty).'],
    ['   PENALTY EXCEPTIONS (2.8.0): Payroll ▸ Penalty exceptions — employee, penalty (every automatic penalty or one type: late punch in, unapproved leave, left early …), From and To'],
    ['   (optional) and the reason. No automatic penalty of that type is charged in those dates; the lines show at Rs 0 marked exception. Penalties given by hand are not affected.'],
    ['   Remove = charged again. Kept in the Penalty Exceptions tab of the Attendance workbook. HR, MIS and the Directors add, change and remove them.'],
    ['   HR, MIS and Directors see every location and can change amounts. An Outlet Incharge sees only his outlet, gives at the fixed amount and can take back only his own.'],
    ['REPORTS (Reports section · Attendance Manager ▸ Reports · Penalty ▸ Month summary / Given by hand): Excel or PDF. Attendance report with penalties = one sheet per location with overtime and'],
    ['   penalties (automatic + by hand with remark) + its penalty sheet. Penalty report = summary per person + every penalty day. Also overtime, leave and running advances. PDFs are A4 landscape.'],
    ['LEAVE & ADVANCE: Outlet Incharge → HR → Admin (Directors: above Rs 5,000 and every HQ / GFP request, otherwise automatic) → Accounts. HR can decide a leave or advance that is still with the'],
    ['   Outlet Incharge (Settings ▸ HR Can Decide For Incharge) — the sheet then reads "<HR name> (HR, for the Outlet Incharge)". Approved leave and its replacement show on the roster.'],
    ['   RUNNING ADVANCES: every advance of a month that Admin approved (or Accounts paid) is that month\'s running advance — Reports ▸ Running advances, and Salary Preparation ▸ Loan & Advance.'],
    ['ROSTER: prepare today, tomorrow, any day or a whole week per outlet; cards for yesterday, today, tomorrow and this week. Cells show the shift timing; "Manual timing…" gives one person'],
    ['   his own start / end for that day (Shift Code MANUAL). Day sheet = the Daily Staff Duty Roster (timing, leave status, replacement) — Excel / PDF.'],
    ['EMPLOYEES (Payroll ▸ Total employees): Director and MIS write to CG Employee Detail NEW at once. HR Assistant / Intern edits (Settings ▸ Employee Edit Needs Approval) go to the HR Executive'],
    ['   (Settings ▸ Employee Edit Approvers), then to MIS / Director, and are written only after that. Other HR edits go straight to MIS / Director. Under review joinings: HR approves first,'],
    ['   MIS / Director give the final approval that adds the person to the master. All of it waits in Approvals ▸ Employee master changes / Under review employees.'],
    ['   EMPLOYEE CODES (2.8.0): the joining form reuses a code only for the same person (same Aadhar number, or same mobile and name) — never because of the e-mail. Approving a joining'],
    ['   whose code already belongs to someone else in the master gives the next free code (the documents folder is renamed) and says so.'],
    ['   TRACKING (2.7.0): Employees ▸ Changes & tracking (HR Executive, MIS, Directors) and My changes & tracking (HR Assistant / Intern) list every change with its steps — Sent, HR Executive,'],
    ['   MIS / Director, Saved — and each changed field before and after; a new photo or document opens with View. Filter By: Waiting for me · Pending · Decided (45 days) · Sent by me · All.'],
    ['RECRUITMENT: indents pending (by location, by position, overdue, offer letters this month), joined this month, probation, calling this week, interviews pending, FMS overview with Pending FMS.'],
    ['   Hiring = FMS Hiring workbook; Calling = HR Calling Record (Settings). Hiring Poster and FMS Summary open from here.'],
    ['PAYROLL: Employees (Pandri, Chanderi, HQ, GFP) · Birthdays · Upload attendance · Last upload · Penalty applied · Penalty in last upload · Overtime · Unapproved leave;'],
    ['   Attendance records · Give a penalty · Rules;'],
    ['   BIRTHDAYS: Date of Birth of the employee master — Today and Later this week (to Sunday), with the age they turn and the phone number.'],
    ['   Salary preparation · Salary slips · Reports (Excel / PDF — the only place reports are downloaded).'],
    ['ISSUES (the Tickets sheets: Tickets tab here + the Pandri / Chanderi Tickets Trackers; Issue ID = Ticket ID). Not in the sidebar — the red Issues card on the dashboard.'],
    ['   Raise: a checklist task (only its doer: "Can\'t do it — raise an issue"), a delegated task (Raise issue) or the Raise Issue card (HQ, GFP, Admins, Outlet Incharge). It goes to a person at HQ / GFP or an Outlet Incharge.'],
    ['   Who sees what: Admins (Director, MIS, EA, PC — Settings ▸ Ticket Tracker Designations) every issue, with the Location filter; the Outlet Incharge his outlet\'s issues, his own and those given to him;'],
    ['   everyone else at HQ / GFP their department\'s issues (raised by their department at their location, or given to someone of their department) plus their own and those given to them.'],
    ['   Mark done: only the person it is assigned to — or an Admin, or the Outlet Incharge for his outlet. Re-assign / reopen: Admins and the Outlet Incharge (his outlet), to any person at HQ, GFP or an Outlet Incharge.'],
    ['   Filters: Raised from – To (default: the day the oldest open issue was raised, or Monday of this week, – today) · Filter By: Pending (open, resolve-by date not passed; default)'],
    ['   · Overdue (open, past the resolve-by date) · Done · All issues · Assigned to me · Raised by me; Priority; Location (Admins). Done issues older than Ticket Closed Days Shown drop off.'],
    ['   Tick the issues you may close (or Select all) and Mark done closes them together with one note (the Tracker rows get Ticket Status = Close and the Actual Date).'],
    ['FMS SUMMARY: admins and MIS see every FMS (FMS Sheets tab); others only their department\'s. "Done" on a waiting task writes Status = DONE in the FMS sheet (its Actual formula stamps the time).'],
    ['   Each FMS sheet must be shared with the account that runs One Login.'],
    ['MY CHECKLIST: Today = every task planned today (daily, weekly, monthly) · This week = weekly tasks of this week · This month = monthly tasks of this month. Doers see pending tasks only;'],
    ['   Admins and the Outlet Incharge see done and pending. Last week\'s score per checklist: % work not done and % work not done on time, like the checklist\'s Scores tab'],
    ['   (Monday to Sunday: done ÷ planned × 100 − 100; on time = Actual not after Planned).'],
    ['   Overdue (My tasks and the Team view, next to Pending) = every task not done after its planned day. Checklist ▸ Scores (managers): one card per checklist with last week\'s score;'],
    ['   tap it for any of the last 8 weeks (Week filter) and any doer (Doer filter).'],
    ['ORDERS (Outlet Orders workbook — the same Orders, OrderMeta, MaxLevel, ClosingStock, StandardQty, ItemMaster, ItemRules and EmailList tabs as the Outlet Order App):'],
    ['   New Order = the item cards of the Outlet Order App: search, category, Auto Fill Order Qty (Max Level − Closing Stock), Item Suggestion, Print Items, item rules (linked items, multiples).'],
    ['   Review & Save writes the PO number (PO<short><yy>/<MON>/<nnn>), e-mails the PDF to the person and the EmailList (approve / reject links open the Outlet Order App URL in Settings).'],
    ['   Max Level per outlet · Closing Stock (when AppConfig SHOW_CLOSING_STOCK_TAB = TRUE) · Order History (today and yesterday; the outlet\'s Confirmed orders can be edited) · Dispatch.'],
    ['   The outlet is the one picked in the top bar; a login with several outlets (e.g. the Operations Manager) switches there. All outlets = HQ view for MIS and the Directors (every order, view only).'],
    ['   Dispatch: MIS and anyone with Access ▸ "Orders — Dispatch" = Yes (the GFP store) enters the dispatched quantity of every outlet\'s orders. Vegetables, Bill entry and Past orders stay as they were.'],
    ['   2.8.0: a dispatch quantity below the ordered one opens Reason (the Reason Master of the Item Not Dispatch sheet) and Remark on that line. Save Dispatch writes the quantity to Orders'],
    ['   and the line to Item Not Dispatch (Ordered, Not Dispatched, Dispatched Qty, Reason, Remark, Recorded By) in one go; dispatching it in full later removes the line. ND Audit Log keeps ADD / UPDATE / DELETE.'],
    ['ITEM MASTER (2.8.0, role Store Executive — K. Prateek Iyengar; MIS and the Directors too): Item_Master__v3 ▸ Master Item List (Settings ▸ Item Master Sheet ID / Tab).'],
    ['   GRN: date, supplier, bill number and photo, then any item of the Item Master (Active or not) with the quantity received and the rate (Cost Price filled in). Save GRN writes one'],
    ['   Stock Register row per item under GFP (Settings ▸ Store GRN Outlet) with GRN No SGRN<yyMM><nnnn>, Item Code and Source = Item Master — they show in the Directors\' GRN Summary under GFP.'],
    ['   Items: every item with Status, Category and Search; open one to change its details (all columns except Item Code, Status and the Profit % formula) — written to the Item Master at once and'],
    ['   kept in its Activity Log. Active / Inactive: pick the new status and the reason ▸ Send for approval (Item Requests tab here). MIS or a Director approves in Approvals ▸ Item Active / Inactive'],
    ['   or in Item Master ▸ Active / Inactive requests (Pending · Approved · Rejected); the Status cell changes on approval. MIS and the Directors change a status straight away.'],
    ['   The Orders workbook\'s ItemMaster tab imports only the Active rows, so the outlets see an item to order as soon as it is Active (Refresh on New Order).'],
    ['DIRECTORS (Role = Director): sidebar Dashboard · Approvals · Checklist · Delegate Tasks · Employee View. The dashboard is reports only: what needs them (approvals, issues assigned to them),'],
    ['   departments, checklists, issues, delegated tasks, requests this month, people, hiring, calling (period filter), sales and money — tap a card for the detail.'],
    ['EMPLOYEE VIEW (MIS and the Directors): open anyone\'s screens as they see them, without their password. View only — anything that would change data asks for that person\'s own login.'],
    ['THIS MONTH FIRST: My requests, Leave / Advance Approval and the Attendance Report open on this month — earlier months (with their count) and All are one tap away.'],
    ['   Long lists fold: one line per request / person — tap it for the rest.'],
    ['SALARY PREPARATION: pre-filled from the employee master (active people and salary), last month\'s tab (paid leave, home stay, uniform, PF), the Attendance Manager (half days, absents,'],
    ['   penalties, O/T) and the running advances of that month. Absent = WA + half days ÷ 2 · Paid for = full days + paid leave · Total = daily wage × paid for + O/T + event + carry forward ·'],
    ['   Deduction = penalty + loan & advance + extras + home stay + uniform. Hover a penalty or a Loan & adv. cell to see each line. PF / ESIC come from SALARY BREAKUP.'],
    ['   Every cell can be changed on screen; nothing is written to the SGSPL Salary Master until Submit (with a confirmation).'],
    ['SALARY SLIPS: three parts — company (logo: Settings ▸ Salary Slip Logo URL, blank = Logo URL), employee details (name, code, UAN, PF no., ESIC no., bank, account, days paid for)'],
    ['   and the salary breakup (earnings − PF / ESIC − penalty, running advance … = net pay). Every line can be edited and lines added to any part — for one slip or for every slip.'],
    ['ADVANCE LIMIT: an employee can ask up to the % of the salary earned for his present days set in Settings (at most the days set there).'],
    ['NEW JOININGS: send the joining form link (Employees ▸ Joining form link). Approving a form adds the person to the employee master (and Assets / Salary Breakup when ticked) and creates the login.'],
    ['   Documents: photos or PDF up to 15 MB, filed in the HR Documents folder under "<Employee ID> - <Name>".'],
    ['OUTLETS (Settings & Data ▸ Outlets): outlets we run get attendance, penalties, salary preparation and checklists; franchise outlets keep employee records, orders, GRN, DSR, leave and the rest.'],
    ['   The Head Office always counts as ours. A new outlet also needs a Location Rules row in the Attendance workbook. Changes apply at the next sign-in or page refresh.'],
    ['ACCESS CONTROL: the most specific rule wins — User › Designation › Department › Role › Location › Everyone. At the same level No beats Yes. A Yes / No set on a person in User Management'],
    ['   beats every rule. With no rule, the role decides.']
  ];
  sh.getRange(1, 1, lines.length, 1).setValues(lines).setWrap(true).setVerticalAlignment('top');
  sh.setColumnWidth(1, 1100);
  sh.getRange(1, 1).setFontSize(16).setFontWeight('bold').setFontColor(APP.COLORS.brown);
  lines.forEach(function (l, i) { if (/^(HOW TO GIVE|WHERE THINGS|IDs$|MENU$|HOW EACH SCREEN)/.test(l[0])) sh.getRange(i + 1, 1).setFontWeight('bold').setBackground('#F4C97E'); });
}

/* ============================ APPS & LINKS ============================ */
function APP_SEED_() {
  return [
    ["Employee Master Sheet — Google Sheet", "GV – Govindam Ventures", "Admin / MDO", "Master", "Google Sheet", "https://docs.google.com/spreadsheets/d/1QTG4jxgHLlmtvEI6yMnQ0F_ZsNQoKJG7QKJ2k1q4jCA/edit?gid=210950822#gid=210950822", "No", ""],
    ["Employee Master Sheet", "GV – Govindam Ventures", "Admin / MDO", "Master", "App Link", "https://script.google.com/macros/s/AKfycbyEyog6fSWTbZmLTQo8NiI3yaiOH_sQrXz8dJ_l9U-u8nbQ_fW3Yg1v6ZIC8-Vct1hBcA/exec", "No", ""],
    ["Item Master Sheet — Google Sheet", "GV – Govindam Ventures", "Admin / MDO", "Master", "Google Sheet", "https://docs.google.com/spreadsheets/d/1AZ_Q8K3-wSWFG87TzZtBPRfqMYTb5Zyu76WthOI4GLk/edit?gid=1321447416#gid=1321447416", "No", ""],
    ["Vendor Master Sheet — Google Sheet", "GV – Govindam Ventures", "Admin / MDO", "Master", "Google Sheet", "https://docs.google.com/spreadsheets/d/1rcSUWJuMQ-w6-kYvAD_Z6CLOmWuGORQnV2d6G3acKJE/edit?gid=669829000#gid=669829000", "No", ""],
    ["Vendor Master Sheet — Google Form", "GV – Govindam Ventures", "Admin / MDO", "Master", "Google Form", "https://docs.google.com/forms/d/e/1FAIpQLSev_leIJ6Iklc6TW2kjLUEtiDwgV7Un8IZ0WLRMMbXWZwPRcQ/viewform", "No", ""],
    ["Asset Master Sheet — Google Sheet", "GV – Govindam Ventures", "Admin / MDO", "Master", "Google Sheet", "https://docs.google.com/spreadsheets/d/1WlzYkkt-RN_XEtJ8MKRIo3LL2oDDPdUzljX5CLBEAT4/edit?gid=772957740#gid=772957740", "No", ""],
    ["Asset Master Sheet", "GV – Govindam Ventures", "Admin / MDO", "Master", "App Link", "https://script.google.com/a/macros/chaigovindam.com/s/AKfycbzkhGVQA6eGSoT5vq142SfV97NFV6p3Jum_QXqNOV3ApKuOAenvq2sjnhjMm1S5bbCV/exec", "No", ""],
    ["Delegation — Google Sheet", "GV – Govindam Ventures", "Admin / MDO", "Follow Up", "Google Sheet", "https://docs.google.com/spreadsheets/d/14n9lr-kivAbZq-VIPqH2oge-_fbgbs8A5iE9Hr4jKgY/edit?gid=529077220#gid=529077220", "No", ""],
    ["MIS — Google Sheet", "GV – Govindam Ventures", "Admin / MDO", "Follow Up", "Google Sheet", "https://docs.google.com/spreadsheets/d/151zUuXVGRlH68Iht8uIDqO1r7RQNGK2BidZillEPng8/edit?usp=drive_link", "No", ""],
    ["EA — Checklist", "GV – Govindam Ventures", "Admin / MDO", "Follow Up", "Checklist", "https://docs.google.com/spreadsheets/d/1b7wxUjUQ4ngGWOE4a0HCUGuZ2B_M4ssTeT1yluaTK9I/edit?gid=541354850#gid=541354850", "No", ""],
    ["EA — Google Sheet", "GV – Govindam Ventures", "Admin / MDO", "Follow Up", "Google Sheet", "https://docs.google.com/spreadsheets/d/17VhYZtpaESW30BzTpET9Cjj8-vptPsjfJCt1TfWIfh8/edit", "No", ""],
    ["PC — Google Sheet", "GV – Govindam Ventures", "Admin / MDO", "Follow Up", "Google Sheet", "https://docs.google.com/spreadsheets/d/15FJx6wdtL7lSRykgTbqLEPOQHHgW00i4vUeeIE_0gUE/edit?gid=1594055183#gid=1594055183", "No", ""],
    ["Statutory Compliances — Checklist", "GV – Govindam Ventures", "Accounts", "General", "Checklist", "https://docs.google.com/spreadsheets/d/1IjJp4mGfUkjBjXx_2h5QoQ2zytiGoX5IYCHmm8HLnAI/edit?gid=541354850#gid=541354850", "No", "Accounts"],
    ["Daily Cash Flow — Google Sheet", "GV – Govindam Ventures", "Accounts", "General", "Google Sheet", "https://docs.google.com/spreadsheets/d/1a3oAWhgWDeqrmGjRtmxMN2M5ReRjMbVYMgY2YCYqmJg/edit?gid=615604059#gid=615604059", "No", "Accounts"],
    ["Daily Cash Flow", "GV – Govindam Ventures", "Accounts", "General", "App Link", "https://script.google.com/a/macros/chaigovindam.com/s/AKfycbwCe6pW2PjuMGYCnc0XRMtvFrjsz8_httREXa9OdE6jCZcDI4yW7hB831jipxbI84fY/exec", "No", "Accounts"],
    ["Hiring — FMS", "GV – Govindam Ventures", "HR", "General", "FMS", "https://docs.google.com/spreadsheets/d/1duZUbAEymBwHiNXrrTFe9Cg0uX6--VW13qxL0-9OO7o/edit?gid=0#gid=0", "No", "HR"],
    ["Hiring — Google Sheet", "GV – Govindam Ventures", "HR", "General", "Google Sheet", "https://docs.google.com/spreadsheets/d/1duZUbAEymBwHiNXrrTFe9Cg0uX6--VW13qxL0-9OO7o/edit?gid=2123026510#gid=2123026510", "No", "HR"],
    ["Hiring — Google Form", "GV – Govindam Ventures", "HR", "General", "Google Form", "https://docs.google.com/forms/d/e/1FAIpQLScgkqoqt5GnwMykIpoIhEQr0rPVRvOIvlRSe7-QXR_bmJQ-vw/viewform", "No", "HR"],
    ["Onboarding — FMS", "GV – Govindam Ventures", "HR", "General", "FMS", "https://docs.google.com/spreadsheets/d/1duZUbAEymBwHiNXrrTFe9Cg0uX6--VW13qxL0-9OO7o/edit?gid=1983620106#gid=1983620106", "No", "HR"],
    ["Job Application — Google Sheet", "GV – Govindam Ventures", "HR", "General", "Google Sheet", "https://docs.google.com/spreadsheets/d/1duZUbAEymBwHiNXrrTFe9Cg0uX6--VW13qxL0-9OO7o/edit?resourcekey=&gid=1636634291#gid=1636634291", "No", "HR"],
    ["Job Application — Google Form", "GV – Govindam Ventures", "HR", "General", "Google Form", "https://docs.google.com/forms/d/e/1FAIpQLSfhK0znT4ohxFAeKo47oL_6hA2CzKy4U-G9aQ0jpj1v4oFU9A/viewform?usp=header", "No", "HR"],
    ["New Employee Joining — Google Sheet", "GV – Govindam Ventures", "HR", "General", "Google Sheet", "https://docs.google.com/spreadsheets/d/1QTG4jxgHLlmtvEI6yMnQ0F_ZsNQoKJG7QKJ2k1q4jCA/edit?resourcekey=&gid=210950822#gid=210950822", "No", "HR"],
    ["New Employee Joining", "GV – Govindam Ventures", "HR", "General", "App Link", "https://script.google.com/a/macros/chaigovindam.com/s/AKfycbz_S3Wr-A3U_q1hPKhANQuXLGV2fiD-E8Jmo1Ks8PU8iqqX4FRV5ZPbO1bDX2noa9KpeA/exec", "No", "HR"],
    ["Payroll — Google Sheet", "GV – Govindam Ventures", "HR", "General", "Google Sheet", "https://docs.google.com/spreadsheets/d/18OjM_QOsluen-DkY9V-Us7op44IHAcgqqIdZnzH_QjA/edit?gid=287415957#gid=287415957", "No", "HR"],
    ["Loan & Advance — Google Sheet", "GV – Govindam Ventures", "HR", "General", "Google Sheet", "https://docs.google.com/spreadsheets/d/1z2rEgPoPAf2uvneDN4oziwDGBqnmET1jnDHpb5YbpJI/edit?gid=250677025#gid=250677025", "No", "HR"],
    [LA_APP_NAME, "GV – Govindam Ventures", "HR", "General", "App Link", LA_APP_URL, "Yes", "HR"],
    ["HR Checklist — Checklist", "GV – Govindam Ventures", "HR", "General", "Checklist", "https://docs.google.com/spreadsheets/d/1w5Yujwwpj16RQ31dZTjq0qZe85LYBal6yL2izmysh0Q/edit?gid=541354850#gid=541354850", "No", "HR"],
    ["HR Checklist", "GV – Govindam Ventures", "HR", "General", "App Link", "https://script.google.com/macros/s/AKfycbydR5fR42IgpG-EFpdONVu_h0919UCH9NNFM1Q1SuOoyiqUBuI0Er15xF5qJ6zLI9xw/exec", "No", "HR"],
    ["Roster — Google Sheet", "GV – Govindam Ventures", "HR", "General", "Google Sheet", "https://docs.google.com/spreadsheets/d/1BO3XlobHpBMr-DF85GxCFvDpt9fHVHCl9fDqfOB8ZHM/edit?gid=0#gid=0", "No", "HR"],
    ["Recruitment Calling — Google Sheet", "GV – Govindam Ventures", "HR", "General", "Google Sheet", "https://docs.google.com/spreadsheets/d/1ByhE7T4UTBdLailbdK0xL1wda79MLTVyN-vHF9oPC_4/edit?gid=1315459150#gid=1315459150", "No", "HR"],
    ["Candidate Evaluation — Flowchart / Docs", "GV – Govindam Ventures", "HR", "General", "Flowchart / Docs", "https://docs.google.com/document/d/1R8pe8MsBbklVTfxcuvzTYdyw6THSTMoumNO8ylmYxdw/edit?tab=t.0", "No", "HR"],
    ["Penalty Sheet — Google Sheet", "GV – Govindam Ventures", "HR", "General", "Google Sheet", "https://docs.google.com/spreadsheets/d/1X9vME13jbh3ifCj_Z_YWHytDiEYOGgnvE5QzvQ9YhaQ/edit?gid=0#gid=0", "No", "HR"],
    ["Attendance Report", "GV – Govindam Ventures", "HR", "Master", "App Link", "https://script.google.com/macros/s/AKfycbyjfvBxMnni9OQ_70G7sTLFktMFC2ulwy4cFPUT95HQwPlAD7zMiuH5rnCQVuVqJL10/exec", "No", "HR"],
    ["Franchise Enquiry — Google Form", "GV – Govindam Ventures", "Franchisee Development", "General", "Google Form", "https://docs.google.com/forms/d/e/1FAIpQLSf715uNfNoIjQbpbuBrgymEJRZdyccMEijDscb-UTOdEoK2CA/viewform", "No", ""],
    ["Legal Notice Records — Google Sheet", "GV – Govindam Ventures", "Legal", "General", "Google Sheet", "https://docs.google.com/spreadsheets/d/1Ol74iL3R-8T1TliLFsF02ASLHrCMirlAVebnIWruYY8/edit?gid=600251262#gid=600251262", "No", ""],
    ["Sales — Checklist", "CG – Chai Govindam", "Operation", "General", "Checklist", "https://docs.google.com/spreadsheets/d/1E0R0t-ruCn_9JbdAqDWKtGm1qFxH0hTiGOGJyifhsi8/edit?gid=654246102#gid=654246102", "No", ""],
    ["Pandri Training", "CG – Chai Govindam", "Operation", "Master", "App Link", "https://script.google.com/macros/s/AKfycbwZQm_oBkCmJZ2T9FlVjux8inqzkXBKetSDBvA9MOWbkdUpLlz8AtEUiXg6WqDpHqDTYQ/exec", "No", "Outlet Incharge"],
    ["Preventive Maintenance — Checklist", "CG – Chai Govindam", "Maintenance", "General", "Checklist", "https://docs.google.com/spreadsheets/d/1e2gLxoz3Jra362QPU_2_PWSNhB3y3gtFccSdt1couCE/edit?gid=654246102#gid=654246102", "No", ""],
    ["Production — Checklist", "CG – Chai Govindam", "Production", "General", "Checklist", "https://docs.google.com/spreadsheets/d/1c69QA5zUT6iK4_070aAHl8MeHKx9bwTukv87rQyn784/edit?gid=654246102#gid=654246102", "No", ""],
    ["Production — Google Sheet", "CG – Chai Govindam", "Production", "General", "Google Sheet", "https://docs.google.com/spreadsheets/d/1xbjHt2hisTlQcieISrdV42ji19wMn8jllNuva2byI7A/edit?gid=1093792099#gid=1093792099", "No", ""],
    ["Production", "CG – Chai Govindam", "Production", "General", "App Link", "https://script.google.com/macros/s/AKfycbztBUwUlReqTAPuV1z1VZ12Vdf2Dtt0hkgpoURHemOvD9mslUotHJtuNFIqLAPETN8S/exec", "No", "Outlet Incharge"],
    ["Order to Delivery — FMS", "GFP – Gauri Food Products", "Operations", "General", "FMS", "https://docs.google.com/spreadsheets/d/1xSOfCLKqKHnEoOHR5g_2KKxqhqP4A1jjW8_dATDAXXI/edit?gid=0#gid=0", "No", ""],
    ["Order to Delivery — Google Sheet", "GFP – Gauri Food Products", "Operations", "General", "Google Sheet", "https://docs.google.com/spreadsheets/d/1QqnMrL446pT3ChZmNQi7V5ikXnWTYbEfrQgrXiNpIZg/edit?gid=436958615#gid=436958615", "No", ""],
    ["Order to Delivery", "GFP – Gauri Food Products", "Operations", "General", "App Link", "https://script.google.com/macros/s/AKfycbxN7c7rclL7QGbnSLHWkFpOO7fcvTNailmh8PaMJQX41OWo8VeQcEmB_ozYVZhdXDuQ5A/exec", "No", "Outlet Incharge"],
    ["GRN Entry", "GV – Govindam Ventures", "Operations", "General", "App Link", "https://script.google.com/macros/s/AKfycbyhWF2B3jIbeLSIUp2R0umllaEWjtP9fY872kyyoKLoyKaZDxZj2FmTDbieRM1cAsZylg/exec", "No", ""],
    ["Housekeeping Checklist", "CG – Chai Govindam", "Operation", "Outlet Checklists", "App Link", "https://script.google.com/macros/s/AKfycbzAMTdBMQ_-HUicFYl1X8rQ9Gq1NOJwQ4MZnVIjUvXUsPDBLEqr6VP7zHIgYp4dPMHz/exec", "No", "Outlet Incharge"],
    ["Cashier Checklist", "CG – Chai Govindam", "Operation", "Outlet Checklists", "App Link", "https://script.google.com/macros/s/AKfycbxQLExQWpzGi6LDtOrwGd7REYEifyE1xEG0fsbkB_iIfeQJTmYBUaA2xui9h5lW7zhD/exec", "No", "Outlet Incharge"],
    ["Maintenance Checklist", "CG – Chai Govindam", "Maintenance", "Outlet Checklists", "App Link", "https://script.google.com/macros/s/AKfycbynkIgPNXVWAzwtNUuo_qCPkidK43oK_ruEov2lyd9lJcM3Nd3RH3Jv1dTx5Hv3ZstF7g/exec", "No", "Outlet Incharge"],
    ["PrepKitchen Checklist", "CG – Chai Govindam", "Production", "Outlet Checklists", "App Link", "https://script.google.com/macros/s/AKfycbza_vFjxCS0orl_k6aaRLfy5EO7mAvoDHaoDkKu0pShjiomhqa8HgeXcFZLo3g_aA2-eA/exec", "No", "Outlet Incharge"],
    ["Tickets Tracker (Pandri) — Google Sheet", "CG – Chai Govindam", "Operation", "Outlet Checklists", "Google Sheet", "https://docs.google.com/spreadsheets/d/1_3mc-7JRuFdWDR3a1EtuHehgeOv07aZkYf5ElGuAIhE/edit", "No", "Outlet Incharge"],
    [LA_APP_NAME + " — Admin Portal", "GV – Govindam Ventures", "HR", "General", "App Link", LA_APP_URL + "?page=admin", "No", "HR, Accounts"]
  ];
}

function importApps_(silent) {
  var moved = moveLoanAdvanceUrl_();
  var have = {};
  readObjs_(SH.APPS).forEach(function (r) { have[str_(r['URL'])] = 1; });
  var ids = nextIds_(SH.APPS, 'App ID', 'APP-', 3, 80), add = [];
  APP_SEED_().forEach(function (a, i) {
    if (have[a[5]]) return;
    add.push({ 'App ID': ids.shift(), 'App Name': a[0], 'Company': a[1], 'Department': a[2], 'Section': a[3], 'Type': a[4],
      'URL': a[5], 'Icon': '', 'Visible To All': a[6], 'Visible To Roles': a[7], 'Visible To Users': '', 'SSO Enabled': 'No',
      'Sort': i + 1, 'Status': 'Active', 'Source': 'CG System Master' });
  });
  appendObjs_(SH.APPS, add);
  return add.length + ' app link(s) imported' + (moved ? ' · ' + moved : '');
}

/**
 * Keeps every Loan & Advance, Reimbursement & Leave link on the current deployment
 * (Settings ▸ Loan & Advance App URL). A row is that app's link when its URL holds an
 * earlier deployment ID, or it is an App Link named "Employee Advance…" / "Loan & Advance…".
 * "?page=admin" and other query parts are kept. Old names are renamed, in Apps and in
 * App Credentials. Returns a short message, or '' when nothing changed.
 */
function moveLoanAdvanceUrl_() {
  var url = set_('Loan & Advance App URL') || LA_APP_URL;
  var base = url.split('?')[0], curId = (base.match(/\/s\/([^/]+)\/exec/) || [])[1] || '';
  var names = { 'employee advance': LA_APP_NAME, 'employee advance — admin portal': LA_APP_NAME + ' — Admin Portal',
    'employee advance — google sheet': 'Loan & Advance — Google Sheet' };
  var n = 0, renamed = {};
  readObjs_(SH.APPS).forEach(function (r) {
    var u = str_(r['URL']), nm = str_(r['App Name']), patch = {};
    var oldDep = LA_OLD_DEPLOYMENTS.some(function (id) { return id && u.indexOf(id) >= 0; });
    var byName = str_(r['Type']) === 'App Link' && /^(employee advance|loan & advance)/i.test(nm) && /script\.google\.com\/.*\/exec/.test(u);
    if ((oldDep || byName) && curId && u.indexOf(curId) < 0) {
      var q = u.indexOf('?') >= 0 ? u.substring(u.indexOf('?')) : '';
      patch['URL'] = base + q;
    }
    if (names[nm.toLowerCase()]) { patch['App Name'] = names[nm.toLowerCase()]; renamed[str_(r['App ID'])] = patch['App Name']; }
    if (Object.keys(patch).length) { updateObj_(SH.APPS, r._row, patch); n++; }
  });
  if (Object.keys(renamed).length) readObjs_(SH.APPCRED).forEach(function (c) {
    var to = renamed[str_(c['App ID'])];
    if (to && str_(c['App Name']) !== to) updateObj_(SH.APPCRED, c._row, { 'App Name': to });
  });
  return n ? 'Loan & Advance link updated on ' + n + ' app row(s)' : '';
}

/* ============================ CREDENTIALS FROM EVERY APP ============================ */
/**
 * Pulls the logins each older app keeps (checklist Doer Lists, Outlet Order Users,
 * Loan & Advance Admin Access, Veg / DSR Users, System Master UserRoles,
 * Tickets "Id Passward", Pandri Training passcode) into "App Credentials",
 * matched to a person by mobile, email or full name. Outlet-level logins go to
 * that outlet's incharge(s). Also fills Access ▸ Checklist Doer Name.
 */
function importAppCredentials_() {
  var out = [];
  var logins = readObjs_(SH.LOGIN), acc = {};
  readObjs_(SH.ACCESS).forEach(function (r) { acc[str_(r['User ID'])] = r; });
  var byMob = {}, byMail = {}, byName = {};
  logins.forEach(function (r) {
    var uid = str_(r['User ID']); if (!uid) return;
    var emp = empById_(str_(r['Employee ID']));
    [str_(r['Mobile']), emp ? emp.phone : ''].forEach(function (m) { var k = m.replace(/\D/g, '').slice(-10); if (k.length === 10) byMob[k] = uid; });
    [str_(r['Email']), emp ? emp.email : ''].forEach(function (e) { if (e) byMail[e.toLowerCase()] = uid; });
    byName[norm_(r['Full Name'])] = uid;
  });
  function incharges(outlet) {
    if (!outlet) return [];
    return Object.keys(acc).filter(function (u) {
      var a = acc[u];
      if (norm_(a['Role']) !== 'outletincharge') return false;
      var toks = list_(a['Outlet Access']).concat([str_(a['Home Outlet'])]);
      return toks.some(function (t) { var o = outletByAny_(t); return o && o.id === outlet.id; });
    });
  }
  function who(h) {
    var m = str_(h.mobile).replace(/\D/g, '').slice(-10);
    if (m.length === 10 && byMob[m]) return [byMob[m]];
    if (h.email && byMail[str_(h.email).toLowerCase()]) return [byMail[str_(h.email).toLowerCase()]];
    if (h.name && byName[norm_(h.name)]) return [byName[norm_(h.name)]];
    if (h.outlet) return incharges(h.outlet);
    return [];
  }

  var apps = readObjs_(SH.APPS);
  function base(u) { return str_(u).split('?')[0].split('#')[0].replace(/\/+$/, ''); }
  function appFor(name, url, dept) {
    var b = base(url), hit = null;
    apps.forEach(function (a) { if (!hit && b && base(a['URL']) === b) hit = a; });
    if (!hit) apps.forEach(function (a) { if (!hit && norm_(a['App Name']) === norm_(name)) hit = a; });
    if (hit) return { id: str_(hit['App ID']), name: str_(hit['App Name']) };
    var id = nextId_(SH.APPS, 'App ID', 'APP-', 3);
    var row = { 'App ID': id, 'App Name': name, 'Company': 'CG – Chai Govindam', 'Department': dept || 'Operation', 'Section': 'General',
      'Type': 'App Link', 'URL': url || '', 'Visible To All': 'No', 'Visible To Roles': 'Outlet Incharge', 'SSO Enabled': 'No', 'Sort': 99,
      'Status': url ? 'Active' : 'Needs URL', 'Source': 'Credential import' };
    appendObj_(SH.APPS, row); apps = readObjs_(SH.APPS);
    return { id: id, name: name };
  }

  var existing = {};
  readObjs_(SH.APPCRED).forEach(function (r) { existing[str_(r['App ID']) + '|' + str_(r['Login ID']).toLowerCase() + '|' + str_(r['User ID'])] = r; });
  var add = [], upd = 0, now = new Date();
  var credIds = nextIds_(SH.APPCRED, 'Credential ID', 'CRD-', 4, 1500);
  function put(app, person, login, pw, notes, source, hints) {
    login = str_(login); if (!login) return;
    var uids = who(hints || {}); if (!uids.length) uids = [''];
    uids.forEach(function (uid) {
      var k = app.id + '|' + login.toLowerCase() + '|' + uid;
      var ex = existing[k];
      if (ex) {
        if (str_(ex['Password']) !== str_(pw)) {
          if (ex._row) { updateObj_(SH.APPCRED, ex._row, { 'Password': str_(pw), 'Updated At': now }); upd++; }
          else ex['Password'] = str_(pw);                 // added earlier in this same run — not written yet
        }
        return;
      }
      var row = { 'Credential ID': credIds.shift(), 'App ID': app.id, 'App Name': app.name, 'User ID': uid, 'Person Name': person,
        'Login ID': login, 'Password': str_(pw), 'Notes': notes || '', 'Source': source, 'Updated At': now };
      add.push(row); existing[k] = row;
    });
  }
  var doerNames = {};   // uid → [doer names / ids]

  // 1. checklists — Doer List (Name · Department · User ID · Password · Mobile No.) + Form Link tab
  checklists_().forEach(function (c) {
    try {
      var ss = extSS_(c.ssId);
      var fl = ss.getSheetByName('Form Link');
      if (fl && !c.url) {
        var v = fl.getRange(1, 1, Math.min(fl.getLastRow(), 5), Math.min(fl.getLastColumn(), 4)).getValues(), link = '';
        v.forEach(function (r) { r.forEach(function (x) { if (!link && /^https:\/\/script\.google\.com/.test(str_(x))) link = str_(x); }); });
        if (link) {
          var row = findObj_(SH.CHECKLISTS, 'Checklist ID', c.id);
          if (row) updateObj_(SH.CHECKLISTS, row._row, { 'Web App URL': link });
          c.url = link;
        }
      }
      var app = appFor(c.name, c.url, c.dept);
      var dl = ss.getSheetByName('Doer List');
      if (!dl || dl.getLastRow() < 2) return;
      var t = extRead_(c.ssId, 'Doer List', { headerRow: 1 }), H = t.head;
      var cn = col_(H, ['Name']), cu = col_(H, ['User ID', 'Email']), cp = col_(H, ['Password']), cm = col_(H, ['Mobile No.', 'Mobile']);
      var o = c.outletId ? outletById_(c.outletId) : null, n = 0;
      t.rows.forEach(function (r) {
        var nm = str_(r[cn]), id = cu >= 0 ? str_(r[cu]) : ''; if (!nm && !id) return;
        var hints = { name: nm, email: id, mobile: cm >= 0 ? str_(r[cm]) : '' };
        put(app, nm, id || nm, cp >= 0 ? r[cp] : '', c.name + ' doer', 'Doer List', hints);
        var u = who(hints);
        if (u.length === 1) (doerNames[u[0]] = doerNames[u[0]] || []).push(nm, id);
        n++;
      });
      out.push(c.name + ': ' + n);
    } catch (e) { out.push(c.name + ': ' + e.message); }
  });

  // 2. Outlet Order app users (User ID = mobile · PIN · Name · Outlet id · Short · Role · Status · Email)
  try {
    var t2 = extRead_(set_('Outlet Orders Sheet ID'), 'Users', { headerRow: 1 }), H2 = t2.head;
    var app2 = appFor('Order to Delivery', set_('Outlet Order App URL'), 'Operations');
    t2.rows.forEach(function (r) {
      var id = str_(r[col_(H2, ['User ID'])]).replace(/\.0$/, ''); if (!id) return;
      var o = outletByAny_(r[col_(H2, ['Outlet id', 'Outlet ID'])]) || outletByAny_(r[col_(H2, ['Outlet Short Name'])]);
      var nm = str_(r[col_(H2, ['Name'])]);
      var isPerson = !!byMob[id.replace(/\D/g, '').slice(-10)];
      var role2 = str_(r[col_(H2, ['Role'])]);
      put(app2, nm, id, str_(r[col_(H2, ['PIN'])]).replace(/\.0$/, ''), role2 + (o ? ' · ' + o.name : ''), 'Outlet Orders ▸ Users',
        { mobile: id, email: '', name: nm, outlet: (!isPerson && /^staff$/i.test(role2)) ? o : null });
    });
    out.push('Outlet Orders users');
  } catch (e) { out.push('Outlet Orders: ' + e.message); }

  // 3. Loan & Advance admin portal (Name · Username · Password · Role …)
  try {
    var t3 = extRead_(set_('Loan & Advance Sheet ID'), 'Admin Access', { headerRow: 1 }), H3 = t3.head;
    var la = apps.filter(function (a) { return /\?page=admin/.test(str_(a['URL'])); })[0];
    var app3 = la ? { id: str_(la['App ID']), name: str_(la['App Name']) } : appFor(LA_APP_NAME + ' — Admin Portal', '', 'HR');
    t3.rows.forEach(function (r) {
      var u = str_(r[col_(H3, ['Username'])]); if (!u) return;
      var st = col_(H3, ['Status']) >= 0 ? str_(r[col_(H3, ['Status'])]) : 'Active';
      if (st && !/active/i.test(st)) return;
      var locs = col_(H3, ['Incharge Outlet(s)']) >= 0 ? str_(r[col_(H3, ['Incharge Outlet(s)'])]) : '';
      put(app3, str_(r[col_(H3, ['Name'])]), u, r[col_(H3, ['Password'])], str_(r[col_(H3, ['Role'])]) + (locs ? ' · ' + locs : ''),
        'Loan & Advance ▸ Admin Access', { name: str_(r[col_(H3, ['Name'])]), outlet: /incharge/i.test(str_(r[col_(H3, ['Role'])])) ? outletByAny_(list_(locs)[0] || 'Pandri') : null });
    });
    out.push('Loan & Advance admins');
  } catch (e) { out.push('Loan & Advance: ' + e.message); }

  // 4. Stock Register & Vegetable app users (User ID · PIN · Name · Outlet · Role)
  try {
    var t4 = extRead_('1bcp53NSCkxAnyh2wiBqmOrOf9_Ii8D7hJz7BtNFBBIU', 'Users', { headerRow: 1 }), H4 = t4.head;
    var app4 = appFor('Stock Register & Vegetable Ordering', '', 'Operation');
    t4.rows.forEach(function (r) {
      var id = str_(r[col_(H4, ['User ID'])]); if (!id) return;
      var o = outletByAny_(r[col_(H4, ['Outlet'])]);
      var role4 = str_(r[col_(H4, ['Role'])]);
      put(app4, str_(r[col_(H4, ['Name'])]), id, r[col_(H4, ['PIN'])], role4 + (o ? ' · ' + o.name : ''), 'Veg sheet ▸ Users',
        { email: str_(r[col_(H4, ['Email'])]), outlet: /^staff$/i.test(role4) ? o : null });
    });
    out.push('Veg / Stock users');
  } catch (e) { out.push('Veg / Stock: ' + e.message); }

  // 5. DSR users (User Id · Password · Outlet Name · Edit Permission)
  try {
    var t5 = extRead_(set_('DSR Sheet ID'), 'Users', { headerRow: 1 }), H5 = t5.head;
    var app5 = appFor('Outlet Wise DSR', '', 'Accounts');
    t5.rows.forEach(function (r) {
      var id = str_(r[col_(H5, ['User Id', 'User ID'])]); if (!id) return;
      var o = outletByAny_(r[col_(H5, ['Outlet Name'])]);
      put(app5, o ? o.name + ' DSR' : id, id, r[col_(H5, ['Password'])], (o ? o.name : '') + ' · ' + str_(r[col_(H5, ['Edit Permission'])]), 'DSR ▸ Users', { outlet: o });
    });
    out.push('DSR users');
  } catch (e) { out.push('DSR: ' + e.message); }

  // 6. System Master department logins (Username · Password · Departments)
  try {
    var t6 = extRead_('1Ol74iL3R-8T1TliLFsF02ASLHrCMirlAVebnIWruYY8', 'UserRoles', { headerRow: 1 }), H6 = t6.head;
    var app6 = appFor('CG System Master', '', 'Admin / MDO');
    t6.rows.forEach(function (r) {
      var u = str_(r[col_(H6, ['Username'])]); if (!u) return;
      put(app6, u, u, r[col_(H6, ['Password'])], 'Departments: ' + str_(r[col_(H6, ['Departments'])]), 'System Master ▸ UserRoles', {});
    });
    out.push('System Master logins');
  } catch (e) { out.push('System Master: ' + e.message); }

  // 7. Tickets Tracker "   Id Passward"
  try {
    var ts = extSS_('1_3mc-7JRuFdWDR3a1EtuHehgeOv07aZkYf5ElGuAIhE').getSheets().filter(function (s) { return /pass/i.test(s.getName()); })[0];
    if (ts) {
      var t7 = extRead_('1_3mc-7JRuFdWDR3a1EtuHehgeOv07aZkYf5ElGuAIhE', ts.getName(), {}), H7 = t7.head;
      var cN = col_(H7, ['Name']), cI = col_(H7, ['User ID', 'ID', 'User', 'Email']), cP = col_(H7, ['Password', 'Passward', 'Pass']), cM = col_(H7, ['Mobile', 'Phone']);
      var app7 = appFor('Tickets Tracker (Pandri) — Google Sheet', 'https://docs.google.com/spreadsheets/d/1_3mc-7JRuFdWDR3a1EtuHehgeOv07aZkYf5ElGuAIhE/edit', 'Operation');
      t7.rows.forEach(function (r) {
        var id = cI >= 0 ? str_(r[cI]) : ''; if (!id) return;
        put(app7, cN >= 0 ? str_(r[cN]) : id, id, cP >= 0 ? r[cP] : '', 'Outlet checklist login', 'Tickets Tracker ▸ ' + ts.getName().trim(),
          { name: cN >= 0 ? str_(r[cN]) : '', email: id, mobile: cM >= 0 ? str_(r[cM]) : '' });
      });
      out.push('Tickets Tracker logins');
    }
  } catch (e) { out.push('Tickets Tracker: ' + e.message); }

  // 8. Pandri Training passcode (Config ▸ ADMIN_PASSCODE)
  try {
    var t8 = extRead_('1aBDWjxH6pKjxEeddLLLWrMnOTihq6ZvyWjVyw6Ly6D8', 'Config', { headerRow: 1 });
    var pass = ''; t8.rows.forEach(function (r) { if (str_(r[0]) === 'ADMIN_PASSCODE') pass = str_(r[1]); });
    if (pass) put(appFor('Pandri Training', '', 'Operation'), 'Pandri outlet', 'Passcode', pass, 'Single passcode for the training tracker', 'Pandri Training ▸ Config', { outlet: outletById_('OUT-001') });
    out.push('Pandri Training');
  } catch (e) { out.push('Pandri Training: ' + e.message); }

  if (add.length) appendObjs_(SH.APPCRED, add);

  // Checklist Doer Name on Access (only where it is blank)
  var filled = 0;
  Object.keys(doerNames).forEach(function (uid) {
    var a = findObj_(SH.ACCESS, 'User ID', uid);
    if (a && !str_(a['Checklist Doer Name'])) {
      updateObj_(SH.ACCESS, a._row, { 'Checklist Doer Name': uniq_(doerNames[uid].filter(String)).join(', ') }); filled++;
    }
  });
  if (filled) bumpGen_('users');
  return 'Credentials: ' + add.length + ' added, ' + upd + ' updated · checklist doer names filled for ' + filled + ' user(s) · ' + out.join(' · ');
}

/* ============================ AUDIT ============================ */
function runAudit_() {
  var found = [];
  function add(area, issue, detail, fix) { found.push([area, issue, detail, fix]); }

  if (!setRaw_('Attendance Sheet ID')) add('Settings', 'Attendance sheet not linked', 'The Attendance Report app is container-bound; its spreadsheet ID is not known.', 'Paste the ID of the spreadsheet that holds "Attendance Data" into Settings ▸ Attendance Sheet ID.');

  var logins = readObjs_(SH.LOGIN), accBy = {}, loginIds = {};
  readObjs_(SH.ACCESS).forEach(function (r) { accBy[str_(r['User ID'])] = r; });
  var noPw = logins.filter(function (r) { return /^active$/i.test(str_(r['Status'])) && !str_(r['Password']); });
  if (noPw.length) add('Login', noPw.length + ' active login(s) have no password', noPw.slice(0, 12).map(function (r) { return str_(r['Full Name']); }).join(', ') + (noPw.length > 12 ? ' …' : ''), 'Type their password on the Login tab (or User Management ▸ Set password).');
  logins.forEach(function (r) {
    var k = str_(r['Login ID']).toLowerCase(); if (!k) return;
    if (loginIds[k]) add('Login', 'Duplicate Login ID', str_(r['Login ID']) + ' is used by ' + loginIds[k] + ' and ' + str_(r['Full Name']), 'Give each person a unique Login ID.');
    loginIds[k] = str_(r['Full Name']);
    if (!accBy[str_(r['User ID'])]) add('Access', 'Login without an Access row', str_(r['User ID']) + ' ' + str_(r['Full Name']), 'Add the row (or save the user once in User Management).');
  });
  var roles = roles_().byNorm;
  Object.keys(accBy).forEach(function (u) { var rn = str_(accBy[u]['Role']); if (rn && !roles[norm_(rn)]) add('Access', 'Unknown role', u + ' has role "' + rn + '"', 'Pick a role that exists on the Roles tab.'); });

  var other = db_().getSheetByName(EMP_OTHER) ? readObjs_(EMP_OTHER) : [];
  try { if (other.length) add('Employees', other.length + ' employee(s) with a location that matches no outlet', other.slice(0, 10).map(function (r) { return str_(r['Employee ID']) + ' (' + str_(r['Location']) + ')'; }).join(', '), 'Add the location spelling to Outlets ▸ Aliases, then sync again.'); } catch (e) {}

  checklists_().forEach(function (c) {
    try {
      var t = extRead_(c.ssId, c.tab, { headerRow: 1, lastN: 5 }), k = chkCols_(t.head);
      if (k.actual < 0 || k.planned < 0 || k.taskId < 0) add('Checklists', c.name + ' is missing a column', 'Needs Task ID, Planned and Actual on tab ' + c.tab, 'Fix the header row of the checklist Master tab.');
      var lost = (db_().getSheetByName(SH.CHK_DOERS) ? readObjs_(SH.CHK_DOERS) : []).filter(function (r) { return str_(r['Checklist ID']) === c.id && !str_(r['User ID']); })
        .map(function (r) { return str_(r['Doer Name']) || str_(r['Doer Email']); });
      if (lost.length) add('Checklists', c.name + ': doers not linked to a login', uniq_(lost).join(', '), 'Access Control ▸ Checklist doers — link each one to the right person (or add their mobile to the Doer List).');
    } catch (e) { add('Checklists', c.name + ' cannot be read', e.message, 'Check the Spreadsheet ID and that the script owner can edit it.'); }
  });

  try {
    var dss = extSS_(set_('DSR Sheet ID'));
    outlets_().filter(function (o) { return o.type === 'Outlet'; }).forEach(function (o) {
      if (!o.dsrTab) add('Outlets', o.name + ' has no DSR tab', '', 'Fill Outlets ▸ DSR Tab.');
      else if (!dss.getSheetByName(o.dsrTab)) add('DSR', 'DSR tab "' + o.dsrTab + '" not found', o.name, 'Rename the tab or fix Outlets ▸ DSR Tab.');
    });
  } catch (e) { add('DSR', 'DSR workbook cannot be opened', e.message, 'Check Settings ▸ DSR Sheet ID.'); }

  try {
    var t2 = extRead_(set_('Outlet Orders Sheet ID'), 'Users', { headerRow: 1 }), c2 = col_(t2.head, ['Outlet id', 'Outlet ID']);
    t2.rows.forEach(function (r) { var v = str_(r[c2]); if (v && !outletByAny_(v)) add('Outlet Orders', 'User outlet id not in Outlets', str_(r[col_(t2.head, ['Name'])]) + ' → ' + v, 'Fix the Users tab of the Outlet Orders workbook or add an alias.'); });
    var t3 = extRead_(set_('Outlet Orders Sheet ID'), 'Outlets', {}), c3 = col_(t3.head, ['Outlet Name']);
    t3.rows.forEach(function (r) { var v = str_(r[c3]); if (v && !outletByAny_(v)) add('Outlet Orders', 'Outlet name not recognised', '"' + v + '"', 'Add it to Outlets ▸ Aliases.'); });
  } catch (e) {}

  readObjs_(SH.APPS).forEach(function (a) { if (!str_(a['URL']) && !/inactive/i.test(str_(a['Status']))) add('Apps', 'App without a link', str_(a['App ID']) + ' ' + str_(a['App Name']), 'Paste the web app URL into Apps ▸ URL.'); });

  try {
    var adv = laSS_().getSheetByName('Advance ' + monthLabel_());
    if (adv) { var R = laRead_(adv); if (advCols_(R.head).incSt < 0) add('Loan & Advance', 'This month\'s advance tab is in the old layout', adv.getName(), 'Open the Loan & Advance web app once — it upgrades the tab to v3.'); }
  } catch (e) {}

  // write only what is new
  var open = {};
  readObjs_(SH.MISMATCH).forEach(function (r) { if (!/fixed|ignore/i.test(str_(r['Status']))) open[str_(r['Area']) + '|' + str_(r['Issue']) + '|' + str_(r['Detail'])] = 1; });
  var fresh = found.filter(function (f) { return !open[f[0] + '|' + f[1] + '|' + f[2]]; });
  if (fresh.length) {
    var ids = nextIds_(SH.MISMATCH, 'Mismatch ID', 'MM-', 3, fresh.length), now = new Date();
    appendObjs_(SH.MISMATCH, fresh.map(function (f, i) {
      return { 'Mismatch ID': ids[i], 'Area': f[0], 'Issue': f[1], 'Detail': f[2], 'Suggested Fix': f[3], 'Found By': 'Audit', 'Found At': now, 'Status': 'Open' };
    }));
  }
  return 'Audit: ' + found.length + ' issue(s) found, ' + fresh.length + ' new — see the Mismatches tab.';
}

/* ============================ KNOWN MISMATCHES (from reading every app) ============================ */
function MISMATCH_SEED_() {
  return [
    ['Outlet codes', 'Chanderi short code differs', 'Outlet Order app uses "CD" (POCD… order numbers, Users row CG006/CD); the Stock Register & Vegetable app seeds "CH".', 'Use CD everywhere — change the Veg app Outlets tab to CD, or its GRN search will never match Chanderi orders.'],
    ['Outlet names', 'Same outlet spelt many ways', 'Employee master "P. Naka (CG002)", Order app Outlets "pachpedi Naka", DSR "Pachpedi Naka", Orders rows "CG Pachpedi Naka"; "Gol chowk " has a trailing space.', 'One Outlets tab (this workbook) now carries every alias; clean the source tabs when convenient.'],
    ['Outlet Orders', '"Outlet Name" column holds mixed values', 'Old rows hold CG001 / Shankar Nagar, new rows "CG Pandri"; April orders are numbered POCG… instead of POPN….', 'Matched here through aliases. Optional: normalise the historic rows.'],
    ['Outlet Orders', 'Users with invalid outlet ids', 'Srikant → CG0000, Prateek → HQ-001 (neither is in the Outlets tab); Manhar\'s User ID stored as text while others are numbers.', 'Add HQ/GFP rows to the Outlets tab of the Outlet Orders workbook, fix CG0000.'],
    ['Outlet Orders', 'Max Level and Item Request are only in the Outlet Order App', 'The Outlet Order App got Max Level (MaxLevel tab, Auto Fill = Max Level − Closing Stock) and Item Request on 29 Sep 2026, after its ordering was brought into One Login.', 'Done in 2.5.0: One Login ▸ Orders has the same New Order, Max Level, Closing Stock, Item Suggestion, Print, Order History and Dispatch on the same workbook.', 'Fixed'],
    ['Outlet Orders', 'Everyone shares PIN 123456 and a fixed approve token', 'Every Users row has PIN 123456; approve / reject links use token "cg2024" — anyone with the link can approve.', 'Now that the one-login app places orders, give the Order app real PINs or retire its own login; change the token in both places.'],
    ['Employee master', 'Department spelt twice', '"F&B PRODUCTION" (1 active employee) vs "F&B Production".', 'Correct the cell in CG EMPLOYEE MASTER. The Departments tab here keeps it as an alias meanwhile.'],
    ['Employee master', 'Ex-Employees keeps the code in "Outlet ID"', 'People who left carry their Employee Id in the "Outlet ID" column, and older rows hold bare location codes (CG005 used by 14 people).', 'Handled: moves and the sync use the code only when it has a dash (CG-00322). Rename the column to "Employee Id" when convenient.'],
    ['Loan & Advance', 'Outlet incharge was skipped on advances', 'September advances of Pandri staff show Incharge Status "-" and went straight to HR, because the form\'s Admin Access tab had no incharge for that outlet.', 'Fixed: every Outlet Incharge of One Login is written into Admin Access (menu), and requests HR has not touched yet also appear in the incharge\'s own queue here.'],
    ['Loan & Advance', 'Old advance tabs use 4-digit employee IDs', 'June 2026 rows hold CG-0084 / CG-0002 while the master uses CG-00084 / CG-00002.', 'Correct the IDs in the June tab if those rows are ever re-approved.'],
    ['Loan & Advance', 'Leave first-level approval is Pandri-only', 'The form writes Admin Decision (L1) = "-" for every location except Pandri (hard-coded CG001), so incharges of other outlets never receive leave requests.', 'One Login sends leave to the outlet\'s incharge for every outlet that has one (Settings ▸ Leave Incharge Step). Change _isPandri() in the old form the same way.'],
    ['Loan & Advance', 'Leave dates typed as text are read month-first', 'Some From / To dates are saved with day and month swapped (the sheet reads dates month-first, US style): Bhuneshwari Vishwakarma\'s leave of 9–10 Aug 2026 is stored as 8 Sep – 8 Oct, so she showed "on leave" all September.', 'Set File ▸ Settings ▸ Locale = India on the Loan & Advance sheet and correct those rows. One Login already reads each row the way that fits its Total Days and application date, and lists a person on leave only once.'],
    ['Attendance', 'Attendance IDs are 4-digit', 'The biometric file has CG-0001 while the master has CG-00001; some carry a letter O for zero (CG-O317).', 'Handled — IDs are normalised (CG-0001 = CG-00001) and ID Mapping covers the rest.'],
    ['Attendance', 'Only HQ, GFP and Pandri are in Location Rules', 'Chanderi is run by us (FOCO) but has no Location Rules row, so its staff are not in attendance or penalties yet. The franchise outlets (Pachpedi Naka, Gol Chowk, Shankar Nagar, Fafadih) need none — their staff are left out on purpose.', 'Add a Chanderi row under Attendance Manager ▸ Rules ▸ Locations (with its shifts and penalty rules) once its punches are in the upload.'],
    ['Salary Master', 'Month tabs differ in layout', 'JULY 2026 has no UNIFORM SECURITY DEPOSIT column; JUNE uses 30-day formulas, AUG 31; some rows hold typed totals instead of formulas.', 'Slips read every tab by its headers. New months are prepared in the AUG layout with the month\'s own number of days.'],
    ['Salary Master', 'Names differ from the employee master', '"ARIJEET JANGDE" vs "Arjeet Jangde", "NISHA BAIRAGE ||" … — the salary tab has no Employee ID column.', 'Salary Name Map tab links each salary name to an Employee ID (filled automatically, fix the rest from Salary Slips).'],
    ['Prep Kitchen', 'Time In / Time Out stored as text', 'Daily Entry holds "01-07-2026 04:49:43 AM" strings, and "Copy of Daily Entry" has 01-01-1970 (broken) dates.', 'Parsed here; store real dates in the Prep app when it is next changed.'],
    ['Prep Kitchen', 'No outlet column', 'Production rows cannot be split by outlet — Settings ▸ Prep Kitchen Outlet says whose they are (Pandri).', 'Add an Outlet column if a second prep kitchen starts.'],
    ['Vegetable sheet', 'No outlet column', 'The existing Vegetable Sheet is single-outlet; orders placed here are kept in "Veg Orders" with the outlet.', 'Use the one-login app for vegetable orders at every outlet.'],
    ['GRN', 'GFP receiving is not in One Login', 'GFP enters its GRNs in the separate GRN Entry app, which is not connected — the Directors\' GRN Summary shows GFP at 0.', 'Enter GFP GRNs in One Login (GRN & Stock Register), or share and link the GRN Entry sheet.'],
    ['Delegation', 'Doers are stored as "Name - Number"', 'Delegation Sheet NEW keeps the doer as the Doer List\'s last column ("Karan - 8818899003 / 6262655055").', 'Fixed in 2.6.0: delegated tasks live in the Delegated Tasks tab with the doer\'s User ID and Employee ID; open and recent tasks were copied once and the old sheet is not read any more.', 'Fixed'],
    ['Attendance', 'HQ and GFP had no penalty rules', 'Location Rules said Apply Penalty = Yes for HQ and GFP, but Penalty Rules had no HQ / GFP row and Shift Config no HQ / GFP shift, so nothing was ever charged there.', 'Fixed in 2.5.4: Pandri\'s rules copied for HQ and GFP from 1 Oct 2026, a 9:00 AM – 6:00 PM shift and Sunday week off.', 'Fixed'],
    ['HR Checklist', 'Every task was on Ajay Gupta', 'The HR Checklist Task List gave all 12 tasks to "Ajay Gupta" (hr@chaigovindam.com), so Aryan Tripathi and Manisha Aditya had none and Ajay saw theirs.', 'Fixed 21 Oct 2026: the old list was removed and the Task List holds the new 30 tasks (17 daily, 7 weekly, 6 monthly) for Aryan, Manisha and Ajay; this week\'s open rows of the old list were taken out of Master and today\'s, this week\'s and this month\'s rows of the new list were added.', 'Fixed'],
    ['HR Checklist', 'Monthly tasks of October were never generated', 'The Master tab has no M row for October 2026 (Salary Sheet, PF/ESIC …), so nobody was ever reminded of them.', 'October\'s six monthly rows were added by hand on 21 Oct 2026. Check on 1 Nov that the sheet\'s own trigger writes November\'s rows (salary sheet, PF/ESIC, uniform sheet …) that morning.'],
    ['Loan & Advance', 'September leaves rejected at the final step', '26 leaves of September 2026 have Final Status = REJECTED with no remark — 24 by Namit Goyal on 15 Oct 2026 and 2 by Super Admin; 17 of them were approved at the first step (e.g. Sangeeta Mahilang 9–11 Sep). Those days count as unapproved leave.', 'If they were meant to be approved: Approvals ▸ Tracking ▸ Month = September 2026 ▸ Leave Tracking ▸ the leave ▸ Change to approved, with the reason (HR or Leave — final decision).'],
    ['Loan & Advance', 'Leave filed under an old Employee ID', 'Kabir Vaishya\'s leave is filed under CG-00344; he is HQ-00025 in the employee master now.', 'Handled in 2.7.0: a leave whose ID is not in the master is matched by name. Use the current ID on new applications.'],
    ['Roster', 'Pandri roster IDs differ from the master', 'Daily Staff Duty Roster 23 Oct 2026: Gauri Sunani CG-0300 (master CG-00313), Praveena (SP Chai) CG-0317 (master Pravina CG-00315), Dageshwari CG-0329 (master CG-00330), Pooja Pal CG-0000 (master CG-00345).', 'Their own timings were saved under the master IDs. Correct the IDs on the roster sheet.'],
    ['Employee master', 'The same Employee Id given to several joiners', 'From 28 Sep 2026 the Chanderi joining forms were filled with the e-mail ABCD@Gmail.com; the form reused the code of the first person with that e-mail, so CG-00373 went to 8 joiners (six were renumbered by hand; Tikeshwari Sahu and Doman Dhurve still had it, with Hemlata Baghel).', 'Fixed in 2.8.0: a code is reused only for the same person (Aadhar, or mobile + name) and an approval never overwrites someone else\'s row. Live master, 24 Oct 2026: Tikeshwari Sahu → CG-00383, Doman Dhurve → CG-00384, Hemlata Baghel keeps CG-00373; their document folders were renamed. Enrol the two in Petpooja with the new codes.', 'Fixed'],
    ['Employee master', 'No current salary', 'Vashu Verma (CG-00382) and Doman Dhurve (CG-00384) have no Current Salary, so their unapproved leave is charged at the fixed Rs 200.', 'Fill Current Salary in the employee master; the 2× daily wage then applies.'],
    ['Employee master', 'Placeholder e-mail', '10 active Chanderi employees have ABCD@Gmail.com as their e-mail.', 'Put their own e-mail, or leave the cell blank.'],
    ['Login tab', 'Two logins for some Chanderi staff', 'Old logins with CGC- codes (CGC-00336, 00352, 00353, 00355, 00356, 00358, 00359) are still Active next to the CG- ones.', 'Set the CGC- rows to Inactive in User Management.'],
    ['Employee master ▸ Ex-Employees', 'The same person twice', 'Girja Verma, Jyoti Kumari, Muskan, Jyoti, Anjali Thakur, Aanchal Sahu and Bhumika Gond are on Ex-Employees twice; Shweta Masih (CG-00368) is there twice although she is active in the master, and Kumeshwari Vishwakarma\'s second joining (Kumeshvari, CG-00367) is there too.', 'Delete the second rows, and the Ex-Employees rows of Shweta Masih and Kumeshvari.'],
    ['Access tab', 'EA login was Staff', 'Mamta Chaudhary (Executive Assistant) had Role = Staff and Outlet Access = OUT-001, OUT-007.', 'Set to Role = Executive Assistant and Outlet Access = ALL by the 2.7.0 Setup. Hide any section from her in User Management ▸ her login ▸ Sections.', 'Fixed'],
    ['EA Checklist', 'Dates in the Doer List', 'The EA Checklist Doer List has about 60 rows with dates (Tue Jun 30 2026 …) and a test row "fsj" in the Name column; they show as "Not linked" in Checklist Doers.', 'Delete those rows from the EA Checklist Doer List; only Mamta Chaudhary is a real doer.'],
    ['Attendance', 'HQ staff without punches', 'Ajay Kumar Gupta (HQ-00012) has no punch on any uploaded October day and Pinaki Roy (HQ-00021) punches on few days, so those working days count as unapproved leave.', 'If they do not punch by design, HR waives the days in Payroll ▸ Penalty; otherwise they punch in or apply for leave.'],
    ['Apps', 'Links missing from the System Master', 'Outlet Wise DSR web app and Stock Register & Vegetable app are not recorded anywhere.', 'Paste the URLs into the Apps tab (rows are created with Status "Needs URL").'],
    ['Checklists', 'Doers are first names only', 'Master rows say "Umesh", "Anchal"; their emails (umesh@chaigovindam.com) are not in the employee master, which holds personal emails.', 'Checklist Doers tab links every doer to a login (mobile › email › name); link the rest by hand in Access Control ▸ Checklist doers.'],
    ['Checklists', 'Duplicate Task IDs', 'Cashier Checklist Master has CC-3199 twice.', 'Harmless here (rows are matched by Task ID + row), but fix the generator.'],
    ['Security', 'Plain-text passwords in many apps', 'System Master admin@123 and 10 department passwords, Pandri Training passcode cg2026, Loan & Advance Admin Access, checklist Doer Lists.', 'All collected in "App Credentials" (visible only to MIS / Directors). Retire them app by app — checklists, attendance, employees, leave/advance and posters already need no other login.'],
    ['Attendance (Petpooja)', 'Chanderi IDs in Petpooja differ from the master', 'CG00385 TIKESHARI SAHU is Tikeshwari Sahu (CG-00383); CG00386 DOMAN DHURVE is Doman Dhurve (CG-00384); CG00389 PUSHPLATA is CG-00385; CG00390 PRABHA is CG-00386; CG-000377 BARKHA AZAD is CG-00375. The master IDs CG-00383 / 00385 / 00386 / 00375 belong to other people in Petpooja.', 'Handled from 2.9.2 — an ID counts only when the name is close. Correct the codes in Petpooja so they match the master.'],
    ['Attendance (Petpooja)', 'People in Petpooja who are not in the master', 'CG-000383 Bhumika Saytode, CG00375 Love Kumar, CG-00375 Deepak Chandrakar, HQ-00026 Pooja Patel (HR Intern), Nitesh Mandal (346, CG-00383, CG-387).', 'Add them to the employee master (or mark them Inactive in Petpooja). Until then they are listed as not matched.'],
    ['Attendance (Petpooja)', 'Mahfooz has a different code in Petpooja', 'Petpooja HQ-00027 = Sayyed Mahfooz Alam; the master has him as HQ-00026, which Petpooja gives to Pooja Patel.', 'Handled from 2.9.2 (matched by name). Correct the code in Petpooja.'],
    ['Attendance workbook', 'Days with only one of the two Petpooja files', 'The second upload of a day replaced the first before 2.9.2: 1, 11, 12, 14, 15 and 27 Oct 2026 have only the Chanderi file; 17 – 26 Oct and September only the HQ · GFP · Pandri file.', 'Upload the missing file of those days with its own button (Payroll ▸ Upload attendance); the other file stays.'],
    ['Roster', 'Roster shift times differ from Shift Config', 'Shifts tab: S1 04:00 – 13:00, S2 14:00 – 23:00. Attendance ▸ Shift Config (Pandri, Chanderi): Shift 1 4:00 – 14:00, Shift 2 13:00 – 23:00.', 'From 2.9.2 the roster timing decides late / early when a roster is made. Make the two lists the same, or use Manual timing on the roster.'],
    ['Wastage sheet', 'Placeholder employee IDs', 'Wastage Users: Tikeshwar and Pradeep both "CG-00000".', 'Use their real Employee IDs.'],
    ['Delegation', 'Name stored as "Name - Number"', 'The old Delegation sheet stores the doer as one text; matched here by name or mobile.', 'New tasks go to "Delegated Tasks" with User IDs.'],
    ['Portals', 'Three portals overlap', 'CG Master Management Portal, System Master (QuickAccess) and this one-login app all do login + app links.', 'Keep this one as the single door; point the others\' users here.']
  ];
}
