/*************************************************************************
 *  Checklist.gs — ONE checklist app for every checklist.
 *
 *  The checklist spreadsheets stay exactly where they are (their own
 *  "Master" tab, their own task generator, their own Doer List). This module
 *  reads their rows and writes "Actual" / Remark / Attachment back — the same
 *  cells their standalone web apps write — so scores and reports keep working.
 *  Nobody has to log in to the old checklist apps any more.
 *
 *  Who sees which checklist (see Access.gs):
 *    Access Rules (Checklist) › checklist managers ("Assigned Users", or the
 *    outlet's incharge when blank) › everyone found in the checklist's Doer
 *    List (the "Checklist Doers" tab links each doer to a login).
 *  A person with no checklist does not see the Checklist section at all.
 *************************************************************************/

function checklists_() {
  if (__M.chks) return __M.chks;
  __M.chks = readObjs_(SH.CHECKLISTS).filter(function (r) {
    return str_(r['Checklist ID']) && str_(r['Spreadsheet ID']) && !/inactive|^no$/i.test(str_(r['Status']));
  }).map(function (r) {
    return { id: str_(r['Checklist ID']), name: str_(r['Checklist Name']), ssId: str_(r['Spreadsheet ID']),
      tab: str_(r['Tab']) || 'Master', outletId: str_(r['Outlet ID']), dept: str_(r['Department']),
      url: str_(r['Web App URL']), assigned: list_(r['Assigned Users']).map(function (s) { return s.toUpperCase(); }) };
  });
  return __M.chks;
}

/* ============================ DOER INDEX ============================ */
/** { byUid: { USR-0001: { CHK-001: ['anchal', 'anchal@…'] } }, empty: bool } — from the Checklist Doers tab. */
function chkDoerIndex_() {
  if (__M.doerIdx) return __M.doerIdx;
  var key = 'cg_doers_' + gen_('users');
  var hit = cacheGetJ_(key);
  if (hit) { __M.doerIdx = hit; return hit; }
  var out = { byUid: {}, empty: true };
  try {
    if (db_().getSheetByName(SH.CHK_DOERS)) {
      var rows = readObjs_(SH.CHK_DOERS);
      out.empty = !rows.length;
      rows.forEach(function (r) {
        var uid = str_(r['User ID']).toUpperCase(), cid = str_(r['Checklist ID']);
        if (!uid || !cid) return;
        var u = out.byUid[uid] = out.byUid[uid] || {};
        u[cid] = uniq_((u[cid] || []).concat([str_(r['Doer Name']).toLowerCase(), str_(r['Doer Email']).toLowerCase()]).filter(String));
      });
    }
  } catch (e) {}
  cachePutJ_(key, out, 900);
  __M.doerIdx = out;
  return out;
}

/** Checklist access for one person (called while building the session context). */
function chkAccessMap_(p, o) {
  var map = {}, ids = {};
  var idx = chkDoerIndex_(), mine = idx.byUid[p.uid] || {};
  checklists_().forEach(function (c) {
    if (!o.super && c.outletId && franchiseLoc_(c.outletId)) return;          // no checklists for outlets we do not run
    var r = accResolve_(p, 'Checklist', c.id);
    if (o.franchise) {                                                        // staff of an outlet we do not run: only a rule MIS set for this very person
      if (r && r.rule && r.rule.wt === 'user' && r.acc !== 'No') map[c.id] = r.acc;
      return;
    }
    if (r) { if (r.acc !== 'No') map[c.id] = r.acc; }
    else if (o.super) map[c.id] = 'Manage';
    else if (c.assigned.length && c.assigned.indexOf(p.uid) >= 0) map[c.id] = 'Manage';
    else if (!c.assigned.length && o.assign && c.outletId && o.outlets.indexOf(c.outletId) >= 0) map[c.id] = 'Manage';
    else if (mine[c.id]) map[c.id] = 'Yes';
    else if (idx.empty && o.doerNames.length && (!c.outletId || o.outlets.indexOf(c.outletId) >= 0)) map[c.id] = 'Yes';
    if (mine[c.id]) ids[c.id] = mine[c.id];
  });
  var all = [o.name, o.email].concat(o.doerNames);
  Object.keys(ids).forEach(function (k) { all = all.concat(ids[k]); });
  return { map: map, ids: ids, global: uniq_(all.map(function (s) { return str_(s).toLowerCase(); }).filter(String)) };
}

/**
 * Rebuilds the "Checklist Doers" tab from every checklist's Doer List and links
 * each doer to a login: mobile › email › exact name › name words (unique) ›
 * Access ▸ Checklist Doer Name. Rows MIS linked by hand ("Manual") are kept.
 */
