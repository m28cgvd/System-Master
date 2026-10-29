/*************************************************************************
 *  Dashboard.gs — the page loads the dashboard in parts, all at once, so
 *  each card appears as soon as its own data is ready. Every part is cached
 *  for a minute per person + outlet. Which parts a person gets depends on
 *  their sections: staff see their own work and requests, the outlet
 *  incharge sees his outlet, HR / Accounts see their approval queues and
 *  the Director sees the whole company.
 *************************************************************************/

function dashLoad_(ctx, d) {
  // Speed: the page asks for every card it needs in ONE request (parts: [...]) instead of one request per card.
  if (d.parts && d.parts.length) {
    var all = {}, list = [].concat(d.parts).slice(0, 16), t0 = Number(d.t0) || Date.now(), lim = Number(d.budget) || 2500, pend = [];
    for (var i = 0; i < list.length; i++) {
      if ((i || d.cacheOnly) && Date.now() - t0 > lim) { pend = pend.concat(list.slice(i)); break; }   // cold caches: answer now, the page asks for the rest
      __M.missed = false; __M.cacheOnly = !!d.cacheOnly;
      try {
        var v = dashLoad_(ctx, { part: list[i], outletId: d.outletId, fresh: d.fresh });
        if (__M.missed) pend.push(list[i]); else all[list[i]] = v;
      } catch (e) {
        if (__M.missed) pend.push(list[i]); else all[list[i]] = { _error: e.message };
      } finally { __M.cacheOnly = false; __M.missed = false; }
    }
    if (pend.length) all._pending = pend;
    return all;
  }
  var part = str_(d.part);
  if (part === 'apps') return { count: appsMine_(ctx).apps.length };
  var outs = outletsFor_(ctx, d.outletId), ids = outs.map(function (o) { return o.id; });
  // one minute per person + outlet; any change made here (leave, advance, checklist, attendance …) shows at once
  var key = 'dash_' + part + '_' + ctx.uid + '_' + ids.join('.') + '_' + gen_('users') + '.' + gen_('la') + '.' + gen_('attd') + '.' + gen_('data') + (part === 'hr' ? '.' + gen_('empch') : '') +
    (part === 'checklist' ? '.' + Object.keys(ctx.chk || {}).map(function (id) { return gen_('chk_' + id); }).join('') : '') +
    (part === 'kitchen' ? '.' + gen_('prep') : '') + (part === 'tickets' ? '.' + gen_('tk') : '') + (part === 'cal' ? '.' + gen_('cal') + '.' + gen_('emps') + '.' + gen_('empx') : '') +
    (part === 'todo' ? '.' + gen_('tasks') + '.' + gen_('fms') + '.' + gen_('fmsd') + Object.keys(ctx.chk || {}).map(function (id) { return gen_('chk_' + id); }).join('') : '') +
    (part === 'hire' ? '.' + gen_('hire') + '.' + gen_('emps') : '') +
    (part === 'home' ? '.' + gen_('empch') + '.' + gen_('emps') + '.' + gen_('tasks') + '.' + gen_('tk') + Object.keys(ctx.chk || {}).map(function (id) { return gen_('chk_' + id); }).join('') : '');
  if (!d.fresh && !__M.fresh) { var hit = cacheGetJ_(key); if (hit) return hit; }
  var out;
  switch (part) {
    case 'home': out = dashHome_(ctx); break;
    case 'checklist': out = can_(ctx, 'checklist') ? chkPendingToday_(ctx) : null; break;
    case 'tasks': out = dashTasks_(ctx); break;
    case 'approvals': out = dashApprovals_(ctx, ids); break;
    case 'stock': out = dashStock_(ctx, d.outletId, ids); break;
    case 'people': out = dashPeople_(ctx, outs); break;
    case 'money': out = dashMoney_(ctx, outs); break;
    case 'kitchen': out = dashKitchen_(ctx, outs); break;
    case 'compliance': out = can_(ctx, 'certificates') ? dashCerts_(ctx, d.outletId) : null; break;
    case 'mine': out = dashMine_(ctx); break;
    case 'hr': out = dashHr_(ctx); break;
    case 'org': out = ctx.super || can_(ctx, 'employees') ? dashOrg_(ctx) : null; break;
    case 'tickets': out = can_(ctx, 'tickets') ? tkDash_(ctx) : null; break;
    case 'todo': out = dashTodo_(ctx); break;
    case 'hire': out = can_(ctx, 'hr_dashboard') ? hrdCards_(ctx) : null; break;
    case 'cal': out = dashCal_(ctx); break;
    default: throw new Error('Unknown dashboard part.');
  }
  if (!__M.missed) cachePutJ_(key, out, 60);
  return out;
}

