/*************************************************************************
 *  Employees.gs — the Employee Manager app, inside One Login.
 *
 *  Works directly on "CG Employee Detail NEW" (Settings ▸ Employee Master
 *  Sheet ID) — the same tabs the old app and its onEdit mover use:
 *    CG EMPLOYEE MASTER · Under Review · Ex-Employees ·
 *    Employees With Asset · SALARY BREAKUP · Move Log
 *
 *    My Profile (everyone)   their own row, WITHOUT salary; bank and ID
 *                            numbers masked; documents open through the app
 *    Employees  (HR)         search & edit, status moves (Active ⇄ Ex),
 *                            new joinings (approve with location / reject),
 *                            documents to the HR Documents folder, assets,
 *                            PF / salary breakup, move log
 *    Joining form (public)   web app link + ?page=join → "Under Review"
 *
 *  Every write re-finds the person by Employee Id + Name first, so a row
 *  that moved (another edit, a sort, a filter) can never be overwritten.
 *************************************************************************/

var EM = { REVIEW: 'Under Review', EX: 'Ex-Employees', ASSETS: 'Employees With Asset', SALARY: 'SALARY BREAKUP', LOG: 'Move Log' };
var EM_DOCS = { 'Aadhar Card Front (Link)': 'Aadhar Card Front', 'Aadhar Card Back (Link)': 'Aadhar Card Back',
  'Pan Card Upload (Link)': 'Pan Card', 'Additional Documents (Links)': 'Additional Documents' };
var EM_REVIEW_COLS = ['Status', 'Employee Id', 'Name', 'Designation', 'Department', 'Phone No.', 'Date Of Joining', 'Aadhar Card', 'Pan',
  "Father/Husband's Name", 'Highest Qualification', 'Date of Birth', 'Gender', 'Blood Group', 'Shirt Size', 'Trouser Size', 'Shoe Size',
  'Bank Name', 'AC Num', 'IFSC', 'Email Address', "Father's Phone Number", 'Permanent Address', 'Current Address', 'IT Equipment',
  'PF Applicable', 'Aadhar Card Front (Link)', 'Aadhar Card Back (Link)', 'Pan Card Upload (Link)', 'Additional Documents (Links)'];
var EM_ASSET_COLS = ['Employee Id', 'Name', 'Current Location', 'Designation', 'Department', 'SIM', 'Sim Number', 'Phone', 'Item Code (Phone)', 'PC/Laptop/Tablet', 'Item Code (PC)'];
var EM_SALARY_COLS = ['Status', 'Location', 'Employee Id', 'Name', 'Designation', 'Department', 'Phone No.', 'Actual Current Salary', 'PF (Yes/No)',
  'BASIC SALARY', 'All Allowance', 'Food Charges', 'House Rent Charges', 'PF (12%)', 'ESIC (0.75%)', 'Advance', 'Refund of PF & ESIC Amount', 'Net Salary'];
