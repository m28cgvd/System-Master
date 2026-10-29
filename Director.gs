function dirIs_(ctx) { return norm_(ctx.role) === 'director'; }
function dirCan_(ctx) { if (!dirUi_(ctx) && !ctx.super) throw new Error('These reports are for the Directors.'); }
function dirLoc_(outletId) { var o = outletId ? outletById_(outletId) : null; return o ? o.name : 'Other'; }
var DIR_LOC_ORDER = ['HQ', 'GFP', 'Pandri', 'Chanderi'];
function dirLocSort_(a, b) {
  var i = DIR_LOC_ORDER.indexOf(a), j = DIR_LOC_ORDER.indexOf(b);
  return ((i < 0 ? 99 : i) - (j < 0 ? 99 : j)) || String(a).localeCompare(String(b));
}
function dirMonday_(d) { d = d || new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)); }
function dirCache_(key, sec, force, fn) {
  if (!force && !__M.fresh) { var hit = cacheGetJ_(key); if (hit) return hit; }
  var out = fn();
  cachePutJ_(key, out, sec);
  return out;
}

function deptKey_(name) {
  var n = norm_(name);
  if (!n) return '';
  if (!__M.deptKeys) {
    var m = {};
    try {
      readObjs_(SH.DEPTS).forEach(function (r) {
        var id = str_(r['Department ID']) || str_(r['Department Name']);
        [str_(r['Department Name'])].concat(list_(r['Aliases'])).forEach(function (a) { var k = norm_(a); if (k && !m[k]) m[k] = id; });
      });
    } catch (e) {}
    __M.deptKeys = m;
  }
  return __M.deptKeys[n] || n;
}

function dirHome_(ctx, d) {
  dirCan_(ctx);
  var key = 'dirhome_' + ctx.uid + '_' + gen_('la') + '.' + gen_('tk') + '.' + gen_('users') + '.' + gen_('data') + '.' + gen_('tasks') + '_' + Math.floor(Date.now() / 120000);
  return dirCache_(key, 120, d.force, function () {
    var out = { errors: [] };
    try {
      var C = dirChkList_(ctx, d);
      out.chk = C.list.reduce(function (s, x) { s.pending += x.pending; s.overdue += x.overdue; s.done += x.done; s.total += x.total; return s; },
        { pending: 0, overdue: 0, done: 0, total: 0, lists: C.list.length });
    } catch (e) { out.errors.push('Checklists: ' + e.message); }
    try {
      var H = apprHub_(ctx, {}), all = 0;
      Object.keys(H.items).forEach(function (k) { all += H.items[k].length; });
      out.appr = { mine: H.total, all: all, cards: H.cards.map(function (c) { return { label: c.label, total: c.total, all: c.all }; }) };
    } catch (e) { out.errors.push('Approvals: ' + e.message); }
    try {
      var L = tkList_(ctx, {}), loc = {};
      L.list.forEach(function (t) { if (!t.closed && t.stage === 'overdue') loc[t.outlet || 'Other'] = (loc[t.outlet || 'Other'] || 0) + 1; });
      out.issues = { pending: L.counts.pending, overdue: L.counts.overdue, forMe: L.counts.forMe, all: L.counts.all, byLoc: loc };
    } catch (e) { out.errors.push('Issues: ' + e.message); }
    try { var G = dlgData_(); out.tasks = G.counts; } catch (e) { out.errors.push('Delegated tasks: ' + e.message); }
    return out;
  });
}

function dirChkList_(ctx, d) {
  dirCan_(ctx);
  d = d || {};
  var key = 'dirchk_' + ctx.uid + '_' + gen_('data') + '.' + gen_('users') + '_' + todayIso_() + '_' + Math.floor(Date.now() / 120000);
  return dirCache_(key, 120, d.force, function () {
    var P = chkPeriod_(), list = [];
    chkVisible_(ctx).forEach(function (v) {
      var c = v.c, x = { id: c.id, name: c.name, loc: dirLoc_(c.outletId), dept: c.dept || '', total: 0, done: 0, pending: 0, overdue: 0, error: '' };
      try {
        chkPeriodRows_(c, P).forEach(function (r) { x.total++; x[chkState_(r, P)]++; });
      } catch (e) { x.error = e.message; }
      list.push(x);
    });
    return { today: P.today, weekFrom: P.weekFrom, weekTo: P.weekTo, monthFrom: P.monthFrom, list: list, locs: uniq_(list.map(function (x) { return x.loc; })).sort(dirLocSort_) };
  });
}

function dirChkPeople_(c) {
  var want = deptKey_(c.dept), o = c.outletId ? outletById_(c.outletId) : null, atOutlet = o && o.type === 'Outlet' ? o.id : '';
  var emps = {};
  employees_().forEach(function (e) { emps[str_(e.id).toUpperCase()] = e; });
  return readObjs_(SH.LOGIN).map(function (r) {
    if (!/^active$/i.test(str_(r['Status'])) || !str_(r['User ID'])) return null;
    var e = emps[str_(r['Employee ID']).toUpperCase()];
    if (!e || /inactive|left/i.test(str_(e.status))) return null;
    if (want && deptKey_(e.department) !== want) return null;
    if (atOutlet && e.outletId !== atOutlet) return null;
    return { uid: str_(r['User ID']), name: str_(r['Full Name']) || e.name, designation: e.designation || '', outlet: dirLoc_(e.outletId) };
  }).filter(Boolean).sort(function (a, b) { return a.name.localeCompare(b.name); });
}
function dirChkUsers_(ctx, d) {
  var c = checklists_().filter(function (x) { return x.id === str_(d.id); })[0];
  if (!c) throw new Error('Checklist not found.');
  chkFind_(ctx, c.id);
  return { dept: c.dept || '', loc: dirLoc_(c.outletId), people: dirChkPeople_(c) };
}