function chkAddMissing_() {
  var have = readObjs_(SH.CHECKLISTS), ids = {}, sheets = {}, add = [], seedBySheet = {}, placed = [];
  CHECKLIST_SEED_().forEach(function (s0) { seedBySheet[s0[2]] = s0; });
  have.forEach(function (r) {
    ids[str_(r['Checklist ID'])] = 1; sheets[str_(r['Spreadsheet ID'])] = 1;
    var s0 = seedBySheet[str_(r['Spreadsheet ID'])];
    if (s0 && s0[4] && !str_(r['Outlet ID'])) { updateObj_(SH.CHECKLISTS, r._row, { 'Outlet ID': s0[4] }); placed.push(str_(r['Checklist Name'])); }
  });
  if (placed.length) __M.chks = null;
  var next = have.reduce(function (m, r) { var n = Number(str_(r['Checklist ID']).replace(/\D/g, '')) || 0; return Math.max(m, n); }, 0);
  CHECKLIST_SEED_().forEach(function (s0) {
    if (sheets[s0[2]]) return;
    var id = s0[0];
    if (ids[id]) id = 'CHK-' + pad_(++next, 3); else next = Math.max(next, Number(id.replace(/\D/g, '')) || 0);
    ids[id] = 1; sheets[s0[2]] = 1;
    var o = {}; HEAD[SH.CHECKLISTS].forEach(function (h, i) { o[h] = s0[i]; }); o['Checklist ID'] = id;
    add.push(o);
  });
  var msg = placed.length ? 'location set for ' + placed.join(', ') : '';
  if (!add.length) return msg;
  appendObjs_(SH.CHECKLISTS, add);
  __M.chks = null;
  try { chkSyncDoers_(); } catch (e) {}
  return add.length + ' checklist(s) added: ' + add.map(function (o) { return o['Checklist Name']; }).join(', ') + (msg ? ' · ' + msg : '');
}

function chkSyncDoers_() {
  var P = personMatcher_();
  var old = db_().getSheetByName(SH.CHK_DOERS) ? readObjs_(SH.CHK_DOERS) : [];
  var manual = {}, keepByChk = {};
  old.forEach(function (r) {
    var k = str_(r['Checklist ID']) + '|' + norm_(r['Doer Name']) + '|' + str_(r['Doer Email']).toLowerCase();
    if (/manual/i.test(str_(r['Matched By'])) && str_(r['User ID'])) manual[k] = r;
    (keepByChk[str_(r['Checklist ID'])] = keepByChk[str_(r['Checklist ID'])] || []).push(r);
  });
  var rows = [], now = new Date(), stats = { checklists: 0, doers: 0, linked: 0, errors: [] };
  checklists_().forEach(function (c) {
    try {
      var t = extRead_(c.ssId, 'Doer List', { headerRow: 1 }), H = t.head;
      var cn = col_(H, ['Name', 'Doer Name']), ce = col_(H, ['User ID', 'Email', 'Doer ID']), cm = col_(H, ['Mobile No.', 'Mobile', 'Phone']);
      t.rows.forEach(function (r) {
        var nm = cn >= 0 ? str_(r[cn]) : '', em = ce >= 0 ? str_(r[ce]).toLowerCase() : '', mo = cm >= 0 ? str_(r[cm]).replace(/\.0$/, '') : '';
        if (!nm && !em) return;
        stats.doers++;
        var k = c.id + '|' + norm_(nm) + '|' + em, m;
        if (manual[k]) m = { uid: str_(manual[k]['User ID']), how: 'Manual' };
        else m = P.match({ name: nm, email: em, mobile: mo, outletId: c.outletId });
        if (m && m.uid) stats.linked++;
        rows.push({ 'Checklist ID': c.id, 'Checklist Name': c.name, 'Doer Name': nm, 'Doer Email': em, 'Doer Mobile': mo,
          'User ID': m ? m.uid : '', 'Full Name': m ? P.name(m.uid) : '', 'Matched By': m ? m.how : 'Not linked', 'Last Synced': now });
      });
      stats.checklists++;
    } catch (e) {
      stats.errors.push(c.name + ': ' + e.message);
      (keepByChk[c.id] || []).forEach(function (r) { var o = {}; HEAD[SH.CHK_DOERS].forEach(function (h) { o[h] = r[h]; }); rows.push(o); });
    }
  });
  lock_(function () {
    var sh = sheet_(SH.CHK_DOERS);
    ensureHeader_(sh, HEAD[SH.CHK_DOERS]);
    var h = heads_(SH.CHK_DOERS);
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, h.names.length).clearContent();
    if (rows.length) sh.getRange(2, 1, rows.length, h.names.length).setValues(rows.map(function (o) { return rowFromObj_(h, o); }));
    dropMemo_(SH.CHK_DOERS);
  });
  saveSetting_('Last Checklist Doer Sync', fmt_(now, 'dd/MM/yyyy HH:mm'));
  bumpGen_('users'); delete __M.doerIdx;
  return stats;
}

/**
 * Finds the login behind a person seen in another app (checklist doer, credential row …).
 * match({name, email, mobile, outletId}) → { uid, how } | null
 */
