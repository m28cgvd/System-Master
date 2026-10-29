/*************************************************************************
 *  HR.gs — people at the outlet (Outlet Incharge screens).
 *    · Attendance Report — previous days (Attendance Report app's
 *      "Attendance Data") + this month's leave and advance of the outlet.
 *    · Leave Approval    — first level (Outlet Incharge) on the Loan &
 *      Advance "Leave <Month YYYY>" tabs; HR gives the final decision in
 *      this app (Approvals).
 *    · Advance Approval  — the Outlet Incharge stage of the v3 advance
 *      workflow (Incharge → HR → Admin → Accountant) on "Advance <Month YYYY>".
 *      Requests the old form sent straight to HR (Incharge Status "-")
 *      also reach the incharge while HR has not acted on them yet.
 *    · Roster            — weekly shift plan, only for the outlet(s) you run.
 *************************************************************************/

/* ============================ LOAN & ADVANCE TABS ============================ */
function laSS_() { return extSS_(set_('Loan & Advance Sheet ID')); }
/** The month tabs of one kind, newest first: [{ name, month, data: { head, rows, first } }] (read through laTab_). */
function laMonthTabs_(prefix, months) {
  var out = [], d = new Date(), names = [];
  for (var i = 0; i < months; i++) names.push(prefix + monthLabel_(new Date(d.getFullYear(), d.getMonth() - i, 1)));
  laWarm_(names);
  names.forEach(function (name) { var data = laTab_(name); if (data) out.push({ name: name, month: name.substring(prefix.length), data: data }); });
  return out;
}
/**
 * Speed: one Loan & Advance month tab { head, rows, first }, kept in the shared cache for 3 minutes.
 * A change made through this app (apply, approve, pay …) drops only the tab it changed (laDirty_), so
 * the next read of that tab is fresh at once and the other months stay cached; only changes made in
 * the old form wait up to 3 minutes (or the Refresh button).
 */
function laSlug_(name) { return String(name).replace(/[^A-Za-z0-9]+/g, '_'); }
function laTabKey_(name) { var s = laSlug_(name); return 'la2_' + gen_('lat_' + s) + '.' + gen_('data') + '_' + s; }
/** Call right where a Loan & Advance tab is written. */
function laDirty_(name) { markDirty_('lat_' + laSlug_(name)); markDirty_('la'); if (__M.laTab) delete __M.laTab[name]; }
function laWarm_(names) {
  __M.laTab = __M.laTab || {};
  var want = names.filter(function (n) { return __M.laTab[n] === undefined && !isDirty_('lat_' + laSlug_(n)); });
  if (!want.length) return;
  var got = cacheGetManyD_(want.map(laTabKey_));
  __M.laMiss = __M.laMiss || {};
  want.forEach(function (n) { var v = got[laTabKey_(n)]; if (v) __M.laTab[n] = v.none ? null : v; else __M.laMiss[laTabKey_(n)] = 1; });
}
function laTab_(name) {
  __M.laTab = __M.laTab || {};
  if (__M.laTab[name] !== undefined) return __M.laTab[name];
  var key = laTabKey_(name), hit = (__M.laMiss || {})[key] || isDirty_('lat_' + laSlug_(name)) ? null : cacheGetD_(key);
  if (hit) return (__M.laTab[name] = hit.none ? null : hit);
  var sh = laSS_().getSheetByName(name), out = sh ? laRead_(sh) : null;
  cachePutD_(key, out || { none: 1 }, 180);
  return (__M.laTab[name] = out);
}
/** Reads a Loan & Advance month tab: finds the header row (the one holding "Emp ID"), data rows after it. */
function laRead_(sh) {
  var lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (lr < 2) return { head: [], rows: [], first: 2 };
  var top = sh.getRange(1, 1, Math.min(3, lr), lc).getValues();
  var hr = 0;
  for (var i = 0; i < top.length; i++) if (top[i].map(str_).indexOf('Emp ID') >= 0) { hr = i; break; }
  var head = top[hr].map(str_);
  var first = hr + 2;
  var rows = lr >= first ? sh.getRange(first, 1, lr - first + 1, lc).getValues() : [];
  return { head: head, rows: rows, first: first };
}
function laEmpOutlet_(empId, locText, map) {
  if (locText) { var o = outletByAny_(locText); if (o) return o.id; }
  return map[str_(empId).toUpperCase()] || '';
}

