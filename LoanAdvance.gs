/*************************************************************************
 *  LoanAdvance.gs — Loan & Advance · Leave · Reimbursement, inside One Login.
 *
 *  Same workbook, same month tabs, same columns as the standalone form
 *  ("Advance September 2026", "Leave …", "Reimbursement …"), so the old form
 *  and its admin portal keep working side by side. Here nobody signs in
 *  twice: the employee applies from their own login, and every approval
 *  step happens inside this app —
 *
 *    Advance   Employee → Outlet Incharge → HR → Admin (Directors) → Accounts
 *              · every outlet (Pandri, Chanderi …) starts with its Outlet
 *                Incharge; Bhanpuri HQ / GFP have no incharge step ("-")
 *              · Admin only above the limit (₹5,000) or for HQ / GFP staff —
 *                otherwise Admin approval is applied automatically
 *              · Admin rejects → HR re-sends it (same or new amount) or
 *                rejects it too, which closes it
 *              · an outlet with no incharge login (or whose only incharge
 *                is the applicant) → HR decides it directly
 *    Leave     Employee → Outlet Incharge (L1) → HR (final)
 *    Reimb.    Employee → HR / Accounts (one step)
 *  Every request is made by the signed-in person for himself — there is no
 *  list of other employees anywhere in these forms.
 *************************************************************************/

var LA_ADV = 'Advance ', LA_LEAVE = 'Leave ', LA_REIMB = 'Reimbursement ';
var LA_AUTO_ADMIN = 'Auto-approved', LA_RESEND = 'Re-sent by HR';

var LA_ADV_HEAD = ['S.No', 'Applied On (Timestamp)', 'Month', 'Emp ID', 'Employee Name', 'Location',
  'Designation', 'Department', 'Actual Salary (Rs.)', 'Daily Wage (Rs.)', 'Purpose', 'Requested Amount (Rs.)', 'Present Days (Employee)',
  'Incharge Max Allowed (Rs.)', 'Incharge Approved Amount (Rs.)', 'Incharge Status', 'Incharge Action By', 'Incharge Timestamp', 'Incharge Remarks',
  'Actual Present Days (HR)', 'Eligible Salary (Rs.)', 'Max Allowed 60% (Rs.)', 'HR Approved Amount (Rs.)', 'HR Status', 'HR Action By', 'HR Timestamp', 'HR Remarks',
  'Admin Status', 'Admin Approved Amount (Rs.)', 'Admin Action By', 'Admin Timestamp', 'Admin Remarks',
  'Payment Status', 'Payment Done By', 'Payment Timestamp', 'Accountant Remarks'];
var LA_ADV_BANDS = [[1, 'EMPLOYEE', '#1a237e'], [6, 'EMPLOYEE  (continued)  ·  submitted by applicant', '#1a237e'],
  [14, 'OUTLET INCHARGE  ·  first approval', '#4E342E'], [20, 'HR  ·  verification & approval', '#00695C'],
  [28, 'ADMIN', '#4A148C'], [33, 'ACCOUNTANT  ·  payment', '#BF360C']];
var LA_LEAVE_HEAD = ['S.No', 'Timestamp', 'Emp ID', 'Employee Name', 'Designation', 'Department', 'Leave Duration', 'From Date', 'To Date',
  'Total Days', 'Reason', 'Admin Decision (L1)', 'Admin By', 'Admin Date', 'Final Status', 'Super Admin By', 'Super Admin Date', 'Remarks',
  'Replacement Emp ID', 'Replacement Name', 'Replacement Designation', 'Replacement Type'];
var LA_REIMB_HEAD = ['S.No', 'Timestamp', 'Emp ID', 'Employee Name', 'Designation', 'Department', 'Expense Category', 'Expense Date',
  'Amount (Rs.)', 'Vendor/Supplier Name', 'Payment Method', 'Business Purpose / Reason', 'Bill / Invoice / Receipt',
  'Additional Documents', 'Declaration', 'Status', 'Approved By', 'Approved Date', 'HR Remarks'];
var LA_AMBER = '#FFF9C4', LA_GREEN = '#D9EAD3', LA_RED = '#F4CCCC', LA_BLUE = '#E3F2FD';

/* ============================ WORKBOOK ============================ */
function laMonthName_(prefix, d) { return prefix + monthLabel_(d || new Date()); }

/** This month's tab for a form — created with the standalone form's headers when missing. */
function laTabFor_(prefix) {
  var ss = laSS_(), name = laMonthName_(prefix), sh = ss.getSheetByName(name);
  laDirty_(name);                                  // only used to write a new request
  if (sh && sh.getLastRow() > 0) return sh;
  if (!sh) sh = ss.insertSheet(name);
  if (prefix === LA_ADV) {
    if (sh.getMaxColumns() < 36) sh.insertColumnsAfter(sh.getMaxColumns(), 36 - sh.getMaxColumns());
    var band = new Array(36).fill('');
    LA_ADV_BANDS.forEach(function (b) { band[b[0] - 1] = b[1]; });
    sh.getRange(1, 1, 1, 36).setValues([band]).setFontColor('#FFFFFF').setFontWeight('bold');
    LA_ADV_BANDS.forEach(function (b, i) {
      var end = i + 1 < LA_ADV_BANDS.length ? LA_ADV_BANDS[i + 1][0] - 1 : 36;
      sh.getRange(1, b[0], 1, end - b[0] + 1).setBackground(b[2]);
    });
    sh.getRange(2, 1, 1, 36).setValues([LA_ADV_HEAD]).setFontWeight('bold').setBackground('#E8EAF6').setWrap(true);
  } else {
    var head = prefix === LA_LEAVE ? LA_LEAVE_HEAD : LA_REIMB_HEAD;
    var instr = new Array(head.length).fill('');
    if (prefix === LA_LEAVE) { instr[11] = 'Admin (L1) via portal'; instr[14] = 'FINAL - Super Admin only'; instr[16] = 'Auto on final decision'; instr[17] = 'Notes'; }
    else { instr[15] = 'Set: APPROVED / REJECTED'; instr[16] = 'Auto from portal'; instr[17] = 'Auto on decision'; instr[18] = 'HR notes'; }
    if (sh.getMaxColumns() < head.length) sh.insertColumnsAfter(sh.getMaxColumns(), head.length - sh.getMaxColumns());
    sh.getRange(1, 1, 1, head.length).setValues([head]).setBackground('#1a237e').setFontColor('#FFFFFF').setFontWeight('bold').setWrap(true);
    sh.getRange(2, 1, 1, head.length).setValues([instr]).setBackground('#e8eaf6').setFontColor('#5c6bc0');
  }
  sh.setFrozenRows(2);
  return sh;
}

function laAdvCols_(H) {
  var c = advCols_(H);
  c.dept = col_(H, ['Department']);
  c.actualDays = col_(H, ['Actual Present Days (HR)']); c.eligible = col_(H, ['Eligible Salary (Rs.)', 'Eligible Salary']);
  c.maxAllowed = col_(H, ['Max Allowed 60% (Rs.)', 'Max Allowed']); c.hrBy = col_(H, ['HR Action By']); c.hrTime = col_(H, ['HR Timestamp']);
  c.hrRem = col_(H, ['HR Remarks']); c.admBy = col_(H, ['Admin Action By']); c.admTime = col_(H, ['Admin Timestamp']);
  c.admRem = col_(H, ['Admin Remarks']); c.payBy = col_(H, ['Payment Done By']); c.payTime = col_(H, ['Payment Timestamp']);
  c.payRem = col_(H, ['Accountant Remarks']);
  return c;
}
function laReimbCols_(H) {
  return { emp: col_(H, ['Emp ID']), name: col_(H, ['Employee Name']), desig: col_(H, ['Designation']), dept: col_(H, ['Department']),
    ts: col_(H, ['Timestamp']), cat: col_(H, ['Expense Category']), date: col_(H, ['Expense Date']), amount: col_(H, ['Amount (Rs.)', 'Amount']),
    vendor: col_(H, ['Vendor/Supplier Name', 'Vendor']), method: col_(H, ['Payment Method']), purpose: col_(H, ['Business Purpose / Reason', 'Purpose']),
    bill: col_(H, ['Bill / Invoice / Receipt']), docs: col_(H, ['Additional Documents']), decl: col_(H, ['Declaration']), status: col_(H, ['Status']),
    by: col_(H, ['Approved By']), at: col_(H, ['Approved Date']), rem: col_(H, ['HR Remarks']) };
}

