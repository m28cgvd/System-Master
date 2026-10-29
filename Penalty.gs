/*************************************************************************
 *  Penalty.gs — attendance penalties, their own section in the sidebar.
 *
 *  Same workbook and the same engine as the Attendance Manager
 *  (Attendance.gs): automatic penalties come from the Penalty Rules
 *  (late arrival, left early, extra break, short hours …) worked out on
 *  the punches HR uploads; manual penalties (uniform, mobile …) are rows
 *  of the "Manual Penalty" tab. Salary preparation reads both.
 *
 *    Only the Head Office and the outlets we run (Outlets ▸ Model = COCO / FOCO)
 *    have penalties — staff of franchise-run outlets never appear here.
 *
 *    HR · MIS · Director   every location that has penalties switched on
 *    Outlet Incharge       only the staff of his own outlet(s). He adds
 *                          manual penalties at the rule's fixed amount and
 *                          can remove only the ones he added himself.
 *************************************************************************/

var PEN_TYPES = { LATE_IN: 'Late arrival', EARLY_OUT: 'Left early', LATE_OUT: 'Stayed late', EXCESS_BREAK: 'Extra break',
  SHORT_HOURS: 'Short hours', HALF_DAY: 'Half day', ABSENT: 'Absent', MISSING_PUNCH: 'Missing punch', UNAPPROVED_LEAVE: 'Unapproved leave', MANUAL: 'Given by hand' };
var PEN_UNIT = { LATE_IN: 'min', EARLY_OUT: 'min', LATE_OUT: 'min', EXCESS_BREAK: 'min', SHORT_HOURS: 'hr' };

/* ============================ SCOPE ============================ */
/** Who the caller may see: wide = every location; otherwise only the staff of their own outlet(s). */
function penScope_(ctx) {
  if (__M.penScope && __M.penScope.uid === ctx.uid) return __M.penScope;
  var wide = can_(ctx, 'hr_attendance') || !!ctx.allOutlets || !!ctx.super, memo = {};
  var outs = (ctx.runOutlets || ctx.outlets || []).filter(function (id) { return outletRun_(outletById_(id)); });   // outlets we run only
  if (!wide && !outs.length) throw new Error((ctx.outlets || []).length ? 'Penalties are kept only for the outlets we run (' + opModels_().join(' / ') + ') — your outlet is not one of them.' : 'No outlet is linked to your login — ask MIS to set your Outlet Access.');
  function outletOf(rec) {
    if (!rec) return '';
    var k = str_(rec.employeeId).toUpperCase() + '|' + str_(rec.location).toLowerCase();
    if (memo[k] !== undefined) return memo[k];
    var o = outletByAny_(rec.location);
    if (!o) { var e = empById_(rec.employeeId); if (e && e.outletId) o = outletById_(e.outletId); }
    return (memo[k] = o ? o.id : '');
  }
  __M.penScope = { uid: ctx.uid, wide: wide, outlets: outs, outletOf: outletOf,
    has: function (rec) { return !!rec && (wide || outs.indexOf(outletOf(rec)) >= 0); } };
  return __M.penScope;
}
function penRec_(dir, id) { return dir.byId[atNormId_(id, dir.prefixes)] || null; }
function penMine_(ctx, by) { return !!str_(by) && norm_(by) === norm_(ctx.name); }
function penLine_(l) {
  var q = PEN_UNIT[l.type] ? ' ' + (l.type === 'SHORT_HOURS' ? round_(l.metric, 2) : Math.round(l.metric)) + ' ' + PEN_UNIT[l.type] : '';
  if (l.type === 'UNAPPROVED_LEAVE' && l.basis) q = ' (' + atUlText_(l.basis) + ')';
  var o = { label: l.label + q, amount: round_(l.amount, 2), manual: l.manual === true, notes: l.notes || '' };
  if (l.type === 'UNAPPROVED_LEAVE' && l.basis) { o.fixed = l.fixed; o.wage = l.wage; o.basis = l.basis; }
  return o;
}
function penCheckDate_(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str_(key))) throw new Error('Pick a date.');
  if (key > todayIso_()) throw new Error('A penalty cannot be given for a future date.');
  return key;
}

/* ============================ META ============================ */
function penMeta_(ctx) {
  var sc = penScope_(ctx), dir = atDirectory_(false), groups = dir.rules.groups, mine = {};
  var emps = dir.inScope.filter(sc.has).map(function (r) {
    mine[r.rule.groupKey] = true;
    return { employeeId: r.employeeId, name: r.name, designation: r.designation, department: r.department, location: r.location,
      outletId: sc.outletOf(r), group: r.rule.groupName, groupKey: r.rule.groupKey, penaltyOn: !!r.rule.applyPenalty };
  }).sort(function (a, b) { return a.name.localeCompare(b.name); });
  var gl = Object.keys(groups).filter(function (k) { return sc.wide || mine[k]; }).map(function (k) {
    var g = groups[k]; return { groupKey: g.groupKey, groupName: g.groupName, applyPenalty: g.applyPenalty, locations: g.locations };
  }).sort(function (a, b) { return a.groupName < b.groupName ? -1 : 1; });
  var rules = atPenRules_().filter(function (r) { return sc.wide || !r.groupKey || mine[r.groupKey]; }).map(function (r) {
    return { id: r.id, label: r.label, type: r.type, typeText: PEN_TYPES[r.type] || r.type, from: r.from, to: r.to, unit: PEN_UNIT[r.type] || '',
      amountType: r.amountType, amount: r.amount, cap: r.cap, groupKey: r.groupKey, shift: r.shift, since: r.since ? fmt_(atKeyDate_(r.since), 'dd MMM yyyy') : '',
      group: r.groupKey ? ((groups[r.groupKey] || {}).groupName || r.groupKey) : 'All locations' };
  });
  var now = new Date();
  return { wide: sc.wide, canAmount: can_(ctx, 'hr_attendance'), canConfig: can_(ctx, 'att_config'), me: ctx.name,
    outlets: sc.wide ? [] : sc.outlets.map(function (id) { var o = outletById_(id); return { id: id, name: o ? o.name : id }; }),
    groups: gl, employees: emps, rules: rules,
    catalog: atCatalogRows_().filter(function (c) { return sc.wide || !c.groupKey || mine[c.groupKey]; }),
    dates: atDates_().slice(0, 62).map(function (x) { return { key: x.key, label: x.label, day: x.day, rows: x.rows }; }),
    currency: str_(atCfg_('CURRENCY_SYMBOL', 'Rs.')), maxPerDay: atCfgNum_('MAX_PENALTY_PER_DAY', 0),
    allowedBreak: atCfgNum_('ALLOWED_BREAK_MINUTES', 60), today: todayIso_(), monthStart: iso_(new Date(now.getFullYear(), now.getMonth(), 1)) };
}

