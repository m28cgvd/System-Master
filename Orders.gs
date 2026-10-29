/*************************************************************************
 *  Orders.gs — what an outlet asks for.
 *    1. GFP order     → written into the Outlet Orders workbook ("Orders"
 *                       tab), same PO numbering and approve / reject links
 *                       as the Outlet Order app, so GFP works it as before.
 *    2. Vegetables    → "Veg Orders" tab here, PDF emailed to the vendor list.
 *    3. Bill entry    → the items in your image are never ordered: only the
 *                       bill number, party, qty and a photo of the bill go
 *                       into the Stock Register.
 *************************************************************************/

var ORDER_ERR_TOKENS = ['#REF', '#N/A', '#ERROR', '#VALUE', '#NAME', '#NUM', '#DIV/0', '#NULL'];
function isSheetError_(v) { var s = str_(v).toUpperCase(); return ORDER_ERR_TOKENS.some(function (t) { return s.indexOf(t) === 0; }); }

/* ============================ GFP CATALOGUE ============================ */
function ordCatalog_(ctx) {
  var hit = cacheGetJ_('ord_catalog_v1');
  if (hit) return hit;
  var ss = extSS_(set_('Outlet Orders Sheet ID'));
  var sh = ss.getSheetByName('ItemMaster');
  if (!sh || sh.getLastRow() < 2) throw new Error('The ItemMaster tab of the Outlet Orders workbook is empty.');
  var v = sh.getRange(1, 1, sh.getLastRow(), Math.max(sh.getLastColumn(), 5)).getValues();
  var H = v[0].map(str_);
  var c = { code: col_(H, ['A (Item Code)', 'Item Code']), name: col_(H, ['B (Item Name)', 'Item Name']),
    cat: col_(H, ['C (Category)', 'Category']), sub: col_(H, ['D (SubCategory)', 'SubCategory', 'Sub Category']),
    unit: col_(H, ['E (unit)', 'Unit']), status: col_(H, ['F (Status)', 'Status']) };
  var first = 1;
  if (c.name < 0) { c = { code: 0, name: 1, cat: 2, sub: 3, unit: 4, status: -1 }; first = 0; }
  var items = [], seen = {}, started = false;
  for (var i = first; i < v.length; i++) {
    var r = v[i], name = str_(r[c.name]), code = c.code >= 0 ? str_(r[c.code]) : '';
    if (isSheetError_(name) || isSheetError_(code)) continue;
    if (!name) { if (started) break; continue; }
    started = true;
    if (c.status >= 0 && str_(r[c.status]).toUpperCase() !== 'ACTIVE') continue;
    var k = (code || name).toUpperCase();
    if (seen[k]) continue; seen[k] = 1;
    items.push({ code: code, name: name, cat: c.cat >= 0 ? str_(r[c.cat]) : '', sub: c.sub >= 0 ? str_(r[c.sub]) : '',
      unit: c.unit >= 0 ? str_(r[c.unit]) : '' });
  }
  var cats = uniq_(items.map(function (x) { return x.cat; }).filter(String)).sort();
  var out = { items: items, cats: cats };
  cachePutJ_('ord_catalog_v1', out, 600);
  return out;
}