/**
 * The cards a person's dashboard asks for — the same rules as the page (ViewsWork ▸ V.dashboard), so
 * sign-in can answer them in the same call.
 */
function dashPartsFor_(boot) {
  var menu = boot.menu || [], on = function (k) { return menu.some(function (m) { return m.key === k && !m.soon; }); };
  if (!on('dashboard') || (boot.perms && (boot.perms.director || boot.perms.dirUi))) return [];
  return ['home', 'todo'].concat(boot.perms && boot.perms.hire && on('hr_dashboard') ? ['hire'] : []).concat(['cal']);
}
/**
 * Speed: sign-in (and a resume with nothing kept on the device) brings the dashboard along — one call
 * instead of two. saved = the outlet the browser had picked; the page picks it the same way.
 * Whatever is not ready within the budget comes back as _pending and the page asks for it.
 */
function withDash_(ctx, boot, saved, budget) {
  try {
    if (!boot.menu.some(function (m) { return m.key === 'dashboard'; })) return boot;
    var ids = boot.outlets.map(function (o) { return o.id; }), sv = str_(saved);
    var outletId = sv && (ids.indexOf(sv) >= 0 || (sv === 'ALL' && ids.length > 1)) ? sv : (boot.home && ids.indexOf(boot.home) >= 0 ? boot.home : (ids[0] || ''));
    var parts = dashPartsFor_(boot);
    // only what the shared cache already holds, within the time left — the rest comes in the page's own request
    if (parts.length) boot.dash = { parts: parts, outletId: outletId, data: dashLoad_(ctx, { parts: parts, outletId: outletId, cacheOnly: true, t0: __M.t0, budget: budget || 1500 }) };
  } catch (e) {}
  return boot;
}

function dashTodo_(ctx) {
  var out = { checklist: null, tasks: null, fms: null, approve: null, errors: [] };
  if (can_(ctx, 'checklist')) {
    try {
      var P = chkPeriod_(), M = chkMyTasks_(ctx, {});
      out.checklist = M.tasks.filter(function (t) { return !t.done && t.mine !== false && chkInPeriod_(t, P); }).map(function (t) {
        return { chk: t.chk, chkName: t.chkName, row: t.row, id: t.id, task: t.task, freq: t.freq, planned: t.planned, plannedText: t.plannedText, time: t.time, given: !!t.given, by: t.by || '' };
      });
      if (M.errors.length) out.errors = out.errors.concat(M.errors);
    } catch (e) { out.errors.push('Checklist: ' + e.message); }
  }
  try {
    out.tasks = taskRows_().filter(function (r) { return str_(r['Assigned To']) === ctx.uid; }).map(taskObj_).filter(function (t) { return t.open || t.waiting; })
      .sort(function (a, b) { return (a.waiting - b.waiting) || String(a.due || '9').localeCompare(String(b.due || '9')); });
  } catch (e) { out.errors.push('Delegated tasks: ' + e.message); }
  try { out.fms = fmsMine_(ctx, {}); } catch (e) { out.errors.push('FMS: ' + e.message); }
  if (dlgIsApprover_(ctx)) {
    try { var A = taskApproveList_(ctx); out.approve = A.waiting.slice(0, 40); out.approveTotal = A.waiting.length; } catch (e) { out.errors.push('Approvals: ' + e.message); }
  }
  return out;
}

