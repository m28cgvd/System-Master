/*************************************************************************
 *  Access.gs — item-wise access.
 *
 *  One tab, "Access Rules". One row = one grant (or block):
 *     Item Type  Section | Checklist | App
 *     Item ID    module key (orders, payroll …) · CHK-001 · APP-012
 *     Who Type   Everyone | Location | Department | Designation | Role | User
 *     Who        *  · OUT-001 / Outlets / Head Office · DEP-010 · DES-021 · HR · USR-0042
 *     Access     Yes | No | Manage (Manage = checklist manager: team view + give tasks)
 *
 *  The most specific rule wins:  User › Designation › Department › Role ›
 *  Location › Everyone. When two rules of the same level disagree, "No" wins.
 *
 *  Sections: a Yes / No typed on the person's own Access row beats every rule;
 *            with no rule at all, the Role's value is used.
 *  Checklists: rules first; then the checklist's own managers ("Assigned Users"
 *            or the outlet incharge); then anyone found in its Doer List.
 *  Apps:     rules first; then the app row's own Visible To … columns.
 *************************************************************************/

var WHO_LEVEL = { user: 6, designation: 5, department: 4, role: 3, location: 2, everyone: 1 };
var ITEM_TYPES = ['Section', 'Checklist', 'App'];
var WHO_TYPES = ['Everyone', 'Location', 'Department', 'Designation', 'Role', 'User'];

function accKey_(type, id) { return norm_(type) + '|' + str_(id).toUpperCase(); }

/** Every active rule, grouped by item. Cached per settings generation. */
function accRules_() {
  if (__M.rules) return __M.rules;
  var key = 'cg_rules_' + gen_('cfg');
  var hit = cacheGetJ_(key);
  if (hit) { __M.rules = hit; return hit; }
  var out = {};
  var rows = [];
  try { rows = db_().getSheetByName(SH.RULES) ? readObjs_(SH.RULES) : []; } catch (e) { rows = []; }
  rows.forEach(function (r) {
    if (/inactive|^no$|deleted/i.test(str_(r['Status']))) return;
    var it = str_(r['Item Type']), id = str_(r['Item ID']), wt = norm_(r['Who Type']);
    if (!it || !id || !WHO_LEVEL[wt]) return;
    var acc = str_(r['Access']);
    acc = /^manage/i.test(acc) ? 'Manage' : no_(acc) ? 'No' : 'Yes';
    (out[accKey_(it, id)] = out[accKey_(it, id)] || []).push({ id: str_(r['Rule ID']), wt: wt, who: str_(r['Who']), acc: acc });
  });
  cachePutJ_(key, out, 600);
  __M.rules = out;
  return out;
}

/** The facts a rule can match on for one person. */
function accPersonOf_(uid, roleName, emp, homeId) {
  var o = homeId ? outletById_(homeId) : (emp && emp.outletId ? outletById_(emp.outletId) : null);
  return {
    uid: str_(uid).toUpperCase(), role: norm_(roleName),
    dept: emp ? str_(emp.deptId).toUpperCase() : '', deptName: emp ? norm_(emp.department) : '',
    desig: emp ? str_(emp.desigId).toUpperCase() : '', desigName: emp ? norm_(emp.designation) : '',
    loc: o ? o.id : '', locType: o ? norm_(o.type) : ''
  };
}

function accMatch_(p, rule) {
  var w = str_(rule.who), W = w.toUpperCase(), n = norm_(w);
  switch (rule.wt) {
    case 'everyone': return true;
    case 'user': return list_(w).map(function (x) { return x.toUpperCase(); }).indexOf(p.uid) >= 0;
    case 'role': return list_(w).map(norm_).indexOf(p.role) >= 0;
    case 'department': return list_(w).some(function (x) { return x.toUpperCase() === p.dept || (p.deptName && norm_(x) === p.deptName); });
    case 'designation': return list_(w).some(function (x) { return x.toUpperCase() === p.desig || (p.desigName && norm_(x) === p.desigName); });
    case 'location':
      return list_(w).some(function (x) {
        var nx = norm_(x);
        if (nx === 'outlets' || nx === 'alloutlets') return p.locType === 'outlet';
        if (nx === 'headoffice' || nx === 'ho') return p.locType === 'headoffice';
        var o = outletByAny_(x);
        return !!(o && o.id === p.loc);
      });
  }
  return false;
}

