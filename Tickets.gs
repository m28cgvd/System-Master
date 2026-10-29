/*************************************************************************
 *  Tickets.gs — Issues: raised from a checklist task, a delegated task or
 *  the Issues card, assigned to a person and marked done.
 *    General issues ....... the "Tickets" tab of this spreadsheet (CGT-0001 …)
 *    Checklist issues ..... the outlet's Tickets Tracker sheet (TKT-0001 …)
 *  Admins (Director, MIS, EA, PC) see every issue; an Outlet Incharge sees
 *  his outlet's; everyone else at HQ / GFP sees their department's.
 *************************************************************************/

var TK_CLOSED_RE = /^(close|closed|auto[\s-]*closed.*|resolved|done)$/i;
var TK_PRIOS = ['High', 'Mid', 'Low'];

/* ============================ SOURCES ============================ */
/** Outlet Tickets Trackers from Settings: [{ outletId, outlet, ssId, key }] */
function tkTrackers_() {
  if (__M.tkTr) return __M.tkTr;
  var map = settings_(), out = [];
  Object.keys(map).forEach(function (k) {
    var m = /^tickets tracker \((.+)\)$/.exec(k); if (!m || !str_(map[k])) return;
    var o = outletByAny_(m[1]), id = fmsId_(map[k]);
    if (o && id) out.push({ outletId: o.id, outlet: o.name, ssId: id, key: o.id });
  });
  __M.tkTr = out;
  return out;
}
function tkTrackerOf_(outletId) { return tkTrackers_().filter(function (t) { return t.outletId === outletId; })[0] || null; }
function tkTab_() { return set_('Tickets Tracker Tab', 'Tickets'); }
function tkCols_(H) {
  return { id: col_(H, ['Ticket ID']), ts: col_(H, ['Date / Time', 'Timestamp']), name: col_(H, ['Name']), email: col_(H, ['Email']),
    dept: col_(H, ['Department']), taskId: col_(H, ['Task ID']), freq: col_(H, ['Freq']), task: col_(H, ['Task Description']),
    planned: col_(H, ['Planned Date']), type: col_(H, ['Issue Type']), remarks: col_(H, ['Remarks / Reason', 'Remarks']),
    photo: col_(H, ['Attachment (Photo Link)', 'Attachment']), status: col_(H, ['Ticket Status']), assigned: col_(H, ['Assigned To']),
    prio: col_(H, ['Issue Priority']), planRes: col_(H, ['Planned Date for Resolve Issue']), actRes: col_(H, ['Actual Date for Resolve Issue']) };
}

