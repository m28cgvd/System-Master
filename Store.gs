var IM_LOCKED = ['Status', 'Item Code (SKU)', 'Profit %'];
var IM_PICK = ['Unit', 'Taxability', 'Category', 'Sub-Category', 'Nature', 'SOURCE', 'Material / Type', 'Suppliers'];
var IM_NUM = ['IGST Rate', 'CGST Rate', 'SGST Rate', 'Cost Price', 'Selling Price', 'Opening Stock Qty', 'Average Daily Consuption', 'Lead Time', 'Safety Factor', 'Max Level', 'Material in Transit'];
var IM_STATUSES = ['Active', 'Inactive'];

function imSS_() { return extSS_(set_('Item Master Sheet ID')); }
function imTabName_() { return set_('Item Master Tab', 'Master Item List'); }
function imTab_() {
  var sh = imSS_().getSheetByName(imTabName_());
  if (!sh) throw new Error('The Item Master has no "' + imTabName_() + '" tab (Settings ▸ Item Master Tab).');
  return sh;
}
function imApprover_(ctx) { var r = norm_(ctx.role); return !!(ctx.super || r === 'director' || r === 'misadmin' || (ctx.grants || {}).item_approve); }
function imCanEdit_(ctx) { return !!(ctx.super || can_(ctx, 'item_master')); }
function imNeedEdit_(ctx) { if (!imCanEdit_(ctx)) throw new Error('Item Master is for the GFP store (Store Executive), MIS and the Directors.'); }

function imRead_(fresh) {
  if (!fresh && __M.im) return __M.im;
  var sh = imTab_(), last = sh.getLastRow(), lc = sh.getLastColumn();
  var head = sh.getRange(1, 1, 1, lc).getValues()[0].map(str_);
  var vals = last > 1 ? sh.getRange(2, 1, last - 1, lc).getValues() : [];
  var ci = function (n) { return head.indexOf(n); }, iCode = ci('Item Code (SKU)'), iName = ci('Item Name'), iSt = ci('Status');
  if (iCode < 0 || iName < 0) throw new Error('The Item Master tab has no "Item Code (SKU)" / "Item Name" column.');
  var items = [];
  vals.forEach(function (r, i) {
    var code = str_(r[iCode]), name = str_(r[iName]);
    if (!code && !name) return;
    var v = {};
    head.forEach(function (h, j) { if (h) v[h] = r[j] instanceof Date ? fmt_(r[j]) : typeof r[j] === 'number' ? r[j] : str_(r[j]); });
    items.push({ row: i + 2, code: code, name: name, status: iSt >= 0 ? str_(r[iSt]) : '', values: v });
  });
  return (__M.im = { sh: sh, head: head, items: items });
}
function imFind_(code) {
  var k = norm_(code), M = imRead_(true);
  var it = M.items.filter(function (x) { return norm_(x.code) === k; })[0];
  if (!it) throw new Error('Item ' + code + ' is not in the Item Master.');
  return { M: M, it: it };
}
function imOptions_(M) {
  var out = {};
  IM_PICK.forEach(function (f) { if (M.head.indexOf(f) >= 0) out[f] = {}; });
  try {
    var dv = M.sh.getRange(2, 1, 1, M.head.length).getDataValidations()[0];
    dv.forEach(function (rule, j) {
      var f = M.head[j]; if (!rule || !out[f]) return;
      var t = rule.getCriteriaType(), a = rule.getCriteriaValues();
      if (t === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) (a[0] || []).forEach(function (x) { if (str_(x)) out[f][str_(x)] = 1; });
      if (t === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE && a[0]) a[0].getValues().forEach(function (r) { if (str_(r[0])) out[f][str_(r[0])] = 1; });
    });
  } catch (e) {}
  M.items.forEach(function (x) { Object.keys(out).forEach(function (f) { var s = str_(x.values[f]); if (s && s !== '-') out[f][s] = 1; }); });
  var res = {};
  Object.keys(out).forEach(function (f) { res[f] = Object.keys(out[f]).sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : 1; }); });
  return res;
}
function imLog_(ctx, action, it, details) {
  try {
    var sh = imSS_().getSheetByName('Activity Log');
    if (sh) sh.appendRow([new Date(), ctx.name + ' (One Login)', action, it.code, it.name, imTabName_(), details]);
  } catch (e) {}
}
function imDrop_() {
  delete __M.im;
  try { CacheService.getScriptCache().remove('cgFullIM_v1'); } catch (e) {}
  bumpGen_('items');
}

