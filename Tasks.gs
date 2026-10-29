/*************************************************************************
 *  Tasks.gs — Delegated tasks, kept in the "Delegated Tasks" tab of this
 *  spreadsheet. A Director / MIS / anyone with "Delegate Tasks" gives a task
 *  to anyone in the employee master; the doer marks it done (link, remark or
 *  file optional) and it is Done only when the EA approves it.
 *************************************************************************/

var DLG_APPROVER_DEFAULT = 'Executive Assistant (EA), Executive Assistant, EA';
var OPEN_TASK_RE = /^(pending|in progress|reopened|)$/i;
var WAIT_TASK_RE = /^pending approval$/i;
var DONE_TASK_RE = /^(done|verified)$/i;

function taskStatusText_(st) {
  if (WAIT_TASK_RE.test(st)) return 'Pending with EA';
  if (DONE_TASK_RE.test(st)) return 'Done';
  return st || 'Pending';
}
function taskObj_(r) {
  var st = str_(r['Status']) || 'Pending', open = OPEN_TASK_RE.test(st);
  return { id: str_(r['Task ID']), title: str_(r['Title']), desc: str_(r['Description']),
    by: str_(r['Assigned By']), byName: str_(r['Assigned By Name']), to: str_(r['Assigned To']),
    toName: str_(r['Assigned To Name']), empId: str_(r['Doer Employee ID']), outletId: str_(r['Outlet ID']), priority: str_(r['Priority']) || 'Medium',
    due: iso_(r['Due Date']), dueText: fmt_(r['Due Date'], 'dd MMM yyyy'), status: st, statusText: taskStatusText_(st),
    open: open, waiting: WAIT_TASK_RE.test(st), done: DONE_TASK_RE.test(st), cancelled: /^cancelled$/i.test(st),
    created: fmt_(r['Created At'], 'dd/MM/yyyy HH:mm'), createdIso: iso_(r['Created At']), updated: fmt_(r['Updated At'], 'dd/MM/yyyy HH:mm'),
    assigneeRemarks: str_(r['Assignee Remarks']), delegatorRemarks: str_(r['Delegator Remarks']), link: str_(r['Done Link']),
    fileUrl: str_(r['Attachment URL']), fileId: str_(r['Attachment ID']),
    completed: fmt_(r['Completed At'], 'dd/MM/yyyy HH:mm'), completedIso: iso_(r['Completed At']), revisions: num_(r['Revisions']),
    approvedBy: str_(r['Approved By']), approved: fmt_(r['Approved At'], 'dd/MM/yyyy HH:mm'), approvedIso: iso_(r['Approved At']),
    overdue: open && !!r['Due Date'] && iso_(r['Due Date']) < todayIso_() };
}
function taskRows_() { return readObjs_(SH.TASKS).filter(function (r) { return str_(r['Task ID']); }); }

function dlgIsApprover_(ctx) { return emListed_(ctx, 'Delegation Approvers', DLG_APPROVER_DEFAULT); }
function dlgApproverPeople_() {
  var list = list_(set_('Delegation Approvers', DLG_APPROVER_DEFAULT)).map(norm_);
  return taskPeople_().filter(function (p) { return [p.designation, p.empId, p.uid].some(function (v) { return !!str_(v) && list.indexOf(norm_(v)) >= 0; }); });
}