/* ============================ LEAVE ============================ */
function leaveCols_(H) {
  return { emp: col_(H, ['Emp ID']), name: col_(H, ['Employee Name']), desig: col_(H, ['Designation']), dept: col_(H, ['Department']),
    ts: col_(H, ['Timestamp']), dur: col_(H, ['Leave Duration']), from: col_(H, ['From Date']), to: col_(H, ['To Date']),
    days: col_(H, ['Total Days']), reason: col_(H, ['Reason']), l1: col_(H, ['Admin Decision (L1)']), l1By: col_(H, ['Admin By']),
    l1Date: col_(H, ['Admin Date']), fin: col_(H, ['Final Status']), finBy: col_(H, ['Super Admin By']),
    finDate: col_(H, ['Super Admin Date']), rem: col_(H, ['Remarks']), rId: col_(H, ['Replacement Emp ID']),
    rName: col_(H, ['Replacement Name']), rDes: col_(H, ['Replacement Designation']), rType: col_(H, ['Replacement Type']) };
}
function leaveRows_(ctx, outletIds, months) {
  var map = empOutletMap_(), out = [];
  laMonthTabs_('Leave ', months).forEach(function (t) {
    var R = t.data, c = leaveCols_(R.head);
    if (c.emp < 0 || c.l1 < 0) return;
    R.rows.forEach(function (r, i) {
      var emp = str_(r[c.emp]); if (!emp) return;
      var oid = laEmpOutlet_(emp, '', map);
      if (outletIds.indexOf(oid) < 0) return;
      var rg = laLeaveRange_(r[c.from], r[c.to], r[c.days], r[c.ts], [r[c.l1Date], r[c.finDate]]), ts = rg.applied, f = rg.from, to = rg.to || f;
      var l1 = str_(r[c.l1]).toUpperCase(), fin = str_(r[c.fin]).toUpperCase();
      out.push({ sheet: t.name, row: R.first + i, empId: emp, name: str_(r[c.name]), designation: str_(r[c.desig]),
        outletId: oid, outlet: (outletById_(oid) || {}).name || '', applied: fmt_(ts, 'dd/MM/yyyy hh:mm a'),
        duration: str_(r[c.dur]), from: fmt_(f), to: fmt_(to), fromKey: iso_(f), toKey: iso_(to),
        days: num_(r[c.days]), reason: str_(r[c.reason]), l1: l1, l1By: str_(r[c.l1By]),
        final: fin, finalBy: c.finBy >= 0 ? str_(r[c.finBy]) : '', remarks: c.rem >= 0 ? str_(r[c.rem]) : '',
        replacement: c.rName >= 0 ? str_(r[c.rName]) : '', replacementId: c.rId >= 0 ? str_(r[c.rId]) : '',
        skipped: (l1 === '-' || l1 === '') && (fin === 'PENDING' || fin === '') });
    });
  });
  return out;
}
function leaveOpenForIncharge_(x, ctx) {
  if (x.final === 'APPROVED' || x.final === 'REJECTED') return false;
  if (ctx && ctx.empId && x.empId.toUpperCase() === str_(ctx.empId).toUpperCase()) return false;   // never your own
  return x.l1 === 'PENDING' || x.skipped;
}

function leaveList_(ctx, d) {
  var ids = outletsFor_(ctx, d.outletId).map(function (o) { return o.id; });
  var all = leaveRows_(ctx, ids, setNum_('Advance Scan Months', 3));
  var pending = all.filter(function (x) { return leaveOpenForIncharge_(x, ctx); });
  var thisMonth = monthLabel_();
  var recent = all.filter(function (x) { return !leaveOpenForIncharge_(x, ctx) && x.sheet === 'Leave ' + thisMonth; });
  var staff = [];
  ids.forEach(function (id) { empsOfOutlet_(id).forEach(function (e) { staff.push({ id: e.id, name: e.name, designation: e.designation, outletId: e.outletId }); }); });
  return { pending: pending, recent: recent.reverse().slice(0, 100), staff: staff };
}

function leaveDecide_(ctx, d) {
  var dec = str_(d.decision).toUpperCase();
  if (dec !== 'APPROVED' && dec !== 'REJECTED') throw new Error('Pick Approve or Reject.');
  if (!/^Leave [A-Za-z]+ \d{4}$/.test(str_(d.sheet))) throw new Error('Unknown leave tab.');
  if (dec === 'REJECTED' && !str_(d.remarks)) throw new Error('Write the reason for rejecting.');
  var sh = laSS_().getSheetByName(d.sheet);
  if (!sh) throw new Error('Leave tab not found.');
  return lock_(function () {
    var lc = sh.getLastColumn();
    var R = laRead_(sh), c = leaveCols_(R.head), rowNum = Number(d.row);
    if (rowNum < R.first) throw new Error('Invalid row.');
    var r = sh.getRange(rowNum, 1, 1, lc).getValues()[0];
    if (str_(r[c.emp]).toUpperCase() !== str_(d.empId).toUpperCase()) throw new Error('The sheet changed — please refresh.');
    var oid = laEmpOutlet_(r[c.emp], '', empOutletMap_());
    if (ctx.outlets.indexOf(oid) < 0) throw new Error('This employee is not in your outlet.');
    var fin = str_(r[c.fin]).toUpperCase(), l1 = str_(r[c.l1]).toUpperCase();
    if (fin === 'APPROVED' || fin === 'REJECTED') throw new Error('HR has already given the final decision (' + fin + ').');
    if (l1 !== 'PENDING' && l1 !== '-' && l1 !== '') throw new Error('Already ' + l1.toLowerCase() + ' at your step.');
    if (ctx.empId && str_(r[c.emp]).toUpperCase() === str_(ctx.empId).toUpperCase()) throw new Error('Your own leave goes to HR.');
    laDirty_(d.sheet);
    sh.getRange(rowNum, c.l1 + 1).setValue(dec);
    if (c.l1By >= 0) sh.getRange(rowNum, c.l1By + 1).setValue(ctx.name);
    if (c.l1Date >= 0) sh.getRange(rowNum, c.l1Date + 1).setValue(Utilities.formatDate(new Date(), APP.TZ, 'dd/MM/yyyy HH:mm:ss'));
    if (str_(d.remarks) && c.rem >= 0) sh.getRange(rowNum, c.rem + 1).setValue(str_(d.remarks));
    var rep = str_(d.replacementId);
    if (rep && dec === 'APPROVED' && c.rId >= 0) {
      var e = empById_(rep), me = empById_(str_(r[c.emp]));
      if (e && e.outletId === oid && e.id.toUpperCase() !== str_(r[c.emp]).toUpperCase()) {
        sh.getRange(rowNum, c.rId + 1, 1, 4).setValues([[e.id, e.name, e.designation,
          (me && norm_(me.designation) === norm_(e.designation)) ? 'Same Designation' : 'Alternate Dept']]);
      }
    }
    sh.getRange(rowNum, c.l1 + 1).setFontWeight('bold').setHorizontalAlignment('center');
    log_(ctx, 'Leave ' + dec, d.sheet + ' row ' + rowNum + ' ' + str_(r[c.name]));
    return { message: 'Leave ' + dec.toLowerCase() + ' at your step — HR gives the final decision.' };
  });
}

