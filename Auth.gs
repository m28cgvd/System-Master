/*************************************************************************
 *  Auth.gs — ONE login for everyone.
 *    Login tab   = authentication (who can sign in, with what password)
 *    Access tab  = authorization  (role + Yes/No per module + outlets)
 *    Roles tab   = the defaults a blank Access cell falls back to
 *    Access Rules= item-wise grants by location / department / designation / user
 *    Sessions    = every sign-in, so a session can be ended from the sheet
 *************************************************************************/

/* ============================ MODULES & ROLES ============================ */
function modules_() {
  if (__M.mods) return __M.mods;
  var key = 'cg_mods_' + gen_('cfg');
  var hit = cacheGetJ_(key);
  if (hit) { __M.mods = hit; return hit; }
  var rows = [];
  try { rows = readObjs_(SH.MODULES); } catch (e) { rows = []; }
  var out = rows.filter(function (r) { return str_(r['Module Key']); }).map(function (r) {
    return { key: str_(r['Module Key']), name: str_(r['Module Name']) || str_(r['Module Key']),
      group: str_(r['Menu Group']) || 'Other', icon: str_(r['Icon']) || 'apps', sort: num_(r['Sort']) || 999,
      status: str_(r['Status']) || 'Active', desc: str_(r['Description']) };
  });
  // A section added by a newer version of the code works at once — setup (① Set up / repair) writes its row later.
  var have = {}; out.forEach(function (m) { have[m.key] = 1; });
  MODULE_DEFAULTS_().forEach(function (m) {
    if (!have[m[0]]) out.push({ key: m[0], name: m[1], group: m[2], icon: m[3], sort: m[4], status: m[5], desc: m[6] });
  });
  out.sort(function (a, b) { return a.sort - b.sort; });
  cachePutJ_(key, out, 600);
  __M.mods = out;
  return out;
}

/** Which module does a column header on Roles / Access mean? (name or key) */
function moduleForHeader_(h) {
  var n = norm_(h); if (!n) return null;
  var mods = modules_();
  for (var i = 0; i < mods.length; i++) if (norm_(mods[i].name) === n || norm_(mods[i].key) === n) return mods[i];
  return null;
}

function roles_() {
  if (__M.roles) return __M.roles;
  var key = 'cg_roles_' + gen_('cfg');
  var hit = cacheGetJ_(key);
  if (hit) { __M.roles = hit; return hit; }
  var out = { list: [], byNorm: {} };
  var rows = readObjs_(SH.ROLES);
  var head = heads_(SH.ROLES).names;
  var defs = {}; ROLE_DEFAULTS_().forEach(function (d) { defs[norm_(d.name)] = d.grants; });
  var mods = modules_();
  rows.forEach(function (r) {
    var name = str_(r['Role Name']); if (!name) return;
    var grants = {}, d = defs[norm_(name)] || {};
    head.forEach(function (h) { var m = moduleForHeader_(h); if (m) grants[m.key] = yes_(r[h]) ? 'Yes' : 'No'; });
    mods.forEach(function (m) { if (grants[m.key] === undefined) grants[m.key] = d[m.key] || 'No'; });   // no column yet → the built-in default
    var o = { id: str_(r['Role ID']), name: name, title: str_(r['Workspace Title']) || name,
      desc: str_(r['Description']), active: !no_(r['Status']) && !/inactive/i.test(str_(r['Status'])), grants: grants };
    out.list.push(o); out.byNorm[norm_(name)] = o;
  });
  if (!out.list.length) {
    ROLE_DEFAULTS_().forEach(function (d) {
      var o = { id: d.id, name: d.name, title: d.title, desc: d.desc, active: true, grants: d.grants };
      out.list.push(o); out.byNorm[norm_(d.name)] = o;
    });
  }
  cachePutJ_(key, out, 600);
  __M.roles = out;
  return out;
}

