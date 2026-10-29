/*************************************************************************
 *  Files.gs — photos, bills, certificates and documents.
 *  Upload: the page shrinks photos before sending (camera or gallery),
 *  the file is saved under  <Drive Folder Name>/<section>.
 *  View:   files are opened THROUGH the app (the record is checked first),
 *  so nobody needs Drive access and private documents stay private.
 *************************************************************************/

var UPLOAD_FOLDERS = { cert: 'Certificates', bill: 'Bills', checklist: 'Checklist Photos', task: 'Task Attachments',
  vault: 'Vault Documents', expense: 'Expense Bills', reimb: 'Reimbursement Bills', prep: 'Prep Kitchen Photos', ticket: 'Ticket Photos', general: 'Other' };

function fileUpload_(ctx, d) {
  var b64 = str_(d.data);
  if (!b64) throw new Error('No file received.');
  var maxMb = setNum_('Max Upload MB', 10);
  var bytes = Math.ceil(b64.length * 3 / 4);
  if (bytes > maxMb * 1048576) throw new Error('That file is ' + round_(bytes / 1048576, 1) + ' MB — the limit is ' + maxMb + ' MB.');
  var mime = str_(d.mime) || 'image/jpeg';
  var okMime = mime.indexOf('image/') === 0 || mime === 'application/pdf' ||
    /officedocument|msword|ms-excel|text\/plain/.test(mime);
  if (!okMime) throw new Error('Only photos, PDF and Office documents can be attached.');
  var mod = UPLOAD_FOLDERS[str_(d.module)] ? str_(d.module) : 'general';
  var base = str_(d.name).replace(/[\\\/:*?"<>|]+/g, '-').substring(0, 80) || 'file';
  var name = fmt_(new Date(), 'yyyy-MM-dd HH.mm.ss') + ' ' + ctx.name + ' ' + base;
  var dest = folder_(UPLOAD_FOLDERS[mod]);
  if (mod === 'reimb') {                     // same place the Loan & Advance form files bills
    name = 'Bill_' + (ctx.empId || ctx.uid) + '_' + fmt_(new Date(), 'yyyyMMdd_HHmmss') + '_' + base;
    try { var la = DriveApp.getFolderById(set_('Loan & Advance Drive Folder ID')), it = la.getFoldersByName('Reimbursement Bills'); dest = it.hasNext() ? it.next() : la.createFolder('Reimbursement Bills'); } catch (e) {}
  }
  var file = dest.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, name));
  if (mod === 'checklist' || mod === 'bill' || mod === 'expense' || mod === 'reimb' || mod === 'prep' || mod === 'ticket') {
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  }
  return { fileId: file.getId(), url: file.getUrl(), name: base, mime: mime,
    thumb: mime.indexOf('image/') === 0 ? driveThumb_(file.getId()) : '' };
}

/** d = { module, id } — the record decides whether this person may see the file. */
function fileView_(ctx, d) {
  var mod = str_(d.module), id = str_(d.id), fileId = '', name = '';
  function outletOk(oid) { return ctx.outlets.indexOf(str_(oid)) >= 0; }
  if (mod === 'cert') {
    var c = findObj_(SH.CERTS, 'Certificate ID', id);
    if (!c || !outletOk(c['Outlet ID']) || !can_(ctx, 'certificates')) throw new Error('Not allowed.');
    fileId = str_(c['File ID']); name = str_(c['Certificate Name']);
  } else if (mod === 'stock') {
    var s = findObj_(SH.STOCK_REG, 'Entry ID', id);
    if (!s || !outletOk(s['Outlet ID'])) throw new Error('Not allowed.');
    fileId = str_(s['Bill File ID']); name = 'Bill ' + str_(s['Bill Number']);
  } else if (mod === 'exp') {
    var x = findObj_(SH.EXPENSES, 'Expense ID', id);
    if (!x || !outletOk(x['Outlet ID'])) throw new Error('Not allowed.');
    fileId = str_(x['Bill File ID']); name = 'Bill ' + str_(x['Bill Number']);
  } else if (mod === 'veg') {
    var v = readObjs_(SH.VEG_ORDERS).filter(function (r) { return str_(r['Order ID']) === id && str_(r['Bill File ID']); })[0];
    if (!v || !outletOk(v['Outlet ID'])) throw new Error('Not allowed.');
    fileId = str_(v['Bill File ID']); name = 'Bill ' + str_(v['Bill Number']);
  } else if (mod === 'task') {
    var t = findObj_(SH.TASKS, 'Task ID', id);
    if (!t || (str_(t['Assigned To']) !== ctx.uid && str_(t['Assigned By']) !== ctx.uid && !ctx.super && !dirIs_(ctx) && !dlgIsApprover_(ctx))) throw new Error('Not allowed.');
    fileId = str_(t['Attachment ID']); name = str_(t['Title']);
  } else if (mod === 'empch') {
    var cf = empChangeFile_(ctx, id);
    fileId = emFileId_(cf.url); name = cf.name;
  } else if (mod === 'vault') {
    var it = findObj_(SH.VAULT, 'Item ID', id);
    if (!it || !(vaultSharedWith_(ctx, it) || can_(ctx, 'vault_admin'))) throw new Error('Not allowed.');
    fileId = str_(it['File ID']); name = str_(it['File Name']) || str_(it['Title']);
    log_(ctx, 'Vault document opened', id);
  } else throw new Error('Unknown file.');
  if (!fileId) throw new Error('No file is attached.');
  var f = DriveApp.getFileById(fileId), blob = f.getBlob(), size = f.getSize();
  var out = { name: name || f.getName(), mime: blob.getContentType(), size: size, url: f.getUrl() };
  if (size <= 7 * 1048576) out.data = Utilities.base64Encode(blob.getBytes());
  return out;
}

