var FAST_API = 'https://sheets.googleapis.com/v4/spreadsheets/';
var FAST_EPOCH = -2209161600000;

function fastHost_() { return typeof NF_HOST !== 'undefined' && NF_HOST === true; }
function fastSt_() {
  return __M.fa || (__M.fa = { live: false, data: {}, ids: {}, used: {}, miss: {}, bad: {}, touch: {}, open: {}, rows: {}, wrap: {}, pre: [], learn: {} });
}
function fastLive_() { var f = __M.fa; return !!(f && f.live && !__M.inLock && !__M.wrote); }
function fastWrote_() { __M.wrote = true; }
function fastTouch_(k) { fastSt_().touch[k] = 1; }
function fastOpen_(id) { var f = fastSt_(); if (f.open[id] !== 'r') f.open[id] = 'r'; }
function fastHubId_() {
  if (__M.hubId === undefined) { try { __M.hubId = db_().getId(); } catch (e) { __M.hubId = ''; } }
  return __M.hubId;
}
function fastTz_() { if (!__M.stz) { try { __M.stz = Session.getScriptTimeZone() || APP.TZ; } catch (e) { __M.stz = APP.TZ; } } return __M.stz; }

function fastBegin_(req) {
  var f = fastSt_();
  f.act = str_(req && req.action);
  f.nf = !!(req && req.nf);
  if (fastHost_() || !f.act || /^(ui\.bundle|auth\.logout|file\.)/.test(f.act)) return;
  var got = {}, c = cache_();
  try { got = c ? (c.getAll(['fast_off', 'fl_' + f.act]) || {}) : {}; } catch (e) { got = {}; }
  if (got.fast_off) return;
  if (no_(setRaw_('Fast Reads'))) return;
  f.live = true;
  try { f.learn = got['fl_' + f.act] ? JSON.parse(got['fl_' + f.act]) || {} : {}; } catch (e) { f.learn = {}; }
  var keys = Object.keys(f.learn).filter(function (k) { return f.learn[k] >= 0.5; });
  if (keys.length < 2) return;
  try { fastLoad_(keys); } catch (e) { f.data = {}; f.ids = {}; f.pre = []; }
}