/* ============================ ADVANCE ============================ */
function advCols_(H) {
  return { sno: col_(H, ['S.No']), ts: col_(H, ['Applied On (Timestamp)', 'Timestamp']), month: col_(H, ['Month']),
    emp: col_(H, ['Emp ID']), name: col_(H, ['Employee Name']), loc: col_(H, ['Location']), desig: col_(H, ['Designation']),
    salary: col_(H, ['Actual Salary (Rs.)', 'Actual Salary (₹)', 'Actual Salary']), daily: col_(H, ['Daily Wage (Rs.)', 'Daily Wage']),
    purpose: col_(H, ['Purpose']), req: col_(H, ['Requested Amount (Rs.)', 'Requested Amount (₹)', 'Requested Amount']),
    days: col_(H, ['Present Days (Employee)', 'Present Days (Submitted)']),
    incMax: col_(H, ['Incharge Max Allowed (Rs.)']), incAmt: col_(H, ['Incharge Approved Amount (Rs.)']),
    incSt: col_(H, ['Incharge Status']), incBy: col_(H, ['Incharge Action By']), incTime: col_(H, ['Incharge Timestamp']),
    incRem: col_(H, ['Incharge Remarks']), hrAmt: col_(H, ['HR Approved Amount (Rs.)']), hrSt: col_(H, ['HR Status']),
    admSt: col_(H, ['Admin Status']), admAmt: col_(H, ['Admin Approved Amount (Rs.)']), paySt: col_(H, ['Payment Status']) };
}
function advProvisionalMax_(salary, days) {
  var pct = setNum_('Advance Percentage', 60) / 100, eligible = setNum_('Advance Eligible Days', 15);
  var dd = Math.min(Math.max(num_(days), 0), eligible);
  var v = dd * (num_(salary) / 30) * pct;
  return v > 0 ? Math.round(v / 100) * 100 : 0;
}

/**
 * The advances of these outlets (the incharge's own screens). Same reading as Approvals (laAdvRead_): a request
 * the old form sent straight to HR from an outlet is waiting for the incharge (skipped: true).
 */
function advRows_(ctx, outletIds, months) {
  var map = empOutletMap_();
  return laAdvRead_(months, function (a) {
    var oid = laEmpOutlet_(a.empId, a.location, map);
    if (outletIds.indexOf(oid) < 0) return false;
    a.outletId = oid; a.outlet = (outletById_(oid) || {}).name || '';
    a.daily = a.salary ? round_(a.salary / 30, 2) : 0;
    a.maxSuggest = advProvisionalMax_(a.salary, a.days);
    a.skipped = a.legacySkip;
    a.stageCode = a.stage; a.stage = a.stageText;              // the incharge screens show the words
    return true;
  });
}
/** Waiting for the outlet incharge (never his own request — that one is HR's). */
function advOpenForIncharge_(x, ctx) {
  if (ctx && ctx.empId && x.empId.toUpperCase() === str_(ctx.empId).toUpperCase()) return false;   // never your own
  return x.stageCode === 'INCHARGE';
}

function advList_(ctx, d) {
  var ids = outletsFor_(ctx, d.outletId).map(function (o) { return o.id; });
  var all = advRows_(ctx, ids, setNum_('Advance Scan Months', 3));
  var m = monthLabel_(), key = fmt_(new Date(), 'yyyyMM');
  var open = all.filter(function (x) { return advOpenForIncharge_(x, ctx); });
  // this month's advances of the outlet and older ones until they are paid — from his step to the Accountant's payment
  var tracker = laSortTracker_(all.filter(function (x) { return open.indexOf(x) < 0 && laKeepInTracker_({ month: x.month, stage: x.stageCode, acted: x.acted }, m, key); }));
  return { pending: laSortTracker_(open).reverse(), tracker: tracker,
    month: m, rule: setNum_('Advance Percentage', 60) + '% of ' + setNum_('Advance Eligible Days', 15) + ' days\' salary',
    adminRule: 'Admin above ₹' + setNum_('Advance Admin Approval Above', 5000) + ', otherwise automatic' };
}

