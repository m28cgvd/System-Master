/*************************************************************************
 *  Payroll.gs — Salary Preparation and Salary Slips.
 *
 *  Works on the SGSPL SALARY MASTER (Settings ▸ Salary Master Sheet ID),
 *  one tab per month ("AUG 2026"), in the layout HR already uses:
 *    S.no · NAME · DESIGNATION · Actual Salary · Full Day · Half Day · WHD ·
 *    WA · Total Absent · Paid Leave · Paid for · Daily Wage · O/T · Event ·
 *    Carry Forward · TOTAL SALARY · Penalties · Remark · Loan & Advance ·
 *    Extras · HOME STAY · UNIFORM SECURITY DEPOSIT · TOTAL DEDUCTION ·
 *    SALARY AFTER DEDUCTION · Cash · online · FINAL ADVANCE · TRF DETAILS · PF/ESIC
 *  with the same formulas (the month's own number of days instead of 31).
 *
 *  Preparation pre-fills from: the employee master (who is active, salary),
 *  last month's tab (paid leave, home stay, uniform deposit, PF/ESIC),
 *  the Attendance Report (half days, absents, penalties) and the Loan &
 *  Advance tabs (advances approved for that month). HR checks every number
 *  on screen before the tab is written.
 *
 *  Only the Head Office and the outlets we run (Outlets ▸ Model = COCO /
 *  FOCO, Settings ▸ Operated Models) are prepared; staff of franchise-run
 *  outlets stay in the employee master only. Block names are taken from
 *  last month's tab ("PANDARI(CG001)") so the Salary Master stays uniform.
 *************************************************************************/

var PAY_COLS = [
  ['sno', ['S.no', 'S. No', 'Sno', 'S.No.']], ['name', ['NAME']], ['designation', ['DESIGNATION']], ['salary', ['Actual Salary']],
  ['full', ['Full Day']], ['half', ['Half Day']], ['whd', ['WHD']], ['wa', ['WA']], ['absent', ['Total Absent']],
  ['paidLeave', ['Paid Leave']], ['paidFor', ['Paid for']], ['daily', ['Daily Wage']], ['ot', ['O/T', 'Overtime', 'OT']],
  ['event', ['Event']], ['carry', ['Carry Forward']], ['total', ['TOTAL SALARY']], ['penalty', ['Penalties', 'Penalty']],
  ['remark', ['Remark']], ['loan', ['Loan & Advance', 'Loan and Advance']], ['extras', ['Extras']], ['homeStay', ['HOME STAY']],
  ['uniform', ['UNIFORM SECURITY DEPOSIT']], ['deduction', ['TOTAL DEDUCTION']], ['net', ['SALARY AFTER DEDUCTION']],
  ['cash', ['Cash']], ['online', ['online']], ['finalAdvance', ['FINAL ADVANCE']], ['trf', ['TRF DETAILS']], ['pf', ['PF/ESIC', 'PF / ESIC']],
  ['remarks2', ['REMARKS']]
];
/** The layout a prepared month is written in (same as AUG 2026). */
var PAY_LAYOUT = ['S.no', 'NAME', 'DESIGNATION', 'Actual Salary', 'Full Day', 'Half Day', 'WHD', 'WA', 'Total Absent', 'Paid Leave', 'Paid for',
  'Daily Wage', 'O/T', 'Event', 'Carry Forward', 'TOTAL SALARY', 'Penalties', 'Remark', 'Loan & Advance', 'Extras', 'HOME STAY',
  'UNIFORM SECURITY DEPOSIT', 'TOTAL DEDUCTION', 'SALARY AFTER DEDUCTION', 'Cash', 'online', 'FINAL ADVANCE', 'TRF DETAILS', 'PF/ESIC'];
var PAY_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** The lines a salary slip can show (all ticked by default). */
var SLIP_LINES = [
  ['full', 'Full days', 'Attendance', 'days'], ['half', 'Half days', 'Attendance', 'days'], ['absent', 'Total absent', 'Attendance', 'days'],
  ['paidLeave', 'Paid leave', 'Attendance', 'days'], ['paidFor', 'Paid for (days)', 'Attendance', 'days'],
  ['salary', 'Monthly salary', 'Earnings', 'money'], ['daily', 'Daily wage', 'Earnings', 'money'], ['earned', 'Earned for days worked', 'Earnings', 'money'],
  ['ot', 'Overtime', 'Earnings', 'money'], ['event', 'Event', 'Earnings', 'money'], ['carry', 'Carry forward', 'Earnings', 'money'],
  ['total', 'Total salary', 'Earnings', 'money'],
  ['penalty', 'Penalties', 'Deductions', 'money'], ['loan', 'Loan & advance', 'Deductions', 'money'], ['extras', 'Extras', 'Deductions', 'money'],
  ['homeStay', 'Home stay', 'Deductions', 'money'], ['uniform', 'Uniform security deposit', 'Deductions', 'money'],
  ['deduction', 'Total deduction', 'Deductions', 'money'],
  ['net', 'Net salary', 'Net', 'money'], ['cash', 'Paid in cash', 'Payment', 'money'], ['online', 'Paid online', 'Payment', 'money'],
  ['remark', 'Remark', 'Payment', 'text']
];

