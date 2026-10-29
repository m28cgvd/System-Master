/*************************************************************************
 *  Kitchen.gs
 *    · Production Records — the Prep Kitchen sheet ("Daily Entry"), shown
 *      ITEM-WISE: each dish, every time it was prepared (raw qty in,
 *      produced qty out, time in/out, who), then the dish totals. Standard
 *      yield / time come from Prep_Master scaled to the raw quantity.
 *    · Production Entry — what the old prep sheet app did, but the doer is
 *      always the person signed in (no list of employees to pick from):
 *      start a batch (dish, raw qty, photo) → finish it (produced qty, photo).
 *      Same "Daily Entry" rows, same columns, same OPEN / DONE status.
 *    · Daily Closing – Food — closing / handover / wastage per shift.
 *************************************************************************/

function prepCols_(H) {
  var c = { tin: col_(H, ['Time In']), st: col_(H, ['Status']), doer: col_(H, ['Doer Name']), dish: col_(H, ['Dish']),
    ing: col_(H, ['Main Ingredient']), raw: col_(H, ['Raw QTY', 'Raw Qty']), sImg: col_(H, ['Start Image']),
    tout: col_(H, ['Time Out']), prod: col_(H, ['Produced QTY', 'Produced Qty']), dImg: col_(H, ['Done Image']),
    diff: col_(H, ['Time Diff (min)', 'Time Diff']) };
  function unitAfter(i) { for (var j = i + 1; j < H.length; j++) if (norm_(H[j]) === 'unit') return j; return -1; }
  c.rawUnit = c.raw >= 0 ? unitAfter(c.raw) : -1; c.outUnit = c.prod >= 0 ? unitAfter(c.prod) : -1;
  return c;
}
function prepRead_(lastN) {
  return extRead_(set_('Prep Kitchen Sheet ID'), set_('Prep Kitchen Tab', 'Daily Entry'),
    { headerRow: 1, lastN: lastN || setNum_('Prep Scan Rows', 3000), cache: 180, fam: 'prep' });
}

