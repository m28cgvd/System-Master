/*************************************************************************
 *  HRDash.gs — the HR Dashboard (and the Attendance Manager's overview).
 *
 *  Every figure appears once:
 *    Headcount      employee master — Bhanpuri (HQ) · Bhanpuri (GFP) ·
 *                   Pandri · Chanderi (the places attendance is kept for)
 *                   and the other outlets
 *    Attendance     one row per place for the chosen day: present · half
 *                   day · punch missed · approved leave · week off ·
 *                   unapproved leave · other absent · late · not in file
 *    Penalties      the day and the month, split by penalty basis, per day
 *                   and per employee
 *    Unapproved     absent in the Petpooja upload + no APPROVED leave in the
 *    leave          Loan & Advance sheet → Penalty Rules ▸ UNAPPROVED_LEAVE
 *    Overtime       Location Rules ▸ Standard Hours / OT After Extra Hours /
 *                   OT Rate — paid only from standard + 2 h (12 h at Pandri)
 *    Hiring         FMS Hiring: indents, indent → offer letter, onboarding
 *    Calling        HR Calling Record
 *  The attendance part comes from the same engine as the reports and the
 *  salary preparation (Attendance.gs), so the numbers always agree.
 *************************************************************************/

/** The places attendance is kept for (Location Rules, in order: Head Office first, then the outlets). */
function hrdPlaces_(dir) {
  var out = [];
  Object.keys(dir.rules.byLocation).forEach(function (k) {
    var r = dir.rules.byLocation[k], o = outletByAny_(r.location);
    out.push({ key: k, location: r.location, name: o ? o.name : r.location, outletId: o ? o.id : '', order: o ? (o.type === 'Outlet' ? 2 : 1) + o.id : '3' + r.location,
      group: r.groupName, penalty: r.applyPenalty, ot: r.ot, stdHours: r.stdHours, otAfter: r.otAfter, otRate: r.otRate, fullDay: r.fullDayHours });
  });
  return out.sort(function (a, b) { return a.order < b.order ? -1 : 1; });
}