/** Leave dates in this workbook are often mis-typed by the sheet (10/09 → 9 Oct). Pick the reading nearest the application date. */
function laDate_(v, ref) {
  var d = parseAny_(v);
  if (!d) return null;
  if (v instanceof Date && d.getDate() <= 12 && ref) {
    var sw = laSwap_(d);
    if (sw && Math.abs(sw.getTime() - ref.getTime()) < Math.abs(d.getTime() - ref.getTime())) return sw;
  }
  return d;
}
/** 8 Sep ⇄ 9 Aug — the same cell read the other way round, same time of day (null when that is not a real date). */
function laSwap_(d) {
  if (!(d instanceof Date) || d.getDate() > 12) return null;
  var sw = new Date(d.getFullYear(), d.getDate() - 1, d.getMonth() + 1, d.getHours(), d.getMinutes(), d.getSeconds());
  return (sw.getMonth() === d.getDate() - 1 && sw.getTime() !== d.getTime()) ? sw : null;
}
/** Every way a date cell can be read. A Date with milliseconds was written by a script (new Date()) — never swapped. */
function laReadings_(v) {
  var d = parseAny_(v);
  if (!d) return [];
  if (!(v instanceof Date) || d.getMilliseconds() !== 0) return [d];
  var s = laSwap_(d);
  return s ? [d, s] : [d];
}
function laDay_(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
/**
 * From / To of a leave row. The Loan & Advance sheet reads a typed "09/08/2026" (9 Aug) as 8 Sep —
 * the From, To and even the Timestamp may be the wrong way round (dates after the 12th never are).
 * Of the possible readings keep the one that matches the Total Days column, runs forwards, was not
 * decided before it was applied for, and starts nearest the application date.
 *   → { from, to, applied }
 */
function laLeaveRange_(fromV, toV, days, tsV, decided) {
  var F = laReadings_(fromV), T = laReadings_(toV);
  if (!F.length) return { from: null, to: null, applied: parseAny_(tsV) };
  var TS = laReadings_(tsV), DAY = 86400000, n = Math.round(num_(days)), best = null;
  var D = (decided || []).map(laReadings_).filter(function (x) { return x.length; });
  (TS.length ? TS : [null]).forEach(function (ts, ti) {
    var base = ti ? 0.1 : 0;
    if (ts) D.forEach(function (rd) { if (rd.every(function (x) { return laDay_(x) < laDay_(ts); })) base += 30; });
    F.forEach(function (a, fi) {
      (T.length ? T : [a]).forEach(function (b, bi) {
        var score = base + (fi ? 0.1 : 0) + (T.length && bi ? 0.1 : 0);
        var span = Math.round((laDay_(b) - laDay_(a)) / DAY) + 1;
        if (span < 1) score += 1000;
        if (n > 0 && span !== n) score += 100 + Math.min(Math.abs(span - n), 90);
        if (ts) {
          var gap = (laDay_(a) - laDay_(ts)) / DAY;          // days from applying to the first day off
          if (gap < -45 || gap > 120) score += 50;
          score += Math.min(Math.abs(gap), 400) / 10;
        }
        if (!best || score < best.score - 1e-9) best = { from: a, to: b, applied: ts, score: score };
      });
    });
  });
  return best;
}

/* ============================ EMPLOYEE FACTS (server only — salary never leaves) ============================ */
function laMaster_() {
  if (__M.laMaster) return __M.laMaster;
  var key = 'la_master_' + gen_('emps');
  var hit = cacheGetJ_(key);
  if (hit) { __M.laMaster = hit; return hit; }
  var t = extRead_(set_('Employee Master Sheet ID'), set_('Employee Master Tab', 'CG EMPLOYEE MASTER'), { headerRow: 1 }), H = t.head;
  var c = { st: col_(H, ['Status']), loc: col_(H, ['Location']), id: col_(H, ['Employee Id', 'Employee ID']), name: col_(H, ['Name']),
    des: col_(H, ['Designation']), dep: col_(H, ['Department']), ph: col_(H, ['Phone No.', 'Phone']), sal: col_(H, ['Current Salary', 'Salary']) };
  var out = {};
  t.rows.forEach(function (r) {
    var id = str_(r[c.id]); if (!id) return;
    var active = c.st < 0 || /^active$/i.test(str_(r[c.st]));
    if (out[id.toUpperCase()] && !active) return;
    out[id.toUpperCase()] = { id: id, name: str_(r[c.name]), designation: str_(r[c.des]), department: str_(r[c.dep]),
      location: str_(r[c.loc]), phone: str_(r[c.ph]).replace(/\.0$/, ''), salary: num_(r[c.sal]), active: active };
  });
  cachePutJ_(key, out, 900);
  __M.laMaster = out;
  return out;
}
function laEmp_(empId) { return laMaster_()[str_(empId).toUpperCase()] || null; }

/* ============================ ROUTING ============================ */
/**
 * Outlet IDs that have an active Outlet Incharge login here (or in the old Admin Access tab):
 * { o: { outletId: [userId | '(Admin Access)'] }, e: { userId: EMPLOYEE ID } }.
 */
function laIncData_() {
  if (__M.laInc) return __M.laInc;
  var ck = 'la_inc2_' + gen_('users') + '_' + gen_('cfg') + '_' + gen_('laadm'), hit = __M.fresh ? null : cacheGetJ_(ck);   // not dropped by every approval
  if (hit && hit.o) return (__M.laInc = hit);
  var out = {}, emp = {};
  var logins = {}; readObjs_(SH.LOGIN).forEach(function (r) { if (/^active$/i.test(str_(r['Status']))) logins[str_(r['User ID'])] = r; });
  readObjs_(SH.ACCESS).forEach(function (a) {
    var uid = str_(a['User ID']);
    if (!logins[uid] || norm_(a['Role']) !== 'outletincharge') return;
    emp[uid] = str_(logins[uid]['Employee ID']).toUpperCase();
    var ids = list_(a['Outlet Access']).map(function (t) { var o = outletByAny_(t); return o ? o.id : ''; }).filter(String);
    if (!ids.length) {
      var e = empById_(str_(logins[uid]['Employee ID']));
      var h = outletByAny_(a['Home Outlet']) || (e && e.outletId ? outletById_(e.outletId) : null);
      if (h) ids = [h.id];
    }
    ids.forEach(function (id) { var o = outletById_(id); if (o && o.type === 'Outlet') out[id] = (out[id] || []).concat([uid]); });
  });
  try {
    var t = extRead_(set_('Loan & Advance Sheet ID'), 'Admin Access', { headerRow: 1 }), H = t.head;
    var ci = col_(H, ['Advance - Outlet Incharge']), cl = col_(H, ['Incharge Outlet(s)']), cs = col_(H, ['Status']);
    if (ci >= 0 && cl >= 0) t.rows.forEach(function (r) {
      if (!yes_(r[ci]) || (cs >= 0 && /inactive/i.test(str_(r[cs])))) return;
      list_(r[cl]).forEach(function (tok) {
        if (norm_(tok) === 'all') outlets_().forEach(function (o) { if (o.type === 'Outlet') out[o.id] = out[o.id] || ['(Admin Access)']; });
        else { var o = outletByAny_(tok); if (o && o.type === 'Outlet') out[o.id] = out[o.id] || ['(Admin Access)']; }
      });
    });
  } catch (e) {}
  var res = { o: out, e: emp };
  __M.laInc = res;
  cachePutJ_(ck, res, 600);
  return res;
}
function laInchargeOutlets_() { return laIncData_().o; }
function laHasIncharge_(outletId, exceptUid) {
  var list = outletId ? laInchargeOutlets_()[outletId] || [] : [];
  return list.some(function (u) { return !exceptUid || u !== exceptUid; });
}
/** An Outlet Incharge of this outlet other than the employee himself — nobody decides his own request. */
function laOtherIncharge_(outletId, empId) {
  var d = laIncData_(), list = outletId ? d.o[outletId] || [] : [], me = str_(empId).toUpperCase();
  return list.some(function (u) { return !me || d.e[u] !== me; });
}
/** Is this employee one of the Outlet Incharges of the outlet? */
function laIsInchargeOf_(outletId, empId) {
  var d = laIncData_(), me = str_(empId).toUpperCase();
  return !!me && (d.o[outletId] || []).some(function (u) { return d.e[u] === me; });
}
/**
 * Does an advance from this location start with the Outlet Incharge? Every outlet (Pandri, Chanderi …): yes.
 * Bhanpuri HQ / GFP (Head Office, Settings ▸ Advance No Incharge Locations): no — they go straight to HR.
 */
function laInchargeStep_(location) {
  var loc = str_(location); if (!loc) return false;
  var o = outletByAny_(loc);
  if (o && o.type !== 'Outlet') return false;
  return !list_(set_('Advance No Incharge Locations', 'Bhanpuri (HQ), Bhanpuri (GFP)')).some(function (t) {
    var x = outletByAny_(t); return (x && o && x.id === o.id) || norm_(t) === norm_(loc);
  });
}
/**
 * A request from an outlet that the old form (or an older One Login) sent straight to HR, HR not having touched
 * it yet — it belongs with the Outlet Incharge first. Same test as the Loan & Advance app (_needsIncharge).
 */
function laSkippedInc_(inc, incBy, hr, hrBy, loc) {
  inc = str_(inc).toUpperCase(); hr = str_(hr).toUpperCase();
  return (inc === '-' || inc === '') && !str_(incBy) && hr === 'PENDING' && !str_(hrBy) && laInchargeStep_(loc);
}

function laAdminRule_(amount, location) {
  var limit = setNum_('Advance Admin Approval Above', 5000);
  var loc = str_(location);
  if (!loc) return { required: true, reason: 'location not found' };
  var o = outletByAny_(loc);
  var adminLocs = list_(set_('Advance Admin Locations', 'Bhanpuri (HQ), Bhanpuri (GFP)'));
  var isAdminLoc = adminLocs.some(function (t) { var x = outletByAny_(t); return (x && o && x.id === o.id) || norm_(t) === norm_(loc); });
  if (isAdminLoc) return { required: true, reason: (o ? o.name : loc) + ' staff' };
  if (num_(amount) > limit) return { required: true, reason: 'above ₹' + limit };
  return { required: false, reason: '₹' + limit + ' or less' };
}
function laMaxAdvance_(salary, days) {
  var pct = setNum_('Advance Percentage', 60) / 100, eligibleDays = setNum_('Advance Eligible Days', 15);
  var d = Math.min(Math.max(parseInt(days, 10) || 0, 0), eligibleDays);
  var eligible = round_(d * (num_(salary) / 30), 2);
  var max = eligible * pct;
  return { days: d, eligible: eligible, max: max > 0 ? Math.round(max / 100) * 100 : 0 };
}

/* ============================ SELF SERVICE: APPLY ============================ */
function reqMeta_(ctx) {
  var e = laEmp_(ctx.empId);
  if (!e) throw new Error('Your Employee ID (' + (ctx.empId || '—') + ') is not in the employee master. Please contact HR.');
  var r = laAdvRoute_(e), limit = setNum_('Advance Admin Approval Above', 5000);
  var rule = laAdminRule_(limit + 1, e.location), always = rule.required && !/above/.test(rule.reason);
  return { emp: { id: e.id, name: e.name, designation: e.designation, department: e.department, location: e.location },
    advance: { pct: setNum_('Advance Percentage', 60), days: setNum_('Advance Eligible Days', 15),
      goesTo: r.goesTo, steps: r.steps.concat(['HR', always ? 'Director' : 'Director (above ₹' + limit + ')', 'Operations Manager (payment)']) },
    leave: { goesTo: laLeaveL1_(e, ctx.uid) ? 'your Outlet Incharge, then HR' : 'HR' },
    categories: list_(set_('Reimbursement Categories', '')), methods: list_(set_('Reimbursement Payment Methods', 'UPI, Cash')),
    formUrl: set_('Loan & Advance App URL', LA_APP_URL), today: todayIso_() };
}
/**
 * Where a new advance of this employee starts.
 *   outlet, incharge login exists      → Outlet Incharge (PENDING)
 *   outlet, no incharge login           → Outlet Incharge (PENDING) — HR sees it and can decide it directly
 *   the outlet's only incharge himself  → HR (incharge step "-", noted as his own request)
 *   Bhanpuri HQ / GFP                   → HR (incharge step "-")
 */
function laAdvRoute_(e) {
  var o = outletByAny_(e.location), step = laInchargeStep_(e.location);
  var oid = o && o.type === 'Outlet' ? o.id : '';
  var other = !!oid && laOtherIncharge_(oid, e.id);
  var own = step && !!oid && !other && laIsInchargeOf_(oid, e.id);
  if (!step) return { inc: false, steps: [], goesTo: 'HR', note: '' };
  if (own) return { inc: false, own: true, steps: [], goesTo: 'HR (you are the Outlet Incharge)', note: 'Not needed - own request (Outlet Incharge)' };
  return { inc: true, steps: ['Outlet Incharge'], hasLogin: other,
    goesTo: other ? 'your Outlet Incharge, then HR' : 'HR (your outlet has no Outlet Incharge login yet)' };
}
function laLeaveL1_(e, exceptUid) {
  var o = outletByAny_(e.location);
  if (setYes_('Leave Incharge Step')) return !!(o && o.type === 'Outlet' && laHasIncharge_(o.id, exceptUid));
  return /pandri|cg001/i.test(e.location);
}

function reqAdvPreview_(ctx, d) {
  var e = laEmp_(ctx.empId);
  if (!e || !e.salary) throw new Error('Your salary is not in the employee master — please contact HR.');
  var m = laMaxAdvance_(e.salary, d.days);
  return { days: m.days, max: m.max };
}

function reqAdvance_(ctx, d) {
  var e = laEmp_(ctx.empId);
  if (!e || !e.salary) throw new Error('Your salary is not in the employee master — please contact HR.');
  var purpose = str_(d.purpose), days = parseInt(d.days, 10) || 0, amount = parseInt(d.amount, 10) || 0;
  if (!purpose) throw new Error('Write the purpose. / उद्देश्य लिखें।');
  if (days <= 0) throw new Error('Enter your present days. / उपस्थित दिन दर्ज करें।');
  if (amount <= 0) throw new Error('Enter the amount you need. / राशि दर्ज करें।');
  var m = laMaxAdvance_(e.salary, days);
  if (amount > m.max) throw new Error('₹' + amount + ' is more than the maximum ₹' + m.max + ' for ' + m.days + ' days.');
  var route = laAdvRoute_(e), withInc = route.inc;
  return lock_(function () {
    var sh = laTabFor_(LA_ADV), now = new Date(), lr = sh.getLastRow();
    var H = sh.getRange(2, 1, 1, Math.max(sh.getLastColumn(), 36)).getValues()[0].map(str_), c = laAdvCols_(H);
    if (c.incSt < 0 || c.paySt < 0) throw new Error('This month\'s advance tab is in an old layout — open the Loan & Advance form once to upgrade it.');
    var row = new Array(Math.max(H.length, 36)).fill('');
    function s(k, v) { if (c[k] >= 0) row[c[k]] = v; }
    s('sno', Math.max(lr - 2, 0) + 1); s('ts', now); s('month', monthLabel_(now)); s('emp', e.id); s('name', e.name); s('loc', e.location);
    s('desig', e.designation); s('dept', e.department); s('salary', e.salary); s('daily', round_(e.salary / 30, 2)); s('purpose', purpose);
    s('req', amount); s('days', m.days);
    s('incSt', withInc ? 'PENDING' : '-'); s('hrSt', withInc ? '-' : 'PENDING'); s('admSt', '-'); s('paySt', '-');
    if (route.note) s('incBy', route.note);       // so neither app sends it back to the incharge (it is his own)
    sh.getRange(lr + 1, 1, 1, row.length).setValues([row]);
    try { sh.getRange(lr + 1, c.ts + 1).setNumberFormat('dd/MM/yyyy HH:mm:ss'); sh.getRange(lr + 1, 1, 1, 36).setBackground(LA_AMBER); } catch (x) {}
    log_(ctx, 'Advance applied', '₹' + amount + ' · ' + m.days + ' days');
    return { message: 'Advance request of ₹' + amount + ' sent to ' + (!withInc ? 'HR' : route.hasLogin ? 'your Outlet Incharge' :
      'HR — your outlet has no Outlet Incharge login yet') + '. / आवेदन जमा हो गया।' };
  });
}

function reqLeave_(ctx, d) {
  var e = laEmp_(ctx.empId);
  if (!e) throw new Error('You are not in the employee master — please contact HR.');
  var from = isoToDate_(d.from), to = isoToDate_(d.to) || from;
  if (!from) throw new Error('Pick the first day of leave.');
  if (to < from) throw new Error('The last day cannot be before the first day.');
  if (!str_(d.reason)) throw new Error('Write the reason. / कारण लिखें।');
  var days = Math.round((to - from) / 86400000) + 1;
  if (days > 60) throw new Error('A single leave request can be at most 60 days.');
  var l1 = laLeaveL1_(e, ctx.uid);
  return lock_(function () {
    var sh = laTabFor_(LA_LEAVE), lr = sh.getLastRow();
    var H = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 22)).getValues()[0].map(str_), c = leaveCols_(H);
    var row = new Array(Math.max(H.length, 22)).fill('');
    function s(k, v) { if (c[k] >= 0) row[c[k]] = v; }
    row[0] = Math.max(lr - 2, 0) + 1;
    s('ts', new Date()); s('emp', e.id); s('name', e.name); s('desig', e.designation); s('dept', e.department);
    s('dur', days > 1 ? 'Multiple Days' : 'Single Day'); s('from', from); s('to', to); s('days', days); s('reason', str_(d.reason));
    if (l1) s('l1', 'PENDING'); else { s('l1', '-'); s('l1By', '-'); s('l1Date', '-'); }
    s('fin', 'PENDING');
    sh.getRange(lr + 1, 1, 1, row.length).setValues([row]);
    try {
      sh.getRange(lr + 1, c.ts + 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
      sh.getRange(lr + 1, c.from + 1, 1, 2).setNumberFormat('dd/MM/yyyy');
      sh.getRange(lr + 1, 1, 1, 22).setBackground(LA_AMBER);
    } catch (x) {}
    log_(ctx, 'Leave applied', fmt_(from) + ' – ' + fmt_(to));
    return { message: 'Leave request sent to ' + (l1 ? 'your Outlet Incharge' : 'HR') + '. / अवकाश आवेदन जमा हो गया।' };
  });
}