function dirOrders_(ctx, d) {
  dirCan_(ctx);
  var day = /^\d{4}-\d{2}-\d{2}$/.test(str_(d.date)) ? str_(d.date) : str_(d.day) === 'yesterday' ? iso_(addDays_(new Date(), -1)) : todayIso_();
  var nd = {}, ndErr = '';
  try {
    dirNotDispatched_().forEach(function (x) { (nd[x.orderNo] = nd[x.orderNo] || []).push(x); });
  } catch (e) { ndErr = e.message; }
  var outs = outlets_(), reasons = {};
  var orders = ordRecent_().filter(function (g) { return g.date === day; }).map(function (g) {
    var o = outs.filter(function (x) { return orderBelongs_(x, g.no, g.outletCell); })[0];
    var ndl = nd[g.no] || [], byCode = {}, byName = {};
    ndl.forEach(function (x) { if (x.code) byCode[x.code.toUpperCase()] = x; byName[norm_(x.name)] = x; reasons[x.reason || 'Not given'] = (reasons[x.reason || 'Not given'] || 0) + 1; });
    var lines = g.lines.map(function (l) {
      var n = (l[0] && byCode[String(l[0]).toUpperCase()]) || byName[norm_(l[1])] || null;
      return { code: l[0], name: l[1], unit: l[2], qty: l[3], disp: l[4], nd: n ? n.notQty : 0, reason: n ? n.reason : '', remark: n ? n.remark : '' };
    });
    var filled = lines.filter(function (l) { return l.disp !== null && l.disp !== undefined; }).length;
    var state = filled === lines.length ? 'Dispatched' : filled ? 'Part dispatched' : 'To dispatch';
    return { no: g.no, outlet: o ? o.name : g.outletCell, time: g.time, by: g.cust || g.by, status: g.status || 'Confirmed', state: state,
      items: lines.length, qty: round_(lines.reduce(function (s, l) { return s + (Number(l.qty) || 0); }, 0), 2),
      dispatched: round_(lines.reduce(function (s, l) { return s + (Number(l.disp) || 0); }, 0), 2), ndLines: ndl.length, lines: lines };
  });
  function mins(t) { var m = /(\d{1,2}):(\d{2})\s*([AP]M)?/i.exec(str_(t)); if (!m) return 0; var hh = Number(m[1]) % 12 + (/p/i.test(m[3] || '') ? 12 : 0); return hh * 60 + Number(m[2]); }
  orders.sort(function (a, b) { return mins(b.time) - mins(a.time); });
  var byOutlet = {};
  orders.forEach(function (o) { byOutlet[o.outlet] = (byOutlet[o.outlet] || 0) + 1; });
  return { date: day, dateText: fmt_(isoToDate_(day), 'EEE dd MMM yyyy'), ndError: ndErr, orders: orders,
    outlets: Object.keys(byOutlet).sort(dirLocSort_).map(function (k) { return { name: k, count: byOutlet[k] }; }),
    reasons: Object.keys(reasons).map(function (k) { return { name: k, count: reasons[k] }; }).sort(function (a, b) { return b.count - a.count; }),
    totals: { orders: orders.length, dispatched: orders.filter(function (o) { return o.state === 'Dispatched'; }).length,
      part: orders.filter(function (o) { return o.state === 'Part dispatched'; }).length, pending: orders.filter(function (o) { return o.state === 'To dispatch'; }).length,
      ndLines: orders.reduce(function (s, o) { return s + o.ndLines; }, 0) } };
}
function dirNotDispatched_() {
  var id = setRaw_('Item Not Dispatch Sheet ID');
  if (!id) throw new Error('Settings ▸ Item Not Dispatch Sheet ID is empty.');
  var t = extRead_(id, set_('Item Not Dispatch Tab', 'Item Not Dispatch'), { headerRow: 1, lastN: 4000, cache: 120 });
  var H = t.head, c = { no: col_(H, ['Order No']), code: col_(H, ['Item Code']), name: col_(H, ['Item Name']), unit: col_(H, ['Unit']),
    ord: col_(H, ['Ordered Qty']), nd: col_(H, ['Not Dispatched Qty']), disp: col_(H, ['Dispatched Qty']), reason: col_(H, ['Reason']),
    remark: col_(H, ['Remark']), by: col_(H, ['Recorded By']), outlet: col_(H, ['Outlet Name']) };
  if (c.no < 0) throw new Error('The Item Not Dispatch tab has no "Order No" column.');
  return t.rows.map(function (r) {
    var no = str_(r[c.no]);
    if (!no) return null;
    return { orderNo: no, code: c.code >= 0 ? str_(r[c.code]) : '', name: c.name >= 0 ? str_(r[c.name]) : '', unit: c.unit >= 0 ? str_(r[c.unit]) : '',
      ordered: c.ord >= 0 ? num_(r[c.ord]) : 0, notQty: c.nd >= 0 ? num_(r[c.nd]) : 0, dispatched: c.disp >= 0 ? num_(r[c.disp]) : 0,
      reason: c.reason >= 0 ? str_(r[c.reason]) : '', remark: c.remark >= 0 ? str_(r[c.remark]) : '', by: c.by >= 0 ? str_(r[c.by]) : '' };
  }).filter(Boolean);
}

