/*************************************************************************
 *  Fms.gs — FMS Summary: the step-wise status of the FMS sheets.
 *
 *  An FMS sheet (any department) has, above its data, a header row with
 *  "Planned … / Actual … / Status" columns for every step and, above that,
 *  the step names (a WHAT row, a STEP row or a title row). This file reads
 *  any such sheet — Hiring, Outlet Order to Dispatch, Purchase … — and
 *  counts per step: done · pending · overdue (planned time passed, not done).
 *
 *  Which FMS exists and who sees it = the "FMS Sheets" tab (Settings ▸ FMS):
 *    Department            people of that department see it
 *    Also For Designations extra designations (Store Head, Store Incharge …)
 *  Admins (Director, MIS, Settings / User Management) see every FMS.
 *************************************************************************/

var FMS_LABELS = ['WHAT', 'HOW', 'WHO', 'WHEN', 'TAT', 'WEEKLY OFF', 'OFFICE ON TIME', 'OFFICE OF TIME', 'OFFICE OFF TIME', 'STEPS'];
var FMS_MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/* ============================ READING A SHEET (Google Sheet or an Excel file in Drive) ============================ */
function fmsId_(v) { var s = str_(v), m = s.match(/\/d\/([A-Za-z0-9_-]{20,})/) || s.match(/[?&]id=([A-Za-z0-9_-]{20,})/); return m ? m[1] : s; }
/** Values of one tab → { values, name, url, excel }. An .xlsx kept in Drive is converted to a temporary Sheet and read. */
function fmsValues_(id, tab, skipExcel) {
  id = fmsId_(id);
  if (!id) throw new Error('No sheet is set.');
  __M.fmsBook = __M.fmsBook || {};
  var book = __M.fmsBook[id], conv = '';
  if (!book) {
    var ss = null;
    try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
    fastOpen_(id);
    if (!ss) {
      if (skipExcel && fastHost_()) return { values: [], name: '', url: '', excel: true, tab: tab || '' };
      if (fastHost_()) { var kept = xlRec_(id, tab), got = kept ? xlRead_(kept, id) : null; if (got) return got; }
      var f;
      try { f = DriveApp.getFileById(id); } catch (e) { throw new Error('The sheet ' + id + ' cannot be opened — share it with the account that runs this app.'); }
      if (!/spreadsheetml|ms-excel|officedocument|csv/i.test(f.getMimeType())) throw new Error('"' + f.getName() + '" is not a spreadsheet.');
      if (skipExcel) return { values: [], name: f.getName(), url: 'https://drive.google.com/file/d/' + id + '/view', excel: true, tab: tab || '' };
      var rec = xlRec_(id, tab);
      if (rec && Number(rec['Source Updated']) === f.getLastUpdated().getTime()) { var copy = xlRead_(rec, id); if (copy) return copy; }
      return xlBuild_(id, tab, f);
    } else book = { ss: ss, conv: '', url: ss.getUrl(), excel: false };
    __M.fmsBook[id] = book;
  }
  var sh = tab ? book.ss.getSheetByName(tab) : book.ss.getSheets()[0];
  if (!sh) {
    var names = book.ss.getSheets().map(function (x) { return x.getName(); });
    throw new Error('Tab "' + tab + '" was not found in "' + book.ss.getName() + '" (tabs: ' + names.slice(0, 12).join(', ') + ').');
  }
  var lr = sh.getLastRow(), lc = sh.getLastColumn();
  var values = lr && lc ? sh.getRange(1, 1, lr, lc).getValues() : [];
  while (values.length && values[values.length - 1].every(function (c) { return str_(c) === ''; })) values.pop();
  return { values: values, name: book.ss.getName(), url: book.url, excel: book.excel, tab: sh.getName() };
}
function xlCopyName_(id, tab) { return ('XL ' + id + (str_(tab) ? ' ' + str_(tab) : '')).replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 99); }
function xlRec_(id, tab) {
  var key = id + '|' + str_(tab), hit = null;
  readObjs_(SH.XL).some(function (r) { if (str_(r['Source ID']) + '|' + str_(r['Source Tab']) === key) { hit = r; return true; } return false; });
  return hit;
}
function xlRead_(rec, id) {
  var sh = db_().getSheetByName(str_(rec['Copy Tab']));
  if (!sh) return null;
  var lr = sh.getLastRow(), lc = sh.getLastColumn();
  var values = lr && lc ? sh.getRange(1, 1, lr, lc).getValues() : [];
  while (values.length && values[values.length - 1].every(function (c) { return str_(c) === ''; })) values.pop();
  return { values: values, name: str_(rec['Source Name']), url: 'https://drive.google.com/file/d/' + id + '/view', excel: true, tab: str_(rec['Tab Name']) };
}
function xlCell_(v) { return typeof v === 'string' && v !== '' ? "'" + v : v; }
function xlBuild_(id, tab, f) {
  var conv = atConvert_(f.getBlob(), 'TEMP One Login read ' + Date.now()), values = [], tabName = '';
  try {
    var ss = SpreadsheetApp.openById(conv), sh = tab ? ss.getSheetByName(tab) : ss.getSheets()[0];
    if (!sh) {
      var names = ss.getSheets().map(function (x) { return x.getName(); });
      throw new Error('Tab "' + tab + '" was not found in "' + f.getName() + '" (tabs: ' + names.slice(0, 12).join(', ') + ').');
    }
    var lr = sh.getLastRow(), lc = sh.getLastColumn();
    values = lr && lc ? sh.getRange(1, 1, lr, lc).getValues() : [];
    tabName = sh.getName();
  } finally { try { DriveApp.getFileById(conv).setTrashed(true); } catch (e) {} }
  while (values.length && values[values.length - 1].every(function (c) { return str_(c) === ''; })) values.pop();
  var name = f.getName(), copyName = xlCopyName_(id, tab), upd = f.getLastUpdated().getTime();
  lock_(function () {
    var sh = sheet_(copyName), rows = values.length, cols = rows ? values[0].length : 0;
    sh.clearContents();
    if (rows && cols) {
      if (sh.getMaxRows() < rows) sh.insertRowsAfter(sh.getMaxRows(), rows - sh.getMaxRows());
      if (sh.getMaxColumns() < cols) sh.insertColumnsAfter(sh.getMaxColumns(), cols - sh.getMaxColumns());
      sh.getRange(1, 1, rows, cols).setValues(values.map(function (r) { return r.map(xlCell_); }));
    }
    try { if (!sh.isSheetHidden()) sh.hideSheet(); } catch (e) {}
    var obj = { 'Source ID': id, 'Source Tab': str_(tab), 'Copy Tab': copyName, 'Source Name': name, 'Tab Name': tabName, 'Source Updated': upd, 'Copied At': new Date() };
    var old = xlRec_(id, tab);
    if (old) updateObj_(SH.XL, old._row, obj); else appendObj_(SH.XL, obj);
  });
  bumpGen_('fms'); bumpGen_('hire');
  try { xlTrigger_(); } catch (e) {}
  return { values: values, name: name, url: 'https://drive.google.com/file/d/' + id + '/view', excel: true, tab: tabName };
}
function xlTrigger_() {
  var c = cache_();
  if (c && c.get('xl_trigger')) return;
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'refreshExcelCopies'; });
  if (!has) ScriptApp.newTrigger('refreshExcelCopies').timeBased().everyMinutes(30).create();
  if (c) c.put('xl_trigger', '1', 21600);
}
function refreshExcelCopies() {
  var done = 0;
  readObjs_(SH.XL).forEach(function (r) {
    var id = str_(r['Source ID']), tab = str_(r['Source Tab']);
    if (!id) return;
    try {
      var f = DriveApp.getFileById(id);
      if (f.getLastUpdated().getTime() !== Number(r['Source Updated']) || !db_().getSheetByName(str_(r['Copy Tab']))) { xlBuild_(id, tab, f); done++; }
    } catch (e) { Logger.log('Excel copy ' + id + ': ' + e.message); }
  });
  return done;
}