/* ============================ WHO ============================ */
var TK_ADMIN_DES = ['Process Coordinator', 'Process Coordinator (PC)', 'PC', 'Executive Assistant', 'Executive Assistant (EA)', 'EA'];
function tkWide_(ctx) {
  var r = norm_(ctx.role);
  if (ctx.super || r === 'director' || r === 'misadmin') return true;
  var des = norm_(ctx.designation);
  if (!des) return false;
  return list_(set_('Ticket Tracker Designations', 'Process Coordinator (PC), Process Coordinator, Executive Assistant, EA')).concat(TK_ADMIN_DES)
    .some(function (x) { return norm_(x) === des; });
}
function tkInc_(ctx) { return norm_(ctx.role) === 'outletincharge' && (ctx.runOutlets || ctx.outlets || []).length > 0; }
function tkIncOutlets_(ctx) { return tkInc_(ctx) ? (ctx.runOutlets || ctx.outlets || []) : []; }
function tkCard_(ctx) { return tkWide_(ctx) || tkInc_(ctx) || (!!ctx.home && ctx.homeType !== 'Outlet'); }
function tkCanTrack_(ctx) { return tkWide_(ctx) || tkInc_(ctx); }
function tkManages_(ctx, t) {
  if (tkWide_(ctx)) return true;
  return !!t.outletId && tkIncOutlets_(ctx).indexOf(t.outletId) >= 0;
}
function tkDeptOf_(name) {
  var k = norm_(name); if (!k) return '';
  if (!__M.tkDept) {
    var m = {};
    employees_().forEach(function (e) {
      if (/inactive|left/i.test(e.status || '')) return;
      var n = norm_(e.name), o = e.outletId ? outletById_(e.outletId) : null, head = !o || o.type !== 'Outlet';
      if (!m[n] || (head && !m[n].head)) m[n] = { dept: e.department, head: head };
    });
    __M.tkDept = m;
  }
  return (__M.tkDept[k] || {}).dept || '';
}
function tkSees_(ctx, t) {
  if (tkWide_(ctx) || t.mine || t.forMe) return true;
  if (t.outletId && tkIncOutlets_(ctx).indexOf(t.outletId) >= 0) return true;
  var dept = norm_(ctx.department);
  if (!dept || !tkCard_(ctx)) return false;
  if (t.assigned && norm_(tkDeptOf_(t.assigned)) === dept) return true;
  return norm_(t.dept) === dept && !!t.fromId && t.fromId === ctx.home;
}
function tkFlags_(ctx, t, match) {
  var me = ctx.uid, myEmp = str_(ctx.empId).toUpperCase();
  t.mine = (t.src === 'hub' && (t.uid === me || (myEmp && t.empId.toUpperCase() === myEmp))) || (t.src !== 'hub' && !!norm_(ctx.name) && norm_(t.name) === norm_(ctx.name));
  t.forMe = !!t.assigned && (match || tkMatcher_())(t.assigned, t.outletId) === me;
  t.manage = tkManages_(ctx, t);
  t.canClose = !t.closed && (t.manage || t.forMe);
  t.canAssign = !t.closed && t.manage;
  return t;
}
function tkMatcher_() {
  if (__M.tkPm) return __M.tkPm;
  var pm = null, memo = {};
  __M.tkPm = function (name, outletId) {
    var k = norm_(name) + '|' + (outletId || '');
    if (!norm_(name)) return '';
    if (memo[k] !== undefined) return memo[k];
    if (!pm) pm = personMatcher_();
    var m = pm.match({ name: name, outletId: outletId });
    return (memo[k] = m ? m.uid : '');
  };
  return __M.tkPm;
}