function fastLoad_(keys) {
  var f = __M.fa, by = {}, ids = [];
  keys.forEach(function (k) {
    var i = k.indexOf('|'); if (i < 1) return;
    var id = k.slice(0, i), tab = k.slice(i + 1);
    if (!by[id]) { by[id] = []; ids.push(id); }
    by[id].push(tab);
  });
  if (!ids.length) return;
  var c = cache_(), tzc = {}, tz = {}, reqs = [], map = [];
  try { tzc = c ? (c.getAll(ids.map(function (id) { return 'ftz_' + id; })) || {}) : {}; } catch (e) { tzc = {}; }
  var hdr = { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() };
  ids.forEach(function (id) {
    var rg = by[id].map(function (t) { return '&ranges=' + encodeURIComponent("'" + t.replace(/'/g, "''") + "'"); }).join('');
    var base = FAST_API + id + '/values:batchGet?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE' + rg + '&dateTimeRenderOption=';
    reqs.push({ url: base + 'SERIAL_NUMBER', headers: hdr, muteHttpExceptions: true }); map.push([id, 's']);
    reqs.push({ url: base + 'FORMATTED_STRING', headers: hdr, muteHttpExceptions: true }); map.push([id, 'f']);
    if (tzc['ftz_' + id]) tz[id] = tzc['ftz_' + id];
    else { reqs.push({ url: FAST_API + id + '?fields=properties.timeZone', headers: hdr, muteHttpExceptions: true }); map.push([id, 'z']); }
  });
  var res = UrlFetchApp.fetchAll(reqs) || [];
  if (res.length !== reqs.length) return;
  var got = {}, put = {};
  for (var i = 0; i < res.length; i++) {
    var code = res[i].getResponseCode(), id = map[i][0], kind = map[i][1], body = res[i].getContentText();
    if (code === 429) { cachePutJ_('fast_off', 1, 60); return; }
    if (code === 403 && /has not been used|is disabled|SERVICE_DISABLED|accessNotConfigured/i.test(body)) { cachePutJ_('fast_off', 1, 3600); return; }
    if (code !== 200) { f.bad[id] = 1; continue; }
    var j; try { j = JSON.parse(body); } catch (e) { f.bad[id] = 1; continue; }
    if (kind === 'z') { tz[id] = (j.properties && j.properties.timeZone) || fastTz_(); put['ftz_' + id] = tz[id]; }
    else (got[id] = got[id] || {})[kind] = j.valueRanges || [];
  }
  if (c && Object.keys(put).length) { try { c.putAll(put, 21600); } catch (e) {} }
  ids.forEach(function (id) {
    var g = got[id];
    if (f.bad[id] || !g || !g.s || !g.f) return;
    var zone = tz[id] || fastTz_();
    by[id].forEach(function (tab, n) {
      var a = g.s[n], b = g.f[n];
      if (!a || !b) return;
      f.data[id + '|' + tab] = fastRows_(a.values || [], b.values || [], zone);
      f.ids[id] = 1;
      f.pre.push(id + '|' + tab);
    });
  });
}

function fastRows_(a, b, zone) {
  var out = [], w = 0, same = zone === fastTz_();
  for (var i = 0; i < a.length; i++) {
    var ra = a[i] || [], rb = b[i] || [], row = [];
    for (var j = 0; j < ra.length; j++) {
      var v = ra[j];
      if (v === null || v === undefined) v = '';
      else if (typeof v === 'number' && typeof rb[j] === 'string') v = fastDate_(v, zone, same);
      row.push(v);
    }
    if (row.length > w) w = row.length;
    out.push(row);
  }
  return { v: out, w: w };
}

function fastDate_(s, zone, same) {
  var days = Math.floor(s), ms = Math.round((s - days) * 86400000);
  if (ms >= 86400000) { days += 1; ms -= 86400000; }
  var u = new Date(FAST_EPOCH + days * 86400000 + ms);
  var d = new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate(), u.getUTCHours(), u.getUTCMinutes(), u.getUTCSeconds(), u.getUTCMilliseconds());
  if (u.getUTCFullYear() < 100) d.setFullYear(u.getUTCFullYear());
  return same ? d : new Date(d.getTime() + fastShift_(d, zone));
}

function fastShift_(d, zone) {
  var f = fastSt_(), c = f.shift || (f.shift = {}), k = zone + '|' + Math.floor(d.getTime() / 86400000);
  if (c[k] === undefined) {
    var a = Utilities.formatDate(d, zone, 'yyyy-MM-dd HH:mm:ss').split(/[- :]/).map(Number);
    var b = new Date(a[0], a[1] - 1, a[2], a[3], a[4], a[5]);
    c[k] = (d.getTime() - d.getMilliseconds()) - b.getTime();
  }
  return c[k];
}

function fastHub_(name) {
  if (!fastLive_()) return null;
  var f = __M.fa, key = fastHubId_() + '|' + name;
  f.used[key] = 1;
  return f.data[key] || null;
}
function fastHubMiss_(name) { if (fastLive_()) __M.fa.miss[fastHubId_() + '|' + name] = 1; }
function fastHubRows_(name, fd, width) {
  var vals = [];
  for (var i = 1; i < fd.v.length; i++) {
    var src = fd.v[i] || [], r = [];
    for (var j = 0; j < width; j++) { var v = src[j]; r.push(v === undefined ? '' : v instanceof Date ? new Date(v.getTime()) : v); }
    vals.push(r);
  }
  __M.fa.rows[name] = 1;
  return vals;
}
function fastLock_() {
  var f = __M.fa; if (!f) return;
  Object.keys(f.rows).forEach(function (n) { delete __M.rows[n]; });
  f.rows = {};
}

function fastOpenReal_(id) {
  try { return SpreadsheetApp.openById(id); }
  catch (e) { throw new Error('Cannot open spreadsheet ' + id + ' — check the ID on the Settings tab and that the script owner can edit it.'); }
}

function fastProxy_(w, real, onWrite) {
  if (typeof Proxy === 'undefined') return w;
  return new Proxy(w, {
    get: function (t, k) {
      if (k in t) return t[k];
      if (typeof k !== 'string') return undefined;
      var r = real(), v = r[k];
      if (typeof v !== 'function') return v;
      return function () { onWrite(); fastWrote_(); return v.apply(r, arguments); };
    }
  });
}
function fastPass_(o, real, names) {
  names.forEach(function (k) { o[k] = function () { var r = real(); return r[k].apply(r, arguments); }; });
}

function fastSS_(id) {
  var f = __M.fa;
  if (!f || !f.live) { fastOpen_(id); return __M.ext[id]; }
  if (f.wrap[id]) return f.wrap[id];
  if (!f.open[id]) f.open[id] = 'w';
  var real = function () { return __M.ext[id] || (__M.ext[id] = fastOpenReal_(id)); };
  var w = {
    getId: function () { return id; },
    getSheetByName: function (n) {
      var key = id + '|' + n;
      if (!fastLive_()) { f.touch[key] = 1; return real().getSheetByName(n); }
      f.used[key] = 1;
      if (f.data[key]) return fastSheet_(w, real, n, f.data[key]);
      var sh = real().getSheetByName(n);
      if (sh) { f.miss[key] = 1; f.touch[key] = 1; }
      return sh;
    }
  };
  fastPass_(w, real, ['getName', 'getUrl', 'getSpreadsheetTimeZone', 'getOwner', 'getSpreadsheetLocale', 'getEditors', 'getViewers']);
  ['getSheets', 'getSheetById', 'getRangeByName', 'getNamedRanges', 'getActiveSheet'].forEach(function (k) {
    w[k] = function () { f.open[id] = 'r'; var r = real(); return r[k].apply(r, arguments); };
  });
  f.wrap[id] = fastProxy_(w, real, function () { f.open[id] = 'r'; });
  return f.wrap[id];
}

function fastSheet_(w, ssReal, n, d) {
  var f = __M.fa, key = w.getId() + '|' + n, rs = null, lr = d.v.length, lc = d.w;
  var real = function () { return rs || (rs = ssReal().getSheetByName(n)); };
  var s = {
    getName: function () { return n; },
    getParent: function () { return w; },
    getLastRow: function () { return fastLive_() ? lr : real().getLastRow(); },
    getLastColumn: function () { return fastLive_() ? lc : real().getLastColumn(); },
    getDataRange: function () {
      if (fastLive_()) return fastRange_(s, real, d, 1, 1, Math.max(lr, 1), Math.max(lc, 1), key);
      f.touch[key] = 1; return real().getDataRange();
    },
    getRange: function (a, b, c, e) {
      if (fastLive_()) {
        var g = typeof a === 'number' ? [a, b, c === undefined ? 1 : c, e === undefined ? 1 : e] : fastA1_(a);
        if (g) return fastRange_(s, real, d, g[0], g[1], g[2], g[3], key);
      }
      f.touch[key] = 1;
      var r = real(); return r.getRange.apply(r, arguments);
    }
  };
  fastPass_(s, real, ['getSheetId', 'getMaxRows', 'getMaxColumns', 'getFrozenRows', 'getFrozenColumns', 'isSheetHidden', 'getIndex', 'getType', 'getFilter']);
  return fastProxy_(s, real, function () { f.touch[key] = 1; });
}

function fastA1_(a1) {
  var m = /^\$?([A-Z]{1,3})\$?(\d+)(?::\$?([A-Z]{1,3})\$?(\d+))?$/.exec(str_(a1).toUpperCase());
  if (!m) return null;
  var col = function (x) { var n = 0; for (var i = 0; i < x.length; i++) n = n * 26 + x.charCodeAt(i) - 64; return n; };
  var r1 = Number(m[2]), c1 = col(m[1]), r2 = m[4] ? Number(m[4]) : r1, c2 = m[3] ? col(m[3]) : c1;
  if (r2 < r1 || c2 < c1) return null;
  return [r1, c1, r2 - r1 + 1, c2 - c1 + 1];
}

function fastRange_(s, sheetReal, d, r, c, nr, nc, key) {
  if (!(r >= 1) || !(c >= 1)) throw new Error('The coordinates of the range are outside the dimensions of the sheet.');
  if (!(nr >= 1)) throw new Error('The number of rows in the range must be at least 1.');
  if (!(nc >= 1)) throw new Error('The number of columns in the range must be at least 1.');
  var f = __M.fa, rr = null;
  var real = function () { return rr || (rr = sheetReal().getRange(r, c, nr, nc)); };
  var cell = function (i, j) { var src = d.v[r - 1 + i], v = src ? src[c - 1 + j] : undefined; return v === undefined ? '' : v instanceof Date ? new Date(v.getTime()) : v; };
  var o = {
    getValues: function () {
      if (!fastLive_()) return real().getValues();
      var out = [];
      for (var i = 0; i < nr; i++) { var row = []; for (var j = 0; j < nc; j++) row.push(cell(i, j)); out.push(row); }
      return out;
    },
    getValue: function () { return fastLive_() ? cell(0, 0) : real().getValue(); },
    getRow: function () { return r; }, getColumn: function () { return c; },
    getNumRows: function () { return nr; }, getNumColumns: function () { return nc; },
    getLastRow: function () { return r + nr - 1; }, getLastColumn: function () { return c + nc - 1; },
    getSheet: function () { return s; },
    getA1Notation: function () {
      var L = function (n) { var t = ''; while (n > 0) { var m = (n - 1) % 26; t = String.fromCharCode(65 + m) + t; n = Math.floor((n - 1) / 26); } return t; };
      return L(c) + r + (nr > 1 || nc > 1 ? ':' + L(c + nc - 1) + (r + nr - 1) : '');
    }
  };
  fastPass_(o, real, ['getDisplayValues', 'getDisplayValue', 'getFormulas', 'getFormula', 'getNumberFormat', 'getNumberFormats', 'getBackground', 'getBackgrounds',
    'getNote', 'getNotes', 'getRichTextValue', 'getRichTextValues', 'getDataValidation', 'getDataValidations', 'getMergedRanges', 'isBlank', 'getFontColor',
    'getFontWeight', 'getFontWeights', 'getHorizontalAlignment', 'getWrap']);
  return fastProxy_(o, real, function () { f.touch[key] = 1; });
}

function fastLearn_(f) {
  var L = f.learn || {}, out = {}, changed = false;
  Object.keys(L).forEach(function (k) {
    var id = k.slice(0, k.indexOf('|'));
    if (f.bad[id]) { changed = true; return; }
    var s = f.used[k] ? Math.min(1, L[k] * 0.6 + 0.4) : L[k] * 0.6;
    if (s >= 0.2) out[k] = Math.round(s * 100) / 100;
    if (out[k] !== L[k]) changed = true;
  });
  Object.keys(f.miss).forEach(function (k) { if (out[k] === undefined || out[k] < 1) { out[k] = 1; changed = true; } });
  var keys = Object.keys(out);
  if (keys.length > 40) { keys.sort(function (a, b) { return out[b] - out[a]; }).slice(40).forEach(function (k) { delete out[k]; }); changed = true; }
  if (changed) cachePutJ_('fl_' + f.act, out, 21600);
}

function fastEnd_(out) {
  var f = __M.fa;
  if (!f || fastHost_()) return;
  try { if (f.live && f.act) fastLearn_(f); } catch (e) {}
  if (!f.nf || !__M.wrote || !out) return;
  try { SpreadsheetApp.flush(); } catch (e) {}
  var keys = {};
  Object.keys(f.touch).forEach(function (k) { keys[k] = 1; });
  Object.keys(f.open).forEach(function (id) { if (f.open[id] === 'r') keys[id + '|*'] = 1; });
  var list = Object.keys(keys);
  if (!list.length) return;
  var t = Date.now(), k = list.join('\n');
  out._s = { t: t, k: k, g: sign_(t + '\n' + encodeURIComponent(k)) };
}

function fastHas_(id) { var f = __M.fa; return !!(f && f.ids[id]); }

function fastIdOf_(v) {
  var s = str_(v), m = s.match(/\/d\/([-\w]{25,})/) || s.match(/[?&]id=([-\w]{25,})/) || s.match(/^([-\w]{25,})$/);
  return m ? m[1] : '';
}
function fastSheetIds_() {
  var ids = {}, add = function (v, from) { var id = fastIdOf_(v); if (id && !ids[id]) ids[id] = from; };
  var hub = db_();
  add(hub.getId(), 'One Login');
  var st = settings_();
  Object.keys(st).forEach(function (k) { if (/sheet|spreadsheet|tracker/i.test(k) || /docs\.google\.com\/spreadsheets/.test(st[k])) add(st[k], 'Settings ▸ ' + k); });
  SETTING_DEFAULTS_().forEach(function (r) { if (/sheet id/i.test(r[0]) && !str_(st[String(r[0]).toLowerCase()])) add(r[1], 'Settings ▸ ' + r[0]); });
  hub.getSheets().forEach(function (sh) {
    var lc = sh.getLastColumn(), lr = sh.getLastRow();
    if (lc < 1 || lr < 2) return;
    var head = sh.getRange(1, 1, 1, lc).getValues()[0].map(str_);
    var cols = [];
    head.forEach(function (h, i) { if (/(spreadsheet|sheet)\s*(id|link|url)|sheet id \/ link/i.test(h)) cols.push(i); });
    if (!cols.length) return;
    sh.getRange(2, 1, lr - 1, lc).getValues().forEach(function (r) { cols.forEach(function (c) { add(r[c], sh.getName()); }); });
  });
  try { var src = oaItemMasterSource_(); if (src && src.id) add(src.id, 'Outlet order item list'); } catch (e) {}
  return ids;
}
function fastShare_(acct) {
  acct = str_(acct).toLowerCase();
  var ids = fastSheetIds_(), out = { shared: [], had: [], skipped: [], failed: [] };
  var tok = ScriptApp.getOAuthToken();
  Object.keys(ids).forEach(function (id) {
    var label = ids[id];
    try {
      var f = DriveApp.getFileById(id), name = f.getName();
      if (f.getMimeType() !== MimeType.GOOGLE_SHEETS) { out.skipped.push(name + ' (not a Google Sheet)'); return; }
      var has = f.getViewers().concat(f.getEditors()).some(function (u) { return str_(u.getEmail()).toLowerCase() === acct; });
      if (has) { out.had.push(name); return; }
      var res = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id + '/permissions?sendNotificationEmail=false&supportsAllDrives=true', {
        method: 'post', contentType: 'application/json', payload: JSON.stringify({ role: 'reader', type: 'user', emailAddress: acct }),
        headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true });
      if (res.getResponseCode() >= 300) f.addViewer(acct);
      out.shared.push(name);
    } catch (e) { out.failed.push(label + ' · ' + id + ': ' + e.message); }
  });
  return out;
}
function fastConfig_() {
  var p = props_(), owner = '';
  try { owner = str_(db_().getOwner().getEmail()); } catch (e) {}
  if (!owner) { try { owner = str_(Session.getEffectiveUser().getEmail()); } catch (e) {} }
  var c = { h: db_().getId(), s: secret_(), o: str_(p['CG_SSO_SECRET']), u: str_(p['CG_WEBAPP_URL']) || appUrl_(), e: owner, z: fastTz_(), i: ScriptApp.getScriptId() };
  return Utilities.base64Encode(JSON.stringify(c));
}
function fastConfigHtml_() {
  return '<style>body{font-family:Arial,sans-serif;font-size:13px;color:#2b1d12}label{display:block;font-weight:bold;margin:10px 0 4px}' +
    'textarea{width:100%;height:90px;font-family:monospace;font-size:11px;box-sizing:border-box}</style>' +
    '<h4>Vercel environment variable</h4><label>CG_FAST_CONFIG</label><textarea readonly onclick="this.select()">' + esc_(fastConfig_()) + '</textarea>';
}
function fastSetupHtml_(acct, r) {
  var list = function (title, a) { return a.length ? '<h4>' + esc_(title) + ' (' + a.length + ')</h4><ul>' + a.map(function (x) { return '<li>' + esc_(x) + '</li>'; }).join('') + '</ul>' : ''; };
  var box = function (label, v) { return '<label>' + esc_(label) + '</label><textarea readonly onclick="this.select()">' + esc_(v) + '</textarea>'; };
  return '<style>body{font-family:Arial,sans-serif;font-size:13px;color:#2b1d12}h3{margin:0 0 8px}h4{margin:12px 0 4px}label{display:block;font-weight:bold;margin:10px 0 4px}' +
    'textarea{width:100%;height:58px;font-family:monospace;font-size:11px;box-sizing:border-box}ul{margin:0;padding-left:18px;max-height:120px;overflow:auto}</style>' +
    '<h3>Service account: ' + esc_(acct) + '</h3>' +
    list('Shared now', r.shared) + list('Already shared', r.had) + list('Skipped', r.skipped) + list('Could not share', r.failed) +
    '<h4>Vercel environment variables</h4>' + box('CG_FAST_CONFIG', fastConfig_()) + box('GOOGLE_SA_EMAIL', acct) +
    '<label>GOOGLE_SA_KEY</label><div>private_key from the service account key file (.json)</div>';
}