/**
 * The winning rule for one person and one item, or null when no rule matches.
 * implicit = extra rules (e.g. an app row's Visible To … columns) at their levels.
 * Returns { acc: 'Yes'|'No'|'Manage', level, rule }.
 */
function accResolve_(p, type, id, implicit) {
  var rules = (accRules_()[accKey_(type, id)] || []).concat(implicit || []);
  var best = null;
  for (var i = 0; i < rules.length; i++) {
    var r = rules[i];
    if (!accMatch_(p, r)) continue;
    var lv = WHO_LEVEL[r.wt] || 0;
    if (!best || lv > best.level) best = { acc: r.acc, level: lv, rule: r };
    else if (lv === best.level) {
      if (r.acc === 'No' || (r.acc === 'Manage' && best.acc === 'Yes')) best = { acc: r.acc, level: lv, rule: r };
    }
  }
  return best;
}

/** The implicit rules an app row carries in its Visible To … columns. */
function appImplicitRules_(r) {
  var out = [];
  if (yes_(r['Visible To All'])) out.push({ wt: 'everyone', who: '*', acc: 'Yes', src: 'app' });
  var add = function (col, wt) { var v = str_(r[col]); if (v) out.push({ wt: wt, who: v, acc: 'Yes', src: 'app' }); };
  add('Visible To Roles', 'role'); add('Visible To Users', 'user'); add('Visible To Departments', 'department');
  add('Visible To Designations', 'designation'); add('Visible To Locations', 'location');
  return out;
}

/* ============================ ADMIN SCREEN ============================ */
function accMeta_(ctx) {
  var depts = readObjs_(SH.DEPTS).filter(function (d) { return str_(d['Department ID']) && !/inactive/i.test(str_(d['Status'])); })
    .map(function (d) { return { id: str_(d['Department ID']), name: str_(d['Department Name']) }; });
  var desigs = readObjs_(SH.DESIGS).filter(function (d) { return str_(d['Designation ID']) && !/inactive/i.test(str_(d['Status'])); })
    .map(function (d) { return { id: str_(d['Designation ID']), name: str_(d['Designation']), dept: str_(d['Department']) }; });
  var locs = [{ id: 'Outlets', name: 'Every outlet' }, { id: 'Head Office', name: 'Head Office (HQ + GFP)' }]
    .concat(outlets_().filter(function (o) { return o.active; }).map(function (o) { return { id: o.id, name: o.name + (o.type === 'Outlet' ? '' : ' · ' + o.type) }; }));
  var users = readObjs_(SH.LOGIN).filter(function (r) { return str_(r['User ID']) && /^active$/i.test(str_(r['Status'])); })
    .map(function (r) { var e = empById_(str_(r['Employee ID'])); return { id: str_(r['User ID']), name: str_(r['Full Name']), sub: e ? e.designation + ' · ' + (outletById_(e.outletId) || {}).name : '' }; })
    .sort(function (a, b) { return a.name.localeCompare(b.name); });
  var items = {
    Section: modules_().map(function (m) { return { id: m.key, name: m.name, group: m.group, hidden: /hidden/i.test(m.status) }; }),
    Checklist: checklists_().map(function (c) { return { id: c.id, name: c.name, group: c.outletId ? (outletById_(c.outletId) || {}).name : 'All' }; }),
    App: readObjs_(SH.APPS).filter(function (a) { return str_(a['App ID']) && !/inactive/i.test(str_(a['Status'])); })
      .map(function (a) { return { id: str_(a['App ID']), name: str_(a['App Name']), group: str_(a['Department']) || 'Other' }; })
  };
  return { items: items, who: { Location: locs, Department: depts, Designation: desigs, Role: roles_().list.map(function (r) { return { id: r.name, name: r.name }; }), User: users },
    rules: accRuleList_() };
}