function itemList_(ctx) {
  imNeedEdit_(ctx);
  var M = imRead_(), pend = {};
  readObjs_(SH.ITEM_REQ).forEach(function (r) { if (str_(r['Status']) === 'Pending') pend[norm_(r['Item Code'])] = { id: str_(r['Request ID']), to: str_(r['To Status']) }; });
  var fields = M.head.filter(function (h) { return h; }).map(function (h) {
    return { name: h, locked: IM_LOCKED.indexOf(h) >= 0, num: IM_NUM.indexOf(h) >= 0, pick: IM_PICK.indexOf(h) >= 0 };
  });
  var counts = {};
  M.items.forEach(function (x) { counts[x.status || 'No status'] = (counts[x.status || 'No status'] || 0) + 1; });
  return { items: M.items.map(function (x) { return { code: x.code, name: x.name, status: x.status, values: x.values, pending: pend[norm_(x.code)] || null }; }),
    fields: fields, options: imOptions_(M), counts: counts, canApprove: imApprover_(ctx), canEdit: imCanEdit_(ctx), statuses: IM_STATUSES };
}

function itemSave_(ctx, d) {
  imNeedEdit_(ctx);
  var up = d.updates || {}, keys = Object.keys(up);
  if (!keys.length) throw new Error('Nothing changed.');
  return lock_(function () {
    var F = imFind_(str_(d.code)), M = F.M, it = F.it, changes = [];
    keys.forEach(function (k) {
      var c = M.head.indexOf(k);
      if (c < 0) throw new Error('The Item Master has no "' + k + '" column.');
      if (IM_LOCKED.indexOf(k) >= 0) throw new Error(k === 'Status' ? 'Active / Inactive goes for approval — use Request.' : k + ' cannot be changed here.');
      var nv = up[k], ov = it.values[k];
      if (IM_NUM.indexOf(k) >= 0 && str_(nv) !== '') { var n = Number(String(nv).replace(/,/g, '')); if (isNaN(n) || n < 0) throw new Error(k + ': enter a number.'); nv = n; }
      else nv = str_(nv);
      if (k === 'Item Name' && !nv) throw new Error('Item Name cannot be blank.');
      if (str_(ov) === str_(nv)) return;
      changes.push({ c: c, k: k, ov: ov, nv: nv });
    });
    if (!changes.length) return { message: 'Nothing changed.' };
    if (changes.some(function (x) { return x.k === 'Item Name'; })) {
      var nm = norm_(changes.filter(function (x) { return x.k === 'Item Name'; })[0].nv);
      if (M.items.some(function (x) { return x.row !== it.row && norm_(x.name) === nm; })) throw new Error('Another item already has that name.');
    }
    changes.forEach(function (x) { M.sh.getRange(it.row, x.c + 1).setValue(x.nv); });
    var txt = changes.map(function (x) { return x.k + ': ' + (str_(x.ov) || '—') + ' → ' + (str_(x.nv) || '—'); }).join('; ');
    imLog_(ctx, 'UPDATE', it, txt);
    log_(ctx, 'Item updated', it.code + ' · ' + txt);
    imDrop_();
    return { message: it.name + ' saved (' + changes.length + ' change' + (changes.length === 1 ? '' : 's') + ').' };
  });
}