function dirFms_(ctx, d) {
  dirCan_(ctx);
  var key = 'dirfms2_' + gen_('fms') + '.' + gen_('hire') + '_' + Math.floor(Date.now() / (fmsMin_() * 60000));
  return dirCache_(key, fmsMin_() * 60, d.force, function () {
    var out = {}, H = hrdHire_(ctx, { force: d.force }), P = H.pipeline || {}, O = H.onboarding || {};
    out.indent = { error: H.error || P.error || '', open: P.inProgress || 0, overdue: P.overdue === undefined ? (P.late || []).length : P.overdue, dueWeek: P.dueWeek || 0, newWeek: P.newWeek || 0,
      list: P.openList || [], steps: (P.steps || []).filter(function (s) { return !s.unused; }), offersMonth: P.offersMonth || 0, offers: P.offers || [] };
    out.onboarding = { error: H.error || O.error || '', probation: O.probationTotal || (O.probationList || []).length, probationList: O.probationList || [], joined: O.joined || [],
      steps: (O.steps || []).filter(function (s) { return !s.unused; }), late: O.late || [] };
    try { out.dispatch = dirDispatchFms_(); } catch (e) { out.dispatch = { error: e.message }; } finally { fmsCleanup_(); }
    return out;
  });
}
function dirDispatchFms_() {
  var f = fmsAll_().filter(function (x) { return x.active && x.sheet && /dispatch/i.test(x.name); })[0];
  if (!f) return { error: 'No "Outlet Order to Dispatch" FMS with a sheet on the FMS Sheets tab.' };
  var V = fmsValues_(f.sheet, f.tabs[0] || ''), P = fmsParse_(V.values);
  var cId = hrdCol_(P.head, ['order id']), cOut = hrdCol_(P.head, ['outlet']), cItems = hrdCol_(P.head, ['no. of items', 'items']),
    cBy = hrdCol_(P.head, ['order by']), cDate = hrdCol_(P.head, ['order date']);
  var now = Date.now(), today = todayIso_(), mon = dirMonday_(), wFrom = mon.getTime(), wTo = wFrom + 7 * 86400000 - 1;
  var steps = P.steps.map(function (s) { return { n: s.n, name: s.name, unused: !!s.unused, planned: 0, done: 0, pending: 0, overdue: 0 }; });
  var list = [], orders = {}, week = { orders: 0, planned: 0, done: 0, pending: 0, overdue: 0 }, day = { pending: 0, overdue: 0, done: 0 };
  P.rows.forEach(function (row) {
    var od = cDate >= 0 ? fmsDate_(row.cells[cDate]) : null, o = cOut >= 0 ? outletByAny_(row.cells[cOut]) : null;
    var base = { order: cId >= 0 ? str_(row.cells[cId]) : '', outlet: o ? o.name : (cOut >= 0 ? str_(row.cells[cOut]) : ''), items: cItems >= 0 ? str_(row.cells[cItems]) : '',
      by: cBy >= 0 ? str_(row.cells[cBy]).replace(/\s*\(\d+\)\s*$/, '') : '', date: od ? fmt_(od, 'dd MMM') : '' };
    var inWeek = false;
    row.steps.forEach(function (x, k) {
      if (steps[k].unused) return;
      var pl = x.planned, t = pl ? pl.getTime() : 0, doneT = x.actual ? x.actual.getTime() : 0;
      var plannedWeek = t >= wFrom && t <= wTo, doneWeek = x.st === 'done' && doneT >= wFrom && doneT <= wTo;
      if (!plannedWeek && !doneWeek) return;
      inWeek = true;
      var S0 = steps[k];
      if (x.st === 'done') { if (doneWeek) { week.done++; S0.done++; if (iso_(x.actual) === today) day.done++; } return; }
      if (!plannedWeek) return;
      var late = t < now, isToday = iso_(pl) === today;
      week.planned++; S0.planned++;
      if (late) { week.overdue++; S0.overdue++; } else { week.pending++; S0.pending++; }
      if (isToday) { if (late) day.overdue++; else day.pending++; }
      list.push(Object.assign({ step: P.steps[k].name, stepNo: k + 1, of: P.steps.length, planned: fmsWhen_(pl), t: t, today: isToday,
        state: late ? 'overdue' : 'pending', late: late ? fmsLateText_(Math.round((now - t) / 3600000)) : '' }, base));
    });
    if (inWeek && base.order && !orders[base.order]) { orders[base.order] = 1; week.orders++; }
  });
  list.sort(function (a, b) { return a.t - b.t; });
  return { name: f.name, weekFrom: iso_(mon), weekTo: iso_(addDays_(mon, 6)), weekText: fmt_(mon, 'dd MMM') + ' – ' + fmt_(addDays_(mon, 6), 'dd MMM'),
    week: week, today: day, pending: day.pending, overdue: week.overdue, list: list.slice(0, 300), more: Math.max(0, list.length - 300),
    steps: steps.filter(function (s) { return !s.unused; }) };
}

