/*************************************************************************
 *  Reports.gs — every attendance / penalty report as Excel (.xlsx) or PDF.
 *
 *  A report is written into a temporary Google Sheet (one tab per table,
 *  coloured like the Attendance app), then exported:
 *     .xlsx  Drive export
 *     .pdf   the sheet's own PDF export — A4 landscape, fitted to the page
 *            width, the header row repeated on every page
 *  The temporary sheet is trashed unless "Keep a copy in Drive" is ticked.
 *
 *  Penalties always show both kinds:
 *     Automatic   worked out from the punches — Late punch in 39 min,
 *                 Unapproved leave (No leave request) …
 *     By hand     Not In Uniform, Misbehaviour, Not Groomed … with the
 *                 remark and who gave it
 *************************************************************************/

function repFormat_(f) { return /^pdf$/i.test(str_(f)) ? 'pdf' : 'xlsx'; }
function repCur_() { return str_(atCfg_('CURRENCY_SYMBOL', 'Rs.')); }
function repBook_(name) {
  var ss = SpreadsheetApp.create(name + ' ' + Utilities.formatDate(new Date(), APP.TZ, 'yyyyMMdd-HHmmss'));
  return { ss: ss, starter: ss.getSheets(), tabs: 0, used: {} };
}
/** A unique, valid tab name. */
function repTabName_(B, name) {
  var base = str_(name).replace(/[\[\]\*\?\/\\:]/g, ' ').substring(0, 90) || 'Report', n = base, i = 2;
  while (B.used[n.toLowerCase()]) n = base.substring(0, 85) + ' (' + (i++) + ')';
  B.used[n.toLowerCase()] = 1;
  return n;
}
/**
 * One table on its own tab.
 * t = { name, title, sub, head[], widths[], rows[][], align[] ('left'|'center'|'right'), money[] (column indexes),
 *       wrap[] (column indexes), bg[] (one colour per row, optional), total[] (a last row, optional) }
 */