function advDecide_(ctx, d) {
  var dec = str_(d.decision).toUpperCase();
  if (dec !== 'APPROVED' && dec !== 'REJECTED') throw new Error('Pick Approve or Reject.');
  if (!/^Advance [A-Za-z]+ \d{4}$/.test(str_(d.sheet))) throw new Error('Unknown advance tab.');
  var sh = laSS_().getSheetByName(d.sheet);
  if (!sh) throw new Error('Advance tab not found.');
  return lock_(function () {
    var lc = Math.max(sh.getLastColumn(), 36);
    var R = laRead_(sh), c = laAdvCols_(R.head), rowNum = Number(d.row);
    if (c.incSt < 0) throw new Error('This month\'s advance tab is in the old layout — open the Loan & Advance app once to upgrade it.');
    if (rowNum < R.first) throw new Error('Invalid row.');
    var r = sh.getRange(rowNum, 1, 1, lc).getValues()[0];
    if (str_(r[c.emp]).toUpperCase() !== str_(d.empId).toUpperCase()) throw new Error('The sheet changed — please refresh.');
    if (ctx.empId && str_(r[c.emp]).toUpperCase() === str_(ctx.empId).toUpperCase()) throw new Error('Your own advance goes to HR.');
    var oid = laEmpOutlet_(r[c.emp], c.loc >= 0 ? r[c.loc] : '', empOutletMap_());
    if (ctx.outlets.indexOf(oid) < 0) throw new Error('This employee is not in your outlet.');
    var st = str_(r[c.incSt]).toUpperCase(), hr = c.hrSt >= 0 ? str_(r[c.hrSt]).toUpperCase() : '';
    var skipped = laSkippedInc_(st, r[c.incBy], hr, c.hrBy >= 0 ? r[c.hrBy] : '', c.loc >= 0 ? r[c.loc] : '');
    if (st !== 'PENDING' && !skipped) {
      if (st === '-' || !st) throw new Error(hr === 'APPROVED' || hr === 'REJECTED' ? 'HR has already ' + hr.toLowerCase() + ' this advance.' : 'This advance does not need your approval.');
      throw new Error('Already ' + st.toLowerCase() + ' at your step.');
    }
    var now = new Date(), note = str_(d.remarks);
    laDirty_(d.sheet);
    if (dec === 'REJECTED') {
      if (!note) throw new Error('Write the reason for rejecting.');
      sh.getRange(rowNum, c.incSt + 1).setValue('REJECTED');
      sh.getRange(rowNum, c.incBy + 1).setValue(ctx.name);
      sh.getRange(rowNum, c.incTime + 1).setValue(now).setNumberFormat('dd/MM/yyyy HH:mm:ss');
      sh.getRange(rowNum, c.incRem + 1).setValue(note);
      if (skipped && c.hrSt >= 0) sh.getRange(rowNum, c.hrSt + 1).setValue('-');
      sh.getRange(rowNum, 1, 1, 36).setBackground('#F4CCCC');
      log_(ctx, 'Advance REJECTED', d.sheet + ' row ' + rowNum);
      return { message: 'Advance rejected at your step.' };
    }
    var requested = num_(r[c.req]);
    var max = parseInt(d.maxAllowed, 10) || 0;
    if (max <= 0) throw new Error('Enter the max allowed amount.');
    var amt = parseInt(d.amount, 10) || 0;
    if (amt <= 0) amt = requested > 0 ? Math.min(requested, max) : max;
    if (amt > max) throw new Error('₹' + amt + ' is above the max allowed ₹' + max + '. Raise the max allowed first.');
    sh.getRange(rowNum, c.incMax + 1, 1, 2).setValues([[max, amt]]);
    sh.getRange(rowNum, c.incSt + 1).setValue('APPROVED');
    sh.getRange(rowNum, c.incBy + 1).setValue(ctx.name);
    sh.getRange(rowNum, c.incTime + 1).setValue(now).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    if (note) sh.getRange(rowNum, c.incRem + 1).setValue(note);
    if (c.hrSt >= 0) sh.getRange(rowNum, c.hrSt + 1).setValue('PENDING');
    sh.getRange(rowNum, 1, 1, 36).setBackground('#FFF9C4');
    log_(ctx, 'Advance APPROVED', d.sheet + ' row ' + rowNum + ' ₹' + amt);
    return { message: 'Approved ₹' + amt + ' — sent to HR for verification.' };
  });
}

/* ============================ ATTENDANCE ============================ */
function hoursOf_(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (v instanceof Date) return v.getHours() + v.getMinutes() / 60;
  if (typeof v === 'number') return v < 1 ? v * 24 : v;
  var s = str_(v), m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) return Number(m[1]) + Number(m[2]) / 60;
  var h = s.match(/(\d+)\s*h/i), mm = s.match(/(\d+)\s*m/i);
  if (h || mm) return (h ? Number(h[1]) : 0) + (mm ? Number(mm[1]) / 60 : 0);
  var n = Number(s); return isNaN(n) ? null : n;
}
function clock_(v) {
  if (v instanceof Date) return fmt_(v, 'hh:mm a');
  var s = str_(v); return s;
}

function attDay_(ctx, d) {
  var outs = runOutletsFor_(ctx, d.outletId), ids = outs.map(function (o) { return o.id; });
  var date = str_(d.date) || iso_(addDays_(new Date(), -1));
  var emps = []; ids.forEach(function (id) { emps = emps.concat(empsOfOutlet_(id)); });
  var linked = !!setRaw_('Attendance Sheet ID'), note = '', day = null;
  if (linked) { try { day = atDayMap_(date); } catch (e) { note = e.message; } }
  else note = 'The Attendance Sheet ID is not set on the Settings tab yet.';
  if (day && !day.hasData && !note) note = 'Attendance for ' + fmt_(isoToDate_(date)) + ' has not been uploaded by HR yet.';
  var full = setNum_('Full Day Hours', 8) * 60, half = setNum_('Half Day Hours', 4) * 60;
  var leaves = {};
  try {
    leaveRows_(ctx, ids, 2).forEach(function (l) {
      if (l.final === 'APPROVED' && l.fromKey <= date && l.toKey >= date) leaves[l.empId.toUpperCase()] = true;
    });
  } catch (e) {}
  function own(r) {                       // an outlet the Attendance app does not report on: use its own status / our hours
    var s = str_(r.sourceStatus).toUpperCase(), hasIn = r.punchIn !== '-', hasOut = r.punchOut !== '-';
    if (/^(FD|FULL|FULL DAY|P|PRESENT)$/.test(s)) return 'Full Day';
    if (/^(HD|HALF|HALF DAY)$/.test(s)) return 'Half Day';
    if (/^(A|AB|ABSENT)$/.test(s)) return 'Absent';
    if (hasIn && !hasOut) return 'Punch Out Missed';
    if (!hasIn && hasOut) return 'Punch In Missed';
    if (!hasIn && !hasOut) return 'Absent';
    var w = r.workedMinutes || 0;
    return w >= full ? 'Full Day' : w >= half ? 'Half Day' : 'Absent';
  }
  var sum = { total: emps.length, present: 0, half: 0, absent: 0, leave: 0, missed: 0, nodata: 0 };
  var list = emps.map(function (e) {
    var r = day ? day.byKey[atNormId_(e.id, day.prefixes)] : null, onLeave = !!leaves[e.id.toUpperCase()], st;
    if (r && !r.synthetic) st = r.groupKey === 'UNMATCHED' ? own(r) : r.status;
    else if (onLeave) st = 'On Leave';
    else if (r && r.synthetic) st = 'Absent';
    else st = day && day.hasData ? 'No Punch' : '—';
    if (onLeave && st === 'Absent') st = 'On Leave';
    if (/full|present/i.test(st)) sum.present++; else if (/half/i.test(st)) sum.half++;
    else if (/leave/i.test(st)) sum.leave++; else if (/missed/i.test(st)) sum.missed++;
    else if (/absent|no punch/i.test(st)) sum.absent++; else sum.nodata++;
    var real = r && !r.synthetic;
    return { id: e.id, name: e.name, designation: e.designation, outlet: (outletById_(e.outletId) || {}).name || '',
      in: real && r.punchIn !== '-' ? r.punchIn : '', out: real && r.punchOut !== '-' ? r.punchOut : '',
      hours: real && r.workedText !== '-' ? r.workedText : '', brk: real && r.breakText !== '-' ? r.breakText : '',
      status: st, leave: onLeave, shift: real ? r.shift : '', late: real ? r.lateInMin : 0,
      penalty: real ? r.penaltyAmount : 0, penaltyText: real ? r.penaltyText : '' };
  });
  return { date: date, linked: linked, note: note, summary: sum, rows: list };
}