/* ============================ DAY BOARD ============================ */
/** One date: every person in scope whose location has penalties on — automatic lines + manual toggles. */
function penBoard_(ctx, d) {
  var sc = penScope_(ctx), key = str_(d.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error('Pick a date.');
  var gk = sc.wide ? (str_(d.group) || null) : null, oid = str_(d.outletId);
  var up = atDates_().some(function (x) { return x.key === key; });
  var b = atBuild_(key, key, gk, false), dir = b.directory, applied = {};
  atRead_(AT_SH.MANUAL).forEach(function (r) {
    if (/^no$/i.test(str_(r['Active'])) || atKey_(r['Date']) !== key) return;
    var k = atNormId_(str_(r['Employee ID']), dir.prefixes), by = str_(r['Added By']);
    (applied[k] = applied[k] || []).push({ entryId: str_(r['Entry ID']), ruleId: str_(r['Rule ID']), label: str_(r['Penalty Type']),
      amount: Number(r['Amount']) || 0, notes: str_(r['Notes']), by: by, mine: sc.wide || penMine_(ctx, by) });
  });
  function ok(rec) { return rec && rec.rule && rec.rule.applyPenalty && sc.has(rec) && (!oid || sc.outletOf(rec) === oid) && (!gk || rec.rule.groupKey === gk); }
  var rows = [], seen = {};
  b.rows.forEach(function (r) {
    var rec = penRec_(dir, r.employeeId);
    if (!ok(rec)) return;
    var k = atNormId_(rec.employeeId, dir.prefixes), auto = 0, lines = [];
    if (seen[k]) return; seen[k] = true;
    (r.penaltyLines || []).forEach(function (l) { if (!l.manual) { auto += l.amount; lines.push(penLine_(l)); } });
    rows.push({ employeeId: rec.employeeId, name: r.name || rec.name, designation: r.designation || rec.designation, group: r.groupName,
      groupKey: r.groupKey, outletId: sc.outletOf(rec), shift: r.shift, punchIn: r.punchIn, punchOut: r.punchOut, workedText: r.workedText,
      breakText: r.breakText, status: r.status, lateInMin: r.lateInMin, earlyOutMin: r.earlyOutMin, excessBreakMin: r.excessBreakMin,
      synthetic: r.synthetic, auto: round_(auto, 2), autoLines: lines, applied: applied[k] || [], total: r.penaltyAmount });
  });
  if (!up) {                // punches not uploaded yet: list the people, so manual penalties can still be given
    dir.inScope.forEach(function (rec) {
      if (!ok(rec)) return;
      var k = atNormId_(rec.employeeId, dir.prefixes); if (seen[k]) return; seen[k] = true;
      var man = (applied[k] || []).reduce(function (t, x) { return t + x.amount; }, 0);
      rows.push({ employeeId: rec.employeeId, name: rec.name, designation: rec.designation, group: rec.rule.groupName, groupKey: rec.rule.groupKey,
        outletId: sc.outletOf(rec), shift: '', punchIn: '-', punchOut: '-', workedText: '-', breakText: '-', status: '', lateInMin: 0, earlyOutMin: 0,
        excessBreakMin: 0, synthetic: true, auto: 0, autoLines: [], applied: applied[k] || [], total: man });
    });
  }
  rows.sort(function (a, b) { return a.group === b.group ? a.name.localeCompare(b.name) : (a.group < b.group ? -1 : 1); });
  var txt = atDateOut_(atKeyDate_(key));
  return { date: key, dateText: txt, day: atDayName_(atKeyDate_(key)), uploaded: up, rows: rows,
    note: up ? '' : 'The punches for ' + txt + ' are not uploaded yet — automatic penalties appear after HR uploads them. Manual penalties can be given now.' };
}

/**
 * Saves the manual penalties of the board. rows = [{ employeeId, ruleIds[], notes }] — only the rows
 * that changed. A charge someone else gave is never removed by an outlet incharge.
 */
function penBoardSave_(ctx, d) {
  var sc = penScope_(ctx), key = penCheckDate_(d.date), date = atParseDate_(key);
  var dir = atDirectory_(false), catalog = {};
  atRead_(AT_SH.PENALTY).forEach(function (r) {
    if (str_(r['Rule Type']).toUpperCase() !== 'MANUAL') return;
    var id = str_(r['Rule ID']);
    if (id) catalog[id] = { ruleId: id, label: str_(r['Label']), amount: Number(r['Amount']) || 0, groupKey: str_(r['Group Key']).toUpperCase(), active: /^yes$/i.test(str_(r['Active'])) };
  });
  var wanted = {}, refused = 0;
  (d.rows || []).forEach(function (row) {
    var rec = penRec_(dir, row.employeeId);
    if (!rec || !rec.rule || !rec.rule.applyPenalty || !sc.has(rec)) { refused++; return; }
    wanted[atNormId_(rec.employeeId, dir.prefixes)] = { record: rec, notes: str_(row.notes),
      ruleIds: (row.ruleIds || []).map(str_).filter(function (x) { return catalog[x]; }) };
  });
  if (!Object.keys(wanted).length) throw new Error(refused ? 'These people are not in your outlet.' : 'Nothing to save.');
  return lock_(function () {
    if (__M.at) delete __M.at[AT_SH.MANUAL];
    var existing = atRead_(AT_SH.MANUAL), keep = [], added = 0, removed = 0, seen = {};
    existing.forEach(function (r) {
      var o = {}; AT_HEAD[AT_SH.MANUAL].forEach(function (h) { o[h] = r[h]; });
      var k = atNormId_(str_(r['Employee ID']), dir.prefixes), t = wanted[k];
      if (atKey_(r['Date']) !== key || !t) { keep.push(o); return; }
      var rid = str_(r['Rule ID']);
      if (!sc.wide && !penMine_(ctx, r['Added By'])) { seen[k + '|' + rid] = true; keep.push(o); return; }   // not his to change
      if (t.ruleIds.indexOf(rid) === -1 || seen[k + '|' + rid]) { removed++; return; }
      seen[k + '|' + rid] = true;
      if (str_(r['Notes']) !== t.notes) o['Notes'] = t.notes;
      keep.push(o);
    });
    var stamp = Utilities.formatDate(new Date(), APP.TZ, 'yyyyMMddHHmmss'), n = 0;
    Object.keys(wanted).forEach(function (k) {
      var t = wanted[k];
      t.ruleIds.forEach(function (rid) {
        if (seen[k + '|' + rid]) return;
        var rule = catalog[rid];
        if (!rule.active || (rule.groupKey && rule.groupKey !== t.record.rule.groupKey)) return;
        seen[k + '|' + rid] = true; n++;
        keep.push({ 'Entry ID': 'MP' + stamp + ('000' + n).slice(-3), 'Date': date, 'Employee ID': t.record.employeeId, 'Rule ID': rid,
          'Penalty Type': rule.label, 'Amount': rule.amount, 'Notes': t.notes, 'Added By': ctx.name, 'Added At': new Date(), 'Active': 'Yes' });
        added++;
      });
    });
    keep.sort(function (x, y) { var a = atKey_(x['Date']), b = atKey_(y['Date']); if (a !== b) return a < b ? 1 : -1; return String(x['Employee ID']) < String(y['Employee ID']) ? -1 : 1; });
    var C = atWrite_(AT_SH.MANUAL, keep);
    try { if (keep.length) atSheet_(AT_SH.MANUAL).getRange(2, C.pos['Date'] + 1, keep.length, 1).setNumberFormat('dd-mm-yyyy'); } catch (e) {}
    delete __M.at[AT_SH.MANUAL];
    atAudit_(ctx, 'Save penalties', atDateOut_(date) + ' | added ' + added + ' | removed ' + removed);
    log_(ctx, 'Penalties saved', atDateOut_(date) + ' · +' + added + ' / −' + removed);
    return { added: added, removed: removed, message: 'Saved — ' + added + ' given, ' + removed + ' removed.' };
  });
}

/* ============================ CHARGES (manual penalties) ============================ */
function penRange_(d, maxDays) {
  var now = new Date(), a = str_(d.from) || iso_(new Date(now.getFullYear(), now.getMonth(), 1)), b = str_(d.to) || todayIso_();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) throw new Error('Pick the dates.');
  if (a > b) { var t = a; a = b; b = t; }
  if (maxDays && (atKeyDate_(b) - atKeyDate_(a)) / 86400000 > maxDays) throw new Error('Pick at most ' + maxDays + ' days at a time.');
  return { a: a, b: b };
}
function penCharges_(ctx, d) {
  var sc = penScope_(ctx), dir = atDirectory_(false), R = penRange_(d, 400), out = [], total = 0;
  atRead_(AT_SH.MANUAL).forEach(function (r) {
    var k = atKey_(r['Date']); if (!k || k < R.a || k > R.b) return;
    var id = str_(r['Employee ID']), rec = penRec_(dir, id);
    if (!sc.wide && !(rec && sc.has(rec))) return;
    var by = str_(r['Added By']), active = !/^no$/i.test(str_(r['Active'])), amt = Number(r['Amount']) || 0;
    if (active) total += amt;
    out.push({ entryId: str_(r['Entry ID']), dateKey: k, date: atDateOut_(atKeyDate_(k)), employeeId: rec ? rec.employeeId : id, name: rec ? rec.name : '',
      designation: rec ? rec.designation : '', group: rec && rec.rule ? rec.rule.groupName : '', outletId: rec ? sc.outletOf(rec) : '',
      penaltyType: str_(r['Penalty Type']), amount: amt, notes: str_(r['Notes']), addedBy: by, addedAt: r['Added At'] ? atStamp_(r['Added At']) : '',
      active: active, canRemove: sc.wide || penMine_(ctx, by) });
  });
  out.sort(function (x, y) { return x.dateKey === y.dateKey ? x.name.localeCompare(y.name) : (x.dateKey < y.dateKey ? 1 : -1); });
  return { from: R.a, to: R.b, entries: out, total: round_(total, 2) };
}
function penAdd_(ctx, d) {
  var sc = penScope_(ctx), dir = atDirectory_(false), rec = penRec_(dir, str_(d.employeeId));
  if (!rec || !rec.rule) throw new Error('That employee is not in one of the reported locations.');
  if (!sc.has(rec)) throw new Error('This employee is not in your outlet.');
  if (!rec.rule.applyPenalty) throw new Error('Penalties are switched off for ' + rec.rule.groupName + ' (Attendance ▸ Rules ▸ Locations ▸ Apply Penalty).');
  var key = penCheckDate_(d.date), date = atParseDate_(key), rule = null;
  atRead_(AT_SH.PENALTY).forEach(function (r) { if (str_(r['Rule ID']) === str_(d.ruleId) && str_(r['Rule Type']).toUpperCase() === 'MANUAL' && /^yes$/i.test(str_(r['Active']))) rule = r; });
  if (!rule) throw new Error('Pick the penalty type.');
  var rg = str_(rule['Group Key']).toUpperCase();
  if (rg && rg !== rec.rule.groupKey) throw new Error('That penalty type does not apply to ' + rec.rule.groupName + '.');
  var amount = Number(rule['Amount']) || 0;
  if (can_(ctx, 'hr_attendance') && str_(d.amount) !== '') amount = Number(d.amount);     // only HR may change the amount
  if (!(amount > 0)) throw new Error('Enter an amount greater than zero.');
  var id = 'MP' + Utilities.formatDate(new Date(), APP.TZ, 'yyyyMMddHHmmss') + Math.floor(Math.random() * 900 + 100);
  lock_(function () {
    var row = atAppend_(AT_SH.MANUAL, { 'Entry ID': id, 'Date': date, 'Employee ID': rec.employeeId, 'Rule ID': str_(rule['Rule ID']), 'Penalty Type': str_(rule['Label']),
      'Amount': amount, 'Notes': str_(d.notes), 'Added By': ctx.name, 'Added At': new Date(), 'Active': 'Yes' });
    try { var sh = atSheet_(AT_SH.MANUAL); sh.getRange(row, atCols_(sh, AT_SH.MANUAL).pos['Date'] + 1).setNumberFormat('dd-mm-yyyy'); } catch (e) {}
    if (__M.at) delete __M.at[AT_SH.MANUAL];
  });
  atAudit_(ctx, 'Apply penalty', rec.employeeId + ' | ' + str_(rule['Label']) + ' | ' + amount + ' | ' + atDateOut_(date));
  log_(ctx, 'Penalty given', rec.name + ' · ' + str_(rule['Label']) + ' · ' + amount + ' · ' + key);
  return { entryId: id, message: str_(rule['Label']) + ' (' + str_(atCfg_('CURRENCY_SYMBOL', 'Rs.')) + ' ' + amount + ') given to ' + rec.name + '.' };
}
function penRemove_(ctx, d) {
  var sc = penScope_(ctx), dir = atDirectory_(false);
  return lock_(function () {
    if (__M.at) delete __M.at[AT_SH.MANUAL];
    var rows = atRead_(AT_SH.MANUAL), t = null;
    for (var i = 0; i < rows.length; i++) if (str_(rows[i]['Entry ID']) === str_(d.entryId)) { t = rows[i]; break; }
    if (!t) throw new Error('That penalty was not found — refresh and try again.');
    if (!sc.wide) {
      var rec = penRec_(dir, str_(t['Employee ID']));
      if (!rec || !sc.has(rec)) throw new Error('This employee is not in your outlet.');
      if (!penMine_(ctx, t['Added By'])) throw new Error('Only HR can remove a penalty that ' + (str_(t['Added By']) || 'someone else') + ' gave.');
    }
    atSheet_(AT_SH.MANUAL).deleteRow(t.__row);
    delete __M.at[AT_SH.MANUAL];
    atAudit_(ctx, 'Remove penalty', str_(t['Employee ID']) + ' | ' + str_(t['Penalty Type']) + ' | ' + str_(t['Amount']));
    log_(ctx, 'Penalty removed', str_(t['Employee ID']) + ' · ' + str_(t['Penalty Type']) + ' · ' + str_(t['Amount']));
    return { message: 'Penalty removed.' };
  });
}