function reqReimb_(ctx, d) {
  var e = laEmp_(ctx.empId);
  if (!e) throw new Error('You are not in the employee master — please contact HR.');
  var amount = num_(d.amount);
  if (!(amount > 0)) throw new Error('Enter a valid amount.');
  if (!str_(d.category)) throw new Error('Pick an expense category.');
  var date = isoToDate_(d.date);
  if (!date) throw new Error('Pick the expense date.');
  if (!d.declaration) throw new Error('Please tick the declaration.');
  if (!str_(d.billFileId)) throw new Error('Attach the bill / receipt photo.');
  var bill = DriveApp.getFileById(str_(d.billFileId)).getUrl();
  var extra = (d.extraFileIds || []).map(function (id) { try { return DriveApp.getFileById(str_(id)).getUrl(); } catch (x) { return ''; } }).filter(String).join('\n');
  return lock_(function () {
    var sh = laTabFor_(LA_REIMB), lr = sh.getLastRow();
    var H = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 19)).getValues()[0].map(str_), c = laReimbCols_(H);
    var row = new Array(Math.max(H.length, 19)).fill('');
    function s(k, v) { if (c[k] >= 0) row[c[k]] = v; }
    row[0] = Math.max(lr - 2, 0) + 1;
    s('ts', new Date()); s('emp', e.id); s('name', e.name); s('desig', e.designation); s('dept', e.department); s('cat', str_(d.category));
    s('date', date); s('amount', amount); s('vendor', str_(d.vendor)); s('method', str_(d.method)); s('purpose', str_(d.purpose));
    s('bill', bill); s('docs', extra); s('decl', 'Yes - certified accurate'); s('status', 'PENDING');
    sh.getRange(lr + 1, 1, 1, row.length).setValues([row]);
    try { sh.getRange(lr + 1, c.ts + 1).setNumberFormat('dd/MM/yyyy HH:mm:ss'); sh.getRange(lr + 1, c.date + 1).setNumberFormat('dd/MM/yyyy'); sh.getRange(lr + 1, 1, 1, 19).setBackground(LA_AMBER); } catch (x) {}
    log_(ctx, 'Reimbursement applied', '₹' + amount + ' · ' + str_(d.category));
    return { message: 'Reimbursement of ₹' + amount + ' submitted. / प्रतिपूर्ति आवेदन जमा हो गया।' };
  });
}

