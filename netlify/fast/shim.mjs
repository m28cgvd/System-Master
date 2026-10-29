import crypto from 'node:crypto';
import vm from 'node:vm';
import { offsetAt, localTz, partsIn } from './convert.mjs';

const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const QUIET = new Set(['then', 'toJSON', 'inspect', 'constructor', 'valueOf', 'toString', 'asymmetricMatch', 'nodeType', 'length', 'prototype']);

function pad(n, w) { let s = String(Math.abs(n)); while (s.length < w) s = '0' + s; return (n < 0 ? '-' : '') + s; }

function comps(d, tz) {
  const ms = d.getTime();
  if (!tz || tz === localTz()) {
    return { y: d.getFullYear(), M: d.getMonth() + 1, d: d.getDate(), H: d.getHours(), m: d.getMinutes(), s: d.getSeconds(), S: d.getMilliseconds(), wd: d.getDay(), off: -Math.round(d.getTimezoneOffset() * 60000), tz: tz || localTz() };
  }
  const off = offsetAt(tz, ms), u = new Date(ms + off);
  return { y: u.getUTCFullYear(), M: u.getUTCMonth() + 1, d: u.getUTCDate(), H: u.getUTCHours(), m: u.getUTCMinutes(), s: u.getUTCSeconds(), S: u.getUTCMilliseconds(), wd: u.getUTCDay(), off, tz };
}
function dayOfYear(c) { return Math.round((Date.UTC(c.y, c.M - 1, c.d) - Date.UTC(c.y, 0, 1)) / 86400000) + 1; }
function offText(off, colon, short) {
  const sign = off < 0 ? '-' : '+', a = Math.abs(Math.round(off / 60000)), h = Math.floor(a / 60), m = a % 60;
  if (short) return sign + pad(h, 2);
  return sign + pad(h, 2) + (colon ? ':' : '') + pad(m, 2);
}
function zoneName(c, long) {
  if (/^Asia\/(Kolkata|Calcutta)$/.test(c.tz)) return long ? 'India Standard Time' : 'IST';
  try {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: c.tz, timeZoneName: long ? 'long' : 'short' }).formatToParts(new Date());
    const z = p.find(x => x.type === 'timeZoneName'); return z ? z.value : c.tz;
  } catch (e) { return c.tz; }
}

function tokens(pattern) {
  const out = [], s = String(pattern);
  let i = 0;
  while (i < s.length) {
    const ch = s.charAt(i);
    if (ch === "'") {
      if (s.charAt(i + 1) === "'") { out.push({ lit: "'" }); i += 2; continue; }
      let j = i + 1, lit = '';
      while (j < s.length) {
        if (s.charAt(j) === "'") { if (s.charAt(j + 1) === "'") { lit += "'"; j += 2; continue; } break; }
        lit += s.charAt(j); j++;
      }
      out.push({ lit }); i = j + 1; continue;
    }
    if (/[A-Za-z]/.test(ch)) { let j = i; while (j < s.length && s.charAt(j) === ch) j++; out.push({ k: ch, n: j - i }); i = j; continue; }
    out.push({ lit: ch }); i++;
  }
  return out;
}

function formatDate(d, tz, pattern) {
  if (!(d instanceof Date)) d = new Date(d);
  if (isNaN(d.getTime())) throw new Error('Invalid argument: date');
  const c = comps(d, tz);
  return tokens(pattern).map(t => {
    if (t.lit !== undefined) return t.lit;
    const n = t.n;
    switch (t.k) {
      case 'G': return c.y > 0 ? 'AD' : 'BC';
      case 'y': case 'Y': return n === 2 ? pad(c.y % 100, 2) : pad(c.y, n);
      case 'M': case 'L': return n >= 4 ? MON[c.M - 1] : n === 3 ? MON[c.M - 1].slice(0, 3) : pad(c.M, n);
      case 'd': return pad(c.d, n);
      case 'D': return pad(dayOfYear(c), n);
      case 'E': return n >= 4 ? DAYS[c.wd] : DAYS[c.wd].slice(0, 3);
      case 'u': return pad(c.wd === 0 ? 7 : c.wd, n);
      case 'a': return c.H < 12 ? 'AM' : 'PM';
      case 'H': return pad(c.H, n);
      case 'k': return pad(c.H === 0 ? 24 : c.H, n);
      case 'K': return pad(c.H % 12, n);
      case 'h': return pad(((c.H + 11) % 12) + 1, n);
      case 'm': return pad(c.m, n);
      case 's': return pad(c.s, n);
      case 'S': return pad(c.S, n);
      case 'z': return zoneName(c, n >= 4);
      case 'Z': return offText(c.off, false);
      case 'X': return n === 1 ? offText(c.off, false, true) : offText(c.off, n >= 3);
      case 'F': return pad(Math.floor((c.d - 1) / 7) + 1, n);
      case 'w': { const j = new Date(Date.UTC(c.y, 0, 1)).getUTCDay(); return pad(Math.floor((dayOfYear(c) + j - 1) / 7) + 1, n); }
      default: return t.k.repeat(n);
    }
  }).join('');
}