function taskPeople_() {
  if (__M.taskPeople) return __M.taskPeople;
  var logins = {};
  readObjs_(SH.LOGIN).forEach(function (r) { if (str_(r['User ID']) && /^active$/i.test(str_(r['Status']))) logins[str_(r['User ID'])] = r; });
  var seen = {}, out = [];
  employees_().forEach(function (e) {
    if (/inactive|left/i.test(e.status || '') || !e.uid || !logins[e.uid] || seen[e.uid]) return;
    seen[e.uid] = 1;
    var lg = logins[e.uid], o = e.outletId ? outletById_(e.outletId) : null;
    out.push({ uid: e.uid, empId: e.id, name: e.name || str_(lg['Full Name']), designation: e.designation, dept: e.department, outletId: e.outletId,
      outlet: o ? o.name : e.location, mobile: str_(e.phone || lg['Mobile']).replace(/\.0$/, ''), email: str_(lg['Email'] || e.email) });
  });
  out.sort(function (a, b) { return String(a.outlet).localeCompare(String(b.outlet)) || a.name.localeCompare(b.name); });
  __M.taskPeople = out;
  return out;
}
function taskUsers_(ctx) {
  return taskPeople_().map(function (p) { return { uid: p.uid, name: p.name, designation: p.designation, outlet: p.outlet, role: p.dept, mine: false }; });
}
function taskMail_(to, subject, title, inner) {
  if (!setYes_('Send Task Emails') || !str_(to)) return '';
  try { return mail_(to, subject, mailShell_(title, inner)); } catch (e) { return 'not sent'; }
}
function taskRowHtml_(t) {
  return '<table style="border-collapse:collapse;width:100%"><tr><td style="padding:6px;color:#8a7a6d">Task ID</td><td style="padding:6px"><b>' + esc_(t['Task ID']) + '</b></td></tr>' +
    '<tr><td style="padding:6px;color:#8a7a6d">Task</td><td style="padding:6px"><b>' + esc_(t['Title']) + '</b></td></tr>' +
    (str_(t['Description']) ? '<tr><td style="padding:6px;color:#8a7a6d">Details</td><td style="padding:6px">' + esc_(t['Description']).replace(/\n/g, '<br>') + '</td></tr>' : '') +
    '<tr><td style="padding:6px;color:#8a7a6d">Due</td><td style="padding:6px">' + (t['Due Date'] ? fmt_(t['Due Date'], 'dd MMM yyyy') : '—') + '</td></tr></table>' +
    (appUrl_() ? '<p style="margin-top:16px"><a href="' + appUrl_() + '" style="background:#6B3F1C;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Open CG One Login</a></p>' : '');
}

function taskMine_(ctx, d) {
  var list = taskRows_().filter(function (r) { return str_(r['Assigned To']) === ctx.uid; }).map(taskObj_);
  list.sort(function (a, b) { return (b.open - a.open) || (b.waiting - a.waiting) || String(a.due || '9').localeCompare(String(b.due || '9')); });
  return { tasks: list, legacy: [], approver: dlgIsApprover_(ctx) };
}

function taskCreate_(ctx, d) {
  var title = str_(d.title);
  if (!title) throw new Error('Write what needs to be done.');
  var to = uniq_((d.to || []).map(str_).filter(String));
  if (!to.length) throw new Error('Pick at least one person.');
  var due = isoToDate_(d.due);
  if (due && iso_(due) < todayIso_()) throw new Error('The due date cannot be in the past.');
  var people = {};
  taskPeople_().forEach(function (p) { people[p.uid] = p; });
  to.forEach(function (u) { if (!people[u]) throw new Error(u + ' is not an active employee with a login.'); });
  var res = lock_(function () {
    var ids = nextIds_(SH.TASKS, 'Task ID', 'DT-', 5, to.length), now = new Date();
    var rows = to.map(function (u, i) {
      var p = people[u];
      return { 'Task ID': ids[i], 'Title': title, 'Description': str_(d.desc), 'Assigned By': ctx.uid, 'Assigned By Name': ctx.name,
        'Assigned To': u, 'Assigned To Name': p.name, 'Doer Employee ID': p.empId, 'Outlet ID': p.outletId || '',
        'Priority': TASK_PRIORITIES.indexOf(d.priority) >= 0 ? d.priority : 'Medium', 'Due Date': due || '', 'Status': 'Pending',
        'Created At': now, 'Updated At': now, 'Attachment URL': str_(d.fileId) ? driveUrl_(d.fileId) : '', 'Attachment ID': str_(d.fileId), 'Revisions': 0 };
    });
    appendObjs_(SH.TASKS, rows);
    return { ids: ids, rows: rows };
  });
  bumpGen_('tasks');
  var mailed = 0;
  res.rows.forEach(function (r) {
    var st = taskMail_(people[r['Assigned To']].email, 'New task from ' + ctx.name + ': ' + title, 'A task has been delegated to you',
      '<p>Hi ' + esc_(r['Assigned To Name']) + ',</p><p><b>' + esc_(ctx.name) + '</b> has delegated a task to you.</p>' + taskRowHtml_(r));
    if (/^sent/i.test(str_(st))) mailed++;
  });
  log_(ctx, 'Task delegated', title + ' → ' + to.map(function (u) { return people[u].name; }).join(', '));
  return { message: 'Delegated to ' + to.map(function (u) { return people[u].name; }).join(', ') + (mailed ? ' · e-mailed ' + mailed : '') + '.', ids: res.ids };
}

