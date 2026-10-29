/*************************************************************************
 *  Grn.gs — what actually arrived.
 *    · Order GRN  : against a GFP order of the outlet (Outlet Orders workbook
 *                   is read-only here). Numbering GRN + short code + MMYY + 0001,
 *                   the same as the Stock Register & Vegetable app.
 *    · Vegetables : received weight + rate against a vegetable order (Orders.gs)
 *    · Stock register : bill entry (Orders.gs)
 *************************************************************************/

function grnOrders_(ctx, d) {
  var h = ordHistory_(ctx, { outletId: d.outletId });
  var q = str_(d.q).toLowerCase();
  var list = h.orders.filter(function (o) {
    if (q && (o.no + ' ' + o.outlet).toLowerCase().indexOf(q) < 0) return false;
    return !/rejected/i.test(o.status);
  });
  return { orders: list, pending: list.filter(function (o) { return !o.grn; }).length };
}

function grnLoad_(ctx, d) {
  var g = ordLines_(ctx, { orderNo: d.orderNo });
  var done = grnDoneMap_();
  var outs = outletsFor_(ctx, 'ALL');
  var og = ordRecent_().filter(function (x) { return x.no === g.no; })[0];
  var o = outs.filter(function (x) { return orderBelongs_(x, g.no, og ? og.outletCell : ''); })[0];
  return {
    orderNo: g.no, outletId: o ? o.id : '', outlet: o ? o.name : '', orderDate: g.date, status: g.status, by: g.by,
    already: done[g.no] || '',
    lines: g.lines.map(function (l) {
      var sent = (l.dispatch !== null && l.dispatch !== undefined) ? l.dispatch : l.qty;
      return { code: l.code, name: l.name, unit: l.unit, ordered: l.qty, dispatched: l.dispatch, received: sent, remarks: '' };
    })
  };
}

function grnSave_(ctx, d) {
  var info = grnLoad_(ctx, { orderNo: d.orderNo });
  if (!info.outletId) throw new Error('Could not work out the outlet of this order.');
  if (ctx.outlets.indexOf(info.outletId) < 0) throw new Error('That order belongs to another outlet.');
  if (info.already) throw new Error('Order ' + info.orderNo + ' already has GRN ' + info.already + '.');
  var o = outletById_(info.outletId);
  var byCode = {};
  info.lines.forEach(function (l) { byCode[(l.code || l.name).toUpperCase()] = l; });
  var lines = (d.lines || []).map(function (x) {
    var l = byCode[str_(x.code || x.name).toUpperCase()];
    if (!l) throw new Error(str_(x.name) + ' is not on order ' + info.orderNo + '.');
    var rec = num_(x.received);
    if (rec < 0) throw new Error(l.name + ': received cannot be negative.');
    return { code: l.code, name: l.name, unit: l.unit, ordered: l.ordered, received: rec, remarks: str_(x.remarks) };
  });
  if (!lines.length) throw new Error('No lines to save.');
  var grnDate = isoToDate_(d.grnDate) || new Date();

  return lock_(function () {
    if (grnDoneMap_()[info.orderNo]) throw new Error('This order was just received by someone else.');
    var no = nextId_(SH.GRN, 'GRN No', 'GRN' + (o.short || 'XX') + fmt_(new Date(), 'MMyy'), 4);
    var now = new Date(), tO = 0, tR = 0, short = 0;
    var rows = lines.map(function (l, i) {
      var s = round_(Math.max(0, l.ordered - l.received), 3);
      tO += l.ordered; tR += l.received; short += s;
      return { 'GRN No': no, 'Seq': i + 1, 'Order No': info.orderNo, 'Item Code': l.code, 'Item Name': l.name, 'Unit': l.unit,
        'Ordered Qty': l.ordered, 'Received Qty': l.received, 'Short Qty': s, 'Remarks': l.remarks };
    });
    appendObjs_(SH.GRN_LINES, rows);
    appendObj_(SH.GRN, { 'GRN No': no, 'GRN Date': grnDate, 'Order No': info.orderNo, 'Outlet ID': o.id, 'Outlet': o.name,
      'Received From': 'GFP', 'Lines': rows.length, 'Total Ordered': round_(tO, 3), 'Total Received': round_(tR, 3),
      'Short': round_(short, 3), 'Remarks': str_(d.remarks), 'Entered By': ctx.uid, 'Entered By Name': ctx.name, 'Timestamp': now });
    log_(ctx, 'Order GRN', no + ' for ' + info.orderNo);
    return { message: 'GRN ' + no + ' saved' + (short ? ' · short ' + round_(short, 3) : '') + '.', grnNo: no };
  });
}

function grnHistory_(ctx, d) {
  var ids = outletsFor_(ctx, d.outletId).map(function (o) { return o.id; });
  var from = str_(d.from), to = str_(d.to);
  var list = readObjs_(SH.GRN).filter(function (r) {
    if (ids.indexOf(str_(r['Outlet ID'])) < 0) return false;
    var k = iso_(r['GRN Date']); return (!from || k >= from) && (!to || k <= to);
  }).map(function (r) {
    return { no: str_(r['GRN No']), date: fmt_(r['GRN Date']), orderNo: str_(r['Order No']), outlet: str_(r['Outlet']),
      lines: num_(r['Lines']), ordered: num_(r['Total Ordered']), received: num_(r['Total Received']), short: num_(r['Short']),
      by: str_(r['Entered By Name']), remarks: str_(r['Remarks']) };
  }).reverse();
  return { rows: list.slice(0, 200) };
}

function grnLines_(ctx, d) {
  var no = str_(d.grnNo);
  var head = findObj_(SH.GRN, 'GRN No', no);
  if (!head || ctx.outlets.indexOf(str_(head['Outlet ID'])) < 0) throw new Error('GRN not found.');
  return { no: no, lines: readObjs_(SH.GRN_LINES).filter(function (r) { return str_(r['GRN No']) === no; }).map(function (r) {
    return { code: str_(r['Item Code']), name: str_(r['Item Name']), unit: str_(r['Unit']), ordered: num_(r['Ordered Qty']),
      received: num_(r['Received Qty']), short: num_(r['Short Qty']), remarks: str_(r['Remarks']) };
  }) };
}