/* ============================ SALARY MASTER ============================ */
function paySS_() { return extSS_(set_('Salary Master Sheet ID')); }
function payMonthOf_(name) {
  var s = str_(name).toUpperCase();
  if (/PENALTY|PENELTY|OLD|NEW|COPY/.test(s)) return null;
  var m = s.match(/^([A-Z]+)\s*(\d{4})$/);
  if (!m) return null;
  var mi = PAY_MONTHS.indexOf(m[1].substring(0, 3));
  return mi < 0 ? null : new Date(Number(m[2]), mi, 1);
}
function payTabs_() {
  return paySS_().getSheets().map(function (sh) { var d = payMonthOf_(sh.getName()); return d ? { name: sh.getName(), month: d, key: fmt_(d, 'yyyy-MM') } : null; })
    .filter(Boolean).sort(function (a, b) { return b.month - a.month; });
}
function payTabFor_(ym) { return payTabs_().filter(function (t) { return t.key === ym; })[0] || null; }
function payTabName_(d) {
  var f = set_('Salary Tab Format', 'MMM yyyy');
  return Utilities.formatDate(d, APP.TZ, f).toUpperCase();
}
function payDays_(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }

/** Reads a month tab: data rows (with the computed values), their location block, and the columns found. */
function payParse_(tabName) {
  var sh = paySS_().getSheetByName(tabName);
  if (!sh) throw new Error('Tab "' + tabName + '" not found in the Salary Master.');
  var lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (lr < 3) return { tab: tabName, cols: {}, rows: [], sections: [] };
  var top = sh.getRange(1, 1, Math.min(8, lr), lc).getValues(), hr = -1;
  for (var i = 0; i < top.length; i++) {
    var n = top[i].map(norm_);
    if (n.indexOf('name') >= 0 && n.indexOf('actualsalary') >= 0) { hr = i; break; }
  }
  if (hr < 0) throw new Error('"' + tabName + '" has no header row with NAME and Actual Salary.');
  var H = top[hr].map(str_), cols = {};
  PAY_COLS.forEach(function (p) {
    var exact = -1;
    p[1].forEach(function (nm) { if (exact < 0) { var j = H.map(norm_).indexOf(norm_(nm)); if (j >= 0) exact = j; } });
    if (exact >= 0) cols[p[0]] = exact;
  });
  var first = hr + 2, vals = sh.getRange(first, 1, lr - first + 1, lc).getValues();
  var fx = sh.getRange(first, 1, lr - first + 1, lc).getFormulas();
  var rows = [], sections = [], cur = '', pending = [];
  vals.forEach(function (r, i) {
    var name = cols.name >= 0 ? str_(r[cols.name]) : '', sal = cols.salary >= 0 ? r[cols.salary] : '';
    if (!name) return;
    var isNum = typeof sal === 'number' && sal > 0;
    var others = r.filter(function (c, j) { return j !== cols.name && j !== cols.sno && str_(c) !== ''; }).length;
    var sno = cols.sno >= 0 ? str_(r[cols.sno]) : '';
    if (!isNum && others === 0 && !sno) {                   // a location label row
      pending.forEach(function (x) { x.section = name; });
      pending = [];
      cur = name; if (sections.indexOf(name) < 0) sections.push(name);
      return;
    }
    if (!isNum) return;                                     // an unfinished row (no salary yet)
    var o = { row: first + i, section: cur, name: name, values: {}, formulas: {} };
    Object.keys(cols).forEach(function (k) { o.values[k] = r[cols[k]] instanceof Date ? fmt_(r[cols[k]]) : r[cols[k]]; if (fx[i][cols[k]]) o.formulas[k] = fx[i][cols[k]]; });
    if (!cur) pending.push(o);
    rows.push(o);
  });
  return { tab: tabName, cols: cols, header: H, rows: rows, sections: sections, url: paySS_().getUrl() + '#gid=' + sh.getSheetId() };
}

/* ============================ NAME MATCHING ============================ */
function payNameMap_() {
  var m = {};
  try { readObjs_(SH.SAL_MAP).forEach(function (r) { var k = str_(r['Salary Name']).toUpperCase(); if (k && str_(r['Employee ID'])) m[k] = str_(r['Employee ID']); }); } catch (e) {}
  return m;
}
function paySaveMap_(pairs, by) {
  if (!pairs.length) return 0;
  // a name used by two different people in the same batch (two "NISHA BAIRAGI") is ambiguous — never mapped by name
  var ids = {};
  pairs.forEach(function (p) { var k = str_(p.name).toUpperCase(); if (k && str_(p.empId)) (ids[k] = ids[k] || {})[str_(p.empId).toUpperCase()] = 1; });
  var have = {};
  readObjs_(SH.SAL_MAP).forEach(function (r) { have[str_(r['Salary Name']).toUpperCase()] = r; });
  var add = [], now = new Date(), n = 0, done = {};
  pairs.forEach(function (p) {
    var k = str_(p.name).toUpperCase(); if (!k || !str_(p.empId) || done[k]) return;
    done[k] = true;
    if (Object.keys(ids[k]).length > 1) return;
    var e = laEmp_(p.empId) || {};
    if (have[k]) {
      if (have[k]._row && str_(have[k]['Employee ID']) !== str_(p.empId)) { updateObj_(SH.SAL_MAP, have[k]._row, { 'Employee ID': p.empId, 'Employee Name': e.name || '', 'Mapped By': by, 'Mapped At': now }); n++; }
      return;
    }
    add.push({ 'Salary Name': k, 'Employee ID': p.empId, 'Employee Name': e.name || '', 'Mapped By': by, 'Mapped At': now });
    have[k] = { 'Employee ID': p.empId };
  });
  if (add.length) appendObjs_(SH.SAL_MAP, add);
  return add.length + n;
}
/** Finds the employee behind a name on a salary tab. */
function payMatcher_() {
  var map = payNameMap_(), master = laMaster_(), people = [];
  Object.keys(master).forEach(function (k) { var e = master[k]; people.push({ id: e.id, name: e.name, n: atNormName_(e.name), w: nameWords_(e.name), loc: e.location, active: e.active }); });
  return function (salName, section) {
    var k = str_(salName).toUpperCase();
    if (map[k]) return { empId: map[k], how: 'Name map' };
    var n = atNormName_(salName.replace(/\|+/g, '')), hits = people.filter(function (p) { return p.n === n; });
    if (hits.length === 1) return { empId: hits[0].id, how: 'Same name' };
    var w = nameWords_(salName);
    if (!w.length) return null;
    var cands = people.filter(function (p) { return p.w.length && w.every(function (t) { return p.w.indexOf(t) >= 0; }); });
    if (!cands.length) cands = people.filter(function (p) { return p.w[0] === w[0] && (w.length === 1 || p.w.some(function (x) { return x.substring(0, 4) === w[w.length - 1].substring(0, 4); })); });
    if (cands.length > 1 && section) { var o = outletByAny_(section) || outletByAny_(str_(section).replace(/[()]/g, ' ')); if (o) cands = cands.filter(function (p) { var x = outletByAny_(p.loc); return x && x.id === o.id; }); }
    if (cands.length > 1) cands = cands.filter(function (p) { return p.active; });
    return cands.length === 1 ? { empId: cands[0].id, how: 'Similar name' } : null;
  };
}