/* ============================ OUTLETS ============================ */
function outlets_() {
  if (__M.outlets) return __M.outlets;
  var key = 'cg_outlets_' + gen_('cfg');
  var hit = cacheGetJ_(key);
  if (hit) { __M.outlets = hit; return hit; }
  var out = readObjs_(SH.OUTLETS).filter(function (r) { return str_(r['Outlet ID']); }).map(function (r) {
    var o = { id: str_(r['Outlet ID']), name: str_(r['Outlet Name']), code: str_(r['Outlet Code']),
      short: str_(r['Short Code']).toUpperCase(), type: str_(r['Type']) || 'Outlet',
      location: str_(r['Location Label']), orderName: str_(r['Order Outlet Name']) || str_(r['Outlet Name']),
      dsrTab: str_(r['DSR Tab']), email: str_(r['Email']), phone: str_(r['Phone']),
      model: str_(r['Model']).toUpperCase(),
      active: !/inactive|closed|^no$/i.test(str_(r['Status'])) };
    var al = [o.id, o.name, o.code, o.short, o.location, o.orderName, o.dsrTab].concat(list_(r['Aliases']));
    var m = o.location.match(/\(([^)]+)\)/); if (m) al.push(m[1]);
    o.aliases = uniq_(al.map(norm_).filter(String));
    return o;
  });
  cachePutJ_(key, out, 600);
  __M.outlets = out;
  return out;
}
function outletById_(id) {
  var list = outlets_();
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}
/* ---- outlets we run (COCO / FOCO) ---- */
/** The outlet models we run ourselves — Settings ▸ Operated Models (COCO, FOCO). */
function opModels_() {
  if (!__M.opModels) __M.opModels = list_(set_('Operated Models', 'COCO, FOCO')).map(function (m) { return m.toUpperCase(); });
  return __M.opModels;
}
/** Run by us: the Head Office (any type other than Outlet) or an outlet whose Model is an operated model. */
function outletRun_(o) { return !!o && (o.type !== 'Outlet' || opModels_().indexOf(str_(o.model).toUpperCase()) >= 0); }
/**
 * True when a location text / outlet id belongs to an outlet we do NOT run (FOFO …): no attendance,
 * penalties, salary preparation or checklists for its staff. An unknown location is treated as ours.
 */
function franchiseLoc_(loc) {
  var k = norm_(loc); if (!k) return false;
  __M.frLoc = __M.frLoc || {};
  if (__M.frLoc[k] === undefined) { var o = outletByAny_(loc) || outletById_(str_(loc)); __M.frLoc[k] = !!o && !outletRun_(o); }
  return __M.frLoc[k];
}
function modelText_(o) { return o ? (o.model || (o.type === 'Outlet' ? 'model not set' : o.type)) : ''; }

/** Any spelling (id, code, short code, name, "Pandri (CG001)", alias) → outlet. */
function outletByAny_(v) {
  var n = norm_(v); if (!n) return null;
  var list = outlets_();
  for (var i = 0; i < list.length; i++) if (list[i].aliases.indexOf(n) >= 0) return list[i];
  var m = str_(v).match(/\(([^)]+)\)/);
  if (m) { var n2 = norm_(m[1]); for (var j = 0; j < list.length; j++) if (list[j].aliases.indexOf(n2) >= 0) return list[j]; }
  return null;
}

/* ============================ SESSION TOKENS ============================ */
function secret_() {
  var s = props_()['CG_SECRET'];
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); propSet_('CG_SECRET', s); }
  return s;
}
function sign_(s) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(s), secret_())).replace(/=+$/, '');
}
function makeToken_(sid) { return sid + '.' + sign_(sid); }
function sidFromToken_(tok) {
  var p = str_(tok).split('.');
  if (p.length !== 2 || !p[0] || !p[1]) return null;
  return sign_(p[0]) === p[1] ? p[0] : null;
}