function prodReport_(ctx, d) {
  var outletId = set_('Prep Kitchen Outlet', 'OUT-001');
  var kOut = outletById_(outletId);
  if (!ctx.allOutlets && ctx.outlets.indexOf(outletId) < 0) {
    return { linked: false, message: 'Production records are kept for ' + (kOut ? kOut.name : outletId) + ' only.' };
  }
  var from = str_(d.from) || todayIso_(), to = str_(d.to) || from;
  if (to < from) { var x = from; from = to; to = x; }
  var t = prepRead_();
  var H = t.head, c = prepCols_(H);
  if (c.tin < 0 || c.dish < 0) throw new Error('The Prep Kitchen tab needs "Time In" and "Dish" columns.');

  var std = prepMaster_();
  var dishes = {}, order = [], open = 0, batches = 0;
  t.rows.forEach(function (r) {
    var tin = parseAny_(r[c.tin]);
    if (!tin || tin.getFullYear() < 2000) return;
    var k = iso_(tin);
    if (k < from || k > to) return;
    var dish = str_(r[c.dish]); if (!dish) return;
    var key = dish.toLowerCase();
    if (!dishes[key]) { dishes[key] = { dish: dish, ingredient: c.ing >= 0 ? str_(r[c.ing]) : '', batches: [], raw: 0, produced: 0,
      stdYield: 0, rawUnit: '', outUnit: '', minutes: 0 }; order.push(key); }
    var g = dishes[key];
    var raw = c.raw >= 0 ? num_(r[c.raw]) : 0, prod = c.prod >= 0 ? num_(r[c.prod]) : 0;
    var tout = c.tout >= 0 ? parseAny_(r[c.tout]) : null;
    var mins = c.diff >= 0 && str_(r[c.diff]) !== '' ? num_(r[c.diff]) : (tout ? Math.round((tout - tin) / 60000) : '');
    var st = c.st >= 0 ? str_(r[c.st]).toUpperCase() : '';
    var s = std[key], sy = '', stt = '';
    if (s && s.rawW > 0 && raw > 0) { sy = round_(s.yield * raw / s.rawW, 0); stt = round_(s.maxTime * raw / s.rawW, 1); }
    g.batches.push({ n: g.batches.length + 1, date: fmt_(tin, 'dd/MM/yyyy'), timeIn: fmt_(tin, 'hh:mm a'), timeOut: tout ? fmt_(tout, 'hh:mm a') : '',
      doer: c.doer >= 0 ? str_(r[c.doer]) : '', raw: raw, rawUnit: c.rawUnit >= 0 ? str_(r[c.rawUnit]) : '',
      produced: prod, outUnit: c.outUnit >= 0 ? str_(r[c.outUnit]) : '', mins: mins, status: st || (tout ? 'DONE' : 'OPEN'),
      stdYield: sy, stdTime: stt, startImg: c.sImg >= 0 ? str_(r[c.sImg]) : '', doneImg: c.dImg >= 0 ? str_(r[c.dImg]) : '' });
    g.raw += raw; g.produced += prod; if (sy !== '' && prod > 0) g.stdYield += sy;   // std only for finished batches
    if (typeof mins === 'number') g.minutes += mins;
    if (!g.rawUnit && c.rawUnit >= 0) g.rawUnit = str_(r[c.rawUnit]);
    if (!g.outUnit && c.outUnit >= 0) g.outUnit = str_(r[c.outUnit]);
    batches++; if (st === 'OPEN' || (!tout && st !== 'DONE')) open++;
  });
  var list = order.map(function (k) {
    var g = dishes[k]; g.raw = round_(g.raw, 2); g.produced = round_(g.produced, 2); g.stdYield = round_(g.stdYield, 0);
    g.count = g.batches.length; g.yieldPct = g.stdYield ? round_(g.produced / g.stdYield * 100, 0) : '';
    return g;
  }).sort(function (a, b) { return b.count - a.count || a.dish.localeCompare(b.dish); });
  return { linked: true, outlet: kOut ? kOut.name : '', from: from, to: to, dishes: list,
    totals: { dishes: list.length, batches: batches, open: open } };
}

function prepMaster_() {
  var hit = cacheGetJ_('prep_master_v1'); if (hit) return hit;
  var out = {};
  try {
    var t = extRead_(set_('Prep Kitchen Sheet ID'), 'Prep_Master', { headerRow: 1 });
    var H = t.head, cp = col_(H, ['Product']), ct = col_(H, ['Max Time (Minute)', 'Max Time']),
      cw = col_(H, ['Weight Of Raw Material']), cy = col_(H, ['Final Yield']);
    t.rows.forEach(function (r) {
      var p = str_(r[cp]); if (!p) return;
      out[p.toLowerCase()] = { maxTime: num_(r[ct]), rawW: num_(r[cw]), yield: num_(r[cy]) };
    });
  } catch (e) {}
  cachePutJ_('prep_master_v1', out, 1800);
  return out;
}

