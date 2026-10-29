/*************************************************************************
 *  Money.gs
 *    · Expense Records — outlet expenses with a bill photo, month view.
 *    · DSR — the Daily Sales Report, written straight into the outlet's tab
 *      of the Outlet Wise DSR workbook (same columns, same newest-first
 *      order, same "Avg Sale Per Order Till Date" recalculation), so the
 *      old DSR app and every report keep working.
 *************************************************************************/

/* ============================ EXPENSES ============================ */
function expMeta_(ctx) {
  return { categories: readObjs_(SH.EXP_CATS).filter(function (r) { return str_(r['Category']) && !/inactive|^no$/i.test(str_(r['Status'])); })
      .map(function (r) { return str_(r['Category']); }),
    modes: PAYMENT_MODES, billAbove: setRaw_('Expense Bill Required Above') };
}

function expSave_(ctx, d) {
  var o = pickOutlet_(ctx, d.outletId);
  var amt = num_(d.amount);
  if (amt <= 0) throw new Error('Enter the amount.');
  if (!str_(d.category)) throw new Error('Pick a category.');
  if (!str_(d.desc)) throw new Error('Write what the expense was for.');
  var date = isoToDate_(d.date) || new Date();
  if (iso_(date) > todayIso_()) throw new Error('The date cannot be in the future.');
  var lim = setRaw_('Expense Bill Required Above');
  if (lim !== '' && amt > num_(lim) && !str_(d.fileId)) throw new Error('A bill photo is required for expenses above ₹' + num_(lim) + '.');
  return lock_(function () {
    var id = nextId_(SH.EXPENSES, 'Expense ID', 'EXP-' + fmt_(date, 'yyMM') + '-', 4);
    appendObj_(SH.EXPENSES, { 'Expense ID': id, 'Date': date, 'Outlet ID': o.id, 'Outlet': o.name, 'Category': str_(d.category),
      'Description': str_(d.desc), 'Paid To': str_(d.paidTo), 'Amount': amt, 'Payment Mode': str_(d.mode) || 'Cash',
      'Bill Number': str_(d.billNo), 'Bill URL': str_(d.fileId) ? driveUrl_(d.fileId) : '', 'Bill File ID': str_(d.fileId),
      'Entered By': ctx.uid, 'Entered By Name': ctx.name, 'Timestamp': new Date(), 'Status': 'Recorded' });
    log_(ctx, 'Expense', id + ' ₹' + amt);
    return { message: 'Expense ' + id + ' saved (₹' + amt + ').', id: id };
  });
}

function expList_(ctx, d) {
  var ids = outletsFor_(ctx, d.outletId).map(function (o) { return o.id; });
  var month = str_(d.month) || fmt_(new Date(), 'yyyy-MM');
  var rows = readObjs_(SH.EXPENSES).filter(function (r) {
    return ids.indexOf(str_(r['Outlet ID'])) >= 0 && fmt_(r['Date'], 'yyyy-MM') === month && !/deleted/i.test(str_(r['Status']));
  }).map(function (r) {
    return { id: str_(r['Expense ID']), date: fmt_(r['Date']), dateKey: iso_(r['Date']), outlet: str_(r['Outlet']),
      category: str_(r['Category']), desc: str_(r['Description']), paidTo: str_(r['Paid To']), amount: num_(r['Amount']),
      mode: str_(r['Payment Mode']), billNo: str_(r['Bill Number']), fileId: str_(r['Bill File ID']), by: str_(r['Entered By Name']) };
  }).sort(function (a, b) { return b.dateKey.localeCompare(a.dateKey) || b.id.localeCompare(a.id); });
  var byCat = {}, byMode = {}, total = 0;
  rows.forEach(function (r) { total += r.amount; byCat[r.category] = (byCat[r.category] || 0) + r.amount; byMode[r.mode] = (byMode[r.mode] || 0) + r.amount; });
  function arr(m) { return Object.keys(m).map(function (k) { return { name: k, amount: round_(m[k], 2) }; }).sort(function (a, b) { return b.amount - a.amount; }); }
  return { month: month, rows: rows, total: round_(total, 2), byCategory: arr(byCat), byMode: arr(byMode) };
}

