function dlgData_() {
  if (__M.dlg) return __M.dlg;
  var today = todayIso_(), keep = iso_(addDays_(new Date(), -setNum_('Delegation Done Days', 90)));
  var people = {};
  taskPeople_().forEach(function (p) { people[p.uid] = p; });
  var counts = { pending: 0, waiting: 0, overdue: 0, done: 0, dueToday: 0 }, tasks = [];
  taskRows_().map(taskObj_).forEach(function (t) {
    if (t.cancelled) return;
    var p = people[t.to] || {};
    if (t.done) { if ((t.approvedIso || t.due || t.createdIso) < keep) return; counts.done++; }
    else if (t.waiting) counts.waiting++;
    else { counts.pending++; if (t.due && t.due < today) counts.overdue++; if (t.due === today) counts.dueToday++; }
    tasks.push({ id: t.id, row: 0, doer: t.toName || p.name || '—', key: t.to, dept: p.dept || '', place: p.outlet || '', task: t.title, desc: t.desc,
      first: t.createdIso, firstText: t.createdIso ? fmt_(isoToDate_(t.createdIso), 'dd MMM yyyy') : '', due: t.due, dueText: t.dueText, revs: t.revisions,
      status: t.done ? 'Done' : t.waiting ? 'Pending with EA' : 'Pending', overdue: t.overdue, by: t.byName, remark: t.assigneeRemarks, link: t.link,
      approvedBy: t.approvedBy, approved: t.approved, completed: t.completed });
  });
  var rank = { 'Pending': 0, 'Pending with EA': 1, 'Done': 2 };
  tasks.sort(function (a, b) {
    if (a.status !== b.status) return rank[a.status] - rank[b.status];
    return a.status === 'Done' ? String(b.due).localeCompare(String(a.due)) : String(a.due || '9').localeCompare(String(b.due || '9'));
  });
  var doers = taskPeople_().map(function (p) { return { key: p.uid, name: p.name, number: p.mobile, email: p.designation, dept: p.outlet || p.dept || 'Other' }; });
  __M.dlg = { tasks: tasks, doers: doers, counts: counts, keepFrom: keep };
  return __M.dlg;
}

function dlgList_(ctx, d) {
  var D = dlgData_();
  return { tasks: D.tasks, doers: D.doers, counts: D.counts, keepFrom: D.keepFrom, today: todayIso_() };
}

function dlgAdd_(ctx, d) {
  if (!str_(d.date)) throw new Error('Pick the date it is due.');
  var r = taskCreate_(ctx, { title: d.task, desc: d.desc, to: d.doers, due: d.date, priority: d.priority });
  delete __M.dlg;
  return r;
}

function dlgImportOld_() {
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty('CG_DLG_IMPORTED')) return '';
  var id = setRaw_('Delegation Sheet ID') || setRaw_('Legacy Delegation Sheet ID');
  if (!id) { p.setProperty('CG_DLG_IMPORTED', 'none'); return ''; }
  var t = extRead_(id, 'Master', { headerRow: 1 });
  var H = t.head, c = { id: col_(H, ['Task ID']), name: col_(H, ['Name']), task: col_(H, ['Task']), first: col_(H, ['First Date']),
    latest: col_(H, ['Latest Revision']), revs: col_(H, ['Total Revisions']), st: col_(H, ['Status']) };
  if (c.name < 0 || c.task < 0) throw new Error('the old Delegation sheet has no Name / Task columns');
  var have = {};
  taskRows_().forEach(function (r) { if (str_(r['Old Task ID'])) have[str_(r['Old Task ID'])] = 1; });
  var P = personMatcher_(), people = {}, keep = iso_(addDays_(new Date(), -setNum_('Delegation Done Days', 90))), deptOf = {};
  taskPeople_().forEach(function (x) { people[x.uid] = x; });
  try {
    var dlst = extRead_(id, 'Doer List', { headerRow: 1 }), dn = col_(dlst.head, ['Name']), dd = col_(dlst.head, ['Department']);
    if (dn >= 0 && dd >= 0) dlst.rows.forEach(function (r) { if (str_(r[dn])) deptOf[norm_(r[dn])] = norm_(r[dd]); });
  } catch (e) {}
  var byWords = function (nm) {
    var w = nameWords_(nm); if (!w.length) return null;
    var c = taskPeople_().filter(function (x) { var xw = nameWords_(x.name); return w.every(function (t) { return xw.indexOf(t) >= 0; }); });
    if (c.length > 1 && deptOf[norm_(nm)]) c = c.filter(function (x) { var d = norm_(x.dept); return d === deptOf[norm_(nm)] || d.indexOf(deptOf[norm_(nm)]) === 0 || deptOf[norm_(nm)].indexOf(d) === 0; });
    return c.length === 1 ? c[0] : null;
  };
  var rows = [], unlinked = 0, now = new Date();
  t.rows.forEach(function (r) {
    var who = str_(r[c.name]), task = str_(r[c.task]), st = c.st >= 0 ? str_(r[c.st]) : '', oid = c.id >= 0 ? str_(r[c.id]) : '';
    if (!who || !task || /shift/i.test(st) || (oid && have[oid])) return;
    var first = c.first >= 0 ? parseAny_(r[c.first]) : null, latest = (c.latest >= 0 ? parseAny_(r[c.latest]) : null) || first;
    var done = /complete|done/i.test(st);
    if (done && (!latest || iso_(latest) < keep)) return;
    var parts = who.split(' - '), nm = parts[0].trim(), mob = (parts[1] || '').split('/')[0];
    var m = P.match({ name: nm, mobile: mob }), pp = m ? people[m.uid] : null;
    if (!pp) pp = byWords(nm);
    if (!pp) unlinked++;
    rows.push({ 'Title': task, 'Description': '', 'Assigned By': '', 'Assigned By Name': 'Delegation sheet', 'Assigned To': pp ? pp.uid : '', 'Assigned To Name': pp ? pp.name : nm,
      'Doer Employee ID': pp ? pp.empId : '', 'Outlet ID': pp ? pp.outletId : '', 'Priority': 'Medium', 'Due Date': latest || '', 'Status': done ? 'Done' : 'Pending',
      'Created At': first || now, 'Updated At': now, 'Revisions': c.revs >= 0 ? num_(r[c.revs]) : 0, 'Approved By': done ? 'Delegation sheet' : '', 'Approved At': done ? (latest || now) : '',
      'Old Task ID': oid || ('row ' + (t.firstRow + t.rows.indexOf(r))) });
  });
  if (rows.length) lock_(function () {
    var ids = nextIds_(SH.TASKS, 'Task ID', 'DT-', 5, rows.length);
    rows.forEach(function (o, i) { o['Task ID'] = ids[i]; });
    appendObjs_(SH.TASKS, rows);
  });
  p.setProperty('CG_DLG_IMPORTED', fmt_(now, 'dd/MM/yyyy HH:mm'));
  bumpGen_('tasks');
  return 'Delegation: ' + rows.length + ' task(s) copied from the old Delegation sheet' + (unlinked ? ' (' + unlinked + ' doer(s) not matched to a login)' : '');
}