/* ============================ ATTENDANCE · PENALTIES · LEAVE · OVERTIME ============================ */
function hrdAtt_(ctx, d) {
  var dates = atDates_(), out = { dates: dates.slice(0, 62).map(function (x) { return { key: x.key, label: x.label, day: x.day }; }) };
  var date = str_(d.date);
  if (!dates.some(function (x) { return x.key === date; })) date = dates.length ? dates[0].key : '';
  var key = 'hrd_att_v2_' + gen_('att') + '.' + gen_('attd') + '.' + gen_('la') + '.' + gen_('data') + '.' + gen_('emps') + '_' + (date || 'none');
  if (!d.force && !__M.fresh) { var hit = cacheGetJ_(key); if (hit) return hit; }
  var dir = atDirectory_(false), places = hrdPlaces_(dir), byLoc = {};
  places.forEach(function (p) { byLoc[p.key] = p; });

  // ---- headcount: every active person of the employee master ----
  var other = {}, total = 0;
  places.forEach(function (p) { p.staff = 0; });
  atMaster_(false).forEach(function (m) {
    total++;
    var rr = atRuleOf_(dir.rules, m.location), p = rr ? byLoc[rr.location.toLowerCase()] : null;
    if (p) { p.staff++; return; }
    var o = outletByAny_(m.location), nm = o ? o.name : (m.location || 'No location');
    other[nm] = (other[nm] || 0) + 1;
  });
  out.headcount = { total: total, places: places.map(function (p) { return { name: p.name, count: p.staff, tracked: true }; }),
    other: Object.keys(other).sort().map(function (k) { return { name: k, count: other[k] }; }) };
  out.headcount.otherTotal = out.headcount.other.reduce(function (s, x) { return s + x.count; }, 0);
  if (!date) { out.empty = true; return out; }

  out.date = date; out.dateText = atDateOut_(atKeyDate_(date)); out.day = atDayName_(atKeyDate_(date));
  var from = date.substring(0, 8) + '01', b = atBuild_(from, date, null, false);
  out.monthFrom = from; out.monthText = fmt_(atKeyDate_(date), 'MMMM yyyy') + ' (1–' + Number(date.substring(8)) + ')';
  var placeAt = function (loc) { var rr = atRuleOf_(dir.rules, loc); return rr ? byLoc[rr.location.toLowerCase()] : null; };
  var placeOf = function (r) { var p = placeAt(r.location); return p ? p.name : (r.groupName || '—'); };

  // ---- attendance of the day, per place ----
  var rowsByPlace = {};
  places.forEach(function (p) { rowsByPlace[p.name] = { name: p.name, staff: p.staff, inFile: 0, present: 0, full: 0, half: 0, missed: 0, approved: 0, weekOff: 0, unapproved: 0, absentOther: 0, late: 0, ot: 0, listed: 0 }; });
  var day = b.rows.filter(function (r) { return r.dateKey === date; });
  day.forEach(function (r) {
    var x = rowsByPlace[placeOf(r)]; if (!x) return;
    x.listed++;
    if (!r.synthetic) x.inFile++;
    if (r.status === AT_FULL) { x.full++; x.present++; } else if (r.status === AT_HALF) { x.half++; x.present++; } else if (atMissed_(r.status)) { x.missed++; x.present++; }
    else if (r.leaveState === 'approved') x.approved++; else if (r.leaveState === 'weekoff') x.weekOff++; else if (r.unapproved) x.unapproved++; else x.absentOther++;
    if (r.lateInMin > 0) x.late++;
    if (r.otAmount > 0) x.ot++;
  });
  out.places = places.map(function (p) { var x = rowsByPlace[p.name]; x.uploaded = x.inFile > 0; x.notInFile = Math.max(0, x.staff - x.listed); return x; });
  var sum = function (k) { return out.places.reduce(function (s, x) { return s + x[k]; }, 0); };
  out.present = sum('present');

  // ---- penalties: lines split by basis ----
  var basis = function (rows) {
    var by = {}, amount = 0, people = 0, count = 0;
    rows.forEach(function (r) {
      if (!(r.penaltyAmount > 0)) return;
      amount += r.penaltyAmount; people++;
      (r.penaltyLines || []).forEach(function (l) {
        if (!(l.amount > 0)) return;
        var k = l.label || PEN_TYPES[l.type] || l.type, x = by[k] = by[k] || { label: k, type: l.manual ? 'MANUAL' : l.type, count: 0, amount: 0 };
        x.count++; x.amount += l.amount; count++;
      });
    });
    return { amount: round_(amount, 2), people: people, count: count, byType: Object.keys(by).map(function (k) { by[k].amount = round_(by[k].amount, 2); return by[k]; }).sort(function (a, c) { return c.amount - a.amount; }) };
  };
  out.penDay = basis(day);
  out.penMonth = basis(b.rows);
  var perDay = {};
  b.rows.forEach(function (r) {
    var x = perDay[r.dateKey] = perDay[r.dateKey] || { date: r.dateKey, label: fmt_(atKeyDate_(r.dateKey), 'EEE dd MMM'), people: 0, count: 0, amount: 0, unapproved: 0, ot: 0 };
    if (r.penaltyAmount > 0) { x.people++; x.amount += r.penaltyAmount; x.count += (r.penaltyLines || []).filter(function (l) { return l.amount > 0; }).length; }
    if (r.unapproved) x.unapproved++;
    x.ot += r.otAmount || 0;
  });
  out.days = Object.keys(perDay).sort().reverse().map(function (k) { var x = perDay[k]; x.amount = round_(x.amount, 2); x.ot = round_(x.ot, 2); return x; });

  // ---- per employee (month) ----
  var emp = {};
  b.rows.forEach(function (r) {
    if (!(r.penaltyAmount > 0) && !r.unapproved && !(r.otAmount > 0)) return;
    var k = r.employeeId + '|' + r.name, x = emp[k] = emp[k] || { id: r.employeeId, name: r.name, designation: r.designation, place: placeOf(r), pen: 0, penDays: 0, types: {}, lines: [],
      unapproved: 0, uDates: [], otH: 0, ot: 0, otDays: 0 };
    var dl = fmt_(atKeyDate_(r.dateKey), 'dd MMM');
    if (r.penaltyAmount > 0) {
      x.pen += r.penaltyAmount; x.penDays++;
      (r.penaltyLines || []).forEach(function (l) { if (!(l.amount > 0)) return; var t = l.label || l.type; x.types[t] = round_((x.types[t] || 0) + l.amount, 2); });
      x.lines.push({ d: dl, t: r.penaltyText || 'Penalty', a: r.penaltyAmount });
    }
    if (r.unapproved) { x.unapproved++; x.uDates.push(dl); }
    if (r.otAmount > 0) { x.otH += r.otHours; x.ot += r.otAmount; x.otDays++; }
  });
  var emps = Object.keys(emp).map(function (k) { var x = emp[k]; x.pen = round_(x.pen, 2); x.ot = round_(x.ot, 2); x.otH = round_(x.otH, 2); return x; });
  out.penEmployees = emps.filter(function (x) { return x.pen > 0; }).sort(function (a, c) { return c.pen - a.pen; })
    .map(function (x) { return { id: x.id, name: x.name, designation: x.designation, place: x.place, amount: x.pen, days: x.penDays, types: x.types, lines: x.lines }; });

  // ---- unapproved leave ----
  var unLine = function (r) { var l = (r.penaltyLines || []).filter(function (z) { return z.type === 'UNAPPROVED_LEAVE'; })[0]; return l ? l.amount : 0; };
  out.unDay = day.filter(function (r) { return r.unapproved; }).map(function (r) { return { id: r.employeeId, name: r.name, designation: r.designation, place: placeOf(r), why: r.leaveText, amount: unLine(r) }; });
  out.leaveDay = day.filter(function (r) { return r.leaveState === 'approved' || r.leaveState === 'weekoff' || (r.leaveState === 'pending' && !r.unapproved); })
    .map(function (r) { return { name: r.name, place: placeOf(r), why: r.leaveText }; });
  var unMonth = b.rows.filter(function (r) { return r.unapproved; });
  out.unMonth = { count: unMonth.length, amount: round_(unMonth.reduce(function (s, r) { return s + unLine(r); }, 0), 2),
    people: emps.filter(function (x) { return x.unapproved > 0; }).sort(function (a, c) { return c.unapproved - a.unapproved; })
      .map(function (x) { return { name: x.name, place: x.place, days: x.unapproved, dates: x.uDates }; }) };

  // ---- overtime ----
  out.otDay = day.filter(function (r) { return r.otAmount > 0; }).map(function (r) {
    var p = placeAt(r.location);
    return { name: r.name, designation: r.designation, place: placeOf(r), worked: r.workedText, std: p ? p.stdHours : '', hours: r.otHours, rate: r.otRate, amount: r.otAmount };
  }).sort(function (a, c) { return c.amount - a.amount; });
  out.otMonth = { hours: round_(b.rows.reduce(function (s, r) { return s + (r.otHours || 0); }, 0), 2), amount: round_(b.rows.reduce(function (s, r) { return s + (r.otAmount || 0); }, 0), 2),
    people: emps.filter(function (x) { return x.ot > 0; }).sort(function (a, c) { return c.ot - a.ot; }).map(function (x) { return { name: x.name, place: x.place, days: x.otDays, hours: x.otH, amount: x.ot }; }) };

  // ---- the rules in force (shown under the figures) ----
  var unRules = atPenRules_().filter(function (r) { return r.type === 'UNAPPROVED_LEAVE'; });
  out.rules = { places: places.map(function (p) {
      var u = unRules.filter(function (r) { return !r.groupKey || r.groupKey === (dir.rules.byLocation[p.key] || {}).groupKey; })[0];
      return { name: p.name, penalty: p.penalty, fullDay: p.fullDay, ot: p.ot, stdHours: p.stdHours, otFrom: round_((p.stdHours || 0) + (p.otAfter || 0), 2), otRate: p.otRate, unapproved: u ? u.amount : 0 };
    }), otRoundUp: atCfgNum_('OT_ROUND_UP_MINUTES', 30), monthDays: atCfgNum_('MONTH_DAYS_FOR_DAILY_SALARY', 30),
    pendingCounts: atCfgYes_('PENDING_LEAVE_IS_UNAPPROVED', true), chargeFrom: (function () { var k = atKey_(atCfg_('UNAPPROVED_LEAVE_CHARGE_FROM', '')); return k ? fmt_(atKeyDate_(k), 'dd MMM yyyy') : ''; })(), weekOff: atCfgYes_('WEEK_OFF_FROM_ROSTER', true), leaveCheck: atCfgYes_('UNAPPROVED_LEAVE_CHECK', true) };
  out.canConfig = can_(ctx, 'att_config');
  out.unmatched = b.unmatched.filter(function (u) { return atKey_(u.date) === date || u.date === out.dateText; }).length;
  cachePutJ_(key, out, 300);
  return out;
}