function itemRequest_(ctx, d) {
  imNeedEdit_(ctx);
  var to = IM_STATUSES.filter(function (s) { return norm_(s) === norm_(d.to); })[0], reason = str_(d.reason);
  if (!to) throw new Error('Pick Active or Inactive.');
  if (!reason) throw new Error('Write why the item should be ' + to.toLowerCase() + '.');
  return lock_(function () {
    var F = imFind_(str_(d.code)), it = F.it;
    if (norm_(it.status) === norm_(to)) throw new Error(it.name + ' is already ' + to + '.');
    if (readObjs_(SH.ITEM_REQ).some(function (r) { return str_(r['Status']) === 'Pending' && norm_(r['Item Code']) === norm_(it.code); })) throw new Error(it.name + ' already has a request waiting for approval.');
    var id = nextId_(SH.ITEM_REQ, 'Request ID', 'IR-', 4), now = new Date();
    appendObjs_(SH.ITEM_REQ, [{ 'Request ID': id, 'Requested At': now, 'Item Code': it.code, 'Item Name': it.name, 'Change': 'Make ' + to.toLowerCase(),
      'From Status': it.status, 'To Status': to, 'Reason': reason, 'Requested By': ctx.name, 'Requested By ID': ctx.uid, 'Status': 'Pending' }]);
    log_(ctx, 'Item status request', id + ' · ' + it.code + ' → ' + to);
    bumpGen_('items');
    if (imApprover_(ctx)) return itemDecideNow_(ctx, id, 'APPROVED', '');
    return { id: id, message: 'Sent for approval (' + id + '): make ' + it.name + ' ' + to.toLowerCase() + '. MIS or a Director approves it.' };
  });
}

function itemRequests_(ctx) {
  imNeedEdit_(ctx);
  var mine = !imApprover_(ctx), since = addDays_(new Date(), -60);
  var L = readObjs_(SH.ITEM_REQ).filter(function (r) {
    if (mine && str_(r['Requested By ID']) !== ctx.uid) return false;
    return str_(r['Status']) === 'Pending' || !(r['Decided At'] instanceof Date) || r['Decided At'] >= since;
  }).map(itemReqOut_);
  L.sort(function (a, b) { return (a.status === 'Pending' ? 0 : 1) - (b.status === 'Pending' ? 0 : 1) || (a.atKey < b.atKey ? 1 : -1); });
  return { list: L, canApprove: imApprover_(ctx) };
}
function itemReqOut_(r) {
  var at = r['Requested At'], dAt = r['Decided At'];
  return { id: str_(r['Request ID']), code: str_(r['Item Code']), name: str_(r['Item Name']), from: str_(r['From Status']), to: str_(r['To Status']),
    reason: str_(r['Reason']), by: str_(r['Requested By']), byId: str_(r['Requested By ID']), status: str_(r['Status']),
    at: at instanceof Date ? fmt_(at, 'dd/MM/yyyy hh:mm a') : str_(at), atKey: at instanceof Date ? iso_(at) + fmt_(at, 'HHmmss') : '',
    decidedBy: str_(r['Decided By']), decidedAt: dAt instanceof Date ? fmt_(dAt, 'dd/MM/yyyy hh:mm a') : str_(dAt), remarks: str_(r['Remarks']) };
}

function itemDecide_(ctx, d) {
  if (!imApprover_(ctx)) throw new Error('Only MIS and the Directors approve item Active / Inactive requests.');
  var dec = /^approve/i.test(str_(d.decision)) ? 'APPROVED' : /^reject/i.test(str_(d.decision)) ? 'REJECTED' : '';
  if (!dec) throw new Error('Approve or reject.');
  if (dec === 'REJECTED' && !str_(d.remarks)) throw new Error('Write why it is rejected.');
  return lock_(function () { return itemDecideNow_(ctx, str_(d.id), dec, str_(d.remarks)); });
}
function itemDecideNow_(ctx, id, dec, remarks) {
  var r = readObjs_(SH.ITEM_REQ).filter(function (x) { return str_(x['Request ID']) === id; })[0];
  if (!r) throw new Error('Request ' + id + ' was not found — refresh.');
  if (str_(r['Status']) !== 'Pending') throw new Error(id + ' was already ' + str_(r['Status']).toLowerCase() + '.');
  var to = str_(r['To Status']), name = str_(r['Item Name']);
  if (dec === 'APPROVED') {
    var F = imFind_(str_(r['Item Code'])), c = F.M.head.indexOf('Status');
    F.M.sh.getRange(F.it.row, c + 1).setValue(to);
    imLog_(ctx, 'STATUS', F.it, F.it.status + ' → ' + to + ' (' + id + ', asked by ' + str_(r['Requested By']) + ': ' + str_(r['Reason']) + ')');
    imDrop_();
  }
  updateObj_(SH.ITEM_REQ, r._row, { 'Status': dec === 'APPROVED' ? 'Approved' : 'Rejected', 'Decided By': ctx.name, 'Decided At': new Date(), 'Remarks': remarks });
  bumpGen_('items');
  log_(ctx, 'Item status ' + (dec === 'APPROVED' ? 'approved' : 'rejected'), id + ' · ' + str_(r['Item Code']) + ' → ' + to);
  return { id: id, message: dec === 'APPROVED' ? name + ' is now ' + to + (to === 'Active' ? ' — the outlets can order it.' : ' — the outlets cannot order it any more.') : id + ' rejected.' };
}