function dirDsrOutlets_(ctx) {
  return ctx.outlets.map(outletById_).filter(function (o) { return o && o.dsrTab; })
    .sort(function (a, b) { return (outletRun_(b) - outletRun_(a)) || dirLocSort_(a.name, b.name); });
}
function dirDsrRows_(o, month) {
  var cols = dsrCols_(o), sh = dsrSheet_(o), lc = sh.getLastColumn(), lr = sh.getLastRow();
  var H = sh.getRange(1, 1, 1, lc).getValues()[0].map(str_), di = col_(H, ['Date']), rows = [];
  if (lr > 1 && di >= 0) {
    sh.getRange(2, 1, Math.min(lr - 1, 500), lc).getValues().forEach(function (r) {
      var k = dsrKey_(r[di]);
      if (!k || k.substring(0, 7) !== month) return;
      var rec = { dateKey: k, dateText: fmt_(isoToDate_(k), 'EEE dd MMM') };
      cols.forEach(function (c) {
        var j = H.indexOf(c.header), v = j >= 0 ? r[j] : '';
        rec[c.key] = c.type === 'currency' || c.type === 'number' ? (str_(v) === '' ? '' : num_(v)) : v instanceof Date ? fmt_(v, 'dd/MM/yyyy hh:mm a') : str_(v);
      });
      rows.push(rec);
    });
  }
  rows.sort(function (a, b) { return b.dateKey.localeCompare(a.dateKey); });
  return { cols: cols, rows: rows };
}
function dirMonth_(v) { return /^\d{4}-\d{2}$/.test(str_(v)) ? str_(v) : fmt_(new Date(), 'yyyy-MM'); }
function dirDsr_(ctx, d) {
  dirCan_(ctx);
  var outs = dirDsrOutlets_(ctx);
  var o = outs.filter(function (x) { return x.id === str_(d.outletId); })[0] || outs.filter(function (x) { return /^pandri$/i.test(x.name); })[0] || outs[0];
  if (!o) throw new Error('No outlet has a DSR tab (Outlets ▸ DSR Tab).');
  var month = dirMonth_(d.month), R = dirDsrRows_(o, month), totals = {};
  R.cols.forEach(function (c) {
    if (c.type !== 'currency' && c.type !== 'number') return;
    if (/^avg/i.test(c.key)) return;
    totals[c.key] = round_(R.rows.reduce(function (s, r) { return s + (Number(r[c.key]) || 0); }, 0), 2);
  });
  var have = {}, missing = [], first = isoToDate_(month + '-01'), last = addDays_(new Date(), -1);
  R.rows.forEach(function (r) { have[r.dateKey] = 1; });
  for (var dt = first; dt <= last && fmt_(dt, 'yyyy-MM') === month; dt = addDays_(dt, 1)) if (!have[iso_(dt)]) missing.push(fmt_(dt, 'dd MMM'));
  return { outletId: o.id, outlet: o.name, outlets: outs.map(function (x) { return { id: x.id, name: x.name }; }), month: month, monthText: fmt_(first, 'MMMM yyyy'),
    cols: R.cols.map(function (c) { return { key: c.key, header: c.header, section: c.section || '', type: c.type }; }), rows: R.rows, totals: totals, missing: missing };
}

function dirExp_(ctx, d) {
  dirCan_(ctx);
  var month = dirMonth_(d.month);
  var outs = dirDsrOutlets_(ctx).filter(outletRun_).map(function (o) {
    try {
      var days = dirDsrRows_(o, month).rows.map(function (r) {
        var cash = Number(r.cashExp) || 0, upi = Number(r.upiExp) || 0;
        return { dateKey: r.dateKey, dateText: r.dateText, cash: cash, upi: upi, total: Number(r.expenses) || round_(cash + upi, 2), by: r.submittedBy || '' };
      }).filter(function (x) { return x.total || x.cash || x.upi; });
      var t = days.reduce(function (s, x) { s.cash += x.cash; s.upi += x.upi; s.total += x.total; return s; }, { cash: 0, upi: 0, total: 0 });
      return { id: o.id, name: o.name, total: round_(t.total, 2), cash: round_(t.cash, 2), upi: round_(t.upi, 2), days: days };
    } catch (e) { return { id: o.id, name: o.name, error: e.message, total: 0, cash: 0, upi: 0, days: [] }; }
  });
  var rec = null;
  try { rec = expList_(ctx, { outletId: 'ALL', month: month }); } catch (e) { rec = null; }
  return { month: month, monthText: fmt_(isoToDate_(month + '-01'), 'MMMM yyyy'), outlets: outs, recorded: rec };
}