/* ============================ READ ============================ */
function tkDate_(v) { return v instanceof Date ? v : parseAny_(v); }
function tkStage_(t) {
  if (t.closed) return 'closed';
  if (!t.assigned) return 'new';
  if (t.planResKey && t.planResKey < todayIso_()) return 'overdue';
  return 'assigned';
}
function tkFinish_(t) {
  t.closed = TK_CLOSED_RE.test(t.status);
  t.stage = tkStage_(t);
  t.key = t.src + '|' + t.id;
  return t;
}
/** General tickets (this spreadsheet). */
function tkHubRows_() {
  var out = [];
  try {
    readObjs_(SH.TICKETS).forEach(function (r) {
      var id = str_(r['Ticket ID']); if (!id) return;
      var at = tkDate_(r['Date / Time']), pr = tkDate_(r['Planned Date for Resolve Issue']), ac = tkDate_(r['Actual Date for Resolve Issue']);
      var o = outletById_(str_(r['Outlet ID'])) || outletByAny_(r['Location']), fr = outletByAny_(r['Location']) || o;
      out.push(tkFinish_({ src: 'hub', srcName: 'General', id: id, row: r._row, at: at ? at.getTime() : 0, atText: at ? fmt_(at, 'dd/MM/yyyy hh:mm a') : '',
        name: str_(r['Name']), empId: str_(r['Employee ID']), uid: str_(r['User ID']), email: str_(r['Email']), designation: str_(r['Designation']),
        dept: str_(r['Department']), location: str_(r['Location']), outletId: o ? o.id : '', outlet: o ? o.name : str_(r['Location']), fromId: fr ? fr.id : '',
        type: str_(r['Issue Type']), subject: str_(r['Subject']), details: str_(r['Remarks / Reason']), photo: str_(r['Attachment (Photo Link)']),
        taskId: '', task: '', planned: '', status: str_(r['Ticket Status']) || 'OPEN', assigned: str_(r['Assigned To']), priority: str_(r['Issue Priority']),
        planResKey: pr ? iso_(pr) : '', planResText: pr ? fmt_(pr, 'dd/MM/yyyy') : '', actualText: ac ? fmt_(ac, 'dd/MM/yyyy hh:mm a') : '',
        note: str_(r['Resolution Note']), from: str_(r['Raised From']) }));
    });
  } catch (e) {}
  return out;
}
/** Checklist tickets of one outlet tracker. opt.fresh: read the sheet itself (writes). */
function tkTrackerRows_(T, opt) {
  opt = opt || {};
  var R = opt.fresh ? extRead_(T.ssId, tkTab_(), { headerRow: 1 }) : extRead_(T.ssId, tkTab_(), { headerRow: 1, cache: 90, fam: 'tk' });
  var c = tkCols_(R.head), out = [];
  if (c.id < 0) throw new Error('No "Ticket ID" column on the ' + T.outlet + ' Tickets Tracker.');
  R.rows.forEach(function (r, i) {
    var id = str_(r[c.id]); if (!id) return;
    var g = function (k) { return c[k] >= 0 ? r[c[k]] : ''; };
    var at = tkDate_(g('ts')), pr = tkDate_(g('planRes')), ac = tkDate_(g('actRes')), pl = tkDate_(g('planned'));
    out.push(tkFinish_({ src: T.key, srcName: T.outlet + ' checklist', id: id, row: R.firstRow + i, at: at ? at.getTime() : 0, atText: at ? fmt_(at, 'dd/MM/yyyy hh:mm a') : str_(g('ts')),
      name: str_(g('name')), empId: '', uid: '', email: str_(g('email')), designation: '', dept: str_(g('dept')), location: T.outlet, outletId: T.outletId, outlet: T.outlet, fromId: T.outletId,
      type: str_(g('type')), subject: str_(g('task')), details: str_(g('remarks')), photo: str_(g('photo')), taskId: str_(g('taskId')), freq: str_(g('freq')),
      task: str_(g('task')), planned: pl ? fmt_(pl, 'dd/MM/yyyy hh:mm a') : str_(g('planned')), status: str_(g('status')) || 'OPEN', assigned: str_(g('assigned')),
      priority: str_(g('prio')), planResKey: pr ? iso_(pr) : '', planResText: pr ? fmt_(pr, 'dd/MM/yyyy') : '',
      actualText: ac && ac.getFullYear() > 2000 ? fmt_(ac, 'dd/MM/yyyy hh:mm a') : '', note: '', from: 'Checklist' }));
  });
  return out;
}
function tkAll_(ctx, opt) {
  opt = opt || {};
  var match = tkMatcher_(), errors = [];
  var keepDays = setNum_('Ticket Closed Days Shown', 60), since = Date.now() - keepDays * 86400000;
  var all = tkHubRows_();
  var wide = tkWide_(ctx);
  tkTrackers_().forEach(function (T) {
    try {
      var rows = tkTrackerRows_(T);
      if (!rows.length && wide) errors.push('The ' + T.outlet + ' Tickets Tracker sheet has no issue rows — only its header row. Restore it from File ▸ Version history in that sheet.');
      all = all.concat(rows);
    } catch (e) { errors.push(T.outlet + ': ' + e.message); }
  });
  var out = [];
  all.forEach(function (t) {
    tkFlags_(ctx, t, match);
    if (!tkSees_(ctx, t)) return;
    if (t.closed && t.at && t.at < since && !opt.everything) return;
    out.push(t);
  });
  out.sort(function (a, b) { return (a.closed - b.closed) || (b.at - a.at); });
  return { list: out, errors: errors, wide: wide, inc: tkInc_(ctx) };
}