/* ============================ PRODUCTION ENTRY (the doer is the person signed in) ============================ */
/** Prep_Master as a list: dish, main ingredient, standard time and yield for the standard raw weight. */
function prepDishes_() {
  var key = 'prep_dishes_v1_' + gen_('prep'), hit = cacheGetJ_(key);
  if (hit) return hit;
  var t = extRead_(set_('Prep Kitchen Sheet ID'), 'Prep_Master', { headerRow: 1 }), H = t.head;
  var c = { p: col_(H, ['Product']), ing: col_(H, ['Main Ingredient']), t: col_(H, ['Max Time (Minute)', 'Max Time']),
    w: col_(H, ['Weight Of Raw Material']), ui: col_(H, ['Unit (IN)']), y: col_(H, ['Final Yield']), uo: col_(H, ['Unit (Out)']) };
  var out = [], seen = {};
  t.rows.forEach(function (r) {
    var p = str_(r[c.p]); if (!p || seen[p.toLowerCase()]) return; seen[p.toLowerCase()] = 1;
    out.push({ dish: p, ingredient: c.ing >= 0 ? str_(r[c.ing]) : '', maxTime: c.t >= 0 ? num_(r[c.t]) : 0, rawW: c.w >= 0 ? num_(r[c.w]) : 0,
      yield: c.y >= 0 ? num_(r[c.y]) : 0, unitIn: c.ui >= 0 ? str_(r[c.ui]) : '', unitOut: c.uo >= 0 ? str_(r[c.uo]) : '' });
  });
  out.sort(function (a, b) { return a.dish.localeCompare(b.dish); });
  cachePutJ_(key, out, 1800);
  return out;
}
/** The names this person is written as in "Doer Name" (login name, master name, the checklist doer names on his Access row). */
function prepMyNames_(ctx) {
  var names = [ctx.name], e = laEmp_(ctx.empId);
  if (e && e.name) names.push(e.name);
  try { var a = findObj_(SH.ACCESS, 'User ID', ctx.uid); if (a) names = names.concat(list_(a['Checklist Doer Name'])); } catch (x) {}
  return uniq_(names.map(norm_).filter(String));
}
function prepDoer_(ctx) { var e = laEmp_(ctx.empId); return (e && e.name) || ctx.name; }
/** Production Entry without anyone setting it: the prep kitchen's own staff (Settings ▸ Prep Entry Departments). */
function prepDoerDefault_(emp, home) {
  if (!emp || !home || home.id !== set_('Prep Kitchen Outlet', 'OUT-001')) return false;
  return list_(set_('Prep Entry Departments', 'F&B Production')).map(norm_).indexOf(norm_(emp.department)) >= 0;
}
var PREP_FMT = 'dd-MM-yyyy hh:mm:ss a';                 // how the prep sheet writes Time In / Time Out (as text)

function prepBatch_(r, c, rowNum) {
  var tin = parseAny_(r[c.tin]), tout = c.tout >= 0 ? parseAny_(r[c.tout]) : null;
  return { row: rowNum, dish: str_(r[c.dish]), ingredient: c.ing >= 0 ? str_(r[c.ing]) : '', raw: c.raw >= 0 ? num_(r[c.raw]) : 0,
    rawUnit: c.rawUnit >= 0 ? str_(r[c.rawUnit]) : '', produced: c.prod >= 0 ? num_(r[c.prod]) : 0, outUnit: c.outUnit >= 0 ? str_(r[c.outUnit]) : '',
    timeIn: tin ? fmt_(tin, 'dd/MM/yyyy hh:mm a') : str_(r[c.tin]), timeInKey: tin ? tin.getTime() : 0, timeInRaw: str_(r[c.tin] instanceof Date ? fmt_(r[c.tin], PREP_FMT) : r[c.tin]),
    timeOut: tout ? fmt_(tout, 'hh:mm a') : '', mins: c.diff >= 0 && str_(r[c.diff]) !== '' ? num_(r[c.diff]) : (tin && tout ? Math.round((tout - tin) / 60000) : ''),
    status: c.st >= 0 ? str_(r[c.st]).toUpperCase() : '', startImg: c.sImg >= 0 ? str_(r[c.sImg]) : '', doneImg: c.dImg >= 0 ? str_(r[c.dImg]) : '' };
}