function imStoreOutlet_() {
  var o = outletById_(set_('Store GRN Outlet', 'OUT-008'));
  if (!o) throw new Error('Settings ▸ Store GRN Outlet is not an outlet ID.');
  return o;
}
function itemGrnSave_(ctx, d) {
  imNeedEdit_(ctx);
  var party = str_(d.supplier), billNo = str_(d.billNo), date = isoToDate_(d.date) || new Date();
  if (!party) throw new Error('Pick the supplier.');
  if (setYes_('Stock Bill Number Required') && !billNo) throw new Error('Enter the bill number.');
  if (setYes_('Stock Bill Image Required') && !str_(d.billFileId)) throw new Error('Attach a photo of the bill.');
  if (iso_(date) > todayIso_()) throw new Error('The GRN date cannot be in the future.');
  var M = imRead_(true), byCode = {};
  M.items.forEach(function (x) { byCode[norm_(x.code)] = x; });
  var probs = [], lines = (d.lines || []).filter(function (l) { return l && str_(l.code); }).map(function (l, i) {
    var it = byCode[norm_(l.code)], qty = num_(l.qty), rate = num_(l.rate);
    if (!it) { probs.push('Line ' + (i + 1) + ': ' + str_(l.code) + ' is not in the Item Master.'); return null; }
    if (!(qty > 0)) probs.push(it.name + ': enter the quantity received.');
    if (rate < 0) probs.push(it.name + ': the rate cannot be negative.');
    return { it: it, qty: qty, rate: rate, remarks: str_(l.remarks) };
  });
  if (!lines.length) throw new Error('Add at least one item.');
  if (probs.length) throw new Error(probs.join('\n'));
  var o = imStoreOutlet_();
  return lock_(function () {
    var grn = nextId_(SH.STOCK_REG, 'GRN No', 'SGRN' + fmt_(new Date(), 'yyMM'), 4);
    var ids = nextIds_(SH.STOCK_REG, 'Entry ID', 'SR' + fmt_(new Date(), 'MMyy'), 4, lines.length), now = new Date(), total = 0;
    var out = lines.map(function (l, i) {
      var v = l.it.values, amt = l.rate ? round_(l.qty * l.rate, 2) : '';
      if (amt) total += amt;
      return { 'Entry ID': ids[i], 'Date': date, 'Outlet ID': o.id, 'Outlet': o.name, 'Category': str_(v['Category']), 'Item': l.it.name,
        'Party Name': party, 'Qty': l.qty, 'Unit': str_(v['Unit']), 'Rate': l.rate || '', 'Amount': amt, 'Bill Number': billNo,
        'Bill URL': str_(d.billFileId) ? driveUrl_(d.billFileId) : '', 'Bill File ID': str_(d.billFileId), 'Remarks': [l.remarks, str_(d.remarks)].filter(Boolean).join(' · '),
        'Entered By': ctx.uid, 'Entered By Name': ctx.name, 'Timestamp': now, 'GRN No': grn, 'Item Code': l.it.code, 'Source': 'Item Master' };
    });
    appendObjs_(SH.STOCK_REG, out);
    log_(ctx, 'Store GRN', grn + ' · ' + party + ' · ' + out.length + ' items');
    bumpGen_('items');
    return { grn: grn, message: grn + ' saved: ' + out.length + ' item' + (out.length === 1 ? '' : 's') + (total ? ' · ₹' + round_(total, 2) : '') + '.' };
  });
}
function itemGrns_(ctx, d) {
  imNeedEdit_(ctx);
  var o = imStoreOutlet_(), from = str_(d.from) || iso_(addDays_(new Date(), -30)), to = str_(d.to) || todayIso_(), G = {}, order = [];
  readObjs_(SH.STOCK_REG).forEach(function (r) {
    if (str_(r['Outlet ID']) !== o.id || !str_(r['GRN No'])) return;
    var k = iso_(r['Date']); if (!k || k < from || k > to) return;
    var no = str_(r['GRN No']), g = G[no];
    if (!g) { g = G[no] = { no: no, date: fmt_(r['Date']), dateKey: k, supplier: str_(r['Party Name']), billNo: str_(r['Bill Number']), fileId: str_(r['Bill File ID']), entry: str_(r['Entry ID']), by: str_(r['Entered By Name']), lines: [], amount: 0 }; order.push(no); }
    g.lines.push({ code: str_(r['Item Code']), name: str_(r['Item']), qty: num_(r['Qty']), unit: str_(r['Unit']), rate: num_(r['Rate']), amount: num_(r['Amount']), remarks: str_(r['Remarks']) });
    g.amount += num_(r['Amount']);
  });
  var list = order.map(function (k) { G[k].amount = round_(G[k].amount, 2); return G[k]; }).sort(function (a, b) { return a.dateKey === b.dateKey ? (a.no < b.no ? 1 : -1) : (a.dateKey < b.dateKey ? 1 : -1); });
  return { from: from, to: to, list: list, total: round_(list.reduce(function (s, g) { return s + g.amount; }, 0), 2) };
}
function itemGrnMeta_(ctx) {
  imNeedEdit_(ctx);
  var M = imRead_(), sup = {};
  try { imSS_().getSheetByName('_Lists').getRange('A1:A200').getValues().forEach(function (r) { if (str_(r[0])) sup[str_(r[0])] = 1; }); } catch (e) {}
  M.items.forEach(function (x) { list_(x.values['Suppliers']).forEach(function (s) { if (s) sup[s] = 1; }); });
  return { items: M.items.map(function (x) { var v = x.values; return { code: x.code, name: x.name, status: x.status, unit: str_(v['Unit']), category: str_(v['Category']), rate: num_(v['Cost Price']), supplier: str_(v['Suppliers']) }; }),
    suppliers: Object.keys(sup).sort(), billRequired: setYes_('Stock Bill Image Required'), billNoRequired: setYes_('Stock Bill Number Required'), outlet: imStoreOutlet_().name };
}