function dirGrn_(ctx, d) {
  dirCan_(ctx);
  var from = str_(d.from) || iso_(addDays_(new Date(), -30)), to = str_(d.to) || todayIso_(), locs = {}, order = [];
  function L(id, name) {
    if (!locs[id]) { locs[id] = { id: id, name: name || dirLoc_(id), grn: [], bills: {}, veg: {}, totals: { grn: 0, short: 0, bills: 0, billAmount: 0, veg: 0, vegAmount: 0 } }; order.push(id); }
    return locs[id];
  }
  var want = ['pandri', 'chanderi', 'gfp'];
  outlets_().filter(function (o) { return want.indexOf(norm_(o.name)) >= 0; })
    .sort(function (a, b) { return want.indexOf(norm_(a.name)) - want.indexOf(norm_(b.name)); })
    .forEach(function (o) { L(o.id, o.name); });
  function inRange(v) { var k = iso_(v); return k && k >= from && k <= to; }
  readObjs_(SH.GRN).forEach(function (r) {
    if (!inRange(r['GRN Date'])) return;
    var x = L(str_(r['Outlet ID']), str_(r['Outlet']));
    x.grn.push({ no: str_(r['GRN No']), date: fmt_(r['GRN Date']), dateKey: iso_(r['GRN Date']), orderNo: str_(r['Order No']), lines: num_(r['Lines']),
      ordered: num_(r['Total Ordered']), received: num_(r['Total Received']), short: num_(r['Short']), by: str_(r['Entered By Name']), remarks: str_(r['Remarks']) });
    x.totals.grn++; x.totals.short += num_(r['Short']);
  });
  readObjs_(SH.STOCK_REG).forEach(function (r) {
    if (!inRange(r['Date'])) return;
    var x = L(str_(r['Outlet ID']), str_(r['Outlet'])), k = (str_(r['Bill Number']) || str_(r['Entry ID'])) + '|' + iso_(r['Date']) + '|' + str_(r['Party Name']);
    var b = x.bills[k] || (x.bills[k] = { billNo: str_(r['Bill Number']), date: fmt_(r['Date']), dateKey: iso_(r['Date']), party: str_(r['Party Name']), items: 0, amount: 0, by: str_(r['Entered By Name']), lines: [] });
    b.items++; b.amount += num_(r['Amount']);
    b.lines.push({ item: str_(r['Item']), qty: num_(r['Qty']), unit: str_(r['Unit']), amount: num_(r['Amount']) });
  });
  readObjs_(SH.VEG_ORDERS).forEach(function (r) {
    if (str_(r['Status']) === 'Pending' || !inRange(r['Received At'] || r['Order Date'])) return;
    var x = L(str_(r['Outlet ID']), str_(r['Outlet'])), id = str_(r['Order ID']);
    var v = x.veg[id] || (x.veg[id] = { id: id, date: fmt_(r['Received At'] || r['Order Date']), dateKey: iso_(r['Received At'] || r['Order Date']), party: str_(r['Party Name']), bill: str_(r['Bill Number']), lines: 0, amount: 0, by: str_(r['Received By']) });
    v.lines++; v.amount += num_(r['Amount']);
  });
  return { from: from, to: to, locs: order.map(function (id) {
    var x = locs[id], bills = Object.keys(x.bills).map(function (k) { var b = x.bills[k]; b.amount = round_(b.amount, 2); return b; }),
      veg = Object.keys(x.veg).map(function (k) { var v = x.veg[k]; v.amount = round_(v.amount, 2); return v; });
    var byDate = function (a, b) { return String(b.dateKey).localeCompare(String(a.dateKey)); };
    x.totals.bills = bills.length; x.totals.billAmount = round_(bills.reduce(function (s, b) { return s + b.amount; }, 0), 2);
    x.totals.veg = veg.length; x.totals.vegAmount = round_(veg.reduce(function (s, v) { return s + v.amount; }, 0), 2); x.totals.short = round_(x.totals.short, 3);
    return { id: x.id, name: x.name, totals: x.totals, grn: x.grn.sort(byDate), bills: bills.sort(byDate), veg: veg.sort(byDate) };
  }) };
}

