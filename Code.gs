/*************************************************************************
 *  Code.gs — the web app entry point and the ONE api the page talks to.
 *  Every call carries the session token; the server works out who you are,
 *  what you may open and which outlet(s) you may touch — the browser is
 *  never trusted with any of that.
 *
 *  Speed: the first page load carries only the core (sign-in, shell,
 *  dashboard, checklist). Every other screen is a "bundle" fetched once
 *  through ui.bundle, kept in the browser by version, and pre-fetched in
 *  the background after sign-in — so the app stays fast as it grows.
 *************************************************************************/

function logoMark_() {
  var v = set_('Logo Mark', ''); if (!v) return '';
  if (/^(https?:|data:)/i.test(v)) return v;
  if (fastHost_()) return '';
  var key = 'logo_mark_' + gen_('cfg') + '_' + v.length, hit = cacheGetJ_(key);
  if (hit) return hit.u || '';
  var u = '';
  try {
    var id = (/[-\w]{25,}/.exec(v) || [v])[0], blob = DriveApp.getFileById(id).getBlob();
    if (blob.getBytes().length < 60000) u = 'data:' + (blob.getContentType() || 'image/png') + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (e) {}
  cachePutJ_(key, { u: u }, u ? 21600 : 600);
  return u;
}

function doGet(e) {
  rememberUrl_();
  var page = e && e.parameter ? str_(e.parameter.page) : '';
  if (page === 'join') {
    var j = HtmlService.createTemplateFromFile('Join');
    j.appName = set_('App Name', APP.NAME); j.logo = set_('Logo URL', APP.LOGO);
    return j.evaluate().setTitle('New Employee Joining — ' + set_('App Name', APP.NAME))
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  var t = HtmlService.createTemplateFromFile('Index');
  t.appName = set_('App Name', APP.NAME);
  t.logo = set_('Logo URL', APP.LOGO);
  t.mark = logoMark_();
  t.version = APP.VERSION;
  t.uiv = uiVersion_();
  t.link = appUrl_();
  var out = t.evaluate()
    .setTitle(set_('App Name', APP.NAME))
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  try { out.setFaviconUrl('https://img.icons8.com/color/48/tea.png'); } catch (x) {}
  return out;
}

function doPost(e) {
  var req = {};
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { req = {}; }
  return ContentService.createTextOutput(api(req)).setMimeType(ContentService.MimeType.JSON);
}

function include(f) { return HtmlService.createHtmlOutputFromFile(f).getContent(); }

/** Screens loaded on demand (the core — Script, Styles, ViewsWork — is in the page itself). */
var UI_BUNDLES = ['ViewsSelf', 'ViewsStock', 'ViewsPeople', 'ViewsApprove', 'ViewsHR', 'ViewsFms', 'ViewsTickets', 'ViewsPay', 'ViewsPoster', 'ViewsAdmin', 'ViewsDirector', 'ViewsOrder'];
function uiBundle_(ctx, d) {
  var names = [].concat(d.names || d.name || []).map(str_).filter(function (n) { return UI_BUNDLES.indexOf(n) >= 0; });
  if (!names.length) throw new Error('Unknown screen.');
  var files = {};
  names.forEach(function (n) { files[n] = uiFile_(n); });
  return { v: uiVersion_(), files: files };
}
function uiFile_(n) { __M.ui = __M.ui || {}; if (__M.ui[n] === undefined) __M.ui[n] = include(n); return __M.ui[n]; }
/** A hash of every screen bundle — the browser keeps a bundle only while this matches (a new deployment changes it). */
function uiVersion_() {
  if (__M.uiv) return __M.uiv;
  var ck = 'cg_uiv_' + APP.VERSION + '_' + APP.BUILD, hit = cacheGetJ_(ck);
  if (hit && hit.v) return (__M.uiv = hit.v);
  var all = ['Styles', 'Script', 'ViewsWork'].concat(UI_BUNDLES).map(function (n) { try { return uiFile_(n); } catch (e) { return ''; } }).join('|');
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, all, Utilities.Charset.UTF_8);
  __M.uiv = d.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('').substring(0, 12);
  cachePutJ_(ck, { v: __M.uiv }, 21600);
  return __M.uiv;
}

/** action → { fn(ctx, data), mod: module key(s) needed, pub: no login needed } */
function routes_() {
  return {
    'auth.login':        { pub: true, fn: function (c, d) { return authLogin_(d); } },
    'auth.logout':       { pub: true, fn: function (c, d, req) { return authLogout_(req.token); } },
    'auth.resume':       { fn: function (c, d) { var b = bootstrap_(c); return d && d.dash ? withDash_(c, b, d.outlet, 1500) : b; } },
    'auth.password':     { fn: authChangePassword_ },
    'ui.bundle':         { fn: uiBundle_ },

    'join.meta':         { pub: true, fn: function () { return joinMeta_(); } },
    'join.submit':       { pub: true, touch: ['empx'], fn: function (c, d) { return joinSubmit_(d); } },

    'dash.load':         { mod: 'dashboard', fn: dashLoad_ },
    'cal.save':          { mod: 'dashboard', fn: calSave_ },
    'cal.remove':        { mod: 'dashboard', fn: calRemove_ },
    'dir.home':          { mod: 'dashboard', fn: dirHome_ },
    'dir.chk':           { mod: 'dashboard', fn: dirChkList_ },
    'dir.chkUsers':      { mod: 'checklist_assign', fn: dirChkUsers_ },
    'dir.orders':        { mod: 'dashboard', fn: dirOrders_ },
    'dir.fms':           { mod: 'dashboard', fn: dirFms_ },
    'dir.dsr':           { mod: 'dashboard', fn: dirDsr_ },
    'dir.exp':           { mod: 'dashboard', fn: dirExp_ },
    'dir.grn':           { mod: 'dashboard', fn: dirGrn_ },
    'dlg.list':          { mod: 'delegate', fn: dlgList_ },
    'dlg.add':           { mod: 'delegate', fn: dlgAdd_ },
    'dir.food':          { mod: 'dashboard', fn: dirFood_ },
    'dir.cash':          { mod: 'dashboard', fn: dirCash_ },
    'dir.cashLines':     { mod: 'dashboard', fn: dirCashLines_ },
    'ev.list':           { fn: evList_ },
    'ev.boot':           { fn: evBoot_ },
    'dir.calling':       { mod: 'dashboard', fn: dirCalling_ },

    /* ---- the common checklist app ---- */
    'chk.my':            { mod: 'checklist', fn: chkMyTasks_ },
    'chk.overview':      { mod: 'checklist', fn: chkOverview_ },
    'chk.tasks':         { mod: 'checklist', fn: chkTasks_ },
    'chk.scores':        { mod: 'checklist', fn: chkScores_ },
    'chk.done':          { mod: 'checklist', fn: chkDone_ },
    'chk.assign':        { mod: 'checklist_assign', fn: chkAssign_ },
    'chk.unassign':      { mod: ['checklist_assign', 'checklist'], fn: chkUnassign_ },
    'chk.mine':          { mod: 'checklist', fn: chkAssignedToMe_ },
    'chk.users':         { mod: 'checklist_assign', fn: activeUsers_ },

    'task.mine':         { mod: 'tasks', fn: taskMine_ },
    'task.update':       { mod: 'tasks', fn: taskUpdate_ },
    'task.create':       { mod: 'delegate', fn: taskCreate_ },
    'task.sent':         { mod: 'delegate', fn: taskSent_ },
    'task.manage':       { mod: 'delegate', fn: taskManage_ },
    'task.users':        { mod: 'delegate', fn: taskUsers_ },
    'task.approveList':  { fn: taskApproveList_ },
    'task.approve':      { fn: taskApprove_ },

    /* ---- my space ---- */
    'prof.me':           { mod: 'profile', fn: profMe_ },
    'prof.doc':          { mod: 'profile', fn: profDoc_ },
    'req.meta':          { mod: 'my_requests', fn: reqMeta_ },
    'req.preview':       { mod: 'my_requests', fn: reqAdvPreview_ },
    'req.advance':       { mod: 'my_requests', fn: withMine_(reqAdvance_) },
    'req.leave':         { mod: 'my_requests', fn: withMine_(reqLeave_) },
    'req.reimb':         { mod: 'my_requests', fn: withMine_(reqReimb_) },
    'req.mine':          { mod: 'my_requests', fn: reqMine_ },
    'req.file':          { mod: ['my_requests', 'reimb_approve'], fn: laFile_ },

    /* ---- approvals (HR · Director · Accounts) ---- */
    'appr.load':         { mod: 'approvals', fn: apprLoad_ },
    'appr.hub':          { mod: ['approvals', 'leave', 'advance', 'employees'], fn: apprHub_ },
    'appr.track':        { mod: ['approvals', 'leave', 'advance'], fn: apprTrack_ },
    'dash.home':         { mod: 'dashboard', fn: dashHome_ },
    'appr.hrPreview':    { mod: 'adv_hr', fn: apprHrPreview_ },
    'appr.advHr':        { mod: 'adv_hr', fn: apprAdvHr_ },
    'appr.advResend':    { mod: 'adv_hr', fn: apprAdvResend_ },
    'appr.advClose':     { mod: 'adv_hr', fn: apprAdvHrClose_ },
    'appr.advAdmin':     { mod: 'adv_admin', fn: apprAdvAdmin_ },
    'appr.advPay':       { mod: 'adv_pay', fn: apprAdvPay_ },
    'appr.leave':        { mod: 'leave_final', fn: apprLeave_ },
    'appr.reimb':        { mod: 'reimb_approve', fn: apprReimb_ },
    'appr.staff':        { mod: ['leave_final', 'leave'], fn: apprStaff_ },

    /* ---- outlet ---- */
    'oa.boot':           { mod: 'orders', fn: oaBoot_ },
    'oa.read':           { mod: 'orders', fn: oaRead_ },
    'oa.write':          { mod: 'orders', fn: oaWrite_ },
    'ord.catalog':       { mod: 'orders', fn: ordCatalog_ },
    'ord.place':         { mod: 'orders', fn: ordPlace_ },
    'ord.history':       { mod: ['orders', 'grn'], fn: ordHistory_ },
    'ord.lines':         { mod: ['orders', 'grn'], fn: ordLines_ },
    'veg.items':         { mod: 'orders', fn: vegItems_ },
    'veg.place':         { mod: 'orders', fn: vegPlace_ },
    'veg.pending':       { mod: ['grn', 'orders'], fn: vegPending_ },
    'veg.order':         { mod: ['grn', 'orders'], fn: vegOrder_ },
    'veg.receive':       { mod: 'grn', fn: vegReceive_ },
    'veg.history':       { mod: ['grn', 'orders'], fn: vegHistory_ },
    'veg.month':         { mod: ['grn', 'orders'], fn: vegMonth_ },
    'stock.picker':      { mod: ['grn', 'orders'], fn: stockPicker_ },
    'stock.save':        { mod: ['grn', 'orders'], fn: stockSave_ },
    'stock.list':        { mod: ['grn', 'orders'], fn: stockList_ },
    'grn.orders':        { mod: 'grn', fn: grnOrders_ },
    'grn.load':          { mod: 'grn', fn: grnLoad_ },
    'grn.save':          { mod: 'grn', fn: grnSave_ },
    'grn.history':       { mod: 'grn', fn: grnHistory_ },
    'grn.lines':         { mod: 'grn', fn: grnLines_ },
    'item.list':         { mod: 'item_master', fn: itemList_ },
    'item.save':         { mod: 'item_master', fn: itemSave_ },
    'item.request':      { mod: 'item_master', fn: itemRequest_ },
    'item.requests':     { mod: 'item_master', fn: itemRequests_ },
    'item.decide':       { fn: itemDecide_ },
    'item.grnMeta':      { mod: 'item_master', fn: itemGrnMeta_ },
    'item.grnSave':      { mod: 'item_master', fn: itemGrnSave_ },
    'item.grns':         { mod: 'item_master', fn: itemGrns_ },
    'prod.report':       { mod: 'production', fn: prodReport_ },
    'prep.meta':         { mod: 'prod_entry', fn: prepMeta_ },
    'prep.start':        { mod: 'prod_entry', fn: prepStart_ },
    'prep.finish':       { mod: 'prod_entry', fn: prepFinish_ },
    'close.form':        { mod: 'closing', fn: closeForm_ },
    'close.save':        { mod: 'closing', fn: closeSave_ },
    'close.list':        { mod: 'closing', fn: closeList_ },
    'exp.meta':          { mod: 'expenses', fn: expMeta_ },
    'exp.save':          { mod: 'expenses', fn: expSave_ },
    'exp.list':          { mod: 'expenses', fn: expList_ },
    'att.day':           { mod: 'attendance', fn: attDay_ },
    'att.month':         { mod: 'attendance', fn: attMonth_ },
    'leave.list':        { mod: 'leave', fn: leaveList_ },
    'leave.decide':      { mod: 'leave', fn: leaveDecide_ },
    'adv.list':          { mod: 'advance', fn: advList_ },
    'adv.decide':        { mod: 'advance', fn: advDecide_ },
    'ros.load':          { mod: 'roster', fn: rosLoad_ },
    'ros.save':          { mod: 'roster', fn: rosSave_ },
    'ros.day':           { mod: 'roster', fn: rosDay_ },
    'ros.saveDay':       { mod: 'roster', fn: rosSaveDay_ },
    'ros.summary':       { mod: 'roster', fn: rosSummary_ },
    'ros.replace':       { mod: 'roster', fn: rosReplace_ },
    'ros.dayReport':     { mod: 'roster', fn: rosDayReport_ },
    'emp.shifts':        { mod: ['employees', 'hr_attendance'], fn: atEmpShiftList_ },
    'emp.shiftSave':     { mod: ['employees', 'hr_attendance'], fn: atEmpShiftSave_ },
    'rep.meta':          { mod: 'reports', fn: repMeta_ },
    'rep.advances':      { mod: ['reports', 'payroll'], fn: repAdvancesReport_ },
    'rep.leaves':        { mod: ['reports', 'leave_final'], fn: repLeaveReport_ },
    'rep.ot':            { mod: ['reports', 'hr_attendance'], fn: repOtReport_ },
    'cert.list':         { mod: 'certificates', fn: certList_ },
    'cert.save':         { mod: 'certificates', fn: certSave_ },
    'cert.remove':       { mod: 'certificates', fn: certRemove_ },
    'dsr.form':          { mod: 'dsr', fn: dsrForm_ },
    'dsr.submit':        { touch: ['dsr'], mod: 'dsr', fn: dsrSubmit_ },

    /* ---- HR ---- */
    'emp.stats':         { mod: 'employees', fn: empStats_ },
    'emp.search':        { mod: 'employees', fn: empSearch_ },
    'emp.save':          { touch: ['empx'], mod: 'employees', fn: emGate_('save', empSave_) },
    'emp.status':        { touch: ['empx'], mod: 'employees', fn: emGate_('status', empStatus_) },
    'emp.pending':       { mod: 'employees', fn: empPending_ },
    'emp.approve':       { touch: ['empx'], mod: 'employees', fn: emGate_('joining', empApprove_) },
    'emp.reject':        { touch: ['empx'], mod: 'employees', fn: emGate_('joinreject', empReject_) },
    'emp.docUpload':     { touch: ['empx'], mod: 'employees', fn: emGate_('doc', empDocUpload_) },
    'emp.docView':       { mod: 'employees', fn: empDocView_ },
    'emp.assets':        { mod: 'employees', fn: empAssets_ },
    'emp.assetSave':     { touch: ['empx'], mod: 'employees', fn: emGate_('asset', empAssetSave_) },
    'emp.changes':       { mod: 'employees', fn: empChanges_ },
    'emp.changeDecide':  { touch: ['empx'], mod: 'employees', fn: empChangeDecide_ },
    'emp.salary':        { mod: 'payroll', fn: empSalary_ },
    'emp.salarySave':    { touch: ['empx'], mod: 'payroll', fn: emGate_('salary', empSalarySave_) },
    'emp.log':           { mod: 'employees', fn: empLog_ },

    'hrd.att':           { mod: ['hr_dashboard', 'hr_attendance'], fn: hrdAtt_ },
    'hrd.hire':          { mod: 'hr_dashboard', fn: hrdHire_ },
    'tk.meta':           { mod: 'tickets', fn: tkMeta_ },
    'tk.list':           { mod: 'tickets', fn: tkList_ },
    'tk.get':            { mod: 'tickets', fn: tkGet_ },
    'tk.raise':          { mod: 'tickets', fn: tkRaise_ },
    'tk.update':         { mod: 'tickets', fn: tkUpdate_ },
    'tk.bulk':           { mod: 'tickets', fn: tkBulk_ },
    'fms.list':          { mod: 'fms', fn: fmsList_ },
    'fms.load':          { mod: 'fms', fn: fmsLoad_ },
    'fms.save':          { mod: ['fms', 'settings'], fn: fmsSave_ },
    'fms.done':          { mod: 'fms', fn: fmsDone_ },
    'fms.mine':          { fn: fmsMine_ },
    'fms.myDone':        { fn: fmsMyDone_ },
    'at.boot':           { mod: 'hr_attendance', fn: atBoot_ },
    'at.upload':         { mod: 'hr_attendance', fn: atUpload_ },
    'at.deleteDate':     { mod: 'att_config', fn: atDeleteDate_ },
    'at.saveRow':        { mod: 'hr_attendance', fn: atSaveRow_ },
    'at.data':           { mod: 'hr_attendance', fn: atData_ },
    'at.employees':      { mod: 'hr_attendance', fn: atEmployees_ },
    'at.map':            { mod: 'hr_attendance', fn: atAddMap_ },
    'at.report':         { mod: ['hr_attendance', 'reports'], fn: atReport_ },
    'at.history':        { mod: 'hr_attendance', fn: atHistory_ },
    'at.table':          { mod: 'hr_attendance', fn: atTable_ },
    'at.tableSave':      { mod: 'hr_attendance', fn: atTableSave_ },
    'at.refresh':        { mod: 'hr_attendance', fn: atRefresh_ },

    /* ---- penalties (HR · Outlet Incharge · MIS · Director) — the incharge sees only his outlet ---- */
    'pen.meta':          { mod: ['penalty', 'hr_attendance'], fn: penMeta_ },
    'pen.board':         { mod: ['penalty', 'hr_attendance'], fn: penBoard_ },
    'pen.save':          { mod: ['penalty', 'hr_attendance'], fn: penBoardSave_ },
    'pen.charges':       { mod: ['penalty', 'hr_attendance'], fn: penCharges_ },
    'pen.add':           { mod: ['penalty', 'hr_attendance'], fn: penAdd_ },
    'pen.remove':        { mod: ['penalty', 'hr_attendance'], fn: penRemove_ },
    'pen.summary':       { mod: ['penalty', 'hr_attendance'], fn: penSummary_ },
    'pen.list':          { mod: ['penalty', 'hr_attendance'], fn: penList_ },
    'pen.edit':          { mod: 'hr_attendance', fn: penEdit_ },
    'pen.ul':            { mod: ['penalty', 'hr_attendance'], fn: penUl_ },
    'pen.ulSave':        { mod: ['penalty', 'hr_attendance'], fn: penUlSave_ },
    'pen.editMany':      { mod: 'hr_attendance', fn: penEditMany_ },
    'pen.exc':           { mod: ['penalty', 'hr_attendance'], fn: penExc_ },
    'pen.excSave':       { mod: ['penalty', 'hr_attendance'], fn: penExcSave_ },
    'pen.excRemove':     { mod: ['penalty', 'hr_attendance'], fn: penExcRemove_ },
    'at.hub':            { mod: ['hr_attendance', 'penalty'], fn: atHub_ },
    'pen.report':        { mod: ['penalty', 'hr_attendance', 'reports'], fn: penReport_ },

    'pay.meta':          { mod: 'payroll', fn: payMeta_ },
    'pay.preview':       { mod: 'payroll', fn: payPreview_ },
    'pay.create':        { mod: 'payroll', fn: payCreate_ },
    'slip.meta':         { mod: 'salary_slips', fn: slipMeta_ },
    'slip.load':         { mod: 'salary_slips', fn: slipLoad_ },
    'slip.map':          { mod: 'salary_slips', fn: slipMap_ },
    'slip.pdf':          { mod: 'salary_slips', fn: slipPdf_ },
    'slip.model':        { mod: 'salary_slips', fn: slipModelGet_ },

    'poster.config':     { mod: 'poster', fn: posterConfig_ },
    'poster.save':       { mod: 'poster', fn: posterSave_ },
    'poster.benefit':    { mod: 'poster', fn: posterAddBenefit_ },
    'poster.section':    { mod: 'poster', fn: posterAddSection_ },
    'poster.sections':   { mod: 'poster', fn: posterSaveSections_ },

    /* ---- resources ---- */
    'apps.mine':         { mod: 'apps', fn: appsMine_ },
    'apps.open':         { mod: 'apps', fn: appsOpen_ },
    'apps.reveal':       { mod: 'apps', fn: appsReveal_ },
    'vault.mine':        { mod: 'vault', fn: vaultMine_ },
    'vault.reveal':      { mod: ['vault', 'vault_admin'], fn: vaultReveal_ },
    'vault.all':         { mod: 'vault_admin', fn: vaultAll_ },
    'vault.save':        { mod: 'vault_admin', fn: vaultSave_ },
    'vault.remove':      { mod: 'vault_admin', fn: vaultRemove_ },

    /* ---- admin ---- */
    'usr.list':          { mod: 'users', fn: usrList_ },
    'usr.save':          { mod: 'users', fn: usrSave_ },
    'usr.sessions':      { mod: 'users', fn: usrSessions_ },
    'usr.endSessions':   { mod: 'users', fn: usrEndSessions_ },
    'usr.bulk':          { mod: 'users', fn: usrBulk_ },
    'acc.meta':          { mod: 'access', fn: accMeta_ },
    'acc.save':          { mod: 'access', fn: accSave_ },
    'acc.remove':        { mod: 'access', fn: accRemove_ },
    'acc.who':           { mod: 'access', fn: accWho_ },
    'acc.person':        { mod: 'access', fn: accPerson_ },
    'chk.doers':         { mod: ['access', 'settings'], fn: chkDoerList_ },
    'chk.doerLink':      { mod: ['access', 'settings'], fn: chkDoerLink_ },
    'set.get':           { mod: 'settings', fn: setGet_ },
    'set.save':          { mod: 'settings', fn: setSave_ },
    'set.run':           { mod: 'settings', fn: setRun_ },
    'set.apps':          { mod: ['settings', 'access'], fn: setApps_ },
    'set.appSave':       { mod: ['settings', 'access'], fn: setAppSave_ },
    'set.appRemove':     { mod: ['settings', 'access'], fn: setAppRemove_ },
    'set.checklists':    { mod: ['settings', 'access'], fn: setChecklists_ },
    'set.checklistSave': { mod: ['settings', 'access'], fn: setChecklistSave_ },
    'set.mismatches':    { mod: 'settings', fn: setMismatches_ },
    'set.outlets':       { mod: 'settings', fn: setOutlets_ },
    'set.outletSave':    { mod: 'settings', fn: setOutletSave_ },

    'file.upload':       { fn: fileUpload_ },
    'file.view':         { fn: fileView_ }
  };
}

/** The only function the page calls.  req = { action, token, data } → JSON text */
function api(req) {
  var out;
  try {
    req = req || {};
    __M.inApi = true; __M.t0 = Date.now();
    try { autoUpgrade_(); } catch (e) {}                 // once per deployed version: new tabs, settings, HQ / GFP split …
    if (req.fresh) __M.fresh = true;          // the Refresh button: skip the shared read cache for this request
    try { fastBegin_(req); } catch (e) {}
    var r = routes_()[String(req.action || '')];
    if (!r) throw new Error('Unknown request: ' + req.action);
    if (r.pub) {
      out = { ok: true, data: r.fn(null, req.data || {}, req) };
      (r.touch || []).forEach(markDirty_);
    } else {
      var ctx = ctxFromToken_(req.token);
      if (!ctx) return JSON.stringify({ ok: false, expired: true, error: 'Your session has ended. Please sign in again.' });
      if (req.as && !/^ev\./.test(String(req.action))) ctx = evSwitch_(ctx, str_(req.as), String(req.action));
      if (r.mod) {
        var mods = [].concat(r.mod);
        if (!mods.some(function (m) { return can_(ctx, m); })) throw new Error('You do not have access to this section.');
      }
      out = { ok: true, data: r.fn(ctx, req.data || {}, req) };
      (r.touch || []).forEach(markDirty_);          // the shared read cache of that data is now stale
    }
  } catch (err) {
    out = { ok: false, error: (err && err.message) ? err.message : String(err) };
  }
  __M.inApi = false;
  try { flushDirty_(); } catch (e) {}              // every counter this request raised, in one call
  try { fastEnd_(out); } catch (e) {}
  return JSON.stringify(out, function (k, v) {
    if (this[k] instanceof Date) return fmt_(this[k], 'dd/MM/yyyy HH:mm');
    return v;
  });
}

/** Everyone who can sign in — for "assign to" pickers. */
function activeUsers_(ctx) {
  var acc = {};
  readObjs_(SH.ACCESS).forEach(function (r) { acc[str_(r['User ID'])] = r; });
  var mine = ctx.outlets;
  return readObjs_(SH.LOGIN).filter(function (r) { return /^active$/i.test(str_(r['Status'])) && str_(r['User ID']); })
    .map(function (r) {
      var a = acc[str_(r['User ID'])] || {};
      var emp = empById_(str_(r['Employee ID']));
      var home = outletByAny_(a['Home Outlet']) || (emp && emp.outletId ? outletById_(emp.outletId) : null);
      return { uid: str_(r['User ID']), name: str_(r['Full Name']), role: str_(a['Role']) || 'Staff',
        designation: emp ? emp.designation : '', outlet: home ? home.name : '', outletId: home ? home.id : '',
        mine: home ? mine.indexOf(home.id) >= 0 : false, hasPassword: !!str_(r['Password']) };
    })
    .sort(function (a, b) { return (b.mine - a.mine) || a.name.localeCompare(b.name); });
}

/** Staff of the applicant's outlet — replacement choices when a leave is approved. */
function apprStaff_(ctx, d) {
  var e = empById_(str_(d.empId));
  if (!e || !e.outletId) return { staff: [] };
  if (!can_(ctx, 'leave_final') && ctx.outlets.indexOf(e.outletId) < 0) throw new Error('Not your outlet.');
  return { staff: empsOfOutlet_(e.outletId).filter(function (x) { return x.id.toUpperCase() !== e.id.toUpperCase(); })
    .map(function (x) { return { id: x.id, name: x.name, designation: x.designation, same: norm_(x.designation) === norm_(e.designation) }; }) };
}

function userName_(uid) {
  var r = findObj_(SH.LOGIN, 'User ID', uid);
  return r ? str_(r['Full Name']) : uid;
}
function userEmail_(uid) {
  var r = findObj_(SH.LOGIN, 'User ID', uid);
  if (!r) return '';
  var e = str_(r['Email']);
  if (!e) { var emp = empById_(str_(r['Employee ID'])); if (emp) e = emp.email; }
  return e;
}
/* ============================ THE LINK TO SHARE ============================ */
/**
 * The web app link to hand out. Settings ▸ Web App Link wins; otherwise the deployment's /exec URL as
 * https://script.google.com/a/macros/<domain>/s/<id>/exec. The plain /macros/s/<id>/exec form fails on
 * phones signed in to several Google accounts: Google adds /u/N/ and shows "Sorry, unable to open the
 * file at present" for an app owned by a Workspace account.
 */
function appUrl_() {
  var fixed = str_(setRaw_('Web App Link'));
  if (fixed) return fixed.replace(/\/u\/\d+\//, '/');
  var u = '';
  u = str_(props_()['CG_WEBAPP_URL']);
  if (!u) { try { u = ScriptApp.getService().getUrl() || ''; } catch (e) { u = ''; } }
  return /\/exec\b/.test(u) ? shareUrl_(u) : u;          // a /dev test link is handed back as it is
}
/** Any form of an /exec URL (/macros/s/, /macros/u/6/s/, /a/macros/<domain>/s/, /a/<domain>/macros/s/) → the link to share. */
function shareUrl_(u) {
  u = str_(u);
  var m = u.match(/\/s\/([A-Za-z0-9_-]{20,})\/exec\b/);
  if (!m) return u;
  var dm = u.match(/\/a\/macros\/([^\/]+)\//) || u.match(/\/a\/([^\/~]+)\/macros\//);
  var dom = dm ? dm[1] : appDomain_();
  return dom ? 'https://script.google.com/a/macros/' + dom.toLowerCase() + '/s/' + m[1] + '/exec' : 'https://script.google.com/macros/s/' + m[1] + '/exec';
}
/** The Google Workspace domain that owns this app — '' for a personal Gmail account. */
function appDomain_() {
  if (__M.dom !== undefined) return __M.dom;
  var hit = cacheGetJ_('cg_domain_v1');
  if (hit) return (__M.dom = hit.d);
  var d = '';
  try { var o = db_().getOwner(); d = o ? str_(o.getEmail()).split('@')[1] || '' : ''; } catch (e) {}
  if (!d) { var t = str_(set_('Test Email', '')); d = t.indexOf('@') > 0 ? t.split('@')[1] : ''; }
  if (/^(gmail|googlemail)\.com$/i.test(d)) d = '';
  cachePutJ_('cg_domain_v1', { d: d.toLowerCase() }, 21600);
  return (__M.dom = d.toLowerCase());
}
/** Called on every page load: keeps the deployment's /exec URL, so the menu and the joining link always know it. */
function rememberUrl_() {
  try {
    var u = ScriptApp.getService().getUrl() || '';
    if (!/\/exec\b/.test(u)) return;
    if (props_()['CG_WEBAPP_URL'] !== u) propSet_('CG_WEBAPP_URL', u);
  } catch (e) {}
}