/** Temporary copies made for Excel files are removed at the end of the request. */
function fmsCleanup_() {
  Object.keys(__M.fmsBook || {}).forEach(function (k) { var b = __M.fmsBook[k]; if (b.conv) { try { DriveApp.getFileById(b.conv).setTrashed(true); } catch (e) {} } });
  __M.fmsBook = {};
}
function fmsMin_() { return Math.max(1, setNum_('FMS Cache Minutes', 10)); }

/* ============================ DATES ============================ */
/** A date / time cell → Date (sheet dates, "15/May/2026 12:00:00", "20-04-2026 08:40", "19/12/25" …) or null. */
function fmsDate_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return isNaN(v.getTime()) || v.getFullYear() < 1990 ? null : v;
  if (typeof v === 'number') return v > 30000 && v < 80000 ? parseAny_(v) : null;
  var s = str_(v), m = s.match(/^(\d{1,2})[\/\-. ]+([A-Za-z]{3})[A-Za-z]*[\/\-. ]+(\d{2,4})(?:[,\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?/i);
  if (m && FMS_MON[m[2].toLowerCase()] !== undefined) {
    var y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]), hh = Number(m[4] || 0), ap = (m[7] || '').toLowerCase();
    if (ap === 'pm' && hh < 12) hh += 12; if (ap === 'am' && hh === 12) hh = 0;
    return new Date(y, FMS_MON[m[2].toLowerCase()], Number(m[1]), hh, Number(m[5] || 0), Number(m[6] || 0));
  }
  var d = parseAny_(s);
  return d && d.getFullYear() >= 1990 && d.getFullYear() <= 2100 ? d : null;
}
function fmsWhen_(d) { return d ? fmt_(d, 'dd MMM, hh:mm a') : ''; }

