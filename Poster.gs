/*************************************************************************
 *  Poster.gs — the Hiring Poster Maker, inside One Login.
 *
 *  Its config lives in this workbook (Poster Settings · Poster Outlets ·
 *  Poster Roles · Poster Benefits · Poster Sections · Poster Log). The
 *  first time, the tabs are copied from the old "Poster Generation" sheet
 *  (Settings ▸ Poster Config Sheet ID); without access they are seeded
 *  with the same defaults the old app shipped with.
 *  Posters are drawn in the browser (PNG / JPG / PDF) and, when shared,
 *  saved to Drive ▸ <Drive Folder Name>/Hiring Posters.
 *************************************************************************/

var POSTER_BUILTIN = { company: 1, summary: 1, responsibilities: 1, qualification: 1, benefits: 1 };
var POSTER_ROLE_SECTIONS = { summary: 'summary', responsibilities: 'jd', qualification: 'qual' };
var POSTER_PROFILE = 'Chai Govindam is a growing chai and snacks cafe brand from Chhattisgarh, known for fresh chai, quick service and a warm, ' +
  'family-style welcome at every outlet. We train our team on our own standards, promote from within and keep the work honest, organised and respectful.';

function posterYes_(v) { var s = str_(v).toUpperCase(); return s === '' || s === 'YES' || s === 'Y' || s === 'TRUE' || s === '1' || s === 'ON'; }
function posterNum_(v) {
  if (v === '' || v === null || v === undefined) return '';
  var raw = String(v).trim(), n = Number(raw.replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return '';
  if (/k/i.test(raw) && n < 1000) n = n * 1000;
  return n;
}
function posterType_(v) {
  var t = str_(v).toLowerCase();
  if (t.indexOf('benefit') === 0) return 'benefits';
  if (t.indexOf('para') === 0 || t === 'text' || t === 'lead') return 'paragraph';
  return 'bullets';
}
function posterSlug_(t) { var s = String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); return s || ('block-' + Date.now()); }