/* ============================ SUMMARY (per person, for salary) ============================ */
function penSummary_(ctx, d) {
  var sc = penScope_(ctx), R = penRange_(d, 93), gk = sc.wide ? (str_(d.group) || null) : null, oid = str_(d.outletId);
  var b = atBuild_(R.a, R.b, gk, false), dir = b.directory, out = {}, covered = {};
  function ok(rec) { return rec && sc.has(rec) && (!oid || sc.outletOf(rec) === oid) && (!gk || (rec.rule && rec.rule.groupKey === gk)); }
  function row(rec, groupName) {
    var k = atNormId_(rec.employeeId, dir.prefixes);
    return out[k] = out[k] || { employeeId: rec.employeeId, name: rec.name, designation: rec.designation, group: groupName, outletId: sc.outletOf(rec),
      days: 0, auto: 0, manual: 0, total: 0, pending: 0, lines: [] };
  }
  b.rows.forEach(function (r) {
    covered[r.dateKey] = true;
    if (!(r.penaltyAmount > 0)) return;
    var rec = penRec_(dir, r.employeeId); if (!ok(rec)) return;
    var x = row(rec, r.groupName), man = 0;
    (r.penaltyLines || []).forEach(function (l) { if (l.manual) man += l.amount; });
    man = Math.min(man, r.penaltyAmount);
    x.days++; x.total += r.penaltyAmount; x.manual += man; x.auto += r.penaltyAmount - man;
    x.lines.push({ dateKey: r.dateKey, date: r.date, status: r.status, amount: round_(r.penaltyAmount, 2), items: (r.penaltyLines || []).map(penLine_) });
  });
  atRead_(AT_SH.MANUAL).forEach(function (r) {           // given for a day whose punches are not uploaded yet
    var k = atKey_(r['Date']); if (!k || k < R.a || k > R.b || covered[k] || /^no$/i.test(str_(r['Active']))) return;
    var rec = penRec_(dir, str_(r['Employee ID'])); if (!ok(rec) || !rec.rule || !rec.rule.applyPenalty) return;
    var amt = Number(r['Amount']) || 0; if (!(amt > 0)) return;
    var x = row(rec, rec.rule.groupName);
    x.pending += amt; x.manual += amt; x.total += amt;
    x.lines.push({ dateKey: k, date: atDateOut_(atKeyDate_(k)), status: 'Not uploaded yet', amount: amt, pending: true,
      items: [{ label: str_(r['Penalty Type']), amount: amt, manual: true, notes: str_(r['Notes']) }] });
  });
  var list = Object.keys(out).map(function (k) {
    var x = out[k]; x.auto = round_(x.auto, 2); x.manual = round_(x.manual, 2); x.total = round_(x.total, 2);
    x.lines.sort(function (p, q) { return p.dateKey < q.dateKey ? -1 : 1; });
    return x;
  }).sort(function (p, q) { return q.total - p.total || p.name.localeCompare(q.name); });
  var tot = { people: list.length, total: 0, auto: 0, manual: 0, days: 0 };
  list.forEach(function (x) { tot.total += x.total; tot.auto += x.auto; tot.manual += x.manual; tot.days += x.days; });
  ['total', 'auto', 'manual'].forEach(function (k) { tot[k] = round_(tot[k], 2); });
  return { from: R.a, to: R.b, fromText: atDateOut_(atKeyDate_(R.a)), toText: atDateOut_(atKeyDate_(R.b)), rows: list, totals: tot,
    uploadedDays: Object.keys(covered).length };
}