function sessionUid_(token) {
  var sid = sidFromToken_(token);
  if (!sid) return null;
  var now = Date.now();
  var c = cacheGetJ_('ses_' + sid);
  if (c) return (c.st === 'Active' && c.exp > now) ? c.uid : null;
  var row = findObj_(SH.SESSIONS, 'Session ID', sid);
  if (!row) return null;
  var exp = parseAny_(row['Expires At']);
  if (str_(row['Status']) !== 'Active' || !exp || exp.getTime() <= now) {
    cachePutJ_('ses_' + sid, { uid: '', exp: 0, st: 'Ended' }, 600);
    return null;
  }
  var uid = str_(row['User ID']);
  cachePutJ_('ses_' + sid, { uid: uid, exp: exp.getTime(), st: 'Active' }, Math.min(21600, Math.floor((exp.getTime() - now) / 1000)));
  if (!fastHost_()) { try { updateObj_(SH.SESSIONS, row._row, { 'Last Seen': new Date() }); } catch (e) {} }
  return uid;
}

function endSessions_(uid, exceptSid) {
  var rows = readObjs_(SH.SESSIONS).filter(function (r) {
    return str_(r['User ID']) === uid && str_(r['Status']) === 'Active' && str_(r['Session ID']) !== exceptSid;
  });
  rows.forEach(function (r) {
    updateObj_(SH.SESSIONS, r._row, { 'Status': 'Ended' });
    cachePutJ_('ses_' + str_(r['Session ID']), { uid: '', exp: 0, st: 'Ended' }, 21600);
  });
  return rows.length;
}

/* ============================ LOGIN ============================ */
function authLogin_(d) {
  d = d || {};
  var id = str_(d.loginId).toLowerCase(), pw = str_(d.password);
  if (!id || !pw) throw new Error('Enter your User ID and password.');

  var failKey = 'fail_' + norm_(id);
  var fails = cacheGetJ_(failKey) || 0;
  if (fails >= 8) throw new Error('Too many wrong attempts. Please wait 15 minutes or contact MIS.');

  var rows = readObjs_(SH.LOGIN);
  var cand = rows.filter(function (r) {
    return ['Login ID', 'Employee ID', 'Email', 'Mobile', 'User ID'].some(function (k) {
      var v = str_(r[k]).toLowerCase(); return v && v === id;
    });
  });
  function fail(msg) { cachePutJ_(failKey, fails + 1, 900); throw new Error(msg || 'User ID or password is incorrect.'); }
  if (!cand.length) fail();
  var u = null;
  for (var i = 0; i < cand.length; i++) if (str_(cand[i]['Password']) && str_(cand[i]['Password']) === pw) { u = cand[i]; break; }
  if (!u) {
    if (cand.every(function (r) { return !str_(r['Password']); })) throw new Error('Your password has not been set yet. Please contact MIS.');
    fail();
  }
  if (!/^active$/i.test(str_(u['Status']))) throw new Error('Your login is not active. Please contact MIS.');
  cacheDel_([failKey]);

  var uid = str_(u['User ID']);
  var ctx = buildCtx_(uid, true);
  if (!ctx) throw new Error('Your access has not been set up yet. Please contact MIS.');
  if (!ctx.menu.length) throw new Error('No section has been given to your login yet. Please contact MIS.');

  var remember = !!d.remember;
  var hours = remember ? setNum_('Remember Me Days', 30) * 24 : setNum_('Session Hours', 12);
  var now = new Date(), exp = new Date(now.getTime() + hours * 3600000);
  var sid = Utilities.getUuid().replace(/-/g, '');
  lock_(function () {
    if (setYes_('Single Session Per User')) endSessions_(uid, sid);
    appendObj_(SH.SESSIONS, {
      'Session ID': sid, 'User ID': uid, 'Full Name': ctx.name, 'Created At': now, 'Expires At': exp,
      'Remember Me': remember ? 'Yes' : 'No', 'Last Seen': now, 'Status': 'Active', 'Device': str_(d.device).substring(0, 180)
    });
    updateObj_(SH.LOGIN, u._row, { 'Last Login': now, 'Login Count': num_(u['Login Count']) + 1 });
  });
  cachePutJ_('ses_' + sid, { uid: uid, exp: exp.getTime(), st: 'Active' }, Math.min(21600, hours * 3600));
  log_(ctx, 'Login', remember ? 'Remember me' : '');
  var boot = bootstrap_(ctx);
  boot.token = makeToken_(sid);
  boot.remember = remember;
  boot.expires = exp.getTime();
  return withDash_(ctx, boot, d.outlet, 1500);
}