/* ============================ SEED / IMPORT ============================ */
function posterDefaults_() {
  var settings = [['Company Name', 'Chai Govindam', 'Shown in the caption text'], ['Website', 'chaigovindam.com', 'Printed in the poster footer'],
    ['Poster Headline', 'WE ARE HIRING', 'Big headline on top'], ['Poster Sub Headline', 'JOIN OUR TEAM', 'Small line under the headline'],
    ['Apply Line', 'TO APPLY — CALL / WHATSAPP', 'Footer label above the number'], ['Default Contact', '78989981113', 'Used when an outlet has no number'],
    ['Footer Note', 'Walk-in interview · 11 AM to 5 PM', 'Small line in the footer (optional)'], ['Brand Brown', '#6B3F1C', 'Main brand colour'],
    ['Brand Cream', '#FEF5E6', 'Poster background'], ['Brand Accent', '#E8A317', 'Thin accent rule only — keep it minimal'],
    ['Currency Symbol', '₹', 'Salary prefix'], ['Salary Suffix', 'per month', 'Shown after the salary range'],
    ['Poster Link Sharing', 'ANYONE', 'ANYONE = link works for everyone, PRIVATE = only you']];
  var outlets = [['Chanderi, Simga', 'RPR–BSP Highway', 'Simga, Chhattisgarh', '78989981113', 'YES'], ['Pandri', 'Pandri', 'Raipur, Chhattisgarh', '78989981113', 'YES'],
    ['Pachpedi Naka', 'Pachpedi Naka', 'Raipur, Chhattisgarh', '78989981113', 'YES'], ['Shankar Nagar', 'Shankar Nagar', 'Raipur, Chhattisgarh', '78989981113', 'YES'],
    ['Fafadih', 'Fafadih', 'Raipur, Chhattisgarh', '78989981113', 'YES'], ['Gol Chowk', 'Gol Chowk', 'Raipur, Chhattisgarh', '78989981113', 'YES'],
    ['HQ Bhanpuri', 'Head Office, Bhanpuri', 'Raipur, Chhattisgarh', '78989981113', 'YES']];
  var roles = [
    ['Cashier', 12000, 15000, '2', 'Full Time', '0–2 years', 'Front-of-counter role responsible for fast, accurate billing and a warm first impression for every guest at the outlet.',
      'Handle billing, POS entry and daily cash settlement\nGreet guests, take orders and suggest add-ons\nMaintain cash box, UPI records and shift handover sheet\nCoordinate with the kitchen for order accuracy and timing\nKeep the counter area clean, stocked and guest ready',
      '10th / 12th pass; graduates preferred\nComfortable with POS billing and UPI apps\nClear Hindi communication; English is a plus\nHonest, punctual and well presented', 'YES'],
    ['Steward', 10000, 12000, '4', 'Full Time', 'Fresher welcome', 'Service role that keeps guests looked after and the floor spotless through every shift.',
      'Serve tea, snacks and orders to guests at the table\nKeep tables, trays and the service station clean at all times\nTake guest feedback and escalate complaints to the manager\nSupport in clearing, stacking and dishwashing during rush hours\nFollow grooming, hygiene and uniform standards every shift',
      '10th pass or above; freshers welcome\nWilling to work in rotational shifts\nPolite, quick on the floor and a team player\nGood grooming and hygiene habits', 'YES'],
    ['Commis', 10000, 12000, '3', 'Full Time', '0–2 years', 'Kitchen support role assisting the chef with daily prep, hygiene and stock handling.',
      'Assist the chef in daily prep of snacks and kitchen items\nFollow standard recipes, portion sizes and taste standards\nMaintain kitchen hygiene, FIFO storage and labelling\nSupport in receiving and checking raw material\nReduce wastage and report shortages on time',
      '10th pass; food craft certificate is a plus\n0–2 years in a kitchen or QSR\nKnows basic knife work and prep hygiene\nAble to work long hours in a busy kitchen', 'YES'],
    ['CDP (Chef De Partie)', 12000, 15000, '2', 'Full Time', '2+ years', 'Section in-charge who runs an assigned kitchen station and keeps output consistent through peak hours.',
      'Run an assigned kitchen section independently\nPrepare food as per SOP, taste and presentation standards\nGuide and train commis staff during the shift\nControl wastage, raise indents and check stock daily\nEnsure FSSAI hygiene and temperature norms are followed',
      '12th pass; hotel management or food craft diploma preferred\n2+ years as Commis or CDP in a QSR or restaurant\nKnows FSSAI hygiene, temperature and storage norms\nAble to guide a small team during rush', 'YES'],
    ['Beverages Executive', 10000, 12000, '3', 'Full Time', '0–2 years', 'Beverage counter role brewing our chai, coffee and cold drinks to one standard, cup after cup.',
      'Prepare chai, coffee and cold beverages as per recipe\nMaintain consistency in taste, temperature and quantity\nKeep the beverage counter, machines and utensils clean\nTrack daily milk, tea and syrup consumption\nServe fast during peak hours without dropping quality',
      '10th / 12th pass; freshers welcome\nWilling to learn recipes and follow SOPs\nFast and steady during peak hours\nClean, careful and consistent', 'YES']];
  var benefits = [['Free Food', 'food', 'YES', 'YES'], ['Free Accommodation', 'home', 'YES', 'YES'], ['10 Hours Duty', 'clock', 'YES', 'YES'],
    ['10th / 12th Pass Can Apply', 'cap', 'YES', 'YES'], ['Immediate Joining', 'bolt', 'YES', 'YES'], ['Salary As Per Experience', 'money', 'YES', 'YES'],
    ['PF & ESIC Benefits', 'shield', 'NO', 'YES'], ['Growth to Supervisor Role', 'growth', 'NO', 'YES'], ['Weekly Off', 'calendar', 'NO', 'YES'], ['Uniform Provided', 'shirt', 'NO', 'YES']];
  var sections = [[1, 'company', 'COMPANY PROFILE', 'paragraph', POSTER_PROFILE, 'YES', 'YES'], [2, 'summary', 'JOB SUMMARY', 'paragraph', '', 'NO', 'YES'],
    [3, 'responsibilities', 'KEY RESPONSIBILITIES', 'bullets', '', 'YES', 'YES'], [4, 'qualification', 'QUALIFICATION & REQUIREMENTS', 'bullets', '', 'NO', 'YES'],
    [5, 'benefits', 'WHAT YOU GET', 'benefits', '', 'YES', 'YES']];
  return { settings: settings, outlets: outlets, roles: roles, benefits: benefits, sections: sections };
}
/** Fills any empty poster tab — from the old Poster Generation sheet when it can be opened, else the defaults. */
function posterSeed_() {
  var map = [[SH.POSTER_SET, 'Settings', 'settings'], [SH.POSTER_OUT, 'Outlets', 'outlets'], [SH.POSTER_ROLES, 'Roles', 'roles'],
    [SH.POSTER_BEN, 'Benefits', 'benefits'], [SH.POSTER_SEC, 'Sections', 'sections']];
  var old = null, def = posterDefaults_(), done = [];
  try { if (setRaw_('Poster Config Sheet ID')) old = extSS_(setRaw_('Poster Config Sheet ID')); } catch (e) { old = null; }
  map.forEach(function (m) {
    var sh = sheet_(m[0]); ensureHeader_(sh, HEAD[m[0]]);
    if (readObjs_(m[0]).length) return;
    var rows = null, head = HEAD[m[0]];
    if (old && old.getSheetByName(m[1]) && old.getSheetByName(m[1]).getLastRow() > 1) {
      var src = old.getSheetByName(m[1]), sv = src.getRange(1, 1, src.getLastRow(), src.getLastColumn()).getValues(), sh0 = sv[0].map(str_);
      rows = sv.slice(1).filter(function (r) { return r.some(function (c) { return str_(c) !== ''; }); }).map(function (r) {
        return head.map(function (h, i) { var j = sh0.indexOf(h); if (j < 0 && m[1] === 'Roles') j = i; return j >= 0 && j < r.length ? r[j] : ''; });
      });
      done.push(m[1] + ' imported');
    }
    if (!rows || !rows.length) { rows = def[m[2]].map(function (r) { return head.map(function (h, i) { return r[i] === undefined ? '' : r[i]; }); }); done.push(m[1] + ' seeded'); }
    sh.getRange(2, 1, rows.length, head.length).setValues(rows).setVerticalAlignment('top').setWrap(true);
    dropMemo_(m[0]);
  });
  sheet_(SH.POSTER_LOG); ensureHeader_(sheet_(SH.POSTER_LOG), HEAD[SH.POSTER_LOG]);
  return done.length ? 'Poster tabs: ' + done.join(', ') : '';
}