function penList_(ctx, d) {
  var sc = penScope_(ctx), R = penRange_(d || {}, 93), gk = sc.wide ? (str_(d.group) || null) : null;
  var b = atBuild_(R.a, R.b, gk, false), dir = b.directory, out = [], types = {};
  function ok(rec) { return rec && sc.has(rec) && (!gk || (rec.rule && rec.rule.groupKey === gk)); }
  function cat(k, label) { types[k] = types[k] || { key: k, label: label, count: 0, amount: 0 }; return types[k]; }
  b.rows.forEach(function (r) {
    var rec = penRec_(dir, r.employeeId); if (!ok(rec)) return;
    (r.penaltyLines || []).forEach(function (l) {
      if (l.manual) return;
      var k = l.type, t = cat(k, PEN_TYPES[k] === 'Late arrival' ? 'Late punch in' : (PEN_TYPES[k] || l.label));
      t.count++; t.amount += l.amount;
      out.push({ key: 'A|' + r.dateKey + '|' + rec.employeeId + '|' + l.ruleId, auto: true, dateKey: r.dateKey, date: r.date, employeeId: rec.employeeId, name: r.name || rec.name,
        designation: r.designation || rec.designation, group: r.groupName, cat: k, label: penLine_(l).label, amount: round_(l.amount, 2), original: l.edited ? round_(l.original, 2) : null,
        edited: !!l.edited, exempt: !!l.exempt, waived: !l.amount && (!!l.edited || !!l.exempt || l.basis === 'WAIVE'),
        notes: l.notes || '', by: l.by || '', ruleId: l.ruleId, punchIn: r.punchIn, punchOut: r.punchOut, status: r.status, shift: r.shift,
        fixed: l.basis ? l.fixed : null, wage: l.basis ? l.wage : null, daily: l.basis ? l.daily : null, basis: l.basis || '' });
    });
  });
  atRead_(AT_SH.MANUAL).forEach(function (m) {
    var k0 = atKey_(m['Date']); if (!k0 || k0 < R.a || k0 > R.b || /^no$/i.test(str_(m['Active']))) return;
    var rec = penRec_(dir, str_(m['Employee ID'])); if (!ok(rec)) return;
    var label = str_(m['Penalty Type']) || 'Penalty', k = 'M:' + norm_(label), t = cat(k, label), amt = Number(m['Amount']) || 0;
    t.count++; t.amount += amt;
    out.push({ key: 'M|' + str_(m['Entry ID']), auto: false, dateKey: k0, date: atDateOut_(atKeyDate_(k0)), employeeId: rec.employeeId, name: rec.name, designation: rec.designation,
      group: rec.rule ? rec.rule.groupName : '', cat: k, label: label, amount: round_(amt, 2), notes: str_(m['Notes']), by: str_(m['Added By']), entryId: str_(m['Entry ID']),
      canEdit: sc.wide || penMine_(ctx, m['Added By']) });
  });
  out.sort(function (x, y) { return x.dateKey === y.dateKey ? x.name.localeCompare(y.name) : (x.dateKey < y.dateKey ? 1 : -1); });
  var tl = Object.keys(types).map(function (k) { types[k].amount = round_(types[k].amount, 2); return types[k]; }).sort(function (a, b) { return b.amount - a.amount; });
  return { from: R.a, to: R.b, rows: out, types: tl, total: round_(out.reduce(function (s, x) { return s + x.amount; }, 0), 2), canEdit: can_(ctx, 'hr_attendance') };
}
function penEdit_(ctx, d) {
  if (!can_(ctx, 'hr_attendance')) throw new Error('Only HR can change a penalty amount.');
  var note = str_(d.notes), amt = Number(d.amount);
  if (!d.restore && (isNaN(amt) || amt < 0)) throw new Error('Enter the amount (0 to waive it).');
  return lock_(function () {
    if (d.auto) {
      var key = penCheckDate_(str_(d.date)), dir = atDirectory_(false), rec = penRec_(dir, str_(d.employeeId)), rid = str_(d.ruleId);
      if (!rec || !rid) throw new Error('Penalty not found — refresh.');
      if (__M.at) delete __M.at[AT_SH.OVERRIDE];
      var nid = atNormId_(rec.employeeId, dir.prefixes), keep = atRead_(AT_SH.OVERRIDE).filter(function (r) {
        return !(atKey_(r['Date']) === key && atNormId_(str_(r['Employee ID']), dir.prefixes) === nid && str_(r['Rule ID']) === rid);
      }).map(function (r) { var o = {}; AT_HEAD[AT_SH.OVERRIDE].forEach(function (h) { o[h] = r[h]; }); return o; });
      if (!d.restore) keep.push({ 'Date': atParseDate_(key), 'Employee ID': rec.employeeId, 'Rule ID': rid, 'Amount': amt, 'Notes': note, 'Updated By': ctx.name, 'Updated At': new Date() });
      var C = atWrite_(AT_SH.OVERRIDE, keep);
      try { if (keep.length) atSheet_(AT_SH.OVERRIDE).getRange(2, C.pos['Date'] + 1, keep.length, 1).setNumberFormat('dd-mm-yyyy'); } catch (e) {}
      atBump_();
      atAudit_(ctx, 'Penalty changed', rec.employeeId + ' | ' + key + ' | ' + rid + ' | ' + (d.restore ? 'restored' : amt));
      return { message: d.restore ? 'Back to the automatic amount.' : amt ? 'Penalty changed to ' + amt + '.' : 'Penalty waived.' };
    }
    if (__M.at) delete __M.at[AT_SH.MANUAL];
    var t = atRead_(AT_SH.MANUAL).filter(function (r) { return str_(r['Entry ID']) === str_(d.entryId); })[0];
    if (!t) throw new Error('That penalty was not found — refresh and try again.');
    var sh = atSheet_(AT_SH.MANUAL), P = atCols_(sh, AT_SH.MANUAL).pos;
    sh.getRange(t.__row, P['Amount'] + 1).setValue(amt);
    sh.getRange(t.__row, P['Notes'] + 1).setValue(note);
    if (amt === 0) sh.getRange(t.__row, P['Active'] + 1).setValue('No');
    delete __M.at[AT_SH.MANUAL];
    atBump_();
    atAudit_(ctx, 'Penalty changed', str_(t['Employee ID']) + ' | ' + str_(t['Penalty Type']) + ' | ' + amt);
    return { message: amt ? 'Penalty changed to ' + amt + '.' : 'Penalty waived.' };
  });
}
/* ============================ UNAPPROVED LEAVE: 2x DAILY WAGE OR THE FIXED AMOUNT ============================ */
function penUlChooser_(ctx) { return !!(can_(ctx, 'hr_attendance') || dirIs_(ctx) || ctx.super || norm_(ctx.role) === 'misadmin'); }
function penUlMonth_(d) {
  var m = str_(d.month) || Utilities.formatDate(new Date(), APP.TZ, 'yyyy-MM');
  if (!/^\d{4}-\d{2}$/.test(m)) throw new Error('Pick the month.');
  return m;
}
function penUl_(ctx, d) {
  var sc = penScope_(ctx), ym = penUlMonth_(d), y = Number(ym.substring(0, 4)), mo = Number(ym.substring(5, 7)) - 1;
  var a = iso_(new Date(y, mo, 1)), end = iso_(new Date(y, mo + 1, 0)), b = end < todayIso_() ? end : todayIso_();
  if (a > b) return { month: ym, monthText: monthLabel_(new Date(y, mo, 1)), people: [], totals: { people: 0, days: 0, wage: 0, fixed: 0, applied: 0 }, canChoose: penUlChooser_(ctx), wageTimes: atCfgNum_('UNAPPROVED_LEAVE_WAGE_TIMES', 2) };
  var R = atBuild_(a, b, null, false), dir = R.directory, out = {};
  R.rows.forEach(function (r) {
    var rec = penRec_(dir, r.employeeId); if (!rec || !sc.has(rec)) return;
    (r.penaltyLines || []).forEach(function (l) {
      if (l.type !== 'UNAPPROVED_LEAVE' || l.exempt) return;
      var k = atNormId_(rec.employeeId, dir.prefixes);
      var x = out[k] = out[k] || { employeeId: rec.employeeId, name: rec.name, designation: rec.designation, group: rec.rule ? rec.rule.groupName : '', outletId: sc.outletOf(rec),
        days: 0, dates: [], wage: 0, fixed: 0, applied: 0, daily: l.daily || 0, basis: l.basis || 'WAGE', edited: 0 };
      x.days++; x.dates.push(Utilities.formatDate(atKeyDate_(r.dateKey), APP.TZ, 'dd MMM'));
      x.wage += l.wage || 0; x.fixed += l.fixed || 0; x.applied += l.amount || 0; if (l.edited) x.edited++;
    });
  });
  var people = Object.keys(out).map(function (k) { var x = out[k]; ['wage', 'fixed', 'applied'].forEach(function (f) { x[f] = round_(x[f], 2); }); return x; })
    .sort(function (p, q) { return q.days - p.days || p.name.localeCompare(q.name); });
  var t = { people: people.length, days: 0, wage: 0, fixed: 0, applied: 0 };
  people.forEach(function (x) { t.days += x.days; t.wage += x.wage; t.fixed += x.fixed; t.applied += x.applied; });
  ['wage', 'fixed', 'applied'].forEach(function (f) { t[f] = round_(t[f], 2); });
  return { month: ym, monthText: monthLabel_(new Date(y, mo, 1)), from: a, to: b, people: people, totals: t, canChoose: penUlChooser_(ctx),
    wageTimes: atCfgNum_('UNAPPROVED_LEAVE_WAGE_TIMES', 2) };
}
function penUlSave_(ctx, d) {
  if (!penUlChooser_(ctx)) throw new Error('Only HR, MIS and the Directors choose how unapproved leave is charged.');
  var b0 = str_(d.basis).toUpperCase(), ym = penUlMonth_(d), basis = b0 === 'FIXED' || b0 === 'WAIVE' ? b0 : 'WAGE', sc = penScope_(ctx), dir = atDirectory_(false);
  var btext = basis === 'FIXED' ? AT_UL_FIXED : basis === 'WAIVE' ? AT_UL_WAIVED : AT_UL_WAGE;
  var want = {};
  [].concat(d.ids || []).forEach(function (id) { var rec = penRec_(dir, str_(id)); if (rec && sc.has(rec)) want[atNormId_(rec.employeeId, dir.prefixes)] = rec; });
  if (!Object.keys(want).length) throw new Error('Pick at least one person.');
  return lock_(function () {
    if (__M.at) delete __M.at[AT_SH.ULBASIS];
    var keep = [], now = new Date();
    atRead_(AT_SH.ULBASIS).forEach(function (r) {
      if (atUlMonth_(r['Month']) === ym && want[atNormId_(str_(r['Employee ID']), dir.prefixes)]) return;
      var o = {}; AT_HEAD[AT_SH.ULBASIS].forEach(function (h) { o[h] = r[h]; });
      o['Month'] = atUlMonth_(r['Month']);
      keep.push(o);
    });
    Object.keys(want).forEach(function (k) {
      var rec = want[k];
      keep.push({ 'Month': ym, 'Employee ID': rec.employeeId, 'Employee Name': rec.name, 'Basis': btext, 'Updated By': ctx.name, 'Updated At': now });
    });
    var sh = atSheet_(AT_SH.ULBASIS), C = atCols_(sh, AT_SH.ULBASIS);
    try { sh.getRange(2, C.pos['Month'] + 1, Math.max(keep.length, 1), 1).setNumberFormat('@'); } catch (e) {}
    atWrite_(AT_SH.ULBASIS, keep);
    atBump_();
    var n = Object.keys(want).length;
    atAudit_(ctx, 'Unapproved leave basis', ym + ' | ' + n + ' person(s) | ' + btext);
    log_(ctx, 'Unapproved leave basis', ym + ' · ' + n + ' · ' + basis);
    var mt = monthLabel_(new Date(Number(ym.substring(0, 4)), Number(ym.substring(5, 7)) - 1, 1));
    return { message: n + ' person(s): unapproved leave of ' + mt + (basis === 'WAIVE' ? ' waived.' : ' charged at ' + atUlText_(basis) + '.') };
  });
}