function authLogout_(token) {
  var sid = sidFromToken_(token);
  if (!sid) return true;
  cachePutJ_('ses_' + sid, { uid: '', exp: 0, st: 'Ended' }, 21600);
  try {
    var row = findObj_(SH.SESSIONS, 'Session ID', sid);
    if (row) updateObj_(SH.SESSIONS, row._row, { 'Status': 'Logged Out', 'Last Seen': new Date() });
  } catch (e) {}
  return true;
}

function authChangePassword_(ctx, d) {
  var oldPw = str_(d.oldPassword), newPw = str_(d.newPassword);
  if (newPw.length < 4) throw new Error('The new password must have at least 4 characters.');
  var row = findObj_(SH.LOGIN, 'User ID', ctx.uid);
  if (!row || str_(row['Password']) !== oldPw) throw new Error('Your current password is not correct.');
  updateObj_(SH.LOGIN, row._row, { 'Password': newPw, 'Remarks': 'Password changed by user on ' + fmt_(new Date(), 'dd/MM/yyyy HH:mm') });
  log_(ctx, 'Password changed', '');
  return { message: 'Password changed.' };
}

/* ============================ CONTEXT (who is calling) ============================ */
function ctxFromToken_(token) {
  var uid = sessionUid_(token);
  if (!uid) return null;
  return buildCtx_(uid, false);
}

/** Sections that only make sense for someone who runs (or oversees) an outlet. */
var OUTLET_MODULES = ['orders', 'grn', 'production', 'closing', 'wastage', 'dsr', 'expenses', 'sales', 'attendance',
  'leave', 'advance', 'roster', 'certificates', 'checklist_assign'];