/**
 * Attendance Report ▸ Month: one month (this month by default, d.month = yyyy-mm for another) of the outlet —
 * attendance per person (full / half / absent / leave / late / penalty, every day behind it), its leave and its advances.
 */
function attMonth_(ctx, d) {
  var ids = runOutletsFor_(ctx, d.outletId).map(function (o) { return o.id; });
  var now = new Date(), start = /^\d{4}-\d{2}$/.test(str_(d.month)) ? repMonth_(d.month) : new Date(now.getFullYear(), now.getMonth(), 1);
  var m = monthLabel_(start), back = Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth() + 1);
  var leaves = [], adv = [], people = [];
  try { leaves = leaveRows_(ctx, ids, back).filter(function (x) { return x.sheet === 'Leave ' + m; }); } catch (e) {}
  try { adv = advRows_(ctx, ids, back).filter(function (x) { return x.month === m; }); } catch (e) {}
  try {
    var a = iso_(start), b = iso_(new Date(start.getFullYear(), start.getMonth() + 1, 0)), t = todayIso_();
    if (b >= t) b = iso_(addDays_(new Date(), -1));
    var want = {}, key = function (id) { return String(id).toUpperCase().replace(/[^A-Z0-9]/g, ''); };
    ids.forEach(function (id) { empsOfOutlet_(id).forEach(function (e) { want[key(e.id)] = e; }); });
    if (a <= b && setRaw_('Attendance Sheet ID')) {
      var built = atBuild_(a, b, null, false), by = {};
      built.rows.forEach(function (r) {
        var e = want[key(r.employeeId)]; if (!e) return;
        var x = by[e.id] = by[e.id] || { id: e.id, name: e.name, designation: e.designation, full: 0, half: 0, absent: 0, leave: 0, missed: 0, late: 0, penalty: 0, days: [] };
        var off = r.leaveState === 'approved' || r.leaveState === 'weekoff';
        if (r.status === 'Full Day') x.full++; else if (r.status === 'Half Day') x.half++; else if (off) x.leave++; else if (/missed/i.test(r.status)) x.missed++; else x.absent++;
        if (r.lateInMin > 0) x.late++;
        x.penalty += r.penaltyAmount || 0;
        x.days.push({ d: r.date, s: off && r.status === 'Absent' ? (r.leaveState === 'weekoff' ? 'Week off' : 'On leave') : r.status, i: r.punchIn, o: r.punchOut, w: r.workedText,
          l: r.lateInMin || 0, p: r.penaltyAmount || 0, t: r.penaltyText || '' });
      });
      people = Object.keys(by).map(function (k) { return by[k]; }).sort(function (p, q) { return p.name.localeCompare(q.name); });
    }
  } catch (e) {}
  return { month: m, monthKey: fmt_(start, 'yyyy-MM'), leaves: leaves.reverse(), advances: adv.reverse(), people: people };
}

/* ============================ ROSTER ============================ */
function shifts_() {
  return readObjs_(SH.SHIFTS).filter(function (r) { return str_(r['Shift Code']) && !/inactive|^no$/i.test(str_(r['Status'])); })
    .map(function (r) {
      var st = r['Start'], en = r['End'];
      return { code: str_(r['Shift Code']), name: str_(r['Shift Name']), start: st instanceof Date ? fmt_(st, 'HH:mm') : str_(st),
        end: en instanceof Date ? fmt_(en, 'HH:mm') : str_(en), color: str_(r['Color']) || '#E5E7EB', sort: num_(r['Sort']) || 99 };
    }).sort(function (a, b) { return a.sort - b.sort; });
}