/* ============================ GFP ORDERS (read) ============================ */
function orderBelongs_(o, orderNo, outletCell) {
  if (!o) return false;
  var n = norm_(outletCell);
  if (n && o.aliases.indexOf(n) >= 0) return true;
  var m = str_(orderNo).toUpperCase().match(/^PO([A-Z]{2,3})\d{2}\//);
  return !!(m && o.short && m[1] === o.short);
}

/** Recent order lines, grouped per order (the Outlet Orders "Orders" tab is long, so only the tail is read). */
function ordRecent_() {
  if (__M.ordRecent) return __M.ordRecent;
  var hit = __M.fresh ? null : cacheGetJ_(ordKey_());
  if (hit) { __M.ordRecent = hit; return hit; }
  var days = setNum_('Order Load Days', 60);
  var t = extRead_(set_('Outlet Orders Sheet ID'), 'Orders', { headerRow: 1, lastN: 9000 });
  var H = t.head;
  var c = { no: col_(H, ['Order No']), out: col_(H, ['Outlet Name']), cust: col_(H, ['Customer Name']),
    code: col_(H, ['Item Code']), name: col_(H, ['Item Name']), unit: col_(H, ['Unit']), qty: col_(H, ['Quantity', 'Qty']),
    by: col_(H, ['Ordered By']), ts: col_(H, ['Timestamp', 'Order Date']), st: col_(H, ['Status']),
    disp: col_(H, ['Dispatch Qty']) };
  var cut = days > 0 ? Date.now() - days * 86400000 : 0;
  var map = {}, order = [];
  t.rows.forEach(function (r) {
    var no = str_(r[c.no]); if (!no) return;
    var d = c.ts >= 0 ? parseAny_(r[c.ts]) : null;
    if (cut && d && d.getTime() < cut) return;
    var g = map[no];
    if (!g) {
      g = map[no] = { no: no, outletCell: c.out >= 0 ? str_(r[c.out]) : '', by: c.by >= 0 ? str_(r[c.by]) : '',
        cust: c.cust >= 0 ? str_(r[c.cust]) : '', date: d ? iso_(d) : '', time: d ? fmt_(d, 'dd/MM/yyyy hh:mm a') : '',
        status: c.st >= 0 ? str_(r[c.st]) : '', lines: [] };
      order.push(no);
    }
    g.lines.push([c.code >= 0 ? str_(r[c.code]) : '', c.name >= 0 ? str_(r[c.name]) : '', c.unit >= 0 ? str_(r[c.unit]) : '',
      c.qty >= 0 ? num_(r[c.qty]) : 0, c.disp >= 0 && str_(r[c.disp]) !== '' ? num_(r[c.disp]) : null]);
  });
  var out = order.map(function (k) { return map[k]; });
  cachePutJ_(ordKey_(), out, 300);
  __M.ordRecent = out;
  return out;
}
function ordKey_() { return 'ord_recent_v1_' + gen_('data'); }
function dropOrderCache_() { cacheDel_([ordKey_()]); delete __M.ordRecent; }

function grnDoneMap_() {
  var m = {};
  readObjs_(SH.GRN).forEach(function (r) { var no = str_(r['Order No']); if (no) m[no] = str_(r['GRN No']); });
  return m;
}

function ordHistory_(ctx, d) {
  var outs = outletsFor_(ctx, d.outletId);
  var done = grnDoneMap_();
  var list = ordRecent_().filter(function (g) {
    return outs.some(function (o) { return orderBelongs_(o, g.no, g.outletCell); });
  }).map(function (g) {
    var o = outs.filter(function (x) { return orderBelongs_(x, g.no, g.outletCell); })[0];
    return { no: g.no, outlet: o ? o.name : g.outletCell, outletId: o ? o.id : '', date: g.date, time: g.time,
      status: g.status || 'Confirmed', by: g.cust || g.by, lines: g.lines.length,
      qty: round_(g.lines.reduce(function (s, l) { return s + l[3]; }, 0), 2),
      dispatched: g.lines.some(function (l) { return l[4] !== null; }), grn: done[g.no] || '' };
  });
  list.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)) || b.no.localeCompare(a.no); });
  return { orders: list.slice(0, 200) };
}

function ordLines_(ctx, d) {
  var no = str_(d.orderNo);
  var g = ordRecent_().filter(function (x) { return x.no === no; })[0];
  if (!g) throw new Error('Order ' + no + ' not found in the last ' + setNum_('Order Load Days', 60) + ' days.');
  var outs = outletsFor_(ctx, 'ALL');
  if (!outs.some(function (o) { return orderBelongs_(o, g.no, g.outletCell); })) throw new Error('That order belongs to another outlet.');
  return { no: g.no, date: g.time, status: g.status, by: g.cust || g.by,
    lines: g.lines.map(function (l) { return { code: l[0], name: l[1], unit: l[2], qty: l[3], dispatch: l[4] }; }) };
}