function dirFoodDay_(t) {
  var d = new Date(t - setNum_('Food Closing Day Start Hour', 3) * 3600000);
  return iso_(d);
}
function dirFoodRead_() {
  var id = setRaw_('Food Closing Sheet ID');
  if (!id) throw new Error('Settings ▸ Food Closing Sheet ID is empty.');
  var E = extRead_(id, set_('Food Closing Tab', 'Stock Closing'), { headerRow: 1, lastN: 3000, cache: 120, fam: 'food' });
  var L = extRead_(id, set_('Food Closing Lines Tab', 'Stock Closing Records'), { headerRow: 1, lastN: 20000, cache: 120, fam: 'food' });
  var e = { at: col_(E.head, ['Timestamp']), id: col_(E.head, ['Entry ID']), by: col_(E.head, ['Entered By']), shift: col_(E.head, ['Shift']), kitchen: col_(E.head, ['Kitchen']) };
  var l = { id: col_(L.head, ['Entry ID']), sno: col_(L.head, ['SNo.', 'SNo']), code: col_(L.head, ['Item Code']), name: col_(L.head, ['Item Name']),
    unit: col_(L.head, ['Unit']), qty: col_(L.head, ['Qty']), photo: col_(L.head, ['Photo']) };
  if (e.id < 0 || l.id < 0) throw new Error('The Food Closing sheet needs "Entry ID" on its Stock Closing and Stock Closing Records tabs.');
  var lines = {};
  L.rows.forEach(function (r) {
    var k = str_(r[l.id]); if (!k) return;
    (lines[k] = lines[k] || []).push({ sno: l.sno >= 0 ? num_(r[l.sno]) : 0, code: l.code >= 0 ? str_(r[l.code]) : '', name: l.name >= 0 ? str_(r[l.name]) : '',
      unit: l.unit >= 0 ? str_(r[l.unit]).toUpperCase() : '', qty: l.qty >= 0 ? num_(r[l.qty]) : 0, photo: l.photo >= 0 ? str_(r[l.photo]) : '' });
  });
  return E.rows.map(function (r) {
    var k = str_(r[e.id]), at = e.at >= 0 ? parseAny_(r[e.at]) : null;
    if (!k || !at) return null;
    var ls = (lines[k] || []).sort(function (a, b) { return a.sno - b.sno; });
    return { id: k, t: at.getTime(), day: dirFoodDay_(at.getTime()), at: fmt_(at, 'dd MMM yyyy, hh:mm a'), by: e.by >= 0 ? str_(r[e.by]) : '',
      shift: e.shift >= 0 ? str_(r[e.shift]) : '', kitchen: (e.kitchen >= 0 ? str_(r[e.kitchen]) : '') || 'Main Kitchen', lines: ls };
  }).filter(Boolean);
}
function dirQty_(byUnit) {
  var out = [];
  Object.keys(byUnit).sort().forEach(function (u) {
    var q = byUnit[u];
    if (u === 'GRM' || u === 'GM' || u === 'G') out.push(round_(q / 1000, 2) + ' kg');
    else if (u === 'ML') out.push(round_(q / 1000, 2) + ' ltr');
    else out.push(round_(q, 2) + ' ' + (u || '').toLowerCase());
  });
  return out.join(' · ') || '0';
}
function dirFood_(ctx, d) {
  dirCan_(ctx);
  var to = /^\d{4}-\d{2}-\d{2}$/.test(str_(d.to)) ? str_(d.to) : dirFoodDay_(Date.now()), from = /^\d{4}-\d{2}-\d{2}$/.test(str_(d.from)) ? str_(d.from) : iso_(addDays_(isoToDate_(to), -6));
  if (from > to) { var x0 = from; from = to; to = x0; }
  var want = str_(d.kitchen), shift = str_(d.shift), today = dirFoodDay_(Date.now());
  var all = dirFoodRead_(), kitchens = uniq_(all.map(function (x) { return x.kitchen; })).sort(), shifts = uniq_(all.map(function (x) { return x.shift; }).filter(String)).sort();
  var rows = all.filter(function (x) { return x.day >= from && x.day <= to && (!want || x.kitchen === want) && (!shift || x.shift === shift); }).sort(function (a, b) { return b.t - a.t; });
  var byKitchen = {}, byUnit = {}, items = {}, noPhoto = 0, lineCount = 0;
  rows.forEach(function (x) {
    byKitchen[x.kitchen] = (byKitchen[x.kitchen] || 0) + 1;
    x.qty = {};
    x.lines.forEach(function (l) {
      lineCount++;
      if (!l.photo) noPhoto++;
      byUnit[l.unit] = (byUnit[l.unit] || 0) + l.qty;
      x.qty[l.unit] = (x.qty[l.unit] || 0) + l.qty;
      var k = l.code || norm_(l.name), it = items[k] || (items[k] = { code: l.code, name: l.name, unit: l.unit, qty: 0, times: 0, last: '' });
      it.qty += l.qty; it.times++; if (!it.last) it.last = x.at;
    });
    x.qtyText = dirQty_(x.qty); delete x.qty;
  });
  var todayRows = all.filter(function (x) { return x.day === today && (!want || x.kitchen === want); });
  var itemList = Object.keys(items).map(function (k) { var it = items[k]; it.qty = round_(it.qty, 2); it.qtyText = dirQty_((function () { var o = {}; o[it.unit] = it.qty; return o; })()); return it; })
    .sort(function (a, b) { return b.times - a.times || a.name.localeCompare(b.name); });
  return { from: from, to: to, today: today, kitchens: kitchens, shifts: shifts, kitchen: want, shift: shift,
    cards: { closings: rows.length, byKitchen: Object.keys(byKitchen).sort().map(function (k) { return { name: k, count: byKitchen[k] }; }),
      today: todayRows.length, todayList: todayRows.map(function (x) { return x.kitchen + ' · ' + x.shift; }),
      qtyText: dirQty_(byUnit), items: itemList.length, lines: lineCount, noPhoto: noPhoto },
    rows: rows.slice(0, 200), more: Math.max(0, rows.length - 200), items: itemList };
}