/* ============================ CERTIFICATES ============================ */
function certObj_(r) {
  var warn = setNum_('Certificate Warning Days', 30), exp = parseAny_(r['Expiry Date']), st = 'No Expiry', left = '';
  if (exp) {
    left = Math.round((isoToDate_(iso_(exp)) - isoToDate_(todayIso_())) / 86400000);
    st = left < 0 ? 'Expired' : left <= warn ? 'Expiring Soon' : 'Valid';
  }
  return { id: str_(r['Certificate ID']), outletId: str_(r['Outlet ID']), outlet: str_(r['Outlet']), name: str_(r['Certificate Name']),
    number: str_(r['Certificate Number']), date: iso_(r['Certificate Date']), dateText: fmt_(r['Certificate Date']),
    expiry: iso_(r['Expiry Date']), expiryText: fmt_(r['Expiry Date']), fileId: str_(r['File ID']), fileName: str_(r['File Name']),
    mime: str_(r['Mime']), by: str_(r['Uploaded By Name']), at: fmt_(r['Uploaded At'], 'dd/MM/yyyy'), remarks: str_(r['Remarks']),
    status: st, daysLeft: left };
}
function certList_(ctx, d) {
  var ids = outletsFor_(ctx, d.outletId).map(function (o) { return o.id; });
  var list = readObjs_(SH.CERTS).filter(function (r) { return ids.indexOf(str_(r['Outlet ID'])) >= 0 && !/deleted/i.test(str_(r['Status'])); })
    .map(certObj_);
  var rank = { 'Expired': 0, 'Expiring Soon': 1, 'Valid': 2, 'No Expiry': 3 };
  list.sort(function (a, b) { return rank[a.status] - rank[b.status] || String(a.expiry).localeCompare(String(b.expiry)) || a.name.localeCompare(b.name); });
  return { rows: list, warnDays: setNum_('Certificate Warning Days', 30) };
}
function certSave_(ctx, d) {
  var name = str_(d.name);
  if (!name) throw new Error('Enter the certificate name.');
  var id = str_(d.id);
  return lock_(function () {
    var now = new Date();
    if (id) {
      var r = findObj_(SH.CERTS, 'Certificate ID', id);
      if (!r || ctx.outlets.indexOf(str_(r['Outlet ID'])) < 0) throw new Error('Certificate not found.');
      var patch = { 'Certificate Name': name, 'Certificate Number': str_(d.number), 'Certificate Date': isoToDate_(d.date) || '',
        'Expiry Date': isoToDate_(d.expiry) || '', 'Remarks': str_(d.remarks), 'Updated At': now };
      if (str_(d.fileId)) { patch['File ID'] = str_(d.fileId); patch['File URL'] = driveUrl_(d.fileId); patch['File Name'] = str_(d.fileName); patch['Mime'] = str_(d.mime); }
      updateObj_(SH.CERTS, r._row, patch);
      log_(ctx, 'Certificate updated', id);
      return { message: 'Certificate updated.', id: id };
    }
    if (!str_(d.fileId)) throw new Error('Take a photo or upload the certificate.');
    var o = pickOutlet_(ctx, d.outletId);
    var nid = nextId_(SH.CERTS, 'Certificate ID', 'CRT-', 4);
    appendObj_(SH.CERTS, { 'Certificate ID': nid, 'Outlet ID': o.id, 'Outlet': o.name, 'Certificate Name': name,
      'Certificate Number': str_(d.number), 'Certificate Date': isoToDate_(d.date) || '', 'Expiry Date': isoToDate_(d.expiry) || '',
      'File URL': driveUrl_(d.fileId), 'File ID': str_(d.fileId), 'File Name': str_(d.fileName), 'Mime': str_(d.mime),
      'Uploaded By': ctx.uid, 'Uploaded By Name': ctx.name, 'Uploaded At': now, 'Updated At': now, 'Remarks': str_(d.remarks), 'Status': 'Active' });
    log_(ctx, 'Certificate added', nid + ' ' + name);
    return { message: 'Certificate ' + name + ' added.', id: nid };
  });
}
function certRemove_(ctx, d) {
  var r = findObj_(SH.CERTS, 'Certificate ID', str_(d.id));
  if (!r || ctx.outlets.indexOf(str_(r['Outlet ID'])) < 0) throw new Error('Certificate not found.');
  updateObj_(SH.CERTS, r._row, { 'Status': 'Deleted', 'Updated At': new Date(), 'Remarks': (str_(r['Remarks']) + ' · removed by ' + ctx.name).trim() });
  log_(ctx, 'Certificate removed', str_(d.id));
  return { message: 'Removed.' };
}