/* ============================ SELF SERVICE: MY REQUESTS ============================ */
function advStageOf_(get) {
  var inc = get('incSt'), hr = get('hrSt'), adm = get('admSt'), pay = get('paySt');
  if (inc === 'REJECTED' || hr === 'REJECTED' || adm === 'REJECTED') return 'REJECTED';
  if (pay === 'PAID') return 'PAID';
  if (adm === 'APPROVED') return 'TO_PAY';
  if (hr === 'APPROVED') return 'ADMIN';
  if (hr === 'PENDING') return 'HR';
  if (inc === 'PENDING') return 'INCHARGE';
  if (inc === 'APPROVED') return 'HR';
  return 'OTHER';
}
var LA_STAGE_TEXT = { REJECTED: 'Rejected', PAID: 'Paid', TO_PAY: 'Approved · pending payment', ADMIN: 'Pending with Director',
  HR: 'Pending with HR', INCHARGE: 'Pending with Outlet Incharge', OTHER: 'Submitted' };

/**
 * Every advance of the last `months` month tabs (newest tab first). A request the old form sent straight to HR
 * from an outlet (laSkippedInc_) reads as waiting for the Outlet Incharge — exactly as the Loan & Advance app
 * now treats it — and carries legacySkip: true.
 */
function laAdvRead_(months, filter) {
  var out = [];
  laMonthTabs_(LA_ADV, months).forEach(function (t) {
    var R = t.data, c = laAdvCols_(R.head);
    if (c.emp < 0 || c.incSt < 0) return;
    R.rows.forEach(function (r, i) {
      var emp = str_(r[c.emp]); if (!emp) return;
      var raw = function (k) { return c[k] >= 0 ? str_(r[c[k]]).toUpperCase() : ''; };
      var loc = c.loc >= 0 ? str_(r[c.loc]) : '', incBy = str_(r[c.incBy]), hrBy = c.hrBy >= 0 ? str_(r[c.hrBy]) : '';
      var legacy = laSkippedInc_(raw('incSt'), incBy, raw('hrSt'), hrBy, loc);
      var get = legacy ? function (k) { return k === 'incSt' ? 'PENDING' : k === 'hrSt' ? '-' : raw(k); } : raw;
      var tIn = parseAny_(r[c.ts]), tm = function (k) { return c[k] >= 0 ? parseAny_(r[c[k]]) : null; };
      var tInc = tm('incTime'), tHr = tm('hrTime'), tAdm = tm('admTime'), tPay = tm('payTime');
      var o = { sheet: t.name, month: t.month, row: R.first + i, empId: emp, name: str_(r[c.name]), location: loc,
        designation: str_(r[c.desig]), department: c.dept >= 0 ? str_(r[c.dept]) : '', applied: fmt_(tIn || r[c.ts], 'dd/MM/yyyy hh:mm a'),
        appliedKey: iso_(r[c.ts]), appliedTs: tIn ? tIn.getTime() : 0, salary: num_(r[c.salary]), purpose: str_(r[c.purpose]),
        requested: num_(r[c.req]), days: num_(r[c.days]),
        incStatus: get('incSt'), incMax: num_(r[c.incMax]), incAmount: num_(r[c.incAmt]), incBy: incBy.replace(/\s*\(HR, for the Outlet Incharge\)/i, ' (HR)'), incRemarks: str_(r[c.incRem]),
        incTime: tInc ? fmt_(tInc, 'dd/MM/yyyy hh:mm a') : '',
        actualDays: c.actualDays >= 0 ? str_(r[c.actualDays]) : '', eligible: c.eligible >= 0 ? num_(r[c.eligible]) : 0,
        maxAllowed: c.maxAllowed >= 0 ? num_(r[c.maxAllowed]) : 0, hrStatus: get('hrSt'), hrAmount: c.hrAmt >= 0 ? num_(r[c.hrAmt]) : 0,
        hrBy: hrBy, hrRemarks: c.hrRem >= 0 ? str_(r[c.hrRem]) : '', hrTime: tHr ? fmt_(tHr, 'dd/MM/yyyy hh:mm a') : '',
        admStatus: get('admSt'), admAmount: c.admAmt >= 0 ? num_(r[c.admAmt]) : 0, admBy: c.admBy >= 0 ? str_(r[c.admBy]) : '',
        admRemarks: c.admRem >= 0 ? str_(r[c.admRem]) : '', admTime: tAdm ? iso_(tAdm) : '', admTimeText: tAdm ? fmt_(tAdm, 'dd/MM/yyyy hh:mm a') : '',
        payStatus: get('paySt'), payBy: c.payBy >= 0 ? str_(r[c.payBy]) : '', payTime: tPay ? fmt_(tPay, 'dd/MM/yyyy') : '',
        payRemarks: c.payRem >= 0 ? str_(r[c.payRem]) : '', legacySkip: legacy,
        acted: [tInc, tHr, tAdm, tPay].filter(Boolean).map(function (d) { return fmt_(d, 'yyyyMM'); }) };
      o.stage = advStageOf_(get);
      o.stageText = LA_STAGE_TEXT[o.stage];
      o.amount = o.stage === 'REJECTED' ? 0 : (o.admStatus === 'APPROVED' ? (o.admAmount || o.hrAmount) : o.hrStatus === 'APPROVED' ? o.hrAmount : o.incStatus === 'APPROVED' ? o.incAmount : 0);
      o.autoAdmin = o.admBy.indexOf(LA_AUTO_ADMIN) === 0;
      o.resent = o.admRemarks.indexOf(LA_RESEND) === 0;
      o.closedByHr = o.admStatus === 'REJECTED' && o.hrStatus === 'REJECTED';
      o.rejectedAt = o.closedByHr ? 'Director (closed by HR)' : o.admStatus === 'REJECTED' ? 'Director' : o.hrStatus === 'REJECTED' ? 'HR' : o.incStatus === 'REJECTED' ? 'Outlet Incharge' : '';
      if (o.closedByHr) o.stageText = 'Rejected · closed by HR';
      if (!filter || filter(o)) out.push(o);
    });
  });
  return out;
}
/** The tracker: this month's applications, plus older ones until they are paid (or decided this month). */
function laKeepInTracker_(a, cur, curKey) {
  return a.month === cur || (a.stage !== 'PAID' && a.stage !== 'REJECTED') || (a.acted || []).indexOf(curKey) >= 0;
}
/** Newest application first. */
function laSortTracker_(list) {
  return list.sort(function (a, b) { return (b.appliedTs || 0) - (a.appliedTs || 0) || String(b.sheet).localeCompare(String(a.sheet)) || b.row - a.row; });
}

function laLeaveRead_(months, filter) {
  var out = [];
  laMonthTabs_(LA_LEAVE, months).forEach(function (t) {
    var R = t.data, c = leaveCols_(R.head);
    if (c.emp < 0 || c.fin < 0) return;
    R.rows.forEach(function (r, i) {
      var emp = str_(r[c.emp]); if (!emp) return;
      var rg = laLeaveRange_(r[c.from], r[c.to], r[c.days], r[c.ts], [r[c.l1Date], r[c.finDate]]), f = rg.from, to = rg.to || f;
      var o = { sheet: t.name, month: t.month, row: R.first + i, empId: emp, name: str_(r[c.name]), designation: str_(r[c.desig]),
        department: str_(r[c.dept]), applied: fmt_(rg.applied, 'dd/MM/yyyy hh:mm a'), duration: str_(r[c.dur]), from: fmt_(f), to: fmt_(to),
        fromKey: iso_(f), toKey: iso_(to), days: num_(r[c.days]), reason: str_(r[c.reason]), l1: str_(r[c.l1]).toUpperCase(),
        l1By: str_(r[c.l1By]).replace(/\s*\(HR, for the Outlet Incharge\)/i, ' (HR)'), final: str_(r[c.fin]).toUpperCase(), finalBy: c.finBy >= 0 ? str_(r[c.finBy]) : '',
        remarks: c.rem >= 0 ? str_(r[c.rem]) : '', replacement: c.rName >= 0 ? str_(r[c.rName]) : '' };
      o.stageText = o.final === 'APPROVED' ? 'Approved' : o.final === 'REJECTED' || o.l1 === 'REJECTED' ? 'Rejected' :
        o.l1 === 'PENDING' ? 'Pending with Outlet Incharge' : 'Pending with HR';
      if (!filter || filter(o)) out.push(o);
    });
  });
  return out;
}