/** The entry screen: dishes, my batches still cooking, what I finished today. */
function prepMeta_(ctx) {
  var t = prepRead_(setNum_('Prep Entry Scan Rows', 600)), c = prepCols_(t.head);
  if (c.tin < 0 || c.dish < 0 || c.doer < 0 || c.st < 0) throw new Error('The prep sheet needs "Time In", "Status", "Doer Name" and "Dish" columns.');
  var me = prepMyNames_(ctx), today = todayIso_(), open = [], done = [];
  t.rows.forEach(function (r, i) {
    if (me.indexOf(norm_(r[c.doer])) < 0) return;
    var b = prepBatch_(r, c, t.firstRow + i);
    if (b.status === 'OPEN') open.push(b);
    else if (b.timeInKey && iso_(new Date(b.timeInKey)) === today) done.push(b);
  });
  var std = {}; prepDishes_().forEach(function (x) { std[x.dish.toLowerCase()] = x; });
  open.forEach(function (b) {
    var s = std[b.dish.toLowerCase()];
    b.running = b.timeInKey ? Math.max(0, Math.round((Date.now() - b.timeInKey) / 60000)) : '';
    if (s && s.rawW > 0 && b.raw > 0) { b.stdYield = round_(s.yield * b.raw / s.rawW, 0); b.stdTime = round_(s.maxTime * b.raw / s.rawW, 0); }
  });
  var k = outletById_(set_('Prep Kitchen Outlet', 'OUT-001'));
  return { doer: prepDoer_(ctx), kitchen: k ? k.name : '', dishes: prepDishes_(), unit: set_('Prep Unit', 'Grams'),
    photo: setYes_('Prep Photo Required'), open: open.sort(function (a, b) { return a.timeInKey - b.timeInKey; }),
    done: done.sort(function (a, b) { return b.timeInKey - a.timeInKey; }), canReport: can_(ctx, 'production') };
}

function prepStart_(ctx, d) {
  var dish = str_(d.dish), raw = num_(d.raw), photo = str_(d.photoId);
  var s = prepDishes_().filter(function (x) { return x.dish.toLowerCase() === dish.toLowerCase(); })[0];
  if (!s) throw new Error('Pick the dish from the list.');
  if (!(raw > 0)) throw new Error('Enter the raw quantity (' + set_('Prep Unit', 'Grams') + ').');
  if (raw > 200000) throw new Error('That raw quantity looks wrong — check it.');
  if (setYes_('Prep Photo Required') && !photo) throw new Error('Take a photo of the raw material before you start.');
  var sh = prepSheet_(), H = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(str_), c = prepCols_(H);
  if (c.tin < 0 || c.dish < 0 || c.doer < 0 || c.st < 0) throw new Error('The prep sheet needs "Time In", "Status", "Doer Name" and "Dish" columns.');
  var now = new Date(), vals = {};
  function put(k, v) { if (c[k] >= 0) vals[c[k]] = v; }
  put('tin', "'" + fmt_(now, PREP_FMT)); put('st', 'OPEN'); put('doer', prepDoer_(ctx)); put('dish', s.dish); put('ing', s.ingredient);
  put('raw', raw); put('rawUnit', set_('Prep Unit', 'Grams')); put('sImg', photo ? driveUrl_(photo) : '');
  var width = Math.max.apply(null, Object.keys(vals).map(Number)) + 1, row = [];
  for (var i = 0; i < width; i++) row.push(vals[i] === undefined ? '' : vals[i]);   // nothing after the last column we fill
  var res = lock_(function () {
    sh.appendRow(row);                                     // one atomic append — the old app may be adding rows too
    markDirty_('prep');
    log_(ctx, 'Prep batch started', s.dish + ' · ' + raw);
    return { message: s.dish + ' started — ' + raw + ' ' + set_('Prep Unit', 'Grams') + ' of ' + (s.ingredient || 'raw material') + '. Finish it here when it is ready.' };
  });
  try { res.meta = prepMeta_(ctx); } catch (e) {}        // speed: the fresh screen comes back with the answer
  return res;
}