function rosWide_(ctx) { var r = norm_(ctx.role); return !!(can_(ctx, 'hr_attendance') || ctx.super || r === 'director' || r === 'misadmin'); }
function rosOutlets_(ctx) {
  var own = (ctx.outlets || []).map(outletById_).filter(Boolean);
  if (!rosWide_(ctx)) return own;
  var seen = {}, out = [];
  outlets_().filter(function (o) { return o.active && o.type === 'Outlet' && outletRun_(o); }).concat(own.filter(function (o) { return o.type === 'Outlet'; }))
    .forEach(function (o) { if (!seen[o.id]) { seen[o.id] = 1; out.push(o); } });
  return out;
}
function rosPick_(ctx, id) {
  var list = rosOutlets_(ctx), k = str_(id), i;
  if (k === 'ALL' || k === '*') k = '';
  if (!list.length) throw new Error('No outlet is linked to your login. Please contact MIS.');
  for (i = 0; k && i < list.length; i++) if (list[i].id === k) return list[i];
  if (k && !rosWide_(ctx)) throw new Error('That outlet is not linked to your login.');
  for (i = 0; ctx.home && i < list.length; i++) if (list[i].id === ctx.home) return list[i];
  return list[0];
}
function rosOutletsOut_(ctx) { return rosOutlets_(ctx).map(function (o) { return { id: o.id, name: o.name }; }); }
function rosTime_(v) { if (v instanceof Date) return fmt_(v, 'HH:mm'); var m = /^(\d{1,2}):(\d{2})/.exec(str_(v)); return m ? pad_(Number(m[1]), 2) + ':' + m[2] : ''; }
function rosShiftOf_(code, start, end, sh) {
  code = str_(code);
  if (code === 'MANUAL') {
    var a = rosTime_(start), b = rosTime_(end);
    return a && b ? { code: 'MANUAL', name: a + ' – ' + b, start: a, end: b, sort: 50, manual: true } : null;
  }
  return sh[code] || null;
}
function rosLoad_(ctx, d) {
  var o = rosPick_(ctx, d.outletId);
  var ws = mondayOf_(isoToDate_(d.week) || new Date()), wsKey = iso_(ws);
  var days = []; for (var i = 0; i < 7; i++) { var x = addDays_(ws, i); days.push({ key: iso_(x), label: fmt_(x, 'EEE dd MMM') }); }
  var emps = empsOfOutlet_(o.id).map(function (e) { return { id: e.id, name: e.name, designation: e.designation, department: e.department }; });
  var cells = {}, meta = null;
  readObjs_(SH.ROSTER).forEach(function (r) {
    if (str_(r['Outlet ID']) !== o.id || iso_(r['Week Start']) !== wsKey) return;
    cells[str_(r['Employee ID']).toUpperCase() + '|' + iso_(r['Date'])] = { code: str_(r['Shift Code']), start: rosTime_(r['Start']), end: rosTime_(r['End']), remarks: str_(r['Remarks']),
      replacementId: str_(r['Replacement ID']), replacementName: str_(r['Replacement Name']) };
    if (!meta) meta = { by: str_(r['Updated By']), at: fmt_(r['Updated At'], 'dd/MM/yyyy hh:mm a') };
  });
  var leaves = {}, info = {};
  try {
    leaveRows_(ctx, [o.id], 2).forEach(function (l) {
      if (l.final === 'REJECTED' || l.l1 === 'REJECTED') return;
      var st = l.final === 'APPROVED' ? 'approved' : 'applied';
      days.forEach(function (dd) {
        if (!(l.fromKey <= dd.key && l.toKey >= dd.key)) return;
        var k = l.empId.toUpperCase() + '|' + dd.key;
        leaves[k] = (st === 'approved' ? 'Leave approved' : 'Leave applied') + (l.replacement ? ' · ' + l.replacement : '');
        if (!info[k] || st === 'approved') info[k] = { state: st, sheet: l.sheet, row: l.row, replacementId: l.replacementId, replacement: l.replacement, reason: l.reason };
      });
    });
  } catch (e) {}
  return { outletId: o.id, outlet: o.name, outlets: rosOutletsOut_(ctx), week: wsKey, weekText: fmt_(ws, 'dd MMM') + ' – ' + fmt_(addDays_(ws, 6), 'dd MMM yyyy'),
    days: days, employees: emps, shifts: shifts_(), cells: cells, leaves: leaves, leaveInfo: info, saved: meta };
}

/**
 * Roster ▸ Day sheet: one date of one outlet, shift by shift — like the printed Daily Staff Duty Roster: section,
 * Employee ID, name, shift timing, leave status (Loan & Advance sheet) and the replacement written on the leave.
 * The timing comes from the roster cell of that day, else the person's own timing (Employees ▸ Shift timings).
 */