function laReimbRead_(months, filter) {
  var out = [];
  laMonthTabs_(LA_REIMB, months).forEach(function (t) {
    var R = t.data, c = laReimbCols_(R.head);
    if (c.emp < 0 || c.status < 0) return;
    R.rows.forEach(function (r, i) {
      var emp = str_(r[c.emp]); if (!emp) return;
      var ts = parseAny_(r[c.ts]);
      var o = { sheet: t.name, month: t.month, row: R.first + i, empId: emp, name: str_(r[c.name]), designation: str_(r[c.desig]),
        department: str_(r[c.dept]), applied: fmt_(ts, 'dd/MM/yyyy hh:mm a'), category: str_(r[c.cat]), date: fmt_(laDate_(r[c.date], ts)),
        amount: num_(r[c.amount]), vendor: str_(r[c.vendor]), method: str_(r[c.method]), purpose: str_(r[c.purpose]),
        bill: str_(r[c.bill]), docs: list_(str_(r[c.docs]).replace(/\n/g, ',')), status: str_(r[c.status]).toUpperCase() || 'PENDING',
        by: c.by >= 0 ? str_(r[c.by]) : '', at: c.at >= 0 ? fmt_(r[c.at]) : '', remarks: c.rem >= 0 ? str_(r[c.rem]) : '' };
      if (!filter || filter(o)) out.push(o);
    });
  });
  return out;
}

/** The latest request first: newest month tab first (the order laMonthTabs_ reads them), the last row of a tab first. */
function laNewestFirst_(list) {
  var order = {}, n = 0;
  list.forEach(function (o) { if (order[o.sheet] === undefined) order[o.sheet] = n++; });
  return list.slice().sort(function (a, b) { return (order[a.sheet] - order[b.sheet]) || (b.row - a.row); });
}
/** Speed: a request just sent comes back with the person's fresh "My requests" list (one call, not two). */
function withMine_(fn) {
  return function (ctx, d) { var r = fn(ctx, d); try { r.mine = reqMine_(ctx); } catch (e) {} return r; };
}
function reqMine_(ctx) {
  var id = str_(ctx.empId).toUpperCase();
  if (!id) throw new Error('Your login is not linked to an Employee ID.');
  var mine = function (o) { return o.empId.toUpperCase() === id; };
  var out = { advances: [], leaves: [], reimbursements: [], errors: [] }, names = [], d = new Date();
  for (var i = 0; i < 6; i++) { var ml = monthLabel_(new Date(d.getFullYear(), d.getMonth() - i, 1)); names.push(LA_ADV + ml, LA_LEAVE + ml, LA_REIMB + ml); }
  try { laWarm_(names); } catch (e) {}
  try { out.advances = laNewestFirst_(laAdvRead_(6, mine)); } catch (e) { out.errors.push('Advance: ' + e.message); }
  try { out.leaves = laNewestFirst_(laLeaveRead_(6, mine)); } catch (e) { out.errors.push('Leave: ' + e.message); }
  try { out.reimbursements = laNewestFirst_(laReimbRead_(6, mine)); } catch (e) { out.errors.push('Reimbursement: ' + e.message); }
  out.advances.forEach(function (a) { delete a.salary; });   // their own sheet row — but salary is not shown here
  return out;
}

/* ============================ APPROVALS (HR · Admin · Accounts) ============================ */
function apprScope_(ctx) {
  if (norm_(ctx.role) !== 'outletincharge') return null;
  return { outlets: (ctx.outlets || []).slice(), me: str_(ctx.empId).toUpperCase(), map: empOutletMap_() };
}
function apprOutOfScope_(sc, empId, loc, anyOutlet) {
  if (!sc) return '';
  if (sc.me && str_(empId).toUpperCase() === sc.me) return 'your own request';
  if (anyOutlet) return '';
  return sc.outlets.indexOf(laEmpOutlet_(empId, loc || '', sc.map)) >= 0 ? '' : 'not in your outlets';
}
function apprCheckScope_(ctx, empId, loc, anyOutlet) {
  var why = apprOutOfScope_(apprScope_(ctx), empId, loc, anyOutlet);
  if (why === 'your own request') throw new Error('You cannot decide your own request.');
  if (why) throw new Error('This employee is not in your outlets.');
}
function apprLoad_(ctx) {
  var g = ctx.grants, months = setNum_('Advance Scan Months', 3), cur = monthLabel_(), sc = apprScope_(ctx);
  var out = { can: { hr: !!g.adv_hr, admin: !!g.adv_admin, pay: !!g.adv_pay, leave: !!g.leave_final, reimb: !!g.reimb_approve },
    month: cur, rule: 'Director approval above ₹' + setNum_('Advance Admin Approval Above', 5000) + ' (any outlet) and for every ' +
      set_('Advance Admin Locations', 'Bhanpuri (HQ), Bhanpuri (GFP)') + ' request',
    pct: setNum_('Advance Percentage', 60), eligibleDays: setNum_('Advance Eligible Days', 15),
    advance: { hr: [], rejected: [], admin: [], pay: [], tracker: [] }, leave: [], leaveRecent: [], reimb: [], reimbRecent: [], errors: [] };
  if (g.adv_hr || g.adv_admin || g.adv_pay) {
    try {
      var curKey = fmt_(new Date(), 'yyyyMM');
      laAdvRead_(months).forEach(function (a) {
        if (apprOutOfScope_(sc, a.empId, a.location)) return;
        var o = outletByAny_(a.location), oid = o && o.type === 'Outlet' ? o.id : '';
        if (a.stage === 'INCHARGE') {
          a.orphan = !(oid && laOtherIncharge_(oid, a.empId));            // nobody but HR can decide it
          if (a.orphan && oid && laIsInchargeOf_(oid, a.empId)) a.orphanWhy = 'own';
          a.onBehalf = !a.orphan && setYes_('HR Can Decide For Incharge');  // HR may decide for the Outlet Incharge
        }
        if (laKeepInTracker_(a, cur, curKey)) out.advance.tracker.push(a);
        if (g.adv_hr && (a.stage === 'HR' || a.orphan || a.onBehalf)) out.advance.hr.push(a);
        // rejected by Admin → back on HR's desk until HR re-sends it or rejects it too
        if (g.adv_hr && a.admStatus === 'REJECTED' && a.hrStatus === 'APPROVED' && a.payStatus !== 'PAID') out.advance.rejected.push(a);
        if (g.adv_admin && a.stage === 'ADMIN') out.advance.admin.push(a);
        if (g.adv_pay && a.stage === 'TO_PAY') out.advance.pay.push(a);
      });
      laSortTracker_(out.advance.tracker);
      if (!g.adv_hr && !g.adv_admin) out.advance.tracker.forEach(function (a) { delete a.salary; });
    } catch (e) { out.errors.push('Advance: ' + e.message); }
  }
  if (g.leave_final) {
    try {
      laLeaveRead_(months).forEach(function (l) {
        if (apprOutOfScope_(sc, l.empId, '')) return;
        if (l.final === 'PENDING' || l.final === '') {
          l.waitingIncharge = l.l1 === 'PENDING';
          out.leave.push(l);
        } else if (l.month === cur) out.leaveRecent.push(l);
      });
      out.leaveRecent.reverse();
    } catch (e) { out.errors.push('Leave: ' + e.message); }
  }
  if (g.reimb_approve) {
    try {
      var omap = empOutletMap_();
      laReimbRead_(months).forEach(function (r) {
        r.own = !!apprOutOfScope_(sc, r.empId, '', true);
        if (!r.location) r.location = (outletById_(laEmpOutlet_(r.empId, '', omap)) || {}).name || '';
        if (r.status === 'PENDING') out.reimb.push(r); else if (r.month === cur) out.reimbRecent.push(r);
      });
      out.reimbRecent.reverse();
    } catch (e) { out.errors.push('Reimbursement: ' + e.message); }
  }
  return out;
}

/** Opens an advance row for a write, re-checking that it still belongs to the same person. */
function laAdvTarget_(d) {
  if (!/^Advance [A-Za-z]+ \d{4}$/.test(str_(d.sheet))) throw new Error('Unknown advance tab.');
  var sh = laSS_().getSheetByName(d.sheet);
  if (!sh) throw new Error('Advance tab not found.');
  var R = laRead_(sh), c = laAdvCols_(R.head), rowNum = Number(d.row);
  if (c.incSt < 0 || c.paySt < 0) throw new Error('This advance tab is in the old layout — open the Loan & Advance form once to upgrade it.');
  if (!(rowNum >= R.first) || rowNum > sh.getLastRow()) throw new Error('Invalid row.');
  var lc = Math.max(sh.getLastColumn(), 36);
  var r = sh.getRange(rowNum, 1, 1, lc).getValues()[0];
  if (str_(r[c.emp]).toUpperCase() !== str_(d.empId).toUpperCase()) throw new Error('The sheet changed — please refresh.');
  return { sh: sh, c: c, row: rowNum, r: r, lc: lc,
    get: function (k) { return c[k] >= 0 ? str_(r[c[k]]).toUpperCase() : ''; },
    put: function (k, v) { if (c[k] >= 0) r[c[k]] = v; },
    save: function (from, to) { var a = c[from], b = c[to]; laDirty_(d.sheet); sh.getRange(rowNum, a + 1, 1, b - a + 1).setValues([r.slice(a, b + 1)]); },
    tint: function (col) { try { sh.getRange(rowNum, 1, 1, 36).setBackground(col); } catch (e) {} },
    stamp: function (keys) { keys.forEach(function (k) { if (c[k] >= 0) try { sh.getRange(rowNum, c[k] + 1).setNumberFormat('dd/MM/yyyy HH:mm:ss'); } catch (e) {} }); } };
}

function laRouteAfterHr_(t, now) {
  var amt = num_(t.r[t.c.hrAmt]) || num_(t.r[t.c.incAmt]) || num_(t.r[t.c.req]);
  var rule = laAdminRule_(amt, t.c.loc >= 0 ? t.r[t.c.loc] : '');
  if (rule.required) { t.put('admSt', 'PENDING'); t.put('admAmt', ''); t.put('admBy', ''); t.put('admTime', ''); }
  else {
    t.put('admSt', 'APPROVED'); t.put('admAmt', amt); t.put('admBy', LA_AUTO_ADMIN); t.put('admTime', now);
    t.put('admRem', 'Admin approval applied automatically (' + rule.reason + ').');
    if (t.get('paySt') !== 'PAID') t.put('paySt', 'PENDING');
  }
  return rule;
}