/* ============================ DSR ============================ */
function dsrCols_(o) {
  return DSR_COLUMNS.filter(function (c) { return !c.outlets || c.outlets.indexOf(o.dsrTab) >= 0 || c.outlets.indexOf(o.name) >= 0; });
}
function dsrSheet_(o) {
  if (!o.dsrTab) throw new Error(o.name + ' has no DSR tab (set "DSR Tab" on the Outlets sheet).');
  var sh = extSS_(set_('DSR Sheet ID')).getSheetByName(o.dsrTab);
  if (!sh) throw new Error('The DSR workbook has no tab named "' + o.dsrTab + '".');
  return sh;
}
function dsrKey_(v) {
  if (v instanceof Date) return iso_(v);
  var s = str_(v); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  return m ? m[3] + '-' + pad_(m[2], 2) + '-' + pad_(m[1], 2) : '';
}

function dsrForm_(ctx, d) {
  var o = pickOutlet_(ctx, d.outletId);
  var cols = dsrCols_(o);
  var date = str_(d.date) || iso_(addDays_(new Date(), -1));
  var sh = dsrSheet_(o), lc = sh.getLastColumn(), lr = sh.getLastRow();
  var H = sh.getRange(1, 1, 1, lc).getValues()[0].map(str_);
  var values = null, recent = [];
  if (lr > 1) {
    var data = sh.getRange(2, 1, Math.min(lr - 1, 400), lc).getValues();
    var di = col_(H, ['Date']);
    data.forEach(function (r, i) {
      var k = dsrKey_(r[di]); if (!k) return;
      var rec = {}; cols.forEach(function (c) { var j = H.indexOf(c.header); rec[c.key] = j >= 0 ? r[j] : ''; });
      rec.dateText = fmt_(isoToDate_(k)); rec.dateKey = k;
      if (k === date) values = rec;
      if (recent.length < 10) recent.push(rec);
    });
  }
  function clean(r) {
    var o2 = {}; Object.keys(r || {}).forEach(function (k) { o2[k] = r[k] instanceof Date ? fmt_(r[k], 'dd/MM/yyyy hh:mm a') : r[k]; }); return o2;
  }
  return { outletId: o.id, outlet: o.name, date: date, columns: cols, values: values ? clean(values) : null,
    recent: recent.map(clean), reedit: setYes_('DSR Allow Re-edit'), declaration: DSR_DECLARATION, minDate: iso_(addDays_(new Date(), -45)) };
}