function rosDay_(ctx, d) {
  var o = rosPick_(ctx, d.outletId), key = str_(d.date) || todayIso_();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error('Pick the date.');
  var dt = isoToDate_(key), ws = iso_(mondayOf_(dt)), sh = {}; shifts_().forEach(function (x) { sh[x.code] = x; });
  var cell = {};
  readObjs_(SH.ROSTER).forEach(function (r) {
    if (str_(r['Outlet ID']) === o.id && iso_(r['Date']) === key) cell[str_(r['Employee ID']).toUpperCase()] = { code: str_(r['Shift Code']), start: rosTime_(r['Start']), end: rosTime_(r['End']), remarks: str_(r['Remarks']),
      replacementId: str_(r['Replacement ID']), replacementName: str_(r['Replacement Name']) };
  });
  var own = {};
  try {
    var dir = atDirectory_(false);
    atRead_(AT_SH.EMPSHIFT).forEach(function (r) {
      if (/^no$/i.test(str_(r['Active']))) return;
      var st = atClock_(r['Start Time']), en = atClock_(r['End Time']), nm = str_(r['Shift Name']);
      own[atNormId_(str_(r['Employee ID']), dir.prefixes)] = st !== null && en !== null ? atClockText_(st) + ' – ' + atClockText_(en) : nm;
    });
    var cfg = atShiftCfg_(), grp = null;
    Object.keys(dir.rules.byLocation).forEach(function (k) { var rr = dir.rules.byLocation[k]; if (!grp && outletByAny_(rr.location) && outletByAny_(rr.location).id === o.id) grp = rr.groupKey; });
    var gs = {}; (cfg[grp] || []).forEach(function (x) { gs[x.name.toLowerCase()] = atClockText_(x.start) + ' – ' + atClockText_(x.end); });
    Object.keys(own).forEach(function (k) { if (gs[String(own[k]).toLowerCase()]) own[k] = own[k] + ' (' + gs[String(own[k]).toLowerCase()] + ')'; });
  } catch (e) { dir = null; }
  var leaves = {};
  try {
    leaveRows_(ctx, [o.id], 3).forEach(function (l) {
      if (l.final === 'REJECTED' || l.l1 === 'REJECTED' || !(l.fromKey <= key && l.toKey >= key)) return;
      leaves[l.empId.toUpperCase()] = { state: l.final === 'APPROVED' ? 'Leave approved' : 'Leave applied', sheet: l.sheet, row: l.row, from: l.from, to: l.to,
        replacement: l.replacement, replacementId: l.replacementId, reason: l.reason };
    });
  } catch (e) {}
  var emps = empsOfOutlet_(o.id), groups = {}, order = [];
  emps.forEach(function (e) {
    var c = cell[e.id.toUpperCase()], s0 = c ? rosShiftOf_(c.code, c.start, c.end, sh) : null;
    var oneOwn = dir ? own[atNormId_(e.id, dir.prefixes)] : '';
    var gname = s0 ? (s0.manual ? 'Manual timing' : s0.name) : 'Not on the roster', gkey = s0 ? (s0.manual ? 'MANUAL' : s0.code) : '~';
    if (!groups[gkey]) { groups[gkey] = { code: gkey, name: gname, timing: s0 && s0.start && !s0.manual ? s0.start + ' – ' + s0.end : '', sort: s0 ? s0.sort : 999, rows: [] }; order.push(gkey); }
    var off = s0 && !s0.start, lv = leaves[e.id.toUpperCase()] || null;           // week off / leave on the roster: no timing
    if (!lv && off) lv = { state: /week|wo/i.test(s0.code + ' ' + s0.name) ? 'Week off' : /leave/i.test(s0.name) ? 'Leave (roster only)' : s0.name, sheet: '', row: 0, replacement: '', replacementId: '' };
    if (lv && c && c.replacementId && !lv.replacementId && !lv.replacement) { lv = Object.assign({}, lv, { replacementId: c.replacementId, replacement: c.replacementName }); }
    groups[gkey].rows.push({ id: e.id, name: e.name, designation: e.designation, section: e.department || '',
      timing: off ? '' : (s0 && s0.manual ? s0.name : (oneOwn || (s0 && s0.start ? s0.start + ' – ' + s0.end : ''))), leave: lv, remarks: c ? c.remarks : '' });
  });
  var list = order.map(function (k) { var g = groups[k]; g.rows.sort(function (a, b) { return a.section === b.section ? a.name.localeCompare(b.name) : (a.section < b.section ? -1 : 1); }); return g; })
    .sort(function (a, b) { return a.sort - b.sort; });
  var inc = '';
  try { inc = tkInchargeName_(o.id); } catch (e) {}
  return { outletId: o.id, outlet: o.name, outlets: rosOutletsOut_(ctx), date: key, dateText: fmt_(dt, 'EEE dd MMM yyyy'), week: ws, incharge: inc, groups: list,
    staff: emps.map(function (e) { return { id: e.id, name: e.name, designation: e.designation }; }), total: emps.length };
}
/** Puts the replacement on the leave row of the Loan & Advance sheet (the same columns HR fills when approving). */
function rosLaReplace_(ctx, o, sheet, row, empId, replacementId) {
  if (!/^Leave [A-Za-z]+ \d{4}$/.test(str_(sheet))) throw new Error('Unknown leave tab.');
  var sh = laSS_().getSheetByName(sheet); if (!sh) throw new Error('Leave tab not found.');
  var R = laRead_(sh), c = leaveCols_(R.head), rowNum = Number(row);
  if (!(rowNum >= R.first) || c.rId < 0) throw new Error('This leave tab has no Replacement columns.');
  var r = sh.getRange(rowNum, 1, 1, sh.getLastColumn()).getValues()[0];
  if (str_(r[c.emp]).toUpperCase() !== str_(empId).toUpperCase()) throw new Error('The sheet changed — please refresh.');
  var me = empById_(str_(r[c.emp]));
  if (!me || me.outletId !== o.id) throw new Error('This employee is not in ' + o.name + '.');
  var rid = str_(replacementId), cur = str_(r[c.rId]);
  if (cur.toUpperCase() === rid.toUpperCase()) return { message: 'No change.', same: true };
  laDirty_(sheet);
  if (!rid) { sh.getRange(rowNum, c.rId + 1, 1, 4).clearContent(); log_(ctx, 'Replacement removed', sheet + ' row ' + rowNum); return { message: 'Replacement removed.' }; }
  var e = empById_(rid); if (!e) throw new Error('Pick the replacement.');
  if (e.id.toUpperCase() === me.id.toUpperCase()) throw new Error('A person cannot replace himself.');
  sh.getRange(rowNum, c.rId + 1, 1, 4).setValues([[e.id, e.name, e.designation, norm_(me.designation) === norm_(e.designation) ? 'Same Designation' : 'Alternate Dept']]);
  log_(ctx, 'Replacement', me.name + ' → ' + e.name + ' · ' + sheet + ' row ' + rowNum);
  return { message: e.name + ' replaces ' + me.name + '.' };
}
function rosReplace_(ctx, d) {
  var o = rosPick_(ctx, d.outletId);
  return lock_(function () { return rosLaReplace_(ctx, o, d.sheet, d.row, d.empId, d.replacementId); });
}
/** Day sheet as Excel / PDF (the printed Daily Staff Duty Roster). */
function rosDayReport_(ctx, d) {
  var D = rosDay_(ctx, d), rows = [], bg = [], n = 0;
  D.groups.forEach(function (g) {
    rows.push([g.name + (g.timing ? '  (' + g.timing + ')' : ''), '', '', '', '', '', '']); bg.push('#DDE6F5');
    g.rows.forEach(function (r) { n++; rows.push([r.section, n, r.id, r.name, r.timing || '—', r.leave ? r.leave.state.replace(/^Leave (approved|applied)$/, '$1') : '-', r.leave && r.leave.replacement ? r.leave.replacement : '-']); bg.push(r.leave ? '#FFF4CC' : '#FFFFFF'); });
  });
  var fileName = 'Daily Staff Duty Roster - ' + D.outlet + ' - ' + D.date, B = repBook_(fileName);
  __M.repPdf = repFormat_(d.format) === 'pdf';
  repTable_(B, { name: 'Roster', title: 'CHAI GOVINDAM — ' + D.outlet + ' — Daily Staff Duty Roster', sub: 'Date: ' + D.dateText + (D.incharge ? '   ·   Store In-Charge: ' + D.incharge : '') + '   ·   Total staff strength: ' + D.total,
    head: ['Section', 'S. No.', 'Employee ID', 'Employee Name', 'Shift Timing', 'Leave Status', 'Replacement'], widths: [150, 55, 100, 220, 160, 110, 160], rows: rows, bg: bg,
    align: ['left', 'center', 'center', 'left', 'center', 'center', 'left'] });
  return repFinish_(B, fileName, repFormat_(d.format), false);
}