function penEditMany_(ctx, d) {
  if (!can_(ctx, 'hr_attendance')) throw new Error('Only HR can change a penalty amount.');
  var items = [].concat(d.items || []), note = str_(d.notes), amt = Number(d.amount), restore = !!d.restore;
  if (!items.length) throw new Error('Tick at least one penalty.');
  if (!restore && (str_(d.amount) === '' || isNaN(amt) || amt < 0)) throw new Error('Enter the amount (0 to waive).');
  return lock_(function () {
    var dir = atDirectory_(false), autos = {}, manual = {}, nA = 0, nM = 0, now = new Date();
    items.forEach(function (x) {
      if (x.auto) {
        var key = penCheckDate_(str_(x.date)), rec = penRec_(dir, str_(x.employeeId)), rid = str_(x.ruleId);
        if (!rec || !rid) return;
        autos[key + '|' + atNormId_(rec.employeeId, dir.prefixes) + '|' + rid] = { key: key, rec: rec, rid: rid };
      } else if (str_(x.entryId)) manual[str_(x.entryId)] = 1;
    });
    if (Object.keys(autos).length) {
      if (__M.at) delete __M.at[AT_SH.OVERRIDE];
      var keep = atRead_(AT_SH.OVERRIDE).filter(function (r) {
        return !autos[atKey_(r['Date']) + '|' + atNormId_(str_(r['Employee ID']), dir.prefixes) + '|' + str_(r['Rule ID'])];
      }).map(function (r) { var o = {}; AT_HEAD[AT_SH.OVERRIDE].forEach(function (h) { o[h] = r[h]; }); return o; });
      Object.keys(autos).forEach(function (k) {
        var a = autos[k]; nA++;
        if (!restore) keep.push({ 'Date': atParseDate_(a.key), 'Employee ID': a.rec.employeeId, 'Rule ID': a.rid, 'Amount': amt, 'Notes': note, 'Updated By': ctx.name, 'Updated At': now });
      });
      var C = atWrite_(AT_SH.OVERRIDE, keep);
      try { if (keep.length) atSheet_(AT_SH.OVERRIDE).getRange(2, C.pos['Date'] + 1, keep.length, 1).setNumberFormat('dd-mm-yyyy'); } catch (e) {}
    }
    if (Object.keys(manual).length && !restore) {
      if (__M.at) delete __M.at[AT_SH.MANUAL];
      var sh = atSheet_(AT_SH.MANUAL), P = atCols_(sh, AT_SH.MANUAL).pos, sc = penScope_(ctx);
      atRead_(AT_SH.MANUAL).forEach(function (t) {
        if (!manual[str_(t['Entry ID'])]) return;
        if (!sc.wide && !penMine_(ctx, t['Added By'])) return;
        sh.getRange(t.__row, P['Amount'] + 1).setValue(amt);
        if (note) sh.getRange(t.__row, P['Notes'] + 1).setValue(note);
        if (amt === 0) sh.getRange(t.__row, P['Active'] + 1).setValue('No');
        nM++;
      });
      if (__M.at) delete __M.at[AT_SH.MANUAL];
    }
    var n = nA + nM;
    if (!n) throw new Error('Those penalties were not found — refresh and try again.');
    atBump_();
    atAudit_(ctx, 'Penalties changed together', n + ' | ' + (restore ? 'automatic amount' : amt) + (note ? ' | ' + note : ''));
    log_(ctx, 'Penalties changed together', n + ' · ' + (restore ? 'automatic amount' : amt));
    return { count: n, message: n + (n === 1 ? ' penalty ' : ' penalties ') + (restore ? 'back to the automatic amount.' : amt ? 'changed to ' + amt + ' each.' : 'waived.') };
  });
}