function tkPeople_() {
  if (__M.tkPeople) return __M.tkPeople;
  var out = [], seen = {};
  function add(x) { var k = norm_(x.name) + '|' + str_(x.id).toUpperCase(); if (!x.name || seen[k]) return; seen[k] = 1; out.push(x); }
  outlets_().filter(function (o) { return o.active !== false && o.type !== 'Outlet'; }).forEach(function (o) {
    empsOfOutlet_(o.id).forEach(function (e) {
      add({ id: e.id, name: e.name, designation: e.designation || '', dept: e.department || '', place: o.name, outletId: o.id, group: o.name + ' · ' + (e.department || 'Other') });
    });
  });
  try {
    var logins = {}; readObjs_(SH.LOGIN).forEach(function (r) { logins[str_(r['User ID'])] = r; });
    var inc = laIncData_().o || {};
    outlets_().filter(function (o) { return o.type === 'Outlet' && inc[o.id] && outletRun_(o); }).forEach(function (o) {
      inc[o.id].forEach(function (uid) {
        var lg = logins[uid]; if (!lg) return;
        var e = empById_(str_(lg['Employee ID']));
        add({ id: str_(lg['Employee ID']) || uid, name: str_(lg['Full Name']) || (e ? e.name : ''), designation: 'Outlet Incharge', dept: 'Outlet Incharge', place: o.name, outletId: o.id, group: 'Outlet Incharge' });
      });
    });
  } catch (e) {}
  employees_().forEach(function (e) {
    if (!/(outlet|store)\s*in-?\s*charge/i.test(e.designation || '') || /inactive|left/i.test(e.status || '')) return;
    var o = e.outletId ? outletById_(e.outletId) : null; if (!o || o.type !== 'Outlet' || !outletRun_(o)) return;
    if (out.some(function (x) { return norm_(x.name) === norm_(e.name); })) return;
    add({ id: e.id, name: e.name, designation: 'Outlet Incharge', dept: 'Outlet Incharge', place: o.name, outletId: o.id, group: 'Outlet Incharge' });
  });
  __M.tkPeople = out;
  return out;
}
function tkPerson_(ctx, id, name) {
  var P = tkPeople_(), k = str_(id).toUpperCase(), n = norm_(name);
  var x = P.filter(function (p) { return k && str_(p.id).toUpperCase() === k; })[0] || P.filter(function (p) { return n && norm_(p.name) === n; })[0];
  if (x) return x;
  throw new Error('Pick the person from the list — an issue goes to a person at HQ, GFP or an Outlet Incharge.');
}

/* ============================ ROUTES ============================ */
function tkMeta_(ctx) {
  var e = ctx.empId ? empById_(ctx.empId) : null, home = ctx.home ? outletById_(ctx.home) : null;
  var places = outlets_().filter(function (o) { return o.active && (o.type !== 'Outlet' || outletRun_(o) || (ctx.outlets || []).indexOf(o.id) >= 0); })
    .map(function (o) { return { id: o.id, name: o.name, tracker: !!tkTrackerOf_(o.id) }; });
  return { types: list_(set_('Ticket Issue Types', 'MAINTENANCE, MATERIAL, OTHER')), places: places, prios: TK_PRIOS,
    me: { name: ctx.name, location: e ? e.location : (home ? home.name : ''), outletId: (e && e.outletId) || ctx.home || '', designation: ctx.designation },
    wide: tkWide_(ctx), inc: tkInc_(ctx), card: tkCard_(ctx), people: tkPeople_() };
}
function tkCounts_(list) {
  var c = { pending: 0, all: list.length, overdue: 0, forMe: 0, mine: 0 };
  list.forEach(function (t) {
    if (!t.closed && t.stage !== 'overdue') c.pending++;
    if (!t.closed && t.stage === 'overdue') c.overdue++;
    if (t.forMe) c.forMe++;
    if (t.mine) c.mine++;
  });
  return c;
}
function tkList_(ctx, d) {
  var key = 'tk_list2_' + gen_('tk') + '.' + gen_('users') + '.' + gen_('emps') + '_' + ctx.uid;
  if (!(d && d.force) && !__M.fresh) { var hit = cacheGetJ_(key); if (hit) return hit; }
  var A = tkAll_(ctx), locs = {};
  A.list.forEach(function (t) { if (t.outlet) locs[t.outlet] = 1; });
  var out = { list: A.list, errors: A.errors, wide: A.wide, inc: A.inc, card: tkCard_(ctx), counts: tkCounts_(A.list),
    locations: Object.keys(locs).sort(), prios: TK_PRIOS };
  cachePutJ_(key, out, 60);
  return out;
}
function tkFind_(ctx, key, fresh) {
  var p = str_(key).split('|'), src = p[0], id = p.slice(1).join('|');
  if (!src || !id) throw new Error('Issue not found.');
  var list = src === 'hub' ? tkHubRows_() : (function () { var T = tkTrackerOf_(src); if (!T) throw new Error('That Tickets Tracker is no longer set in Settings.'); return tkTrackerRows_(T, { fresh: fresh }); })();
  var t = list.filter(function (x) { return x.id === id; })[0];
  if (!t) throw new Error('Issue ' + id + ' was not found — refresh.');
  tkFlags_(ctx, t);
  if (!tkSees_(ctx, t)) throw new Error('Issue not found.');
  return t;
}
function tkGet_(ctx, d) {
  var t = tkFind_(ctx, d.key);
  var log = [];
  try {
    readObjs_(SH.TICKET_LOG).forEach(function (r) {
      if (str_(r['Ticket Key']) !== t.key) return;
      var ts = tkDate_(r['Timestamp']);
      log.push({ at: ts ? fmt_(ts, 'dd/MM/yyyy hh:mm a') : '', step: str_(r['Step']), details: str_(r['Details']), by: str_(r['By']) });
    });
  } catch (e) {}
  return { ticket: t, log: log };
}
function tkLog_(ctx, t, step, details) {
  try {
    appendObj_(SH.TICKET_LOG, { 'Log ID': Utilities.getUuid().substring(0, 8), 'Timestamp': new Date(), 'Ticket Key': t.key || (t.src + '|' + t.id), 'Ticket ID': t.id,
      'Source': t.srcName || t.src, 'Step': step, 'Details': details || '', 'By': ctx.name, 'User ID': ctx.uid });
  } catch (e) {}
}
function tkPhoto_(fileId) { return str_(fileId) ? 'https://drive.google.com/uc?id=' + str_(fileId) : ''; }
/** The outlet's incharge (first active incharge login) — the default person for a checklist ticket. */
function tkInchargeName_(outletId) {
  try {
    var d = laIncData_(), uids = (d.o[outletId] || []).filter(function (u) { return u.charAt(0) !== '('; });
    if (!uids.length) return '';
    var lg = findObj_(SH.LOGIN, 'User ID', uids[0]);
    return lg ? str_(lg['Full Name']) : '';
  } catch (e) { return ''; }
}