function buildCtx_(uid, fresh) {
  var key = 'ctx2_' + gen_('users') + '_' + gen_('cfg') + '_' + gen_('emps') + '_' + gen_('fms') + '_' + uid;
  if (!fresh) { var hit = cacheGetJ_(key); if (hit) return hit; }

  var login = findObj_(SH.LOGIN, 'User ID', uid);
  if (!login || !/^active$/i.test(str_(login['Status']))) return null;
  var acc = findObj_(SH.ACCESS, 'User ID', uid) || {};
  var rs = roles_();
  var role = rs.byNorm[norm_(acc['Role'])] || rs.byNorm['staff'] || rs.list[rs.list.length - 1];
  var roleName = role ? role.name : 'Staff';
  var emp = empById_(str_(login['Employee ID']));
  var home = outletByAny_(acc['Home Outlet']) || (emp && emp.outletId ? outletById_(emp.outletId) : null);
  var p = accPersonOf_(uid, roleName, emp, home ? home.id : '');

  // ---- sections: own Access cell › Access Rules › Role ----
  var mods = modules_();
  var accHead = heads_(SH.ACCESS).names;
  var colFor = {};
  accHead.forEach(function (h) { var m = moduleForHeader_(h); if (m && !colFor[m.key]) colFor[m.key] = h; });
  var grants = {};
  mods.forEach(function (m) {
    var v = colFor[m.key] ? str_(acc[colFor[m.key]]) : '';
    if (yes_(v) || no_(v)) { grants[m.key] = yes_(v); return; }
    var r = accResolve_(p, 'Section', m.key);
    if (r) { grants[m.key] = r.acc !== 'No'; return; }
    grants[m.key] = yes_((role && role.grants[m.key]) || 'No') || (m.key === 'prod_entry' && prepDoerDefault_(emp, home));
  });

  // ---- outlets: only real outlets (Bhanpuri HQ / GFP are Head Office) ----
  var isIncharge = norm_(roleName) === 'outletincharge';
  var accessText = str_(acc['Outlet Access']);
  var wantsAll = /^(all|\*)$/i.test(accessText);
  var all = wantsAll && !isIncharge;                       // an incharge never gets every outlet
  var realOutlets = outlets_().filter(function (o) { return o.active && o.type === 'Outlet'; });
  var outs = [];
  if (all) outs = realOutlets.slice();
  else {
    list_(accessText).forEach(function (t) {
      if (/^(all|\*)$/i.test(t)) return;
      var o = outletByAny_(t);
      if (o && o.type === 'Outlet' && o.active && !outs.some(function (x) { return x.id === o.id; })) outs.push(o);
    });
    if (!outs.length && home && home.type === 'Outlet') outs.push(home);
  }
  // HR works only on the outlets we run (Pandri, Chanderi …) — the employee records of every outlet stay open under Employees
  if (norm_(roleName) === 'hr' && !grants.users && !grants.settings) { outs = outs.filter(outletRun_); all = false; }
  if (!outs.length) OUTLET_MODULES.forEach(function (k) { grants[k] = false; });
  if (grants.order_dispatch) grants.orders = true;

  // ---- attendance, penalties and checklists: only outlets we run (COCO / FOCO) and the Head Office ----
  var runOuts = outs.filter(outletRun_);
  if (!runOuts.length) { grants.attendance = false; grants.checklist_assign = false; }
  if (grants.penalty && !runOuts.length && !all && !grants.hr_attendance) grants.penalty = false;   // nobody to see
  var franchise = !!(home && home.type === 'Outlet' && !outletRun_(home));        // works at an outlet we do not run

  var name = str_(login['Full Name']) || (emp && emp.name) || uid;
  var superUser = all && !!(grants.users || grants.settings);

  // ---- checklists ----
  var chkInfo = chkAccessMap_(p, { uid: uid, name: name, email: str_(login['Email']) || (emp && emp.email) || '', super: superUser,
    assign: !!grants.checklist_assign, outlets: runOuts.map(function (o) { return o.id; }), doerNames: list_(acc['Checklist Doer Name']),
    franchise: franchise && !superUser });
  var hasAssigned = false;
  try { hasAssigned = openAssignments_(function (r) { return str_(r['Assigned To']) === uid; }).length > 0; } catch (e) {}
  if (!Object.keys(chkInfo.map).length && !hasAssigned) grants.checklist = false;

  // ---- self service needs an employee record ----
  var empId = str_(login['Employee ID']);
  if (!empId) { grants.profile = false; grants.my_requests = false; }

  // ---- Tickets: the Process Coordinator (Settings ▸ Ticket Tracker Designations) tracks every ticket ----
  var tdes = norm_(emp ? emp.designation : '');
  if (!grants.ticket_track && tdes && list_(set_('Ticket Tracker Designations', 'Process Coordinator (PC), Process Coordinator')).some(function (x) { return norm_(x) === tdes; })) grants.ticket_track = true;
  if (grants.ticket_track || !no_(colFor.tickets ? str_(acc[colFor.tickets]) : '')) grants.tickets = true;   // everyone can raise a ticket (unless their own Access cell says No)

  // ---- FMS Summary: admins / MIS see every FMS; others only when an active FMS (Settings ▸ FMS Sheets) names their department or designation ----
  try {
    var fx = { uid: uid, super: superUser, role: roleName, grants: grants, department: emp ? emp.department : '', deptId: emp ? emp.deptId : '', designation: emp ? emp.designation : '' };
    if (!fmsAdmin_(fx)) grants.fms = !no_(colFor.fms ? str_(acc[colFor.fms]) : '') && fmsAll_().some(function (f) { return fmsSees_(fx, f); });
  } catch (e) {}

  var menu = mods.filter(function (m) { return grants[m.key] && !/hidden/i.test(m.status); })
    .map(function (m) { return { key: m.key, name: m.name, group: m.group, icon: m.icon, soon: /soon/i.test(m.status) }; });

  var ctx = {
    uid: uid, name: name, first: name.split(/\s+/)[0],
    email: str_(login['Email']) || (emp && emp.email) || '',
    mobile: str_(login['Mobile']) || (emp && emp.phone) || '',
    empId: empId,
    designation: emp ? emp.designation : '', department: emp ? emp.department : '',
    deptId: emp ? emp.deptId : '', desigId: emp ? emp.desigId : '',
    role: roleName, roleTitle: role ? role.title : 'My Workspace',
    grants: grants, menu: menu,
    allOutlets: all,
    outlets: outs.map(function (o) { return o.id; }),
    runOutlets: runOuts.map(function (o) { return o.id; }), franchise: franchise,
    home: home ? home.id : '', homeType: home ? home.type : '', homeName: home ? home.name : '',
    chk: chkInfo.map, doerMap: chkInfo.ids,
    doers: chkInfo.global,
    super: superUser
  };
  ctx.menu = navFold_(ctx, mods);
  cachePutJ_(key, ctx, 300);
  return ctx;
}