function dashTasks_(ctx) {
  var out = {};
  if (can_(ctx, 'tasks')) {
    var mine = readObjs_(SH.TASKS).filter(function (r) { return str_(r['Assigned To']) === ctx.uid; }).map(taskObj_);
    var open = mine.filter(function (t) { return OPEN_TASK_RE.test(t.status); });
    out.open = open.length; out.overdue = open.filter(function (t) { return t.overdue; }).length;
    out.next = open.sort(function (a, b) { return String(a.due || '9').localeCompare(String(b.due || '9')); }).slice(0, 3)
      .map(function (t) { return { id: t.id, title: t.title, due: t.dueText, overdue: t.overdue, by: t.byName }; });
    out.legacy = 0;
  }
  if (can_(ctx, 'delegate')) {
    var sent = readObjs_(SH.TASKS).filter(function (r) { return str_(r['Assigned By']) === ctx.uid; }).map(taskObj_);
    out.sentOpen = sent.filter(function (t) { return OPEN_TASK_RE.test(t.status); }).length;
    out.toVerify = sent.filter(function (t) { return t.waiting; }).length;
  }
  return out;
}

function dashApprovals_(ctx, ids) {
  var out = {};
  if (!ids.length) return out;
  if (can_(ctx, 'advance')) {
    try { out.advance = advRows_(ctx, ids, setNum_('Advance Scan Months', 3)).filter(function (x) { return advOpenForIncharge_(x, ctx); }).length; }
    catch (e) { out.advanceError = e.message; }
  }
  if (can_(ctx, 'leave') || can_(ctx, 'attendance')) {
    try {
      var lv = leaveRows_(ctx, ids, 2), today = todayIso_();
      if (can_(ctx, 'leave')) out.leave = lv.filter(function (x) { return leaveOpenForIncharge_(x, ctx); }).length;
      var seen = {};
      out.onLeaveToday = lv.filter(function (x) {
        var k = x.empId.toUpperCase();
        if (x.final !== 'APPROVED' || !x.fromKey || x.fromKey > today || (x.toKey || x.fromKey) < today || seen[k]) return false;
        return (seen[k] = true);
      }).map(function (x) { return x.name + (x.toKey && x.toKey !== x.fromKey ? ' (till ' + x.to.substring(0, 5) + ')' : ''); });
    } catch (e) { out.leaveError = e.message; }
  }
  return out;
}

/** My own requests (leave · advance · reimbursement) — what is still open and the latest decisions. */
function dashMine_(ctx) {
  if (!can_(ctx, 'my_requests') || !ctx.empId) return null;
  var m = reqMine_(ctx), open = 0, latest = [];
  m.advances.forEach(function (a) { if (!/PAID|REJECTED/.test(a.stage)) open++; latest.push({ kind: 'Advance', text: '₹' + (a.amount || a.requested), status: a.stageText, when: a.applied }); });
  m.leaves.forEach(function (l) { if (l.final !== 'APPROVED' && l.final !== 'REJECTED' && l.l1 !== 'REJECTED') open++; latest.push({ kind: 'Leave', text: l.from + (l.to !== l.from ? ' – ' + l.to : ''), status: l.stageText, when: l.applied }); });
  m.reimbursements.forEach(function (r) { if (r.status === 'PENDING') open++; latest.push({ kind: 'Reimbursement', text: '₹' + r.amount + ' · ' + r.category, status: r.status, when: r.applied }); });
  latest.sort(function (a, b) { return (parseAny_(b.when) || 0) - (parseAny_(a.when) || 0); });
  return { open: open, latest: latest.slice(0, 4), errors: m.errors };
}

/** HR / Director / Accounts: what is waiting at their approval steps, joinings, last attendance upload. */
function dashHr_(ctx) {
  var out = {};
  if (can_(ctx, 'approvals')) {
    try {
      var a = apprLoad_(ctx);
      out.approvals = { hr: a.advance.hr.length, admin: a.advance.admin.length, pay: a.advance.pay.length, leave: a.leave.length, reimb: a.reimb.length,
        total: (a.can.hr ? a.advance.hr.length : 0) + (a.can.admin ? a.advance.admin.length : 0) + (a.can.pay ? a.advance.pay.length : 0) +
          (a.can.leave ? a.leave.length : 0) + (a.can.reimb ? a.reimb.length : 0), can: a.can };
    } catch (e) { out.approvalsError = e.message; }
  }
  if (can_(ctx, 'employees')) {
    try { var s = empStats_(ctx); out.people = { active: s.active, pending: s.pending, joiners: s.joiners, noDocs: s.noDocs }; } catch (e) { out.peopleError = e.message; }
    try { if (emApprover_(ctx)) out.empChanges = empChanges_(ctx).pending; } catch (e) {}
  }
  if (can_(ctx, 'hr_attendance')) {
    try { var dts = atDates_(); out.attendance = { last: dts.length ? dts[0].label + ' · ' + dts[0].day : '', lastKey: dts.length ? dts[0].key : '', days: dts.length }; }
    catch (e) { out.attendanceError = e.message; }
  }
  return out;
}