function tkRaise_(ctx, d) {
  var type = str_(d.type).toUpperCase() || 'OTHER', details = str_(d.details), subject = str_(d.subject);
  if (!details && !subject) throw new Error('Write what the problem is.');
  var ck = d.checklist || null, task = d.task || null, now = new Date(), e = ctx.empId ? empById_(ctx.empId) : null;
  if (!ck && !task && !tkCard_(ctx)) throw new Error('Raise the issue from the checklist task or the delegated task it is about.');
  var who = (str_(d.assignId) || str_(d.assignName)) ? tkPerson_(ctx, d.assignId, d.assignName) : null;
  if (!who && !/^no$/i.test(str_(set_('Ticket Needs A Person', 'Yes')))) throw new Error('Pick the person the issue goes to.');
  var prio = TK_PRIOS.indexOf(str_(d.priority)) >= 0 ? str_(d.priority) : '';
  var resolveBy = null;
  if (who) { var days0 = setNum_('Ticket Default Resolve Days', 2), pd = prio || 'Mid'; days0 = pd === 'High' ? 0 : pd === 'Low' ? days0 * 2 : days0; resolveBy = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days0); }
  var place = outletById_(str_(d.outletId)) || (e && e.outletId ? outletById_(e.outletId) : null) || (ctx.home ? outletById_(ctx.home) : null);
  var chk = ck && ck.chkId ? checklists_().filter(function (c) { return c.id === str_(ck.chkId); })[0] : null;
  if (ck && chk) {
    var w = chkDefaultWindow_(), row = null;
    try { row = chkWindowRows_(chk, w.from, w.to, w.oldest).filter(function (r) { return r.id === str_(ck.taskId); })[0]; } catch (x) {}
    var given = openAssignments_(function (a) { return str_(a['Checklist ID']) === chk.id && str_(a['Task ID']) === str_(ck.taskId) && str_(a['Assigned To']) === ctx.uid; }).length > 0;
    if (row && !chkIsMine_(ctx, row, chk.id) && !given) throw new Error('Only the doer of this checklist task can raise an issue for it.');
    if (chk.outletId) place = outletById_(chk.outletId) || place;
  }
  var dt = null;
  if (task) {
    dt = findObj_(SH.TASKS, 'Task ID', str_(task.id));
    if (!dt || str_(dt['Assigned To']) !== ctx.uid) throw new Error('Only the person this task is given to can raise an issue for it.');
    subject = subject || str_(dt['Title']);
  }
  var T = ck && place ? tkTrackerOf_(place.id) : null;
  var photo = tkPhoto_(d.fileId), msg = '', t = null;
  if (T) {
    t = lock_(function () {
      var ss = extSS_(T.ssId), sh = ss.getSheetByName(tkTab_());
      if (!sh) throw new Error('The ' + T.outlet + ' Tickets Tracker has no "' + tkTab_() + '" tab.');
      var lc = Math.max(sh.getLastColumn(), 17), H = sh.getRange(1, 1, 1, lc).getValues()[0].map(str_), c = tkCols_(H);
      var lr = Math.max(sh.getLastRow(), 1), all = lr > 1 ? sh.getRange(2, 1, lr - 1, Math.max(c.id, c.assigned) + 1).getValues() : [];
      var last = 0, max = 0, recent = '';
      all.forEach(function (v, i) {
        var s0 = str_(v[c.id]); if (!s0) return; last = i + 1;
        var m = /(\d+)$/.exec(s0); if (m) max = Math.max(max, Number(m[1]));
        if (c.assigned >= 0 && str_(v[c.assigned])) recent = str_(v[c.assigned]);
      });
      var id = 'TKT-' + pad_(max + 1, 4), row = last + 2;
      var assigned = who ? who.name : (recent || tkInchargeName_(T.outletId));
      var vals = {}; vals[c.id] = id; vals[c.ts] = now; vals[c.name] = ctx.name; vals[c.email] = ctx.email || ''; vals[c.dept] = (chk && chk.dept) || ctx.department || '';
      vals[c.taskId] = str_(ck.taskId); vals[c.freq] = str_(ck.freq); vals[c.task] = str_(ck.task) || subject; vals[c.planned] = parseAny_(ck.planned) || str_(ck.planned);
      vals[c.type] = type; vals[c.remarks] = details || subject; vals[c.photo] = photo; vals[c.status] = 'OPEN'; vals[c.assigned] = assigned;
      if (who && c.prio >= 0) vals[c.prio] = prio || 'Mid';
      if (who && c.planRes >= 0) vals[c.planRes] = resolveBy;
      var upTo = Math.max(c.id, c.ts, c.name, c.email, c.dept, c.taskId, c.freq, c.task, c.planned, c.type, c.remarks, c.photo, c.status, c.assigned, who ? Math.max(c.prio, c.planRes) : -1);
      var cur = sh.getRange(row, 1, 1, upTo + 1).getValues()[0], line = [];
      for (var k = 0; k <= upTo; k++) line.push(vals[k] !== undefined ? vals[k] : cur[k]);
      sh.getRange(row, 1, 1, line.length).setValues([line]);
      try { sh.getRange(row, c.ts + 1).setNumberFormat('yyyy-MM-dd HH:mm:ss'); } catch (x) {}
      return { src: T.key, srcName: T.outlet + ' checklist', id: id, key: T.key + '|' + id, assigned: assigned };
    });
    msg = 'Issue ' + t.id + ' raised for ' + T.outlet + (t.assigned ? ' — with ' + t.assigned + '.' : '.');
  } else {
    t = lock_(function () {
      var id = nextId_(SH.TICKETS, 'Ticket ID', 'CGT-', 4);
      appendObj_(SH.TICKETS, { 'Ticket ID': id, 'Date / Time': now, 'Name': ctx.name, 'Employee ID': ctx.empId || '', 'User ID': ctx.uid, 'Email': ctx.email || '',
        'Designation': ctx.designation || '', 'Department': ctx.department || '', 'Location': e ? e.location : (place ? place.name : ''),
        'Outlet ID': place ? place.id : '', 'Issue Type': type, 'Subject': subject || (ck ? str_(ck.task) : ''), 'Remarks / Reason': details,
        'Attachment (Photo Link)': photo, 'Ticket Status': 'OPEN', 'Assigned To': who ? who.name : '', 'Issue Priority': who ? (prio || 'Mid') : prio,
        'Planned Date for Resolve Issue': resolveBy || '', 'Actual Date for Resolve Issue': '', 'Resolution Note': '', 'Updated By': '', 'Updated At': '',
        'Raised From': ck ? 'Checklist ' + str_(ck.taskId) : task ? 'Delegated task ' + str_(task.id) : 'Issues' });
      return { src: 'hub', srcName: 'General', id: id, key: 'hub|' + id };
    });
    msg = 'Issue ' + t.id + ' raised' + (place ? ' for ' + place.name : '') + (who ? ' — with ' + who.name + '.' : '.');
  }
  if (dt) {
    try { updateObj_(SH.TASKS, dt._row, { 'Assignee Remarks': (str_(dt['Assignee Remarks']) ? str_(dt['Assignee Remarks']) + '\n' : '') + 'Issue ' + t.id + ' raised: ' + (details || subject), 'Updated At': now }); } catch (x) {}
  }
  tkLog_(ctx, t, 'Raised', type + ' · ' + (subject || str_(ck && ck.task)) + (details ? ' — ' + details : ''));
  if (who) tkLog_(ctx, t, 'Assigned', who.name + (who.designation ? ' (' + who.designation + (who.place ? ', ' + who.place : '') + ')' : '') + ' · ' + (prio || 'Mid') + ' · resolve by ' + fmt_(resolveBy, 'dd/MM/yyyy') + ' — given by the person who raised it');
  bumpGen_('tk');
  log_(ctx, 'Issue raised', t.key);
  return { message: msg, key: t.key, id: t.id };
}