function repTable_(B, t) {
  var c = atPalette_(), cur = repCur_(), n = t.head.length, rows = t.rows || [];
  var sh = B.ss.insertSheet(repTabName_(B, t.name)); B.tabs++;
  atTrim_(sh, n, 4 + rows.length + (t.total ? 1 : 0) + 1);
  sh.getRange(1, 1, 1, n).merge().setValue(t.title).setFontSize(15).setFontWeight('bold').setFontColor(c.text).setBackground(c.title)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(1, 40);
  sh.getRange(2, 1, 1, n).merge().setValue(t.sub || '').setFontSize(10).setFontWeight('bold').setFontColor(c.text).setBackground(c.title).setHorizontalAlignment('center').setWrap(true);
  sh.setRowHeight(2, 24); sh.setRowHeight(3, 6);
  sh.getRange(4, 1, 1, n).setValues([t.head]).setFontWeight('bold').setFontColor(c.text).setBackground(c.header)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sh.setRowHeight(4, 34);
  var body = rows.slice();
  if (t.total) body.push(t.total);
  if (body.length) {
    var rg = sh.getRange(5, 1, body.length, n);
    rg.setValues(body.map(function (r) { var o = r.slice(0, n); while (o.length < n) o.push(''); return o.map(function (v) { return v === null || v === undefined ? '' : v; }); }))
      .setFontSize(9).setFontColor(c.text).setVerticalAlignment('middle');
    if (t.bg && t.bg.length) {
      rg.setBackgrounds(body.map(function (r, i) { var col = i < rows.length ? (t.bg[i] || '#FFFFFF') : c.header, line = []; for (var k = 0; k < n; k++) line.push(col); return line; }));
    }
    (t.align || []).forEach(function (al, i) { if (al) sh.getRange(5, i + 1, body.length, 1).setHorizontalAlignment(al); });
    (t.money || []).forEach(function (i) { sh.getRange(5, i + 1, body.length, 1).setNumberFormat('"' + cur + ' "#,##0').setHorizontalAlignment('right'); });
    (t.wrap || []).forEach(function (i) { sh.getRange(5, i + 1, body.length, 1).setWrap(true); });
    if (t.total) sh.getRange(4 + body.length, 1, 1, n).setFontWeight('bold').setBackground(c.header);
    sh.getRange(4, 1, body.length + 1, n).setBorder(true, true, true, true, true, true, c.border, SpreadsheetApp.BorderStyle.SOLID);
  } else {
    sh.getRange(5, 1, 1, n).merge().setValue('Nothing for these dates.').setFontColor('#8A7A6D').setHorizontalAlignment('center');
  }
  (t.widths || []).forEach(function (w, i) { if (i < n) sh.setColumnWidth(i + 1, w); });
  sh.setFrozenRows(4);
  return sh;
}
function repNoFetch_(e) { return /UrlFetchApp|external_request|permission/i.test(String(e && e.message || e)); }
var REP_ALLOW_MSG = 'Downloads need a one-time permission: the owner of the One Login sheet opens it, picks CG One Login ▸ Allow downloads (one time) and clicks Allow.';
function repPdf_(id) {
  var url = 'https://docs.google.com/spreadsheets/d/' + id + '/export?format=pdf&size=A4&portrait=false&fitw=true&gridlines=false' +
    '&printtitle=false&sheetnames=false&pagenum=CENTER&fzr=true&top_margin=0.35&bottom_margin=0.35&left_margin=0.25&right_margin=0.25&horizontal_alignment=CENTER';
  var res;
  try { res = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true }); }
  catch (e) { if (repNoFetch_(e)) return DriveApp.getFileById(id).getAs('application/pdf'); throw e; }
  if (res.getResponseCode() >= 300) throw new Error('The PDF could not be produced — try again in a minute.');
  return res.getBlob();
}
/** Exports the book and returns what the page downloads. */
function repFinish_(B, fileName, format, keep) {
  if (!B.tabs) repTable_(B, { name: 'Report', title: fileName, sub: '', head: [''], rows: [] });
  B.starter.forEach(function (s) { try { B.ss.deleteSheet(s); } catch (e) {} });
  SpreadsheetApp.flush();
  var id = B.ss.getId(), pdf = format === 'pdf', blob = pdf ? repPdf_(id) : atExportXlsx_(id), url = '';
  if (keep) url = 'https://docs.google.com/spreadsheets/d/' + id + '/edit';
  else { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
  var name = fileName.replace(/[\\\/:*?"<>|]+/g, '-') + (pdf ? '.pdf' : '.xlsx');
  return { fileName: name, base64: Utilities.base64Encode(blob.getBytes()), driveUrl: url, format: format,
    mime: pdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
}

/* ============================ PENALTY TEXT ============================ */
function repAutoLines_(r) { return (r.penaltyLines || []).filter(function (l) { return !l.manual && l.amount > 0; }); }
function repHandLines_(r) { return (r.penaltyLines || []).filter(function (l) { return l.manual && l.amount > 0; }); }
function repAutoText_(r, l) {
  var q = '';
  if (/^(LATE_IN|EARLY_OUT|LATE_OUT|EXCESS_BREAK)$/.test(l.type)) q = ' ' + Math.round(l.metric) + ' min';
  else if (l.type === 'SHORT_HOURS') q = ' ' + round_(l.metric, 2) + ' hr';
  else if (l.type === 'UNAPPROVED_LEAVE' && r.leaveText) q = ' (' + r.leaveText + ')';
  return l.label + q;
}
function repHandText_(l) { return l.label + (l.notes ? ' — ' + l.notes : '') + (l.by ? ' [by ' + l.by + ']' : ''); }
function repSum_(lines) { return lines.reduce(function (s, l) { return s + (Number(l.amount) || 0); }, 0); }
function repJoin_(arr) { return arr.join('\n'); }

/** Penalty tab of one location: one row per person-day, automatic and by-hand side by side. */
function repPenaltyTable_(B, name, groupName, rows, a, b) {
  var c = atPalette_(), cur = repCur_(), pr = rows.filter(function (r) { return r.penaltyAmount > 0; }), tA = 0, tH = 0, tT = 0, kinds = {};
  var body = pr.map(function (r) {
    var au = repAutoLines_(r), hd = repHandLines_(r), sa = repSum_(au), sm = repSum_(hd);
    tA += sa; tH += sm; tT += r.penaltyAmount;
    au.concat(hd).forEach(function (l) { kinds[l.label] = (kinds[l.label] || 0) + l.amount; });
    return [r.employeeId, r.name, r.designation, r.date, r.shift || '-', r.punchIn, r.punchOut, r.workedText, r.status,
      repJoin_(au.map(function (l) { return repAutoText_(r, l); })) || '—', sa || '', repJoin_(hd.map(repHandText_)) || '—', sm || '', r.penaltyAmount];
  });
  var kindText = Object.keys(kinds).sort(function (x, y) { return kinds[y] - kinds[x]; }).map(function (k) { return k + ' ' + cur + ' ' + atMoney_(kinds[k]).replace(/\.00$/, ''); }).join('   ·   ');
  repTable_(B, { name: name, title: 'Penalty - ' + groupName + ' - ' + atRange_(a, b),
    sub: pr.length + ' penalty day(s)   ·   Automatic ' + cur + ' ' + atMoney_(tA) + '   ·   By hand ' + cur + ' ' + atMoney_(tH) + '   ·   Total ' + cur + ' ' + atMoney_(tT) + (kindText ? '\n' + kindText : ''),
    head: ['Employee ID', 'Employee Name', 'Designation', 'Date', 'Shift', 'Punch In', 'Punch Out', 'Worked', 'Status',
      'Automatic penalty', 'Automatic (' + cur + ')', 'Given by hand — remark', 'By hand (' + cur + ')', 'Total (' + cur + ')'],
    widths: __M.repPdf ? [78, 140, 110, 75, 60, 68, 68, 68, 85, 175, 72, 190, 72, 72] : [95, 170, 140, 85, 70, 80, 80, 80, 95, 220, 85, 240, 85, 85], rows: body,
    align: ['center', 'left', 'left', 'center', 'center', 'center', 'center', 'center', 'center', 'left', 'right', 'left', 'right', 'right'],
    money: [10, 12, 13], wrap: [9, 11], bg: pr.map(function (r) { return atStatusColor_(r.status, c); }),
    total: ['', 'Total', '', '', '', '', '', '', '', '', tA, '', tH, tT] });
}
/** Per person: days, automatic, by hand, total and what it was for. */
function repSummaryTable_(B, title, people, a, b) {
  var cur = repCur_(), tA = 0, tH = 0, tT = 0, tD = 0;
  var body = people.map(function (x) {
    tA += x.auto; tH += x.manual; tT += x.total; tD += x.days;
    var by = Object.keys(x.kinds).sort(function (p, q) { return x.kinds[q] - x.kinds[p]; }).map(function (k) { return k + ' ' + cur + ' ' + atMoney_(x.kinds[k]).replace(/\.00$/, ''); }).join(', ');
    return [x.employeeId, x.name, x.designation, x.group, x.days, x.auto || '', x.manual || '', x.total, by];
  });
  repTable_(B, { name: 'Penalty Summary', title: title + ' - ' + atRange_(a, b),
    sub: people.length + ' people   ·   Automatic ' + cur + ' ' + atMoney_(tA) + '   ·   By hand ' + cur + ' ' + atMoney_(tH) + '   ·   Total ' + cur + ' ' + atMoney_(tT),
    head: ['Employee ID', 'Employee Name', 'Designation', 'Location', 'Days', 'Automatic (' + cur + ')', 'By hand (' + cur + ')', 'Total (' + cur + ')', 'For'],
    widths: [95, 180, 150, 110, 55, 95, 95, 95, 330], rows: body,
    align: ['center', 'left', 'left', 'left', 'center', 'right', 'right', 'right', 'left'], money: [5, 6, 7], wrap: [8],
    total: ['', 'Total', '', '', tD, tA, tH, tT, ''] });
}
/** People totals from engine rows (+ by-hand penalties of days not uploaded yet). */
function repPeople_(rows, extra) {
  var by = {};
  rows.concat(extra || []).forEach(function (r) {
    if (!(r.penaltyAmount > 0)) return;
    var k = r.employeeId + '|' + r.name, x = by[k] = by[k] || { employeeId: r.employeeId, name: r.name, designation: r.designation, group: r.groupName, days: 0, auto: 0, manual: 0, total: 0, kinds: {} };
    var hd = repSum_(repHandLines_(r));
    x.days++; x.manual += hd; x.auto += r.penaltyAmount - hd; x.total += r.penaltyAmount;
    (r.penaltyLines || []).forEach(function (l) { if (l.amount > 0) x.kinds[l.label] = (x.kinds[l.label] || 0) + l.amount; });
  });
  return Object.keys(by).map(function (k) { var x = by[k]; x.auto = round_(Math.max(0, x.auto), 2); x.manual = round_(x.manual, 2); x.total = round_(x.total, 2); return x; })
    .sort(function (p, q) { return q.total - p.total || p.name.localeCompare(q.name); });
}
/** By-hand penalties given for days whose punches are not uploaded yet — as engine-like rows. */
function repPendingHand_(dir, a, b, covered, ok) {
  var out = [];
  atRead_(AT_SH.MANUAL).forEach(function (r) {
    var k = atKey_(r['Date']); if (!k || k < a || k > b || covered[k] || /^no$/i.test(str_(r['Active']))) return;
    var rec = penRec_(dir, str_(r['Employee ID'])); if (!rec || !rec.rule || !rec.rule.applyPenalty || (ok && !ok(rec))) return;
    var amt = Number(r['Amount']) || 0; if (!(amt > 0)) return;
    out.push({ employeeId: rec.employeeId, name: rec.name, designation: rec.designation, groupName: rec.rule.groupName, groupKey: rec.rule.groupKey,
      date: atDateOut_(atKeyDate_(k)), dateKey: k, shift: '', punchIn: '-', punchOut: '-', workedText: '-', status: 'Not uploaded yet', penaltyAmount: amt,
      penaltyLines: [{ label: str_(r['Penalty Type']), type: 'MANUAL', amount: amt, manual: true, notes: str_(r['Notes']), by: str_(r['Added By']) }] });
  });
  return out;
}

/* ============================ PENALTY SECTION DOWNLOADS ============================ */
/**
 * Penalty ▸ Month summary / Given by hand ▸ Excel or PDF. The outlet incharge gets his own outlet only.
 * d = { kind: 'summary' | 'charges', from, to, group, outletId, format }
 */
function penReport_(ctx, d) {
  var fmt = repFormat_(d.format), kind = str_(d.kind) === 'charges' ? 'charges' : 'summary', sc = penScope_(ctx);
  var R = penRange_(d, kind === 'charges' ? 400 : 93), gk = sc.wide ? (str_(d.group) || null) : null, oid = str_(d.outletId);
  var who = gk ? ((atDirectory_(false).rules.groups[gk] || {}).groupName || gk) : (sc.wide ? 'All Locations' : sc.outlets.map(function (id) { var o = outletById_(id); return o ? o.name : id; }).join(', '));
  if (oid) { var oo = outletById_(oid); who = oo ? oo.name : who; }
  var fileName = (kind === 'charges' ? 'Penalties given by hand' : 'Penalty Report') + ' - ' + who + ' - ' + atRange_(R.a, R.b).replace(/\//g, '-');
  var B = repBook_(fileName), cur = repCur_();
  __M.repPdf = fmt === 'pdf';
  if (kind === 'charges') {
    var C = penCharges_(ctx, { from: R.a, to: R.b }), list = C.entries.filter(function (c) { return !oid || c.outletId === oid; }), tot = 0;
    list.forEach(function (c) { if (c.active) tot += c.amount; });
    repTable_(B, { name: 'Given by hand', title: 'Penalties given by hand - ' + who + ' - ' + atRange_(R.a, R.b),
      sub: list.length + ' entr' + (list.length === 1 ? 'y' : 'ies') + '   ·   Total ' + cur + ' ' + atMoney_(tot),
      head: ['Date', 'Employee ID', 'Employee Name', 'Designation', 'Location', 'Penalty', 'Remark', 'Amount (' + cur + ')', 'Given by', 'Given at'],
      widths: [85, 95, 170, 140, 100, 140, 260, 90, 130, 130], rows: list.map(function (c) {
        return [c.date, c.employeeId, c.name, c.designation, c.group, c.penaltyType + (c.active ? '' : ' (switched off)'), c.notes || '—', c.amount, c.addedBy, c.addedAt]; }),
      align: ['center', 'center', 'left', 'left', 'left', 'left', 'left', 'right', 'left', 'center'], money: [7], wrap: [6],
      total: ['', '', 'Total', '', '', '', '', tot, '', ''] });
  } else {
    var b = atBuild_(R.a, R.b, gk, false), dir = b.directory, covered = {};
    b.rows.forEach(function (r) { covered[r.dateKey] = true; });
    var ok = function (rec) { return rec && sc.has(rec) && (!oid || sc.outletOf(rec) === oid) && (!gk || (rec.rule && rec.rule.groupKey === gk)); };
    var rows = b.rows.filter(function (r) { return ok(penRec_(dir, r.employeeId)); }).concat(repPendingHand_(dir, R.a, R.b, covered, ok));
    repSummaryTable_(B, 'Penalty Summary - ' + who, repPeople_(rows), R.a, R.b);
    var groups = {};
    rows.forEach(function (r) { (groups[r.groupKey] = groups[r.groupKey] || { name: r.groupName, rows: [] }).rows.push(r); });
    Object.keys(groups).sort().forEach(function (k) {
      var g = groups[k]; g.rows.sort(function (p, q) { return p.dateKey === q.dateKey ? p.name.localeCompare(q.name) : (p.dateKey < q.dateKey ? -1 : 1); });
      repPenaltyTable_(B, g.name + ' Penalty', g.name, g.rows, R.a, R.b);
    });
  }
  var out = repFinish_(B, fileName, fmt, false);
  log_(ctx, 'Penalty report', out.fileName);
  return out;
}

/* ============================ RUNNING ADVANCES (per employee per month) ============================ */
/**
 * Every advance of one month (the Loan & Advance "Advance <Month YYYY>" tab) per employee: what was asked, what was
 * approved, its stage and when it was paid. "Running" = approved by Admin or paid — the amount Salary Preparation
 * deducts in its Loan & Advance column for that month. Still with the incharge / HR / Admin = waiting (not deducted).
 */
function repAdvances_(start) {
  var label = monthLabel_(start), now = new Date();
  var back = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth() + 1;
  var by = {};
  laAdvRead_(Math.max(1, back), function (a) { return a.month === label; }).forEach(function (a) {
    var id = /GMT[+-]\d{4}|^\w{3} \w{3} \d{1,2} \d{4}/.test(str_(a.empId)) ? '' : str_(a.empId);   // a date typed in the ID column of an old row
    var k = (id || 'NAME:' + str_(a.name)).toUpperCase(), x = by[k] = by[k] || { empId: id, name: a.name, designation: a.designation, location: a.location, items: [], running: 0, waiting: 0, paid: 0 };
    var amt = a.stage === 'REJECTED' ? 0 : (a.admStatus === 'APPROVED' || a.payStatus === 'PAID') ? (a.admAmount || a.hrAmount || a.incAmount) : 0;
    var wait = a.stage === 'REJECTED' || amt > 0 ? 0 : (a.hrAmount || a.incAmount || a.requested);
    x.items.push({ applied: a.applied, purpose: a.purpose, requested: a.requested, approved: amt, waiting: wait, stage: a.stageText, paid: a.payStatus === 'PAID' ? (a.payTime || 'Paid') : '' });
    x.running += amt; x.waiting += wait; if (a.payStatus === 'PAID') x.paid += amt;
  });
  return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.running - a.running || a.name.localeCompare(b.name); });
}
function repMonth_(ym) {
  var m = /^(\d{4})-(\d{2})$/.exec(str_(ym)); if (!m) throw new Error('Pick the month.');
  return new Date(Number(m[1]), Number(m[2]) - 1, 1);
}
/** Reports ▸ Running advances: on screen (format blank) or as Excel / PDF. */
function repAdvancesReport_(ctx, d) {
  var start = repMonth_(d.month), list = repAdvances_(start), label = monthLabel_(start), cur = repCur_();
  var tot = list.reduce(function (s, x) { return s + x.running; }, 0), wait = list.reduce(function (s, x) { return s + x.waiting; }, 0);
  if (!str_(d.format)) return { month: label, people: list, total: tot, waiting: wait };
  var fileName = 'Running Advances - ' + label, B = repBook_(fileName);
  __M.repPdf = repFormat_(d.format) === 'pdf';
  repTable_(B, { name: 'Per employee', title: 'Running advances - ' + label,
    sub: list.length + ' people   ·   Running (approved / paid) ' + cur + ' ' + atMoney_(tot) + '   ·   Waiting ' + cur + ' ' + atMoney_(wait) + '   ·   goes to Salary Preparation ▸ Loan & Advance',
    head: ['Employee ID', 'Employee Name', 'Designation', 'Location', 'Advances', 'Running (' + cur + ')', 'Paid (' + cur + ')', 'Waiting (' + cur + ')'],
    widths: [95, 180, 150, 130, 70, 110, 100, 100], rows: list.map(function (x) { return [x.empId, x.name, x.designation, x.location, x.items.length, x.running, x.paid || '', x.waiting || '']; }),
    align: ['center', 'left', 'left', 'left', 'center', 'right', 'right', 'right'], money: [5, 6, 7], total: ['', 'Total', '', '', '', tot, '', wait] });
  var lines = [];
  list.forEach(function (x) { x.items.forEach(function (i) { lines.push([x.empId, x.name, i.applied, i.purpose, i.requested, i.approved || '', i.stage, i.paid]); }); });
  repTable_(B, { name: 'Every advance', title: 'Advances applied in ' + label, sub: lines.length + ' advance(s)',
    head: ['Employee ID', 'Employee Name', 'Applied', 'Purpose', 'Requested (' + cur + ')', 'Running (' + cur + ')', 'Stage', 'Paid'],
    widths: [95, 180, 140, 220, 110, 110, 170, 100], rows: lines, align: ['center', 'left', 'center', 'left', 'right', 'right', 'left', 'center'], money: [4, 5], wrap: [3] });
  return repFinish_(B, fileName, repFormat_(d.format), false);
}

/* ============================ LEAVE (per month) ============================ */
function repLeaveReport_(ctx, d) {
  var start = repMonth_(d.month), label = monthLabel_(start), a = iso_(start), b = iso_(new Date(start.getFullYear(), start.getMonth() + 1, 0));
  var list = laLeaveRead_(4, function (l) { return l.fromKey <= b && l.toKey >= a; }).map(function (l) {
    var e = laEmp_(l.empId) || {};
    return [l.empId, l.name, l.designation, e.location || '', l.from, l.to, l.days, l.reason, l.stageText, l.l1By ? l.l1 + ' · ' + l.l1By : (l.l1 || '—'),
      l.finalBy ? l.final + ' · ' + l.finalBy : (l.final || '—'), l.replacement || '—'];
  });
  var fileName = 'Leave Report - ' + label, B = repBook_(fileName);
  __M.repPdf = repFormat_(d.format) === 'pdf';
  repTable_(B, { name: 'Leave', title: 'Leave - ' + label, sub: list.length + ' leave(s) touching ' + label,
    head: ['Employee ID', 'Employee Name', 'Designation', 'Location', 'From', 'To', 'Days', 'Reason', 'Status', 'Outlet Incharge', 'HR (final)', 'Replacement'],
    widths: [90, 160, 130, 110, 80, 80, 50, 200, 110, 150, 150, 140], rows: list,
    align: ['center', 'left', 'left', 'left', 'center', 'center', 'center', 'left', 'left', 'left', 'left', 'left'], wrap: [7, 9, 10] });
  return repFinish_(B, fileName, repFormat_(d.format), false);
}

/* ============================ OVERTIME (date range) ============================ */
function repOtReport_(ctx, d) {
  var R = penRange_(d, 62), b = atBuild_(R.a, R.b, str_(d.group) || null, false), cur = repCur_();
  var rows = b.rows.filter(function (r) { return r.otAmount > 0; }).sort(function (p, q) { return p.dateKey === q.dateKey ? p.name.localeCompare(q.name) : (p.dateKey < q.dateKey ? -1 : 1); });
  var by = {};
  rows.forEach(function (r) { var k = r.employeeId + '|' + r.name, x = by[k] = by[k] || { id: r.employeeId, name: r.name, designation: r.designation, group: r.groupName, days: 0, hours: 0, amount: 0 }; x.days++; x.hours += r.otHours; x.amount += r.otAmount; });
  var ppl = Object.keys(by).map(function (k) { return by[k]; }).sort(function (p, q) { return q.amount - p.amount; });
  var tH = ppl.reduce(function (s, x) { return s + x.hours; }, 0), tA = ppl.reduce(function (s, x) { return s + x.amount; }, 0);
  var fileName = 'Overtime Report - ' + atRange_(R.a, R.b).replace(/\//g, '-'), B = repBook_(fileName);
  __M.repPdf = repFormat_(d.format) === 'pdf';
  repTable_(B, { name: 'Per employee', title: 'Overtime - ' + atRange_(R.a, R.b), sub: ppl.length + ' people   ·   ' + tH + ' h   ·   ' + cur + ' ' + atMoney_(tA) + '   ·   goes to Salary Preparation ▸ O/T',
    head: ['Employee ID', 'Employee Name', 'Designation', 'Location', 'Days', 'OT hours', 'OT amount (' + cur + ')'], widths: [95, 180, 150, 110, 60, 80, 120],
    rows: ppl.map(function (x) { return [x.id, x.name, x.designation, x.group, x.days, x.hours, x.amount]; }), align: ['center', 'left', 'left', 'left', 'center', 'center', 'right'], money: [6],
    total: ['', 'Total', '', '', '', tH, tA] });
  repTable_(B, { name: 'Every day', title: 'Overtime days - ' + atRange_(R.a, R.b), sub: rows.length + ' day(s)',
    head: ['Date', 'Employee ID', 'Employee Name', 'Location', 'Punch In', 'Punch Out', 'Worked', 'OT hours', 'Rate / hr (' + cur + ')', 'OT amount (' + cur + ')'],
    widths: [85, 95, 170, 110, 80, 80, 80, 70, 100, 110], rows: rows.map(function (r) { return [r.date, r.employeeId, r.name, r.groupName, r.punchIn, r.punchOut, r.workedText, r.otHours, r.otRate, r.otAmount]; }),
    align: ['center', 'center', 'left', 'left', 'center', 'center', 'center', 'center', 'right', 'right'], money: [8, 9] });
  return repFinish_(B, fileName, repFormat_(d.format), false);
}

/* ============================ REPORTS SCREEN ============================ */
/** The locations (HQ, GFP, Pandri, Chanderi …), this month and the last day with punches — for the Reports screen. */
function repMeta_(ctx) {
  var dir = atDirectory_(false), g = dir.rules.groups, now = new Date(), last = '';
  try { var ds = atDates_(); if (ds && ds.length) last = ds[0].key; } catch (e) {}
  return { groups: Object.keys(g).map(function (k) { return { key: k, name: g[k].groupName }; }), today: iso_(now), month: fmt_(now, 'yyyy-MM'),
    first: iso_(new Date(now.getFullYear(), now.getMonth(), 1)), last: last };
}