function can_(ctx, mod) { return !!(ctx && ctx.grants && ctx.grants[mod]); }
function need_(ctx, mod) { if (!can_(ctx, mod)) throw new Error('You do not have access to this section.'); }

/** The outlet a call works on — always one the caller is allowed. */
function pickOutlet_(ctx, outletId, allowAll) {
  var id = str_(outletId);
  if (allowAll && (id === 'ALL' || id === '*') && ctx.outlets.length > 1) return null;   // null = every allowed outlet
  if (id && ctx.outlets.indexOf(id) >= 0) return outletById_(id);
  if (id && id !== 'ALL' && id !== '*' && outletById_(id)) throw new Error('That outlet is not linked to your login.');   // never quietly work on another outlet
  if (ctx.home && ctx.outlets.indexOf(ctx.home) >= 0) return outletById_(ctx.home);
  if (ctx.outlets.length) return outletById_(ctx.outlets[0]);
  throw new Error('No outlet is linked to your login. Please contact MIS.');
}
function outletsFor_(ctx, outletId) {
  if (!ctx.outlets.length) return [];
  var o = pickOutlet_(ctx, outletId, true);
  if (o) return [o];
  return ctx.outlets.map(outletById_).filter(Boolean);
}
/** Like outletsFor_, but only outlets we run (COCO / FOCO) — attendance is not kept for the others. */
function runOutletsFor_(ctx, outletId) {
  var list = outletsFor_(ctx, outletId), run = list.filter(outletRun_);
  if (!run.length) {
    throw new Error((list.length === 1 ? list[0].name + ' is a ' + modelText_(list[0]) + ' outlet, not run by us' : 'None of your outlets is run by us') +
      ' — attendance is kept only for ' + opModels_().join(' / ') + ' outlets and the Head Office.');
  }
  return run;
}