/* ============================ THE PARSER ============================ */
/**
 * values → { head, headRow, steps: [{ name, p, a, s }], idCols, rows: [{ r, cells, steps: [{ st, planned, actual }], current }] }
 * st: done · pending (planned, not done) · overdue (planned time passed) · wait (no planned time yet)
 */
function fmsParse_(values) {
  var hr = -1;
  for (var i = 0; i < Math.min(values.length, 25) && hr < 0; i++) {
    var n = values[i].filter(function (c) { return /^planned/i.test(str_(c)); }).length;
    if (n >= 1 && values[i].some(function (c) { return /^actual/i.test(str_(c)); })) hr = i;
  }
  if (hr < 0) throw new Error('No "Planned / Actual" header row was found — is this an FMS tab?');
  var H = values[hr].map(str_), steps = [], used = {};
  H.forEach(function (h, c) {
    if (!/^planned/i.test(h)) return;
    var a = -1, s = -1;
    for (var k = c + 1; k <= c + 3 && k < H.length; k++) if (a < 0 && /^actual/i.test(H[k])) a = k;
    if (a >= 0) for (var k2 = a + 1; k2 <= a + 2 && k2 < H.length; k2++) if (s < 0 && /^status/i.test(H[k2])) s = k2;
    steps.push({ p: c, a: a, s: s }); used[a] = 1;
  });
  // a first step with only an Actual column (the start of the flow)
  var first = steps.length ? steps[0].p : H.length;
  for (var c0 = 0; c0 < first; c0++) if (/^actual/i.test(H[c0]) && !used[c0]) { steps.unshift({ p: -1, a: c0, s: /^status/i.test(H[c0 + 1] || '') ? c0 + 1 : -1 }); break; }
  var idEnd = steps.length ? (steps[0].p >= 0 ? steps[0].p : steps[0].a) : H.length;
  var isLabel = function (t) { var u = t.toUpperCase(); return !t || FMS_LABELS.indexOf(u) >= 0 || /^step\s*\d+$/i.test(t) || /^\d+([:.]\d+)*(\s*(am|pm))?$/i.test(t) || /^(days?|next working day.*|same day.*)$/i.test(t); };
  steps.forEach(function (st, k) {
    var col = st.p >= 0 ? st.p : st.a, top = '', what = '', who = '';
    for (var r = 0; r < hr; r++) {
      var row = values[r].map(str_), here = row[col] || '';
      if (!top && !isLabel(here) && !(row[0] && isLabel(row[0])) && here.length < 80) top = here;   // never the Who / How / When rows
      if (!what && (/^what$/i.test(row[col] || '') || /^what$/i.test(row[col - 1] || ''))) what = /^what$/i.test(row[col] || '') ? row[col + 1] : row[col];
      if (!what && /^what$/i.test(row[0] || '') && here) what = here;
      if (!who && (/^who$/i.test(row[col] || '') || /^who$/i.test(row[col - 1] || ''))) who = /^who$/i.test(row[col] || '') ? row[col + 1] : row[col];
      if (!who && /^who$/i.test(row[0] || '') && here) who = here;
    }
    st.who = str_(who).split('\n')[0].trim();
    var name = top && !/^step/i.test(top) ? top : what && !isLabel(what) ? what : ('Step ' + (k + 1));
    st.name = str_(name).split('\n')[0].replace(/^\d+\.\s*/, '').substring(0, 70);
    st.n = k + 1;
  });
  var idCols = []; for (var ic = 0; ic < idEnd; ic++) if (H[ic]) idCols.push(ic);
  var now = Date.now(), rows = [];
  for (var r2 = hr + 1; r2 < values.length; r2++) {
    var v = values[r2];
    if (!idCols.some(function (c) { return str_(v[c]) !== ''; })) continue;
    if (!steps.some(function (s) { return (s.p >= 0 && str_(v[s.p]) !== '') || (s.a >= 0 && str_(v[s.a]) !== ''); })) continue;
    var ss = fmsStepStates_(steps, v, now);
    var cur = -1; for (var q = 0; q < ss.length; q++) if (ss[q].st !== 'done') { cur = q; break; }
    rows.push({ r: r2 + 1, cells: v, steps: ss, current: cur });
  }
  // a step nobody has ever planned or filled (e.g. the outlet's GRN steps) does not keep every row open
  var inUse = steps.map(function (s, k) { return rows.some(function (row) { return row.steps[k].st !== 'wait'; }); });
  steps.forEach(function (s, k) { s.unused = !inUse[k]; });
  if (inUse.some(Boolean)) rows.forEach(function (row) {
    row.current = -1;
    for (var q = 0; q < row.steps.length; q++) if (inUse[q] && row.steps[q].st !== 'done') { row.current = q; break; }
  });
  return { head: H, headRow: hr, steps: steps, idCols: idCols, rows: rows };
}
/** Each step of one row: done / pending / overdue / wait (no planned date yet). */
function fmsStepStates_(steps, v, now) {
  return steps.map(function (s) {
    var pl = s.p >= 0 ? fmsDate_(v[s.p]) : null, ac = s.a >= 0 ? v[s.a] : '', stt = s.s >= 0 ? str_(v[s.s]).toUpperCase() : '';
    var done = str_(ac) !== '' || /^(DONE|YES|COMPLETED?|START(ED)?)$/.test(stt);
    return { st: done ? 'done' : pl ? (pl.getTime() < now ? 'overdue' : 'pending') : 'wait', planned: pl, actual: fmsDate_(ac) };
  });
}
/** A short title for a row: the first few text cells before the steps (no dates, no phone numbers). */
function fmsLabel_(P, v) {
  var out = [];
  P.idCols.forEach(function (c) {
    if (out.length >= 3) return;
    var x = v[c]; if (x instanceof Date || typeof x === 'number') return;
    var t = str_(x); if (!t || /^\d{6,}$/.test(t) || /@/.test(t) || t.length > 60) return;
    out.push(t);
  });
  return out.join(' · ');
}
/** Step-wise counts of one parsed tab + the rows that are late now. */
function fmsSummary_(P, opt) {
  opt = opt || {};
  var rows = opt.filter ? P.rows.filter(opt.filter) : P.rows, now = Date.now();
  var steps = P.steps.map(function (s) { return { n: s.n, name: s.name, done: 0, pending: 0, overdue: 0, wait: 0, unused: !!s.unused }; });
  var complete = 0, late = [];
  rows.forEach(function (row) {
    row.steps.forEach(function (x, k) { steps[k][x.st]++; });
    if (row.current < 0) { complete++; return; }
    var c = row.steps[row.current];
    if (c.st === 'overdue') late.push({ row: row.r, label: opt.label ? opt.label(row) : fmsLabel_(P, row.cells), step: P.steps[row.current].name, planned: fmsWhen_(c.planned),
      lateH: Math.round((now - c.planned.getTime()) / 3600000) });
  });
  late.sort(function (a, b) { return b.lateH - a.lateH; });
  return { total: rows.length, complete: complete, open: rows.length - complete, overdue: late.length, steps: steps, late: late.slice(0, opt.lateMax || 15) };
}
function fmsLateText_(h) { return h >= 48 ? Math.round(h / 24) + ' days' : h + ' hrs'; }