function personMatcher_() {
  var accBy = {};
  readObjs_(SH.ACCESS).forEach(function (r) { accBy[str_(r['User ID'])] = r; });
  var people = readObjs_(SH.LOGIN).filter(function (r) { return str_(r['User ID']) && /^active$/i.test(str_(r['Status'])); }).map(function (r) {
    var uid = str_(r['User ID']), emp = empById_(str_(r['Employee ID'])), a = accBy[uid] || {};
    var home = outletByAny_(a['Home Outlet']) || (emp && emp.outletId ? outletById_(emp.outletId) : null);
    return { uid: uid, name: str_(r['Full Name']) || (emp ? emp.name : ''),
      mobiles: [str_(r['Mobile']), emp ? emp.phone : ''].map(function (m) { return str_(m).replace(/\D/g, '').slice(-10); }).filter(function (m) { return m.length === 10; }),
      emails: [str_(r['Email']), emp ? emp.email : ''].map(function (e) { return str_(e).toLowerCase(); }).filter(String),
      doer: list_(a['Checklist Doer Name']).map(function (s) { return s.toLowerCase(); }),
      home: home ? home.id : '' };
  });
  people.forEach(function (x) { x.words = nameWords_(x.name); });
  var byUid = {}; people.forEach(function (x) { byUid[x.uid] = x; });
  function one(list, outletId) {
    if (list.length === 1) return list[0];
    if (list.length > 1 && outletId) { var same = list.filter(function (x) { return x.home === outletId; }); if (same.length === 1) return same[0]; }
    return null;
  }
  return {
    name: function (uid) { return byUid[uid] ? byUid[uid].name : ''; },
    all: people,
    match: function (h) {
      h = h || {};
      var mob = str_(h.mobile).replace(/\D/g, '').slice(-10), em = str_(h.email).toLowerCase(), nm = str_(h.name);
      var x;
      if (mob.length === 10 && (x = one(people.filter(function (p) { return p.mobiles.indexOf(mob) >= 0; }), h.outletId))) return { uid: x.uid, how: 'Mobile' };
      if (em && (x = one(people.filter(function (p) { return p.emails.indexOf(em) >= 0; }), h.outletId))) return { uid: x.uid, how: 'Email' };
      if (em && (x = one(people.filter(function (p) { return p.doer.indexOf(em) >= 0; }), h.outletId))) return { uid: x.uid, how: 'Checklist Doer Name' };
      if (nm && (x = one(people.filter(function (p) { return norm_(p.name) === norm_(nm); }), h.outletId))) return { uid: x.uid, how: 'Name' };
      if (nm && (x = one(people.filter(function (p) { return p.doer.indexOf(nm.toLowerCase()) >= 0; }), h.outletId))) return { uid: x.uid, how: 'Checklist Doer Name' };
      var w = nameWords_(nm);
      if (w.length && (x = one(people.filter(function (p) { return w.every(function (t) { return p.words.indexOf(t) >= 0; }); }), h.outletId))) return { uid: x.uid, how: 'Name words' };
      return null;
    }
  };
}
function nameWords_(s) { return str_(s).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(function (t) { return t.length > 1; }); }

/* ============================ VISIBILITY ============================ */
function chkVisible_(ctx) {
  return checklists_().map(function (c) {
    var a = (ctx.chk || {})[c.id];
    return a ? { c: c, manage: a === 'Manage' } : null;
  }).filter(Boolean);
}
function chkFind_(ctx, id) {
  var v = chkVisible_(ctx);
  for (var i = 0; i < v.length; i++) if (v[i].c.id === id) return v[i];
  // a task given to me from a checklist I do not otherwise see
  var c = checklists_().filter(function (x) { return x.id === id; })[0];
  if (c && openAssignments_(function (a) { return str_(a['Checklist ID']) === id && str_(a['Assigned To']) === ctx.uid; }).length) return { c: c, manage: false };
  throw new Error('That checklist is not available to you.');
}
function chkManages_(ctx, c) { return (ctx.chk || {})[c.id] === 'Manage'; }

function chkCols_(H) {
  return {
    name: col_(H, ['Name', 'Doer Name', 'Doer']), email: col_(H, ['Email', 'Doer ID']),
    dept: col_(H, ['Department']), taskId: col_(H, ['Task ID']), freq: col_(H, ['Freq', 'Frequency']),
    task: col_(H, ['Task', 'Task Description']), planned: col_(H, ['Planned', 'Planned Date']),
    actual: col_(H, ['Actual', 'Actual Date']), remark: col_(H, ['Remark', 'Reason', 'Remarks']),
    att: col_(H, ['Attachment', 'Attachment (Photo Link)']), status: col_(H, ['Status'])
  };
}

function chkIsMine_(ctx, row, chkId) {
  var n = str_(row.name).toLowerCase(), e = str_(row.email).toLowerCase();
  var ids = (chkId && ctx.doerMap && ctx.doerMap[chkId]) || [];
  if ((n && ids.indexOf(n) >= 0) || (e && ids.indexOf(e) >= 0)) return true;
  return (n && ctx.doers.indexOf(n) >= 0) || (e && ctx.doers.indexOf(e) >= 0);
}

/* Speed: a checklist's rows are kept in the shared cache for 5 minutes; marking a task done here bumps its
   generation (a script property, so it is never lost) and the next read is fresh at once. */
function chkGen_(id) { return gen_('chk_' + id) + '.' + gen_('data'); }
function chkBump_(id) { bumpGen_('chk_' + id); }
/** The window "My tasks" shows by default — also used for any day inside it (team view, dashboard). */
function chkDefaultWindow_() {
  var from = iso_(addDays_(new Date(), -setNum_('Checklist Days Back', 45))), to = iso_(addDays_(new Date(), setNum_('Checklist Days Ahead', 7)));
  return { from: from, to: to, oldest: iso_(addDays_(isoToDate_(from), -90)) };
}