/* ============================ BOOTSTRAP ============================ */
function bootstrap_(ctx) {
  var outs = ctx.outlets.map(outletById_).filter(Boolean).map(function (o) {
    return { id: o.id, name: o.name, short: o.short, type: o.type, model: o.model, run: outletRun_(o) };
  });
  var single = outs.length === 1 ? outs[0].name : '';
  var title = ctx.roleTitle + (single && ctx.roleTitle !== 'My Workspace' ? ' · ' + single : '');
  var g = ctx.grants;
  return {
    user: { uid: ctx.uid, name: ctx.name, first: ctx.first, email: ctx.email, empId: ctx.empId,
      designation: ctx.designation, department: ctx.department, title: title, role: ctx.role,
      location: ctx.homeName, locationType: ctx.homeType,
      initials: ctx.name.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').substring(0, 2).toUpperCase() },
    outlets: outs, home: ctx.home, allOutlets: ctx.allOutlets,
    menu: ctx.menu,
    perms: { checklistAssign: !!g.checklist_assign, delegate: !!g.delegate, users: !!g.users, settings: !!g.settings,
      vaultAdmin: !!g.vault_admin, super: !!ctx.super, advHr: !!g.adv_hr, advAdmin: !!g.adv_admin, advPay: !!g.adv_pay,
      leaveFinal: !!g.leave_final, reimb: !!g.reimb_approve, access: !!g.access, employees: !!g.employees,
      hrAttendance: !!g.hr_attendance, payroll: !!g.payroll, attConfig: !!g.att_config, slips: !!g.salary_slips, poster: !!g.poster,
      approvals: !!g.approvals, checklist: !!g.checklist, outletLeave: !!g.leave, outletAdvance: !!g.advance, penalty: !!g.penalty,
      ticketTrack: !!g.ticket_track, issues: !!g.tickets && tkCard_(ctx), director: norm_(ctx.role) === 'director', dirUi: dirUi_(ctx), viewAs: evCan_(ctx), outletPick: outletPick_(ctx), empNeedsOk: !!g.employees && emNeedsOk_(ctx), empApprover: !!g.employees && emApprover_(ctx),
      dlgApprove: dlgIsApprover_(ctx), hire: !!g.hr_dashboard },
    checklists: Object.keys(ctx.chk || {}).length,
    app: { name: set_('App Name', APP.NAME), logo: set_('Logo URL', APP.LOGO), mark: logoMark_(), version: APP.VERSION, build: APP.BUILD, uiv: uiVersion_(), link: appUrl_() },
    today: todayIso_()
  };
}

function outletPick_(ctx) {
  var r = norm_(ctx.role);
  if (ctx.super || r === 'director' || r === 'misadmin') return true;
  if (r === 'outletincharge' && (ctx.outlets || []).length > 1) return true;
  var want = list_(set_('Outlet Picker For', 'Admin')).map(norm_).filter(String);
  return [ctx.department, ctx.designation, ctx.role, ctx.uid].some(function (v) { return v && want.indexOf(norm_(v)) >= 0; });
}

/* ============================ SINGLE SIGN-ON FOR OTHER APPS ============================ */
/* A short-lived signed ticket another Apps Script web app can verify with the
   same secret (see SSO_CLIENT.gs in the delivery folder). */
function ssoTicket_(ctx, appId) {
  var payload = { u: ctx.uid, n: ctx.name, e: ctx.email, m: ctx.mobile, r: ctx.role, o: ctx.outlets.join(','),
    a: appId || '', x: Date.now() + 5 * 60 * 1000 };
  var body = Utilities.base64EncodeWebSafe(JSON.stringify(payload)).replace(/=+$/, '');
  var sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(body, ssoSecret_())).replace(/=+$/, '');
  return body + '.' + sig;
}
/** Shared with the other apps (Settings screen shows it to MIS so it can be pasted there). */
function ssoSecret_() {
  var s = props_()['CG_SSO_SECRET'];
  if (!s) { s = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); propSet_('CG_SSO_SECRET', s); }
  return s;
}