var PEN_EXC_TYPES = [['ALL', 'Every automatic penalty'], ['LATE_IN', 'Late punch in'], ['UNAPPROVED_LEAVE', 'Unapproved leave'], ['EARLY_OUT', 'Left early'],
  ['MISSING_PUNCH', 'Missing punch'], ['SHORT_HOURS', 'Short hours'], ['HALF_DAY', 'Half day'], ['EXCESS_BREAK', 'Extra break']];
function penExcLabel_(t) { for (var i = 0; i < PEN_EXC_TYPES.length; i++) if (PEN_EXC_TYPES[i][0] === t) return PEN_EXC_TYPES[i][1]; return PEN_TYPES[t] || t; }
function penExc_(ctx) {
  var sc = penScope_(ctx), dir = atDirectory_(false), today = todayIso_();
  var rows = atRead_(AT_SH.EXC).map(function (r) {
    var rec = penRec_(dir, str_(r['Employee ID'])), from = atKey_(r['From']) || '', to = atKey_(r['To']) || '', type = str_(r['Penalty Type']).toUpperCase() || 'ALL';
    var active = !/^no$/i.test(str_(r['Active']));
    return { id: str_(r['Exception ID']), employeeId: rec ? rec.employeeId : str_(r['Employee ID']), name: rec ? rec.name : str_(r['Employee Name']),
      designation: rec ? rec.designation : '', group: rec && rec.rule ? rec.rule.groupName : '', type: type, typeLabel: penExcLabel_(type),
      from: from, to: to, fromText: from ? atDateOut_(atKeyDate_(from)) : '', toText: to ? atDateOut_(atKeyDate_(to)) : '', reason: str_(r['Reason']),
      by: str_(r['Added By']), at: r['Added At'] ? atStamp_(r['Added At']) : '', active: active,
      state: !active ? 'Removed' : to && to < today ? 'Ended' : from && from > today ? 'Starts later' : 'In force', _rec: rec };
  }).filter(function (x) { return !x._rec || sc.has(x._rec); }).map(function (x) { delete x._rec; return x; });
  rows.sort(function (a, b) { return (a.state === 'In force' ? 0 : 1) - (b.state === 'In force' ? 0 : 1) || a.name.localeCompare(b.name); });
  var people = dir.inScope.filter(sc.has).map(function (r) { return { employeeId: r.employeeId, name: r.name, designation: r.designation, group: r.rule.groupName }; })
    .sort(function (a, b) { return a.group === b.group ? a.name.localeCompare(b.name) : (a.group < b.group ? -1 : 1); });
  return { rows: rows, people: people, types: PEN_EXC_TYPES.map(function (t) { return { key: t[0], label: t[1] }; }), canEdit: penUlChooser_(ctx), today: today };
}
function penExcSave_(ctx, d) {
  if (!penUlChooser_(ctx)) throw new Error('Only HR, MIS and the Directors add penalty exceptions.');
  var dir = atDirectory_(false), rec = penRec_(dir, str_(d.employeeId));
  if (!rec) throw new Error('Pick the employee.');
  var type = str_(d.type).toUpperCase() || 'ALL';
  if (!PEN_EXC_TYPES.some(function (t) { return t[0] === type; })) throw new Error('Pick the penalty.');
  var from = str_(d.from), to = str_(d.to), reason = str_(d.reason);
  if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) throw new Error('Pick the From date.');
  if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new Error('Pick the To date.');
  if (from && to && to < from) throw new Error('To is before From.');
  if (!reason) throw new Error('Write the reason for the exception.');
  return lock_(function () {
    if (__M.at) delete __M.at[AT_SH.EXC];
    var sh = atSheet_(AT_SH.EXC), C = atCols_(sh, AT_SH.EXC), P = C.pos, id = str_(d.id), row = 0, n = 0;
    var all = atRead_(AT_SH.EXC);
    all.forEach(function (r) { var m = /(\d+)$/.exec(str_(r['Exception ID'])); if (m) n = Math.max(n, Number(m[1])); if (id && str_(r['Exception ID']) === id) row = r.__row; });
    if (id && !row) throw new Error('That exception was not found — refresh.');
    var vals = { 'Employee ID': rec.employeeId, 'Employee Name': rec.name, 'Penalty Type': type, 'From': from ? atParseDate_(from) : '', 'To': to ? atParseDate_(to) : '',
      'Reason': reason, 'Added By': ctx.name, 'Added At': new Date(), 'Active': 'Yes' };
    if (!row) { vals['Exception ID'] = 'EXC-' + pad_(n + 1, 4); id = vals['Exception ID']; atAppend_(AT_SH.EXC, vals); }
    else Object.keys(vals).forEach(function (h) { if (P[h] !== undefined) sh.getRange(row, P[h] + 1).setValue(vals[h]); });
    try { sh.getRange(2, P['From'] + 1, Math.max(sh.getLastRow() - 1, 1), 2).setNumberFormat('dd-mm-yyyy'); } catch (e) {}
    delete __M.at[AT_SH.EXC];
    atBump_();
    atAudit_(ctx, 'Penalty exception', id + ' | ' + rec.employeeId + ' | ' + type + ' | ' + (from || 'start') + ' – ' + (to || 'no end') + ' | ' + reason);
    log_(ctx, 'Penalty exception', id + ' · ' + rec.name + ' · ' + penExcLabel_(type));
    return { id: id, message: rec.name + ': ' + (type === 'ALL' ? 'no automatic penalty' : 'no ' + penExcLabel_(type).toLowerCase() + ' penalty') + (from ? ' from ' + atDateOut_(atKeyDate_(from)) : '') + (to ? ' to ' + atDateOut_(atKeyDate_(to)) : '') + '.' };
  });
}
function penExcRemove_(ctx, d) {
  if (!penUlChooser_(ctx)) throw new Error('Only HR, MIS and the Directors remove penalty exceptions.');
  return lock_(function () {
    if (__M.at) delete __M.at[AT_SH.EXC];
    var t = atRead_(AT_SH.EXC).filter(function (r) { return str_(r['Exception ID']) === str_(d.id); })[0];
    if (!t) throw new Error('That exception was not found — refresh.');
    var sh = atSheet_(AT_SH.EXC), P = atCols_(sh, AT_SH.EXC).pos;
    sh.getRange(t.__row, P['Active'] + 1).setValue('No');
    delete __M.at[AT_SH.EXC];
    atBump_();
    atAudit_(ctx, 'Penalty exception removed', str_(d.id) + ' | ' + str_(t['Employee ID']));
    return { message: str_(t['Employee Name']) + ': exception removed — the penalties are charged again.' };
  });
}