function taskWrite_(row, patch) {
  try { updateObj_(SH.TASKS, row, patch); }
  catch (e) {
    if (!/validation/i.test(e.message)) throw e;
    applyDv_(SH.TASKS, 'Status', dv_(TASK_STATUSES));
    updateObj_(SH.TASKS, row, patch);
  }
}

function taskUpdate_(ctx, d) {
  var st = str_(d.status);
  if (['In Progress', 'Done'].indexOf(st) < 0) throw new Error('Pick In Progress or Done.');
  var link = str_(d.link);
  if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
  var res = lock_(function () {
    var r = findObj_(SH.TASKS, 'Task ID', str_(d.id));
    if (!r) throw new Error('Task not found.');
    if (str_(r['Assigned To']) !== ctx.uid) throw new Error('This task is not assigned to you.');
    var cur = str_(r['Status']);
    if (DONE_TASK_RE.test(cur) || /^cancelled$/i.test(cur)) throw new Error('This task is already closed.');
    if (WAIT_TASK_RE.test(cur)) throw new Error('Already sent to the EA for approval.');
    var now = new Date(), remark = str_(d.remark), old = str_(r['Assignee Remarks']);
    var patch = { 'Status': st === 'Done' ? 'Pending Approval' : 'In Progress', 'Updated At': now,
      'Assignee Remarks': remark ? fmt_(now, 'dd/MM HH:mm') + ' ' + remark + (old ? '\n' + old : '') : old };
    if (link) patch['Done Link'] = link;
    if (str_(d.fileId)) { patch['Attachment ID'] = str_(d.fileId); patch['Attachment URL'] = driveUrl_(d.fileId); }
    if (st === 'Done') patch['Completed At'] = now;
    taskWrite_(r._row, patch);
    return r;
  });
  bumpGen_('tasks');
  if (st === 'Done') {
    dlgApproverPeople_().forEach(function (p) {
      taskMail_(p.email, 'Task done — waiting for your approval: ' + str_(res['Title']), 'A delegated task is waiting for your approval',
        '<p><b>' + esc_(ctx.name) + '</b> marked this task done.</p>' + (str_(d.remark) ? '<p>Remark: ' + esc_(d.remark) + '</p>' : '') +
        (link ? '<p>Link: <a href="' + esc_(link) + '">' + esc_(link) + '</a></p>' : '') + taskRowHtml_(res));
    });
  }
  log_(ctx, 'Task ' + (st === 'Done' ? 'done, sent for approval' : st), str_(d.id));
  return { message: st === 'Done' ? 'Sent to the EA for approval — it is Done once she approves it.' : 'Marked In Progress.' };
}

function taskApproveList_(ctx) {
  if (!dlgIsApprover_(ctx)) throw new Error('Only the EA approves delegated tasks.');
  var month = fmt_(new Date(), 'yyyy-MM');
  var all = taskRows_().map(taskObj_);
  var waiting = all.filter(function (t) { return t.waiting; }).sort(function (a, b) { return String(a.completedIso).localeCompare(String(b.completedIso)); });
  var recent = all.filter(function (t) { return t.done && t.approvedIso && t.approvedIso.slice(0, 7) === month; })
    .sort(function (a, b) { return String(b.approvedIso).localeCompare(String(a.approvedIso)); }).slice(0, 100);
  waiting.forEach(function (t) { t.own = t.to === ctx.uid; });
  return { waiting: waiting, recent: recent, month: monthLabel_() };
}