function chkRowObj_(k, r, rowNum) {
  var p = parseAny_(r[k.planned]);
  var a = k.actual >= 0 ? r[k.actual] : '';
  var ad = parseAny_(a);
  return {
    row: rowNum, id: str_(r[k.taskId]),
    name: k.name >= 0 ? str_(r[k.name]) : '', email: k.email >= 0 ? str_(r[k.email]) : '',
    task: k.task >= 0 ? str_(r[k.task]) : '', freq: k.freq >= 0 ? str_(r[k.freq]) : '',
    time: p ? fmt_(p, 'hh:mm a') : '', planned: p ? p.getTime() : 0, plannedText: p ? fmt_(p, 'dd/MM/yyyy hh:mm a') : '',
    done: str_(a) !== '', doneAt: ad ? fmt_(ad, 'dd/MM hh:mm a') : str_(a), doneTs: ad ? ad.getTime() : 0, actualText: ad ? fmt_(ad, 'dd/MM/yyyy hh:mm a') : str_(a),
    late: !!(ad && p && ad.getTime() > p.getTime()),
    remark: k.remark >= 0 ? str_(r[k.remark]) : '', att: k.att >= 0 ? str_(r[k.att]) : ''
  };
}

/** The rows planned for one day (team view, dashboard) — taken from the cached default window when the day is inside it. */
function chkRows_(c, dateIso) {
  var w = chkDefaultWindow_();
  if (dateIso >= w.from && dateIso <= w.to) {
    return chkWindowRows_(c, w.from, w.to, w.oldest).filter(function (r) { return r.planned && iso_(new Date(r.planned)) === dateIso; });
  }
  var key = 'chk_' + c.id + '_' + chkGen_(c.id) + '_' + dateIso;
  var hit = cacheGetJ_(key);
  if (hit) return hit;
  var t = extRead_(c.ssId, c.tab, { headerRow: 1, lastN: setNum_('Checklist Scan Rows', 2500) });
  var k = chkCols_(t.head);
  if (k.planned < 0 || k.taskId < 0) throw new Error(c.name + ': needs "Task ID" and "Planned" columns.');
  var out = [];
  t.rows.forEach(function (r, i) {
    var p = parseAny_(r[k.planned]);
    if (!p || iso_(p) !== dateIso) return;
    out.push(chkRowObj_(k, r, t.firstRow + i));
  });
  cachePutJ_(key, out, 300);
  return out;
}

/**
 * Rows of one checklist planned between two dates, plus older rows still not done
 * (back to oldestIso). Reads only the Planned / Actual columns first, then the
 * block of rows that matters — fast even on a 15 000-row Master.
 */
function chkWindowRows_(c, fromIso, toIso, oldestIso) {
  var key = 'chkw_' + c.id + '_' + chkGen_(c.id) + '_' + fromIso + '_' + toIso + '_' + oldestIso;
  __M.chkw = __M.chkw || {};
  if (__M.chkw[key]) return JSON.parse(__M.chkw[key]);          // same request asked twice (dashboard: every checklist, several days)
  var hit = __M.fresh ? null : cacheGetJ_(key);
  if (hit) { __M.chkw[key] = JSON.stringify(hit); return hit; }
  var sh = extSS_(c.ssId).getSheetByName(c.tab);
  if (!sh) throw new Error(c.name + ': tab "' + c.tab + '" not found.');
  var lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (lr < 2) return [];
  var H = sh.getRange(1, 1, 1, lc).getValues()[0].map(str_), k = chkCols_(H);
  if (k.planned < 0 || k.taskId < 0) throw new Error(c.name + ': needs "Task ID" and "Planned" columns.');
  var from = isoToDate_(fromIso).getTime(), to = isoToDate_(toIso).getTime() + 86399999, oldest = isoToDate_(oldestIso).getTime();
  var P = sh.getRange(2, k.planned + 1, lr - 1, 1).getValues();
  var A = k.actual >= 0 ? sh.getRange(2, k.actual + 1, lr - 1, 1).getValues() : null;
  var lo = -1, hi = -1, want = [];
  for (var i = 0; i < P.length; i++) {
    var pd = parseAny_(P[i][0]); if (!pd) continue;
    var t = pd.getTime();
    var w = (t >= from && t <= to) || (A && !str_(A[i][0]) && t < from && t >= oldest);
    if (w) { want[i] = 1; if (lo < 0) lo = i; hi = i; }
  }
  var out = [];
  if (lo >= 0) {
    var block = sh.getRange(2 + lo, 1, hi - lo + 1, lc).getValues();
    for (var j = 0; j < block.length; j++) if (want[lo + j]) out.push(chkRowObj_(k, block[j], 2 + lo + j));
  }
  cachePutJ_(key, out, 300);
  __M.chkw[key] = JSON.stringify(out);
  return out;
}

function openAssignments_(filter) {
  return readObjs_(SH.CHK_ASSIGN).filter(function (r) {
    return str_(r['Status']) === 'Assigned' && (!filter || filter(r));
  });
}