function ndSS_() { var id = setRaw_('Item Not Dispatch Sheet ID'); if (!id) throw new Error('Settings ▸ Item Not Dispatch Sheet ID is empty.'); return extSS_(id); }
function ndTab_() { var sh = ndSS_().getSheetByName(set_('Item Not Dispatch Tab', 'Item Not Dispatch')); if (!sh) throw new Error('The Item Not Dispatch sheet has no "' + set_('Item Not Dispatch Tab', 'Item Not Dispatch') + '" tab.'); return sh; }
function ndReasons_() {
  try {
    var sh = ndSS_().getSheetByName('Reason Master');
    if (sh && sh.getLastRow() > 1) return sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function (r) { return str_(r[0]); }).filter(String);
  } catch (e) {}
  return ['Out of Stock', 'Short Supply (Partial)', 'Quality Issue', 'Damaged / Expired', 'Vendor Delay', 'Item Discontinued', 'Rate / Price Issue', 'Wrong Item Code', 'Outlet Cancelled', 'Other'];
}
function ndRows_(orderNos) {
  var sh = ndTab_(), last = sh.getLastRow(), lc = sh.getLastColumn(), want = {};
  orderNos.forEach(function (n) { want[str_(n)] = 1; });
  var head = sh.getRange(1, 1, 1, lc).getValues()[0].map(str_), out = [];
  if (last < 2) return { sh: sh, head: head, rows: out };
  var c = function (n) { return head.indexOf(n); }, iNo = c('Order No');
  if (iNo < 0) throw new Error('The Item Not Dispatch tab has no "Order No" column.');
  sh.getRange(2, 1, last - 1, lc).getValues().forEach(function (r, i) {
    var no = str_(r[iNo]); if (!want[no]) return;
    out.push({ row: i + 2, orderNo: no, code: str_(r[c('Item Code')]), name: str_(r[c('Item Name')]), notQty: num_(r[c('Not Dispatched Qty')]),
      reason: str_(r[c('Reason')]), remark: str_(r[c('Remark')]) });
  });
  return { sh: sh, head: head, rows: out };
}
function ndKey_(orderNo, code, name) { return str_(orderNo) + '|' + (code ? 'C' + norm_(code) : 'N' + norm_(name)); }
function ndIndex_(orderNos) {
  var idx = {};
  try { ndRows_(orderNos).rows.forEach(function (r) { idx[ndKey_(r.orderNo, r.code, '')] = r; idx[ndKey_(r.orderNo, '', r.name)] = r; }); } catch (e) {}
  return idx;
}
function ndCheck_(rows) {
  var miss = rows.filter(function (r) { return r.short && !str_(r.reason); }).map(function (r) { return r.name; });
  if (miss.length) throw new Error('Pick the reason for the items not dispatched in full: ' + miss.join(', ') + '.');
}
function ndSync_(ctx, order, rows) {
  var N = ndRows_([order.orderNo]), sh = N.sh, head = N.head, now = new Date(), added = 0, changed = 0, removed = 0, audit = [];
  var have = {};
  N.rows.forEach(function (r) { have[ndKey_(r.orderNo, r.code, '')] = r; have[ndKey_(r.orderNo, '', r.name)] = r; });
  var dels = [];
  rows.forEach(function (r) {
    var ex = have[ndKey_(order.orderNo, r.code, '')] || have[ndKey_(order.orderNo, '', r.name)];
    if (r.dispatch === '') return;
    var notQty = round_(Math.max(0, r.ordered - r.dispatch), 3);
    if (notQty <= 0) { if (ex) { dels.push(ex.row); removed++; audit.push(['DELETE', r, r.ordered, 0, ex.reason, 'Dispatched in full']); } return; }
    var obj = { 'Order No': order.orderNo, 'Order Date': order.timestamp, 'Outlet Name': order.outletFullName, 'Item Code': r.code, 'Item Name': r.name, 'Unit': r.unit,
      'Ordered Qty': r.ordered, 'Not Dispatched Qty': notQty, 'Dispatched Qty': r.dispatch, 'Reason': str_(r.reason), 'Remark': str_(r.remark),
      'Recorded By': ctx.name, 'Recorded By ID': ctx.uid, 'Last Updated': now };
    if (ex) {
      if (ex.notQty === notQty && ex.reason === obj.Reason && ex.remark === obj.Remark) return;
      head.forEach(function (h, j) { if (obj.hasOwnProperty(h) && h !== 'Order Date') sh.getRange(ex.row, j + 1).setValue(obj[h]); });
      changed++; audit.push(['UPDATE', r, r.ordered, notQty, obj.Reason, obj.Remark]);
    } else {
      obj['Entry ID'] = 'ND' + fmt_(now, 'yyMMddHHmmss') + '-' + (1000 + Math.floor(Math.random() * 9000));
      obj['Timestamp'] = now;
      sh.appendRow(head.map(function (h) { return obj.hasOwnProperty(h) ? obj[h] : ''; }));
      added++; audit.push(['ADD', r, r.ordered, notQty, obj.Reason, obj.Remark]);
    }
  });
  dels.sort(function (a, b) { return b - a; }).forEach(function (row) { sh.deleteRow(row); });
  try {
    var al = ndSS_().getSheetByName('ND Audit Log');
    if (al) audit.forEach(function (a) { al.appendRow([now, a[0], order.orderNo, a[1].code, a[1].name, a[2], a[3], a[4], a[5], ctx.name]); });
  } catch (e) {}
  if (audit.length) { try { bumpGen_('data'); } catch (e) {} }
  return { added: added, changed: changed, removed: removed };
}
