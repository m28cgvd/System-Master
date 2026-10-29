/*************************************************************************
 *  Db.gs — sheet, cache, date and file helpers used by every module.
 *************************************************************************/

var __M = { rows: {}, heads: {}, ext: {}, extTabs: {}, settings: null, db: null };

/* ============================ SPREADSHEET ============================ */
function db_() {
  if (__M.db) return __M.db;
  var ss = null;
  try { ss = SpreadsheetApp.getActive(); } catch (e) {}
  if (!ss) {
    var id = PropertiesService.getScriptProperties().getProperty('HUB_SHEET_ID');
    if (!id) throw new Error('This script must be bound to its spreadsheet (Extensions → Apps Script).');
    ss = SpreadsheetApp.openById(id);
  }
  __M.db = ss;
  return ss;
}

function headFor_(name) {
  if (HEAD[name]) return HEAD[name];
  if (String(name).indexOf(EMP_PREFIX) === 0) return HEAD.EMP;
  return null;
}

/** Columns that must stay plain text (so 0123, 12/05, 9691032899 are never re-typed by Sheets). */
var TEXT_COLS = ['Login ID', 'Password', 'Mobile', 'Phone', 'Employee ID', 'User ID', 'Bill Number',
  'Certificate Number', 'Order No', 'GRN No', 'Task ID', 'Session ID', 'Item Code', 'Assigned Users',
  'Shared With Users', 'Shared With Roles', 'Visible To Users', 'Visible To Roles', 'Outlet Access',
  'Spreadsheet ID', 'Source Row', 'Start', 'End', 'Shift Code', 'Week Start Text', 'Doer Mobile', 'Who', 'Visible To Departments',
  'Visible To Designations', 'Visible To Locations', 'Salary Name', 'Contact Number'];

function sheet_(name) {
  var ss = db_();
  fastTouch_(fastHubId_() + '|' + name);
  var sh = ss.getSheetByName(name);
  if (!sh) {
    fastWrote_(); fastTouch_(fastHubId_() + '|#');
    sh = ss.insertSheet(name);
    var head = headFor_(name);
    if (head) writeHeader_(sh, head);
  }
  return sh;
}