/* ============================ MY CHECKLIST (the common checklist app) ============================ */
/**
 * Everything planned for me across all my checklists, like the old checklist app:
 * d = { from, to, id } (id = one checklist or blank for all). Managers may add team:true.
 */
function chkMyTasks_(ctx, d) {
  var back = setNum_('Checklist Days Back', 45), ahead = setNum_('Checklist Days Ahead', 7);
  var from = str_(d.from) || iso_(addDays_(new Date(), -back)), to = str_(d.to) || iso_(addDays_(new Date(), ahead));
  var oldest = iso_(addDays_(isoToDate_(from), -90));
  var vis = chkVisible_(ctx).filter(function (v) { return !d.id || v.c.id === d.id; });
  var tasks = [], errors = [], lists = [];
  vis.forEach(function (v) {
    var c = v.c, n = 0;
    try {
      chkWindowRows_(c, from, to, oldest).forEach(function (r) {
        var mine = chkIsMine_(ctx, r, c.id);
        if (!mine && !(d.team && v.manage)) return;
        r.chk = c.id; r.chkName = c.name; r.mine = mine;
        tasks.push(r); n++;
      });
    } catch (e) { errors.push(c.name + ': ' + e.message); }
    lists.push({ id: c.id, name: c.name, manage: v.manage, count: n, url: c.url });
  });
  // tasks other checklists gave to me
  var given = openAssignments_(function (r) { return str_(r['Assigned To']) === ctx.uid; }).map(function (a) {
    var p = parseAny_(a['Planned']);
    return { chk: str_(a['Checklist ID']), chkName: str_(a['Checklist Name']), row: Number(a['Source Row']), id: str_(a['Task ID']),
      task: str_(a['Task']), freq: '', planned: p ? p.getTime() : 0, plannedText: p ? fmt_(p, 'dd/MM/yyyy hh:mm a') : '',
      time: p ? fmt_(p, 'hh:mm a') : '', done: false, actualText: '', late: false, remark: '', att: '', name: str_(a['Original Doer']),
      given: true, by: str_(a['Assigned By Name']), note: str_(a['Note']), assignId: str_(a['Assign ID']), mine: true };
  });
  var seen = {};
  tasks.forEach(function (t) { seen[t.chk + '|' + t.row] = 1; });
  given.forEach(function (g) { if (!seen[g.chk + '|' + g.row]) tasks.push(g); else tasks.forEach(function (t) { if (t.chk === g.chk && t.row === g.row) { t.given = true; t.by = g.by; t.note = g.note; } }); });
  tasks.sort(function (a, b) { return a.planned - b.planned; });
  return { from: from, to: to, lists: lists, tasks: tasks, errors: errors, now: Date.now(), seeDone: tkWide_(ctx) || tkInc_(ctx) };
}

/* ============================ TEAM VIEW (one checklist, one day) ============================ */
function chkOverview_(ctx, d) {
  var date = str_(d.date) || todayIso_();
  var mineAssigned = openAssignments_(function (r) { return str_(r['Assigned To']) === ctx.uid; });
  var list = chkVisible_(ctx).map(function (v) {
    var c = v.c, o = { id: c.id, name: c.name, manage: v.manage, url: c.url, outlet: '', total: 0, done: 0, pending: 0, mine: 0, minePending: 0, assigned: 0 };
    var out = c.outletId ? outletById_(c.outletId) : null; o.outlet = out ? out.name : 'All';
    try {
      var rows = chkRows_(c, date);
      rows.forEach(function (r) {
        var mine = chkIsMine_(ctx, r, c.id);
        if (v.manage) { o.total++; if (r.done) o.done++; else o.pending++; }
        if (mine) { o.mine++; if (!r.done) o.minePending++; }
      });
      if (!v.manage) { o.total = o.mine; o.pending = o.minePending; o.done = o.mine - o.minePending; }
    } catch (e) { o.error = e.message; }
    o.assigned = mineAssigned.filter(function (a) { return str_(a['Checklist ID']) === c.id; }).length;
    return o;
  });
  return { date: date, list: list, assignedToMe: mineAssigned.length, canAssign: !!ctx.grants.checklist_assign };
}

function chkPeriodKind_(freq) {
  var k = str_(freq).toUpperCase().charAt(0);
  if (k === 'W' || k === 'F') return 'week';
  if (k === 'M' || k === 'Q' || k === 'H' || k === 'Y') return 'month';
  return 'day';
}
function chkPeriod_() {
  var now = new Date(), mon = dirMonday_(now), ms = new Date(now.getFullYear(), now.getMonth(), 1), me = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  var P = { now: now.getTime(), today: iso_(now), weekFrom: iso_(mon), weekTo: iso_(addDays_(mon, 6)), monthFrom: iso_(ms), monthTo: iso_(me) };
  P.from = P.weekFrom < P.monthFrom ? P.weekFrom : P.monthFrom;
  P.to = P.weekTo > P.monthTo ? P.weekTo : P.monthTo;
  return P;
}
function chkInPeriod_(r, P) {
  if (!r.planned) return false;
  var day = iso_(new Date(r.planned)), k = chkPeriodKind_(r.freq);
  if (k === 'week') return day >= P.weekFrom && day <= P.weekTo;
  if (k === 'month') return day >= P.monthFrom && day <= P.monthTo;
  return day === P.today;
}
function chkState_(r, P) { return r.done ? 'done' : r.planned < P.now ? 'overdue' : 'pending'; }
function chkPeriodRows_(c, P) {
  P = P || chkPeriod_();
  return chkWindowRows_(c, P.from, P.to, P.from).filter(function (r) { return chkInPeriod_(r, P); });
}