/** Director: the whole company at a glance. */
function dashOrg_(ctx) {
  var out = { byLocation: [], checklists: [], logins: 0 };
  var by = {};
  employees_().forEach(function (e) { if (/inactive|left/i.test(e.status)) return; var o = outletById_(e.outletId); var k = o ? o.name : (e.location || 'Other'); by[k] = (by[k] || 0) + 1; });
  out.byLocation = Object.keys(by).map(function (k) { return { name: k, count: by[k] }; }).sort(function (a, b) { return b.count - a.count; });
  out.headcount = out.byLocation.reduce(function (s, x) { return s + x.count; }, 0);
  try {
    var ov = chkOverview_(ctx, { date: todayIso_() });
    out.checklists = ov.list.map(function (c) { return { id: c.id, name: c.name, outlet: c.outlet, total: c.total, done: c.done, pending: c.pending, error: c.error || '' }; });
  } catch (e) { out.checklistError = e.message; }
  var since = Date.now() - 86400000;
  readObjs_(SH.SESSIONS).forEach(function (r) { var t = parseAny_(r['Created At']); if (t && t.getTime() >= since) out.logins++; });
  return out;
}

function dashStock_(ctx, outletId, ids) {
  var out = {};
  if (can_(ctx, 'grn') || can_(ctx, 'orders')) {
    try {
      var h = ordHistory_(ctx, { outletId: outletId }).orders;
      var cut = iso_(addDays_(new Date(), -15));
      out.grnPending = h.filter(function (o) { return !o.grn && !/rejected/i.test(o.status) && o.date >= cut; }).length;
      out.lastOrder = h[0] ? { no: h[0].no, status: h[0].status, date: fmt_(isoToDate_(h[0].date)), grn: h[0].grn } : null;
    } catch (e) { out.orderError = e.message; }
    try { out.vegPending = vegGroups_(ctx, outletId).filter(function (g) { return g.pending > 0; }).length; } catch (e) {}
    var today = todayIso_(), n = 0, amt = 0;
    readObjs_(SH.STOCK_REG).forEach(function (r) {
      if (ids.indexOf(str_(r['Outlet ID'])) >= 0 && iso_(r['Date']) === today) { n++; amt += num_(r['Amount']); }
    });
    out.billsToday = n; out.billsTodayAmount = round_(amt, 2);
  }
  return out;
}

function dashPeople_(ctx, outs) {
  var out = {};
  if (!(can_(ctx, 'attendance') || can_(ctx, 'roster') || can_(ctx, 'leave'))) return out;
  var staff = 0; outs.forEach(function (o) { staff += empsOfOutlet_(o.id).length; });
  out.staff = staff;
  if (can_(ctx, 'roster')) {
    var wk = iso_(mondayOf_(new Date())), set = {};
    readObjs_(SH.ROSTER).forEach(function (r) { if (iso_(r['Week Start']) === wk) set[str_(r['Outlet ID'])] = 1; });
    out.rosterMissing = outs.filter(function (o) { return o.type === 'Outlet' && !set[o.id]; }).map(function (o) { return o.name; });
    out.rosterWeek = fmt_(mondayOf_(new Date()), 'dd MMM');
  }
  return out;
}