/* ============================ WHO SEES WHICH FMS ============================ */
function fmsAdmin_(ctx) { var r = norm_(ctx.role); return !!(ctx.super || r === 'director' || r === 'misadmin' || can_(ctx, 'settings') || can_(ctx, 'users')); }
function fmsAll_() {
  return readObjs_(SH.FMS).filter(function (r) { return str_(r['FMS ID']) && str_(r['FMS Name']); }).map(function (r) {
    return { id: str_(r['FMS ID']), name: str_(r['FMS Name']), sheet: fmsId_(r['Sheet ID / Link']), link: str_(r['Sheet ID / Link']), tabs: list_(r['Tabs']),
      department: str_(r['Department']), designations: list_(r['Also For Designations']), active: !/^(no|inactive)$/i.test(str_(r['Status'])), notes: str_(r['Notes']), _row: r._row };
  });
}
function fmsSees_(ctx, f) {
  if (fmsAdmin_(ctx)) return true;
  if (!f.active) return false;
  var dep = norm_(ctx.department), des = norm_(ctx.designation);
  if (norm_(f.department) === 'all') return true;
  if (dep && norm_(f.department) === dep) return true;
  if (fmsDeptNames_(ctx).indexOf(norm_(f.department)) >= 0) return true;
  if (des && f.designations.some(function (x) { return norm_(x) === des; })) return true;
  return false;
}
/** Every name the person's department goes by (Departments tab: name + aliases), normalised. */
function fmsDeptNames_(ctx) {
  if (__M.fmsDep && __M.fmsDep.uid === ctx.uid) return __M.fmsDep.list;
  var out = [], mine = norm_(ctx.department);
  try {
    readObjs_(SH.DEPTS).forEach(function (r) {
      var names = [str_(r['Department Name'])].concat(list_(r['Aliases'])).map(norm_).filter(String);
      if ((ctx.deptId && str_(r['Department ID']) === ctx.deptId) || (mine && names.indexOf(mine) >= 0)) out = out.concat(names);
    });
  } catch (e) {}
  __M.fmsDep = { uid: ctx.uid, list: out };
  return out;
}
function fmsList_(ctx) {
  var admin = fmsAdmin_(ctx);
  var list = fmsAll_().filter(function (f) { return fmsSees_(ctx, f); }).map(function (f) {
    return { id: f.id, name: f.name, tabs: f.tabs, department: f.department, designations: f.designations, active: f.active, hasSheet: !!f.sheet, notes: f.notes,
      link: admin ? f.link : '' };
  });
  var depts = [];
  if (admin) try { depts = readObjs_(SH.DEPTS).map(function (r) { return str_(r['Department Name']); }).filter(String); } catch (e) {}
  return { list: list, admin: admin, departments: depts, cacheMin: fmsMin_() };
}
/** One FMS: every tab summarised (kept for "FMS Cache Minutes"). */
function fmsLoad_(ctx, d) {
  var f = fmsAll_().filter(function (x) { return x.id === str_(d.id); })[0];
  if (!f || !fmsSees_(ctx, f)) throw new Error('FMS not found.');
  if (!f.sheet) return { id: f.id, name: f.name, tabs: [], note: 'No sheet is linked yet — ' + (fmsAdmin_(ctx) ? 'paste its link with ✏️ Edit.' : 'MIS will add it.') };
  var key = 'fms_v2_' + gen_('fms') + '.' + gen_('fmsd') + '_' + f.id + '_' + Math.floor(Date.now() / (fmsMin_() * 60000));
  if (!d.force) { var hit = cacheGetJ_(key); if (hit) return hit; }
  var out = { id: f.id, name: f.name, tabs: [], at: fmt_(new Date(), 'dd/MM/yyyy hh:mm a') };
  try {
    (f.tabs.length ? f.tabs : ['']).forEach(function (t) {
      try {
        var V = fmsValues_(f.sheet, t), P = fmsParse_(V.values), S = fmsSummary_(P, {});
        var since = Date.now() - 30 * 86400000, recent = 0;
        P.rows.forEach(function (row) { var d0 = null; P.idCols.some(function (c) { d0 = fmsDate_(row.cells[c]); return !!d0; }); if (d0 && d0.getTime() >= since) recent++; });
        out.url = fmsAdmin_(ctx) ? V.url : '';
        var todo = P.rows.filter(function (row) { return row.current >= 0 && (row.steps[row.current].st === 'pending' || row.steps[row.current].st === 'overdue'); })
          .sort(function (a, b) { return a.steps[a.current].planned - b.steps[b.current].planned; }).slice(0, 60).map(function (row) {
            var c = row.steps[row.current];
            return { row: row.r, label: fmsLabel_(P, row.cells), stepN: row.current + 1, step: P.steps[row.current].name, planned: fmsWhen_(c.planned),
              late: c.st === 'overdue' ? fmsLateText_(Math.round((Date.now() - c.planned.getTime()) / 3600000)) : '' };
          });
        out.tabs.push({ tab: V.tab, file: V.name, excel: V.excel, total: S.total, open: S.open, complete: S.complete, overdue: S.overdue, recent: recent, steps: S.steps,
          late: S.late.map(function (x) { return { label: x.label, step: x.step, planned: x.planned, late: fmsLateText_(x.lateH) }; }),
          todo: todo, canDo: !V.excel });
      } catch (e) { out.tabs.push({ tab: t || '(first tab)', error: e.message }); }
    });
  } finally { fmsCleanup_(); }
  cachePutJ_(key, out, fmsMin_() * 60);
  return out;
}
/**
 * Mark the current step of one FMS row done from One Login — the same cells a person would fill in the sheet:
 * Status = DONE (the sheet's Actual formula then stamps the time); an Actual column without a formula gets the time.
 * d = { id, tab, row, step }  (step = 1-based, must be the row's current step)
 */