/* ============================ HIRING (FMS Hiring workbook) ============================ */
function hrdCol_(H, words) {
  var L = H.map(function (h) { return str_(h).split('\n')[0].toLowerCase(); });
  for (var i = 0; i < words.length; i++) for (var j = 0; j < L.length; j++) if (L[j].indexOf(words[i]) === 0) return j;
  for (var k = 0; k < words.length; k++) for (var m = 0; m < L.length; m++) if (L[m].indexOf(words[k]) >= 0) return m;
  return -1;
}
function hrdCount_(list, keyFn, max) {
  var by = {};
  list.forEach(function (x) { var k = str_(keyFn(x)) || '—'; by[k] = (by[k] || 0) + 1; });
  return Object.keys(by).map(function (k) { return { name: k, count: by[k] }; }).sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name); }).slice(0, max || 12);
}
function hrdPlace_(v) { var t = str_(v).replace(/^\d{3}\s*-\s*/, ''), o = outletByAny_(t); return o ? o.name : t; }
function hrdPos_(v) { return str_(v).replace(/\s*\([^)]*\)\s*$/, '').trim(); }
function hrdHire_(ctx, d) {
  var key = 'hrd_hire_v4_' + gen_('hire') + '.' + gen_('emps') + '_' + Math.floor(Date.now() / (fmsMin_() * 60000));
  if (!d.force && !__M.fresh) { var hit = cacheGetJ_(key); if (hit) return hit; }
  var out = { at: fmt_(new Date(), 'dd/MM/yyyy hh:mm a') }, id = setRaw_('Hiring FMS Sheet ID');
  var now = new Date(), monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  try {
    if (!id) throw new Error('Settings ▸ Hiring FMS Sheet ID is empty.');
    // 1. indents
    try {
      var V = fmsValues_(id, set_('Hiring Indent Tab', 'HR Indent Response V1')), H = V.values[0] || [];
      var c = { ts: hrdCol_(H, ['timestamp']), loc: hrdCol_(H, ['branch']), by: hrdCol_(H, ['requested by']), pos: hrdCol_(H, ['position']),
        type: hrdCol_(H, ['employment type']), reason: hrdCol_(H, ['reason']), join: hrdCol_(H, ['expected joining']), budget: hrdCol_(H, ['monthly budget']) };
      var list = V.values.slice(1).filter(function (r) { return c.pos >= 0 && str_(r[c.pos]); }).map(function (r) {
        var ts = fmsDate_(r[c.ts]);
        return { t: ts ? ts.getTime() : 0, place: hrdPlace_(r[c.loc]), by: str_(r[c.by]), pos: hrdPos_(r[c.pos]), type: c.type >= 0 ? str_(r[c.type]) : '',
          reason: c.reason >= 0 ? str_(r[c.reason]) : '', join: c.join >= 0 ? fmsDate_(r[c.join]) : null, budget: c.budget >= 0 ? num_(r[c.budget]) : 0 };
      });
      out.url = V.url;
      out.indents = { total: list.length, month: list.filter(function (x) { return x.t >= monthStart; }).length,
        byPlace: hrdCount_(list, function (x) { return x.place; }), byPos: hrdCount_(list, function (x) { return x.pos; }, 8),
        byReason: hrdCount_(list, function (x) { return x.reason; }, 5),
        latest: list.sort(function (a, b) { return b.t - a.t; }).slice(0, 6).map(function (x) {
          return { when: x.t ? fmt_(new Date(x.t), 'dd MMM') : '', place: x.place, pos: x.pos, by: x.by, reason: x.reason, join: x.join ? fmt_(x.join, 'dd MMM') : '', budget: x.budget }; }) };
    } catch (e) { out.indents = { error: e.message }; }
    // 2. indent → offer letter FMS (open / closed + where each open indent stands)
    try {
      var V2 = fmsValues_(id, set_('Hiring Indent FMS Tab', 'FMS-Indent to Offer Letter Sent')), P = fmsParse_(V2.values), Hh = P.head;
      var cs = -1, best = 0;
      Hh.forEach(function (h, i) { if (!/^status$/i.test(h) || P.steps.some(function (s) { return s.s === i; })) return; var n = P.rows.filter(function (r) { return /^(open|closed?)$/i.test(str_(r.cells[i])); }).length; if (n > best) { best = n; cs = i; } });
      var cp = hrdCol_(Hh, ['position']), cl = hrdCol_(Hh, ['branch']), cb = hrdCol_(Hh, ['requested by']), cj = hrdCol_(Hh, ['expected joining']), ct2 = hrdCol_(Hh, ['timestamp']);
      var isOpen = function (r) { return cs < 0 ? r.current >= 0 : !/^closed?$/i.test(str_(r.cells[cs])); };
      var label = function (r) { return hrdPos_(r.cells[cp]) + ' · ' + hrdPlace_(r.cells[cl]); };
      var going = function (r) { return isOpen(r) && r.current >= 0; };
      var S = fmsSummary_(P, { filter: going, label: label, lateMax: 12 });
      out.pipeline = { total: P.rows.length, inProgress: P.rows.filter(going).length, toClose: P.rows.filter(function (r) { return isOpen(r) && r.current < 0; }).length,
        closed: P.rows.filter(function (r) { return !isOpen(r); }).length,
        steps: S.steps, late: S.late.map(function (x) { return { label: x.label, step: x.step, planned: x.planned, late: fmsLateText_(x.lateH) }; }),
        openList: P.rows.filter(going).map(function (r) {
          var cur = r.current >= 0 ? P.steps[r.current].name : 'All steps done', st = r.current >= 0 ? r.steps[r.current] : null, ts = ct2 >= 0 ? fmsDate_(r.cells[ct2]) : null;
          return { pos: hrdPos_(r.cells[cp]), place: hrdPlace_(r.cells[cl]), by: str_(r.cells[cb]), join: cj >= 0 && fmsDate_(r.cells[cj]) ? fmt_(fmsDate_(r.cells[cj]), 'dd MMM') : '',
            step: cur, stepNo: r.current + 1, of: P.steps.length, late: st && st.st === 'overdue' ? fmsLateText_(Math.round((Date.now() - st.planned.getTime()) / 3600000)) : '',
            due: st && st.planned ? st.planned.getTime() : 0, dueText: st && st.planned ? fmsWhen_(st.planned) : '', t: ts ? ts.getTime() : 0, raised: ts ? fmt_(ts, 'dd MMM') : '' };
        }).sort(function (a, b) { return (a.due || 9e15) - (b.due || 9e15); }) };
      var wkMon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)).getTime(), wkEnd = wkMon + 7 * 86400000 - 1;
      out.pipeline.dueWeek = out.pipeline.openList.filter(function (x) { return x.due && x.due >= now.getTime() && x.due <= wkEnd; }).length;
      out.pipeline.overdue = S.overdue;
      out.pipeline.newWeek = out.pipeline.openList.filter(function (x) { return x.t >= wkMon; }).length;
      out.pipeline.openList = out.pipeline.openList.slice(0, 150);
      var off = -1; P.steps.forEach(function (st, i) { if (off < 0 && /offer/i.test(st.name) && st.a >= 0) off = i; });
      var offers = off < 0 ? [] : P.rows.map(function (r) { var t = fmsDate_(r.cells[P.steps[off].a]); return t && t.getTime() >= monthStart ? { pos: hrdPos_(r.cells[cp]), place: hrdPlace_(r.cells[cl]), when: fmt_(t, 'dd MMM') } : null; }).filter(Boolean);
      out.pipeline.offersMonth = offers.length; out.pipeline.offers = offers.slice(0, 40);
    } catch (e) { out.pipeline = { error: e.message }; }
    // 3. onboarding → probation
    try {
      var V3 = fmsValues_(id, set_('Hiring Onboarding FMS Tab', 'FMS-Onboarding to Probation')), P3 = fmsParse_(V3.values), H3 = P3.head;
      var cn = hrdCol_(H3, ['employee name']), cc = hrdCol_(H3, ['employee came']), cpr = hrdCol_(H3, ['probation candidate', 'probation']), ct = hrdCol_(H3, ['timestamp']),
        cpos = hrdCol_(H3, ['position']), cloc = hrdCol_(H3, ['branch']);
      var rows3 = P3.rows.filter(function (r) { return cn < 0 || str_(r.cells[cn]); });
      var S3 = fmsSummary_(P3, { filter: function (r) { return cn < 0 || str_(r.cells[cn]); }, label: function (r) { return str_(r.cells[cn]) + ' · ' + hrdPos_(r.cells[cpos]); }, lateMax: 10 });
      out.onboarding = { total: rows3.length, month: rows3.filter(function (r) { var t = fmsDate_(r.cells[ct]); return t && t.getTime() >= monthStart; }).length,
        came: cc >= 0 ? hrdCount_(rows3, function (r) { return r.cells[cc]; }, 4) : [],
        probation: cpr >= 0 ? hrdCount_(rows3, function (r) { return r.cells[cpr] || 'In progress'; }, 6) : [],
        steps: S3.steps, late: S3.late.map(function (x) { return { label: x.label, step: x.step, planned: x.planned, late: fmsLateText_(x.lateH) }; }),
        latest: rows3.slice().sort(function (a, b) { var x = fmsDate_(a.cells[ct]), y = fmsDate_(b.cells[ct]); return (y ? y.getTime() : 0) - (x ? x.getTime() : 0); }).slice(0, 6).map(function (r) {
          var t = fmsDate_(r.cells[ct]);
          return { name: str_(r.cells[cn]), pos: hrdPos_(r.cells[cpos]), place: hrdPlace_(r.cells[cloc]), when: t ? fmt_(t, 'dd MMM') : '', came: cc >= 0 ? str_(r.cells[cc]) : '',
            status: cpr >= 0 ? str_(r.cells[cpr]) : '', step: r.current >= 0 ? P3.steps[r.current].name : 'Done' };
        }) };
      var one = function (r) { var t = fmsDate_(r.cells[ct]); return { name: str_(r.cells[cn]), pos: hrdPos_(r.cells[cpos]), place: hrdPlace_(r.cells[cloc]), when: t ? fmt_(t, 'dd MMM yyyy') : '', t: t ? t.getTime() : 0,
        came: cc >= 0 ? str_(r.cells[cc]) : '', status: cpr >= 0 ? str_(r.cells[cpr]) : '', step: r.current >= 0 ? P3.steps[r.current].name : 'Done' }; };
      out.onboarding.joined = rows3.map(one).filter(function (x) { return x.t >= monthStart; }).sort(function (a, b) { return b.t - a.t; });
      out.onboarding.monthList = out.onboarding.joined;
      var prob = rows3.map(one).filter(function (x) { return /probation/i.test(x.status); });
      out.onboarding.probationList = prob.sort(function (a, b) { return b.t - a.t; }).slice(0, 150);
      out.onboarding.probationTotal = prob.length;
      out.onboarding.probationMonth = prob.filter(function (x) { return x.t >= monthStart; }).length;
    } catch (e) { out.onboarding = { error: e.message }; }
  } catch (e) { out.error = e.message; }
  // 4. calling record
  try { out.calling = hrdCalling_(); } catch (e) { out.calling = { error: e.message }; }
  try { out.joining = hrdJoining_(); } catch (e) { out.joining = { error: e.message, list: [] }; }
  finally { fmsCleanup_(); }
  cachePutJ_(key, out, fmsMin_() * 60);
  return out;
}