function dirCashId_() {
  var id = setRaw_('Cash Management Sheet ID');
  if (!id) throw new Error('Settings ▸ Cash Management Sheet ID is empty.');
  return id;
}
function dirCashTab_(id, tab, n) {
  var t = extRead_(id, tab, { headerRow: 1, lastN: n || 0, cache: 120, fam: 'cash' });
  return t.rows.map(function (r) { var o = {}; t.head.forEach(function (h, i) { if (h) o[h] = r[i]; }); return o; })
    .filter(function (o) { return Object.keys(o).some(function (k) { return str_(o[k]) !== ''; }); });
}
function dirCashKey_(v) { if (v instanceof Date) return iso_(v); var m = str_(v).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[0] : iso_(parseAny_(v)); }
function dirCashMeta_(id) {
  var set = {};
  dirCashTab_(id, 'Settings').forEach(function (r) { set[str_(r.Key)] = str_(r.Value); });
  var counters = dirCashTab_(id, 'Counters').filter(function (c) { return !/inactive/i.test(str_(c.Status)); })
    .map(function (c) { return { id: str_(c.CounterID), name: str_(c.CounterName) || str_(c.CounterID) }; });
  return { set: set, counters: counters, store: set.STORE_NAME || 'Cash Management', cur: set.CURRENCY || '₹', rollover: Number(set.DAY_ROLLOVER_HOUR || 4) || 4,
    shifts: [{ n: 1, label: set.SHIFT1_LABEL || 'Shift 1' }, { n: 2, label: set.SHIFT2_LABEL || 'Shift 2' }] };
}
function dirCashEntry_(h, counters) {
  var rec = str_(h.ReceivedAmount) !== '', c = counters.filter(function (x) { return x.id === str_(h.CounterID); })[0];
  var total = round_(num_(h.TotalAmount), 2), got = rec ? round_(num_(h.ReceivedAmount), 2) : null;
  return { id: str_(h.EntryID), date: dirCashKey_(h.BusinessDate), shift: num_(h.Shift), counterId: str_(h.CounterID), counter: c ? c.name : (str_(h.CounterName) || str_(h.CounterID)),
    type: str_(h.EntryType).toUpperCase(), declared: total, received: got, amount: got === null ? total : got,
    difference: str_(h.Difference) === '' ? null : round_(num_(h.Difference), 2), status: str_(h.Status) || 'Pending',
    by: str_(h.EnteredByName) || str_(h.EnteredBy), at: str_(h.EnteredAt), acceptedBy: str_(h.AcceptedByName) || str_(h.AcceptedBy), acceptedAt: str_(h.AcceptedAt),
    remarks: str_(h.Remarks), officeRemarks: str_(h.OfficeRemarks) };
}
function dirCashSum_(list) {
  var t = { opening: 0, closing: 0, short: 0, excess: 0, pending: 0, returned: 0, entries: list.length };
  list.forEach(function (e) {
    if (e.type === 'OPENING') t.opening += e.amount; else t.closing += e.amount;
    if (e.difference !== null) { if (e.difference < 0) t.short += -e.difference; else t.excess += e.difference; }
    if (/^pending$/i.test(e.status)) t.pending++;
    if (/^returned$/i.test(e.status)) t.returned++;
  });
  ['opening', 'closing', 'short', 'excess'].forEach(function (k) { t[k] = round_(t[k], 2); });
  t.net = round_(t.closing - t.opening, 2);
  return t;
}
function dirCash_(ctx, d) {
  dirCan_(ctx);
  var id = dirCashId_(), M = dirCashMeta_(id), ok = /^\d{4}-\d{2}-\d{2}$/;
  var bday = iso_(new Date(Date.now() - M.rollover * 3600000));
  var all = dirCashTab_(id, 'CashHeader').filter(function (h) { return str_(h.EntryID); }).map(function (h) { return dirCashEntry_(h, M.counters); });
  var out = { store: M.store, cur: M.cur, shifts: M.shifts, counters: M.counters, businessDate: bday };
  if (str_(d.mode) === 'range') {
    var to = ok.test(str_(d.to)) ? str_(d.to) : bday, from = ok.test(str_(d.from)) ? str_(d.from) : iso_(addDays_(isoToDate_(to), -6));
    if (from > to) { var x0 = from; from = to; to = x0; }
    var sel = all.filter(function (e) { return e.date >= from && e.date <= to; }), byDay = {};
    sel.forEach(function (e) { (byDay[e.date] = byDay[e.date] || []).push(e); });
    out.mode = 'range'; out.from = from; out.to = to;
    out.days = Object.keys(byDay).sort().reverse().map(function (k) { var t = dirCashSum_(byDay[k]); t.date = k; t.dateText = fmt_(isoToDate_(k), 'EEE dd MMM'); return t; });
    out.totals = dirCashSum_(sel);
    out.entries = sel.sort(function (a, b) { return b.date.localeCompare(a.date) || a.shift - b.shift || a.counterId.localeCompare(b.counterId) || a.type.localeCompare(b.type); }).slice(0, 300);
    return out;
  }
  var day = ok.test(str_(d.date)) ? str_(d.date) : bday, list = all.filter(function (e) { return e.date === day; });
  out.mode = 'day'; out.date = day; out.dateText = fmt_(isoToDate_(day), 'EEEE dd MMMM yyyy');
  out.slots = [];
  M.shifts.forEach(function (sh) {
    M.counters.forEach(function (c) {
      var pick = function (type) { return list.filter(function (e) { return e.shift === sh.n && e.counterId === c.id && e.type === type; })[0] || null; };
      var op = pick('OPENING'), cl = pick('CLOSING');
      out.slots.push({ shift: sh.n, shiftLabel: sh.label, counterId: c.id, counter: c.name, opening: op, closing: cl, net: op && cl ? round_(cl.amount - op.amount, 2) : null });
    });
  });
  out.totals = dirCashSum_(list);
  out.waiting = all.filter(function (e) { return /^(pending|returned)$/i.test(e.status) && e.date < day; }).length;
  return out;
}
function dirCashLines_(ctx, d) {
  dirCan_(ctx);
  var id = dirCashId_(), M = dirCashMeta_(id), key = str_(d.id);
  var h = dirCashTab_(id, 'CashHeader').filter(function (x) { return str_(x.EntryID) === key; })[0];
  if (!h) throw new Error('Entry ' + key + ' was not found.');
  var den = {};
  dirCashTab_(id, 'Denominations').forEach(function (x) { den[str_(x.DenomID)] = { label: str_(x.Label), value: num_(x.Value), type: str_(x.Type), sort: num_(x.SortOrder) }; });
  var lines = dirCashTab_(id, 'CashRecords').filter(function (r) { return str_(r.EntryID) === key; }).map(function (r) {
    var dd = den[str_(r.DenomID)] || { label: str_(r.DenomID), value: 0, type: '', sort: 99 };
    var dc = str_(r.DeclaredCount) === '' ? null : num_(r.DeclaredCount), ac = str_(r.AcceptedCount) === '' ? null : num_(r.AcceptedCount);
    return { label: dd.label, value: dd.value, type: dd.type, sort: dd.sort, declared: dc, accepted: ac,
      declaredAmount: dc === null ? null : round_(dc * dd.value, 2), acceptedAmount: ac === null ? null : round_(ac * dd.value, 2) };
  }).sort(function (a, b) { return a.sort - b.sort; });
  return { entry: dirCashEntry_(h, M.counters), lines: lines, cur: M.cur };
}