function prepFinish_(ctx, d) {
  var produced = num_(d.produced), photo = str_(d.photoId), rowNum = Number(d.row);
  if (!(produced > 0)) throw new Error('Enter the produced quantity (' + set_('Prep Unit', 'Grams') + ').');
  if (produced > 500000) throw new Error('That produced quantity looks wrong — check it.');
  if (setYes_('Prep Photo Required') && !photo) throw new Error('Take a photo of the finished item.');
  var sh = prepSheet_();
  var res = lock_(function () {
    var lc = sh.getLastColumn(), H = sh.getRange(1, 1, 1, lc).getValues()[0].map(str_), c = prepCols_(H);
    if (!(rowNum >= 2) || rowNum > sh.getLastRow()) throw new Error('That batch was not found — refresh.');
    var r = sh.getRange(rowNum, 1, 1, lc).getValues()[0], b = prepBatch_(r, c, rowNum);
    if (prepMyNames_(ctx).indexOf(norm_(r[c.doer])) < 0) throw new Error('Only the person who started this batch can finish it.');
    if (b.dish.toLowerCase() !== str_(d.dish).toLowerCase() || (d.timeIn && b.timeIn !== str_(d.timeIn))) throw new Error('The sheet changed — refresh and try again.');
    if (b.status !== 'OPEN') throw new Error('This batch is already ' + (b.status || 'closed').toLowerCase() + '.');
    var now = new Date(), tin = b.timeInKey ? new Date(b.timeInKey) : null;
    var mins = tin ? Math.max(0, Math.round((now - tin) / 60000)) : '';
    function put(k, v) {                                   // only our own cells — a formula column (e.g. Time Diff) is left alone
      if (c[k] < 0) return;
      var cell = sh.getRange(rowNum, c[k] + 1);
      if (k === 'diff' && cell.getFormula && cell.getFormula()) return;
      cell.setValue(v);
    }
    put('tout', "'" + fmt_(now, PREP_FMT)); put('prod', produced); put('outUnit', set_('Prep Unit', 'Grams'));
    put('dImg', photo ? driveUrl_(photo) : ''); put('diff', mins); put('st', 'DONE');
    markDirty_('prep');
    log_(ctx, 'Prep batch finished', b.dish + ' · ' + b.raw + ' → ' + produced);
    return { message: b.dish + ' finished — ' + produced + ' ' + set_('Prep Unit', 'Grams') + (mins !== '' ? ' in ' + mins + ' min' : '') + '.' };
  });
  try { res.meta = prepMeta_(ctx); } catch (e) {}
  return res;
}
function prepSheet_() {
  var ss = extSS_(set_('Prep Kitchen Sheet ID')), tab = set_('Prep Kitchen Tab', 'Daily Entry'), sh = ss.getSheetByName(tab);
  if (!sh) throw new Error('The prep sheet has no "' + tab + '" tab.');
  return sh;
}

/* ============================ DAILY CLOSING – FOOD ============================ */
var CLOSING_SHIFTS = ['Shift-1', 'Shift-2', 'Day Close'];

function foodItemsFor_(outletId) {
  return readObjs_(SH.FOOD_ITEMS).filter(function (r) {
    if (!str_(r['Item']) || /inactive|^no$/i.test(str_(r['Status']))) return false;
    var o = str_(r['Outlet ID']);
    return !o || list_(o).indexOf(outletId) >= 0;
  }).map(function (r) { return { id: str_(r['Item ID']), item: str_(r['Item']), unit: str_(r['Unit']), sort: num_(r['Sort']) || 999 }; })
    .sort(function (a, b) { return a.sort - b.sort; });
}

function closingId_(o, dateIso, shift) {
  return 'FC-' + (o.short || o.id) + '-' + dateIso.replace(/-/g, '') + '-' + norm_(shift).toUpperCase();
}

function closeForm_(ctx, d) {
  var o = pickOutlet_(ctx, d.outletId);
  var date = str_(d.date) || todayIso_(), shift = CLOSING_SHIFTS.indexOf(d.shift) >= 0 ? d.shift : CLOSING_SHIFTS[0];
  var cid = closingId_(o, date, shift);
  var prev = {};
  var existing = readObjs_(SH.FOOD_CLOSE).filter(function (r) { return str_(r['Closing ID']) === cid; });
  existing.forEach(function (r) { prev[str_(r['Item ID']) || str_(r['Item'])] = r; });
  var items = foodItemsFor_(o.id).map(function (it) {
    var p = prev[it.id] || prev[it.item];
    return { id: it.id, item: it.item, unit: it.unit, closing: p ? p['Closing Qty'] : '', handover: p ? p['Handover Qty'] : '', remarks: p ? str_(p['Remarks']) : '' };
  });
  return { outletId: o.id, outlet: o.name, date: date, shift: shift, shifts: CLOSING_SHIFTS, items: items,
    saved: existing.length ? { by: str_(existing[0]['Entered By Name']), at: fmt_(existing[0]['Timestamp'], 'dd/MM hh:mm a'),
      to: str_(existing[0]['Handed Over To']) } : null,
    people: empsOfOutlet_(o.id).map(function (e) { return e.name; }) };
}