function accRuleList_() {
  var names = accNames_();
  return readObjs_(SH.RULES).filter(function (r) { return str_(r['Rule ID']) && !/deleted/i.test(str_(r['Status'])); }).map(function (r) {
    return { id: str_(r['Rule ID']), type: str_(r['Item Type']), item: str_(r['Item ID']), itemName: str_(r['Item Name']) || names.item(str_(r['Item Type']), str_(r['Item ID'])),
      whoType: str_(r['Who Type']), who: str_(r['Who']), whoName: str_(r['Who Name']) || names.who(str_(r['Who Type']), str_(r['Who'])),
      access: str_(r['Access']) || 'Yes', status: str_(r['Status']) || 'Active', notes: str_(r['Notes']),
      by: str_(r['Updated By']), at: fmt_(r['Updated At'], 'dd/MM/yyyy') };
  }).reverse();
}

/** Human names for item / who ids (for the rules list). */
function accNames_() {
  var mods = {}; modules_().forEach(function (m) { mods[m.key] = m.name; });
  var chk = {}; checklists_().forEach(function (c) { chk[c.id] = c.name; });
  var apps = {}; readObjs_(SH.APPS).forEach(function (a) { apps[str_(a['App ID'])] = str_(a['App Name']); });
  var dep = {}; readObjs_(SH.DEPTS).forEach(function (d) { dep[str_(d['Department ID'])] = str_(d['Department Name']); });
  var des = {}; readObjs_(SH.DESIGS).forEach(function (d) { des[str_(d['Designation ID'])] = str_(d['Designation']); });
  var usr = {}; readObjs_(SH.LOGIN).forEach(function (u) { usr[str_(u['User ID'])] = str_(u['Full Name']); });
  return {
    item: function (t, id) { t = norm_(t); return (t === 'section' ? mods[id] : t === 'checklist' ? chk[id] : apps[id]) || id; },
    who: function (t, w) {
      t = norm_(t);
      return list_(w).map(function (x) {
        if (t === 'department') return dep[x] || x;
        if (t === 'designation') return des[x] || x;
        if (t === 'user') return usr[x] || x;
        if (t === 'location') { var o = outletByAny_(x); return o ? o.name : x; }
        if (t === 'everyone') return 'Everyone';
        return x;
      }).join(', ');
    }
  };
}

function accSave_(ctx, d) {
  var type = ITEM_TYPES.filter(function (t) { return norm_(t) === norm_(d.type); })[0];
  var wt = WHO_TYPES.filter(function (t) { return norm_(t) === norm_(d.whoType); })[0];
  if (!type) throw new Error('Pick what the rule is for (section, checklist or app).');
  if (!wt) throw new Error('Pick who the rule is for.');
  var items = [].concat(d.items || d.item || []).map(str_).filter(String);
  var whos = wt === 'Everyone' ? ['*'] : [].concat(d.whos || d.who || []).map(str_).filter(String);
  if (!items.length) throw new Error('Pick at least one ' + type.toLowerCase() + '.');
  if (!whos.length) throw new Error('Pick at least one ' + wt.toLowerCase() + '.');
  var acc = /^manage/i.test(str_(d.access)) ? 'Manage' : no_(d.access) ? 'No' : 'Yes';
  if (acc === 'Manage' && type !== 'Checklist') acc = 'Yes';
  var names = accNames_();
  return lock_(function () {
    var now = new Date(), existing = readObjs_(SH.RULES), add = [], upd = 0;
    var ids = nextIds_(SH.RULES, 'Rule ID', 'RUL-', 4, items.length * whos.length + 1);
    items.forEach(function (it) {
      whos.forEach(function (w) {
        var same = existing.filter(function (r) {
          return norm_(r['Item Type']) === norm_(type) && str_(r['Item ID']).toUpperCase() === it.toUpperCase() &&
            norm_(r['Who Type']) === norm_(wt) && str_(r['Who']).toUpperCase() === w.toUpperCase() && !/deleted/i.test(str_(r['Status']));
        })[0];
        var row = { 'Item Type': type, 'Item ID': it, 'Item Name': names.item(type, it), 'Who Type': wt, 'Who': w,
          'Who Name': names.who(wt, w), 'Access': acc, 'Status': 'Active', 'Notes': str_(d.notes), 'Updated By': ctx.name, 'Updated At': now };
        if (same) { updateObj_(SH.RULES, same._row, row); upd++; }
        else { row['Rule ID'] = ids.shift(); add.push(row); }
      });
    });
    if (add.length) appendObjs_(SH.RULES, add);
    bumpGen_('cfg');
    log_(ctx, 'Access rule saved', type + ' ' + items.join(',') + ' → ' + wt + ' ' + whos.join(',') + ' = ' + acc);
    return { message: (add.length ? add.length + ' rule(s) added' : '') + (add.length && upd ? ', ' : '') + (upd ? upd + ' updated' : '') + '.', rules: accRuleList_() };
  });
}