function fmsDone_(ctx, d) {
  var f = fmsAll_().filter(function (x) { return x.id === str_(d.id); })[0];
  if (!f || !fmsSees_(ctx, f)) throw new Error('FMS not found.');
  return fmsMark_(ctx, f, d, false);
}
function fmsMyDone_(ctx, d) {
  var f = fmsAll_().filter(function (x) { return x.id === str_(d.id) && x.active; })[0];
  if (!f) throw new Error('FMS not found.');
  return fmsMark_(ctx, f, d, true);
}
function fmsMark_(ctx, f, d, mine) {
  if (!f.sheet) throw new Error('No sheet is linked to this FMS.');
  var msg = lock_(function () {
    var ss;
    try { ss = SpreadsheetApp.openById(f.sheet); } catch (e) { throw new Error('This FMS is an Excel file or cannot be opened — mark it in the sheet itself.'); }
    fastOpen_(f.sheet);
    var sh = str_(d.tab) ? ss.getSheetByName(str_(d.tab)) : ss.getSheets()[0];
    if (!sh) throw new Error('Tab "' + str_(d.tab) + '" not found.');
    var lc = sh.getLastColumn(), rowNum = Number(d.row);
    var top = sh.getRange(1, 1, Math.min(sh.getLastRow(), 25), lc).getValues(), P = fmsParse_(top);
    if (!(rowNum > P.headRow + 1) || rowNum > sh.getLastRow()) throw new Error('Invalid row — refresh.');
    var v = sh.getRange(rowNum, 1, 1, lc).getValues()[0], ss2 = fmsStepStates_(P.steps, v, Date.now());
    var cur = -1; for (var q = 0; q < ss2.length; q++) if (ss2[q].st !== 'done' && !(P.steps[q].unused && ss2[q].st === 'wait')) { cur = q; break; }
    var k = Number(d.step) - 1, st = P.steps[k];
    if (!st) throw new Error('Unknown step.');
    if (ss2[k].st === 'done') throw new Error('"' + st.name + '" is already done — refresh.');
    if (cur !== k) throw new Error('Do the steps in order — "' + (P.steps[cur] || {}).name + '" comes first.');
    if (ss2[k].st === 'wait') throw new Error('This step has no planned date yet.');
    if (mine && !fmsWhoIsMe_(ctx, st.who) && !fmsSees_(ctx, f)) throw new Error('"' + st.name + '" is done by ' + (st.who || 'someone else') + '.');
    var label = fmsLabel_(P, v), now = new Date(), wrote = [];
    if (st.s >= 0) { sh.getRange(rowNum, st.s + 1).setValue('DONE'); wrote.push('Status'); }
    if (st.a >= 0) {
      var ac = sh.getRange(rowNum, st.a + 1);
      if (!ac.getFormula() && str_(ac.getValue()) === '') { ac.setValue(now); wrote.push('Actual'); }
    }
    if (!wrote.length) throw new Error('This step has no Status or Actual column to fill.');
    return label + ' · ' + st.name + ' marked done';
  });
  bumpGen_('fmsd'); bumpGen_('hire');
  log_(ctx, 'FMS step done', f.name + ' · ' + msg);
  return { message: msg + '.' };
}