function taskApprove_(ctx, d) {
  if (!dlgIsApprover_(ctx)) throw new Error('Only the EA approves delegated tasks.');
  var dec = str_(d.decision), ids = uniq_([].concat(d.ids || d.id || []).map(str_).filter(String));
  if (!ids.length) throw new Error('Tick at least one task.');
  if (dec !== 'approve' && dec !== 'return') throw new Error('Pick Approve or Send back.');
  var remark = str_(d.remark);
  if (dec === 'return' && !remark) throw new Error('Write why it is sent back.');
  var done = [], skipped = [];
  lock_(function () {
    var now = new Date();
    ids.forEach(function (id) {
      var r = findObj_(SH.TASKS, 'Task ID', id);
      if (!r) { skipped.push(id + ' (not found)'); return; }
      if (!WAIT_TASK_RE.test(str_(r['Status']))) { skipped.push(id + ' (not waiting for approval)'); return; }
      if (str_(r['Assigned To']) === ctx.uid) { skipped.push(id + ' (your own task)'); return; }
      var note = remark ? fmt_(now, 'dd/MM HH:mm') + ' ' + ctx.name + ': ' + remark + (str_(r['Delegator Remarks']) ? '\n' + str_(r['Delegator Remarks']) : '') : str_(r['Delegator Remarks']);
      if (dec === 'approve') updateObj_(SH.TASKS, r._row, { 'Status': 'Done', 'Approved By': ctx.name, 'Approved At': now, 'Updated At': now, 'Delegator Remarks': note });
      else updateObj_(SH.TASKS, r._row, { 'Status': 'Reopened', 'Revisions': num_(r['Revisions']) + 1, 'Updated At': now, 'Delegator Remarks': note, 'Completed At': '' });
      done.push(r);
    });
  });
  bumpGen_('tasks');
  done.forEach(function (r) {
    var who = taskPeople_().filter(function (p) { return p.uid === str_(r['Assigned To']); })[0];
    taskMail_(who ? who.email : userEmail_(str_(r['Assigned To'])), (dec === 'approve' ? 'Task approved: ' : 'Task sent back: ') + str_(r['Title']), dec === 'approve' ? 'Your task is approved' : 'Your task was sent back',
      '<p><b>' + esc_(ctx.name) + '</b> ' + (dec === 'approve' ? 'approved' : 'sent back') + ' this task.</p>' + (remark ? '<p>Remark: ' + esc_(remark) + '</p>' : '') + taskRowHtml_(r));
  });
  log_(ctx, 'Delegated task ' + (dec === 'approve' ? 'approved' : 'sent back'), done.map(function (r) { return str_(r['Task ID']); }).join(', '));
  return { message: done.length + ' task(s) ' + (dec === 'approve' ? 'approved — now Done' : 'sent back to the doer') + '.' + (skipped.length ? ' Skipped: ' + skipped.join(', ') : '') };
}

function taskSent_(ctx, d) {
  var all = !!d.all && (ctx.super || dirIs_(ctx) || dlgIsApprover_(ctx));
  var list = taskRows_().filter(function (r) { return all || str_(r['Assigned By']) === ctx.uid; }).map(taskObj_);
  list.sort(function (a, b) { return String(b.id).localeCompare(String(a.id)); });
  return { tasks: list.slice(0, 500), approver: dlgIsApprover_(ctx) };
}

function taskManage_(ctx, d) {
  var act = str_(d.action);
  if (act === 'verify') return taskApprove_(ctx, { ids: [d.id], decision: 'approve', remark: d.remark });
  var res = lock_(function () {
    var r = findObj_(SH.TASKS, 'Task ID', str_(d.id));
    if (!r) throw new Error('Task not found.');
    if (str_(r['Assigned By']) !== ctx.uid && !ctx.super && !dirIs_(ctx)) throw new Error('Only the person who delegated it can change it.');
    var now = new Date(), patch = { 'Updated At': now }, msg = '';
    patch['Delegator Remarks'] = str_(d.remark) ? fmt_(now, 'dd/MM HH:mm') + ' ' + str_(d.remark) + (str_(r['Delegator Remarks']) ? '\n' + str_(r['Delegator Remarks']) : '') : str_(r['Delegator Remarks']);
    if (act === 'reopen') { patch['Status'] = 'Reopened'; patch['Revisions'] = num_(r['Revisions']) + 1; patch['Completed At'] = ''; msg = 'Reopened.'; }
    else if (act === 'cancel') { patch['Status'] = 'Cancelled'; msg = 'Cancelled.'; }
    else if (act === 'extend') {
      var due = isoToDate_(d.due); if (!due) throw new Error('Pick the new due date.');
      patch['Due Date'] = due; patch['Revisions'] = num_(r['Revisions']) + 1; msg = 'Due date moved to ' + fmt_(due, 'dd MMM yyyy') + '.';
    } else throw new Error('Unknown action.');
    updateObj_(SH.TASKS, r._row, patch);
    return { r: r, msg: msg };
  });
  bumpGen_('tasks');
  taskMail_(userEmail_(str_(res.r['Assigned To'])), 'Task update: ' + str_(res.r['Title']), 'Task update',
    '<p><b>' + esc_(ctx.name) + '</b>: ' + esc_(res.msg) + '</p>' + (d.remark ? '<p>Remark: ' + esc_(d.remark) + '</p>' : '') + taskRowHtml_(res.r));
  log_(ctx, 'Task ' + act, str_(d.id));
  return { message: res.msg };
}