function dashMoney_(ctx, outs) {
  var out = {};
  if (can_(ctx, 'dsr')) {
    var y = iso_(addDays_(new Date(), -1)), done = [], missing = [], total = 0;
    var dk = 'dash_dsr_' + y + '_' + outs.map(function (o) { return o.id; }).join('.') + '_' + gen_('dsr') + '.' + gen_('data'), dh = __M.fresh ? null : cacheGetJ_(dk);
    if (dh) out.dsr = dh;
    else outs.filter(function (o) { return o.dsrTab; }).forEach(function (o) {
      try {
        var sh = dsrSheet_(o), lc = sh.getLastColumn(), lr = sh.getLastRow();
        if (lr < 2) { missing.push(o.name); return; }
        var H = sh.getRange(1, 1, 1, lc).getValues()[0].map(str_), di = col_(H, ['Date']), ti = H.indexOf('Total Sales');
        var rows = sh.getRange(2, 1, Math.min(lr - 1, 5), lc).getValues(), hit = null;
        rows.forEach(function (r) { if (!hit && dsrKey_(r[di]) === y) hit = r; });
        if (hit) { done.push(o.name); total += ti >= 0 ? num_(hit[ti]) : 0; } else missing.push(o.name);
      } catch (e) { missing.push(o.name); }
    });
    if (!dh) { out.dsr = { date: fmt_(isoToDate_(y)), done: done, missing: missing, total: round_(total, 2) }; cachePutJ_(dk, out.dsr, 300); }
  }
  if (can_(ctx, 'expenses')) {
    var ids = outs.map(function (o) { return o.id; }), m = fmt_(new Date(), 'yyyy-MM'), t = 0, c = 0;
    readObjs_(SH.EXPENSES).forEach(function (r) {
      if (ids.indexOf(str_(r['Outlet ID'])) >= 0 && fmt_(r['Date'], 'yyyy-MM') === m && !/deleted/i.test(str_(r['Status']))) { t += num_(r['Amount']); c++; }
    });
    out.expenses = { month: fmt_(new Date(), 'MMMM'), total: round_(t, 2), count: c };
  }
  return out;
}

function dashKitchen_(ctx, outs) {
  var out = {};
  if (can_(ctx, 'production')) {
    try {
      var p = prodReport_(ctx, { from: todayIso_(), to: todayIso_() });
      if (p.linked) out.production = { batches: p.totals.batches, open: p.totals.open, dishes: p.totals.dishes,
        top: p.dishes.slice(0, 3).map(function (x) { return x.dish + ' ×' + x.count; }) };
    } catch (e) { out.productionError = e.message; }
  }
  if (can_(ctx, 'closing')) {
    var ids = outs.map(function (o) { return o.id; }), t = todayIso_(), y = iso_(addDays_(new Date(), -1)), got = {};
    readObjs_(SH.FOOD_CLOSE).forEach(function (r) {
      var k = iso_(r['Date']);
      if (ids.indexOf(str_(r['Outlet ID'])) >= 0 && (k === t || k === y)) got[k + '|' + str_(r['Shift'])] = 1;
    });
    out.closing = { today: CLOSING_SHIFTS.filter(function (s) { return got[t + '|' + s]; }),
      yesterday: CLOSING_SHIFTS.filter(function (s) { return got[y + '|' + s]; }) };
  }
  return out;
}

function dashCerts_(ctx, outletId) {
  var rows = certList_(ctx, { outletId: outletId }).rows;
  return { total: rows.length, expired: rows.filter(function (r) { return r.status === 'Expired'; }).length,
    expiring: rows.filter(function (r) { return r.status === 'Expiring Soon'; }).length,
    soon: rows.filter(function (r) { return r.status !== 'Valid' && r.status !== 'No Expiry'; }).slice(0, 4)
      .map(function (r) { return { name: r.name, status: r.status, expiry: r.expiryText, outlet: r.outlet }; }) };
}