/* ============================ GFP ORDER (place) ============================ */
function ordPlace_(ctx, d) {
  var o = pickOutlet_(ctx, d.outletId);
  if (!o.short || o.type !== 'Outlet') throw new Error('GFP orders can only be placed for an outlet — pick the outlet first (' + o.name + ' is not one).');
  var cat = ordCatalog_(ctx), byCode = {}, byName = {};
  cat.items.forEach(function (it) { if (it.code) byCode[it.code.toUpperCase()] = it; byName[it.name.toLowerCase()] = it; });
  var merged = {}, lines = [], bad = [];
  (d.items || []).forEach(function (x) {
    var q = num_(x.qty); if (q <= 0) return;
    var it = byCode[str_(x.code).toUpperCase()] || byName[str_(x.name).toLowerCase()];
    if (!it) { bad.push(str_(x.name) || str_(x.code)); return; }
    var k = (it.code || it.name).toUpperCase();
    if (merged[k]) merged[k].qty += q; else { merged[k] = { code: it.code, name: it.name, unit: it.unit, qty: q }; lines.push(merged[k]); }
  });
  if (bad.length) throw new Error('Not orderable any more (inactive in the Item Master): ' + bad.join(', '));
  if (!lines.length) throw new Error('Enter a quantity for at least one item.');

  var ss = extSS_(set_('Outlet Orders Sheet ID'));
  var sh = ss.getSheetByName('Orders');
  if (!sh) throw new Error('The Outlet Orders workbook has no "Orders" tab.');
  var orderedBy = ctx.name + (ctx.mobile ? ' (' + ctx.mobile + ')' : '');
  var res = lock_(function () {
    var now = new Date();
    var yy = Utilities.formatDate(now, APP.TZ, 'yy'), mon = Utilities.formatDate(now, APP.TZ, 'MMM').toUpperCase();
    var prefix = 'PO' + o.short + yy + '/' + mon + '/';
    var lr = sh.getLastRow(), max = 0;
    if (lr > 1) {
      var re = new RegExp('^' + escRe_(prefix) + '(\\d+)$');
      sh.getRange(2, 1, lr - 1, 1).getValues().forEach(function (r) { var m = str_(r[0]).match(re); if (m) max = Math.max(max, parseInt(m[1], 10)); });
    }
    var no = prefix + pad_(max + 1, 3);
    var lc = Math.max(sh.getLastColumn(), 10);
    var H = sh.getRange(1, 1, 1, lc).getValues()[0].map(str_);
    var ix = { no: col_(H, ['Order No']), out: col_(H, ['Outlet Name']), cust: col_(H, ['Customer Name']), code: col_(H, ['Item Code']),
      name: col_(H, ['Item Name']), unit: col_(H, ['Unit']), qty: col_(H, ['Quantity']), by: col_(H, ['Ordered By']),
      ts: col_(H, ['Timestamp']), st: col_(H, ['Status']) };
    var rows = lines.map(function (l) {
      var r = []; for (var i = 0; i < lc; i++) r.push('');
      function put(k, v) { if (ix[k] >= 0) r[ix[k]] = v; }
      put('no', no); put('out', o.orderName || ('CG ' + o.name)); put('cust', ctx.name); put('code', l.code); put('name', l.name);
      put('unit', l.unit); put('qty', l.qty); put('by', orderedBy); put('ts', now); put('st', 'Confirmed');
      return r;
    });
    var start = lr + 1;
    sh.getRange(start, 1, rows.length, lc).setValues(rows);
    if (ix.ts >= 0) sh.getRange(start, ix.ts + 1, rows.length, 1).setNumberFormat('dd-MM-yyyy HH:mm:ss');
    var meta = ss.getSheetByName('OrderMeta');
    if (meta) meta.appendRow([no, ctx.mobile || ctx.uid, 0]);
    return { no: no, now: now };
  });
  dropOrderCache_();

  var total = round_(lines.reduce(function (s, l) { return s + l.qty; }, 0), 2);
  var mailStatus = '';
  try { mailStatus = ordMail_(ctx, o, res.no, res.now, lines, total, str_(d.note)); } catch (e) { mailStatus = 'email failed: ' + e.message; }
  appendObj_(SH.ORDER_LOG, { 'Order No': res.no, 'Outlet ID': o.id, 'Outlet': o.name, 'Lines': lines.length, 'Total Qty': total,
    'Placed By': ctx.uid, 'Placed By Name': ctx.name, 'Timestamp': res.now, 'Email Status': mailStatus, 'Note': str_(d.note) });
  log_(ctx, 'GFP order placed', res.no + ' · ' + lines.length + ' lines');
  return { message: 'Order ' + res.no + ' placed (' + lines.length + ' items).', orderNo: res.no, mail: mailStatus };
}