function parseDate(str, tz, pattern) {
  const s = String(str);
  let re = '^\\s*', keys = [];
  tokens(pattern).forEach(t => {
    if (t.lit !== undefined) { re += t.lit.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'); return; }
    switch (t.k) {
      case 'M': case 'L':
        if (t.n >= 3) { re += '([A-Za-z]+)'; keys.push('Mn'); } else { re += '(\\d{1,2})'; keys.push('M'); } break;
      case 'E': re += '[A-Za-z]+'; break;
      case 'a': re += '([AaPp][Mm])'; keys.push('a'); break;
      case 'y': case 'Y': re += t.n === 2 ? '(\\d{2})' : '(\\d{1,4})'; keys.push(t.n === 2 ? 'yy' : 'y'); break;
      case 'S': re += '(\\d{1,3})'; keys.push('S'); break;
      case 'Z': case 'X': re += '([+-]\\d{2}:?\\d{2}|Z)'; keys.push('Z'); break;
      case 'z': re += '[A-Za-z+\\-:0-9]+'; break;
      default: re += '(\\d{1,' + Math.max(2, t.n) + '})'; keys.push(t.k);
    }
  });
  const m = new RegExp(re).exec(s);
  if (!m) throw new Error('Unparseable date: "' + s + '"');
  const v = { y: 1970, M: 1, d: 1, H: 0, m: 0, s: 0, S: 0 };
  let ap = '', zone = null;
  keys.forEach((k, i) => {
    const x = m[i + 1];
    if (k === 'Mn') { const ix = MON.findIndex(n => n.slice(0, 3).toLowerCase() === x.slice(0, 3).toLowerCase()); v.M = ix + 1; }
    else if (k === 'a') ap = x.toLowerCase();
    else if (k === 'yy') v.y = 2000 + Number(x);
    else if (k === 'y') v.y = Number(x);
    else if (k === 'Z') zone = x === 'Z' ? 0 : (x.charAt(0) === '-' ? -1 : 1) * (Number(x.slice(1, 3)) * 3600000 + Number(x.slice(-2)) * 60000);
    else if (k === 'h' || k === 'K') v.H = Number(x);
    else if (k === 'k') v.H = Number(x) % 24;
    else v[k] = Number(x);
  });
  if (ap === 'pm' && v.H < 12) v.H += 12;
  if (ap === 'am' && v.H === 12) v.H = 0;
  const wall = Date.UTC(v.y, v.M - 1, v.d, v.H, v.m, v.s, v.S);
  if (zone !== null) return new Date(wall - zone);
  if (!tz || tz === localTz()) return new Date(v.y, v.M - 1, v.d, v.H, v.m, v.s, v.S);
  const g = wall - offsetAt(tz, wall);
  return new Date(wall - offsetAt(tz, g));
}

function formatString(f) {
  const a = Array.prototype.slice.call(arguments, 1);
  let i = 0;
  return String(f).replace(/%(-)?(0)?(\d+)?(?:\.(\d+))?([sdfxXo%])/g, (all, left, zero, width, prec, conv) => {
    if (conv === '%') return '%';
    let x = a[i++], s;
    if (conv === 'd') s = String(Math.trunc(Number(x)));
    else if (conv === 'f') s = Number(x).toFixed(prec === undefined ? 6 : Number(prec));
    else if (conv === 'x' || conv === 'X') { s = Math.trunc(Number(x)).toString(16); if (conv === 'X') s = s.toUpperCase(); }
    else if (conv === 'o') s = Math.trunc(Number(x)).toString(8);
    else s = String(x);
    const w = Number(width || 0);
    while (s.length < w) s = left ? s + ' ' : (zero && conv !== 's' ? (s.charAt(0) === '-' ? '-0' + s.slice(1) : '0' + s) : ' ' + s);
    return s;
  });
}

function parseCsv(text, delim) {
  const d = delim || ',', s = String(text), rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    if (q) {
      if (ch === '"') { if (s.charAt(i + 1) === '"') { cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === d) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s.charAt(i + 1) === '\n') i++;
      row.push(cur); rows.push(row); row = []; cur = '';
    } else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function signed(buf) { const out = new Array(buf.length); for (let i = 0; i < buf.length; i++) out[i] = buf[i] > 127 ? buf[i] - 256 : buf[i]; return out; }

function colNum(x) { let n = 0; for (let i = 0; i < x.length; i++) n = n * 26 + x.charCodeAt(i) - 64; return n; }
function colName(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function unquote(t) { t = String(t).trim(); return /^'.*'$/.test(t) ? t.slice(1, -1).replace(/''/g, "'") : t; }

function makeGlobals(H) {
  const ng = what => () => H.ng(what);
  const guard = (obj, label) => new Proxy(obj, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k === 'symbol' || QUIET.has(k)) return undefined;
      return function () { return H.ng(label + '.' + String(k)); };
    }
  });
  const enumOf = label => new Proxy({}, { get(t, k) { if (typeof k === 'symbol' || QUIET.has(k)) return undefined; return String(k); } });
  const service = label => new Proxy({}, {
    get(t, k) {
      if (typeof k === 'symbol' || QUIET.has(k)) return undefined;
      const f = function () { return H.ng(label + '.' + String(k)); };
      return new Proxy(f, { get(ft, fk) { if (typeof fk === 'symbol' || QUIET.has(fk)) return ft[fk]; return String(fk); } });
    }
  });

  function toBuf(x, cs) {
    if (x === null || x === undefined) return Buffer.alloc(0);
    if (Buffer.isBuffer(x)) return x;
    if (Array.isArray(x)) return Buffer.from(x.map(b => b & 255));
    if (x instanceof Blob) return x._b;
    return Buffer.from(String(x), cs === 'US_ASCII' ? 'ascii' : 'utf8');
  }
  class Blob {
    constructor(data, type, name) { this._b = toBuf(data); this._t = type || 'application/octet-stream'; this._n = name || null; }
    getBytes() { return signed(this._b); }
    getDataAsString() { return this._b.toString('utf8'); }
    setDataFromString(s) { this._b = Buffer.from(String(s), 'utf8'); return this; }
    setBytes(b) { this._b = toBuf(b); return this; }
    getContentType() { return this._t; }
    setContentType(t) { this._t = t; return this; }
    getName() { return this._n; }
    setName(n) { this._n = n; return this; }
    copyBlob() { return guard(new Blob(this._b, this._t, this._n), 'Blob'); }
    isGoogleType() { return false; }
    getAs(t) { if (t === this._t) return this.copyBlob(); return H.ng('Blob.getAs'); }
    getBlob() { return this; }
  }
  const blob = (d, t, n) => guard(new Blob(d, t, n), 'Blob');

  const DIG = { MD2: 'md5', MD5: 'md5', SHA_1: 'sha1', SHA_256: 'sha256', SHA_384: 'sha384', SHA_512: 'sha512' };
  const MAC = { HMAC_MD5: 'md5', HMAC_SHA_1: 'sha1', HMAC_SHA_256: 'sha256', HMAC_SHA_384: 'sha384', HMAC_SHA_512: 'sha512' };

  const Utilities = guard({
    formatDate: (d, tz, f) => formatDate(d, tz, f),
    parseDate: (s, tz, f) => parseDate(s, tz, f),
    formatString,
    getUuid: () => crypto.randomUUID(),
    sleep: () => {},
    DigestAlgorithm: { MD2: 'MD2', MD5: 'MD5', SHA_1: 'SHA_1', SHA_256: 'SHA_256', SHA_384: 'SHA_384', SHA_512: 'SHA_512' },
    MacAlgorithm: { HMAC_MD5: 'HMAC_MD5', HMAC_SHA_1: 'HMAC_SHA_1', HMAC_SHA_256: 'HMAC_SHA_256', HMAC_SHA_384: 'HMAC_SHA_384', HMAC_SHA_512: 'HMAC_SHA_512' },
    Charset: { UTF_8: 'UTF_8', US_ASCII: 'US_ASCII' },
    RsaAlgorithm: enumOf('RsaAlgorithm'),
    computeDigest: (alg, v, cs) => signed(crypto.createHash(DIG[alg] || 'sha256').update(toBuf(v, cs)).digest()),
    computeHmacSha256Signature: (v, k, cs) => signed(crypto.createHmac('sha256', toBuf(k, cs)).update(toBuf(v, cs)).digest()),
    computeHmacSignature: (alg, v, k, cs) => signed(crypto.createHmac(MAC[alg] || 'sha256', toBuf(k, cs)).update(toBuf(v, cs)).digest()),
    base64Encode: (v, cs) => toBuf(v, cs).toString('base64'),
    base64EncodeWebSafe: (v, cs) => toBuf(v, cs).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
    base64Decode: s => signed(Buffer.from(String(s), 'base64')),
    base64DecodeWebSafe: s => signed(Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64')),
    newBlob: (d, t, n) => blob(d, t, n),
    parseCsv: (t, d) => parseCsv(t, d),
    jsonStringify: o => JSON.stringify(o),
    jsonParse: s => JSON.parse(s)
  }, 'Utilities');

  const sheets = new Map();
  class RRange {
    constructor(sh, r, c, nr, nc) {
      if (!(r >= 1) || !(c >= 1)) throw new Error('The coordinates of the range are outside the dimensions of the sheet.');
      if (!(nr >= 1)) throw new Error('The number of rows in the range must be at least 1.');
      if (!(nc >= 1)) throw new Error('The number of columns in the range must be at least 1.');
      this._sh = sh; this._r = r; this._c = c; this._nr = nr; this._nc = nc;
    }
    _vals(src, fill) {
      const out = [];
      for (let i = 0; i < this._nr; i++) {
        const row = src[this._r - 1 + i], o = new Array(this._nc);
        for (let j = 0; j < this._nc; j++) {
          const v = row ? row[this._c - 1 + j] : undefined;
          o[j] = v === undefined || v === null ? fill : (v instanceof Date ? new Date(v.getTime()) : v);
        }
        out.push(o);
      }
      return out;
    }
    getValues() { return this._vals(this._sh._d().v, ''); }
    getValue() { const row = this._sh._d().v[this._r - 1], v = row ? row[this._c - 1] : undefined; return v === undefined || v === null ? '' : (v instanceof Date ? new Date(v.getTime()) : v); }
    getFormulas() { return this._vals(H.formulas(this._sh._id, this._sh._t), ''); }
    getFormula() { return this.getFormulas()[0][0]; }
    getFormulasR1C1() { return H.ng('Range.getFormulasR1C1'); }
    getDataValidations() {
      const D = H.dv(this._sh._id, this._sh._t, this.getA1Notation());
      const out = [];
      for (let i = 0; i < this._nr; i++) {
        const row = D.rows[i] || [], o = [];
        for (let j = 0; j < this._nc; j++) o.push(row[j] ? rule(row[j], this._sh) : null);
        out.push(o);
      }
      return out;
    }
    getDataValidation() { return this.getDataValidations()[0][0]; }
    getRow() { return this._r; }
    getColumn() { return this._c; }
    getRowIndex() { return this._r; }
    getColumnIndex() { return this._c; }
    getNumRows() { return this._nr; }
    getNumColumns() { return this._nc; }
    getHeight() { return this._nr; }
    getWidth() { return this._nc; }
    getLastRow() { return this._r + this._nr - 1; }
    getLastColumn() { return this._c + this._nc - 1; }
    getSheet() { return this._sh._self; }
    getA1Notation() { return colName(this._c) + this._r + (this._nr > 1 || this._nc > 1 ? ':' + colName(this._c + this._nc - 1) + (this._r + this._nr - 1) : ''); }
    offset(dr, dc, nr, nc) { return range(this._sh, this._r + dr, this._c + dc, nr || this._nr, nc || this._nc); }
    isBlank() { return this.getValues().every(r => r.every(v => v === '')); }
  }
  function range(sh, r, c, nr, nc) { const o = guard(new RRange(sh, r, c, nr, nc), 'Range'); return o; }
  function rule(x, sh) {
    const t = x.type === 'ONE_OF_LIST' ? 'VALUE_IN_LIST' : x.type === 'ONE_OF_RANGE' ? 'VALUE_IN_RANGE' : x.type === 'BOOLEAN' ? 'CHECKBOX' : x.type;
    return guard({
      getCriteriaType: () => t,
      getCriteriaValues: () => {
        if (t === 'VALUE_IN_LIST') return [x.values.slice(), x.ui];
        if (t === 'VALUE_IN_RANGE') return [refRange(String(x.values[0] || ''), sh), x.ui];
        return x.values.slice();
      },
      getAllowInvalid: () => !x.strict,
      getHelpText: () => x.help || ''
    }, 'DataValidation');
  }
  function refRange(f, sh) {
    const m = /^=?\s*(?:('(?:[^']|'')+'|[^!]+)!)?\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?\s*$/.exec(f);
    if (!m) return H.ng('DataValidation.range');
    const target = m[1] ? ss(sh._id).getSheetByName(unquote(m[1])) : sh._self;
    if (!target) return H.ng('DataValidation.range');
    const r1 = Number(m[3]), c1 = colNum(m[2]), r2 = m[5] ? Number(m[5]) : r1, c2 = m[4] ? colNum(m[4]) : c1;
    return target.getRange(r1, c1, r2 - r1 + 1, c2 - c1 + 1);
  }

  class RSheet {
    constructor(id, s) { this._id = id; this._t = s.t; this._m = s; this._self = null; }
    _d() { return H.tab(this._id, this._t); }
    getName() { return this._t; }
    getSheetName() { return this._t; }
    getSheetId() { return this._m.id; }
    getIndex() { return this._m.i + 1; }
    getParent() { return ss(this._id); }
    isSheetHidden() { return !!this._m.h; }
    getMaxRows() { return Math.max(this._m.r, this._d().v.length); }
    getMaxColumns() { return Math.max(this._m.c, this._d().w); }
    getFrozenRows() { return this._m.fr || 0; }
    getFrozenColumns() { return 0; }
    getType() { return 'GRID'; }
    getLastRow() { return this._d().v.length; }
    getLastColumn() { return this._d().w; }
    getDataRange() { const d = this._d(); return range(this, 1, 1, Math.max(1, d.v.length), Math.max(1, d.w)); }
    getRange(a, b, c, e) {
      if (typeof a === 'number') return range(this, a, b, c === undefined ? 1 : c, e === undefined ? 1 : e);
      const s = String(a).replace(/^.*!/, '').replace(/\$/g, '').toUpperCase().trim();
      let m = /^([A-Z]+)(\d+)(?::([A-Z]+)(\d+)?)?$/.exec(s);
      if (m) {
        const r1 = Number(m[2]), c1 = colNum(m[1]), c2 = m[3] ? colNum(m[3]) : c1, r2 = m[3] ? (m[4] ? Number(m[4]) : this.getMaxRows()) : r1;
        return range(this, r1, c1, r2 - r1 + 1, c2 - c1 + 1);
      }
      m = /^([A-Z]+):([A-Z]+)$/.exec(s);
      if (m) { const c1 = colNum(m[1]), c2 = colNum(m[2]); return range(this, 1, c1, this.getMaxRows(), c2 - c1 + 1); }
      m = /^(\d+):(\d+)$/.exec(s);
      if (m) { const r1 = Number(m[1]), r2 = Number(m[2]); return range(this, r1, 1, r2 - r1 + 1, this.getMaxColumns()); }
      return H.ng('Sheet.getRange(' + a + ')');
    }
  }
  function sheetObj(id, s) {
    const k = id + '|' + s.t;
    let o = sheets.get(k);
    if (!o) { const raw = new RSheet(id, s); o = guard(raw, 'Sheet'); raw._self = o; sheets.set(k, o); }
    return o;
  }

  const books = new Map();
  class RSS {
    constructor(id) { this._id = id; }
    _m() { return H.meta(this._id); }
    getId() { return this._id; }
    getName() { return this._m().title; }
    getUrl() { return 'https://docs.google.com/spreadsheets/d/' + this._id + '/edit'; }
    getSpreadsheetTimeZone() { return this._m().tz; }
    getSpreadsheetLocale() { return this._m().locale; }
    getSheets() { return this._m().sheets.slice().sort((a, b) => a.i - b.i).map(s => sheetObj(this._id, s)); }
    getNumSheets() { return this._m().sheets.length; }
    getSheetByName(n) {
      const m = this._m(), name = String(n);
      let s = m.sheets.find(x => x.t === name);
      if (!s) { const low = name.toLowerCase(); s = m.sheets.find(x => String(x.t).toLowerCase() === low); }
      if (!s && m.loose) s = { t: name, id: 0, i: 0, h: false, r: 1000, c: 26, fr: 0 };
      if (!s) { H.absent(this._id, name); return null; }
      return sheetObj(this._id, s);
    }
    getSheetById(i) { const s = this._m().sheets.find(x => x.id === Number(i)); return s ? sheetObj(this._id, s) : null; }
    getActiveSheet() { return this.getSheets()[0] || null; }
    getOwner() { return guard({ getEmail: () => H.cfg.owner || '' }, 'User'); }
    getRange(a1) {
      const m = /^('(?:[^']|'')+'|[^!]+)!(.+)$/.exec(String(a1));
      if (!m) return this.getActiveSheet().getRange(a1);
      const sh = this.getSheetByName(unquote(m[1]));
      if (!sh) throw new Error('Range not found');
      return sh.getRange(m[2]);
    }
  }
  function ss(id) {
    id = String(id);
    let o = books.get(id);
    if (!o) { o = guard(new RSS(id), 'Spreadsheet'); books.set(id, o); }
    return o;
  }

  const SpreadsheetApp = guard({
    getActive: () => ss(H.cfg.hub),
    getActiveSpreadsheet: () => ss(H.cfg.hub),
    openById: id => { H.meta(String(id)); return ss(id); },
    openByUrl: url => { const m = /\/d\/([-\w]{20,})/.exec(String(url)); const id = m ? m[1] : String(url); H.meta(id); return ss(id); },
    flush: () => {},
    DataValidationCriteria: enumOf('DataValidationCriteria'),
    CopyPasteType: enumOf('CopyPasteType'),
    BorderStyle: enumOf('BorderStyle'),
    Dimension: enumOf('Dimension'),
    WrapStrategy: enumOf('WrapStrategy'),
    ProtectionType: enumOf('ProtectionType'),
    BandingTheme: enumOf('BandingTheme'),
    SheetType: enumOf('SheetType')
  }, 'SpreadsheetApp');

  const props = Object.assign({}, H.cfg.props || {});
  const propStore = guard({
    getProperty: k => Object.prototype.hasOwnProperty.call(props, k) ? props[k] : (k === 'CG_UPGRADED' ? H.version() : null),
    getProperties: () => Object.assign({ CG_UPGRADED: H.version() }, props),
    getKeys: () => Object.keys(props)
  }, 'Properties');
  const PropertiesService = guard({ getScriptProperties: () => propStore, getUserProperties: () => propStore, getDocumentProperties: () => propStore }, 'PropertiesService');

  const cacheApi = guard({
    get: k => H.cache.get(k),
    getAll: ks => H.cache.getAll(ks),
    put: (k, v, t) => H.cache.put(k, v, t),
    putAll: (o, t) => H.cache.putAll(o, t),
    remove: k => H.cache.remove(k),
    removeAll: ks => H.cache.removeAll(ks)
  }, 'Cache');
  const CacheService = guard({ getScriptCache: () => cacheApi, getUserCache: () => cacheApi, getDocumentCache: () => cacheApi }, 'CacheService');

  const lock = guard({ tryLock: ng('Lock.tryLock'), waitLock: ng('Lock.waitLock'), releaseLock: () => {}, hasLock: () => false }, 'Lock');
  const LockService = guard({ getScriptLock: () => lock, getDocumentLock: () => lock, getUserLock: () => lock }, 'LockService');

  const user = email => guard({ getEmail: () => email || '', getUserLoginId: () => email || '' }, 'User');
  const Session = guard({
    getScriptTimeZone: () => H.cfg.tz,
    getActiveUser: () => user(''),
    getEffectiveUser: () => user(H.cfg.owner),
    getTemporaryActiveUserKey: () => '',
    getActiveUserLocale: () => 'en'
  }, 'Session');

  const ScriptApp = guard({
    getService: () => guard({ getUrl: () => H.cfg.url || '', isEnabled: () => true }, 'Service'),
    getScriptId: () => H.cfg.sid || '',
    AuthMode: enumOf('AuthMode'), EventType: enumOf('EventType'), TriggerSource: enumOf('TriggerSource')
  }, 'ScriptApp');

  function htmlOut(content) {
    const o = { _c: String(content || ''), _t: '' };
    const p = guard(o, 'HtmlOutput');
    Object.assign(o, {
      getContent: () => o._c, setContent: c => { o._c = String(c); return p; }, append: c => { o._c += String(c); return p; },
      getTitle: () => o._t, setTitle: t => { o._t = t; return p; }, addMetaTag: () => p, setXFrameOptionsMode: () => p,
      setFaviconUrl: () => p, setSandboxMode: () => p, setWidth: () => p, setHeight: () => p, getBlob: () => blob(o._c, 'text/html', 'page.html')
    });
    return p;
  }
  function template(src) {
    const t = {};
    t.evaluate = function () {
      let code = 'var __o = "";\n', last = 0, m;
      const re = /<\?(!=|=)?([\s\S]*?)\?>/g;
      while ((m = re.exec(src))) {
        code += '__o += ' + JSON.stringify(src.substring(last, m.index)) + ';\n';
        if (m[1] === '!=') code += '__o += String((' + m[2] + '));\n';
        else if (m[1] === '=') code += '__o += String((' + m[2] + ')).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");\n';
        else code += m[2] + '\n';
        last = re.lastIndex;
      }
      code += '__o += ' + JSON.stringify(src.substring(last)) + ';\n__o';
      const vars = Object.keys(t).filter(k => k !== 'evaluate' && k !== 'getRawContent' && k !== 'getCode');
      const fn = vm.runInContext('(function(' + vars.join(',') + '){' + code + '})', H.ctx);
      return htmlOut(fn.apply(null, vars.map(k => t[k])));
    };
    t.getRawContent = () => src;
    return t;
  }
  const HtmlService = guard({
    createHtmlOutput: h => htmlOut(h),
    createHtmlOutputFromFile: n => htmlOut(H.html(n)),
    createTemplateFromFile: n => template(H.html(n)),
    createTemplate: s => template(String(s)),
    XFrameOptionsMode: enumOf('XFrameOptionsMode'), SandboxMode: enumOf('SandboxMode')
  }, 'HtmlService');

  const ContentService = guard({
    createTextOutput: t => { const o = { _c: String(t || '') }; const p = guard(o, 'TextOutput'); o.setMimeType = () => p; o.getContent = () => o._c; o.append = c => { o._c += c; return p; }; o.setContent = c => { o._c = String(c); return p; }; return p; },
    MimeType: enumOf('MimeType')
  }, 'ContentService');

  const quiet = { log() {}, info() {}, warn() {}, error() {}, debug() {}, time() {}, timeEnd() {}, trace() {} };
  const g = {
    console: quiet,
    Date,
    NF_HOST: true,
    Logger: { log() { return g.Logger; }, getLog: () => '', clear() {} },
    SpreadsheetApp, PropertiesService, CacheService, LockService, Utilities, Session, ScriptApp, HtmlService, ContentService,
    MimeType: enumOf('MimeType')
  };
  ['DriveApp', 'MailApp', 'GmailApp', 'UrlFetchApp', 'DocumentApp', 'SlidesApp', 'FormApp', 'CalendarApp', 'Charts', 'Maps', 'LanguageApp',
    'XmlService', 'Sheets', 'Drive', 'Jdbc', 'CardService', 'ContactsApp', 'GroupsApp', 'Browser', 'AdminDirectory', 'Gmail', 'People']
    .forEach(n => { g[n] = service(n); });
  return g;
}

export { makeGlobals, formatDate, parseDate, formatString, parseCsv };