function chkTasks_(ctx, d) {
  var v = chkFind_(ctx, str_(d.id));
  var date = str_(d.date) || todayIso_(), P = chkPeriod_();
  var rows = d.scope || d.overdue ? chkPeriodRows_(v.c, P).filter(function (r) { return d.scope || chkState_(r, P) === 'overdue'; }) : chkRows_(v.c, date);
  var asg = openAssignments_(function (r) { return str_(r['Checklist ID']) === v.c.id; });
  var byTask = {};
  asg.forEach(function (a) { byTask[str_(a['Task ID']) + '|' + str_(a['Source Row'])] = a; });
  var out = [];
  rows.forEach(function (r0) {
    var r = JSON.parse(JSON.stringify(r0));
    var a = byTask[r.id + '|' + r.row];
    var mine = chkIsMine_(ctx, r, v.c.id), toMe = a && str_(a['Assigned To']) === ctx.uid;
    if (!v.manage && !mine && !toMe) return;
    r.mine = mine;
    r.assignedTo = a ? str_(a['Assigned To Name']) : '';
    r.assignId = a ? str_(a['Assign ID']) : '';
    r.toMe = !!toMe;
    r.canDo = !r.done && (mine || toMe || (v.manage && !dirIs_(ctx)));
    r.state = chkState_(r, P);
    r.period = chkPeriodKind_(r.freq);
    out.push(r);
  });
  out.sort(function (a, b) { return a.planned - b.planned || a.name.localeCompare(b.name); });
  var doers = uniq_(out.map(function (r) { return r.name; }).filter(String)).sort();
  return { id: v.c.id, name: v.c.name, url: v.c.url, date: date, overdue: !!d.overdue, scope: !!d.scope, today: P.today, weekFrom: P.weekFrom, weekTo: P.weekTo, monthFrom: P.monthFrom,
    manage: v.manage, loc: dirLoc_(v.c.outletId), dept: v.c.dept || '',
    canAssign: v.manage && !!ctx.grants.checklist_assign, viewOnly: dirIs_(ctx), doers: doers, tasks: out };
}

function chkScores_(ctx, d) {
  var weeks = Math.min(Math.max(Number(d.weeks) || 8, 1), 26);
  var now = new Date(), mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  var start = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - 7 * weeks), DAY = 86400000;
  var list = chkVisible_(ctx).filter(function (v) { return v.manage && (!d.id || v.c.id === d.id); });
  if (!list.length) throw new Error('Scores are shown for the checklists you manage.');
  var wk = [];
  for (var i = 0; i < weeks; i++) { var a = new Date(start.getTime() + i * 7 * DAY); wk.push({ i: i, from: iso_(a), to: iso_(new Date(a.getTime() + 6 * DAY)) }); }
  var out = { weeks: wk.reverse(), lists: [], errors: [] };
  list.forEach(function (v) {
    var c = v.c, by = {};
    try {
      chkWindowRows_(c, iso_(start), iso_(new Date(mon.getTime() - DAY)), iso_(start)).forEach(function (r) {
        if (!r.planned || r.planned < start.getTime() || r.planned >= mon.getTime()) return;
        var w = Math.floor((r.planned - start.getTime()) / (7 * DAY)), end = start.getTime() + (w + 1) * 7 * DAY;
        var name = str_(r.name) || '—', k = name + '|' + w;
        var x = by[k] || (by[k] = { doer: name, week: w, plan: 0, done: 0, onTime: 0 });
        x.plan++;
        if (r.done && (!r.doneTs || r.doneTs < end)) x.done++;
        if (r.done && r.doneTs && r.doneTs <= r.planned) x.onTime++;
      });
    } catch (e) { out.errors.push(c.name + ': ' + e.message); }
    var rows = Object.keys(by).map(function (k) {
      var x = by[k];
      x.nd = round_(x.done / x.plan * 100 - 100, 1); x.ot = round_(x.onTime / x.plan * 100 - 100, 1);
      x.from = iso_(new Date(start.getTime() + x.week * 7 * DAY)); return x;
    });
    out.lists.push({ id: c.id, name: c.name, loc: dirLoc_(c.outletId), dept: c.dept || '', rows: rows, doers: uniq_(rows.map(function (x) { return x.doer; })).sort() });
  });
  return out;
}