var NAV_SECTIONS = {
  approvals:     { name: 'Approvals', group: 'Approvals', icon: 'approval', sort: 2 },
  hr_attendance: { name: 'Attendance', group: 'HR', icon: 'fingerprint', sort: 59 },
  payroll:       { name: 'Payroll', group: 'HR', icon: 'payments', sort: 60 },
  employees:     { name: 'Employees', group: 'HR', icon: 'groups', sort: 60.5 },
  hr_dashboard:  { name: 'Recruitment', group: 'HR', icon: 'person_search', sort: 61 },
  roster:        { name: 'Roster', group: 'HR', icon: 'calendar_month', sort: 62 }
};
var DIR_MENU = [
  ['dashboard', 'Dashboard', 'Home', 'space_dashboard', 1],
  ['approvals', 'Approvals', 'Approvals', 'approval', 2],
  ['dir_hr', 'HR Dashboard', 'HR', 'badge', 10],
  ['accommodation', 'Accommodation', 'HR', 'hotel', 11],
  ['dir_dsr', 'DSR Daily Sales', 'Reports', 'point_of_sale', 20],
  ['dir_grn', 'GRN Summary', 'Reports', 'inventory_2', 21],
  ['dir_exp', 'Expense Records', 'Reports', 'receipt_long', 22],
  ['dir_cash', 'Cash Management', 'Reports', 'payments', 23],
  ['production', 'Production Records', 'Reports', 'soup_kitchen', 24],
  ['dir_closing', 'Daily Food Closing', 'Reports', 'fact_check', 25],
  ['wastage', 'Wastage Report', 'Reports', 'delete_sweep', 26],
  ['dir_orders', 'Orders Summary', 'Reports', 'local_shipping', 27],
  ['certificates', 'Certificates', 'Reports', 'workspace_premium', 28],
  ['sales', 'Sale Report', 'Reports', 'monitoring', 29],
  ['dir_fms', 'FMS Summary', 'Reports', 'account_tree', 30],
  ['empview', 'Employee View', 'Admin', 'visibility', 90]
];
var DIR_HR_KEYS = ['payroll', 'hr_attendance', 'attendance', 'penalty', 'employees', 'salary_slips', 'reports', 'roster', 'hr_dashboard', 'poster'];
var EA_MENU = [['checklist', 'Checklist', 'Daily Work', 'checklist', 3], ['tasks', 'My Delegated Tasks', 'Daily Work', 'task_alt', 4]];
function dirUi_(ctx) { var r = norm_(ctx.role); return r === 'director' || r === 'executiveassistant'; }
var NAV_FOLD = { hr_attendance: ['attendance', 'penalty'], hr_dashboard: ['poster', 'fms'], payroll: ['hr_attendance', 'attendance', 'penalty', 'salary_slips', 'reports'], approvals: ['leave', 'advance'] };
function navFold_(ctx, mods) {
  var menu = ctx.menu.slice(), has = {};
  menu.forEach(function (m) { has[m.key] = m; });
  var approver = false;
  try { approver = hubHasAny_(ctx); } catch (e) {}
  if (approver && !has.approvals) {
    var am = mods.filter(function (m) { return m.key === 'approvals'; })[0] || { key: 'approvals', name: 'Approvals', group: 'Approvals', icon: 'approval' };
    menu.push({ key: 'approvals', name: am.name, group: am.group, icon: am.icon, soon: false });
    has.approvals = menu[menu.length - 1];
  }
  var hrDesk = !!(has.hr_attendance || has.payroll || has.hr_dashboard);
  menu.forEach(function (m) {
    var sec = NAV_SECTIONS[m.key];
    if (sec && (hrDesk || m.key === 'approvals')) { m.name = sec.name; m.group = sec.group; m.icon = sec.icon; m.sort = sec.sort; }
  });
  Object.keys(NAV_FOLD).forEach(function (parent) {
    if (!has[parent]) return;
    NAV_FOLD[parent].forEach(function (k) { if (has[k]) { has[k].hide = true; has[k].parent = parent; } });
  });
  if (has.fms && !has.hr_dashboard) delete has.fms.hide;
  if (has.tickets) { has.tickets.name = 'Issues'; has.tickets.hide = true; has.tickets.parent = has.dashboard ? 'dashboard' : ''; }
  if (evCan_(ctx)) menu.push({ key: 'empview', name: 'Employee View', group: 'Admin', icon: 'visibility', sort: 90, soon: false });
  if (dirUi_(ctx)) {
    var keep = {}, byKey = {};
    menu.forEach(function (m) { byKey[m.key] = m; });
    DIR_MENU.concat(norm_(ctx.role) === 'director' ? [] : EA_MENU).forEach(function (d) {
      var m = byKey[d[0]];
      if (!m && (!/^dir_/.test(d[0]) || !ctx.grants[d[0]])) return;
      if (!m) { m = { key: d[0], soon: false }; menu.push(m); byKey[d[0]] = m; }
      m.name = d[1]; m.group = d[2]; m.icon = d[3]; m.sort = d[4]; delete m.hide; delete m.parent; keep[d[0]] = 1;
    });
    menu.forEach(function (m) { if (!keep[m.key] && !m.hide) { m.hide = true; m.parent = m.parent || 'dashboard'; } });
    DIR_HR_KEYS.forEach(function (k) { if (byKey[k]) { byKey[k].hide = true; byKey[k].parent = 'dir_hr'; } });
    has = byKey;
  }
  menu.forEach(function (m) { var n = 0; while (m.parent && has[m.parent] && has[m.parent].parent && n++ < 4) m.parent = has[m.parent].parent; });
  var order = {}; mods.forEach(function (m, i) { order[m.key] = m.sort; });
  menu.forEach(function (m) { if (m.sort === undefined) m.sort = order[m.key] || 999; });
  menu.sort(function (a, b) { return a.sort - b.sort; });
  return menu;
}