function accRemove_(ctx, d) {
  var ids = [].concat(d.ids || d.id || []).map(str_).filter(String);
  if (!ids.length) throw new Error('Pick a rule.');
  return lock_(function () {
    var n = 0;
    readObjs_(SH.RULES).forEach(function (r) {
      if (ids.indexOf(str_(r['Rule ID'])) >= 0) { updateObj_(SH.RULES, r._row, { 'Status': 'Deleted', 'Updated By': ctx.name, 'Updated At': new Date() }); n++; }
    });
    bumpGen_('cfg');
    log_(ctx, 'Access rule removed', ids.join(', '));
    return { message: n + ' rule(s) removed.', rules: accRuleList_() };
  });
}

/** Everyone's facts in one pass (for "who has access" and the person view). */
function accPeople_() {
  var accBy = {};
  readObjs_(SH.ACCESS).forEach(function (r) { accBy[str_(r['User ID'])] = r; });
  return readObjs_(SH.LOGIN).filter(function (r) { return str_(r['User ID']) && /^active$/i.test(str_(r['Status'])); }).map(function (r) {
    var uid = str_(r['User ID']), a = accBy[uid] || {}, emp = empById_(str_(r['Employee ID']));
    var home = outletByAny_(a['Home Outlet']) || (emp && emp.outletId ? outletById_(emp.outletId) : null);
    var roleName = str_(a['Role']) || 'Staff';
    return { uid: uid, name: str_(r['Full Name']), role: roleName, acc: a, emp: emp, home: home,
      p: accPersonOf_(uid, roleName, emp, home ? home.id : '') };
  });
}