function atHub_(ctx) {
  var key = 'athub_' + ctx.uid + '_' + gen_('att') + '.' + gen_('attd');
  if (!__M.fresh) { var hit = cacheGetJ_(key); if (hit) return hit; }
  var dates = atDates_(), last = dates[0] || null, now = new Date(), ms = iso_(new Date(now.getFullYear(), now.getMonth(), 1)), out = {
    last: last ? { key: last.key, label: last.label, day: last.day, rows: last.rows } : null, monthStart: ms, today: todayIso_(), days: dates.length,
    canUpload: can_(ctx, 'hr_attendance'), canConfig: can_(ctx, 'att_config'), month: monthLabel_() };
  try {
    out.sources = atSourcesOut_(atDirectory_(false)).map(function (x) {
      var hit = null;
      for (var i = 0; i < dates.length; i++) if (dates[i].uploads && dates[i].uploads[x.key]) { hit = dates[i]; break; }
      return { key: x.key, label: x.label, groups: x.groups, last: hit ? { key: hit.key, label: hit.label, day: hit.day, rows: hit.uploads[x.key] } : null };
    });
  } catch (e) { out.sources = []; }
  try {
    var M = penList_(ctx, { from: ms, to: todayIso_() }), MP = M.rows.filter(function (r) { return r.amount > 0; });
    out.monthPenalty = { total: M.total, count: MP.length, people: Object.keys(MP.reduce(function (o, r) { o[r.employeeId] = 1; return o; }, {})).length, types: M.types.slice(0, 3) };
    var U = M.rows.filter(function (r) { return r.cat === 'UNAPPROVED_LEAVE' && !r.exempt; });
    out.monthUl = { days: U.length, people: Object.keys(U.reduce(function (o, r) { o[r.employeeId] = 1; return o; }, {})).length,
      wage: round_(U.reduce(function (s, r) { return s + (r.wage || 0); }, 0), 2), fixed: round_(U.reduce(function (s, r) { return s + (r.fixed || 0); }, 0), 2),
      applied: round_(U.reduce(function (s, r) { return s + r.amount; }, 0), 2), month: Utilities.formatDate(now, APP.TZ, 'yyyy-MM') };
    if (last) {
      var L = last.key >= ms ? { rows: M.rows.filter(function (r) { return r.dateKey === last.key; }) } : penList_(ctx, { from: last.key, to: last.key });
      out.lastPenalty = { total: round_(L.rows.reduce(function (s, r) { return s + r.amount; }, 0), 2), count: L.rows.filter(function (r) { return r.amount > 0; }).length };
    }
  } catch (e) { out.penaltyError = e.message; }
  try { var td = todayIso_(); out.exceptions = atRead_(AT_SH.EXC).filter(function (r) { var t = atKey_(r['To']); return !/^no$/i.test(str_(r['Active'])) && (!t || t >= td); }).length; } catch (e) { out.exceptions = 0; }
  try { var b = last ? atBuild_(last.key, last.key, null, false).summary.totals : null; if (b) out.lastSummary = b; } catch (e) {}
  cachePutJ_(key, out, 60);
  return out;
}