function ordMail_(ctx, o, no, when, lines, total, note) {
  var to = list_(setRaw_('GFP Order Emails'));
  if (!to.length) {
    try {
      var el = extSS_(set_('Outlet Orders Sheet ID')).getSheetByName('EmailList');
      if (el && el.getLastRow() > 1) el.getRange(2, 1, el.getLastRow() - 1, 1).getValues().forEach(function (r) { var e = str_(r[0]); if (e.indexOf('@') > 0) to.push(e); });
    } catch (e) {}
  }
  var app = set_('Outlet Order App URL'), tok = set_('Order Approve Token', 'cg2024');
  var rows = lines.map(function (l, i) {
    return '<tr><td style="border:1px solid #eadbc8;padding:6px;text-align:center">' + (i + 1) + '</td>' +
      '<td style="border:1px solid #eadbc8;padding:6px">' + esc_(l.code) + '</td>' +
      '<td style="border:1px solid #eadbc8;padding:6px">' + esc_(l.name) + '</td>' +
      '<td style="border:1px solid #eadbc8;padding:6px;text-align:center">' + esc_(l.unit) + '</td>' +
      '<td style="border:1px solid #eadbc8;padding:6px;text-align:right;font-weight:bold">' + l.qty + '</td></tr>';
  }).join('');
  var table = '<table style="border-collapse:collapse;width:100%;font-size:13px"><tr style="background:#6B3F1C;color:#fff">' +
    '<th style="padding:6px">#</th><th style="padding:6px">Code</th><th style="padding:6px;text-align:left">Item</th><th style="padding:6px">Unit</th><th style="padding:6px">Qty</th></tr>' + rows + '</table>';
  var head = '<p><b>Order:</b> ' + esc_(no) + '<br><b>Outlet:</b> ' + esc_(o.orderName || o.name) + '<br><b>Ordered by:</b> ' + esc_(ctx.name) +
    '<br><b>Date:</b> ' + fmt_(when, 'dd/MM/yyyy hh:mm a') + '<br><b>Items:</b> ' + lines.length + ' · <b>Total qty:</b> ' + total +
    (note ? '<br><b>Note:</b> ' + esc_(note) : '') + '</p>';
  var pdf = null;
  try {
    pdf = Utilities.newBlob('<html><head><meta charset="utf-8"></head><body style="font-family:Arial;padding:20px">' +
      '<h2 style="color:#6B3F1C;margin:0 0 8px">Chai Govindam — Outlet Order</h2>' + head + table + '</body></html>', 'text/html', 'o.html')
      .getAs('application/pdf').setName(no.replace(/\//g, '-') + '.pdf');
  } catch (e) { pdf = null; }
  var actions = app ? '<p style="text-align:center;margin:18px 0">' +
    '<a href="' + app + '?page=approve&orderNo=' + encodeURIComponent(no) + '&action=approve&token=' + encodeURIComponent(tok) + '" style="background:#32AC5C;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:bold;margin:4px;display:inline-block">APPROVE</a> ' +
    '<a href="' + app + '?page=approve&orderNo=' + encodeURIComponent(no) + '&action=reject&token=' + encodeURIComponent(tok) + '" style="background:#D64545;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:bold;margin:4px;display:inline-block">REJECT</a></p>' : '';
  var st = mail_(to, 'New Order: ' + no + ' — ' + o.name, mailShell_('New outlet order', head + actions + table), { attachments: pdf ? [pdf] : null });
  if (ctx.email) mail_([ctx.email], 'Order Confirmation: ' + no, mailShell_('Your order is placed', head + table), { attachments: pdf ? [pdf] : null });
  return st;
}

/* ============================ VEGETABLES ============================ */
function vegItems_(ctx) {
  var rank = { 'Vegetables': 1, 'Extra': 2, 'Staff Food': 3 };
  return readObjs_(SH.VEG_ITEMS).filter(function (r) { return str_(r['Item']) && !/inactive|^no$/i.test(str_(r['Status'])); })
    .map(function (r) {
      var sec = str_(r['Section']) || 'Vegetables';
      return { id: str_(r['Item ID']), section: sec, name: str_(r['Item']), hindi: str_(r['Hindi']), unit: str_(r['Unit']) || 'kg',
        sort: num_(r['Sort']) || 999, billing: sec === 'Staff Food' ? 'Staff Food' : 'Vegetables' };
    })
    .sort(function (a, b) { return (rank[a.section] || 9) - (rank[b.section] || 9) || a.sort - b.sort; });
}

function vegPlace_(ctx, d) {
  var o = pickOutlet_(ctx, d.outletId);
  var byName = {};
  vegItems_(ctx).forEach(function (i) { byName[i.name.toLowerCase()] = i; });
  var items = (d.items || []).filter(function (x) { return num_(x.qty) > 0; }).map(function (x) {
    var it = byName[str_(x.name).toLowerCase()];
    if (!it) throw new Error(str_(x.name) + ' is not on the vegetable list.');
    return { name: it.name, hindi: it.hindi, unit: it.unit, qty: num_(x.qty), remarks: str_(x.remarks), billing: it.billing };
  });
  if (!items.length) throw new Error('Enter a quantity for at least one vegetable.');
  var now = new Date();
  var id = 'VEG-' + (o.short || 'OUT') + '-' + fmt_(now, 'yyMMdd-HHmmss');
  var rows = items.map(function (it) {
    return { 'Order ID': id, 'Order Date': now, 'Outlet ID': o.id, 'Outlet': o.name, 'Item': it.name, 'Hindi': it.hindi,
      'Required Qty': it.qty, 'Unit': it.unit, 'Remarks': it.remarks, 'Status': 'Pending', 'Type': it.billing, 'Ordered By': ctx.name };
  });
  lock_(function () { appendObjs_(SH.VEG_ORDERS, rows); });
  var mail = '';
  try { mail = vegMail_(ctx, o, id, now, items, str_(d.note)); } catch (e) { mail = 'email failed: ' + e.message; }
  log_(ctx, 'Vegetable order', id + ' · ' + items.length + ' items');
  return { message: 'Vegetable order ' + id + ' placed (' + items.length + ' items).', orderId: id, mail: mail };
}

function vegMail_(ctx, o, id, when, items, note) {
  var groups = { 'Vegetables': [], 'Staff Food': [] };
  items.forEach(function (it) { (it.billing === 'Staff Food' ? groups['Staff Food'] : groups['Vegetables']).push(it); });
  var html = Object.keys(groups).map(function (g) {
    if (!groups[g].length) return '';
    return '<h3 style="color:#1f7a3a;margin:14px 0 6px">' + g + '</h3><table style="width:100%;border-collapse:collapse;font-size:13px">' +
      '<tr style="background:#1f7a3a;color:#fff"><th style="padding:6px">#</th><th style="padding:6px;text-align:left">Item</th><th style="padding:6px">Qty</th><th style="padding:6px">Unit</th><th style="padding:6px;text-align:left">Remarks</th></tr>' +
      groups[g].map(function (it, i) {
        return '<tr><td style="border:1px solid #cfe8d6;padding:6px;text-align:center">' + (i + 1) + '</td><td style="border:1px solid #cfe8d6;padding:6px">' +
          esc_(it.name) + (it.hindi ? ' <span style="color:#777">' + esc_(it.hindi) + '</span>' : '') + '</td><td style="border:1px solid #cfe8d6;padding:6px;text-align:right;font-weight:bold">' +
          it.qty + '</td><td style="border:1px solid #cfe8d6;padding:6px;text-align:center">' + esc_(it.unit) + '</td><td style="border:1px solid #cfe8d6;padding:6px">' + esc_(it.remarks) + '</td></tr>';
      }).join('') + '</table>';
  }).join('');
  var head = '<p><b>Order:</b> ' + esc_(id) + '<br><b>Outlet:</b> ' + esc_(o.name) + '<br><b>Ordered by:</b> ' + esc_(ctx.name) +
    '<br><b>Date:</b> ' + fmt_(when, 'dd/MM/yyyy hh:mm a') + (note ? '<br><b>Note:</b> ' + esc_(note) : '') + '</p>';
  var pdf = null;
  try {
    pdf = Utilities.newBlob('<html><head><meta charset="utf-8"></head><body style="font-family:Arial;padding:20px"><h2 style="color:#1f7a3a">Vegetable Order — ' +
      esc_(o.name) + '</h2>' + head + html + '</body></html>', 'text/html', 'v.html').getAs('application/pdf').setName(id + '.pdf');
  } catch (e) { pdf = null; }
  return mail_(list_(set_('Vegetable Order Emails', 'mis@chaigovindam.com')), 'Vegetable Order ' + id + ' — ' + o.name,
    mailShell_('Vegetable order', head + html), { attachments: pdf ? [pdf] : null });
}

function vegGroups_(ctx, outletId, filter) {
  var outs = outletsFor_(ctx, outletId), ids = outs.map(function (o) { return o.id; });
  var map = {}, order = [];
  readObjs_(SH.VEG_ORDERS).forEach(function (r) {
    if (ids.indexOf(str_(r['Outlet ID'])) < 0) return;
    if (filter && !filter(r)) return;
    var id = str_(r['Order ID']);
    if (!map[id]) { map[id] = { id: id, date: iso_(r['Order Date']), time: fmt_(r['Order Date'], 'dd/MM/yyyy hh:mm a'), outlet: str_(r['Outlet']),
      by: str_(r['Ordered By']), lines: 0, pending: 0, received: 0, amount: 0, party: '', bill: '' }; order.push(id); }
    var g = map[id]; g.lines++;
    if (str_(r['Status']) === 'Pending') g.pending++; else g.received++;
    g.amount += num_(r['Amount']);
    if (str_(r['Party Name'])) g.party = str_(r['Party Name']);
    if (str_(r['Bill Number'])) g.bill = str_(r['Bill Number']);
  });
  return order.map(function (k) { map[k].amount = round_(map[k].amount, 2); return map[k]; })
    .sort(function (a, b) { return b.id.localeCompare(a.id); });
}
function vegPending_(ctx, d) { return { orders: vegGroups_(ctx, d.outletId).filter(function (g) { return g.pending > 0; }) }; }

function vegOrder_(ctx, d) {
  var id = str_(d.orderId), outs = outletsFor_(ctx, 'ALL').map(function (o) { return o.id; });
  var rows = readObjs_(SH.VEG_ORDERS).filter(function (r) { return str_(r['Order ID']) === id; });
  if (!rows.length) throw new Error('Order not found.');
  if (outs.indexOf(str_(rows[0]['Outlet ID'])) < 0) throw new Error('That order belongs to another outlet.');
  return { id: id, outlet: str_(rows[0]['Outlet']), date: fmt_(rows[0]['Order Date'], 'dd/MM/yyyy hh:mm a'),
    party: str_(rows[0]['Party Name']), bill: str_(rows[0]['Bill Number']), billFileId: str_(rows[0]['Bill File ID']),
    lines: rows.map(function (r) {
      return { row: r._row, name: str_(r['Item']), hindi: str_(r['Hindi']), qty: num_(r['Required Qty']), unit: str_(r['Unit']),
        remarks: str_(r['Remarks']), rec: str_(r['Received Qty']) === '' ? '' : num_(r['Received Qty']),
        rate: str_(r['Rate']) === '' ? '' : num_(r['Rate']), amount: num_(r['Amount']), status: str_(r['Status']), type: str_(r['Type']) };
    }) };
}

function vegReceive_(ctx, d) {
  var o = vegOrder_(ctx, { orderId: d.orderId });
  var lines = d.lines || [];
  if (!lines.length) throw new Error('Nothing to save.');
  return lock_(function () {
    var now = new Date(), total = 0, n = 0;
    var byRow = {}; o.lines.forEach(function (l) { byRow[l.row] = l; });
    lines.forEach(function (x) {
      var l = byRow[Number(x.row)]; if (!l) return;
      var rec = num_(x.rec), rate = num_(x.rate), u = str_(l.unit).toLowerCase();
      var amt = (u === 'g' || u === 'gm' || u === 'grm') ? (rec / 1000) * rate : rec * rate;
      var st = str_(x.status) || (rec > 0 ? 'Received' : 'Pending');
      updateObj_(SH.VEG_ORDERS, l.row, { 'Received Qty': rec, 'Rate': rate || '', 'Amount': round_(amt, 2), 'Status': st,
        'Received By': ctx.name, 'Received At': now, 'Party Name': str_(d.party), 'Bill Number': str_(d.billNo),
        'Bill URL': str_(d.billFileId) ? driveUrl_(d.billFileId) : '', 'Bill File ID': str_(d.billFileId) });
      total += amt; n++;
    });
    log_(ctx, 'Vegetables received', o.id + ' · ' + n + ' lines');
    return { message: 'Saved ' + n + ' line(s) · total ₹' + round_(total, 2), total: round_(total, 2) };
  });
}

function vegHistory_(ctx, d) {
  var from = str_(d.from), to = str_(d.to);
  return { orders: vegGroups_(ctx, d.outletId, function (r) {
    var k = iso_(r['Order Date']); return (!from || k >= from) && (!to || k <= to);
  }).slice(0, 200) };
}

/** Month view like the old Daily Report / monthly sheets: per day, Vegetables vs Staff Food, and per item. */
function vegMonth_(ctx, d) {
  var ids = outletsFor_(ctx, d.outletId).map(function (o) { return o.id; });
  var month = str_(d.month) || fmt_(new Date(), 'yyyy-MM');
  var days = {}, items = {}, tot = { 'Vegetables': 0, 'Staff Food': 0 }, qty = 0;
  readObjs_(SH.VEG_ORDERS).forEach(function (r) {
    if (ids.indexOf(str_(r['Outlet ID'])) < 0 || fmt_(r['Order Date'], 'yyyy-MM') !== month) return;
    var k = iso_(r['Order Date']), t = str_(r['Type']) === 'Staff Food' ? 'Staff Food' : 'Vegetables', a = num_(r['Amount']);
    days[k] = days[k] || { date: fmt_(r['Order Date']), key: k, veg: 0, staff: 0, lines: 0 };
    days[k][t === 'Staff Food' ? 'staff' : 'veg'] += a; days[k].lines++;
    tot[t] += a;
    var nm = str_(r['Item']);
    items[nm] = items[nm] || { item: nm, hindi: str_(r['Hindi']), unit: str_(r['Unit']), ordered: 0, received: 0, amount: 0 };
    items[nm].ordered += num_(r['Required Qty']); items[nm].received += num_(r['Received Qty']); items[nm].amount += a;
  });
  var dl = Object.keys(days).sort().reverse().map(function (k) { var x = days[k]; x.veg = round_(x.veg, 2); x.staff = round_(x.staff, 2); return x; });
  var il = Object.keys(items).map(function (k) { var x = items[k]; x.ordered = round_(x.ordered, 2); x.received = round_(x.received, 2); x.amount = round_(x.amount, 2); return x; })
    .sort(function (a, b) { return b.amount - a.amount; });
  return { month: month, days: dl, items: il, vegTotal: round_(tot['Vegetables'], 2), staffTotal: round_(tot['Staff Food'], 2) };
}

/* ============================ STOCK REGISTER (bill entry) ============================ */
function stockPicker_(ctx) {
  var cats = readObjs_(SH.STOCK_CATS).filter(function (r) { return str_(r['Category']) && !/inactive|^no$/i.test(str_(r['Status'])); })
    .map(function (r) { return { name: str_(r['Category']), vendor: str_(r['Default Vendor']), sort: num_(r['Sort']) || 999 }; })
    .sort(function (a, b) { return a.sort - b.sort; });
  var catBy = {}; cats.forEach(function (c) { catBy[c.name.toUpperCase()] = c; });
  var items = readObjs_(SH.STOCK_ITEMS).filter(function (r) { return str_(r['Item']) && !/inactive|^no$/i.test(str_(r['Status'])); })
    .map(function (r) {
      var c = catBy[str_(r['Category']).toUpperCase()];
      return { id: str_(r['Item ID']), category: str_(r['Category']), item: str_(r['Item']),
        vendor: str_(r['Vendor']) || (c ? c.vendor : ''), unit: str_(r['Unit']) || 'PCS', sort: num_(r['Sort']) || 999 };
    });
  var parties = {};
  cats.forEach(function (c) { list_(c.vendor).forEach(function (v) { parties[v] = 1; }); });
  items.forEach(function (i) { if (i.vendor) parties[i.vendor] = 1; });
  readObjs_(SH.STOCK_REG).forEach(function (r) { var p = str_(r['Party Name']); if (p) parties[p] = 1; });
  return { cats: cats, items: items, parties: Object.keys(parties).sort(),
    billRequired: setYes_('Stock Bill Image Required'), billNoRequired: setYes_('Stock Bill Number Required') };
}

function stockSave_(ctx, d) {
  var o = pickOutlet_(ctx, d.outletId);
  var rows = (d.rows || []).filter(function (r) { return r && str_(r.item); });
  if (!rows.length) throw new Error('Add at least one item.');
  var needBill = setYes_('Stock Bill Image Required'), needNo = setYes_('Stock Bill Number Required');
  var probs = [];
  rows.forEach(function (r, i) {
    var n = 'Line ' + (i + 1) + ' (' + str_(r.item) + '): ';
    if (!str_(r.party)) probs.push(n + 'party name is required.');
    if (num_(r.qty) <= 0) probs.push(n + 'quantity must be more than 0.');
    if (needNo && !str_(r.billNo)) probs.push(n + 'bill number is required.');
    if (needBill && !str_(r.billFileId)) probs.push(n + 'a photo of the bill is required.');
  });
  if (probs.length) throw new Error(probs.join('\n'));
  var date = isoToDate_(d.date) || new Date();
  return lock_(function () {
    var prefix = 'SR' + fmt_(new Date(), 'MMyy');
    var ids = nextIds_(SH.STOCK_REG, 'Entry ID', prefix, 4, rows.length);
    var now = new Date(), total = 0;
    var out = rows.map(function (r, i) {
      var qty = num_(r.qty), rate = num_(r.rate), amt = rate ? round_(qty * rate, 2) : '';
      if (amt) total += amt;
      return { 'Entry ID': ids[i], 'Date': date, 'Outlet ID': o.id, 'Outlet': o.name, 'Category': str_(r.category), 'Item': str_(r.item),
        'Party Name': str_(r.party), 'Qty': qty, 'Unit': str_(r.unit), 'Rate': rate || '', 'Amount': amt, 'Bill Number': str_(r.billNo),
        'Bill URL': str_(r.billFileId) ? driveUrl_(r.billFileId) : '', 'Bill File ID': str_(r.billFileId), 'Remarks': str_(r.remarks),
        'Entered By': ctx.uid, 'Entered By Name': ctx.name, 'Timestamp': now };
    });
    appendObjs_(SH.STOCK_REG, out);
    log_(ctx, 'Stock register', o.name + ' · ' + out.length + ' lines');
    return { message: 'Saved ' + out.length + ' entr' + (out.length === 1 ? 'y' : 'ies') + (total ? ' · ₹' + round_(total, 2) : '') + '.', ids: ids };
  });
}

function stockList_(ctx, d) {
  var ids = outletsFor_(ctx, d.outletId).map(function (o) { return o.id; });
  var from = str_(d.from), to = str_(d.to), q = str_(d.q).toLowerCase();
  var list = readObjs_(SH.STOCK_REG).filter(function (r) {
    if (ids.indexOf(str_(r['Outlet ID'])) < 0) return false;
    var k = iso_(r['Date']);
    if (from && k < from) return false; if (to && k > to) return false;
    if (q && [r['Item'], r['Party Name'], r['Bill Number'], r['Category']].join(' ').toLowerCase().indexOf(q) < 0) return false;
    return true;
  }).map(function (r) {
    return { id: str_(r['Entry ID']), date: fmt_(r['Date']), outlet: str_(r['Outlet']), category: str_(r['Category']),
      item: str_(r['Item']), party: str_(r['Party Name']), qty: num_(r['Qty']), unit: str_(r['Unit']), rate: num_(r['Rate']),
      amount: num_(r['Amount']), billNo: str_(r['Bill Number']), fileId: str_(r['Bill File ID']), by: str_(r['Entered By Name']) };
  }).reverse();
  var total = round_(list.reduce(function (s, r) { return s + r.amount; }, 0), 2);
  return { rows: list.slice(0, 300), total: total, count: list.length };
}