function dsrSubmit_(ctx, d) {
  var o = pickOutlet_(ctx, d.outletId);
  var cols = dsrCols_(o), v = d.values || {};
  var date = str_(d.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Pick the report date.');
  if (date > todayIso_()) throw new Error('The report date cannot be in the future.');
  if (date < iso_(addDays_(new Date(), -45))) throw new Error('That date is too old — ask MIS to correct it in the sheet.');
  if (!(d.declaration === true || d.declaration === 'true')) throw new Error('Tick the self-declaration to submit.');
  var missing = cols.filter(function (c) { return c.required && c.input && (str_(v[c.key]) === '' || isNaN(Number(v[c.key]))); })
    .map(function (c) { return c.header; });
  if (missing.length) throw new Error('Please fill: ' + missing.join(', '));

  var vals = {};
  cols.forEach(function (c) {
    if (c.key === 'date') vals[c.key] = isoToDate_(date);
    else if (c.key === 'submittedBy') vals[c.key] = ctx.name.toUpperCase();
    else if (c.key === 'lastUpdated') vals[c.key] = new Date();
    else if (c.key === 'declaration') vals[c.key] = true;
    else if (c.input) vals[c.key] = Math.max(0, Number(v[c.key]) || 0);
  });
  cols.forEach(function (c) { if (c.sumOf) vals[c.key] = round_(c.sumOf.reduce(function (s, k) { return s + (Number(vals[k]) || 0); }, 0), 2); });
  vals.avgSalePerOrder = vals.totalOrders > 0 ? round_(vals.totalSales / vals.totalOrders, 2) : 0;

  var sh = dsrSheet_(o);
  return lock_(function () {
    var lc = sh.getLastColumn(), lr = sh.getLastRow();
    var H = sh.getRange(1, 1, 1, lc).getValues()[0].map(str_);
    var di = col_(H, ['Date']);
    if (di < 0) throw new Error('The DSR tab has no "Date" column.');
    var existing = -1;
    if (lr > 1) {
      var dv = sh.getRange(2, di + 1, lr - 1, 1).getValues();
      for (var i = 0; i < dv.length; i++) if (dsrKey_(dv[i][0]) === date) { existing = i + 2; break; }
    }
    if (existing > 0 && !setYes_('DSR Allow Re-edit')) throw new Error('The report for ' + fmt_(isoToDate_(date)) + ' is already submitted.');
    var row = existing > 0 ? sh.getRange(existing, 1, 1, lc).getValues()[0] : H.map(function () { return ''; });
    cols.forEach(function (c) { var j = H.indexOf(c.header); if (j >= 0 && vals.hasOwnProperty(c.key)) row[j] = vals[c.key]; });
    if (existing > 0) sh.getRange(existing, 1, 1, lc).setValues([row]);
    else { sh.insertRowBefore(2); sh.getRange(2, 1, 1, lc).setValues([row]); }
    dsrFormatRow_(sh, existing > 0 ? existing : 2, H, cols);
    lr = sh.getLastRow();
    if (lr > 2) sh.getRange(2, 1, lr - 1, lc).sort({ column: di + 1, ascending: false });
    dsrRecalc_(sh, H);
    log_(ctx, 'DSR', o.name + ' ' + date + ' · ₹' + vals.totalSales);
    return { message: (existing > 0 ? 'Updated ' : 'Saved ') + 'the DSR for ' + fmt_(isoToDate_(date)) + ' · Total sales ₹' + vals.totalSales };
  });
}

function dsrFormatRow_(sh, r, H, cols) {
  cols.forEach(function (c) {
    var j = H.indexOf(c.header); if (j < 0) return;
    var cell = sh.getRange(r, j + 1);
    if (c.type === 'date') cell.setNumberFormat('dd/mm/yyyy');
    else if (c.type === 'datetime') cell.setNumberFormat('dd/mm/yyyy hh:mm');
    else if (c.type === 'currency') cell.setNumberFormat('₹ #,##0.00');
  });
}

/** Same as the DSR app: daily avg and cumulative "till date" avg, walking oldest → newest. */
function dsrRecalc_(sh, H) {
  var lr = sh.getLastRow(); if (lr < 2) return;
  var s = H.indexOf('Total Sales'), o = H.indexOf('Total No. of Orders'), a = H.indexOf('Avg Sale Per Order'), t = H.indexOf('Avg Sale Per Order Till Date');
  if (s < 0 || o < 0) return;
  var n = lr - 1;
  var S = sh.getRange(2, s + 1, n, 1).getValues(), O = sh.getRange(2, o + 1, n, 1).getValues();
  var daily = [], till = [], cs = 0, co = 0;
  for (var i = n - 1; i >= 0; i--) {
    var sv = Number(S[i][0]) || 0, ov = Number(O[i][0]) || 0;
    daily[i] = [ov > 0 ? round_(sv / ov, 2) : 0];
    cs += sv; co += ov;
    till[i] = [co > 0 ? round_(cs / co, 2) : 0];
  }
  if (a >= 0) sh.getRange(2, a + 1, n, 1).setValues(daily).setNumberFormat('₹ #,##0.00');
  if (t >= 0) sh.getRange(2, t + 1, n, 1).setValues(till).setNumberFormat('₹ #,##0.00');
}