function fmsNormRole_(t) {
  return str_(t).toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/\basst\b\.?/g, 'assistant').replace(/\bexe\b\.?/g, 'executive').replace(/\bmgr\b\.?/g, 'manager')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
function fmsWhoTokens_(who) {
  return str_(who).split(/\s*(?:\/|,|&|\+|\band\b|\bor\b)\s*/i).map(fmsNormRole_).filter(String);
}
function fmsWhoIsMe_(ctx, who) {
  var toks = fmsWhoTokens_(who);
  if (!toks.length) return false;
  var des = fmsNormRole_(ctx.designation), dep = fmsNormRole_(ctx.department), words = nameWords_(ctx.name);
  var flat = function (x) { return x.replace(/ /g, ''); };
  return toks.some(function (t) {
    if (des && (t === des || flat(t) === flat(des))) return true;
    if (dep && t === dep) return true;
    var tw = t.split(' ').filter(function (w) { return w.length > 2; });
    return tw.length > 0 && tw.length <= 3 && tw.every(function (w) { return words.indexOf(w) >= 0; });
  });
}
function fmsTodoAll_() {
  var key = 'fms_todo_v1_' + gen_('fms') + '.' + gen_('fmsd') + '_' + Math.floor(Date.now() / (fmsMin_() * 60000));
  if (!__M.fresh) { var hit = cacheGetJ_(key); if (hit) return hit; }
  var items = [], errors = [];
  try {
    fmsAll_().filter(function (f) { return f.active && f.sheet; }).forEach(function (f) {
      (f.tabs.length ? f.tabs : ['']).forEach(function (t) {
        try {
          var V = fmsValues_(f.sheet, t, true);
          if (V.excel) return;
          var P = fmsParse_(V.values);
          P.rows.forEach(function (row) {
            if (row.current < 0) return;
            var c = row.steps[row.current], st = P.steps[row.current];
            if ((c.st !== 'pending' && c.st !== 'overdue') || !st.who) return;
            items.push({ fms: f.id, fmsName: f.name, tab: V.tab, row: row.r, stepN: row.current + 1, step: st.name, who: st.who, label: fmsLabel_(P, row.cells),
              planned: c.planned.getTime(), plannedText: fmsWhen_(c.planned), overdue: c.st === 'overdue' });
          });
        } catch (e) { errors.push(f.name + (t ? ' · ' + t : '') + ': ' + e.message); }
      });
    });
  } finally { fmsCleanup_(); }
  items.sort(function (a, b) { return a.planned - b.planned; });
  var res = { items: items.slice(0, 1500), errors: errors };
  cachePutJ_(key, res, fmsMin_() * 60);
  return res;
}
function fmsMine_(ctx, d) {
  var A = fmsTodoAll_(), end = new Date(); end.setHours(23, 59, 59, 999);
  var since = Date.now() - setNum_('FMS My Steps Days', 30) * 86400000;
  var mine = A.items.filter(function (x) { return x.planned >= since && fmsWhoIsMe_(ctx, x.who); });
  mine.forEach(function (x) { x.today = !x.overdue && x.planned <= end.getTime(); });
  return { items: mine.slice(0, 80), total: mine.length, overdue: mine.filter(function (x) { return x.overdue; }).length,
    today: mine.filter(function (x) { return x.today; }).length, errors: ctx.super ? A.errors : [] };
}

