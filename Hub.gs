function hubDateKey_(v) {
  if (!v) return '';
  if (v instanceof Date) return iso_(v);
  var s = str_(v), m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (m) return m[3] + '-' + pad_(Number(m[2]), 2) + '-' + pad_(Number(m[1]), 2);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  var d = parseAny_(s);
  return d ? iso_(d) : '';
}
function hubMonthOfKey_(k) { return k ? monthLabel_(isoToDate_(k)) : ''; }

var APPR_DIRECTOR_STEPS = ['admin', 'mis'];

function hubCan_(ctx) {
  var g = ctx.grants, hasOut = (ctx.outlets || []).length > 0;
  var emp = !!g.employees, boss = emp && emBoss_(ctx), approver = emp && emApprover_(ctx);
  return {
    advance: !!(g.adv_hr || g.adv_admin || g.adv_pay || (g.advance && hasOut)),
    leave: !!(g.leave_final || (g.leave && hasOut)),
    reimb: !!g.reimb_approve,
    emp: approver,
    join: emp,
    item: imApprover_(ctx),
    boss: boss
  };
}
function hubHasAny_(ctx) { var c = hubCan_(ctx); return c.advance || c.leave || c.reimb || c.emp || c.item || trkCan_(ctx).any; }

function trkCan_(ctx) {
  var g = ctx.grants, r = norm_(ctx.role), boss = !!(ctx.super || r === 'director' || r === 'misadmin' || dirUi_(ctx));
  var hr = !!(g.adv_hr || g.leave_final), inc = r === 'outletincharge' && (ctx.outlets || []).length > 0 && !!(g.leave || g.advance);
  var lv = boss || hr || inc;
  return { advance: lv, leave: lv, reimb: boss || (inc && !!g.reimb_approve), all: boss || hr, any: lv };
}
function trkStatus_(s, by) { return s ? s.charAt(0) + s.substring(1).toLowerCase() + (by ? ' · ' + by : '') : '—'; }
function apprTrack_(ctx, d) {
  var can = trkCan_(ctx);
  if (!can.any) throw new Error('Tracking is for MIS, the Directors, HR and the Outlet Incharge.');
  var back = Math.max(0, Math.min(5, Number((d || {}).back) || 0)), now = new Date(), mon = monthLabel_(new Date(now.getFullYear(), now.getMonth() - back, 1)), months = [];
  for (var i = 0; i < 6; i++) months.push(monthLabel_(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  var map = empOutletMap_(), outs = can.all ? null : (ctx.outlets || []), out = { month: mon, back: back, months: months, advance: null, leave: null, reimb: null, all: can.all, errors: [] };
  function place(empId, loc) { var id = laEmpOutlet_(empId, loc, map); return { id: id, name: (outletById_(id) || {}).name || loc || '' }; }
  function keep(pl) { return !outs || outs.indexOf(pl.id) >= 0; }
  function inMonth(o) { return o.month === mon; }
  if (can.advance) {
    try {
      out.advance = laNewestFirst_(laAdvRead_(back + 1, function (a) { if (!inMonth(a)) return false; a.pl = place(a.empId, a.location); return keep(a.pl); })).map(function (a) {
        var amt = a.amount || a.admAmount || a.hrAmount || a.incAmount || a.requested;
        var wait = { INCHARGE: 'Pending with Outlet Incharge', HR: 'Pending with HR', ADMIN: 'Pending with Director', TO_PAY: 'Pending with Operations Manager', PAID: 'Paid', REJECTED: 'Rejected' }[a.stage] || a.stageText;
        return { key: a.sheet + '|' + a.row, name: a.name, empId: a.empId, location: a.pl.name, applied: a.applied, amount: amt, requested: a.requested, stage: a.stage, wait: wait,
          done: a.stage === 'PAID' || a.stage === 'REJECTED',
          flow: [['Requested', '₹' + a.requested + ' · ' + a.applied + (a.purpose ? ' · ' + a.purpose : '')],
            ['Outlet Incharge', a.incStatus === '-' ? 'Not needed' : trkStatus_(a.incStatus, a.incBy) + (a.incAmount ? ' · ₹' + a.incAmount : '')],
            ['HR', a.hrStatus === '-' ? '—' : trkStatus_(a.hrStatus, a.hrBy) + (a.hrAmount ? ' · ₹' + a.hrAmount : '')],
            ['Director', a.admStatus === '-' || !a.admStatus ? '—' : trkStatus_(a.admStatus, a.admBy) + (a.admAmount ? ' · ₹' + a.admAmount : '')],
            ['Operations Manager', a.payStatus === 'PAID' ? 'Paid' + (a.payBy ? ' · ' + a.payBy : '') + (a.payTime ? ' · ' + a.payTime : '') : a.stage === 'TO_PAY' ? 'Not paid yet' : '—']] };
      });
    } catch (e) { out.errors.push('Advance: ' + e.message); }
  }
  if (can.leave) {
    try {
      out.leave = laNewestFirst_(laLeaveRead_(back + 1, function (l) { if (!inMonth(l)) return false; l.pl = place(l.empId, ''); return keep(l.pl); })).map(function (l) {
        var wait = l.final === 'APPROVED' ? 'Approved' : l.final === 'REJECTED' ? 'Rejected' : l.l1 === 'REJECTED' ? 'Rejected by Outlet Incharge' : l.l1 === 'PENDING' ? 'Pending with Outlet Incharge' : 'Pending with HR';
        var fin = l.final === 'APPROVED' || l.final === 'REJECTED';
        return { key: l.sheet + '|' + l.row, name: l.name, empId: l.empId, location: l.pl.name, applied: l.applied, days: l.days, dates: l.from + (l.to && l.to !== l.from ? ' → ' + l.to : ''),
          wait: wait, done: fin, final: l.final, canChange: fin && !!ctx.grants.leave_final, ref: { sheet: l.sheet, row: l.row, empId: l.empId }, remarks: l.remarks,
          flow: [['Leave', l.from + (l.to && l.to !== l.from ? ' → ' + l.to : '') + ' · ' + l.days + ' day(s)' + (l.reason ? ' · ' + l.reason : '')], ['Applied', l.applied],
            ['Outlet Incharge', l.l1 === '-' || !l.l1 ? 'Not needed' : trkStatus_(l.l1, l.l1By)], ['Final', trkStatus_(l.final || 'PENDING', l.finalBy)],
            l.replacement ? ['Replacement', l.replacement] : null].filter(Boolean) };
      });
    } catch (e) { out.errors.push('Leave: ' + e.message); }
  }
  if (can.reimb) {
    try {
      out.reimb = laNewestFirst_(laReimbRead_(back + 1, function (r) { if (!inMonth(r)) return false; r.pl = place(r.empId, ''); return !!ctx.grants.reimb_approve || keep(r.pl); })).map(function (r) {
        return { key: r.sheet + '|' + r.row, name: r.name, empId: r.empId, location: r.pl.name, applied: r.applied, amount: r.amount,
          wait: r.status === 'APPROVED' ? 'Approved' : r.status === 'REJECTED' ? 'Rejected' : 'Pending approval', done: r.status === 'APPROVED' || r.status === 'REJECTED',
          flow: [['Expense', '₹' + r.amount + ' · ' + (r.category || '') + (r.vendor ? ' · ' + r.vendor : '')], ['Expense date', r.date], ['Applied', r.applied], ['Purpose', r.purpose || '—'],
            ['Status', trkStatus_(r.status, r.by) + (r.at ? ' · ' + r.at : '')]].concat(r.remarks ? [['Remarks', r.remarks]] : []) };
      });
    } catch (e) { out.errors.push('Reimbursement: ' + e.message); }
  }
  return out;
}

function hubPerson_(x) {
  return { name: str_(x.name), empId: str_(x.empId), designation: str_(x.designation), location: str_(x.location || x.outlet || '') };
}

function apprHub_(ctx, d) {
  d = d || {};
  if (d.force) [LA_ADV, LA_LEAVE, LA_REIMB].forEach(function (p) { laDirty_(p + monthLabel_()); });
  var only = str_(d.only) === 'join' ? 'join' : '';
  var key = 'hub5_' + only + ctx.uid + '_' + monthLabel_().replace(/\s/g, '') + '_' + gen_('la') + '.' + gen_('empch') + '.' + gen_('emps') + '.' + gen_('users') + '.' + gen_('items');
  if (!d.force && !__M.fresh) { var hit = cacheGetJ_(key); if (hit) return hit; }
  var can = hubCan_(ctx), g = ctx.grants, cur = monthLabel_(), items = { advance: [], leave: [], reimb: [], emp: [], join: [], item: [] }, errors = [], seen = {};
  var boss = dirIs_(ctx), hasOut = (ctx.outlets || []).length > 0;
  function push(cat, it) {
    var k = cat + '|' + (it.ref.sheet || '') + '|' + (it.ref.row || it.ref.id || it.key);
    if (seen[k]) return;
    seen[k] = 1;
    it.cat = cat; it.month = it.month || hubMonthOfKey_(it.dateKey); it.key = it.key || k;
    items[cat].push(it);
  }
  var A = null;
  if (!only && g.approvals && (g.adv_hr || g.adv_admin || g.adv_pay || g.leave_final || g.reimb_approve)) {
    try { A = apprLoad_(ctx); errors = errors.concat(A.errors || []); } catch (e) { errors.push(e.message); }
  }
  function inchargeSteps() {
    if (g.advance && hasOut) {
      try {
        advList_(ctx, { outletId: 'ALL' }).pending.forEach(function (a) {
          var amt = Math.min(a.requested || a.maxSuggest, a.maxSuggest || a.requested);
          push('advance', Object.assign(hubPerson_(a), { step: 'incharge', stepText: 'Pending with Outlet Incharge', dateKey: a.appliedKey || hubDateKey_(a.applied), dateText: a.applied, month: a.month,
            amount: a.requested, line: '₹' + a.requested + ' requested' + (a.purpose ? ' · ' + a.purpose : ''), status: 'Pending with Outlet Incharge',
            kv: [['Requested', '₹' + a.requested + ' · ' + a.applied], ['Purpose', a.purpose || '—'], ['Present days (claimed)', a.days], ['Salary', '₹' + a.salary + ' · ₹' + a.daily + '/day'],
              ['Suggested max', '₹' + a.maxSuggest]],
            inputs: { max: a.maxSuggest || a.requested, amount: amt }, ref: { sheet: a.sheet, row: a.row, empId: a.empId }, route: 'adv.decide' }));
        });
      } catch (e) { errors.push('Advance: ' + e.message); }
    }
    if (g.leave && hasOut) {
      try {
        leaveList_(ctx, { outletId: 'ALL' }).pending.forEach(function (l) {
          push('leave', Object.assign(hubPerson_(l), { step: 'incharge', stepText: 'Pending with Outlet Incharge', dateKey: hubDateKey_(l.applied) || l.fromKey,
            dateText: l.from + (l.to && l.to !== l.from ? ' → ' + l.to : ''), month: str_(l.sheet).replace(/^Leave /, '') || hubMonthOfKey_(l.fromKey),
            line: l.from + (l.to && l.to !== l.from ? ' → ' + l.to : '') + ' · ' + l.days + ' day(s)' + (l.reason ? ' · ' + l.reason : ''), status: 'Pending with Outlet Incharge',
            kv: [['Dates', l.from + (l.to && l.to !== l.from ? ' → ' + l.to : '') + ' · ' + l.days + ' day(s)'], ['Reason', l.reason || '—'], ['Applied', l.applied]],
            ref: { sheet: l.sheet, row: l.row, empId: l.empId }, route: 'leave.decide' }));
        });
      } catch (e) { errors.push('Leave: ' + e.message); }
    }
  }
  if (boss && !only) inchargeSteps();
  if (A) {
    A.advance.hr.forEach(function (a) {
      var amt = a.incAmount || a.requested;
      push('advance', Object.assign(hubPerson_(a), { step: a.onBehalf ? 'incharge' : 'hr', stepText: a.onBehalf ? 'Pending with Outlet Incharge' : 'Pending with HR', dateKey: a.appliedKey || hubDateKey_(a.applied),
        dateText: a.applied, month: a.month, amount: a.requested, line: '₹' + a.requested + ' requested' + (a.purpose ? ' · ' + a.purpose : ''), status: a.stageText,
        kv: [['Requested', '₹' + a.requested + ' · ' + a.applied], ['Purpose', a.purpose || '—'], ['Present days (employee)', a.days], ['Salary', '₹' + a.salary],
          ['Outlet Incharge', a.incStatus === 'APPROVED' ? '₹' + a.incAmount + (a.incBy ? ' · ' + a.incBy : '') : (a.incStatus || '—')]],
        inputs: { days: a.actualDays || a.days || '', amount: amt, salary: a.salary }, ref: { sheet: a.sheet, row: a.row, empId: a.empId }, route: 'appr.advHr' }));
    });
    A.advance.rejected.forEach(function (a) {
      push('advance', Object.assign(hubPerson_(a), { step: 'resend', stepText: 'Rejected by Director', dateKey: a.appliedKey || hubDateKey_(a.applied), dateText: a.applied, month: a.month,
        amount: a.hrAmount, line: '₹' + a.hrAmount + ' · rejected by ' + (a.admBy || 'the Director') + (a.admRemarks ? ': ' + a.admRemarks : ''), status: 'Rejected by Director',
        kv: [['Requested', '₹' + a.requested + ' · ' + a.applied], ['HR approved', '₹' + a.hrAmount], ['Director', (a.admBy || 'Director') + ' — ' + (a.admRemarks || '')]],
        inputs: { amount: a.hrAmount }, ref: { sheet: a.sheet, row: a.row, empId: a.empId }, route: 'appr.advResend', rejectRoute: 'appr.advClose', approveText: 'Send again' }));
    });
    A.advance.admin.forEach(function (a) {
      push('advance', Object.assign(hubPerson_(a), { step: 'admin', stepText: 'Pending with Director', dateKey: a.appliedKey || hubDateKey_(a.applied), dateText: a.applied, month: a.month,
        amount: a.hrAmount, line: '₹' + a.hrAmount + ' approved by HR · ₹' + a.requested + ' requested', status: a.stageText,
        kv: [['Requested', '₹' + a.requested + ' · ' + a.applied], ['Purpose', a.purpose || '—'], ['HR approved', '₹' + a.hrAmount + (a.hrBy ? ' · ' + a.hrBy : '')],
          ['Present days (HR)', a.actualDays || '—']],
        inputs: { amount: a.hrAmount }, ref: { sheet: a.sheet, row: a.row, empId: a.empId }, route: 'appr.advAdmin' }));
    });
    A.advance.pay.forEach(function (a) {
      push('advance', Object.assign(hubPerson_(a), { step: 'pay', stepText: 'Pending with Operations Manager', dateKey: a.appliedKey || hubDateKey_(a.applied), dateText: a.applied, month: a.month,
        amount: a.amount || a.admAmount, line: '₹' + (a.amount || a.admAmount) + ' to be paid', status: 'Pending payment',
        kv: [['Approved', '₹' + (a.amount || a.admAmount)], ['Applied', a.applied], ['Purpose', a.purpose || '—']],
        ref: { sheet: a.sheet, row: a.row, empId: a.empId, name: a.name }, route: 'appr.advPay', approveText: 'Paid', noReject: true }));
    });
    A.leave.forEach(function (l) {
      push('leave', Object.assign(hubPerson_(l), { step: l.waitingIncharge ? 'incharge' : 'hr', stepText: l.waitingIncharge ? 'Pending with Outlet Incharge' : 'Pending with HR', dateKey: hubDateKey_(l.applied) || l.fromKey,
        dateText: l.from + (l.to && l.to !== l.from ? ' → ' + l.to : ''), month: l.month, line: l.from + (l.to && l.to !== l.from ? ' → ' + l.to : '') + ' · ' + l.days + ' day(s)' + (l.reason ? ' · ' + l.reason : ''),
        status: l.stageText, kv: [['Dates', l.from + (l.to && l.to !== l.from ? ' → ' + l.to : '') + ' · ' + l.days + ' day(s)'], ['Reason', l.reason || '—'], ['Applied', l.applied],
          ['Outlet Incharge', l.l1 === 'APPROVED' ? 'Approved' + (l.l1By ? ' · ' + l.l1By : '') : l.l1 === 'REJECTED' ? 'Rejected' + (l.l1By ? ' · ' + l.l1By : '') : l.l1 === 'PENDING' ? 'Not decided yet' : 'Not needed — came straight to HR']],
        ref: { sheet: l.sheet, row: l.row, empId: l.empId }, route: 'appr.leave' }));
    });
    A.reimb.forEach(function (r) {
      push('reimb', Object.assign(hubPerson_(r), { step: 'reimb', stepText: 'Pending approval', canDecide: !r.own, mine: r.own, dateKey: hubDateKey_(r.applied) || hubDateKey_(r.date), dateText: r.date, month: r.month,
        amount: r.amount, line: '₹' + r.amount + ' · ' + (r.category || 'Expense') + (r.vendor ? ' · ' + r.vendor : ''), status: 'Pending',
        kv: [['Amount', '₹' + r.amount], ['Category', r.category || '—'], ['Expense date', r.date], ['Applied', r.applied], ['Vendor', r.vendor || '—'], ['Purpose', r.purpose || '—'], ['Paid by', r.method || '—']],
        bill: r.bill || '', docs: (r.docs || []).length, ref: { sheet: r.sheet, row: r.row, empId: r.empId }, route: 'appr.reimb' }));
    });
  }
  if (!boss && !only) inchargeSteps();
  if (can.emp && !only) {
    try {
      empChanges_(ctx).list.forEach(function (c) {
        if (c.status !== 'Pending' || /^join/.test(c.kind)) return;
        push('emp', { key: 'emp|' + c.id, name: c.name, empId: c.empId, designation: '', location: c.sheet, step: c.stage === 'MIS' ? 'mis' : 'hrexec',
          stepText: c.stage === 'MIS' ? 'Pending with MIS / Director' : 'Pending with HR Executive', dateKey: c.atKey, dateText: c.at,
          line: c.kindText + ' · ' + c.summary, status: c.mine ? 'Your request' : 'Pending', canDecide: c.canDecide, mine: c.mine,
          kv: [['Change', c.id + ' · ' + c.kindText], ['Requested by', c.by + ' · ' + c.at]].concat(c.hrBy ? [['HR Executive', c.hrBy + ' · ' + c.hrAt]] : [])
            .concat((c.fields || []).length ? c.fields.filter(function (f) { return !f.beforeFile && !f.afterFile; }).map(function (f) { return [f.field, (f.before || '—') + ' → ' + (f.after || '—')]; })
              : c.summary.split(' · ').map(function (s) { var i = s.indexOf(': '); return i > 0 ? [s.substring(0, i), s.substring(i + 2)] : ['', s]; })),
          links: (c.fields || []).reduce(function (L, f) {
            if (f.beforeFile) L.push({ label: f.field + ' (before)', module: 'empch', id: c.id + '|' + f.beforeFile });
            if (f.afterFile) L.push({ label: f.field + (f.beforeFile ? ' (new)' : ''), module: 'empch', id: c.id + '|' + f.afterFile });
            return L;
          }, []),
          ref: { id: c.id }, route: 'emp.changeDecide' });
      });
    } catch (e) { errors.push('Employee changes: ' + e.message); }
  }
  var meta = null;
  if (can.join && only) {
    try {
      var P = empPending_(ctx); meta = { locations: P.meta.locations };
      P.rows.forEach(function (r) {
        var v = r.values, q = r.queued;
        var canAct = q ? q.canDecide : true;
        push('join', { key: 'join|' + r.row + '|' + r.id, name: r.name, empId: r.id, designation: v['Designation'] || '', location: v['Location'] || '', step: q ? (q.stage === 'MIS' ? 'mis' : 'hrexec') : 'hr',
          stepText: q ? (q.stage === 'MIS' ? 'Pending with MIS / Director' : 'Pending with HR Executive') : 'Pending with HR', dateKey: r.atKey,
          dateText: v['Date Of Joining'] || '', line: [v['Designation'], v['Department'], v['Phone No.']].filter(Boolean).join(' · '), status: q ? 'Pending with ' + (q.stage === 'MIS' ? 'MIS / Director' : 'HR Executive') : 'New',
          canDecide: canAct, kv: [['Mobile', v['Phone No.'] || '—'], ['Designation', (v['Designation'] || '—') + ' · ' + (v['Department'] || '')], ['Joining date', v['Date Of Joining'] || '—'],
            ['Father / Husband', v["Father/Husband's Name"] || '—'], ['Birth · Gender', [v['Date of Birth'], v['Gender'], v['Blood Group']].filter(Boolean).join(' · ') || '—'],
            ['Aadhar · PAN', [v['Aadhar Card'], v['Pan']].filter(Boolean).join(' · ') || '—'], ['Bank', [v['Bank Name'], v['AC Num'], v['IFSC']].filter(Boolean).join(' · ') || '—'],
            ['Address', v['Current Address'] || v['Permanent Address'] || '—']].concat(q ? [['Location', q.summary.replace(/^New joining — add to the master at /, '')]] : []),
          needsLocation: !q, ref: q ? { id: q.changeId } : { row: r.row, expected: { id: r.id, name: r.name } }, route: q ? 'emp.changeDecide' : 'emp.approve', rejectRoute: q ? 'emp.changeDecide' : 'emp.reject' });
      });
    } catch (e) { errors.push('Under review: ' + e.message); }
  }
  if (can.item && !only) {
    try {
      readObjs_(SH.ITEM_REQ).forEach(function (r) {
        if (str_(r['Status']) !== 'Pending') return;
        var x = itemReqOut_(r);
        push('item', { key: 'item|' + x.id, name: x.name, empId: x.code, designation: '', location: '', step: 'mis', stepText: 'Pending with MIS / Director',
          dateKey: x.atKey.substring(0, 10), dateText: x.at, line: 'Make ' + x.to.toLowerCase() + ' · ' + x.reason, status: 'Make ' + x.to.toLowerCase(),
          canDecide: true, kv: [['Item', x.code + ' · ' + x.name], ['Now', x.from || '—'], ['Change to', x.to], ['Reason', x.reason], ['Requested by', x.by + ' · ' + x.at], ['Request', x.id]],
          ref: { id: x.id }, route: 'item.decide' });
      });
    } catch (e) { errors.push('Item requests: ' + e.message); }
  }
  ['advance', 'leave', 'reimb'].forEach(function (k) {
    items[k] = items[k].filter(function (it) { return it.month === cur; });
    items[k].forEach(function (it) { if (it.canDecide === undefined) it.canDecide = true; });
  });
  Object.keys(items).forEach(function (k) {
    items[k].forEach(function (it) { it.forMe = !!it.canDecide && (!boss || APPR_DIRECTOR_STEPS.indexOf(it.step) >= 0); });
  });
  var cards = [];
  function card(k, label, icon, on) {
    if (!on) return;
    var L = items[k].filter(function (x) { return x.forMe; });
    cards.push({ key: k, label: label, icon: icon, total: L.length, all: items[k].length });
  }
  card('advance', 'Advance', 'payments', can.advance && !only);
  card('leave', 'Leave', 'event_busy', can.leave && !only);
  card('reimb', 'Reimbursement', 'request_quote', can.reimb && !only);
  card('emp', 'Employee detail changes', 'manage_accounts', can.emp && !only);
  card('join', 'New joinings', 'how_to_reg', can.join && !!only);
  card('item', 'Item Active / Inactive', 'category', can.item && !only);
  var locs = {};
  Object.keys(items).forEach(function (k) { items[k].forEach(function (x) { if (x.location) locs[x.location] = 1; }); });
  var now = new Date();
  var tc = trkCan_(ctx);
  var out = { only: only, track: tc.any && !only ? { advance: tc.advance, leave: tc.leave, reimb: tc.reimb } : null, month: cur, monthStart: iso_(new Date(now.getFullYear(), now.getMonth(), 1)), monthEnd: iso_(new Date(now.getFullYear(), now.getMonth() + 1, 0)), today: todayIso_(), cards: cards, items: items,
    locations: Object.keys(locs).sort(), meta: meta, errors: errors, total: cards.reduce(function (s, c) { return s + c.total; }, 0) };
  cachePutJ_(key, out, 60);
  return out;
}

function dashHome_(ctx) {
  var out = { pending: { checklist: 0, tasks: 0, checklistList: [], taskList: [] }, approvals: null, mine: null };
  if (can_(ctx, 'checklist')) {
    try { var c = chkPendingToday_(ctx) || {}; out.pending.checklist = (c.minePending || 0) + (c.assigned || 0); } catch (e) {}
  }
  if (can_(ctx, 'tasks')) {
    try {
      var T = dashTasks_(ctx);
      out.pending.tasks = (T.open || 0) + (T.legacy || 0);
      out.pending.taskList = (T.next || []).map(function (t) { return { id: t.id, task: t.title, when: t.due || '', overdue: t.overdue, by: t.by }; });
    } catch (e) {}
  }
  if (can_(ctx, 'tickets') && tkCard_(ctx)) out.issues = tkDash_(ctx);
  if (hubHasAny_(ctx)) {
    try {
      var H = apprHub_(ctx, {});
      out.approvals = { cards: H.cards, total: H.total, month: H.month };
    } catch (e) { out.approvals = { cards: [], total: 0, error: e.message }; }
  } else if (can_(ctx, 'my_requests') && ctx.empId) {
    try { out.mine = dashMine_(ctx); } catch (e) {}
  }
  return out;
}