function calWide_(ctx) { var r = norm_(ctx.role); return !!(ctx.super || r === 'director' || r === 'misadmin' || can_(ctx, 'employees') || can_(ctx, 'payroll') || can_(ctx, 'hr_attendance')); }
function calCanEdit_(ctx) { var r = norm_(ctx.role); return !!(ctx.super || r === 'director' || r === 'misadmin' || can_(ctx, 'settings')); }
function calDay_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return { y: v.getFullYear(), m: v.getMonth() + 1, d: v.getDate() };
  var s = str_(v), m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/.exec(s);
  if (m) return { y: Number(m[3].length === 2 ? '19' + m[3] : m[3]), m: Number(m[2]), d: Number(m[1]) };
  return null;
}
function calHolidays_() {
  return readObjs_(SH.HOLIDAYS).map(function (r) {
    var x = calDay_(r['Date']), nm = str_(r['Holiday']);
    if (!x || !nm) return null;
    return { id: str_(r['Holiday ID']), key: x.y + '-' + pad_(x.m, 2) + '-' + pad_(x.d, 2), name: nm, every: !/^no$/i.test(str_(r['Every Year'])), by: str_(r['Added By']) };
  }).filter(Boolean).sort(function (a, b) { return a.key < b.key ? -1 : 1; });
}
function calBirthdays_(ctx) {
  var M = emRead_(emMasterName_()), wide = calWide_(ctx), mine = ctx.outlets || [], out = [];
  if (!M.sh || emIdx_(M.head, 'Date of Birth') < 0) return out;
  emActiveRows_(M).forEach(function (r) {
    var loc = emVal_(M.head, r.vals, 'Location'), o = outletByAny_(loc), b = calDay_(r.vals[emIdx_(M.head, 'Date of Birth')]);
    if (!o || !outletRun_(o) || !b || !(b.m >= 1 && b.m <= 12 && b.d >= 1 && b.d <= 31)) return;
    if (!wide && mine.indexOf(o.id) < 0) return;
    out.push({ md: pad_(b.m, 2) + '-' + pad_(b.d, 2), name: emVal_(M.head, r.vals, 'Name'), id: emVal_(M.head, r.vals, 'Employee Id'),
      designation: emVal_(M.head, r.vals, 'Designation'), location: o.name });
  });
  return out.sort(function (a, b) { return a.md === b.md ? a.name.localeCompare(b.name) : (a.md < b.md ? -1 : 1); });
}
function dashCal_(ctx) {
  var out = { today: todayIso_(), holidays: [], birthdays: [], canEdit: calCanEdit_(ctx), errors: [] };
  try { out.holidays = calHolidays_(); } catch (e) { out.errors.push('Holidays: ' + e.message); }
  try { out.birthdays = calBirthdays_(ctx); } catch (e) { out.errors.push('Birthdays: ' + e.message); }
  return out;
}
function calSave_(ctx, d) {
  if (!calCanEdit_(ctx)) throw new Error('Only an admin can change the holidays.');
  var key = str_(d.date), nm = str_(d.name);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error('Pick the date.');
  if (!nm) throw new Error('Write the holiday name.');
  var dt = isoToDate_(key), every = d.every === false || d.every === 'No' ? 'No' : 'Yes';
  return lock_(function () {
    var rows = readObjs_(SH.HOLIDAYS), id = str_(d.id), hit = null, n = 0;
    rows.forEach(function (r) {
      if (id && str_(r['Holiday ID']) === id) hit = r;
      var m = /^HOL-(\d+)$/.exec(str_(r['Holiday ID'])); if (m) n = Math.max(n, Number(m[1]));
      if (!id && calKey_(r['Date']) === key && norm_(r['Holiday']) === norm_(nm)) throw new Error(nm + ' is already on ' + fmt_(dt, 'dd/MM/yyyy') + '.');
    });
    var patch = { 'Date': dt, 'Day': fmt_(dt, 'EEEE'), 'Holiday': nm, 'Every Year': every, 'Added By': ctx.name, 'Added At': new Date() };
    if (hit) updateObj_(SH.HOLIDAYS, hit._row, patch);
    else { patch['Holiday ID'] = 'HOL-' + pad_(n + 1, 3); appendObj_(SH.HOLIDAYS, patch); }
    bumpGen_('cal');
    log_(ctx, 'Holiday', nm + ' · ' + key);
    return { message: nm + ' saved for ' + fmt_(dt, 'EEE dd MMM yyyy') + '.' };
  });
}
function calKey_(v) { var x = calDay_(v); return x ? x.y + '-' + pad_(x.m, 2) + '-' + pad_(x.d, 2) : ''; }
function calRemove_(ctx, d) {
  if (!calCanEdit_(ctx)) throw new Error('Only an admin can change the holidays.');
  return lock_(function () {
    var t = readObjs_(SH.HOLIDAYS).filter(function (r) { return str_(r['Holiday ID']) === str_(d.id); })[0];
    if (!t) throw new Error('That holiday was not found — refresh.');
    deleteRows_(SH.HOLIDAYS, [t._row]);
    bumpGen_('cal');
    log_(ctx, 'Holiday removed', str_(t['Holiday']) + ' · ' + calKey_(t['Date']));
    return { message: str_(t['Holiday']) + ' removed.' };
  });
}