/* ============================ MARK DONE ============================ */
function chkDone_(ctx, d) {
  var v = chkFind_(ctx, str_(d.id));
  var rowNum = Number(d.row), taskId = str_(d.taskId);
  if (!rowNum || !taskId) throw new Error('Pick a task.');
  return lock_(function () {
    var ss = extSS_(v.c.ssId), sh = ss.getSheetByName(v.c.tab);
    if (!sh) throw new Error('Tab "' + v.c.tab + '" not found.');
    var lc = sh.getLastColumn();
    var H = sh.getRange(1, 1, 1, lc).getValues()[0].map(str_);
    var k = chkCols_(H);
    if (k.actual < 0) throw new Error(v.c.name + ' has no "Actual" column.');
    var r = sh.getRange(rowNum, 1, 1, lc).getValues()[0];
    if (norm_(r[k.taskId]) !== norm_(taskId)) throw new Error('The checklist changed while you were on it — please refresh.');
    if (str_(r[k.actual])) throw new Error('Already marked done (' + fmt_(parseAny_(r[k.actual]), 'dd/MM hh:mm a') + ').');

    var row = { name: k.name >= 0 ? str_(r[k.name]) : '', email: k.email >= 0 ? str_(r[k.email]) : '' };
    var mine = chkIsMine_(ctx, row, v.c.id);
    var asg = openAssignments_(function (a) {
      return str_(a['Checklist ID']) === v.c.id && str_(a['Task ID']) === taskId && Number(a['Source Row']) === rowNum;
    });
    var toMe = asg.some(function (a) { return str_(a['Assigned To']) === ctx.uid; });
    if (!v.manage && !mine && !toMe) throw new Error('This task is not yours.');
    if (dirIs_(ctx) && !mine && !toMe) throw new Error('Directors see the checklist tasks and give them to someone — the doer marks them done.');
    var p = parseAny_(r[k.planned]);
    if (p && p.getTime() > Date.now() + 36 * 3600000 && !v.manage) throw new Error('This task is planned for ' + fmt_(p, 'dd MMM') + ' — it can be done from that day.');

    var now = new Date();
    sh.getRange(rowNum, k.actual + 1).setValue(now);
    var note = str_(d.remark);
    if (!mine) note = (note ? note + ' — ' : '') + 'done by ' + ctx.name;
    if (note && k.remark >= 0) sh.getRange(rowNum, k.remark + 1).setValue(note);
    if (str_(d.fileId) && k.att >= 0) sh.getRange(rowNum, k.att + 1).setValue('https://drive.google.com/uc?id=' + str_(d.fileId));

    asg.forEach(function (a) { updateObj_(SH.CHK_ASSIGN, a._row, { 'Status': 'Done', 'Done At': now, 'Remarks': str_(d.remark) }); });
    chkBump_(v.c.id);
    log_(ctx, 'Checklist done', v.c.name + ' · ' + taskId);
    var late = !!(p && now.getTime() > p.getTime());
    return { message: late ? 'Marked done (late).' : 'Marked done on time.', doneAt: fmt_(now, 'dd/MM hh:mm a'),
      actualText: fmt_(now, 'dd/MM/yyyy hh:mm a'), late: late, remark: note };
  });
}

/* ============================ GIVE TO SOMEONE ============================ */
function chkAssign_(ctx, d) {
  var v = chkFind_(ctx, str_(d.id));
  if (!v.manage) throw new Error('Only the checklist manager can assign its tasks.');
  var to = str_(d.to);
  var login = findObj_(SH.LOGIN, 'User ID', to);
  if (!login || !/^active$/i.test(str_(login['Status']))) throw new Error('Pick an active person to assign to.');
  if (dirIs_(ctx) && !dirChkPeople_(v.c).some(function (x) { return x.uid === to; })) throw new Error('Pick someone from the ' + (v.c.dept || 'same') + ' department.');
  var items = (d.items || []).filter(function (i) { return i && i.row && i.taskId; });
  if (!items.length) throw new Error('Tick at least one task.');
  var date = str_(d.date) || todayIso_();
  var rows = chkRows_(v.c, date), byRow = {};
  rows.forEach(function (r) { byRow[r.row] = r; });
  if (items.some(function (it) { return !byRow[Number(it.row)]; })) {
    var w = chkDefaultWindow_();
    chkWindowRows_(v.c, w.from, w.to, w.oldest).forEach(function (r) { if (!byRow[r.row]) byRow[r.row] = r; });
  }
  if (items.some(function (it) { return !byRow[Number(it.row)]; })) chkPeriodRows_(v.c).forEach(function (r) { if (!byRow[r.row]) byRow[r.row] = r; });

  return lock_(function () {
    var open = openAssignments_(function (a) { return str_(a['Checklist ID']) === v.c.id; });
    var ids = nextIds_(SH.CHK_ASSIGN, 'Assign ID', 'CA-', 6, items.length);
    var now = new Date(), add = [], lines = [];
    items.forEach(function (it, i) {
      var r = byRow[Number(it.row)];
      if (!r || r.id !== str_(it.taskId)) throw new Error('Task ' + it.taskId + ' was not found — refresh and try again.');
      if (r.done) return;
      open.filter(function (a) { return Number(a['Source Row']) === r.row && str_(a['Task ID']) === r.id; })
        .forEach(function (a) { updateObj_(SH.CHK_ASSIGN, a._row, { 'Status': 'Reassigned' }); });
      add.push({ 'Assign ID': ids[i], 'Checklist ID': v.c.id, 'Checklist Name': v.c.name, 'Task ID': r.id, 'Task': r.task,
        'Planned': new Date(r.planned), 'Source Row': r.row, 'Original Doer': r.name, 'Assigned To': to,
        'Assigned To Name': str_(login['Full Name']), 'Assigned By': ctx.uid, 'Assigned By Name': ctx.name,
        'Note': str_(d.note), 'Assigned At': now, 'Status': 'Assigned' });
      lines.push('<li>' + esc_(r.task) + ' <span style="color:#8a7a6d">(' + esc_(r.time) + ', was ' + esc_(r.name) + ')</span></li>');
    });
    if (!add.length) throw new Error('Those tasks are already done.');
    appendObjs_(SH.CHK_ASSIGN, add);
    bumpGen_('users');
    var mailed = '';
    if (setYes_('Send Task Emails')) {
      mailed = mail_(userEmail_(to), 'Checklist task(s) given to you — ' + v.c.name,
        mailShell_('Checklist tasks for you', '<p>Hi ' + esc_(str_(login['Full Name'])) + ',</p><p><b>' + esc_(ctx.name) +
          '</b> has given you ' + add.length + ' task(s) from <b>' + esc_(v.c.name) + '</b> for ' + fmt_(isoToDate_(date), 'dd MMM yyyy') + ':</p><ul>' +
          lines.join('') + '</ul>' + (d.note ? '<p>Note: ' + esc_(d.note) + '</p>' : '') +
          (appUrl_() ? '<p><a href="' + appUrl_() + '">Open the app</a> → Checklist</p>' : '')));
    }
    log_(ctx, 'Checklist assigned', v.c.name + ' · ' + add.length + ' → ' + to);
    return { message: add.length + ' task(s) given to ' + str_(login['Full Name']) + '.', mail: mailed };
  });
}