function tkUpdate_(ctx, d) {
  var act = str_(d.action);
  if (['assign', 'close', 'reopen', 'note'].indexOf(act) < 0) throw new Error('Unknown step.');
  var res = lock_(function () {
    var t = tkFind_(ctx, d.key, true), now = new Date(), note = str_(d.note);
    if (act === 'assign' && !t.manage) throw new Error('Only an Admin (MIS, EA, PC, Director) or the Outlet Incharge of this outlet can re-assign it.');
    if (act === 'reopen' && !t.manage) throw new Error('Only an Admin or the Outlet Incharge can reopen it.');
    if (act === 'close' && !t.canClose) throw new Error(t.closed ? 'Already done.' : 'Only the person it is assigned to can mark it done.');
    if (act === 'assign' && t.closed) throw new Error('This issue is done — reopen it first.');
    if (act === 'close' && !note) throw new Error('Write what was done.');
    var patch = {}, step = '', details = '';
    if (act === 'assign') {
      var who = tkPerson_(ctx, d.assignId, d.assigned);
      var pr = TK_PRIOS.indexOf(str_(d.priority)) >= 0 ? str_(d.priority) : (t.priority || 'Mid');
      var plan = str_(d.planResolve) ? isoToDate_(d.planResolve) : null;
      if (!plan) { var days = setNum_('Ticket Default Resolve Days', 2); days = pr === 'High' ? 0 : pr === 'Low' ? days * 2 : days; plan = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days); }
      patch = { assigned: who.name, prio: pr, planRes: plan };
      step = t.assigned ? 'Re-assigned' : 'Assigned';
      details = who.name + (who.dept ? ' (' + who.dept + ', ' + who.place + ')' : '') + ' · ' + pr + ' · resolve by ' + fmt_(plan, 'dd/MM/yyyy') + (note ? ' — ' + note : '');
    } else if (act === 'close') {
      patch = { status: 'Close', actRes: now }; step = 'Done'; details = note;
    } else if (act === 'reopen') {
      patch = { status: 'OPEN', actRes: '' }; step = 'Reopened'; details = note;
    } else { step = 'Note'; details = note; if (!note) throw new Error('Write the note.'); }
    if (Object.keys(patch).length) {
      if (t.src === 'hub') {
        var map = { assigned: 'Assigned To', prio: 'Issue Priority', planRes: 'Planned Date for Resolve Issue', status: 'Ticket Status', actRes: 'Actual Date for Resolve Issue' }, o = {};
        Object.keys(patch).forEach(function (k) { o[map[k]] = patch[k]; });
        o['Updated By'] = ctx.name; o['Updated At'] = now;
        if (act === 'close') o['Resolution Note'] = note;
        if (act === 'reopen') o['Resolution Note'] = '';
        updateObj_(SH.TICKETS, t.row, o);
      } else {
        var T = tkTrackerOf_(t.src), sh = extSS_(T.ssId).getSheetByName(tkTab_());
        var H = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 17)).getValues()[0].map(str_), c = tkCols_(H);
        if (str_(sh.getRange(t.row, c.id + 1).getValue()) !== t.id) throw new Error('The tracker sheet changed — refresh.');
        Object.keys(patch).forEach(function (k) {
          if (c[k] < 0) return;
          var cell = sh.getRange(t.row, c[k] + 1);
          if (patch[k] === '') cell.clearContent(); else cell.setValue(patch[k]);
          if (k === 'actRes' && patch[k]) try { cell.setNumberFormat('dd-MMM-yyyy HH:mm'); } catch (x) {}
          if (k === 'planRes') try { cell.setNumberFormat('dd-MMM-yyyy'); } catch (x) {}
        });
      }
    }
    tkLog_(ctx, t, step, details);
    return { t: t, step: step };
  });
  bumpGen_('tk');
  log_(ctx, 'Issue ' + res.step, res.t.key);
  return { message: res.t.id + ': ' + res.step.toLowerCase() + '.', key: res.t.key };
}