function apprHrPreview_(ctx, d) {
  var t = laAdvTarget_(d);
  return laMaxAdvance_(num_(t.r[t.c.salary]), d.days);
}

function apprAdvHr_(ctx, d) {
  var dec = str_(d.decision).toUpperCase();
  if (dec !== 'APPROVED' && dec !== 'REJECTED') throw new Error('Pick Approve or Reject.');
  return lock_(function () {
    var t = laAdvTarget_(d), inc = t.get('incSt'), hr = t.get('hrSt');
    var loc = t.c.loc >= 0 ? t.r[t.c.loc] : '', emp = str_(t.r[t.c.emp]);
    apprCheckScope_(ctx, emp, loc);
    var legacy = laSkippedInc_(inc, t.r[t.c.incBy], hr, t.c.hrBy >= 0 ? t.r[t.c.hrBy] : '', loc);
    var waitsInc = inc === 'PENDING' || legacy;
    var o = outletByAny_(loc), oid = o && o.type === 'Outlet' ? o.id : '';
    var orphan = waitsInc && !(oid && laOtherIncharge_(oid, emp));
    var behalf = waitsInc && !orphan && setYes_('HR Can Decide For Incharge');
    if (waitsInc && !orphan && !behalf) throw new Error('Still waiting for the Outlet Incharge — the incharge approves first, then it comes to HR.');
    var turn = orphan || behalf || hr === 'PENDING' || (inc === 'APPROVED' && (hr === '' || hr === '-'));
    if (!turn) throw new Error(inc === 'REJECTED' ? 'Already rejected by the Outlet Incharge.' : 'Already ' + (hr || 'handled').toLowerCase() + ' by HR.');
    var now = new Date(), note = str_(d.remarks);
    if (orphan) {
      t.put('incSt', '-'); t.put('incTime', now);
      t.put('incBy', oid && laIsInchargeOf_(oid, emp) ? 'Skipped - own request of the Outlet Incharge' : 'Skipped - no active incharge login');
    }
    if (behalf) {                                        // HR decides the incharge step too — written as such in the sheet
      t.put('incSt', dec); t.put('incTime', now); t.put('incBy', ctx.name + (dirIs_(ctx) ? ' (Director)' : ' (HR)'));
      if (dec === 'APPROVED') { var ia = parseInt(d.amount, 10) || num_(t.r[t.c.req]); t.put('incAmt', ia); }
      if (note) t.put('incRem', note);
    }
    var daysRaw = str_(d.actualDays);
    if (daysRaw !== '') {
      var m = laMaxAdvance_(num_(t.r[t.c.salary]), daysRaw);
      t.put('actualDays', m.days); t.put('eligible', m.eligible); t.put('maxAllowed', m.max);
    }
    if (dec === 'REJECTED') {
      if (!note) throw new Error('Write the reason for rejecting.');
      t.put('hrSt', 'REJECTED'); t.put('hrBy', ctx.name); t.put('hrTime', now); t.put('hrRem', note);
      t.save(t.c.incSt < t.c.incMax ? 'incSt' : 'incMax', 'hrRem'); t.stamp(['incTime', 'hrTime']); t.tint(LA_RED);
      log_(ctx, 'Advance HR REJECTED' + (behalf ? ' (for the incharge)' : ''), d.sheet + ' row ' + t.row);
      return { message: dirIs_(ctx) ? 'Advance rejected at the HR step.' : 'Advance rejected by HR.' };
    }
    if (daysRaw === '') throw new Error('Enter the actual present days before approving.');
    var amt = parseInt(d.amount, 10) || 0;
    if (amt <= 0) amt = num_(t.r[t.c.incAmt]) || Math.min(num_(t.r[t.c.req]), num_(t.r[t.c.maxAllowed]));
    if (amt <= 0) throw new Error('Enter the amount to approve.');
    t.put('hrAmt', amt); t.put('hrSt', 'APPROVED'); t.put('hrBy', ctx.name); t.put('hrTime', now); if (note) t.put('hrRem', note);
    var rule = laRouteAfterHr_(t, now);
    t.save(t.c.incSt < t.c.incMax ? 'incSt' : 'incMax', 'paySt'); t.stamp(['incTime', 'hrTime', 'admTime']); t.tint(rule.required ? LA_BLUE : LA_GREEN);
    log_(ctx, 'Advance HR APPROVED' + (behalf ? ' (for the incharge)' : ''), d.sheet + ' row ' + t.row + ' ₹' + amt);
    return { message: (dirIs_(ctx) ? 'Approved ₹' + amt + ' at the HR step' : 'HR approved ₹' + amt) + (rule.required ? ' — sent to the Director (' + rule.reason + ').' : ' — no Director approval needed (' + rule.reason + '). Sent to the Operations Manager for payment.') };
  });
}

/** Rejected by the Director: HR can also reject it — then it is closed for good (Loan & Advance app: advanceHrCloseRejected). */
function apprAdvHrClose_(ctx, d) {
  var note = str_(d.remarks);
  if (!note) throw new Error('Write why you are rejecting it.');
  return lock_(function () {
    var t = laAdvTarget_(d);
    if (t.get('admSt') !== 'REJECTED') throw new Error('Only advances rejected by the Director can be rejected here.');
    if (t.get('hrSt') === 'REJECTED') throw new Error('HR has already rejected this advance — it is closed.');
    if (t.get('hrSt') !== 'APPROVED') throw new Error('HR has not approved this advance.');
    if (t.get('paySt') === 'PAID') throw new Error('This advance is already paid.');
    var now = new Date(), prev = str_(t.r[t.c.hrRem]);
    t.put('hrSt', 'REJECTED'); t.put('hrBy', ctx.name); t.put('hrTime', now);
    t.put('hrRem', 'Rejected by HR after the Admin rejection: ' + note + (prev ? ' | ' + prev : ''));
    t.save('hrSt', 'hrRem'); t.stamp(['hrTime']); t.tint(LA_RED);
    log_(ctx, 'Advance closed by HR', d.sheet + ' row ' + t.row + ' ' + str_(t.r[t.c.name]));
    return { message: 'Advance rejected by HR — it is closed.' };
  });
}

function apprAdvResend_(ctx, d) {
  return lock_(function () {
    var t = laAdvTarget_(d);
    if (t.get('admSt') !== 'REJECTED') throw new Error('Only advances rejected by the Director can be sent again.');
    if (t.get('hrSt') === 'REJECTED') throw new Error('HR has rejected this advance — it is closed.');
    if (t.get('hrSt') !== 'APPROVED') throw new Error('HR has not approved this advance.');
    if (t.get('paySt') === 'PAID') throw new Error('This advance is already paid.');
    var amt = parseInt(d.amount, 10) || num_(t.r[t.c.hrAmt]);
    if (amt <= 0) throw new Error('Enter the amount to send to the Director.');
    var now = new Date(), note = str_(d.remarks);
    var prevBy = str_(t.r[t.c.admBy]) || 'Admin', prevRm = str_(t.r[t.c.admRem]);
    t.put('hrAmt', amt); t.put('hrBy', ctx.name); t.put('hrTime', now);
    t.put('hrRem', 'Re-sent to Admin' + (note ? ': ' + note : '') + (str_(t.r[t.c.hrRem]) ? ' | ' + str_(t.r[t.c.hrRem]) : ''));
    t.put('admSt', 'PENDING'); t.put('admAmt', ''); t.put('admBy', ''); t.put('admTime', '');
    t.put('admRem', LA_RESEND + ' on ' + fmt_(now, 'dd/MM/yyyy HH:mm') + ' after rejection by ' + prevBy + (prevRm ? ': ' + prevRm : ''));
    t.put('paySt', '-');
    t.save('hrAmt', 'paySt'); t.stamp(['hrTime']); t.tint(LA_BLUE);
    log_(ctx, 'Advance re-sent', d.sheet + ' row ' + t.row + ' ₹' + amt);
    return { message: 'Sent again to the Director with ₹' + amt + '.' };
  });
}

function apprAdvAdmin_(ctx, d) {
  var dec = str_(d.decision).toUpperCase();
  if (dec !== 'APPROVED' && dec !== 'REJECTED') throw new Error('Pick Approve or Reject.');
  return lock_(function () {
    var t = laAdvTarget_(d);
    apprCheckScope_(ctx, str_(t.r[t.c.emp]), t.c.loc >= 0 ? t.r[t.c.loc] : '');
    if (t.get('hrSt') !== 'APPROVED') throw new Error('HR has not approved this application yet.');
    var cur = t.get('admSt');
    if (cur === 'APPROVED' || cur === 'REJECTED') throw new Error('Already ' + cur.toLowerCase() + (str_(t.r[t.c.admBy]) ? ' by ' + str_(t.r[t.c.admBy]) : '') + '.');
    var now = new Date(), note = str_(d.remarks);
    t.put('admBy', ctx.name); t.put('admTime', now);
    if (note) t.put('admRem', note + (str_(t.r[t.c.admRem]) ? ' | ' + str_(t.r[t.c.admRem]) : ''));
    if (dec === 'REJECTED') {
      if (!note) throw new Error('Write the reason for rejecting.');
      t.put('admSt', 'REJECTED'); t.put('admAmt', '');
      t.save('admSt', 'admRem'); t.stamp(['admTime']); t.tint(LA_RED);
      log_(ctx, 'Advance Admin REJECTED', d.sheet + ' row ' + t.row);
      return { message: 'Advance rejected — HR will see it and can re-send it.' };
    }
    var amt = parseInt(d.amount, 10) || num_(t.r[t.c.hrAmt]);
    if (amt <= 0) throw new Error('Enter the amount to approve.');
    t.put('admSt', 'APPROVED'); t.put('admAmt', amt);
    if (t.get('paySt') !== 'PAID') t.put('paySt', 'PENDING');
    t.save('admSt', 'paySt'); t.stamp(['admTime']); t.tint(LA_GREEN);
    log_(ctx, 'Advance Admin APPROVED', d.sheet + ' row ' + t.row + ' ₹' + amt);
    return { message: 'Approved ₹' + amt + ' — sent for payment.' };
  });
}