function closeSave_(ctx, d) {
  var o = pickOutlet_(ctx, d.outletId);
  var date = str_(d.date) || todayIso_(), shift = str_(d.shift);
  if (CLOSING_SHIFTS.indexOf(shift) < 0) throw new Error('Pick the shift.');
  if (date > todayIso_()) throw new Error('The date cannot be in the future.');
  var items = {}; foodItemsFor_(o.id).forEach(function (i) { items[i.id] = i; });
  var lines = (d.lines || []).filter(function (l) { return str_(l.closing) !== '' || str_(l.handover) !== ''; });
  if (!lines.length) throw new Error('Enter the closing quantity of at least one item.');
  var cid = closingId_(o, date, shift), now = new Date(), dt = isoToDate_(date);
  var rows = lines.map(function (l) {
    var it = items[str_(l.id)]; if (!it) throw new Error('Unknown item ' + l.id);
    var cq = num_(l.closing), hq = str_(l.handover) === '' ? '' : num_(l.handover);
    return { 'Closing ID': cid, 'Date': dt, 'Shift': shift, 'Outlet ID': o.id, 'Outlet': o.name, 'Item ID': it.id, 'Item': it.item,
      'Unit': it.unit, 'Closing Qty': cq, 'Handover Qty': hq, 'Wastage': hq === '' ? '' : round_(cq - hq, 3),
      'Remarks': str_(l.remarks), 'Entered By': ctx.uid, 'Entered By Name': ctx.name, 'Handed Over To': str_(d.handedTo), 'Timestamp': now };
  });
  return lock_(function () {
    var old = readObjs_(SH.FOOD_CLOSE).filter(function (r) { return str_(r['Closing ID']) === cid; }).map(function (r) { return r._row; });
    if (old.length) deleteRows_(SH.FOOD_CLOSE, old);
    appendObjs_(SH.FOOD_CLOSE, rows);
    log_(ctx, 'Food closing', cid + ' · ' + rows.length + ' items');
    return { message: (old.length ? 'Updated ' : 'Saved ') + shift + ' closing for ' + fmt_(dt, 'dd/MM/yyyy') + ' (' + rows.length + ' items).' };
  });
}

function closeList_(ctx, d) {
  var ids = outletsFor_(ctx, d.outletId).map(function (o) { return o.id; });
  var from = str_(d.from) || iso_(addDays_(new Date(), -7)), to = str_(d.to) || todayIso_();
  var map = {}, order = [];
  readObjs_(SH.FOOD_CLOSE).forEach(function (r) {
    if (ids.indexOf(str_(r['Outlet ID'])) < 0) return;
    var k = iso_(r['Date']); if (k < from || k > to) return;
    var id = str_(r['Closing ID']);
    if (!map[id]) { map[id] = { id: id, date: fmt_(r['Date']), dateKey: k, shift: str_(r['Shift']), outlet: str_(r['Outlet']),
      by: str_(r['Entered By Name']), to: str_(r['Handed Over To']), items: 0, wasteItems: 0, lines: [] }; order.push(id); }
    var g = map[id]; g.items++;
    if (num_(r['Wastage']) > 0) g.wasteItems++;
    g.lines.push({ item: str_(r['Item']), unit: str_(r['Unit']), closing: r['Closing Qty'], handover: r['Handover Qty'], wastage: r['Wastage'], remarks: str_(r['Remarks']) });
  });
  return { rows: order.map(function (k) { return map[k]; }).sort(function (a, b) { return b.dateKey.localeCompare(a.dateKey) || b.shift.localeCompare(a.shift); }) };
}
