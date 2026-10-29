const EPOCH = Date.UTC(1899, 11, 30);
const DAY = 86400000;
const fmtCache = new Map();
const offCache = new Map();

function localTz() { return process.env.TZ || 'UTC'; }

function partsIn(tz, ms) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    fmtCache.set(tz, f);
  }
  const o = {};
  for (const p of f.formatToParts(new Date(ms))) if (p.type !== 'literal') o[p.type] = Number(p.value);
  return o;
}

function offsetAt(tz, ms) {
  const fixed = /^(?:GMT|UTC)?([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(String(tz || '').trim());
  if (fixed) return (fixed[1] === '-' ? -1 : 1) * (Number(fixed[2]) * 3600000 + Number(fixed[3] || 0) * 60000);
  if (/^(GMT|UTC|Z)$/i.test(String(tz || '').trim())) return 0;
  const base = ms - (ms % 1000 + 1000) % 1000;
  const p = partsIn(tz, base);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour === 24 ? 0 : p.hour, p.minute, p.second) - base;
}

function wallToInstant(wall, tz) {
  const k = tz + '|' + Math.floor(wall / DAY);
  let off = offCache.get(k);
  if (off === undefined) {
    const g = wall - offsetAt(tz, wall);
    off = offsetAt(tz, g);
    if (offCache.size > 50000) offCache.clear();
    offCache.set(k, off);
  }
  return wall - off;
}

function serialToDate(s, tz) {
  let days = Math.floor(s), ms = Math.round((s - days) * DAY);
  if (ms >= DAY) { days += 1; ms -= DAY; }
  const wall = EPOCH + days * DAY + ms;
  if (!tz || tz === localTz()) {
    const u = new Date(wall);
    const d = new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate(), u.getUTCHours(), u.getUTCMinutes(), u.getUTCSeconds(), u.getUTCMilliseconds());
    if (u.getUTCFullYear() < 100) d.setFullYear(u.getUTCFullYear());
    return d;
  }
  return new Date(wallToInstant(wall, tz));
}

function rowsFromApi(a, b, tz) {
  const out = [];
  let w = 0;
  for (let i = 0; i < a.length; i++) {
    const ra = a[i] || [], rb = b[i] || [], row = new Array(ra.length);
    for (let j = 0; j < ra.length; j++) {
      const v = ra[j];
      if (v === null || v === undefined) row[j] = '';
      else if (typeof v === 'number' && typeof rb[j] === 'string') row[j] = serialToDate(v, tz);
      else row[j] = v;
    }
    if (row.length > w) w = row.length;
    out.push(row);
  }
  return { v: out, w };
}

function formulasFromApi(a) {
  return (a || []).map(r => (r || []).map(v => (typeof v === 'string' && v.charAt(0) === '=') ? v : ''));
}

function metaFromApi(j) {
  const p = j.properties || {};
  return {
    title: p.title || '',
    tz: p.timeZone || localTz(),
    locale: p.locale || 'en_IN',
    sheets: (j.sheets || []).map(s => {
      const q = s.properties || {}, g = q.gridProperties || {};
      return { t: q.title, id: q.sheetId, i: q.index || 0, h: !!q.hidden, r: g.rowCount || 1000, c: g.columnCount || 26, fr: g.frozenRowCount || 0 };
    })
  };
}

function dvFromApi(j) {
  const sh = (j.sheets || [])[0] || {}, d = (sh.data || [])[0] || {};
  const rows = (d.rowData || []).map(r => (r.values || []).map(v => {
    const dv = v && v.dataValidation;
    if (!dv || !dv.condition) return null;
    const c = dv.condition, vals = (c.values || []).map(x => x.userEnteredValue !== undefined ? x.userEnteredValue : (x.relativeDate || ''));
    return { type: c.type || '', values: vals, strict: !!dv.strict, ui: dv.showCustomUi !== false, help: dv.inputMessage || '' };
  }));
  return { r0: d.startRow || 0, c0: d.startColumn || 0, rows };
}

function pack(data) {
  return JSON.stringify(data, function (k, v) { const x = this[k]; return x instanceof Date ? '\u0001' + x.getTime() : v; });
}
function unpack(text) {
  return JSON.parse(text, (k, v) => (typeof v === 'string' && v.charCodeAt(0) === 1) ? new Date(Number(v.slice(1))) : v);
}

export { serialToDate, rowsFromApi, formulasFromApi, metaFromApi, dvFromApi, pack, unpack, offsetAt, partsIn, localTz };