/* ============================ CONFIG ============================ */
function posterConfig_(ctx) {
  if (!readObjs_(SH.POSTER_SET).length || !readObjs_(SH.POSTER_SEC).length) lock_(function () { posterSeed_(); });
  var settings = {};
  readObjs_(SH.POSTER_SET).forEach(function (r) { var k = str_(r['Key']); if (k) settings[k] = str_(r['Value']); });
  var outlets = readObjs_(SH.POSTER_OUT).filter(function (r) { return str_(r['Outlet Name']) && posterYes_(r['Active']); }).map(function (r) {
    return { name: str_(r['Outlet Name']), line1: str_(r['Address Line 1']), line2: str_(r['Address Line 2']), phone: str_(r['Contact Number']).replace(/\.0$/, '') };
  });
  var H = HEAD[SH.POSTER_ROLES];
  var roles = readObjs_(SH.POSTER_ROLES).filter(function (r) { return str_(r[H[0]]) && posterYes_(r[H[9]]); }).map(function (r) {
    return { title: str_(r[H[0]]), salaryFrom: posterNum_(r[H[1]]), salaryTo: posterNum_(r[H[2]]), vacancies: str_(r[H[3]]), type: str_(r[H[4]]),
      experience: str_(r[H[5]]), summary: str_(r[H[6]]), jd: str_(r[H[7]]), qual: str_(r[H[8]]) };
  });
  var benefits = readObjs_(SH.POSTER_BEN).filter(function (r) { return str_(r['Benefit']) && posterYes_(r['Active']); }).map(function (r) {
    return { label: str_(r['Benefit']), icon: (str_(r['Icon']) || 'dot').toLowerCase(), on: posterYes_(r['Default']) };
  });
  return { appName: 'Hiring Poster Maker', settings: settings, outlets: outlets, roles: roles, benefits: benefits, sections: posterSections_(),
    sheetUrl: db_().getUrl() + '#gid=' + sheet_(SH.POSTER_ROLES).getSheetId(), user: ctx.name };
}
function posterSections_() {
  var out = [];
  readObjs_(SH.POSTER_SEC).forEach(function (r, i) {
    var key = str_(r['Section Key']);
    if (!key || !posterYes_(r['Active'])) return;
    var n = Number(r['Order']);
    out.push({ order: isNaN(n) || str_(r['Order']) === '' ? 900 + i : n, key: key, heading: str_(r['Heading']) || key.toUpperCase(),
      type: posterType_(r['Type']), content: r['Default Content'] === null || r['Default Content'] === undefined ? '' : String(r['Default Content']),
      on: posterYes_(r['Print on Poster']), custom: !POSTER_BUILTIN[key.toLowerCase()] });
  });
  return out.sort(function (a, b) { return a.order - b.order; });
}