/* ============================ SALARY PREPARATION ============================ */
function payMeta_(ctx) {
  var tabs = payTabs_(), last = tabs[0];
  var next = last ? new Date(last.month.getFullYear(), last.month.getMonth() + 1, 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  var runs = [];
  try { runs = readObjs_(SH.PAY_RUNS).slice(-12).reverse().map(function (r) { return { id: str_(r['Run ID']), month: str_(r['Month']), tab: str_(r['Tab']), employees: num_(r['Employees']), net: num_(r['Net Pay']), by: str_(r['Prepared By']), at: fmt_(r['Prepared At'], 'dd/MM/yyyy hh:mm a') }; }); } catch (e) {}
  return { tabs: tabs.map(function (t) { return { name: t.name, key: t.key }; }), suggest: fmt_(next, 'yyyy-MM'), suggestTab: payTabName_(next),
    order: list_(set_('Salary Section Order', '')), attendance: !!setRaw_('Attendance Sheet ID'), runs: runs, url: paySS_().getUrl() };
}
/**
 * Location block label for a location text: "PANDRI (CG001)", or GFP / HQ for the head office.
 * prevLabels = outlet id → the label last month's tab used ("PANDARI(CG001)"), so the blocks keep their names.
 */
function paySection_(loc, prevLabels) {
  var o = outletByAny_(loc);
  if (!o) return { key: norm_(loc) || 'other', label: str_(loc).toUpperCase() || 'OTHER', order: 999 };
  var order = list_(set_('Salary Section Order', '')).map(function (t) { var x = outletByAny_(t); return x ? x.id : ''; }).indexOf(o.id);
  var label = (prevLabels && prevLabels[o.id]) || (o.type === 'Outlet' ? o.name.toUpperCase() + ' (' + (o.code || o.short) + ')' : (o.short || o.name).toUpperCase());
  return { key: o.id, label: label, order: order < 0 ? 500 : order, prefix: o.type === 'Outlet' ? '' : (o.short || '').toUpperCase() };
}
function payPreview_(ctx, d) {
  var ym = str_(d.month);
  if (!/^\d{4}-\d{2}$/.test(ym)) throw new Error('Pick the month.');
  var start = new Date(Number(ym.substring(0, 4)), Number(ym.substring(5, 7)) - 1, 1), days = payDays_(start), end = new Date(start.getFullYear(), start.getMonth(), days);
  var tabName = payTabName_(start), exists = !!paySS_().getSheetByName(tabName) || !!payTabFor_(ym);
  var prevKey = fmt_(new Date(start.getFullYear(), start.getMonth() - 1, 1), 'yyyy-MM'), prevTab = payTabFor_(prevKey), prev = null;
  var match = payMatcher_(), notes = [];
  var prevBy = {}, prevLabels = {};
  if (prevTab) {
    prev = payParse_(prevTab.name);
    prev.rows.forEach(function (r) {
      var m = match(r.name, r.section); if (m) prevBy[m.empId.toUpperCase()] = r;
      var so = r.section ? (outletByAny_(r.section) || outletByAny_(str_(r.section).replace(/[()]/g, ' '))) : null;
      if (so && !prevLabels[so.id]) prevLabels[so.id] = r.section;
    });
  } else notes.push('Last month\'s tab was not found — paid leave, home stay, uniform and PF are left blank.');

  var att = null;
  if (setRaw_('Attendance Sheet ID')) {
    try { att = atMonthSummary_(iso_(start), iso_(end)); if (!att.days.length) notes.push('No attendance has been uploaded for ' + fmt_(start, 'MMMM yyyy') + ' yet.'); }
    catch (e) { notes.push('Attendance: ' + e.message); }
  }
  var adv = {}, advInfo = {};                      // running advances of the month (Reports ▸ Running advances shows the same)
  try {
    repAdvances_(start).forEach(function (x) {
      var k = x.empId.toUpperCase();
      x.items.forEach(function (i) { if (i.approved > 0) (adv[k] = adv[k] || []).push(i.approved); });
      advInfo[k] = x.items.map(function (i) { return i.applied + ' · ' + (i.purpose || 'advance') + ' · ' + (i.approved > 0 ? 'Rs ' + i.approved + (i.paid ? ' paid ' + i.paid : ' approved') : (i.waiting > 0 ? 'Rs ' + i.waiting + ' waiting — ' + i.stage : i.stage)); });
    });
  } catch (e) { notes.push('Loan & Advance: ' + e.message); }

  var pfBy = {};
  try {
    var SB = emRead_(EM.SALARY, {});
    SB.rows.forEach(function (r) {
      var v = emSafe_(SB.head, r.vals), id = str_(v['Employee Id']).toUpperCase(); if (!id) return;
      pfBy[id] = { on: /^y/i.test(str_(v['PF (Yes/No)'])), basic: num_(v['BASIC SALARY']), allowance: num_(v['All Allowance']), pf: num_(v['PF (12%)']), esic: num_(v['ESIC (0.75%)']) };
    });
  } catch (e) { notes.push('PF / salary breakup: ' + e.message); }
  var master = laMaster_(), rows = [], defLeave = setNum_('Salary Paid Leave Days', 4), franchise = {};
  Object.keys(master).forEach(function (k) {
    var e = master[k];
    if (!e.active || !(e.salary > 0)) return;
    if (franchiseLoc_(e.location)) {                         // an outlet we do not run (FOFO …) — its salary is not prepared here
      var fo = outletByAny_(e.location), fk = fo ? fo.name : e.location; franchise[fk] = (franchise[fk] || 0) + 1; return;
    }
    var sec = paySection_(e.location, prevLabels), p = prevBy[e.id.toUpperCase()], pv = p ? p.values : {};
    var a = att ? att.byId[atNormId_(e.id, att.prefixes)] : null;
    var loans = adv[e.id.toUpperCase()] || [];
    rows.push({ empId: e.id, section: sec.label, sectionKey: sec.key, order: sec.order, prefix: sec.prefix || '',
      name: p ? p.name : e.name.toUpperCase(), designation: str_(pv.designation) || e.designation.toUpperCase(),
      salary: e.salary, prevSalary: p ? num_(pv.salary) : '', half: a ? a.half : '', wa: a ? a.absent : '', missed: a ? a.missed : 0,
      attDays: att ? att.days.length : 0, hasAtt: !!a,
      paidLeave: p ? num_(pv.paidLeave) : defLeave, ot: a && a.ot ? a.ot : '', event: '', carry: '',
      penalty: a && a.penalty ? a.penalty : '', penaltyLines: a ? a.lines : [], remark: '',
      loan: loans.length ? (loans.length > 1 ? '=' + loans.join('+') : loans[0]) : '', loanTotal: loans.reduce(function (s, x) { return s + x; }, 0),
      loanLines: advInfo[e.id.toUpperCase()] || [],
      extras: '', homeStay: p ? (num_(pv.homeStay) || '') : '', uniform: p ? (num_(pv.uniform) || '') : '',
      pf: p && str_(pv.pf) ? str_(pv.pf) : (pfBy[e.id.toUpperCase()] && pfBy[e.id.toUpperCase()].on ? 'PF' : ''), pfInfo: pfBy[e.id.toUpperCase()] || null,
      fromPrev: !!p, prevRow: p ? p.row : '' });
  });
  // people on last month's tab who are no longer active on the master (or now belong to an outlet we do not run)
  var gone = prev ? prev.rows.filter(function (r) { var m = match(r.name, r.section), e = m ? master[m.empId.toUpperCase()] : null; return !e || !e.active || franchiseLoc_(e.location); })
    .map(function (r) { return r.name + (r.section ? ' (' + r.section + ')' : ''); }) : [];
  var fr = Object.keys(franchise);
  if (fr.length) notes.push('Only the outlets we run (' + opModels_().join(' / ') + ') and the Head Office are prepared — left out: ' +
    fr.map(function (k) { return k + ' ' + franchise[k]; }).join(', ') + ' (employee records only).');
  rows.sort(function (a, b) { return a.order - b.order || a.section.localeCompare(b.section) || b.salary - a.salary || a.name.localeCompare(b.name); });
  return { month: ym, label: fmt_(start, 'MMMM yyyy'), tab: tabName, exists: exists, days: days, prevTab: prevTab ? prevTab.name : '',
    attendanceDays: att ? att.days.length : 0, rows: rows, notGoing: gone, notes: notes };
}

/** Writes the prepared month as a new tab (never overwrites a tab). */
function payCreate_(ctx, d) {
  var ym = str_(d.month);
  if (!/^\d{4}-\d{2}$/.test(ym)) throw new Error('Pick the month.');
  var start = new Date(Number(ym.substring(0, 4)), Number(ym.substring(5, 7)) - 1, 1), DAYS = payDays_(start), name = payTabName_(start);
  var rows = (d.rows || []).filter(function (r) { return str_(r.name) && num_(r.salary) > 0; });
  if (!rows.length) throw new Error('There is nobody to pay.');
  return lock_(function () {
    var ss = paySS_();
    if (ss.getSheetByName(name) || payTabFor_(ym)) throw new Error('"' + name + '" already exists in the Salary Master. Rename or delete it there first.');
    var sh = ss.insertSheet(name, 0), W = PAY_LAYOUT.length;
    var out = [], styles = [], secs = [], cur = null, blockStart = 0, subtotalRows = [];
    var band = new Array(W).fill(''); band[16] = 'DEDUCTION'; band[24] = 'FINAL SALARY PAID';
    out.push(band); styles.push('band');
    out.push(PAY_LAYOUT.slice()); styles.push('head');
    function num(v) { var s = str_(v); if (s === '') return ''; if (s.charAt(0) === '=') return s; var n = Number(s.replace(/[^0-9.\-]/g, '')); return isNaN(n) ? s : n; }
    function closeBlock() {
      if (!cur) return;
      var a = blockStart, b = out.length, r = out.length + 1, line = new Array(W).fill('');
      ['D', 'M', 'N', 'O', 'P', 'Q', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA'].forEach(function (L) { line[payCol_(L)] = '=SUM(' + L + a + ':' + L + b + ')'; });
      line[1] = 'TOTAL ' + cur;
      out.push(line); styles.push('sub'); subtotalRows.push(r);
      out.push(new Array(W).fill('')); styles.push('gap');
    }
    var n = 0;
    rows.forEach(function (x) {
      if (x.section !== cur) {
        closeBlock();
        cur = x.section; secs.push(cur); n = 0;
        var lab = new Array(W).fill(''); lab[1] = cur;
        out.push(lab); styles.push('label');
        blockStart = out.length + 1;
      }
      n++;
      var r = out.length + 1, line = new Array(W).fill('');
      line[0] = x.prefix ? x.prefix + n : n; line[1] = str_(x.name).toUpperCase(); line[2] = str_(x.designation).toUpperCase();
      line[3] = num(x.salary); line[4] = '=' + DAYS + '-I' + r; line[5] = num(x.half) === '' ? 0 : num(x.half); line[6] = '=F' + r + '/2';
      line[7] = num(x.wa) === '' ? 0 : num(x.wa); line[8] = '=H' + r + '+G' + r; line[9] = num(x.paidLeave) === '' ? 0 : num(x.paidLeave);
      line[10] = '=E' + r + '+J' + r; line[11] = '=D' + r + '/' + DAYS; line[12] = num(x.ot); line[13] = num(x.event) === '' ? 0 : num(x.event);
      line[14] = num(x.carry); line[15] = '=L' + r + '*K' + r + '+M' + r + '+N' + r + '+O' + r;
      line[16] = num(x.penalty); line[17] = str_(x.remark); line[18] = num(x.loan); line[19] = num(x.extras); line[20] = num(x.homeStay);
      line[21] = num(x.uniform); line[22] = '=Q' + r + '+S' + r + '+T' + r + '+U' + r + '+V' + r; line[23] = '=P' + r + '-W' + r;
      line[28] = str_(x.pf).toUpperCase();
      out.push(line); styles.push('data');
    });
    closeBlock();
    var gt = new Array(W).fill(''); gt[1] = 'GRAND TOTAL';
    ['D', 'M', 'N', 'O', 'P', 'Q', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA'].forEach(function (L) { gt[payCol_(L)] = '=' + subtotalRows.map(function (r) { return L + r; }).join('+'); });
    out.push(gt); styles.push('grand');
    sh.getRange(1, 1, out.length, W).setValues(out);
    // looks
    sh.getRange(1, 1, 1, W).setFontWeight('bold').setHorizontalAlignment('center');
    sh.getRange(1, 17, 1, 7).setBackground('#FDE8E8'); sh.getRange(1, 25, 1, 4).setBackground('#E3F5EA');
    sh.getRange(2, 1, 1, W).setFontWeight('bold').setBackground('#6B3F1C').setFontColor('#FFFFFF').setWrap(true).setVerticalAlignment('middle');
    styles.forEach(function (s, i) {
      var rg = sh.getRange(i + 1, 1, 1, W);
      if (s === 'label') rg.setFontWeight('bold').setBackground('#F4C97E');
      else if (s === 'sub') rg.setFontWeight('bold').setBackground('#FFF8EC');
      else if (s === 'grand') rg.setFontWeight('bold').setBackground('#FFE3A1');
    });
    var last = out.length;
    sh.getRange(3, 4, last - 2, 1).setNumberFormat('#,##0');
    sh.getRange(3, 12, last - 2, 1).setNumberFormat('#,##0.00');
    sh.getRange(3, 13, last - 2, 12).setNumberFormat('#,##0');
    sh.getRange(3, 16, last - 2, 1).setNumberFormat('#,##0').setFontWeight('bold');
    sh.getRange(3, 24, last - 2, 1).setNumberFormat('#,##0').setFontWeight('bold');
    sh.getRange(3, 25, last - 2, 3).setNumberFormat('#,##0');
    sh.setFrozenRows(2); sh.setFrozenColumns(2);
    [55, 220, 170, 95].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
    SpreadsheetApp.flush();
    // totals for the log
    var tot = sh.getRange(last, 1, 1, W).getValues()[0];
    // the same maths as the formulas, for the log and the message (never depends on the sheet recalculating in time)
    var T = { total: 0, ded: 0, net: 0 };
    rows.forEach(function (x) {
      var n = function (v) { var s0 = str_(v); if (s0.charAt(0) === '=') return s0.slice(1).split('+').reduce(function (a, b) { return a + num_(b); }, 0); return num_(v); };
      var absent = n(x.wa) + n(x.half) / 2, paidFor = DAYS - absent + n(x.paidLeave);
      var total = n(x.salary) / DAYS * paidFor + n(x.ot) + n(x.event) + n(x.carry), ded = n(x.penalty) + n(x.loan) + n(x.extras) + n(x.homeStay) + n(x.uniform);
      T.total += total; T.ded += ded; T.net += total - ded;
    });
    [15, 22, 23].forEach(function (i, k) { if (typeof tot[i] !== 'number') tot[i] = [T.total, T.ded, T.net][k]; });
    var runId = nextId_(SH.PAY_RUNS, 'Run ID', 'PAY-', 4);
    appendObj_(SH.PAY_RUNS, { 'Run ID': runId, 'Month': fmt_(start, 'MMMM yyyy'), 'Tab': name, 'Employees': rows.length, 'Total Salary': round_(num_(tot[15]), 0),
      'Total Deduction': round_(num_(tot[22]), 0), 'Net Pay': round_(num_(tot[23]), 0), 'Prepared By': ctx.name, 'Prepared At': new Date(), 'Status': 'Prepared',
      'Notes': secs.join(', ') });
    paySaveMap_(rows.filter(function (x) { return x.empId; }).map(function (x) { return { name: x.name, empId: x.empId }; }), ctx.name);
    var pen = '';
    if (d.penaltySheet) { try { pen = payPenaltyTab_(ctx, start, rows); } catch (e) { pen = 'Penalty tab: ' + e.message; } }
    log_(ctx, 'Salary prepared', name + ' · ' + rows.length + ' employees · net ' + round_(num_(tot[23]), 0));
    return { message: '"' + name + '" created with ' + rows.length + ' employees — net pay ₹' + Math.round(num_(tot[23])).toLocaleString('en-IN') + '.' + (pen ? ' ' + pen : ''),
      tab: name, url: ss.getUrl() + '#gid=' + sh.getSheetId() };
  });
}
function payCol_(L) { var n = 0; for (var i = 0; i < L.length; i++) n = n * 26 + (L.charCodeAt(i) - 64); return n - 1; }
/** "SEP penalty sheet 2026" — one line per person, like the ones HR keeps by hand. */
function payPenaltyTab_(ctx, start, rows) {
  var name = fmt_(start, 'MMM').toUpperCase() + ' penalty sheet ' + fmt_(start, 'yyyy'), ss = paySS_();
  if (ss.getSheetByName(name)) return '"' + name + '" already exists — left as it is.';
  var list = rows.filter(function (x) { return num_(x.penalty) > 0; });
  var sh = ss.insertSheet(name, 1), head = ['S.No', 'Employee ID', 'Employee Name', 'Department', 'Designation', 'Penalty Count', 'Total Penalty (Rs)', 'Remarks (Date: Reason - Amount)'];
  var body = list.map(function (x, i) {
    var e = laEmp_(x.empId) || {};
    return [i + 1, x.empId, str_(x.name).toUpperCase(), str_(e.department).toUpperCase(), str_(x.designation), (x.penaltyLines || []).length, 'Rs ' + num_(x.penalty), (x.penaltyLines || []).join(' | ')];
  });
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#6B3F1C').setFontColor('#FFFFFF');
  if (body.length) sh.getRange(2, 1, body.length, head.length).setValues(body).setWrap(true).setVerticalAlignment('top');
  sh.setColumnWidth(8, 520); sh.setFrozenRows(1);
  return '"' + name + '" written (' + body.length + ' people).';
}

/* ============================ SALARY SLIPS ============================ */
function slipMeta_(ctx) {
  return { tabs: payTabs_().map(function (t) { return { name: t.name, key: t.key }; }), lines: SLIP_LINES.map(function (l) { return { key: l[0], label: l[1], group: l[2] }; }),
    heading: set_('Salary Slip Heading', 'Chai Govindam') };
}
function slipLoad_(ctx, d) {
  var P = payParse_(str_(d.tab)), m = payMonthOf_(P.tab), match = payMatcher_(), master = laMaster_();
  var rows = P.rows.map(function (r) {
    var x = match(r.name, r.section), e = x ? master[x.empId.toUpperCase()] : null;
    var v = r.values, out = {};
    SLIP_LINES.forEach(function (l) { if (l[0] !== 'earned') out[l[0]] = v[l[0]] === undefined ? '' : v[l[0]]; });
    out.earned = round_(num_(v.daily) * num_(v.paidFor), 2);
    return { row: r.row, name: r.name, designation: str_(v.designation), section: r.section, values: out, pf: str_(v.pf),
      empId: x ? x.empId : '', empName: e ? e.name : '', how: x ? x.how : '', location: e ? e.location : r.section };
  });
  return { tab: P.tab, month: m ? fmt_(m, 'MMMM yyyy') : P.tab, days: m ? payDays_(m) : '', rows: rows, url: P.url,
    unmatched: rows.filter(function (r) { return !r.empId; }).length,
    people: Object.keys(master).map(function (k) { var e = master[k]; return { id: e.id, name: e.name, location: e.location, active: e.active }; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); }) };
}
function slipMap_(ctx, d) {
  var nm = str_(d.name), id = str_(d.empId);
  if (!nm || !id) throw new Error('Pick the employee.');
  if (!laEmp_(id)) throw new Error('Employee ' + id + ' is not in the master.');
  paySaveMap_([{ name: nm, empId: id }], ctx.name);
  return { message: nm + ' → ' + (laEmp_(id).name) + ' saved. It will be used for every month.' };
}
function slipMoney_(v) {
  if (str_(v) === '') return '';
  var n = Number(v); if (isNaN(n)) return esc_(v);
  return '₹ ' + Math.round(n).toLocaleString('en-IN');
}
function slipNum_(v) { if (str_(v) === '') return ''; var n = Number(v); return isNaN(n) ? esc_(v) : String(round_(n, 1)); }
function slipCol_(head, vals, words) {
  for (var i = 0; i < head.length; i++) { var h = str_(head[i]).toLowerCase(); if (words.some(function (w) { return h.indexOf(w) >= 0; })) return str_(vals[i]); }
  return '';
}
function slipPeople_() {
  if (__M.slipPeople) return __M.slipPeople;
  var out = {};
  try {
    var R = emRead_(emMasterName_(), {});
    R.rows.forEach(function (r) {
      var id = str_(emVal_(R.head, r.vals, 'Employee Id')).toUpperCase(); if (!id) return;
      out[id] = { bank: emVal_(R.head, r.vals, 'Bank Name'), acct: emVal_(R.head, r.vals, 'AC Num'), ifsc: emVal_(R.head, r.vals, 'IFSC'),
        uan: slipCol_(R.head, r.vals, ['uan']), pfNo: slipCol_(R.head, r.vals, ['pf no', 'pf number', 'pf a/c']), esicNo: slipCol_(R.head, r.vals, ['esic no', 'esic number', 'esi no', 'ip no']) };
    });
  } catch (e) {}
  try {
    var S = emRead_(EM.SALARY, {});
    S.rows.forEach(function (r) {
      var id = str_(emVal_(S.head, r.vals, 'Employee Id')).toUpperCase(); if (!id) return;
      var x = out[id] = out[id] || {};
      x.pfOn = /^y/i.test(str_(emVal_(S.head, r.vals, 'PF (Yes/No)')));
      x.basic = num_(emVal_(S.head, r.vals, 'BASIC SALARY')); x.allowance = num_(emVal_(S.head, r.vals, 'All Allowance'));
      x.pf = num_(emVal_(S.head, r.vals, 'PF (12%)')); x.esic = num_(emVal_(S.head, r.vals, 'ESIC (0.75%)'));
      x.uan = x.uan || slipCol_(S.head, r.vals, ['uan']); x.pfNo = x.pfNo || slipCol_(S.head, r.vals, ['pf no', 'pf number']); x.esicNo = x.esicNo || slipCol_(S.head, r.vals, ['esic no', 'esi no', 'ip no']);
    });
  } catch (e) {}
  __M.slipPeople = out;
  return out;
}
function slipModel_(r, meta) {
  var e = laEmp_(r.empId) || {}, x = slipPeople_()[str_(r.empId).toUpperCase()] || {}, v = r.values;
  var n = function (k) { return round_(num_(v[k]), 2); };
  var earn = [['Monthly salary', n('salary'), false]];
  if (x.basic) earn.push(['Basic', x.basic, false]);
  if (x.allowance) earn.push(['Allowance', x.allowance, false]);
  earn.push(['Earned for ' + slipNum_(v.paidFor) + ' days', round_(n('daily') * num_(v.paidFor), 2), true]);
  [['ot', 'Overtime'], ['event', 'Event'], ['carry', 'Carry forward']].forEach(function (k) { if (n(k[0])) earn.push([k[1], n(k[0]), true]); });
  var ded = [];
  if (x.pfOn && x.pf) ded.push(['PF (12%)', x.pf]);
  if (x.pfOn && x.esic) ded.push(['ESIC (0.75%)', x.esic]);
  [['penalty', 'Penalty'], ['loan', 'Advance'], ['extras', 'Extras'], ['homeStay', 'Home stay'], ['uniform', 'Uniform deposit']].forEach(function (k) { if (n(k[0])) ded.push([k[1], n(k[0])]); });
  var acct = str_(x.acct), present = num_(v.full) + num_(v.half) / 2, holiday = Math.max(0, round_(num_(v.paidFor) - present - num_(v.paidLeave), 1));
  return { row: r.row, company: meta.heading, logo: meta.logo, title: 'Salary Slip · ' + meta.month,
    details: [['Name', e.name || r.name], ['Employee code', r.empId || ''], ['Designation', r.designation || e.designation || ''], ['Location', e.location || r.section || ''],
      ['UAN no.', x.uan || ''], ['PF no.', x.pfNo || ''], ['ESIC no.', x.esicNo || ''], ['Bank name', x.bank || ''], ['Bank account no.', acct ? emMask_(acct) : ''],
      ['Days paid for', slipNum_(v.paidFor) + (meta.days ? ' of ' + meta.days : '') + ' (present ' + slipNum_(present) + ' + weekly holiday ' + slipNum_(holiday) + ' + paid leave ' + slipNum_(v.paidLeave || 0) + ')']],
    earnings: earn, deductions: ded, name: e.name || r.name, empId: r.empId };
}
function slipSum_(list, all) { return round_((list || []).reduce(function (s, l) { return s + ((all || l[2] !== false) ? num_(l[1]) : 0); }, 0), 2); }
function slipRender_(m) {
  var cell = 'padding:6px 9px;border-bottom:1px solid #EFE4D6;font-size:11.5px';
  var gross = slipSum_(m.earnings), ded = slipSum_(m.deductions, true), net = round_(gross - ded, 2);
  var money = function (v) { return /^-?[\d.,]+$/.test(str_(v)) ? slipMoney_(num_(String(v).replace(/,/g, ''))) : esc_(v); };
  var details = (m.details || []).filter(function (p) { return str_(p[0]); });
  var rowsD = []; for (var i = 0; i < details.length; i += 2) rowsD.push(details.slice(i, i + 2));
  var table = function (title, list, total, label) {
    return '<table style="width:100%;border-collapse:collapse"><tr><th colspan="2" style="text-align:left;padding:7px 9px;background:#6B3F1C;color:#fff;font-size:12px">' + esc_(title) + '</th></tr>' +
      (list || []).filter(function (l) { return str_(l[0]); }).map(function (l) { return '<tr><td style="' + cell + (l[2] === false ? ';color:#7A6A5D' : '') + '">' + esc_(l[0]) + '</td><td style="' + cell + ';text-align:right">' + money(l[1]) + '</td></tr>'; }).join('') +
      '<tr><td style="' + cell + ';font-weight:bold;background:#FBF3E7">' + esc_(label) + '</td><td style="' + cell + ';font-weight:bold;background:#FBF3E7;text-align:right">' + slipMoney_(total) + '</td></tr></table>';
  };
  return '<div style="font-family:Arial,Helvetica,sans-serif;color:#2B1D12;padding:24px 28px;page-break-after:always">' +
    '<table style="width:100%;border-collapse:collapse;border-bottom:3px solid #6B3F1C;margin-bottom:14px"><tr>' +
    (m.logo ? '<td style="width:70px;padding:0 0 10px 0;vertical-align:middle"><img src="' + esc_(m.logo) + '" style="height:58px;max-width:70px"></td>' : '') +
    '<td style="padding:0 0 10px 10px;vertical-align:middle"><div style="font-size:22px;font-weight:bold;color:#6B3F1C">' + esc_(m.company) + '</div>' +
    '<div style="font-size:12.5px;color:#7A6A5D;margin-top:3px">' + esc_(m.title) + '</div></td></tr></table>' +
    '<div style="font-size:12px;font-weight:bold;color:#6B3F1C;margin:0 0 6px">Employee details</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:14px;border:1px solid #EFE4D6">' + rowsD.map(function (pr) {
      return '<tr>' + pr.map(function (p) { return '<td style="' + cell + ';color:#7A6A5D;width:18%">' + esc_(p[0]) + '</td><td style="' + cell + ';font-weight:bold;width:32%">' + esc_(p[1] || '—') + '</td>'; }).join('') +
        (pr.length === 1 ? '<td style="' + cell + '"></td><td style="' + cell + '"></td>' : '') + '</tr>';
    }).join('') + '</table>' +
    '<div style="font-size:12px;font-weight:bold;color:#6B3F1C;margin:0 0 6px">Salary breakup</div>' +
    '<table style="width:100%;border-collapse:collapse"><tr><td style="width:50%;vertical-align:top;padding-right:7px">' + table('Earnings', m.earnings, gross, 'Gross earned') +
    '</td><td style="width:50%;vertical-align:top;padding-left:7px">' + table('Deductions', m.deductions, ded, 'Total deductions') + '</td></tr></table>' +
    '<div style="margin-top:12px;border:2px solid #6B3F1C;border-radius:8px;padding:12px 14px;background:#FFF8EC"><span style="font-size:13px;color:#7A6A5D">Net pay</span>' +
    '<span style="float:right;font-size:20px;font-weight:bold;color:#6B3F1C">' + slipMoney_(net) + '</span></div>' +
    '<div style="margin-top:24px;font-size:10px;color:#9A8B7E;text-align:center">This is a computer generated salary slip and does not need a signature.</div></div>';
}
function slipMetaOf_(L) { return { month: L.month, days: L.days, heading: set_('Salary Slip Heading', 'Chai Govindam'), logo: set_('Salary Slip Logo URL', '') || set_('Logo URL', APP.LOGO) }; }
function slipModelGet_(ctx, d) {
  var L = slipLoad_(ctx, { tab: d.tab }), r = L.rows.filter(function (x) { return x.row === Number(d.row); })[0];
  if (!r) throw new Error('That row is not on ' + L.tab + ' any more — reload.');
  return slipModel_(r, slipMetaOf_(L));
}
function slipExtra_(m, fields) {
  (fields || []).forEach(function (f) { var part = { details: 'details', earnings: 'earnings', deductions: 'deductions' }[str_(f.part)]; if (part && str_(f.label)) m[part].push([str_(f.label), str_(f.value), true]); });
  return m;
}
/**
 * d = { tab, rows: [sheet row numbers], lines: [keys], hideZero, mode: 'merged' | 'each', save }
 * merged → one PDF with every slip; each → one PDF per person (max 20 per call — the page zips them).
 */
function slipPdf_(ctx, d) {
  var L = slipLoad_(ctx, { tab: d.tab }), want = (d.rows || []).map(Number), meta = slipMetaOf_(L), edited = {};
  (d.models || []).forEach(function (m) { if (m && m.row) edited[Number(m.row)] = m; });
  var sel = L.rows.filter(function (r) { return want.indexOf(r.row) >= 0 || edited[r.row]; });
  if (!sel.length) throw new Error('Tick at least one person.');
  var model = function (r) {
    var m = edited[r.row] ? Object.assign(slipModel_(r, meta), edited[r.row]) : slipExtra_(slipModel_(r, meta), d.fields);
    m.company = str_(m.company) || meta.heading; m.logo = m.logo === undefined ? meta.logo : m.logo;
    return m;
  };
  var wrap = function (inner) { return '<html><head><meta charset="utf-8"><style>@page{size:A4;margin:10mm}body{margin:0}</style></head><body>' + inner + '</body></html>'; };
  var safe = function (s) { return str_(s).replace(/[\\\/:*?"<>|]+/g, '-').trim(); };
  var out = { files: [] };
  if (d.mode === 'each') {
    if (sel.length > 20) throw new Error('At most 20 slips per request — the page sends them in batches.');
    sel.forEach(function (r) {
      var blob = Utilities.newBlob(wrap(slipRender_(model(r))), 'text/html', 'slip.html').getAs('application/pdf');
      out.files.push({ name: safe('Salary Slip ' + L.tab + ' - ' + (r.empId ? r.empId + ' ' : '') + (r.empName || r.name)) + '.pdf', b64: Utilities.base64Encode(blob.getBytes()) });
    });
  } else {
    var html = wrap(sel.map(function (r) { return slipRender_(model(r)); }).join(''));
    var pdf = Utilities.newBlob(html, 'text/html', 'slips.html').getAs('application/pdf');
    var fname = safe('Salary Slips ' + L.tab + (sel.length === 1 ? ' - ' + (sel[0].empName || sel[0].name) : ' (' + sel.length + ')')) + '.pdf';
    pdf.setName(fname);
    out.files.push({ name: fname, b64: Utilities.base64Encode(pdf.getBytes()) });
    if (d.save) { var f = folder_('Salary Slips').createFile(pdf); out.driveUrl = f.getUrl(); }
  }
  try { appendObj_(SH.SLIP_LOG, { 'Timestamp': new Date(), 'Month': L.month, 'Tab': L.tab, 'Employees': sel.length, 'Format': d.mode === 'each' ? 'One PDF each' : 'Merged PDF', 'By': ctx.name, 'Notes': d.save ? 'Saved to Drive' : '' }); } catch (e) {}
  return out;
}