/** Who can open one item, and why. */
function accWho_(ctx, d) {
  var type = ITEM_TYPES.filter(function (t) { return norm_(t) === norm_(d.type); })[0];
  var id = str_(d.id);
  if (!type || !id) throw new Error('Pick an item.');
  var people = accPeople_(), out = [];
  var roles = roles_().byNorm;
  var colFor = accessModuleCols_();
  var app = type === 'App' ? findObj_(SH.APPS, 'App ID', id) : null;
  var chk = type === 'Checklist' ? checklists_().filter(function (c) { return c.id === id; })[0] : null;
  var doerUids = {};
  if (chk) readObjs_(SH.CHK_DOERS).forEach(function (r) { if (str_(r['Checklist ID']) === id && str_(r['User ID'])) doerUids[str_(r['User ID'])] = 1; });
  people.forEach(function (x) {
    var res = null, src = '';
    if (type === 'Section') {
      var cell = colFor[id] ? str_(x.acc[colFor[id]]) : '';
      if (yes_(cell) || no_(cell)) { res = yes_(cell) ? 'Yes' : 'No'; src = 'Set on their Access row'; }
      else {
        var r = accResolve_(x.p, 'Section', id);
        if (r) { res = r.acc === 'No' ? 'No' : 'Yes'; src = 'Rule ' + (r.rule.id || '') + ' (' + r.rule.wt + ')'; }
        else { var ro = roles[norm_(x.role)]; res = ro && yes_(ro.grants[id]) ? 'Yes' : 'No'; src = 'Role ' + x.role; }
      }
    } else if (type === 'App') {
      var ra = accResolve_(x.p, 'App', id, app ? appImplicitRules_(app) : []);
      res = ra ? (ra.acc === 'No' ? 'No' : 'Yes') : 'No';
      src = ra ? (ra.rule.src === 'app' ? 'App row: Visible To ' + ra.rule.wt : 'Rule ' + ra.rule.id + ' (' + ra.rule.wt + ')') : 'Not shared';
    } else {
      var rc = accResolve_(x.p, 'Checklist', id);
      if (rc) { res = rc.acc; src = 'Rule ' + rc.rule.id + ' (' + rc.rule.wt + ')'; }
      else if (chk && chk.assigned.indexOf(x.uid.toUpperCase()) >= 0) { res = 'Manage'; src = 'Checklist ▸ Assigned Users'; }
      else if (chk && !chk.assigned.length && chk.outletId && norm_(x.role) === 'outletincharge' && x.home && x.home.id === chk.outletId) { res = 'Manage'; src = 'Outlet incharge'; }
      else if (doerUids[x.uid]) { res = 'Yes'; src = 'In the Doer List'; }
      else { res = 'No'; src = ''; }
    }
    if (res && res !== 'No') out.push({ uid: x.uid, name: x.name, role: x.role, designation: x.emp ? x.emp.designation : '',
      outlet: x.home ? x.home.name : '', access: res, source: src });
  });
  out.sort(function (a, b) { return a.name.localeCompare(b.name); });
  return { type: type, id: id, people: out,
    rules: accRuleList_().filter(function (r) { return norm_(r.type) === norm_(type) && r.item.toUpperCase() === id.toUpperCase(); }) };
}

/** Everything one person can open, and why. */
function accPerson_(ctx, d) {
  var uid = str_(d.uid);
  var x = accPeople_().filter(function (p) { return p.uid === uid; })[0];
  if (!x) throw new Error('User not found or not active.');
  var c = buildCtx_(uid, true);
  var roles = roles_().byNorm, colFor = accessModuleCols_();
  var fr = c && (c.franchise || (c.outlets.length && !(c.runOutlets || c.outlets).length));   // works at an outlet we do not run
  var sections = modules_().map(function (m) {
    var cell = colFor[m.key] ? str_(x.acc[colFor[m.key]]) : '', src;
    if (yes_(cell) || no_(cell)) src = 'Their Access row';
    else { var r = accResolve_(x.p, 'Section', m.key); src = r ? 'Rule ' + r.rule.id + ' (' + r.rule.wt + ')' : 'Role ' + x.role; }
    if (fr && c && !c.grants[m.key] && ['attendance', 'penalty', 'checklist', 'checklist_assign'].indexOf(m.key) >= 0) src += ' · outlet not run by us';
    if (m.key === 'prod_entry' && /^Role /.test(src) && c && c.grants[m.key] && prepDoerDefault_(x.emp, x.home)) src = 'Prep kitchen staff (Settings ▸ Prep Entry Departments)';
    return { id: m.key, name: m.name, group: m.group, hidden: /hidden/i.test(m.status), on: !!(c && c.grants[m.key]), source: src };
  });
  var chks = checklists_().map(function (ch) {
    var a = c ? c.chk[ch.id] : '';
    return { id: ch.id, name: ch.name, access: a || 'No' };
  });
  var apps = [];
  try { apps = c ? appsMine_(c).apps.map(function (a) { return { id: a.id, name: a.name, dept: a.dept }; }) : []; } catch (e) {}
  return { uid: uid, name: x.name, role: x.role, designation: x.emp ? x.emp.designation : '', department: x.emp ? x.emp.department : '',
    outlet: x.home ? x.home.name : '', outlets: c ? c.outlets.map(function (o) { return (outletById_(o) || {}).name; }) : [],
    sections: sections, checklists: chks, apps: apps };
}