/* ============================ HR CALLING RECORD ============================ */
/** "19/12/25", "21-07-2026", "22 -08-202" (typo), a sheet date … → Date or null (a 3-digit year takes the year of the row before). */
function hrdCallDate_(v, prev) {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  var s = str_(v); if (!s || /^\d+(\.0+)?$/.test(s)) return null;
  var m = s.match(/(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{2,4})/);
  if (!m) return fmsDate_(s);
  var y = m[3].length === 2 ? 2000 + Number(m[3]) : m[3].length === 3 ? (prev ? prev.getFullYear() : new Date().getFullYear()) : Number(m[3]);
  if (y < 2020 || y > new Date().getFullYear() + 1 || Number(m[2]) > 12 || Number(m[1]) > 31) return null;
  var d = new Date(y, Number(m[2]) - 1, Number(m[1]));
  return isNaN(d.getTime()) || d.getTime() > Date.now() + 86400000 * 2 ? null : d;
}
function hrdCallRows_() {
  if (__M.callRows) return __M.callRows;
  var id = setRaw_('HR Calling Sheet ID');
  if (!id) throw new Error('Settings ▸ HR Calling Sheet ID is empty.');
  var V = fmsValues_(id, set_('HR Calling Tab', 'FMS')), vals = V.values, hr = 0;
  for (var i = 0; i < Math.min(vals.length, 8); i++) if (vals[i].some(function (c) { return /date of calling/i.test(str_(c)); })) { hr = i; break; }
  var H = vals[hr] || [], c = { date: hrdCol_(H, ['date of calling', 'date']), name: hrdCol_(H, ['name']), ph: hrdCol_(H, ['ph']), pos: hrdCol_(H, ['position']),
    st: hrdCol_(H, ['status']), by: hrdCol_(H, ['called by']), iv: hrdCol_(H, ['date of interview']) };
  var prev = null, rows = [];
  vals.slice(hr + 1).forEach(function (r) {
    var name = c.name >= 0 ? str_(r[c.name]) : '', ph = c.ph >= 0 ? str_(r[c.ph]) : '';
    if (!name && !ph) return;
    var d = c.date >= 0 ? hrdCallDate_(r[c.date], prev) : null;
    if (d) prev = d;
    var st = c.st >= 0 ? str_(r[c.st]) : '';
    rows.push({ d: d || prev, dated: !!d, name: name, pos: c.pos >= 0 ? str_(r[c.pos]).replace(/\s+/g, ' ') : '', st: st ? st.replace(/\b\w/g, function (x) { return x.toUpperCase(); }) : 'Not updated',
      by: c.by >= 0 ? str_(r[c.by]).replace(/\b\w+/g, function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }) : '', iv: c.iv >= 0 ? r[c.iv] : '' });
  });
  rows.url = V.url; rows.excel = V.excel;
  return (__M.callRows = rows);
}
function hrdCalling_() {
  var rows;
  try { rows = hrdCallRows_(); } catch (e) { return { error: e.message }; }
  var V = { url: rows.url, excel: rows.excel };
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var t0 = today.getTime(), y0 = t0 - 86400000, w0 = t0 - 6 * 86400000, m0 = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  var at = function (x) { return x.d ? new Date(x.d.getFullYear(), x.d.getMonth(), x.d.getDate()).getTime() : 0; };
  var month = rows.filter(function (x) { return at(x) >= m0; }), lastDay = rows.reduce(function (s, x) { return Math.max(s, at(x)); }, 0);
  var perDay = {};
  rows.forEach(function (x) { var k = at(x); if (k) perDay[k] = (perDay[k] || 0) + 1; });
  var d30 = rows.filter(function (x) { return at(x) >= t0 - 29 * 86400000; });
  var upcoming = rows.filter(function (x) { return /interview/i.test(x.st); }).map(function (x) { var d = hrdCallDate_(x.iv, x.d); return { name: x.name, pos: x.pos, by: x.by, d: d }; })
    .filter(function (x) { return x.d && x.d.getTime() >= t0; }).sort(function (a, b) { return a.d - b.d; });
  return { url: V.url, excel: V.excel, total: rows.length, undated: rows.filter(function (x) { return !x.d; }).length,
    today: rows.filter(function (x) { return at(x) === t0; }).length, yesterday: rows.filter(function (x) { return at(x) === y0; }).length,
    week: rows.filter(function (x) { return at(x) >= w0; }).length, month: month.length, d30: d30.length, last: lastDay ? fmt_(new Date(lastDay), 'dd MMM yyyy') : '',
    byStatus: hrdCount_(rows, function (x) { return x.st; }, 8), byStatusMonth: hrdCount_(month, function (x) { return x.st; }, 8),
    byCaller: hrdCount_(month.length ? month : rows, function (x) { return x.by || 'Not filled'; }, 8), callerScope: month.length ? 'this month' : 'all time',
    byPos: hrdCount_(month.length ? month : rows, function (x) { return x.pos.toLowerCase(); }, 8),
    days: Object.keys(perDay).map(Number).sort(function (a, b) { return b - a; }).slice(0, 14).map(function (k) { return { label: fmt_(new Date(k), 'EEE dd MMM'), count: perDay[k] }; }),
    interviews: upcoming.slice(0, 60).map(function (x) { return { name: x.name, pos: x.pos, by: x.by, when: fmt_(x.d, 'EEE dd MMM') }; }), interviewCount: upcoming.length,
    weekList: rows.filter(function (x) { return at(x) >= w0; }).slice(-200).reverse().map(function (x) { return { name: x.name, pos: x.pos, status: x.st, by: x.by, when: x.d ? fmt_(x.d, 'dd MMM') : '' }; }),
    recent: rows.slice(-60).reverse().map(function (x) { return { name: x.name, pos: x.pos, status: x.st, by: x.by, when: x.d ? fmt_(x.d, 'dd MMM yyyy') : '' }; }),
    followUps: rows.filter(function (x) { return /follow/i.test(x.st); }).length,
    monthList: month.slice(-300).reverse().map(function (x) { return { name: x.name, pos: x.pos, status: x.st, by: x.by, when: x.d ? fmt_(x.d, 'dd MMM') : '' }; }),
    ivMonth: month.filter(function (x) { return /interview/i.test(x.st); }).length,
    ivMonthList: month.filter(function (x) { return /interview/i.test(x.st); }).reverse().map(function (x) {
      var d = hrdCallDate_(x.iv, x.d); return { name: x.name, pos: x.pos, by: x.by, called: x.d ? fmt_(x.d, 'dd MMM') : '', when: d ? fmt_(d, 'EEE dd MMM') : str_(x.iv) }; }) };
}
function hrdJoining_() {
  var m0 = fmt_(new Date(), 'yyyy-MM');
  var list = employees_().filter(function (e) { return e.doj && e.doj.slice(0, 7) === m0 && !/inactive|left/i.test(e.status || ''); }).map(function (e) {
    var o = e.outletId ? outletById_(e.outletId) : null;
    return { name: e.name, id: e.id, pos: e.designation, dept: e.department, place: o ? o.name : e.location, when: fmt_(isoToDate_(e.doj), 'dd MMM yyyy'), t: isoToDate_(e.doj).getTime() };
  }).sort(function (a, b) { return b.t - a.t; });
  return { month: list.length, list: list };
}
function hrdCards_(ctx) {
  var H = hrdHire_(ctx, {}), C = H.calling || {}, P = H.pipeline || {}, O = H.onboarding || {}, J = hrdJoining_();
  return { month: monthLabel_(), calls: C.error ? null : C.month || 0, callsToday: C.today || 0, interviews: C.error ? null : C.ivMonth || 0,
    offers: P.error ? null : P.offersMonth || 0, onboarding: O.error ? null : O.month || 0, joining: J.month,
    errors: [C.error, P.error, O.error, H.error].filter(Boolean) };
}