/* ============================ SAVE / SHARE ============================ */
function posterSave_(ctx, d) {
  if (!str_(d.data)) throw new Error('Nothing to save.');
  var blob = Utilities.newBlob(Utilities.base64Decode(d.data), str_(d.mimeType) || 'image/png', str_(d.fileName) || 'poster.png');
  var folder = folder_('Hiring Posters'), file = folder.createFile(blob);
  var share = (readObjs_(SH.POSTER_SET).filter(function (r) { return str_(r['Key']) === 'Poster Link Sharing'; }).map(function (r) { return str_(r['Value']); })[0] || 'ANYONE').toUpperCase();
  if (share === 'ANYONE') { try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {} }
  var id = file.getId(), m = d.meta || {};
  appendObj_(SH.POSTER_LOG, { 'Timestamp': new Date(), 'User': ctx.name, 'Outlet': str_(m.outlet), 'Job Title': str_(m.title), 'Vacancies': str_(m.vacancies),
    'Salary': str_(m.salary), 'Format': str_(m.format), 'File Name': str_(d.fileName), 'Link': 'https://drive.google.com/file/d/' + id + '/view' });
  log_(ctx, 'Hiring poster', str_(m.title) + ' · ' + str_(m.outlet));
  return { ok: true, id: id, fileName: str_(d.fileName), viewUrl: 'https://drive.google.com/file/d/' + id + '/view',
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + id, folderUrl: folder.getUrl() };
}
function posterAddBenefit_(ctx, d) {
  var label = str_(d.label); if (!label) throw new Error('Write the benefit.');
  return lock_(function () {
    if (readObjs_(SH.POSTER_BEN).some(function (r) { return str_(r['Benefit']).toLowerCase() === label.toLowerCase(); })) return { ok: true, existed: true };
    appendObj_(SH.POSTER_BEN, { 'Benefit': label, 'Icon': str_(d.icon) || 'dot', 'Default': 'NO', 'Active': 'YES' });
    return { ok: true };
  });
}
function posterAddSection_(ctx, d) {
  var heading = str_(d.heading); if (!heading) throw new Error('Write the heading.');
  return lock_(function () {
    var key = str_(d.key) || posterSlug_(heading), max = 0, rows = readObjs_(SH.POSTER_SEC);
    for (var i = 0; i < rows.length; i++) {
      if (str_(rows[i]['Section Key']).toLowerCase() === key.toLowerCase()) return { ok: true, existed: true, key: key };
      var n = Number(rows[i]['Order']); if (!isNaN(n)) max = Math.max(max, n);
    }
    appendObj_(SH.POSTER_SEC, { 'Order': max + 1, 'Section Key': key, 'Heading': heading, 'Type': posterType_(d.type), 'Default Content': str_(d.content), 'Print on Poster': 'YES', 'Active': 'YES' });
    return { ok: true, key: key };
  });
}
/** Saves the order, headings and ticks shown in the maker as everyone's default. */
function posterSaveSections_(ctx, d) {
  var list = d.list || [];
  if (!list.length) throw new Error('Nothing to save.');
  return lock_(function () {
    var rows = readObjs_(SH.POSTER_SEC), byKey = {}, used = {}, out = [];
    rows.forEach(function (r) { var k = str_(r['Section Key']).toLowerCase(); if (k && !byKey[k]) byKey[k] = r; });
    list.forEach(function (it) {
      var key = str_(it.key); if (!key) return;
      var lk = key.toLowerCase(), old = byKey[lk], bound = !!POSTER_ROLE_SECTIONS[lk] || posterType_(it.type) === 'benefits';
      var content = bound ? (old ? str_(old['Default Content']) : '') : String(it.text === undefined ? (old ? old['Default Content'] : '') : it.text);
      out.push([out.length + 1, key, str_(it.heading) || key.toUpperCase(), posterType_(it.type), content, it.on ? 'YES' : 'NO', 'YES']);
      used[lk] = true;
    });
    rows.forEach(function (r) {
      var k = str_(r['Section Key']); if (!k || used[k.toLowerCase()]) return;
      used[k.toLowerCase()] = true;
      out.push([out.length + 1, k, r['Heading'], r['Type'], r['Default Content'], r['Print on Poster'], r['Active']]);
    });
    var h = heads_(SH.POSTER_SEC), sh = h.sh;
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, h.names.length).clearContent();
    sh.getRange(2, 1, out.length, 7).setValues(out).setVerticalAlignment('top').setWrap(true);
    dropMemo_(SH.POSTER_SEC);
    log_(ctx, 'Poster sections saved', out.length + ' blocks');
    return { ok: true, count: out.length, message: 'Order saved for everyone.' };
  });
}