var EM_LOG_COLS = ['Timestamp', 'Action', 'Employee Id', 'Name', 'From Sheet', 'To Sheet', 'Details'];
var EM_LOCATIONS = ['Bhanpuri (HQ)', 'Bhanpuri (GFP)', 'Pandri (CG001)', 'P. Naka (CG002)', 'Gol Chowk (CG003)', 'Shankar Nagar (CG004)', 'Fafadih (CG005)', 'Chanderi (CG006)'];
/** Never shown on My Profile. */
var EM_PRIVATE = /salary|net salary|basic|allowance|advance|pf \(|esic|refund/i;

/* ============================ WORKBOOK ============================ */
function emSS_() { return extSS_(set_('Employee Master Sheet ID')); }
function emMasterName_() { return set_('Employee Master Tab', 'CG EMPLOYEE MASTER'); }
function emTab_(name, cols) {
  var ss = emSS_(), sh = ss.getSheetByName(name);
  if (!sh) {
    if (!cols) throw new Error('Tab "' + name + '" not found in the employee workbook.');
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#6B3F1C').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}
function emHead_(sh) { var lc = sh.getLastColumn(); return lc < 1 ? [] : sh.getRange(1, 1, 1, lc).getValues()[0].map(str_); }
function emIdx_(head, name) { var t = str_(name).toLowerCase(); if (!t) return -1; for (var i = 0; i < head.length; i++) if (head[i].toLowerCase() === t) return i; return -1; }
function emVal_(head, vals, name) { var i = emIdx_(head, name); return i < 0 || i >= vals.length ? '' : str_(vals[i]); }
/** True last data row — never below real data (a blank Name at the bottom cannot fool it). */
function emLastRow_(sh) {
  var last = sh.getLastRow(), head = emHead_(sh), ni = emIdx_(head, 'Name'), nameLast = 1;
  if (ni >= 0 && last > 1) {
    var v = sh.getRange(1, ni + 1, last, 1).getValues();
    for (var r = v.length - 1; r >= 1; r--) if (str_(v[r][0]) !== '') { nameLast = r + 1; break; }
  }
  return Math.max(nameLast, last, 1);
}
function emRead_(name, opt) {
  opt = opt || {};
  __M.em = __M.em || {};
  if (__M.em[name] && !opt.fresh) return __M.em[name];
  var sh = emSS_().getSheetByName(name);
  if (!sh) return { sh: null, head: [], rows: [] };
  var head = emHead_(sh), lr = sh.getLastRow(), rows = [];
  if (lr >= 2 && head.length) {
    var vals = sh.getRange(2, 1, lr - 1, head.length).getValues();
    vals.forEach(function (v, i) {
      if (!v.some(function (c) { return str_(c) !== ''; })) return;
      rows.push({ row: i + 2, vals: v });
    });
  }
  __M.em[name] = { sh: sh, head: head, rows: rows };
  return __M.em[name];
}
function emDrop_(name) { if (__M.em) delete __M.em[name]; }
/**
 * The web app shows ACTIVE employees only: rows of the CG EMPLOYEE MASTER whose Status is not Inactive / Left / Ex.
 * Ex-Employees (and inactive rows) stay in the workbook for the records — they are just not shown here any more.
 */
var EM_GONE_RE = /^(inactive|left|ex|ex-employee|resigned|terminated|absconded)$/i;
function emLive_(head, vals) { return !EM_GONE_RE.test(emVal_(head, vals, 'Status')); }
function emActiveRows_(R) { return (R.rows || []).filter(function (r) { return emLive_(R.head, r.vals); }); }
/** CG-0001, CG-00001 and CG 1 are the same person. */
function emIdKey_(id) { var s = str_(id).toUpperCase().replace(/\s+/g, ''), m = /^([A-Z]+)\D*0*(\d+)$/.exec(s); return m ? m[1] + m[2] : s; }
/**
 * Side tabs (assets, PF / salary breakup): a row is hidden when its person is an ex-employee (on Ex-Employees and not
 * back on the master) or is marked inactive. Rows that match nobody stay — they may use an old ID format.
 */
function emGoneIds_() {
  if (__M.emGone) return __M.emGone;
  var M = emRead_(emMasterName_()), live = {}, gone = {};
  M.rows.forEach(function (r) {
    var k = emIdKey_(emVal_(M.head, r.vals, 'Employee Id')); if (!k) return;
    if (emLive_(M.head, r.vals)) live[k] = 1; else gone[k] = 1;
  });
  var X = emRead_(EM.EX);
  X.rows.forEach(function (r) { var k = emIdKey_(emVal_(X.head, r.vals, 'Outlet ID') || emVal_(X.head, r.vals, 'Employee Id')); if (k && !live[k]) gone[k] = 1; });
  Object.keys(live).forEach(function (k) { delete gone[k]; });
  return (__M.emGone = gone);
}
function emShownRow_(head, vals) {
  if (EM_GONE_RE.test(emVal_(head, vals, 'Status'))) return false;
  var k = emIdKey_(emVal_(head, vals, 'Employee Id'));
  return !k || !emGoneIds_()[k];
}
function emIdentity_(head, vals) { return { id: emVal_(head, vals, 'Employee Id') || emVal_(head, vals, 'Outlet ID'), name: emVal_(head, vals, 'Name') }; }
function emUnique_(id) { return !!id && String(id).indexOf('-') !== -1; }
function emRowMatches_(sh, row, exp) {
  if (!exp) return true;
  if (row < 2 || row > sh.getLastRow()) return false;
  var head = emHead_(sh), a = emIdentity_(head, sh.getRange(row, 1, 1, head.length).getValues()[0]);
  var eId = str_(exp.id), eNm = str_(exp.name);
  if (emUnique_(eId)) return a.id === eId;
  return a.id === eId && a.name === eNm && (eId !== '' || eNm !== '');
}
/** The row the expected person is really on now, or -1 (gone / ambiguous). */
function emResolve_(sh, hint, exp) {
  if (emRowMatches_(sh, hint, exp)) return hint;
  if (!exp || (!exp.id && !exp.name)) return -1;
  var head = emHead_(sh), ii = emIdx_(head, 'Employee Id'), ai = emIdx_(head, 'Outlet ID'), ni = emIdx_(head, 'Name'), last = emLastRow_(sh);
  if (last < 2) return -1;
  var data = sh.getRange(2, 1, last - 1, head.length).getValues(), wantId = str_(exp.id), wantNm = str_(exp.name), hits = [];
  for (var i = 0; i < data.length && hits.length < 2; i++) {
    var rid = (ii >= 0 && str_(data[i][ii])) ? str_(data[i][ii]) : (ai >= 0 ? str_(data[i][ai]) : ''), rnm = ni >= 0 ? str_(data[i][ni]) : '';
    if (emUnique_(wantId)) { if (rid === wantId) hits.push(i + 2); }
    else if (wantId && wantNm) { if (rid === wantId && rnm === wantNm) hits.push(i + 2); }
    else if (wantNm && rnm === wantNm) hits.push(i + 2);
  }
  return hits.length === 1 ? hits[0] : -1;
}
function emMustResolve_(sh, hint, exp, what) {
  var r = emResolve_(sh, Number(hint), exp);
  if (r < 0) throw new Error('Safety stop: "' + ((exp && (exp.name || exp.id)) || 'row ' + hint) + '" is no longer where the screen thought (' + (what || 'this change') + '). Refresh and try again.');
  return r;
}
function emBuildRow_(srcHead, srcVals, tgtHead, over) {
  var row = new Array(tgtHead.length).fill('');
  tgtHead.forEach(function (c, t) {
    if (!c) return;
    if (over && over.hasOwnProperty(c)) { row[t] = over[c]; return; }
    var s = emIdx_(srcHead, c);
    if (s >= 0 && s < srcVals.length) row[t] = srcVals[s];
  });
  return row;
}
/** Writes a row even when a strict dropdown (e.g. Gender) would reject a blank. */
function emWrite_(sh, row, vals) {
  emTextCols_(sh, row, emHead_(sh));
  var rg = sh.getRange(row, 1, 1, vals.length);
  try { rg.setValues([vals]); return; } catch (e) {}
  try { rg.clearDataValidations(); } catch (e) {}
  rg.setValues([vals]);
  if (row !== 2 && sh.getLastRow() >= 2) {
    try { sh.getRange(2, 1, 1, vals.length).copyTo(rg, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false); } catch (e) {}
  }
}
/** Long numbers (bank account, Aadhar, mobile) must stay text — a number would lose digits. */
var EM_TEXT_COLS = /^(ac num|aadhar card|pan|phone no\.?|father's phone number|sim number|employee id|outlet id|ifsc|phone)$/i;
function emTextCols_(sh, row, head) {
  head.forEach(function (h, i) { if (EM_TEXT_COLS.test(h)) { try { sh.getRange(row, i + 1).setNumberFormat('@'); } catch (e) {} } });
}
function emAppend_(sh, vals) {
  var at = emLastRow_(sh) + 1;
  if (at > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), at - sh.getMaxRows());
  var w = Math.min(vals.length, sh.getMaxColumns());
  if (at > 2 && sh.getLastRow() >= 2) {
    try { sh.getRange(2, 1, 1, sh.getLastColumn()).copyTo(sh.getRange(at, 1, 1, sh.getLastColumn()), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false); } catch (e) {}
  }
  emWrite_(sh, at, vals.slice(0, w));
  return at;
}
/** Deletes a row even with a filter switched on (the filter is put back). */
function emDelete_(sh, row) {
  try { sh.deleteRow(row); return; } catch (e) { if (String(e.message || '').indexOf('filter') < 0) throw e; }
  var a1 = '';
  try { var f = sh.getFilter(); if (f) { a1 = f.getRange().getA1Notation(); f.remove(); } } catch (e) {}
  sh.deleteRow(row);
  if (a1) { try { var o = sh.getRange(a1); sh.getRange(o.getRow(), o.getColumn(), Math.max(sh.getMaxRows() - o.getRow() + 1, 1), o.getNumColumns()).createFilter(); } catch (e) {} }
}
function emFindIdRow_(sh, col, id) {
  if (!emUnique_(id)) return -1;
  var head = emHead_(sh), ci = emIdx_(head, col), last = emLastRow_(sh);
  if (ci < 0 || last < 2) return -1;
  var v = sh.getRange(2, ci + 1, last - 1, 1).getValues();
  for (var i = 0; i < v.length; i++) if (str_(v[i][0]) === str_(id)) return i + 2;
  return -1;
}
function emLog_(ctx, action, id, name, from, to, details) {
  try {
    var sh = emTab_(EM.LOG, EM_LOG_COLS);
    sh.appendRow([new Date(), action, id || '', name || '', from || '', to || '', (details || '') + (ctx ? ' · by ' + ctx.name + ' (One Login)' : '')]);
  } catch (e) {}
}
/** Values safe for the browser (dates → dd/MM/yyyy, numbers kept readable). */
function emSafe_(head, vals) {
  var o = {};
  head.forEach(function (h, i) {
    if (!h) return;
    var v = vals[i];
    if (v instanceof Date) o[h] = fmt_(v, 'dd/MM/yyyy');
    else if (typeof v === 'number') o[h] = /phone|ac num|aadhar|sim number/i.test(h) ? String(Math.round(v)) : String(v);
    else o[h] = str_(v);
  });
  return o;
}
function emFileId_(url) { var m = str_(url).match(/[-\w]{25,}/); return m ? m[0] : ''; }
function emMask_(v, keep) { var s = str_(v).replace(/\s+/g, ''); if (!s) return ''; keep = keep || 4; return s.length <= keep ? s : new Array(s.length - keep + 1).join('•') + s.slice(-keep); }
function emTitle_(s) { return str_(s).toLowerCase().replace(/(?:^|\s)\S/g, function (c) { return c.toUpperCase(); }); }

/* ============================ MY PROFILE (no salary) ============================ */
function emFindMine_(ctx) {
  var id = str_(ctx.empId);
  if (!id) throw new Error('Your login is not linked to an Employee ID — please contact HR.');
  var key = atNormId_(id), tabs = [emMasterName_()];
  for (var t = 0; t < tabs.length; t++) {
    var R = emRead_(tabs[t]); if (!R.sh) continue;
    for (var i = 0; i < R.rows.length; i++) {
      var who = emIdentity_(R.head, R.rows[i].vals);
      if (who.id && (who.id.toUpperCase() === id.toUpperCase() || atNormId_(who.id) === key)) return { tab: tabs[t], head: R.head, vals: R.rows[i].vals, row: R.rows[i].row };
    }
  }
  return null;
}
function profMe_(ctx) {
  var me = emFindMine_(ctx);
  if (!me) throw new Error('Your record (' + ctx.empId + ') was not found in the employee master — please contact HR.');
  var v = emSafe_(me.head, me.vals), g = function (k) { return v[k] || ''; };
  var groups = [
    { title: 'Work', icon: 'badge', rows: [['Employee ID', g('Employee Id') || g('Outlet ID')], ['Designation', g('Designation')], ['Department', g('Department')],
      ['Location', g('Location')], ['Date of joining', g('Date Of Joining')], ['Status', me.tab === EM.EX ? 'Ex-employee' : (g('Status') || 'Active')],
      ['PF applicable', g('PF Applicable')], ['IT equipment', g('IT Equipment')]] },
    { title: 'Contact', icon: 'call', rows: [['Mobile', g('Phone No.')], ['Email', g('Email Address')], ["Father's / Husband's name", g("Father/Husband's Name")],
      ["Father's phone", g("Father's Phone Number")]] },
    { title: 'Personal', icon: 'person', rows: [['Date of birth', g('Date of Birth')], ['Gender', g('Gender')], ['Blood group', g('Blood Group')],
      ['Qualification', g('Highest Qualification')], ['Shirt size', g('Shirt Size')], ['Trouser size', g('Trouser Size')], ['Shoe size', g('Shoe Size')]] },
    { title: 'Address', icon: 'home', rows: [['Permanent address', g('Permanent Address')], ['Current address', g('Current Address')]] },
    { title: 'Bank & identity', icon: 'account_balance', rows: [['Bank', g('Bank Name')], ['Account no.', emMask_(g('AC Num'))], ['IFSC', g('IFSC')],
      ['Aadhar', emMask_(g('Aadhar Card'))], ['PAN', emMask_(g('Pan'), 3)]] }
  ];
  groups.forEach(function (gr) { gr.rows = gr.rows.filter(function (r) { return r[1] !== '' && !EM_PRIVATE.test(r[0]); }); });
  var docs = [];
  Object.keys(EM_DOCS).forEach(function (col) {
    list_(str_(v[col]).replace(/\n/g, ',')).forEach(function (u, i) { if (emFileId_(u)) docs.push({ col: col, i: i, label: EM_DOCS[col] + (col.indexOf('Additional') === 0 ? ' ' + (i + 1) : '') }); });
  });
  var assets = [];
  try {
    var A = emRead_(EM.ASSETS);
    A.rows.forEach(function (r) {
      var o = emSafe_(A.head, r.vals);
      if (atNormId_(o['Employee Id']) !== atNormId_(ctx.empId)) return;
      if (o['Phone']) assets.push(['Phone', o['Phone'] + (o['Item Code (Phone)'] ? ' (' + o['Item Code (Phone)'] + ')' : '')]);
      if (o['SIM'] || o['Sim Number']) assets.push(['SIM', o['Sim Number'] || o['SIM']]);
      if (o['PC/Laptop/Tablet']) assets.push(['PC / Laptop', o['PC/Laptop/Tablet'] + (o['Item Code (PC)'] ? ' (' + o['Item Code (PC)'] + ')' : '')]);
    });
  } catch (e) {}
  if (assets.length) groups.push({ title: 'Company assets with you', icon: 'devices', rows: assets });
  return { name: g('Name') || ctx.name, empId: ctx.empId, designation: g('Designation'), location: g('Location'), groups: groups, docs: docs,
    login: { uid: ctx.uid, role: ctx.role, outlet: ctx.homeName }, note: 'Something wrong? Ask HR to correct it in the employee master.' };
}
function profDoc_(ctx, d) {
  var me = emFindMine_(ctx);
  if (!me || !EM_DOCS[str_(d.col)]) throw new Error('Document not found.');
  var urls = list_(emVal_(me.head, me.vals, str_(d.col)).replace(/\n/g, ','));
  return emFileOut_(urls[Number(d.i) || 0], EM_DOCS[str_(d.col)]);
}
function emFileOut_(url, title) {
  var id = emFileId_(url);
  if (!id) throw new Error('No file is attached.');
  var f = DriveApp.getFileById(id), blob = f.getBlob(), size = f.getSize();
  var out = { name: title || f.getName(), mime: blob.getContentType(), size: size, url: f.getUrl() };
  if (size <= 7 * 1048576) out.data = Utilities.base64Encode(blob.getBytes());
  return out;
}

/* ============================ HR: OVERVIEW & SEARCH ============================ */
function empMeta_() {
  var desigs = readObjs_(SH.DESIGS).filter(function (r) { return str_(r['Designation']) && !/inactive/i.test(str_(r['Status'])); })
    .map(function (r) { return { name: str_(r['Designation']), dept: str_(r['Department']), prefix: str_(r['Code Prefix']).toUpperCase() || 'CG' }; });
  var depts = readObjs_(SH.DEPTS).filter(function (r) { return str_(r['Department Name']) && !/inactive/i.test(str_(r['Status'])); }).map(function (r) { return str_(r['Department Name']); });
  var locs = EM_LOCATIONS.slice();
  outlets_().forEach(function (o) { if (o.location && locs.indexOf(o.location) < 0 && o.active) locs.push(o.location); });
  return { designations: desigs, departments: depts, locations: locs };
}
function empStats_(ctx) {
  var ck = 'emp_stats_' + gen_('empx') + '.' + gen_('emps') + '.' + gen_('data'), hit = __M.fresh ? null : cacheGetJ_(ck);
  if (hit) { hit.joinUrl = appUrl_() ? appUrl_() + '?page=join' : ''; return hit; }
  var res = empStatsRead_(ctx);
  cachePutJ_(ck, res, 120);
  return res;
}
function empStatsRead_(ctx) {
  var M = emRead_(emMasterName_()), U = emRead_(EM.REVIEW), live = emActiveRows_(M);
  var byLoc = {}, joiners = 0, month = fmt_(new Date(), 'yyyy-MM');
  live.forEach(function (r) {
    var o = emSafe_(M.head, r.vals), ol = outletByAny_(o['Location']), l = ol ? ol.name : (o['Location'] || '—');   // HQ, GFP, Pandri …
    byLoc[l] = (byLoc[l] || 0) + 1;
    var dj = parseAny_(r.vals[emIdx_(M.head, 'Date Of Joining')]);
    if (dj && fmt_(dj, 'yyyy-MM') === month) joiners++;
  });
  var pending = U.rows.filter(function (r) { return /^pending$/i.test(emVal_(U.head, r.vals, 'Status')); }).length;
  var noDocs = live.filter(function (r) { return !emVal_(M.head, r.vals, 'Aadhar Card Front (Link)'); }).length;
  var url = appUrl_();
  return { active: live.length, pending: pending, joiners: joiners, noDocs: noDocs,
    byLocation: Object.keys(byLoc).sort().map(function (k) { return { location: k, count: byLoc[k] }; }), meta: empMeta_(),
    joinUrl: url ? url + '?page=join' : '', joinOpen: setYes_('Joining Form Enabled'), sheetUrl: emSS_().getUrl() };
}
/** d = { q } — searches every column of the ACTIVE employees, like the old HR panel (ex-employees are not shown). */
function empSearch_(ctx, d) {
  var q = str_(d.q).toLowerCase(), out = [], heads = {};
  [emMasterName_()].forEach(function (t) {
    var R = emRead_(t); if (!R.sh) return;
    heads[t] = R.head.filter(String);
    emActiveRows_(R).forEach(function (r) {
      var v = emSafe_(R.head, r.vals);
      if (q && !Object.keys(v).some(function (k) { return String(v[k]).toLowerCase().indexOf(q) >= 0; })) return;
      out.push({ sheet: t, row: r.row, values: v, id: v['Employee Id'] || v['Outlet ID'] || '', name: v['Name'] || '' });
    });
  });
  var total = out.length;
  if (out.length > 400) out = out.slice(0, 400);
  return { results: out, total: total, heads: heads, master: emMasterName_(), meta: empMeta_() };
}
function empSheetOk_(name) {
  var ok = [emMasterName_(), EM.ASSETS, EM.SALARY];
  if (ok.indexOf(name) < 0) throw new Error('That tab cannot be edited here: ' + name);
}
/** Edits cells of one person's row. Status is changed only through empStatus_ (it moves the row). */
function empSave_(ctx, d) {
  var sheet = str_(d.sheet); empSheetOk_(sheet);
  if (sheet === EM.SALARY && !can_(ctx, 'payroll')) throw new Error('Only payroll can edit the salary breakup.');
  var ups = d.updates || {};
  delete ups['Status']; delete ups['Employee Id']; delete ups['Outlet ID'];
  Object.keys(ups).forEach(function (k) { if (EM_DOCS[k]) delete ups[k]; });
  if (!Object.keys(ups).length) throw new Error('Nothing to save.');
  return lock_(function () {
    var sh = emTab_(sheet), row = emMustResolve_(sh, d.row, d.expected, 'this edit'), head = emHead_(sh), n = 0;
    Object.keys(ups).forEach(function (k) {
      var c = emIdx_(head, k); if (c < 0) return;
      if (sheet === emMasterName_() && /salary/i.test(k) && !can_(ctx, 'payroll')) return;
      var v = ups[k], cell = sh.getRange(row, c + 1);
      if (/date|birth|joining/i.test(k) && /^\d{4}-\d{2}-\d{2}$/.test(str_(v))) v = isoToDate_(v);
      else if (/date|birth|joining/i.test(k) && /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(str_(v))) v = parseAny_(v) || v;
      if (EM_TEXT_COLS.test(k)) { try { cell.setNumberFormat('@'); } catch (e) {} v = str_(v); }
      try { cell.setValue(v); } catch (e) { cell.clearDataValidations(); cell.setValue(v); }
      n++;
    });
    emDrop_(sheet);
    var who = emIdentity_(head, sh.getRange(row, 1, 1, head.length).getValues()[0]);
    emLog_(ctx, 'EDIT', who.id, who.name, sheet, sheet, 'Fields updated: ' + Object.keys(ups).join(', '));
    bumpGen_('emps');
    return { message: n + ' field(s) saved for ' + who.name + '.', row: row };
  });
}

function emListed_(ctx, key, dflt) {
  var list = list_(set_(key, dflt || '')).map(norm_);
  return [ctx.designation, ctx.empId, ctx.uid].some(function (v) { return !!str_(v) && list.indexOf(norm_(v)) >= 0; });
}
function emBoss_(ctx) { var r = norm_(ctx.role); return !!(ctx.super || r === 'director' || r === 'misadmin'); }
function emAssistant_(ctx) { return !emBoss_(ctx) && emListed_(ctx, 'Employee Edit Needs Approval', 'Assistant HR, HR Assistant, HR Intern, HR Assistant Intern'); }
function emHrExec_(ctx) { return !emBoss_(ctx) && !emAssistant_(ctx) && emListed_(ctx, 'Employee Edit Approvers', 'HR Executive'); }
function emNeedsOk_(ctx) { return !emBoss_(ctx); }
function emApprover_(ctx) { return emBoss_(ctx) || emHrExec_(ctx); }
function emFirstStage_(ctx) { return emAssistant_(ctx) ? 'HR Executive' : 'MIS'; }
function emStageOf_(r) { var s = str_(r['Stage']); return s || (str_(r['HR Approved By']) ? 'MIS' : 'HR Executive'); }
function emCanDecide_(ctx, r) {
  if (str_(r['Status']) !== 'Pending') return false;
  if (str_(r['User ID']) === ctx.uid) return false;
  return emStageOf_(r) === 'MIS' ? emBoss_(ctx) : emApprover_(ctx);
}
var EM_SECRET_RE = /aadhar|ac num|account|ifsc|pan$|^pan|password/i;
function emShow_(k, v) { v = str_(v); return EM_SECRET_RE.test(k) && v ? emMask_(v) : (v.length > 60 ? v.substring(0, 57) + '…' : v); }
function emQueue_(ctx, kind, d, who, summary, payload) {
  var stage = emFirstStage_(ctx);
  var id = lock_(function () {
    if (kind !== 'save' && kind !== 'asset' && kind !== 'doc') {
      var dup = readObjs_(SH.EMP_CHANGES).filter(function (r) { return str_(r['Status']) === 'Pending' && str_(r['Kind']) === kind && str_(r['Sheet']) === str_(d.sheet) &&
        str_(r['Employee Id']) === str_(who.id) && str_(r['Name']) === str_(who.name); })[0];
      if (dup) throw new Error('Already waiting for approval (' + str_(dup['Change ID']) + ').');
    }
    var nid = nextId_(SH.EMP_CHANGES, 'Change ID', 'ECH-', 4);
    appendObj_(SH.EMP_CHANGES, { 'Change ID': nid, 'Requested At': new Date(), 'Requested By': ctx.name, 'User ID': ctx.uid, 'Kind': kind,
      'Sheet': str_(d.sheet), 'Row': str_(d.row), 'Employee Id': who.id || '', 'Name': who.name || '', 'Summary': summary,
      'Payload': JSON.stringify(payload), 'Status': 'Pending', 'Decided By': '', 'Decided At': '', 'Remarks': '', 'Stage': stage, 'HR Approved By': '', 'HR Approved At': '' });
    return nid;
  });
  bumpGen_('empch');
  log_(ctx, 'Employee change requested', id + ' · ' + (who.name || '') + ' · ' + summary);
  return { message: 'Sent for approval (' + id + ') — ' + (stage === 'MIS' ? 'MIS / Director' : 'HR Executive, then MIS / Director') + '. It is saved once approved.', pending: true, changeId: id };
}
function emRowOf_(sheet, d) {
  var sh = emTab_(sheet), row = emMustResolve_(sh, d.row, d.expected, 'this change'), head = emHead_(sh);
  return { sh: sh, row: row, head: head, vals: sh.getRange(row, 1, 1, head.length).getValues()[0] };
}
/** Wraps an employee-workbook writer: an HR assistant's call becomes a request instead. */
function emGate_(kind, fn) {
  return function (ctx, d) {
    if (__M.emApproving || !emNeedsOk_(ctx)) return fn(ctx, d);
    if (kind === 'joinreject' && emApprover_(ctx)) return fn(ctx, d);
    d = d || {};
    var who = { id: str_((d.expected || {}).id), name: str_((d.expected || {}).name) }, summary = '', payload = {};
    if (kind === 'save') {
      var sheet = str_(d.sheet); empSheetOk_(sheet);
      var R = emRowOf_(sheet, d), ups = d.updates || {}, lines = [], keep = {}, olds = {};
      who = emIdentity_(R.head, R.vals);
      Object.keys(ups).forEach(function (k) {
        if (/^(status|employee id|outlet id)$/i.test(k) || EM_DOCS[k]) return;
        var i = emIdx_(R.head, k), old = i >= 0 && R.vals[i] instanceof Date ? fmt_(R.vals[i], 'dd/MM/yyyy') : emVal_(R.head, R.vals, k);
        if (str_(old) === str_(ups[k])) return;
        keep[k] = ups[k]; olds[k] = old; lines.push(k + ': ' + (emShow_(k, old) || '—') + ' → ' + (emShow_(k, ups[k]) || '—'));
      });
      if (!lines.length) throw new Error('Nothing changed.');
      summary = (sheet === emMasterName_() ? '' : sheet + ' · ') + lines.join(' · ');
      payload = { sheet: sheet, row: R.row, expected: { id: who.id, name: who.name }, updates: keep, old: olds };
    } else if (kind === 'status') {
      summary = /^inactive$/i.test(str_(d.status)) ? 'Move to Ex-Employees (login switched off)' : 'Make active again (back to the master)';
      payload = { sheet: str_(d.sheet), row: d.row, expected: d.expected, status: str_(d.status) };
    } else if (kind === 'joining') {
      if (!str_(d.location)) throw new Error('Pick the location before approving.');
      summary = 'New joining — add to the master at ' + str_(d.location);
      payload = { row: d.row, expected: d.expected, location: str_(d.location) };
      d.sheet = EM.REVIEW;
    } else if (kind === 'joinreject') {
      summary = 'New joining — reject' + (str_(d.remarks) ? ': ' + str_(d.remarks) : '');
      payload = { row: d.row, expected: d.expected, remarks: str_(d.remarks) };
      d.sheet = EM.REVIEW;
    } else if (kind === 'asset') {
      var f = d.fields || {};
      who = { id: str_(d.empId), name: str_(f['Name']) };
      summary = 'Assets · ' + Object.keys(f).filter(function (k) { return k !== 'Employee Id' && str_(f[k]); }).map(function (k) { return k + ': ' + emShow_(k, f[k]); }).join(' · ');
      payload = { empId: d.empId, fields: f };
      d.sheet = EM.ASSETS;
    } else if (kind === 'salary') {
      var sf = d.fields || {};
      who = { id: str_(d.empId), name: str_(sf['Name']) };
      summary = 'PF / salary breakup · ' + Object.keys(sf).filter(function (k) { return k !== 'Employee Id' && str_(sf[k]); }).map(function (k) { return k + ': ' + emShow_(k, sf[k]); }).join(' · ');
      payload = { empId: d.empId, fields: sf };
      d.sheet = EM.SALARY;
    } else if (kind === 'doc') {
      // the file goes to the person's Drive folder now; its link is written only when approved
      var col = str_(d.column);
      if (!EM_DOCS[col]) throw new Error('"' + col + '" is not a document field.');
      emCheckFile_(d.file);
      var R2 = emRowOf_(str_(d.sheet), d);
      who = emIdentity_(R2.head, R2.vals);
      if (!who.id) throw new Error('This employee has no Employee Id — set it first.');
      var url = emSaveFile_(emSub_(emPersonFolder_(who.id, who.name), EM_DOCS[col]), d.file);
      summary = EM_DOCS[col] + ' — new file "' + str_(d.file.name) + '"';
      payload = { sheet: str_(d.sheet), row: R2.row, expected: { id: who.id, name: who.name }, column: col, url: url, oldUrl: list_(emVal_(R2.head, R2.vals, col).replace(/\n/g, ','))[0] || '' };
    }
    return emQueue_(ctx, kind, d, who, summary, payload);
  };
}
var EM_KIND_FN = { save: function () { return empSave_; }, status: function () { return empStatus_; }, joining: function () { return empApprove_; },
  joinreject: function () { return empReject_; }, asset: function () { return empAssetSave_; }, salary: function () { return empSalarySave_; } };
var EM_KIND_TEXT = { save: 'Edit', status: 'Status', joining: 'New joining', joinreject: 'Joining rejected', asset: 'Assets', doc: 'Document', salary: 'PF / salary' };
function empChanges_(ctx) {
  var approver = emApprover_(ctx), boss = emBoss_(ctx), out = [];
  readObjs_(SH.EMP_CHANGES).forEach(function (r) {
    var mine = str_(r['User ID']) === ctx.uid, st = str_(r['Status']) || 'Pending', stage = emStageOf_(r);
    if (!approver && !mine) return;
    if (!boss && !mine && stage === 'MIS' && st === 'Pending' && !str_(r['HR Approved By'])) return;
    var at = parseAny_(r['Requested At']), dec = parseAny_(r['Decided At']), ha = parseAny_(r['HR Approved At']);
    if (st !== 'Pending' && at && Date.now() - at.getTime() > 45 * 86400000) return;
    var x = { id: str_(r['Change ID']), at: at ? fmt_(at, 'dd/MM/yyyy hh:mm a') : '', atKey: at ? iso_(at) : '', by: str_(r['Requested By']), mine: mine, kind: str_(r['Kind']),
      kindText: EM_KIND_TEXT[str_(r['Kind'])] || str_(r['Kind']), sheet: str_(r['Sheet']), empId: str_(r['Employee Id']), name: str_(r['Name']), summary: str_(r['Summary']),
      status: st, stage: st === 'Pending' ? stage : '', hrBy: str_(r['HR Approved By']), hrAt: ha ? fmt_(ha, 'dd/MM/yyyy hh:mm a') : '',
      canDecide: emCanDecide_(ctx, r), decidedBy: str_(r['Decided By']), decidedAt: dec ? fmt_(dec, 'dd/MM/yyyy hh:mm a') : '', remarks: str_(r['Remarks']) };
    try { x.fields = emChangeFields_(r); } catch (e) { x.fields = []; }
    x.steps = emChangeSteps_(r, x);
    out.push(x);
  });
  out.reverse();
  return { list: out, approver: approver, boss: boss, needsOk: emNeedsOk_(ctx),
    pending: out.filter(function (x) { return x.canDecide; }).length };
}
/** What a change request changes: [{ field, before, after, file: 'old' | 'new' | 'doc|<column>|<i>' }] — secret numbers masked. */
function emChangeFields_(r) {
  var kind = str_(r['Kind']), pl = {}, out = [];
  try { pl = JSON.parse(str_(r['Payload']) || '{}'); } catch (e) { pl = {}; }
  function show(k, v) { v = str_(v); return EM_SECRET_RE.test(k) && v ? emMask_(v) : v; }
  if (kind === 'save' && pl.updates) {
    var parsed = {};
    str_(r['Summary']).split(' · ').forEach(function (l) { var i = l.indexOf(': '), j = l.indexOf(' → '); if (i > 0 && j > i) parsed[l.substring(0, i)] = l.substring(i + 2, j); });
    Object.keys(pl.updates).forEach(function (k) {
      var old = pl.old && pl.old[k] !== undefined ? show(k, pl.old[k]) : (parsed[k] === '—' ? '' : parsed[k] || '');
      out.push({ field: k, before: old, after: show(k, pl.updates[k]) });
    });
  } else if (kind === 'doc') {
    out.push({ field: EM_DOCS[pl.column] || pl.column, before: pl.oldUrl ? 'File' : '', after: 'File', beforeFile: pl.oldUrl ? 'old' : '', afterFile: pl.url ? 'new' : '' });
  } else if (kind === 'asset' || kind === 'salary') {
    Object.keys(pl.fields || {}).forEach(function (k) { if (k !== 'Employee Id' && str_(pl.fields[k])) out.push({ field: k, before: '', after: show(k, pl.fields[k]) }); });
  } else if (kind === 'status') {
    out.push({ field: 'Status', before: /^inactive$/i.test(str_(pl.status)) ? 'Active' : 'Inactive', after: /^inactive$/i.test(str_(pl.status)) ? 'Inactive (Ex-Employees)' : 'Active' });
  } else if (/^join/.test(kind)) {
    var src = emJoinRow_(pl);
    if (src) {
      src.head.forEach(function (k, i) {
        if (!k || /^(status|timestamp)$/i.test(k)) return;
        var v = src.vals[i] instanceof Date ? fmt_(src.vals[i], 'dd/MM/yyyy') : str_(src.vals[i]);
        if (!v) return;
        if (EM_DOCS[k]) list_(v.replace(/\n/g, ',')).forEach(function (u, n) { out.push({ field: EM_DOCS[k] + (n ? ' ' + (n + 1) : ''), before: '', after: 'File', afterFile: 'doc|' + k + '|' + n }); });
        else out.push({ field: k, before: '', after: show(k, v) });
      });
    }
    if (pl.location) out.push({ field: 'Location', before: '', after: str_(pl.location) });
    if (kind === 'joinreject' && pl.remarks) out.push({ field: 'Reason', before: '', after: str_(pl.remarks) });
  }
  return out;
}
/** The joining form row — still in Under Review, or already in the master. */
function emJoinRow_(pl) {
  var exp = pl.expected || {};
  try {
    var rv = emTab_(EM.REVIEW, EM_REVIEW_COLS), rh = emHead_(rv), row = Number(pl.row);
    if (row >= 2 && row <= rv.getLastRow()) {
      var vals = rv.getRange(row, 1, 1, rh.length).getValues()[0];
      if (str_(emVal_(rh, vals, 'Employee Id')) === str_(exp.id) || norm_(emVal_(rh, vals, 'Name')) === norm_(exp.name)) return { head: rh, vals: vals };
    }
  } catch (e) {}
  try {
    var m = emTab_(emMasterName_()), mh = emHead_(m), at = emFindIdRow_(m, 'Employee Id', str_(exp.id));
    if (at > 0) return { head: mh, vals: m.getRange(at, 1, 1, mh.length).getValues()[0] };
  } catch (e) {}
  return null;
}
function emChangeSteps_(r, x) {
  var st = x.status, stage = str_(r['Stage']) || (x.hrBy ? 'MIS' : 'HR Executive'), hrSkipped = !x.hrBy && (stage === 'MIS' || (st === 'Approved' && !x.hrBy && stage !== 'HR Executive'));
  var hr = x.hrBy ? { state: 'done', text: 'Approved by ' + x.hrBy, at: x.hrAt } : hrSkipped ? { state: 'skip', text: 'Not needed' }
    : st === 'Rejected' ? { state: 'no', text: 'Rejected by ' + x.decidedBy, at: x.decidedAt } : st === 'Approved' ? { state: 'done', text: 'Approved by ' + x.decidedBy, at: x.decidedAt } : { state: 'now', text: 'Pending with HR Executive' };
  var top = st === 'Approved' ? { state: 'done', text: 'Approved by ' + x.decidedBy, at: x.decidedAt }
    : st === 'Rejected' && (x.hrBy || hrSkipped) ? { state: 'no', text: 'Rejected by ' + x.decidedBy, at: x.decidedAt }
    : st === 'Rejected' ? { state: 'skip', text: '—' } : stage === 'MIS' ? { state: 'now', text: 'Pending with MIS / Director' } : { state: '', text: 'Waiting for the HR Executive' };
  if (st === 'Approved' && !x.hrBy && !hrSkipped) hr = { state: 'skip', text: 'Not needed' };
  return [{ label: 'Sent', state: 'done', text: 'By ' + x.by, at: x.at }, { label: 'HR Executive', state: hr.state, text: hr.text, at: hr.at || '' },
    { label: 'MIS / Director', state: top.state, text: top.text, at: top.at || '' },
    { label: 'Saved', state: st === 'Approved' ? 'done' : st === 'Rejected' ? 'no' : '', text: st === 'Approved' ? 'In the employee workbook' : st === 'Rejected' ? 'Not saved' : '' }];
}
/** A file of a change request: the new / old document, or one of a joining form's documents. */
function empChangeFile_(ctx, ref) {
  var parts = str_(ref).split('|'), id = parts[0], r = readObjs_(SH.EMP_CHANGES).filter(function (x) { return str_(x['Change ID']) === id; })[0];
  if (!r) throw new Error('Change not found.');
  if (str_(r['User ID']) !== ctx.uid && !emApprover_(ctx)) throw new Error('Not allowed.');
  var pl = {}; try { pl = JSON.parse(str_(r['Payload']) || '{}'); } catch (e) {}
  if (parts[1] === 'new') return { url: pl.url, name: EM_DOCS[pl.column] || 'Document' };
  if (parts[1] === 'old') return { url: pl.oldUrl, name: (EM_DOCS[pl.column] || 'Document') + ' (before)' };
  if (parts[1] === 'doc' && EM_DOCS[parts[2]]) {
    var src = emJoinRow_(pl); if (!src) throw new Error('The joining form row was not found.');
    return { url: list_(emVal_(src.head, src.vals, parts[2]).replace(/\n/g, ','))[Number(parts[3]) || 0], name: EM_DOCS[parts[2]] };
  }
  throw new Error('File not found.');
}

function empChangeDecide_(ctx, d) {
  if (!emApprover_(ctx)) throw new Error('Only the HR Executive, MIS or a Director can approve employee changes.');
  var dec = /^approve/i.test(str_(d.decision)) ? 'Approved' : /^reject/i.test(str_(d.decision)) ? 'Rejected' : '';
  if (!dec) throw new Error('Pick Approve or Reject.');
  if (dec === 'Rejected' && !str_(d.remarks)) throw new Error('Write why you are rejecting it.');
  var r = readObjs_(SH.EMP_CHANGES).filter(function (x) { return str_(x['Change ID']) === str_(d.id); })[0];
  if (!r) throw new Error('Change not found — refresh.');
  if (str_(r['Status']) !== 'Pending') throw new Error('Already ' + str_(r['Status']).toLowerCase() + ' by ' + str_(r['Decided By']) + '.');
  if (str_(r['User ID']) === ctx.uid) throw new Error('Someone else has to approve your own change.');
  var stage = emStageOf_(r);
  if (stage === 'MIS' && !emBoss_(ctx)) throw new Error('This change is with MIS / Director for the final approval.');
  if (dec === 'Approved' && stage === 'HR Executive' && !emBoss_(ctx)) {
    lock_(function () { updateObj_(SH.EMP_CHANGES, r._row, { 'Stage': 'MIS', 'HR Approved By': ctx.name, 'HR Approved At': new Date(), 'Remarks': str_(d.remarks) }); });
    bumpGen_('empch');
    log_(ctx, 'Employee change HR approved', str_(r['Change ID']) + ' · ' + str_(r['Name']));
    return { message: str_(r['Change ID']) + ' approved — sent to MIS / Director for the final approval.', stage: 'MIS' };
  }
  var kind = str_(r['Kind']), pl = {}; try { pl = JSON.parse(str_(r['Payload']) || '{}'); } catch (e) { throw new Error('This request cannot be read — reject it and make the change again.'); }
  var res = { message: '' };
  if (dec === 'Approved') {
    __M.emApproving = true;
    try {
      if (kind === 'doc') {
        res = lock_(function () {
          var R = emRowOf_(pl.sheet, pl), c = emIdx_(R.head, pl.column);
          if (c < 0) throw new Error('The "' + pl.column + '" column does not exist on ' + pl.sheet + '.');
          var ex = str_(R.vals[c]), nv = pl.column === 'Additional Documents (Links)' && ex ? ex + '\n' + pl.url : pl.url;
          R.sh.getRange(R.row, c + 1).setValue(nv);
          emLog_(ctx, 'DOC_UPLOAD', pl.expected.id, pl.expected.name, pl.sheet, pl.sheet, pl.column + ' (requested by ' + str_(r['Requested By']) + ')');
          emDrop_(pl.sheet); bumpGen_('emps');
          return { message: EM_DOCS[pl.column] + ' saved for ' + pl.expected.name + '.' };
        });
      } else {
        var fn = EM_KIND_FN[kind]; if (!fn) throw new Error('Unknown change.');
        res = fn()(ctx, pl) || res;
      }
    } finally { __M.emApproving = false; }
  } else if (kind === 'doc' && pl.url) {
    try { DriveApp.getFileById(emFileId_(pl.url)).setTrashed(true); } catch (e) {}
  }
  lock_(function () { updateObj_(SH.EMP_CHANGES, r._row, { 'Status': dec, 'Stage': stage, 'Decided By': ctx.name, 'Decided At': new Date(), 'Remarks': str_(d.remarks) }); });
  bumpGen_('empch');
  log_(ctx, 'Employee change ' + dec.toLowerCase(), str_(r['Change ID']) + ' · ' + str_(r['Name']) + ' · requested by ' + str_(r['Requested By']));
  return { message: str_(r['Change ID']) + ' ' + dec.toLowerCase() + (res.message ? ' — ' + res.message : '.') };
}

/* ============================ HR: STATUS MOVES ============================ */
/** Master → Inactive → Ex-Employees · Ex-Employees → Active → Master. Same rules as the sheet's own mover. */
function emMove_(ctx, srcSh, srcRow, tgtName, status, exp) {
  var ss = srcSh.getParent(), tgt = ss.getSheetByName(tgtName);
  if (!tgt) throw new Error('Tab not found: ' + tgtName);
  var srcHead = emHead_(srcSh);
  var row = emMustResolve_(srcSh, srcRow, exp, 'this status change');
  var vals = srcSh.getRange(row, 1, 1, srcHead.length).getValues()[0];
  var id = emVal_(srcHead, vals, 'Employee Id') || emVal_(srcHead, vals, 'Outlet ID'), name = emVal_(srcHead, vals, 'Name');
  if (!id && !name) throw new Error('That row is empty.');
  var over = { 'Status': status }, tgtIdCol = tgtName === EM.EX ? 'Outlet ID' : 'Employee Id';
  if (tgtName === EM.EX) { var mid = emVal_(srcHead, vals, 'Employee Id'); if (mid) over['Outlet ID'] = mid; }
  if (srcSh.getName() === EM.EX) { var oid = emVal_(srcHead, vals, 'Outlet ID'); if (oid) over['Employee Id'] = oid; }
  var tgtHead = emHead_(tgt), out = emBuildRow_(srcHead, vals, tgtHead, over);
  var finalId = str_(over[tgtIdCol] || id), existing = emFindIdRow_(tgt, tgtIdCol, finalId);
  if (existing > 0) emWrite_(tgt, existing, out); else emAppend_(tgt, out);
  SpreadsheetApp.flush();
  if (!emRowMatches_(srcSh, row, exp || { id: id, name: name })) {
    emLog_(ctx, 'ABORT_PRE_DELETE', id, name, srcSh.getName(), tgtName, 'Row changed just before deletion — source row kept.');
    throw new Error('Copied to ' + tgtName + ', but the original row changed, so it was NOT deleted. Please check both tabs for "' + name + '".');
  }
  emDelete_(srcSh, row);
  SpreadsheetApp.flush();
  emLog_(ctx, existing > 0 ? 'MOVE_MERGED' : 'MOVE', id, name, srcSh.getName(), tgtName, 'Status → ' + status);
  emDrop_(srcSh.getName()); emDrop_(tgtName);
  return { id: finalId, name: name };
}
function empStatus_(ctx, d) {
  var sheet = str_(d.sheet), st = /^inactive$/i.test(str_(d.status)) ? 'Inactive' : /^active$/i.test(str_(d.status)) ? 'Active' : '';
  if (!st) throw new Error('Pick Active or Inactive.');
  var res = lock_(function () {
    var sh = emTab_(sheet);
    if (sheet === emMasterName_() && st === 'Inactive') return emMove_(ctx, sh, d.row, EM.EX, 'Inactive', d.expected);
    throw new Error(st === 'Active' ? 'Ex-employees are not shown in One Login — a person who comes back joins again through the joining form.' : 'Already an ex-employee.');
  });
  var sync = '';
  try { var s = syncEmployees(true); sync = s.deactivated ? ' Their login was switched off.' : s.reactivated ? ' Their login was switched back on.' : ''; } catch (e) { sync = ' (Employee sync: ' + e.message + ')'; }
  log_(ctx, 'Employee ' + (st === 'Inactive' ? 'moved to Ex-Employees' : 'reactivated'), res.id + ' ' + res.name);
  return { message: res.name + (st === 'Inactive' ? ' moved to Ex-Employees.' : ' is active again.') + sync };
}

/* ============================ HR: NEW JOININGS ============================ */
function empPending_(ctx) {
  var U = emRead_(EM.REVIEW, { fresh: true }), q = {};
  try {
    readObjs_(SH.EMP_CHANGES).forEach(function (r) {
      if (str_(r['Status']) !== 'Pending' || !/^join/.test(str_(r['Kind']))) return;
      q[str_(r['Employee Id']).toUpperCase() + '|' + norm_(r['Name'])] = { changeId: str_(r['Change ID']), kind: str_(r['Kind']), stage: emStageOf_(r),
        by: str_(r['Requested By']), hrBy: str_(r['HR Approved By']), canDecide: emCanDecide_(ctx, r), summary: str_(r['Summary']) };
    });
  } catch (e) {}
  return { rows: U.rows.filter(function (r) { return /^pending$/i.test(emVal_(U.head, r.vals, 'Status')); })
    .map(function (r) {
      var v = emSafe_(U.head, r.vals), at = parseAny_(v['Timestamp'] || v['Date Of Joining']);
      return { row: r.row, id: v['Employee Id'], name: v['Name'], values: v, atKey: at ? iso_(at) : '', queued: q[str_(v['Employee Id']).toUpperCase() + '|' + norm_(v['Name'])] || null };
    }),
    head: U.head.filter(String), meta: empMeta_(), boss: emBoss_(ctx), approver: emApprover_(ctx) };
}
function empApprove_(ctx, d) {
  var loc = str_(d.location);
  if (!loc) throw new Error('Pick the location before approving.');
  var res = lock_(function () {
    var ss = emSS_(), rv = emTab_(EM.REVIEW, EM_REVIEW_COLS), row = emMustResolve_(rv, d.row, d.expected, 'this approval');
    var rh = emHead_(rv), vals = rv.getRange(row, 1, 1, rh.length).getValues()[0];
    var id = emVal_(rh, vals, 'Employee Id'), name = emVal_(rh, vals, 'Name');
    var master = emTab_(emMasterName_()), mh = emHead_(master), oldId = '';
    var existing = emFindIdRow_(master, 'Employee Id', id);
    if (existing > 0) {
      var mv = master.getRange(existing, 1, 1, mh.length).getValues()[0];
      var same = emSamePerson_(emSafe_(mh, mv), { aadhar: emDigits_(emVal_(rh, vals, 'Aadhar Card')), phone: emDigits_(emVal_(rh, vals, 'Phone No.')).slice(-10), name: name });
      if (!same) {
        oldId = id; id = emNextCode_(emVal_(rh, vals, 'Designation')); existing = -1;
        rv.getRange(row, emIdx_(rh, 'Employee Id') + 1).setValue(id);
        vals[emIdx_(rh, 'Employee Id')] = id;
        emRenameFolder_(oldId, id, name);
        emLog_(ctx, 'CODE_CHANGED', id, name, EM.REVIEW, EM.REVIEW, oldId + ' already belongs to ' + emVal_(mh, mv, 'Name') + ' — new code ' + id);
      }
    }
    var out = emBuildRow_(rh, vals, mh, { 'Status': 'Active', 'Location': loc });
    if (existing > 0) emWrite_(master, existing, out); else emAppend_(master, out);
    var base = { 'Name': name, 'Designation': emVal_(rh, vals, 'Designation'), 'Department': emVal_(rh, vals, 'Department') };
    if (/^yes$/i.test(emVal_(rh, vals, 'IT Equipment'))) emUpsertById_(emTab_(EM.ASSETS, EM_ASSET_COLS), id, Object.assign({ 'Current Location': loc }, base));
    if (/^yes$/i.test(emVal_(rh, vals, 'PF Applicable'))) emUpsertById_(emTab_(EM.SALARY, EM_SALARY_COLS), id, Object.assign({ 'Status': 'Active', 'Location': loc, 'Phone No.': emVal_(rh, vals, 'Phone No.') }, base));
    SpreadsheetApp.flush();
    if (!emRowMatches_(rv, row, { id: id, name: name })) {
      emLog_(ctx, 'APPROVE_PARTIAL', id, name, EM.REVIEW, emMasterName_(), 'Added to the master; Under Review row changed, so it was kept.');
      throw new Error('Added to the master, but the Under Review row changed, so it was NOT removed — please delete "' + name + '" from Under Review by hand.');
    }
    emDelete_(rv, row);
    emLog_(ctx, 'APPROVE', id, name, EM.REVIEW, emMasterName_(), 'Approved by HR, location: ' + loc);
    emDrop_(EM.REVIEW); emDrop_(emMasterName_());
    return { id: id, name: name, oldId: oldId };
  });
  var sync = '';
  try { var s = syncEmployees(true); sync = s.newLogins ? ' A login was created (User ID = Employee ID, password blank until MIS sets it).' : ''; } catch (e) { sync = ' (Employee sync: ' + e.message + ')'; }
  log_(ctx, 'Joining approved', res.id + ' ' + res.name + ' · ' + loc + (res.oldId ? ' · code changed from ' + res.oldId : ''));
  return { message: res.name + ' (' + res.id + ') is now an active employee at ' + loc + '.' + (res.oldId ? ' ' + res.oldId + ' was already given to someone else, so the employee code is ' + res.id + '.' : '') + sync };
}
function empReject_(ctx, d) {
  return lock_(function () {
    var rv = emTab_(EM.REVIEW, EM_REVIEW_COLS), row = emMustResolve_(rv, d.row, d.expected, 'this rejection'), head = emHead_(rv);
    var who = emIdentity_(head, rv.getRange(row, 1, 1, head.length).getValues()[0]);
    rv.getRange(row, emIdx_(head, 'Status') + 1).setValue('Rejected');
    emLog_(ctx, 'REJECT', who.id, who.name, EM.REVIEW, EM.REVIEW, 'Marked Rejected by HR (row kept for audit)' + (str_(d.remarks) ? ': ' + str_(d.remarks) : ''));
    emDrop_(EM.REVIEW);
    return { message: who.name + ' marked Rejected.' };
  });
}
function emUpsertById_(sh, id, fields) {
  var head = emHead_(sh), r = emFindIdRow_(sh, 'Employee Id', id);
  if (r > 0) {
    Object.keys(fields).forEach(function (k) { var c = emIdx_(head, k); if (c >= 0 && str_(fields[k]) !== '') sh.getRange(r, c + 1).setValue(fields[k]); });
    return r;
  }
  return emAppend_(sh, emBuildRow_([], [], head, Object.assign({ 'Employee Id': id }, fields)));
}

/* ============================ HR: DOCUMENTS ============================ */
function emDocsRoot_() {
  var id = set_('HR Documents Folder ID', '');
  if (!id) throw new Error('Settings ▸ HR Documents Folder ID is empty.');
  try { return DriveApp.getFolderById(id); } catch (e) { throw new Error('The HR Documents folder cannot be opened — check Settings ▸ HR Documents Folder ID and that the script owner can edit it.'); }
}
function emSub_(parent, name) { var it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : parent.createFolder(name); }
/** "CG-00322 - Vijay Singh Thakur" — found by the code prefix even when the name was corrected later. */
function emPersonFolder_(code, name) {
  var root = emDocsRoot_(), prefix = code + ' - ';
  try {
    var it = root.searchFolders("title contains '" + code.replace(/'/g, "\\'") + "'");
    while (it.hasNext()) { var f = it.next(); if (f.getName().indexOf(prefix) === 0) return f; }
  } catch (e) {}
  return emSub_(root, prefix + str_(name));
}
function emRenameFolder_(oldId, newId, name) {
  try {
    var root = emDocsRoot_(), it = root.searchFolders("title contains '" + oldId.replace(/'/g, "\\'") + "'");
    while (it.hasNext()) { var f = it.next(); if (norm_(f.getName()) === norm_(oldId + ' - ' + name)) { f.setName(newId + ' - ' + name); return; } }
  } catch (e) {}
}
function emSaveFile_(folder, file) {
  var blob = Utilities.newBlob(Utilities.base64Decode(file.data), file.mime || 'application/octet-stream', file.name || 'document');
  return 'https://drive.google.com/file/d/' + folder.createFile(blob).getId() + '/view';
}
function emCheckFile_(file) {
  if (!file || !file.data) throw new Error('No file was received.');
  var bytes = Math.floor(String(file.data).length * 3 / 4);
  if (bytes > 15 * 1048576) throw new Error('"' + file.name + '" is ' + round_(bytes / 1048576, 1) + ' MB — the limit is 15 MB.');
  var m = str_(file.mime);
  if (m.indexOf('image/') !== 0 && m !== 'application/pdf') throw new Error('Only photos (JPG / PNG) and PDF files can be uploaded.');
}
function empDocUpload_(ctx, d) {
  var col = str_(d.column);
  if (!EM_DOCS[col]) throw new Error('"' + col + '" is not a document field.');
  emCheckFile_(d.file);
  var sheet = str_(d.sheet);
  if (sheet !== emMasterName_()) throw new Error('Documents can only be added to active employees.');
  return lock_(function () {
    var sh = emTab_(sheet), row = emMustResolve_(sh, d.row, d.expected, 'this upload'), head = emHead_(sh), c = emIdx_(head, col);
    if (c < 0) throw new Error('The "' + col + '" column does not exist on ' + sheet + '.');
    var vals = sh.getRange(row, 1, 1, head.length).getValues()[0], who = emIdentity_(head, vals);
    if (!who.id) throw new Error('This employee has no Employee Id — set it first.');
    var url = emSaveFile_(emSub_(emPersonFolder_(who.id, who.name), EM_DOCS[col]), d.file);
    var nv = url;
    if (col === 'Additional Documents (Links)') { var ex = str_(vals[c]); nv = ex ? ex + '\n' + url : url; }
    sh.getRange(row, c + 1).setValue(nv);
    emLog_(ctx, 'DOC_UPLOAD', who.id, who.name, sheet, sheet, col + ' uploaded → ' + EM_DOCS[col] + '/' + str_(d.file.name));
    emDrop_(sheet);
    return { message: EM_DOCS[col] + ' saved for ' + who.name + '.', value: nv };
  });
}
function empDocView_(ctx, d) {
  var sheet = str_(d.sheet);
  if ([emMasterName_(), EM.REVIEW].indexOf(sheet) < 0 || !EM_DOCS[str_(d.column)]) throw new Error('Document not found.');
  var sh = emTab_(sheet), row = emMustResolve_(sh, d.row, d.expected, 'opening the document'), head = emHead_(sh);
  var urls = list_(emVal_(head, sh.getRange(row, 1, 1, head.length).getValues()[0], str_(d.column)).replace(/\n/g, ','));
  log_(ctx, 'Employee document opened', str_(d.column) + ' · ' + str_((d.expected || {}).name));
  return emFileOut_(urls[Number(d.i) || 0], EM_DOCS[str_(d.column)]);
}

/* ============================ HR: ASSETS · PF / SALARY BREAKUP · MOVE LOG ============================ */
function empAssets_(ctx) {
  var A = emRead_(EM.ASSETS, { fresh: true });
  return { head: A.head.filter(String), rows: A.rows.filter(function (r) { return emShownRow_(A.head, r.vals); }).map(function (r) { var v = emSafe_(A.head, r.vals); return { row: r.row, id: v['Employee Id'], name: v['Name'], values: v }; }) };
}
function empAssetSave_(ctx, d) {
  var id = str_(d.empId); if (!emUnique_(id)) throw new Error('Pick the employee.');
  return lock_(function () {
    var f = {}; Object.keys(d.fields || {}).forEach(function (k) { if (k !== 'Employee Id') f[k] = str_(d.fields[k]); });
    emUpsertById_(emTab_(EM.ASSETS, EM_ASSET_COLS), id, f);
    emLog_(ctx, 'ASSET_UPDATE', id, f['Name'] || '', EM.ASSETS, EM.ASSETS, 'Asset record saved');
    emDrop_(EM.ASSETS);
    return { message: 'Assets saved.' };
  });
}
function empSalary_(ctx) {
  if (!can_(ctx, 'payroll')) throw new Error('Only payroll can open the salary breakup.');
  var A = emRead_(EM.SALARY, { fresh: true });
  return { head: A.head.filter(String), rows: A.rows.filter(function (r) { return emShownRow_(A.head, r.vals); }).map(function (r) { var v = emSafe_(A.head, r.vals); return { row: r.row, id: v['Employee Id'], name: v['Name'], values: v }; }) };
}
function empSalarySave_(ctx, d) {
  if (!can_(ctx, 'payroll')) throw new Error('Only payroll can edit the salary breakup.');
  var id = str_(d.empId); if (!emUnique_(id)) throw new Error('Pick the employee.');
  return lock_(function () {
    var f = {}; Object.keys(d.fields || {}).forEach(function (k) { if (k !== 'Employee Id') f[k] = d.fields[k]; });
    emUpsertById_(emTab_(EM.SALARY, EM_SALARY_COLS), id, f);
    emLog_(ctx, 'SALARY_UPDATE', id, str_(f['Name']), EM.SALARY, EM.SALARY, 'Salary / PF record saved');
    emDrop_(EM.SALARY);
    return { message: 'Salary breakup saved.' };
  });
}
function empLog_(ctx) {
  var L = emRead_(EM.LOG, { fresh: true });
  return { rows: L.rows.slice(-250).reverse().map(function (r) { return emSafe_(L.head, r.vals); }) };
}

/* ============================ PUBLIC JOINING FORM ============================ */
function joinMeta_() {
  if (!setYes_('Joining Form Enabled')) return { enabled: false };
  var m = empMeta_();
  return { enabled: true, app: set_('App Name', APP.NAME), logo: set_('Logo URL', APP.LOGO),
    hq: m.designations.filter(function (x) { return x.prefix === 'HQ'; }).map(function (x) { return x.name; }),
    cg: m.designations.filter(function (x) { return x.prefix !== 'HQ'; }).map(function (x) { return x.name; }),
    departments: m.departments };
}
function emDigits_(v) { return str_(v).replace(/\.0+$/, '').replace(/\D/g, ''); }
function emSamePerson_(v, p) {
  var aad = emDigits_(v['Aadhar Card']), phone = emDigits_(v['Phone No.']).slice(-10);
  if (p.aadhar && aad && aad === p.aadhar) return true;
  return !!(p.phone && phone === p.phone && norm_(v['Name']) === norm_(p.name));
}
function emExistingId_(p) {
  var found = '';
  [[emMasterName_(), false], [EM.REVIEW, true]].some(function (t) {
    var R = emRead_(t[0], { fresh: true });
    return R.rows.some(function (r) {
      var v = emSafe_(R.head, r.vals);
      if (t[1] && !/^pending$/i.test(str_(v['Status']))) return false;
      if (v['Employee Id'] && emSamePerson_(v, p)) { found = v['Employee Id']; return true; }
      return false;
    });
  });
  return found;
}
/** Next code: HQ-00001 / CG-00001 — looks at Under Review, the master and Ex-Employees so codes never clash. */
function emNextCode_(designation) {
  var d = readObjs_(SH.DESIGS).filter(function (r) { return norm_(r['Designation']) === norm_(designation); })[0];
  if (!d) throw new Error('Designation not recognised: ' + designation);
  var prefix = str_(d['Code Prefix']).toUpperCase() || 'CG', max = 0;
  [[EM.REVIEW, 'Employee Id'], [emMasterName_(), 'Employee Id'], [EM.EX, 'Outlet ID']].forEach(function (t) {
    var sh = emSS_().getSheetByName(t[0]); if (!sh || sh.getLastRow() < 2) return;
    var c = emIdx_(emHead_(sh), t[1]); if (c < 0) return;
    sh.getRange(2, c + 1, sh.getLastRow() - 1, 1).getValues().forEach(function (v) {
      var s = str_(v[0]).toUpperCase();
      if (s.indexOf(prefix + '-') === 0) { var n = parseInt(s.slice(prefix.length + 1), 10); if (!isNaN(n) && n > max) max = n; }
    });
  });
  return prefix + '-' + pad_(max + 1, 5);
}
function emAddress_(p) { return [p.area, p.landmark, p.district, p.state, p.pinCode].map(str_).filter(String).join(', '); }
function joinSubmit_(d) {
  if (!setYes_('Joining Form Enabled')) throw new Error('The joining form is closed. Please contact HR.');
  d = d || {};
  var name = emTitle_(d.fullName), father = emTitle_(d.fatherName), phone = str_(d.mobilePrimary).replace(/\D/g, '');
  if (!name) throw new Error('Full name is required.');
  if (phone.length !== 10) throw new Error('Enter a valid 10-digit mobile number.');
  if (!str_(d.designation) || !str_(d.department)) throw new Error('Pick your designation and department.');
  if (!/^\d{12}$/.test(str_(d.aadharNo))) throw new Error('Enter your 12-digit Aadhar number.');
  var guard = 'join_' + phone;
  if (cacheGetJ_(guard)) throw new Error('This form was just submitted from this mobile number. Please wait a minute.');
  var files = d.files || {};
  ['aadharFront', 'aadharBack', 'panCard'].forEach(function (k) { if (files[k]) emCheckFile_(files[k]); });
  (files.additionalDocs || []).forEach(function (f) { emCheckFile_(f); });
  if (!files.aadharFront || !files.aadharBack) throw new Error('Upload both sides of the Aadhar card.');
  return lock_(function () {
    var code = emExistingId_({ phone: phone.slice(-10), aadhar: str_(d.aadharNo), name: name }) || emNextCode_(d.designation);
    var folder = emPersonFolder_(code, name), links = {};
    if (files.aadharFront) links.af = emSaveFile_(emSub_(folder, 'Aadhar Card Front'), files.aadharFront);
    if (files.aadharBack) links.ab = emSaveFile_(emSub_(folder, 'Aadhar Card Back'), files.aadharBack);
    if (files.panCard) links.pc = emSaveFile_(emSub_(folder, 'Pan Card'), files.panCard);
    var extra = (files.additionalDocs || []).map(function (f) { return emSaveFile_(emSub_(folder, 'Additional Documents'), f); });
    var perm = emAddress_({ area: d.area, landmark: d.landmark, district: d.district, state: d.state, pinCode: d.pinCode });
    var cur = d.sameAsPermanent ? perm : emAddress_({ area: d.currentArea, landmark: d.currentLandmark, district: d.currentDistrict, state: d.currentState, pinCode: d.currentPinCode });
    var sh = emTab_(EM.REVIEW, EM_REVIEW_COLS), head = emHead_(sh);
    var row = emBuildRow_([], [], head, { 'Status': 'Pending', 'Employee Id': code, 'Name': name, 'Designation': str_(d.designation),
      'Department': str_(d.department), 'Phone No.': phone, 'Date Of Joining': isoToDate_(d.dateOfJoining) || str_(d.dateOfJoining),
      'Aadhar Card': str_(d.aadharNo), 'Pan': str_(d.panNo).toUpperCase(), "Father/Husband's Name": father, 'Highest Qualification': str_(d.highestQual),
      'Date of Birth': isoToDate_(d.dob) || str_(d.dob), 'Gender': str_(d.gender), 'Blood Group': str_(d.bloodGroup), 'Shirt Size': str_(d.shirtSize),
      'Trouser Size': str_(d.trouserSize), 'Shoe Size': str_(d.shoeSize), 'Bank Name': str_(d.bankName), 'AC Num': str_(d.acNum),
      'IFSC': str_(d.ifsc).toUpperCase(), 'Email Address': str_(d.email), "Father's Phone Number": str_(d.fatherPhone), 'Permanent Address': perm,
      'Current Address': cur, 'IT Equipment': str_(d.itEquipment) || 'N/A', 'PF Applicable': str_(d.pfApplicable) || 'No',
      'Aadhar Card Front (Link)': links.af || '', 'Aadhar Card Back (Link)': links.ab || '', 'Pan Card Upload (Link)': links.pc || '',
      'Additional Documents (Links)': extra.join('\n') });
    emAppend_(sh, row);
    emLog_(null, 'SUBMISSION', code, name, '', EM.REVIEW, 'New joining form submission (One Login)');
    cachePutJ_(guard, 1, 60);
    var to = list_(set_('Joining Form Notify', ''));
    if (to.length) mail_(to, 'New joining form — ' + name + ' (' + code + ')', mailShell_('New joining form', '<p><b>' + esc_(name) + '</b> (' + esc_(code) +
      ') · ' + esc_(d.designation) + ' · ' + esc_(d.department) + '</p><p>Open the app → Employees → New joinings to approve.</p>'));
    return { employeeCode: code, message: 'Thank you, ' + name + '. Your details were sent to HR. Your employee code is ' + code + '.' };
  });
}