function writeHeader_(sh, head) {
  fastWrote_();
  if (sh.getMaxColumns() < head.length) sh.insertColumnsAfter(sh.getMaxColumns(), head.length - sh.getMaxColumns());
  sh.getRange(1, 1, 1, head.length).setValues([head])
    .setBackground(APP.COLORS.brown).setFontColor('#FFFFFF').setFontWeight('bold')
    .setVerticalAlignment('middle').setWrap(true);
  sh.setFrozenRows(1);
  try { sh.setRowHeight(1, 34); } catch (e) {}
  head.forEach(function (h, i) {
    if (TEXT_COLS.indexOf(h) >= 0) {
      try { sh.getRange(2, i + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@'); } catch (e) {}
    }
  });
  delete __M.heads[sh.getName()];
}

/** Adds any missing header at the end — never moves or deletes a column. */
function ensureHeader_(sh, head) {
  var lc = Math.max(sh.getLastColumn(), 1);
  var cur = sh.getRange(1, 1, 1, lc).getValues()[0].map(str_);
  if (!cur.filter(String).length) { writeHeader_(sh, head); return; }
  var add = head.filter(function (h) { return cur.indexOf(h) < 0; });
  if (!add.length) return;
  fastWrote_();
  var start = cur.filter(String).length ? lastNonEmpty_(cur) + 2 : 1;
  if (sh.getMaxColumns() < start + add.length - 1) sh.insertColumnsAfter(sh.getMaxColumns(), start + add.length - 1 - sh.getMaxColumns());
  sh.getRange(1, start, 1, add.length).setValues([add])
    .setBackground(APP.COLORS.brown).setFontColor('#FFFFFF').setFontWeight('bold').setWrap(true);
  add.forEach(function (h, i) {
    if (TEXT_COLS.indexOf(h) >= 0) {
      try { sh.getRange(2, start + i, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@'); } catch (e) {}
    }
  });
  delete __M.heads[sh.getName()];
}
function lastNonEmpty_(arr) { for (var i = arr.length - 1; i >= 0; i--) if (arr[i]) return i; return -1; }

function heads_(name) {
  if (__M.heads[name]) return __M.heads[name];
  var fd = fastHub_(name);
  if (fd) {
    var fw = Math.max(fd.w, 1), top = fd.v[0] || [], fn = [], fi = {}, real = null;
    for (var k = 0; k < fw; k++) fn.push(str_(top[k]));
    fn.forEach(function (h, i) { if (h && fi[h] === undefined) fi[h] = i; });
    fastTouch_(fastHubId_() + '|' + name);
    var o = { names: fn, idx: fi, fast: fd };
    Object.defineProperty(o, 'sh', { enumerable: true, get: function () { return real || (real = sheet_(name)); } });
    __M.heads[name] = o;
    return o;
  }
  var sh = sheet_(name);
  fastHubMiss_(name);
  var lc = Math.max(sh.getLastColumn(), 1);
  var names = sh.getRange(1, 1, 1, lc).getValues()[0].map(str_);
  var idx = {};
  names.forEach(function (h, i) { if (h && idx[h] === undefined) idx[h] = i; });
  __M.heads[name] = { names: names, idx: idx, sh: sh };
  return __M.heads[name];
}

/** Every data row as {header: value, _row: n}. Memoised for this execution. */
function readObjs_(name) {
  if (__M.rows[name]) return __M.rows[name];
  var h = heads_(name), vals;
  if (h.fast && fastLive_()) {
    if (h.fast.v.length < 2) { __M.rows[name] = []; return []; }
    vals = fastHubRows_(name, h.fast, h.names.length);
  } else {
    var sh = h.sh, lr = sh.getLastRow();
    if (lr < 2) { __M.rows[name] = []; return []; }
    vals = sh.getRange(2, 1, lr - 1, h.names.length).getValues();
  }
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i], empty = true;
    for (var j = 0; j < r.length; j++) { if (r[j] !== '' && r[j] !== null) { empty = false; break; } }
    if (empty) continue;
    var o = { _row: i + 2 };
    for (var c = 0; c < h.names.length; c++) if (h.names[c]) o[h.names[c]] = r[c];
    out.push(o);
  }
  __M.rows[name] = out;
  return out;
}
function dropMemo_(name) { delete __M.rows[name]; }

function rowFromObj_(h, obj) {
  var row = [];
  for (var i = 0; i < h.names.length; i++) {
    var k = h.names[i];
    var v = (k && obj.hasOwnProperty(k)) ? obj[k] : '';
    row.push(v === undefined || v === null ? '' : v);
  }
  return row;
}

function appendObjs_(name, objs) {
  if (!objs || !objs.length) return 0;
  fastWrote_();
  var h = heads_(name);
  var rows = objs.map(function (o) { return rowFromObj_(h, o); });
  var start = h.sh.getLastRow() + 1;
  if (h.sh.getMaxRows() < start + rows.length - 1) h.sh.insertRowsAfter(h.sh.getMaxRows(), rows.length + 50);
  h.sh.getRange(start, 1, rows.length, h.names.length).setValues(rows);
  dropMemo_(name);
  return start;
}
function appendObj_(name, obj) { return appendObjs_(name, [obj]); }

/** Writes only the named columns of one row. */
function updateObj_(name, rowNum, patch) {
  fastWrote_();
  if (!(Number(rowNum) >= 2)) throw new Error('Could not find the row to update on "' + name + '" — refresh and try again.');
  var h = heads_(name);
  Object.keys(patch).forEach(function (k) {
    var c = h.idx[k];
    if (c === undefined) return;
    var v = patch[k];
    h.sh.getRange(rowNum, c + 1).setValue(v === undefined || v === null ? '' : v);
  });
  dropMemo_(name);
}

/** Rewrites whole rows (same length as header) — for bulk edits. */
function writeRows_(name, rowNum, rows) {
  if (!rows.length) return;
  fastWrote_();
  var h = heads_(name);
  h.sh.getRange(rowNum, 1, rows.length, h.names.length).setValues(rows);
  dropMemo_(name);
}

/** Deletes rows bottom-up, one call per contiguous block (fast for rows written together). */
function deleteRows_(name, rowNums) {
  if (!rowNums || !rowNums.length) return;
  fastWrote_();
  var sh = sheet_(name);
  var rs = uniq_(rowNums.map(Number)).sort(function (a, b) { return b - a; });
  var i = 0;
  while (i < rs.length) {
    var end = rs[i], start = end;
    while (i + 1 < rs.length && rs[i + 1] === start - 1) { i++; start = rs[i]; }
    if (start <= 2 && end >= sh.getMaxRows()) {
      sh.getRange(start, 1, end - start + 1, sh.getLastColumn()).clearContent();   // never delete every row of a sheet
    } else {
      sh.deleteRows(start, end - start + 1);
    }
    i++;
  }
  dropMemo_(name);
}

function findObj_(name, key, value) {
  var v = str_(value).toLowerCase();
  var rows = readObjs_(name);
  for (var i = 0; i < rows.length; i++) if (str_(rows[i][key]).toLowerCase() === v) return rows[i];
  return null;
}

/** Next id like PREFIX0007 from the max already used in `col`. */
function nextIds_(name, col, prefix, width, count) {
  var max = 0, re = new RegExp('^' + escRe_(prefix) + '(\\d+)$');
  readObjs_(name).forEach(function (r) {
    var m = str_(r[col]).match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  var out = [];
  for (var i = 1; i <= (count || 1); i++) out.push(prefix + pad_(max + i, width || 4));
  return out;
}
function nextId_(name, col, prefix, width) { return nextIds_(name, col, prefix, width, 1)[0]; }

/* ============================ VALUE HELPERS ============================ */
function str_(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }
function num_(v) {
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  var n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}
function yes_(v) { return /^(y|yes|true|1|on|active)$/i.test(str_(v)); }
function no_(v) { return /^(n|no|false|0|off)$/i.test(str_(v)); }
function norm_(v) { return str_(v).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function pad_(n, w) { var s = String(n); while (s.length < (w || 2)) s = '0' + s; return s; }
function escRe_(s) { return String(s).replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'); }
function round_(n, d) { var p = Math.pow(10, d === undefined ? 2 : d); return Math.round((Number(n) || 0) * p) / p; }
function list_(v) { return str_(v).split(/[,;\n|]+/).map(function (s) { return s.trim(); }).filter(String); }
function uniq_(arr) { var s = {}, o = []; arr.forEach(function (x) { if (!s[x]) { s[x] = 1; o.push(x); } }); return o; }
function esc_(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function clean_(v) { return v instanceof Date ? fmt_(v, 'dd/MM/yyyy HH:mm') : (v === null || v === undefined ? '' : v); }

/* ============================ DATES (Asia/Kolkata) ============================ */
function fmt_(d, f) {
  if (!d) return '';
  if (!(d instanceof Date)) { d = parseAny_(d); if (!d) return ''; }
  return Utilities.formatDate(d, APP.TZ, f || 'dd/MM/yyyy');
}
function iso_(d) { return fmt_(d, 'yyyy-MM-dd'); }
function todayIso_() { return iso_(new Date()); }
function isoToDate_(s) {
  var m = str_(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
function addDays_(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
function mondayOf_(d) {
  var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var day = Number(Utilities.formatDate(x, APP.TZ, 'u')); // 1 = Monday … 7 = Sunday
  return addDays_(x, -(day - 1));
}
function monthLabel_(d) { return Utilities.formatDate(d || new Date(), APP.TZ, 'MMMM yyyy'); }

/** Understands Date objects, ISO, dd/MM/yyyy, dd-MM-yyyy hh:mm:ss AM, and Sheets serials. */
function parseAny_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') {
    if (v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 86400000) + new Date().getTimezoneOffset() * 60000);
    return null;
  }
  var s = str_(v);
  if (!s) return null;
  var iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (iso) {
    var d0 = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), Number(iso[4] || 0), Number(iso[5] || 0), Number(iso[6] || 0));
    return isNaN(d0.getTime()) ? null : d0;
  }
  var m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:[,\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?/i);
  if (m) {
    var y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    var hh = Number(m[4] || 0), ap = (m[7] || '').toLowerCase();
    if (ap === 'pm' && hh < 12) hh += 12;
    if (ap === 'am' && hh === 12) hh = 0;
    var d = new Date(y, Number(m[2]) - 1, Number(m[1]), hh, Number(m[5] || 0), Number(m[6] || 0));
    return isNaN(d.getTime()) ? null : d;
  }
  var d2 = new Date(s);
  return isNaN(d2.getTime()) ? null : d2;
}
function timeOf_(v) { var d = parseAny_(v); return d ? fmt_(d, 'hh:mm a') : ''; }

/* ============================ SETTINGS ============================ */
function settings_() {
  if (__M.settings) return __M.settings;
  var hit = cacheGetJ_('cg_settings_v1');
  if (hit) { __M.settings = hit; return hit; }
  var map = {};
  SETTING_DEFAULTS_().forEach(function (r) { if (r[0].indexOf('──') !== 0) map[r[0].toLowerCase()] = String(r[1]); });
  try {
    var sh = db_().getSheetByName(SH.SETTINGS);
    if (sh && sh.getLastRow() > 1) {
      sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
        var k = str_(r[0]);
        if (k && k.indexOf('──') !== 0) map[k.toLowerCase()] = str_(r[1]);
      });
    }
  } catch (e) {}
  cachePutJ_('cg_settings_v1', map, 120);
  __M.settings = map;
  return map;
}
function set_(key, dflt) {
  var v = settings_()[String(key).toLowerCase()];
  if (v === undefined || v === '') return dflt === undefined ? '' : dflt;
  return v;
}
function setRaw_(key) { var v = settings_()[String(key).toLowerCase()]; return v === undefined ? '' : v; }
function setYes_(key) { return yes_(set_(key, 'No')); }
function setNum_(key, dflt) { var v = set_(key, ''); if (v === '') return dflt; var n = Number(v); return isNaN(n) ? dflt : n; }
function saveSetting_(key, value) {
  fastWrote_();
  var sh = sheet_(SH.SETTINGS);
  var lr = sh.getLastRow();
  if (lr > 1) {
    var keys = sh.getRange(2, 1, lr - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) {
      if (str_(keys[i][0]).toLowerCase() === String(key).toLowerCase()) {
        sh.getRange(i + 2, 2).setValue(value);
        cacheDel_(['cg_settings_v1']); __M.settings = null;
        return;
      }
    }
  }
  sh.appendRow([key, value, '']);
  cacheDel_(['cg_settings_v1']); __M.settings = null;
}

/* ============================ CACHE ============================ */
/*  Speed: every screen reads other spreadsheets (checklists, Loan & Advance, attendance, orders).
 *  Those reads are kept in the script cache — shared by everyone — for a few minutes, and a
 *  change made through this app bumps a "generation" counter so the next read is fresh at once.
 *  The Refresh button (api request with fresh: true) skips the cache for that request.        */
function cache_() { try { return CacheService.getScriptCache(); } catch (e) { return null; } }
function cacheGetJ_(k, dates) {
  var c = cache_(); if (!c) return null;
  try {
    var v = c.get(k);
    if (!v) return null;
    var s = v;
    if (v.indexOf('__chunks__:') === 0) {
      var n = Number(v.split(':')[1]), keys = [];
      for (var i = 0; i < n; i++) keys.push(k + '__' + i);
      var got = c.getAll(keys); s = '';
      for (var j = 0; j < n; j++) { if (!got[keys[j]]) return null; s += got[keys[j]]; }
    }
    return dates ? JSON.parse(s, reviveDate_) : JSON.parse(s);
  } catch (e) { return null; }
}
function cachePutJ_(k, obj, ttl, dates) {
  if (__M.cacheOnly && __M.missed) return;                 // a half-read answer is never kept
  var c = cache_(); if (!c) return;
  try {
    var s = dates ? JSON.stringify(obj, packDate_) : JSON.stringify(obj);
    ttl = Math.min(Math.max(ttl || 60, 1), 21600);
    if (s.length < 95000) { c.put(k, s, ttl); return; }
    var size = 90000, n = Math.ceil(s.length / size), all = {};
    if (n > 20) return;   // too big to be worth caching
    for (var i = 0; i < n; i++) all[k + '__' + i] = s.substr(i * size, size);
    c.putAll(all, ttl);
    c.put(k, '__chunks__:' + n, ttl);
  } catch (e) {}
}
/** Same as cacheGetJ_ / cachePutJ_, but sheet dates come back as real Date objects (to the millisecond). */
function cacheGetD_(k) { return __M.fresh ? null : cacheGetJ_(k, true); }
function cachePutD_(k, obj, ttl) { cachePutJ_(k, obj, ttl, true); }
function packDate_(k, v) { var x = this[k]; return x instanceof Date ? '\u0001' + x.getTime() : v; }
function reviveDate_(k, v) { return typeof v === 'string' && v.charCodeAt(0) === 1 ? new Date(Number(v.slice(1))) : v; }
/** Several keys in one or two cache calls (dates kept). → { key: value } for the hits only. */
function cacheGetManyD_(keys) {
  var out = {}, c = cache_();
  if (!c || __M.fresh || !keys.length) return out;
  try {
    var got = c.getAll(keys), chunkKeys = [], need = {};
    keys.forEach(function (k) {
      var v = got[k]; if (!v) return;
      if (v.indexOf('__chunks__:') === 0) { var n = Number(v.split(':')[1]); need[k] = n; for (var i = 0; i < n; i++) chunkKeys.push(k + '__' + i); }
      else { try { out[k] = JSON.parse(v, reviveDate_); } catch (e) {} }
    });
    if (chunkKeys.length) {
      var parts = c.getAll(chunkKeys);
      Object.keys(need).forEach(function (k) {
        var s = '', ok = true;
        for (var i = 0; i < need[k]; i++) { var p = parts[k + '__' + i]; if (!p) { ok = false; break; } s += p; }
        if (ok) { try { out[k] = JSON.parse(s, reviveDate_); } catch (e) {} }
      });
    }
  } catch (e) {}
  return out;
}
function cacheDel_(keys) { var c = cache_(); if (!c) return; try { c.removeAll(keys); } catch (e) {} }

/** Every script property in ONE call per request (session secret, cache generations, the web app link …). */
function props_() {
  if (__M.props) return __M.props;
  var all = {};
  try { all = PropertiesService.getScriptProperties().getProperties() || {}; } catch (e) {}
  __M.props = all;
  return all;
}
function propSet_(k, v) {
  PropertiesService.getScriptProperties().setProperty(k, String(v));
  props_()[k] = String(v);
}

/** A counter that invalidates a whole family of cache keys at once. */
function gen_(family) {
  __M.gens = __M.gens || {};
  if (__M.gens[family]) return __M.gens[family];
  var v = props_()['gen_' + family] || '1';
  __M.gens[family] = v;
  return v;
}
function bumpGen_(family) {
  fastWrote_();
  var p = PropertiesService.getScriptProperties();
  var v = String(Number(p.getProperty('gen_' + family) || props_()['gen_' + family] || '1') + 1);
  if (!fastHost_()) p.setProperty('gen_' + family, v);
  props_()['gen_' + family] = v;
  __M.gens = __M.gens || {};
  __M.gens[family] = v;
  delete __M.mods; delete __M.roles; delete __M.outlets; delete __M.emps;
  delete __M.rules; delete __M.chks; delete __M.doerIdx; delete __M.laMaster; delete __M.laInc;
  delete __M.depts; delete __M.desigs; delete __M.ctx; delete __M.laTab; delete __M.frLoc;
}
/**
 * One changed tab = one small counter ("gen_lat_Leave_September_2026", "gen_atdt_ManualPenalty" …), so a
 * change drops only THAT tab's shared copy — every other tab stays cached. The counters a request touched
 * are raised together in one call when the change is written (end of the lock, or of the request).
 */
function markDirty_(family) { (__M.dirty = __M.dirty || {})[family] = 1; }
function isDirty_(family) { return !!(__M.dirty && __M.dirty[family]); }
function flushDirty_() {
  var d = __M.dirty; if (!d) return;
  __M.dirty = null;
  var fams = Object.keys(d); if (!fams.length) return;
  fastWrote_();
  var p = PropertiesService.getScriptProperties(), cur = {}, upd = {};
  try { cur = p.getProperties() || {}; } catch (e) {}
  fams.forEach(function (f) { upd['gen_' + f] = String(Number(cur['gen_' + f] || '1') + 1); });
  if (!fastHost_()) p.setProperties(upd);
  var all = props_(); __M.gens = __M.gens || {};
  fams.forEach(function (f) { all['gen_' + f] = upd['gen_' + f]; __M.gens[f] = upd['gen_' + f]; });
  if (d.la) delete __M.laInc;
}

/* ============================ LOCK ============================ */
function lock_(fn) {
  var l = LockService.getScriptLock();
  if (!l.tryLock(25000)) throw new Error('The system is busy — please try again in a few seconds.');
  fastWrote_(); fastLock_();
  __M.inLock = (__M.inLock || 0) + 1;            // cached readers read the sheet itself while a change is being written
  try { return fn(); } finally {
    __M.inLock--;
    if (!__M.inLock) { try { flushDirty_(); } catch (e) {} }   // before the lock is let go: the next reader already sees the change
    try { l.releaseLock(); } catch (e) {}
  }
}

/* ============================ EXTERNAL SHEETS ============================ */
function extSS_(id) {
  id = str_(id);
  if (!id) throw new Error('A data source is not set on the Settings tab.');
  // sign-in brings only what the shared cache already holds — it never waits for another spreadsheet
  if (__M.cacheOnly && !fastHost_()) { __M.missed = true; throw new Error('__MISS__'); }
  var f = __M.fa;
  if (!__M.ext[id] && !(f && f.live && f.ids[id])) __M.ext[id] = fastOpenReal_(id);
  return fastSS_(id);
}

/**
 * Reads a tab of another spreadsheet.
 *   opt.headerRow  1-based header row (default: auto-detect in the first 10 rows)
 *   opt.lastN      read only the last N data rows (fast for long logs)
 * Returns { sh, head[], firstRow (sheet row of rows[0]), rows[][] }
 */
function extRead_(ssId, tab, opt) {
  opt = opt || {};
  if (opt.cache && !__M.inLock) {                 // read-only screens: shared copy for opt.cache seconds (dates kept)
    var ck = 'ext_' + gen_('data') + (opt.fam ? '.' + gen_(opt.fam) : '') + '_' + ssId.slice(-12) + '_' + str_(tab).replace(/[^A-Za-z0-9]+/g, '') + '_' + (opt.lastN || 0) + '_' + (opt.headerRow || 0);
    var hit = cacheGetD_(ck);
    if (hit) return hit;
    var fresh = extRead_(ssId, tab, { headerRow: opt.headerRow, lastN: opt.lastN, skip: opt.skip });
    cachePutD_(ck, { head: fresh.head, firstRow: fresh.firstRow, rows: fresh.rows, headerRow: fresh.headerRow }, opt.cache);
    return fresh;
  }
  var ss = extSS_(ssId);
  var sh = ss.getSheetByName(tab);
  if (!sh) throw new Error('Tab "' + tab + '" not found in ' + ss.getName() + '.');
  var lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (lr < 1 || lc < 1) return { sh: sh, head: [], firstRow: 2, rows: [], headerRow: 1 };
  var hr = opt.headerRow;
  if (!hr) {
    var top = sh.getRange(1, 1, Math.min(10, lr), lc).getValues();
    hr = 1;
    for (var i = 0; i < top.length; i++) {
      if (top[i].filter(function (c) { return str_(c) !== ''; }).length >= 3) { hr = i + 1; break; }
    }
  }
  var head = sh.getRange(hr, 1, 1, lc).getValues()[0].map(str_);
  var first = hr + 1 + (opt.skip || 0);
  if (opt.lastN && lr - first + 1 > opt.lastN) first = lr - opt.lastN + 1;
  var rows = lr >= first ? sh.getRange(first, 1, lr - first + 1, lc).getValues() : [];
  return { sh: sh, head: head, firstRow: first, rows: rows, headerRow: hr };
}

/** Column index by header: exact (normalised) match first, then "contains". -1 when absent. */
function col_(head, names) {
  names = [].concat(names);
  var H = head.map(function (h) { return norm_(h); });
  for (var n = 0; n < names.length; n++) { var i = H.indexOf(norm_(names[n])); if (i >= 0) return i; }
  for (var m = 0; m < names.length; m++) {
    var t = norm_(names[m]); if (!t) continue;
    for (var j = 0; j < H.length; j++) if (H[j] && H[j].indexOf(t) >= 0) return j;
  }
  return -1;
}

/* ============================ ACTIVITY LOG ============================ */
function log_(ctx, action, details) {
  try {
    appendObj_(SH.LOG, {
      'Timestamp': new Date(), 'User ID': ctx && ctx.uid || '', 'Full Name': ctx && ctx.name || '',
      'Action': action, 'Details': typeof details === 'string' ? details : JSON.stringify(details || '')
    });
  } catch (e) {}
}

/* ============================ EMAIL ============================ */
function mail_(to, subject, html, opt) {
  opt = opt || {};
  var list = uniq_([].concat(to || []).map(str_).filter(function (e) { return e.indexOf('@') > 0; }));
  if (!list.length) return 'no email address';
  var test = setYes_('Test Mode');
  var real = list.join(', ');
  if (test) list = [set_('Test Email', 'mis@chaigovindam.com')];
  try {
    var body = (test ? '<p style="background:#D64545;color:#fff;padding:8px 12px;border-radius:6px">TEST MODE — meant for: ' + esc_(real) + '</p>' : '') + html;
    var o = { to: list.join(','), subject: (test ? '[TEST] ' : '') + subject, htmlBody: body, name: set_('App Name', APP.NAME) };
    if (opt.attachments) o.attachments = opt.attachments;
    if (opt.replyTo) o.replyTo = opt.replyTo;
    MailApp.sendEmail(o);
    return 'sent to ' + list.join(', ');
  } catch (e) { return 'email failed: ' + e.message; }
}

function mailShell_(title, inner) {
  return '<div style="max-width:620px;margin:0 auto;font-family:Arial,sans-serif;color:#2b1d12">' +
    '<div style="background:' + APP.COLORS.brown + ';padding:18px;border-radius:12px 12px 0 0;text-align:center">' +
    '<img src="' + esc_(set_('Logo URL', APP.LOGO)) + '" style="height:56px" alt="">' +
    '<h2 style="color:#fff;margin:8px 0 0;font-size:18px">' + esc_(title) + '</h2></div>' +
    '<div style="background:#fff;border:1px solid ' + APP.COLORS.cream + ';border-top:none;padding:20px;border-radius:0 0 12px 12px">' +
    inner + '<p style="color:#8a7a6d;font-size:12px;margin-top:20px">' + esc_(set_('App Name', APP.NAME)) + ' · One Login</p></div></div>';
}

/* ============================ DRIVE FILES ============================ */
function folder_(sub) {
  var p = PropertiesService.getScriptProperties();
  var rootId = props_()['ROOT_FOLDER_ID'], root = null;
  if (rootId) { try { root = DriveApp.getFolderById(rootId); } catch (e) { root = null; } }
  if (!root) {
    var name = set_('Drive Folder Name', 'CG One Login Files');
    var it = DriveApp.getFoldersByName(name);
    root = it.hasNext() ? it.next() : DriveApp.createFolder(name);
    propSet_('ROOT_FOLDER_ID', root.getId());
  }
  if (!sub) return root;
  var s = root.getFoldersByName(sub);
  return s.hasNext() ? s.next() : root.createFolder(sub);
}
function driveUrl_(id) { return id ? 'https://drive.google.com/file/d/' + id + '/view' : ''; }
function driveThumb_(id) { return id ? 'https://drive.google.com/thumbnail?id=' + id + '&sz=w400' : ''; }

/** Forget everything memoised in this execution (after bulk writes in setup / sync). */
function resetMemo_() {
  var db = __M.db, fa = __M.fa, wrote = __M.wrote, hubId = __M.hubId;
  __M = { rows: {}, heads: {}, ext: {}, extTabs: {}, settings: null, db: db, fa: fa, wrote: wrote, hubId: hubId };
  if (fa) fa.wrap = {};
}