function rosRows_(ctx, o, cells, dayKeys) {
  var emps = {}; empsOfOutlet_(o.id).forEach(function (e) { emps[e.id.toUpperCase()] = e; });
  var sh = {}; shifts_().forEach(function (s) { sh[s.code] = s; });
  var now = new Date(), rows = [];
  (cells || []).forEach(function (c) {
    var e = emps[str_(c.empId).toUpperCase()]; if (!e) return;
    if (dayKeys.indexOf(str_(c.date)) < 0) return;
    var s = rosShiftOf_(c.code, c.start, c.end, sh); if (!s) return;
    var dt = isoToDate_(c.date), rp = s.code === 'L' && c.replacementId ? emps[str_(c.replacementId).toUpperCase()] : null;
    if (rp && rp.id === e.id) rp = null;
    rows.push({ 'Roster ID': 'ROS-' + (o.short || o.id) + '-' + str_(c.date).replace(/-/g, '') + '-' + e.id, 'Week Start': mondayOf_(dt), 'Date': dt,
      'Day': fmt_(dt, 'EEEE'), 'Outlet ID': o.id, 'Outlet': o.name, 'Employee ID': e.id, 'Employee Name': e.name,
      'Designation': e.designation, 'Shift Code': s.code, 'Shift': s.manual ? 'Manual' : s.name, 'Start': s.start, 'End': s.end,
      'Remarks': str_(c.remarks), 'Updated By': ctx.name, 'Updated At': now, 'Replacement ID': rp ? rp.id : '', 'Replacement Name': rp ? rp.name : '' });
  });
  return rows;
}
function rosSave_(ctx, d) {
  var o = rosPick_(ctx, d.outletId);
  var ws = mondayOf_(isoToDate_(d.week) || new Date()), wsKey = iso_(ws);
  var dayKeys = []; for (var i = 0; i < 7; i++) dayKeys.push(iso_(addDays_(ws, i)));
  var rows = rosRows_(ctx, o, d.cells, dayKeys);
  if (!rows.length) throw new Error('Set at least one shift.');
  return lock_(function () {
    var old = readObjs_(SH.ROSTER).filter(function (r) { return str_(r['Outlet ID']) === o.id && iso_(r['Week Start']) === wsKey; })
      .map(function (r) { return r._row; });
    if (old.length) deleteRows_(SH.ROSTER, old);
    appendObjs_(SH.ROSTER, rows);
    log_(ctx, 'Roster', o.name + ' week ' + wsKey + ' · ' + rows.length + ' cells');
    return { message: 'Roster saved for ' + fmt_(ws, 'dd MMM') + ' week (' + rows.length + ' shifts).' };
  });
}
function rosSaveDay_(ctx, d) {
  var o = rosPick_(ctx, d.outletId), key = str_(d.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error('Pick the date.');
  var rows = rosRows_(ctx, o, (d.cells || []).map(function (c) { return Object.assign({}, c, { date: key }); }), [key]);
  if (!rows.length) throw new Error('Set at least one shift.');
  return lock_(function () {
    var old = readObjs_(SH.ROSTER).filter(function (r) { return str_(r['Outlet ID']) === o.id && iso_(r['Date']) === key; }).map(function (r) { return r._row; });
    if (old.length) deleteRows_(SH.ROSTER, old);
    appendObjs_(SH.ROSTER, rows);
    log_(ctx, 'Roster', o.name + ' ' + key + ' · ' + rows.length + ' people');
    var synced = 0;
    (d.cells || []).forEach(function (c) {
      if (!c.leaveSheet || !c.leaveRow) return;
      var row = rows.filter(function (x) { return x['Employee ID'].toUpperCase() === str_(c.empId).toUpperCase(); })[0];
      if (!row || row['Shift Code'] !== 'L') return;
      try { if (!rosLaReplace_(ctx, o, c.leaveSheet, c.leaveRow, row['Employee ID'], row['Replacement ID']).same) synced++; } catch (e) {}
    });
    return { message: 'Roster saved for ' + fmt_(isoToDate_(key), 'EEE dd MMM') + ' (' + rows.length + ' people' + (synced ? ' · ' + synced + ' replacement(s) written on the leave' : '') + ').' };
  });
}
function rosSummary_(ctx, d) {
  var o = rosPick_(ctx, d.outletId), total = empsOfOutlet_(o.id).length, t = todayIso_();
  var keys = { yesterday: iso_(addDays_(new Date(), -1)), today: t, tomorrow: iso_(addDays_(new Date(), 1)) }, ws = iso_(mondayOf_(new Date()));
  var cnt = {}, week = 0, last = null;
  readObjs_(SH.ROSTER).forEach(function (r) {
    if (str_(r['Outlet ID']) !== o.id) return;
    var k = iso_(r['Date']); cnt[k] = (cnt[k] || 0) + 1;
    if (iso_(r['Week Start']) === ws) week++;
    var at = r['Updated At']; if (at instanceof Date && (!last || at > last.at)) last = { at: at, by: str_(r['Updated By']) };
  });
  var out = { outletId: o.id, outlet: o.name, outlets: rosOutletsOut_(ctx), staff: total, week: { start: ws, cells: week, of: total * 7 }, last: last ? { by: last.by, at: fmt_(last.at, 'dd/MM hh:mm a') } : null };
  Object.keys(keys).forEach(function (k) { out[k] = { date: keys[k], text: fmt_(isoToDate_(keys[k]), 'EEE dd MMM'), planned: cnt[keys[k]] || 0 }; });
  return out;
}