function chkUnassign_(ctx, d) {
  var a = findObj_(SH.CHK_ASSIGN, 'Assign ID', str_(d.assignId));
  if (!a || str_(a['Status']) !== 'Assigned') throw new Error('That assignment is no longer open.');
  var v = chkFind_(ctx, str_(a['Checklist ID']));
  if (!v.manage && str_(a['Assigned By']) !== ctx.uid) throw new Error('Only the manager can take it back.');
  updateObj_(SH.CHK_ASSIGN, a._row, { 'Status': 'Cancelled', 'Remarks': 'Taken back by ' + ctx.name });
  bumpGen_('users');
  return { message: 'Taken back.' };
}

/** Open tasks given to me, from every checklist. */
function chkAssignedToMe_(ctx) {
  return openAssignments_(function (r) { return str_(r['Assigned To']) === ctx.uid; }).map(function (a) {
    return { assignId: str_(a['Assign ID']), id: str_(a['Checklist ID']), checklist: str_(a['Checklist Name']),
      taskId: str_(a['Task ID']), task: str_(a['Task']), row: Number(a['Source Row']),
      planned: fmt_(a['Planned'], 'dd/MM hh:mm a'), date: iso_(a['Planned']), from: str_(a['Original Doer']),
      by: str_(a['Assigned By Name']), note: str_(a['Note']) };
  });
}

/** Pending counts for the dashboard card. */
function chkPendingToday_(ctx) {
  var ov = chkOverview_(ctx, { date: todayIso_() });
  var pending = 0, total = 0, errors = [], mineP = 0, mineT = 0;
  ov.list.forEach(function (o) {
    if (o.error) { errors.push(o.name); return; }
    pending += o.manage ? o.pending : o.minePending;
    total += o.manage ? o.total : o.mine;
    mineP += o.minePending; mineT += o.mine;
  });
  return { pending: pending + ov.assignedToMe, total: total + ov.assignedToMe, assigned: ov.assignedToMe,
    minePending: mineP, mineTotal: mineT, lists: ov.list, errors: errors };
}

/** Checklist Doers tab for the admin screen (link a doer to a login by hand). */
function chkDoerList_(ctx) {
  return { rows: (db_().getSheetByName(SH.CHK_DOERS) ? readObjs_(SH.CHK_DOERS) : []).map(function (r) {
      return { row: r._row, chk: str_(r['Checklist ID']), chkName: str_(r['Checklist Name']), name: str_(r['Doer Name']),
        email: str_(r['Doer Email']), mobile: str_(r['Doer Mobile']), uid: str_(r['User ID']), user: str_(r['Full Name']), how: str_(r['Matched By']) };
    }), last: setRaw_('Last Checklist Doer Sync') };
}
function chkDoerLink_(ctx, d) {
  var row = Number(d.row), uid = str_(d.uid);
  var r = readObjs_(SH.CHK_DOERS).filter(function (x) { return x._row === row; })[0];
  if (!r) throw new Error('Row not found — sync again.');
  var name = uid ? userName_(uid) : '';
  updateObj_(SH.CHK_DOERS, row, { 'User ID': uid, 'Full Name': name, 'Matched By': uid ? 'Manual' : 'Not linked', 'Last Synced': new Date() });
  bumpGen_('users');
  log_(ctx, 'Checklist doer linked', str_(r['Checklist Name']) + ' · ' + str_(r['Doer Name']) + ' → ' + (name || 'nobody'));
  return { message: str_(r['Doer Name']) + (uid ? ' linked to ' + name + '.' : ' unlinked.') };
}
