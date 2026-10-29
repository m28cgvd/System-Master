import * as C from './convert.mjs';
import { createCore, sha } from './core.mjs';
import * as google from './google.mjs';
import * as blobs from './blobs.mjs';

function readConfig(env) {
  let c = {};
  try {
    const raw = String(env.CG_FAST_CONFIG || '').trim();
    if (raw) c = JSON.parse(raw.charAt(0) === '{' ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  } catch (e) { c = {}; }
  const props = { CG_SECRET: c.s || env.CG_SECRET || '', HUB_SHEET_ID: c.h || env.HUB_SHEET_ID || '' };
  if (c.o || env.CG_SSO_SECRET) props.CG_SSO_SECRET = c.o || env.CG_SSO_SECRET;
  if (c.u || env.CG_WEBAPP_URL) props.CG_WEBAPP_URL = c.u || env.CG_WEBAPP_URL;
  return {
    hub: props.HUB_SHEET_ID, owner: c.e || env.CG_OWNER_EMAIL || '', url: c.u || env.CG_WEBAPP_URL || '',
    tz: c.z || env.CG_TZ || 'Asia/Kolkata', sid: c.i || '', props, ok: !!(props.CG_SECRET && props.HUB_SHEET_ID)
  };
}

function limit(p, ms) {
  let t;
  return Promise.race([p, new Promise((res, rej) => { t = setTimeout(() => rej(new Error('timeout')), ms); })]).finally(() => clearTimeout(t));
}

function parseKey(key) {
  const kind = key.charAt(0), rest = key.slice(2), i = rest.indexOf('|');
  if (kind === 'm' || kind === 'M') return { kind, id: rest, key };
  if (i < 1) return null;
  const id = rest.slice(0, i), tail = rest.slice(i + 1);
  if (kind === 'd') { const j = tail.lastIndexOf('|'); return { kind, id, tab: tail.slice(0, j), a1: tail.slice(j + 1), key }; }
  return { kind, id, tab: tail, key };
}

function createServer(opt) {
  const env = opt.env || process.env;
  const cfg = readConfig(env);
  process.env.TZ = cfg.tz;
  const g = google.client(env, opt.fetch);
  cfg.ok = cfg.ok && g.ok && !/^(1|yes|true|on)$/i.test(String(env.FAST_OFF || ''));
  const num = (v, d) => { const n = Number(v); return String(v === undefined ? '' : v).trim() !== '' && !isNaN(n) ? n : d; };
  const core = createCore({ src: opt.app.SRC, html: opt.app.HTML, cfg, ttl: num(env.FAST_TTL, 120), metaTtl: num(env.FAST_META_TTL, 900), stale: num(env.FAST_STALE, 600) });
  const S = core.S;
  S.syncAt = 0; S.learnLoaded = false; S.learnSaved = 0; S.bgAt = new Map(); S.coolPend = 0; S.coolHits = 0;
  const stats = { google: 0, blobGet: 0, blobHit: 0, blobSet: 0, stale: 0, refresh: 0, busy: 0, since: Date.now() };

  function store() { try { return blobs.open('cg-fast', opt.fetch); } catch (e) { return null; } }
  function blobKey(p) { return p.kind === 'm' ? 'm_' + sha(p.id) : 't_' + sha(p.kind + '|' + p.id + '|' + (p.tab || '') + '|' + (p.a1 || '')); }
  function mapFor(kind) { return kind === 'v' ? S.vals : kind === 'f' ? S.forms : S.dvs; }
  function mapKey(p) { return p.kind === 'm' ? p.id : p.id + '|' + p.tab + (p.kind === 'd' ? '|' + p.a1 : ''); }
  function snapKey(p) { return p.kind === 'm' ? 'm|' + p.id : p.kind + '|' + p.id + '|' + p.tab + (p.kind === 'd' ? '|' + p.a1 : ''); }

  function mergeLearn(j) {
    if (!j) return;
    Object.keys(j.a || {}).forEach(a => { if (!S.learn[a]) S.learn[a] = j.a[a]; });
  }

  async function prep(R) {
    const jobs = [];
    if (g.ok) jobs.push(g.token().catch(() => null));
    const st = store();
    if (st) {
      if (Date.now() - S.syncAt > 1500) {
        jobs.push(limit(st.getJSON('sync', true), 1500).then(j => {
          if (j && j.m) core.mergeMarks(j.m);
          if (j && Number(j.cool) > S.cool) S.cool = Number(j.cool);
          S.syncAt = Date.now();
        }).catch(() => {}));
      }
      if (!S.learnLoaded) {
        jobs.push(limit(st.getJSON('learn', true), 1500).then(j => { S.learnLoaded = true; mergeLearn(j); }).catch(() => { S.learnLoaded = true; }));
      }
    }
    await Promise.all(jobs);
    core.pruneMarks();
  }

  function fail(R, e, id, prefetch) {
    const code = e && e.code;
    let why = 'error';
    if (code === 429) { S.cool = Math.max(S.cool, Date.now() + 30000); S.coolPend = S.cool; S.coolHits++; why = 'busy'; }
    else if (code === 404 || (code === 400 && e.meta)) { S.gone.set(id, Date.now() + 600000); return; }
    else if (code === 403) { S.deny.set(id, Date.now() + 600000); why = 'access'; }
    else if (code === 401) why = 'auth';
    if (!prefetch && !R.fail) R.fail = why;
  }

  function took(R, p, e) { R.snap.set(snapKey(p), e); }

  async function fromBlobs(st, R, list) {
    await Promise.all(list.map(async p => {
      stats.blobGet++;
      let j = null;
      try { j = await limit(st.getJSON(blobKey(p), true), 2000); } catch (e) { j = null; }
      if (!j || j.k !== (p.kind === 'm' ? 'm|' + p.id : snapKey(p))) return;
      const st0 = core.state({ at: j.at }, p.id, p.kind === 'm' ? '#' : p.tab, R);
      if (!st0) return;
      let data;
      try { data = p.kind === 'v' ? C.unpack(j.d) : JSON.parse(j.d); } catch (e) { return; }
      const e = core.store(p.kind, p.id, p.tab, p.a1, data, j.at, j.sum);
      stats.blobHit++;
      p.done = true;
      took(R, p, e);
      if (st0 === 1) { R.bg.add(snapKey(p)); stats.stale++; }
    }));
  }

  async function googleMeta(R, id) {
    const at = Date.now();
    stats.google++;
    let r;
    try { r = await g.meta(id); } catch (err) { err.meta = true; throw err; }
    const e = core.store('m', id, '', '', C.metaFromApi(r.json), at, sha(r.text));
    R.pub.push({ kind: 'm', id, e });
    took(R, { kind: 'm', id }, e);
    return e;
  }

  async function googleValues(R, id, tabs, metaP) {
    if (!tabs.length) return;
    const at = Date.now();
    stats.google += 2;
    let rs, rf;
    try {
      [rs, rf] = await Promise.all([g.values(id, tabs, 's'), g.values(id, tabs, 'f')]);
    } catch (e) {
      if (e && e.code === 400) {
        const me = await googleMeta(R, id);
        const names = new Set(me.data.sheets.map(s => s.t));
        const keep = tabs.filter(t => names.has(t));
        tabs.filter(t => !names.has(t)).forEach(t => R.absent.add(id + '|' + t));
        if (!keep.length || keep.length === tabs.length) throw e;
        return googleValues(R, id, keep, Promise.resolve(me));
      }
      throw e;
    }
    const me = await metaP;
    const tz = me ? me.data.tz : cfg.tz;
    const A = rs.json.valueRanges || [], B = rf.json.valueRanges || [];
    tabs.forEach((t, i) => {
      const a = (A[i] && A[i].values) || [], b = (B[i] && B[i].values) || [];
      const data = C.rowsFromApi(a, b, tz);
      let cells = 0; for (const row of data.v) cells += row.length;
      data.cells = cells;
      const e = core.store('v', id, t, '', data, at, sha(JSON.stringify(a) + '\u0000' + JSON.stringify(b)));
      R.pub.push({ kind: 'v', id, tab: t, e });
      took(R, { kind: 'v', id, tab: t }, e);
    });
  }

  async function googleFormulas(R, id, tabs) {
    if (!tabs.length) return;
    const at = Date.now();
    stats.google++;
    const r = await g.values(id, tabs, 'F');
    const A = r.json.valueRanges || [];
    tabs.forEach((t, i) => {
      const raw = (A[i] && A[i].values) || [];
      const e = core.store('f', id, t, '', C.formulasFromApi(raw), at, sha(JSON.stringify(raw)));
      R.pub.push({ kind: 'f', id, tab: t, e });
      took(R, { kind: 'f', id, tab: t }, e);
    });
  }

  async function googleDv(R, p) {
    const at = Date.now();
    stats.google++;
    const r = await g.dv(p.id, p.tab, p.a1);
    const e = core.store('d', p.id, p.tab, p.a1, C.dvFromApi(r.json), at, sha(r.text));
    R.pub.push({ kind: 'd', id: p.id, tab: p.tab, a1: p.a1, e });
    took(R, p, e);
  }

  function takeIf(R, p, e, tab) {
    const st = core.state(e, p.id, tab, R);
    if (!st) return false;
    e.used = R.t0;
    took(R, p, e);
    if (st === 1) { R.bg.add(snapKey(p)); stats.stale++; }
    return true;
  }

  function fallback(R, id, left) {
    let all = true;
    if (!R.snap.has('m|' + id)) { const e = S.meta.get(id); if (!e || !takeIf(R, { kind: 'm', id }, e, '#')) all = false; }
    left.forEach(p => {
      if (p.kind === 'm' || R.snap.has(snapKey(p)) || R.absent.has(p.id + '|' + p.tab)) return;
      const e = mapFor(p.kind).get(mapKey(p));
      if (!e || !takeIf(R, p, e, p.tab)) all = false;
    });
    return all;
  }

  async function loadBook(id, list, R, prefetch) {
    if ((S.deny.get(id) || 0) > R.t0) { if (!prefetch && !R.fail) R.fail = 'access'; return; }
    const force = list.some(p => p.kind === 'M');
    const want = [];
    if (!R.snap.has('m|' + id)) {
      const e = force ? null : S.meta.get(id);
      if (!(e && takeIf(R, { kind: 'm', id }, e, '#')) && !force) want.push({ kind: 'm', id });
    }
    const uniq = new Map();
    list.forEach(p => { if (p.kind !== 'm' && p.kind !== 'M') uniq.set(snapKey(p), p); });
    for (const p of uniq.values()) {
      if (R.snap.has(snapKey(p))) continue;
      const e = mapFor(p.kind).get(mapKey(p));
      if (e && takeIf(R, p, e, p.tab)) continue;
      want.push(p);
    }
    const st = store();
    if (st && want.length) await fromBlobs(st, R, want);
    const left = want.filter(p => !p.done);
    if (!left.length && !force) return;
    if (S.cool > Date.now() || !g.ok) { if (!prefetch && !R.fail) { stats.busy++; R.fail = 'busy'; } return; }
    try {
      await fetchBook(id, left, R, force);
    } catch (e) {
      if (!(e && e.code === 429) || force) throw e;
      S.cool = Math.max(S.cool, Date.now() + 30000); S.coolPend = S.cool; S.coolHits++;
      if (!fallback(R, id, left)) throw e;
    }
  }

  async function fetchBook(id, left, R, force) {
    let metaP = Promise.resolve(R.snap.get('m|' + id) || null);
    if (force || left.some(p => p.kind === 'm')) metaP = googleMeta(R, id);
    let names = null;
    if (!R.snap.get('m|' + id) || force) {
      const me = await metaP;
      names = new Set(me.data.sheets.map(s => s.t));
    }
    const exists = p => !names || names.has(p.tab) || (R.absent.add(p.id + '|' + p.tab), false);
    const vt = left.filter(p => p.kind === 'v' && exists(p)).map(p => p.tab);
    if (vt.length) {
      const known = R.snap.get('m|' + id) || S.meta.get(id);
      const have = known ? new Set(known.data.sheets.map(s => s.t)) : null;
      const half = core.ttl / 2;
      S.vals.forEach((e, k) => {
        if (k.indexOf(id + '|') !== 0) return;
        const t = k.slice(id.length + 1);
        if (vt.indexOf(t) >= 0 || R.snap.has('v|' + k)) return;
        if (R.t0 - (e.used || 0) > 600000 || R.t0 - e.at < half) return;
        if (have && !have.has(t)) return;
        vt.push(t);
      });
    }
    const ft = left.filter(p => p.kind === 'f' && exists(p)).map(p => p.tab);
    const dl = left.filter(p => p.kind === 'd' && exists(p));
    await Promise.all([metaP, googleValues(R, id, vt, metaP), googleFormulas(R, id, ft)].concat(dl.map(p => googleDv(R, p))));
  }

  async function load(keys, R, prefetch) {
    const by = new Map();
    keys.forEach(k => {
      const p = parseKey(k);
      if (!p) return;
      if (!by.has(p.id)) by.set(p.id, []);
      by.get(p.id).push(p);
    });
    await Promise.all(Array.from(by, ([id, list]) => loadBook(id, list, R, prefetch).catch(e => fail(R, e, id, prefetch))));
  }

  async function syncMerge(st) {
    const pend = S.pendSy, coolP = S.coolPend;
    S.pendSy = {}; S.coolPend = 0;
    try {
      const j = (await limit(st.getJSON('sync', true), 2000)) || { m: {} };
      const m = j.m || {}, now = Date.now(), cut = now - 15 * 60000;
      Object.keys(pend).forEach(k => { if ((m[k] || 0) < pend[k]) m[k] = pend[k]; });
      Object.keys(m).forEach(k => { if (m[k] < cut) delete m[k]; });
      const cool = Math.max(Number(j.cool) || 0, coolP);
      const doc = { m, t: now };
      if (cool > now) doc.cool = cool;
      await limit(st.setJSON('sync', doc), 2000);
      core.mergeMarks(m);
      if (cool > S.cool) S.cool = cool;
    } catch (e) {
      Object.keys(pend).forEach(k => { if ((S.pendSy[k] || 0) < pend[k]) S.pendSy[k] = pend[k]; });
      if (coolP > S.coolPend) S.coolPend = coolP;
    }
  }

  async function learnSave(st) {
    S.learnDirty = false;
    S.learnSaved = Date.now();
    try {
      const j = (await limit(st.getJSON('learn', true), 2000)) || {};
      j.a = Object.assign(j.a || {}, S.learn);
      delete j.g;
      await limit(st.setJSON('learn', j, true), 3000);
    } catch (e) { S.learnDirty = true; }
  }

  async function publish(R) {
    const st = store();
    if (!st) return;
    const jobs = (R ? R.pub : []).map(p => {
      stats.blobSet++;
      const d = p.kind === 'v' ? C.pack(p.e.data) : JSON.stringify(p.e.data);
      return limit(st.setJSON(blobKey(p), { k: snapKey(p), at: p.e.at, sum: p.e.sum, d }, true), 4000).catch(() => {});
    });
    if (Object.keys(S.pendSy).length || S.coolPend) jobs.push(syncMerge(st));
    if (S.learnDirty && Date.now() - S.learnSaved > 30000) jobs.push(learnSave(st));
    await Promise.all(jobs);
  }

  async function refresh(R) {
    if (!R || !R.bg || !R.bg.size || S.cool > Date.now() || !g.ok) return;
    const now = Date.now(), keys = [];
    if (S.bgAt.size > 5000) S.bgAt = new Map();
    R.bg.forEach(k => { const t = S.bgAt.get(k) || 0; if (t >= 0 && t < now - 3000) { S.bgAt.set(k, -1); keys.push(k); } });
    if (!keys.length) return;
    stats.refresh++;
    try {
      const R2 = core.newReq({}, now);
      R2.noStale = true;
      await load(keys, R2, true);
      await publish(R2);
    } finally { const end = Date.now(); keys.forEach(k => S.bgAt.set(k, end)); }
  }

  async function handle(body, o2) {
    const it = core.serve(body);
    let step = it.next(), R = null;
    while (!step.done) {
      const v = step.value;
      if (v.R) { R = v.R; R.pub = R.pub || []; }
      try {
        if (v.prep) await prep(v.R);
        else if (v.load) await load(v.load, v.R, v.prefetch);
      } catch (e) { if (v.R && !v.prefetch && !v.R.fail) v.R.fail = 'error'; }
      step = it.next();
    }
    const res = step.value;
    core.evict(Number(env.FAST_CELLS) || 4000000);
    const p = publish(R).catch(() => {}).then(() => refresh(R)).catch(() => {});
    if (o2 && o2.waitUntil) o2.waitUntil(p); else await p;
    return res;
  }

  async function status() {
    const off = /^(1|yes|true|on)$/i.test(String(env.FAST_OFF || ''));
    const out = {
      version: opt.app.VERSION || '',
      config: cfg.props.CG_SECRET && cfg.hub ? 'ok' : 'CG_FAST_CONFIG missing or wrong',
      signIn: String(env.GOOGLE_REFRESH_TOKEN || '').trim() ? 'mis@ (refresh token)' : String(env.GOOGLE_SA_KEY || '').trim() ? 'service account' : 'missing',
      google: '', sheet: '', off: off,
      copies: { fresh: Math.round(core.ttl / 1000) + ' s', usable: Math.round(core.stale / 1000) + ' s', tabs: Math.round(core.metaTtl / 1000) + ' s' }
    };
    if (S.cool > Date.now()) out.googleLimit = 'reached — copies are used until ' + new Date(S.cool).toISOString();
    if (g.ok) {
      try { await g.token(); out.google = 'ok'; } catch (e) { out.google = 'failed: ' + String(e && e.message || e).slice(0, 200); }
      if (out.google === 'ok' && cfg.hub) {
        try { const r = await g.meta(cfg.hub); out.sheet = 'ok: ' + ((r.json.properties || {}).title || ''); } catch (e) { out.sheet = 'failed: ' + String(e && e.message || e).slice(0, 200); }
      }
    } else out.google = 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN missing';
    out.ready = out.config === 'ok' && out.google === 'ok' && /^ok/.test(out.sheet) && !off;
    out.thisServer = { since: new Date(stats.since).toISOString(), googleReads: stats.google, sharedCopies: stats.blobHit, oldCopiesUsed: stats.stale, backgroundRefreshes: stats.refresh, limitReached: S.coolHits, sentToAppsScript: stats.busy };
    return out;
  }

  return { handle, status, core, cfg, stats, google: g };
}

export { createServer, readConfig, parseKey };