function dirCalling_(ctx, d) {
  dirCan_(ctx);
  var from = str_(d.from) || iso_(addDays_(new Date(), -6)), to = str_(d.to) || todayIso_();
  var rows = hrdCallRows_(), sel = [], ivs = [];
  rows.forEach(function (x) {
    var k = x.d ? iso_(x.d) : '';
    if (k && k >= from && k <= to) sel.push(x);
    if (/interview/i.test(x.st)) { var iv = hrdCallDate_(x.iv, x.d), ik = iv ? iso_(iv) : ''; if (ik && ik >= from && ik <= to) ivs.push({ name: x.name, pos: x.pos, by: x.by, when: fmt_(iv, 'EEE dd MMM'), k: ik }); }
  });
  var per = {};
  sel.forEach(function (x) { var k = iso_(x.d); per[k] = (per[k] || 0) + 1; });
  ivs.sort(function (a, b) { return a.k < b.k ? -1 : 1; });
  return { from: from, to: to, total: sel.length, interviews: ivs.length, interviewList: ivs.slice(0, 100),
    byStatus: hrdCount_(sel, function (x) { return x.st; }, 10), byCaller: hrdCount_(sel, function (x) { return x.by || 'Not filled'; }, 10),
    byPos: hrdCount_(sel, function (x) { return x.pos.toLowerCase(); }, 10),
    days: Object.keys(per).sort().reverse().map(function (k) { return { label: fmt_(isoToDate_(k), 'EEE dd MMM'), count: per[k] }; }) };
}

var EV_READ = ['auth.resume', 'ui.bundle', 'dash.load', 'dash.home', 'chk.my', 'chk.overview', 'chk.tasks', 'chk.scores', 'chk.mine', 'chk.users', 'task.mine', 'task.sent', 'task.users',
  'prof.me', 'req.meta', 'req.mine', 'req.preview', 'req.file', 'appr.load', 'appr.hub', 'appr.track', 'appr.hrPreview', 'appr.staff', 'ord.catalog', 'ord.history', 'ord.lines',
  'veg.items', 'veg.pending', 'veg.order', 'veg.history', 'veg.month', 'stock.picker', 'stock.list', 'grn.orders', 'grn.load', 'grn.history', 'grn.lines', 'prod.report', 'prep.meta',
  'close.form', 'close.list', 'exp.meta', 'exp.list', 'att.day', 'att.month', 'leave.list', 'adv.list', 'ros.load', 'ros.day', 'ros.summary', 'ros.dayReport', 'emp.shifts',
  'rep.meta', 'rep.advances', 'rep.leaves', 'rep.ot', 'cert.list', 'dsr.form', 'emp.stats', 'emp.search', 'emp.pending', 'emp.assets', 'emp.changes', 'emp.salary', 'emp.log',
  'emp.docView', 'hrd.att', 'hrd.hire', 'tk.meta', 'tk.list', 'tk.get', 'fms.list', 'fms.load', 'at.boot', 'at.data', 'at.employees', 'at.history', 'at.table', 'at.hub', 'at.report',
  'pen.meta', 'pen.board', 'pen.charges', 'pen.summary', 'pen.list', 'pen.report', 'pay.meta', 'pay.preview', 'slip.meta', 'slip.load', 'slip.model', 'poster.config', 'poster.sections',
  'apps.mine', 'vault.mine', 'file.view', 'dir.calling', 'oa.boot', 'oa.read', 'dir.home', 'dir.chk', 'dir.chkUsers', 'dir.orders', 'dir.fms', 'dir.dsr', 'dir.exp', 'dir.grn',
  'dlg.list', 'dir.food', 'dir.cash', 'dir.cashLines'];
function evCan_(ctx) { var r = norm_(ctx.role); return !!ctx.super && (r === 'director' || r === 'misadmin'); }
function evSwitch_(ctx, uid, action) {
  if (!evCan_(ctx)) throw new Error('Employee View is for MIS and the Directors.');
  if (EV_READ.indexOf(action) < 0) throw new Error('Employee View is view only — this step needs that person\'s own login.');
  var t = buildCtx_(uid, false);
  if (!t) throw new Error('That login is not active.');
  return Object.assign({}, t, { viewer: ctx.uid, viewerName: ctx.name });
}
function evList_(ctx) {
  if (!evCan_(ctx)) throw new Error('Employee View is for MIS and the Directors.');
  var acc = {};
  readObjs_(SH.ACCESS).forEach(function (r) { acc[str_(r['User ID'])] = r; });
  var list = readObjs_(SH.LOGIN).filter(function (r) { return /^active$/i.test(str_(r['Status'])) && str_(r['User ID']) && str_(r['User ID']) !== ctx.uid; }).map(function (r) {
    var a = acc[str_(r['User ID'])] || {}, e = empById_(str_(r['Employee ID']));
    var o = outletByAny_(a['Home Outlet']) || (e && e.outletId ? outletById_(e.outletId) : null);
    return { uid: str_(r['User ID']), name: str_(r['Full Name']), empId: str_(r['Employee ID']), role: str_(a['Role']) || 'Staff', designation: e ? e.designation : '',
      dept: e ? e.department : '', place: o ? o.name : '', last: str_(r['Last Login']) };
  }).filter(function (u) { return u.name; });
  list.sort(function (a, b) { return a.name.localeCompare(b.name); });
  var places = uniq_(list.map(function (u) { return u.place; }).filter(String)).sort(), roles = uniq_(list.map(function (u) { return u.role; })).sort();
  return { list: list, places: places, roles: roles };
}
function evBoot_(ctx, d) {
  if (!evCan_(ctx)) throw new Error('Employee View is for MIS and the Directors.');
  var t = buildCtx_(str_(d.uid), false);
  if (!t) throw new Error('That login is not active.');
  var b = bootstrap_(t);
  b.viewAs = { uid: t.uid, name: t.name, title: t.roleTitle };
  return b;
}