function apprAdvPay_(ctx, d) {
  var items = (d.items || []).filter(function (i) { return i && i.sheet && i.row; });
  if (!items.length) throw new Error('Tick at least one advance.');
  var sc = apprScope_(ctx);
  return lock_(function () {
    var done = [], skipped = [], now = new Date(), note = str_(d.remarks);
    items.forEach(function (it) {
      try {
        var t = laAdvTarget_(it), why = apprOutOfScope_(sc, str_(t.r[t.c.emp]), t.c.loc >= 0 ? t.r[t.c.loc] : '');
        if (why) { skipped.push((it.name || str_(t.r[t.c.name])) + ' (' + why + ')'); return; }
        if (t.get('admSt') !== 'APPROVED') { skipped.push(it.name + ' (not approved)'); return; }
        if (t.get('paySt') === 'PAID') { skipped.push(it.name + ' (already paid)'); return; }
        t.put('paySt', 'PAID'); t.put('payBy', ctx.name); t.put('payTime', now); if (note) t.put('payRem', note);
        t.save('paySt', 'payRem'); t.stamp(['payTime']); t.tint(LA_GREEN);
        done.push(str_(t.r[t.c.name]));
      } catch (e) { skipped.push((it.name || it.row) + ' (' + e.message + ')'); }
    });
    log_(ctx, 'Advance paid', done.join(', '));
    return { message: done.length + ' advance(s) marked paid.' + (skipped.length ? ' Skipped: ' + skipped.join(', ') : '') };
  });
}

function apprLeave_(ctx, d) {
  var dec = str_(d.decision).toUpperCase();
  if (dec !== 'APPROVED' && dec !== 'REJECTED') throw new Error('Pick Approve or Reject.');
  if (!/^Leave [A-Za-z]+ \d{4}$/.test(str_(d.sheet)) && d.sheet !== 'Leave Application') throw new Error('Unknown leave tab.');
  if (dec === 'REJECTED' && !str_(d.remarks)) throw new Error('Write the reason for rejecting.');
  if (d.change) return apprLeaveChange_(ctx, d, dec);
  var sh = laSS_().getSheetByName(d.sheet);
  if (!sh) throw new Error('Leave tab not found.');
  var res = lock_(function () {
    var R = laRead_(sh), c = leaveCols_(R.head), rowNum = Number(d.row), lc = sh.getLastColumn();
    if (!(rowNum >= R.first)) throw new Error('Invalid row.');
    var r = sh.getRange(rowNum, 1, 1, lc).getValues()[0];
    if (str_(r[c.emp]).toUpperCase() !== str_(d.empId).toUpperCase()) throw new Error('The sheet changed — please refresh.');
    apprCheckScope_(ctx, str_(r[c.emp]), '');
    var fin = str_(r[c.fin]).toUpperCase();
    if (fin === 'APPROVED' || fin === 'REJECTED') throw new Error('Already finalised (' + fin + ').');
    laDirty_(d.sheet);
    var l1 = c.l1 >= 0 ? str_(r[c.l1]).toUpperCase() : '';
    if (c.l1 >= 0 && (l1 === 'PENDING' || l1 === '') && setYes_('HR Can Decide For Incharge')) {     // HR decides the incharge step too
      sh.getRange(rowNum, c.l1 + 1).setValue(dec);
      if (c.l1By >= 0) sh.getRange(rowNum, c.l1By + 1).setValue(ctx.name + (dirIs_(ctx) ? ' (Director)' : ' (HR)'));
      if (c.l1Date >= 0) sh.getRange(rowNum, c.l1Date + 1).setValue(new Date()).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    }
    sh.getRange(rowNum, c.fin + 1).setValue(dec);
    if (c.finBy >= 0) sh.getRange(rowNum, c.finBy + 1).setValue(ctx.name);
    if (c.finDate >= 0) sh.getRange(rowNum, c.finDate + 1).setValue(new Date()).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    if (str_(d.remarks) && c.rem >= 0) sh.getRange(rowNum, c.rem + 1).setValue(str_(d.remarks));
    var rep = str_(d.replacementId);
    if (rep && dec === 'APPROVED' && c.rId >= 0) {
      var e = empById_(rep), me = empById_(str_(r[c.emp]));
      if (e && e.id.toUpperCase() !== str_(r[c.emp]).toUpperCase()) {
        sh.getRange(rowNum, c.rId + 1, 1, 4).setValues([[e.id, e.name, e.designation,
          (me && norm_(me.designation) === norm_(e.designation)) ? 'Same Designation' : 'Alternate Dept']]);
      }
    }
    try { sh.getRange(rowNum, 1, 1, Math.max(lc, 22)).setBackground(dec === 'APPROVED' ? LA_GREEN : LA_RED); } catch (e) {}
    log_(ctx, 'Leave final ' + dec, d.sheet + ' row ' + rowNum + ' ' + str_(r[c.name]));
    var rg = laLeaveRange_(r[c.from], r[c.to], r[c.days], r[c.ts], [r[c.l1Date], r[c.finDate]]);
    return { empId: str_(r[c.emp]), name: str_(r[c.name]), from: fmt_(rg.from), to: fmt_(rg.to || rg.from) };
  });
  var sms = laSms_(res.empId, res.name, res.from, res.to, dec === 'APPROVED');
  return { message: 'Leave ' + dec.toLowerCase() + ' — final decision recorded.' + (sms ? ' ' + sms : '') };
}

function apprLeaveChange_(ctx, d, dec) {
  if (!str_(d.remarks)) throw new Error('Write why the decision is changed.');
  var sh = laSS_().getSheetByName(d.sheet);
  if (!sh) throw new Error('Leave tab not found.');
  var res = lock_(function () {
    var R = laRead_(sh), c = leaveCols_(R.head), rowNum = Number(d.row), lc = sh.getLastColumn();
    if (!(rowNum >= R.first)) throw new Error('Invalid row.');
    var r = sh.getRange(rowNum, 1, 1, lc).getValues()[0];
    if (str_(r[c.emp]).toUpperCase() !== str_(d.empId).toUpperCase()) throw new Error('The sheet changed — please refresh.');
    apprCheckScope_(ctx, str_(r[c.emp]), '');
    var fin = str_(r[c.fin]).toUpperCase();
    if (fin !== 'APPROVED' && fin !== 'REJECTED') throw new Error('This leave is not decided yet — approve or reject it in Approvals.');
    if (fin === dec) throw new Error('It is already ' + dec.toLowerCase() + '.');
    laDirty_(d.sheet);
    var note = 'Changed from ' + fin.toLowerCase() + ' to ' + dec.toLowerCase() + ' by ' + ctx.name + ' on ' + fmt_(new Date(), 'dd/MM/yyyy') + ': ' + str_(d.remarks);
    sh.getRange(rowNum, c.fin + 1).setValue(dec);
    if (c.finBy >= 0) sh.getRange(rowNum, c.finBy + 1).setValue(ctx.name);
    if (c.finDate >= 0) sh.getRange(rowNum, c.finDate + 1).setValue(new Date()).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    if (c.rem >= 0) { var old = str_(r[c.rem]); sh.getRange(rowNum, c.rem + 1).setValue(old ? old + ' | ' + note : note); }
    try { sh.getRange(rowNum, 1, 1, Math.max(lc, 22)).setBackground(dec === 'APPROVED' ? LA_GREEN : LA_RED); } catch (e) {}
    log_(ctx, 'Leave decision changed', d.sheet + ' row ' + rowNum + ' ' + str_(r[c.name]) + ' · ' + fin + ' → ' + dec);
    return { name: str_(r[c.name]) };
  });
  try { bumpGen_('att'); } catch (e) {}
  return { message: res.name + '\'s leave is now ' + dec.toLowerCase() + '.' };
}

/** Same SMS as the Loan & Advance app (Traccar SMS Gateway) — only when a token is set. */
function laSms_(empId, name, fromD, toD, approved) {
  var token = set_('SMS Gateway Token', '') || PropertiesService.getScriptProperties().getProperty('SMS_GATEWAY_TOKEN') || '';
  if (!str_(token)) return '';
  var e = laEmp_(empId) || {}, phone = '+' + str_(e.phone || '').replace(/[^0-9]/g, '');
  if (phone.length < 8) return 'SMS not sent (no phone number).';
  if (phone.length === 11) phone = '+91' + phone.substring(1);
  var range = fromD + ((toD && toD !== fromD) ? (' se ' + toD + ' tak') : '');
  var msg = approved ? 'Namaste ' + (e.name || name) + ', aapki chhutti (' + range + ') SWIKRIT (Approved) ho gayi hai. - Chai Govindam'
    : 'Namaste ' + (e.name || name) + ', aapki chhutti (' + range + ') is baar ASWIKRIT (Rejected) hai. Kripya HR se sampark karein. - Chai Govindam';
  try {
    var res = UrlFetchApp.fetch(set_('SMS Gateway URL', 'https://www.traccar.org/sms/'), { method: 'post', contentType: 'application/json',
      headers: { Authorization: str_(token) }, payload: JSON.stringify({ to: phone, message: msg }), muteHttpExceptions: true });
    return res.getResponseCode() < 300 ? 'SMS sent to ' + phone + '.' : 'SMS failed (' + res.getResponseCode() + ').';
  } catch (x) { return 'SMS failed.'; }
}