function tkBulk_(ctx, d) {
  var keys = uniq_([].concat(d.keys || []).map(str_).filter(String)), note = str_(d.note);
  if (!keys.length) throw new Error('Tick at least one issue.');
  if (!note) throw new Error('Write what was done.');
  var done = [], skipped = [];
  lock_(function () {
    var bySrc = {};
    keys.forEach(function (k) { var src = k.split('|')[0]; (bySrc[src] = bySrc[src] || []).push(k.split('|').slice(1).join('|')); });
    var now = new Date(), match = tkMatcher_();
    Object.keys(bySrc).forEach(function (src) {
      var T = src === 'hub' ? null : tkTrackerOf_(src), list, sh = null, c = null;
      try {
        list = src === 'hub' ? tkHubRows_() : tkTrackerRows_(T, { fresh: true });
        if (T) { sh = extSS_(T.ssId).getSheetByName(tkTab_()); c = tkCols_(sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 17)).getValues()[0].map(str_)); }
      } catch (e) { bySrc[src].forEach(function (id) { skipped.push(id + ' (' + e.message + ')'); }); return; }
      var byId = {};
      list.forEach(function (t) { byId[t.id] = t; });
      bySrc[src].forEach(function (id) {
        var t = byId[id];
        if (!t) { skipped.push(id + ' (not found)'); return; }
        tkFlags_(ctx, t, match);
        if (!tkSees_(ctx, t) || !t.canClose) { skipped.push(id + (t.closed ? ' (already done)' : ' (not yours to close)')); return; }
        if (src === 'hub') {
          updateObj_(SH.TICKETS, t.row, { 'Ticket Status': 'Close', 'Actual Date for Resolve Issue': now, 'Resolution Note': note, 'Updated By': ctx.name, 'Updated At': now });
        } else {
          if (str_(sh.getRange(t.row, c.id + 1).getValue()) !== t.id) { skipped.push(id + ' (the tracker sheet changed)'); return; }
          if (c.status >= 0) sh.getRange(t.row, c.status + 1).setValue('Close');
          if (c.actRes >= 0) { var cell = sh.getRange(t.row, c.actRes + 1); cell.setValue(now); try { cell.setNumberFormat('dd-MMM-yyyy HH:mm'); } catch (x) {} }
        }
        tkLog_(ctx, t, 'Done', note);
        done.push(t.id);
      });
    });
  });
  bumpGen_('tk');
  log_(ctx, 'Issues done together', done.join(', '));
  return { message: done.length + ' issue(s) marked done.' + (skipped.length ? ' Skipped: ' + skipped.join(', ') : ''), done: done };
}

function tkDash_(ctx) {
  try {
    if (!tkCard_(ctx)) return null;
    var L = tkList_(ctx, {});
    return { pending: L.counts.pending, overdue: L.counts.overdue, forMe: L.list.filter(function (t) { return t.forMe && !t.closed; }).length, all: L.counts.all };
  } catch (e) { return { error: e.message }; }
}