/** Settings ▸ FMS: add / change one FMS (admins). */
function fmsSave_(ctx, d) {
  if (!fmsAdmin_(ctx)) throw new Error('Only admins and MIS can change the FMS list.');
  var name = str_(d.name); if (!name) throw new Error('Enter the FMS name.');
  var obj = { 'FMS Name': name, 'Sheet ID / Link': str_(d.link), 'Tabs': list_(d.tabs).join(', '), 'Department': str_(d.department),
    'Also For Designations': list_(d.designations).join(', '), 'Status': d.active === false ? 'Inactive' : 'Active', 'Notes': str_(d.notes) };
  var msg = lock_(function () {
    if (str_(d.id)) {
      var f = fmsAll_().filter(function (x) { return x.id === str_(d.id); })[0];
      if (!f) throw new Error('FMS not found — refresh.');
      if (str_(d.remove) === 'yes') { updateObj_(SH.FMS, f._row, { 'Status': 'Inactive' }); return name + ' switched off.'; }
      updateObj_(SH.FMS, f._row, obj); return name + ' saved.';
    }
    obj['FMS ID'] = nextId_(SH.FMS, 'FMS ID', 'FMS-', 3);
    appendObj_(SH.FMS, obj); return name + ' added.';
  });
  bumpGen_('fms');
  log_(ctx, 'FMS list', msg);
  return { message: msg, view: fmsList_(ctx) };
}