function apprReimb_(ctx, d) {
  var dec = str_(d.decision).toUpperCase();
  if (dec !== 'APPROVED' && dec !== 'REJECTED') throw new Error('Pick Approve or Reject.');
  if (!/^Reimbursement [A-Za-z]+ \d{4}$/.test(str_(d.sheet)) && d.sheet !== 'Reimbursement') throw new Error('Unknown reimbursement tab.');
  if (dec === 'REJECTED' && !str_(d.remarks)) throw new Error('Write the reason for rejecting.');
  var sh = laSS_().getSheetByName(d.sheet);
  if (!sh) throw new Error('Reimbursement tab not found.');
  return lock_(function () {
    var R = laRead_(sh), c = laReimbCols_(R.head), rowNum = Number(d.row), lc = sh.getLastColumn();
    if (!(rowNum >= R.first)) throw new Error('Invalid row.');
    var r = sh.getRange(rowNum, 1, 1, lc).getValues()[0];
    if (str_(r[c.emp]).toUpperCase() !== str_(d.empId).toUpperCase()) throw new Error('The sheet changed — please refresh.');
    apprCheckScope_(ctx, str_(r[c.emp]), '', true);
    var cur = str_(r[c.status]).toUpperCase();
    if (cur !== 'PENDING' && cur !== '') throw new Error('This item was already ' + cur.toLowerCase() + '.');
    laDirty_(d.sheet);
    sh.getRange(rowNum, c.status + 1).setValue(dec);
    if (c.by >= 0) sh.getRange(rowNum, c.by + 1).setValue(ctx.name);
    if (c.at >= 0) sh.getRange(rowNum, c.at + 1).setValue(new Date()).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    if (str_(d.remarks) && c.rem >= 0) sh.getRange(rowNum, c.rem + 1).setValue(str_(d.remarks));
    try { sh.getRange(rowNum, 1, 1, Math.max(lc, 19)).setBackground(dec === 'APPROVED' ? LA_GREEN : LA_RED); } catch (e) {}
    log_(ctx, 'Reimbursement ' + dec, d.sheet + ' row ' + rowNum + ' ' + str_(r[c.name]));
    return { message: 'Reimbursement ' + dec.toLowerCase() + '.' };
  });
}

/** A reimbursement bill / document, opened through the app (approver, or the person who claimed it). */
function laFile_(ctx, d) {
  if (!/^Reimbursement [A-Za-z]+ \d{4}$/.test(str_(d.sheet)) && d.sheet !== 'Reimbursement') throw new Error('Unknown tab.');
  var sh = laSS_().getSheetByName(d.sheet); if (!sh) throw new Error('Tab not found.');
  var R = laRead_(sh), c = laReimbCols_(R.head), rowNum = Number(d.row);
  if (!(rowNum >= R.first)) throw new Error('Invalid row.');
  var r = sh.getRange(rowNum, 1, 1, sh.getLastColumn()).getValues()[0];
  var emp = str_(r[c.emp]).toUpperCase();
  if (emp !== str_(d.empId).toUpperCase()) throw new Error('The sheet changed — please refresh.');
  if (!can_(ctx, 'reimb_approve') && emp !== str_(ctx.empId).toUpperCase()) throw new Error('Not allowed.');
  var urls = d.which === 'doc' ? list_(str_(r[c.docs]).replace(/\n/g, ',')) : [str_(r[c.bill])];
  return emFileOut_(urls[Number(d.i) || 0], d.which === 'doc' ? 'Document' : 'Bill');
}

/* ============================ THE OLD PUBLIC FORM: CLOSE / OPEN ============================ */
/**
 * The old employee form lists every employee (with salary) and lets anyone apply for anyone. Its v3.1 has a
 * switch on its Settings tab: "Employee Form" = Closed shows only "Apply in CG One Login" (+ "One Login Link").
 * The approvers' old portal keeps working either way.
 */
function laFormSwitch_(open) {
  var sh = laSS_().getSheetByName('Settings');
  if (!sh) throw new Error('The Loan & Advance sheet has no Settings tab yet — deploy its v3.1 and run CG HR Forms ▸ Settings once.');
  return lock_(function () {
    var lr = sh.getLastRow(), vals = lr > 1 ? sh.getRange(2, 1, lr - 1, 2).getValues() : [];
    function put(k, v, note) {
      for (var i = 0; i < vals.length; i++) if (norm_(vals[i][0]) === norm_(k)) { sh.getRange(i + 2, 2).setValue(v); return; }
      sh.appendRow([k, v, note || '']); vals.push([k, v]);
    }
    var link = appUrl_() || '';
    put('Employee Form', open ? 'Open' : 'Closed', 'Open = the employee form works as now. Closed = it is switched off (no employee list, no new requests) and points people to CG One Login.');
    if (!open && link) put('One Login Link', link, 'The CG One Login web app link shown on the closed form.');
    return open ? 'The old Loan & Advance employee form is open again.'
      : 'The old Loan & Advance employee form is closed — it shows only "Apply in CG One Login"' + (link ? ' with this app\'s link.' : ' (open One Login once from its link so the button can carry it).') +
        ' The approvers\' old portal still works.';
  });
}

/* ============================ KEEP THE OLD FORM ROUTING RIGHT ============================ */
/**
 * Writes every Outlet Incharge of this app into the Loan & Advance "Admin Access" tab
 * (same login ID + password, Leave + Advance-Incharge = Yes, their outlet), so the
 * standalone form also sends that outlet's requests to them. Other rows are never touched.
 */
function laSyncAdminAccess_() {
  if (!setYes_('Sync Loan & Advance Admin Access')) return 'Loan & Advance Admin Access sync is off';
  var ss = laSS_(), sh = ss.getSheetByName('Admin Access');
  if (!sh) return 'Loan & Advance: no Admin Access tab';
  var lc = Math.max(sh.getLastColumn(), 13), H = sh.getRange(1, 1, 1, lc).getValues()[0].map(str_);
  var c = { name: col_(H, ['Name']), user: col_(H, ['Username']), pw: col_(H, ['Password']), role: col_(H, ['Role']),
    hr: col_(H, ['Advance - HR Verify']), adm: col_(H, ['Advance - Admin Approve']), acct: col_(H, ['Advance - Accountant']),
    reimb: col_(H, ['Reimbursement Access']), leave: col_(H, ['Leave Access']), sup: col_(H, ['Super Admin']), st: col_(H, ['Status']),
    inc: col_(H, ['Advance - Outlet Incharge']), locs: col_(H, ['Incharge Outlet(s)']) };
  if (c.user < 0 || c.inc < 0 || c.locs < 0) return 'Loan & Advance: Admin Access has no Outlet Incharge columns yet (open its admin portal once)';
  var lr = sh.getLastRow(), data = lr > 1 ? sh.getRange(2, 1, lr - 1, lc).getValues() : [];
  var byUser = {}; data.forEach(function (r, i) { var u = str_(r[c.user]).toLowerCase(); if (u) byUser[u] = i + 2; });
  var inc = laInchargeOutlets_(), logins = {};
  readObjs_(SH.LOGIN).forEach(function (r) { logins[str_(r['User ID'])] = r; });
  var added = 0, updated = 0;
  Object.keys(inc).forEach(function (oid) {
    var o = outletById_(oid);
    inc[oid].forEach(function (uid) {
      var L = logins[uid]; if (!L || !str_(L['Password'])) return;
      var login = str_(L['Login ID']) || uid, rowNum = byUser[login.toLowerCase()];
      if (rowNum) {
        var cur = sh.getRange(rowNum, 1, 1, lc).getValues()[0];
        var locs = list_(cur[c.locs]); if (!locs.some(function (t) { var x = outletByAny_(t); return x && x.id === oid; })) locs.push(o.location || o.name);
        cur[c.inc] = 'Yes'; cur[c.locs] = locs.join(', '); if (c.leave >= 0) cur[c.leave] = 'Yes'; if (c.st >= 0) cur[c.st] = 'Active';
        if (c.pw >= 0) cur[c.pw] = str_(L['Password']);
        sh.getRange(rowNum, 1, 1, lc).setValues([cur]); updated++;
      } else {
        var row = new Array(lc).fill('');
        row[c.name] = str_(L['Full Name']); row[c.user] = login; if (c.pw >= 0) row[c.pw] = str_(L['Password']); if (c.role >= 0) row[c.role] = 'Outlet Incharge';
        ['hr', 'adm', 'acct', 'reimb', 'sup'].forEach(function (k) { if (c[k] >= 0) row[c[k]] = 'No'; });
        if (c.leave >= 0) row[c.leave] = 'Yes'; if (c.st >= 0) row[c.st] = 'Active'; row[c.inc] = 'Yes'; row[c.locs] = o.location || o.name;
        sh.getRange(sh.getLastRow() + 1, 1, 1, lc).setValues([row]); byUser[login.toLowerCase()] = sh.getLastRow(); added++;
      }
    });
  });
  if (added || updated) { markDirty_('laadm'); if (!__M.inLock && !__M.inApi) flushDirty_(); }
  return 'Loan & Advance Admin Access: ' + added + ' incharge login(s) added, ' + updated + ' updated';
}
