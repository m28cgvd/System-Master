import vm from 'node:vm';
import crypto from 'node:crypto';
import { makeGlobals } from './shim.mjs';

const WRITE_RE = /^(auth\.(login|logout|password)|file\.|join\.submit|slip\.pdf|appr\.advHr|fms\.myDone|req\.(advance|leave|reimb|file)|oa\.write|apps\.(open|reveal)|vault\.(reveal|save|remove)|usr\.(save|endSessions|bulk)|set\.(save|run|appSave|appRemove|checklistSave|outletSave)|appr\.(adv(Resend|Close|Admin|Pay)|leave|reimb)|fast\.)|\.(save|submit|add|done|assign|unassign|update|create|approve|decide|request|place|receive|start|finish|remove|upload|deleteDate|saveRow|tableSave|refresh|edit|ulSave|editMany|excSave|excRemove|raise|bulk|replace|saveDay|shiftSave|grnSave|status|reject|docUpload|assetSave|changeDecide|salarySave|doerLink|write|personSave|userSave)$/;
const BROKEN_RE = /is not a function|Cannot read propert|is not defined|undefined is not|Cannot set propert|Maximum call stack|Unexpected token|null is not|is not iterable|is not a constructor|Invalid array length/;
const MISS = '__FAST_MISS__';
const NG = '__FAST_NG__';
const SKEW = 1500;
const HOLD = 15 * 60000;
const FILE_RE = /^(xlsx|xls|pdf|csv|zip)$/i;
const GONE = 'Unexpected error while getting the method or property openById on object SpreadsheetApp.';

function sha(s) { return crypto.createHash('sha1').update(s).digest('hex'); }

function createCore(o) {
  const ttl = o.ttlMs !== undefined ? Number(o.ttlMs) : Math.max(5, Number(o.ttl || 60)) * 1000;
  const metaTtl = Math.max(ttl, (o.metaTtl !== undefined ? Number(o.metaTtl) : 900) * 1000);
  const stale = Math.max(0, (o.stale !== undefined ? Number(o.stale) : 600) * 1000);
  const metaStale = stale ? Math.max(stale, 6 * 3600000) : 0;
  const COOL_FRESH = 300000;
  const COOL_STALE = 30 * 60000;
  const script = new vm.Script(o.src, { filename: 'cg-one-login.js' });
  const cfg = o.cfg;
  const S = {
    meta: new Map(), vals: new Map(), forms: new Map(), dvs: new Map(),
    cache: new Map(), cacheSize: 0, marks: {}, learn: {}, gas: {}, cool: 0, deny: new Map(), gone: new Map(),
    seenSy: new Set(), pendSy: {}, learnDirty: false, metaAt: new Map(), version: ''
  };

  function state(e, id, tab, R) {
    if (!e) return 0;
    const m = Math.max(S.marks[id + '|' + tab] || 0, S.marks[id + '|*'] || 0);
    if (m && e.at < m + SKEW) return 0;
    const fl = Math.max(R.floor, R.floors[id + '|' + tab] || 0, R.floors[id + '|*'] || 0);
    if (fl && e.at < fl) return 0;
    const age = R.t0 - e.at, cool = S.cool > R.t0, isMeta = tab === '#';
    if (age <= (isMeta ? metaTtl : cool ? Math.max(ttl, COOL_FRESH) : ttl)) return 2;
    if (R.noStale) return 0;
    if (age <= (isMeta ? Math.max(metaStale, cool ? COOL_STALE : 0) : cool ? Math.max(stale, COOL_STALE) : stale)) return 1;
    return 0;
  }
  function entryFresh(e, id, tab, R) { return state(e, id, tab, R) === 2; }

  function newReq(req, t0) {
    const refresh = req && (req.fresh || (req.data && req.data.force));
    return { t0, floor: refresh ? t0 - 1500 : 0, floors: {}, snap: new Map(), misses: new Set(), used: new Map(), ng: null, fail: null, metaRe: new Set(), pre: [], absent: new Set(), pub: [], bg: new Set(), noStale: false };
  }

  function storeOf(kind) { return kind === 'm' ? S.meta : kind === 'v' ? S.vals : kind === 'f' ? S.forms : S.dvs; }
  function split(key) {
    const kind = key.charAt(0), rest = key.slice(2);
    if (kind === 'm') return { kind, id: rest, tab: '#', mk: rest };
    const i = rest.indexOf('|'), id = rest.slice(0, i), tail = rest.slice(i + 1);
    if (kind === 'd') { const j = tail.lastIndexOf('|'); return { kind, id, tab: tail.slice(0, j), mk: id + '|' + tail }; }
    return { kind, id, tab: tail, mk: id + '|' + tail };
  }
  function lookup(R, key) {
    let e = R.snap.get(key);
    if (e) return e;
    const p = split(key);
    e = storeOf(p.kind).get(p.mk);
    const st = state(e, p.id, p.tab, R);
    if (!st) return null;
    e.used = R.t0; R.snap.set(key, e);
    if (st === 1) R.bg.add(key);
    return e;
  }
  function use(R, key, e) { R.used.set(key, e.sum); return e; }

  function miss(R, key) { R.misses.add(key); const err = new Error(MISS); err.fast = 1; throw err; }
  const EMPTY_DV = { r0: 0, c0: 0, rows: [] };

  function host(R) {
    const H = {
      cfg,
      ctx: null,
      version: () => S.version,
      ng(what) { if (!R.ng) { R.ng = what; if (o.trace) R.ngStack = new Error().stack; } const err = new Error(NG); err.fast = 2; throw err; },
      meta(id) {
        if (S.deny.get(id) > R.t0) H.ng('access ' + id);
        if (S.gone.get(id) > R.t0) throw new Error(GONE);
        const key = 'm|' + id, e = lookup(R, key);
        if (e) return use(R, key, e).data;
        R.misses.add(key);
        return { title: '', tz: cfg.tz, locale: 'en_IN', sheets: [], loose: true };
      },
      absent(id, t) {
        const e = R.snap.get('m|' + id);
        if (!e || R.metaRe.has(id) || R.t0 - e.at < 20000 || (S.metaAt.get(id) || 0) > R.t0 - 30000) { R.absent.add(id + '|' + t); return; }
        R.metaRe.add(id);
        miss(R, 'M|' + id);
      },
      tab(id, t) {
        const key = 'v|' + id + '|' + t, e = lookup(R, key);
        if (e) return use(R, key, e).data;
        R.misses.add(key);
        return { v: [], w: 0, cells: 0 };
      },
      formulas(id, t) {
        const key = 'f|' + id + '|' + t, e = lookup(R, key);
        if (e) return use(R, key, e).data;
        R.misses.add(key);
        return [];
      },
      dv(id, t, a1) {
        const key = 'd|' + id + '|' + t + '|' + a1, e = lookup(R, key);
        if (e) return use(R, key, e).data;
        R.misses.add(key);
        return EMPTY_DV;
      },
      html(n) {
        if (!Object.prototype.hasOwnProperty.call(o.html, n)) throw new Error('No HTML file named ' + n + ' was found.');
        return o.html[n];
      },
      cache: null
    };
    H.cache = memCache(R);
    return H;
  }

  function memCache(R) {
    const buf = new Map(), del = new Set();
    const now = () => Date.now();
    function valid(e) {
      if (!e || e.exp <= now()) return false;
      for (const [k, sum] of e.deps) { const cur = lookup(R, k); if (!cur || cur.sum !== sum) return false; }
      e.deps.forEach((sum, k) => R.used.set(k, sum));
      return true;
    }
    function get(k) {
      k = String(k);
      if (buf.has(k)) { const e = buf.get(k); if (e.exp <= now()) return null; e.deps.forEach((sum, d) => R.used.set(d, sum)); return e.v; }
      if (del.has(k)) return null;
      const e = S.cache.get(k);
      return valid(e) ? e.v : null;
    }
    function put(k, v, t) {
      k = String(k); v = String(v);
      if (k.length > 250) throw new Error('Argument too large: key');
      if (v.length > 100 * 1024) throw new Error('Argument too large: value');
      const secs = Math.min(Math.max(Number(t) || 600, 1), 21600);
      buf.set(k, { v, exp: now() + secs * 1000, deps: new Map(R.used) }); del.delete(k);
    }
    function remove(k) { k = String(k); buf.delete(k); del.add(k); }
    return {
      get, put, remove,
      getAll(ks) { const out = {}; (ks || []).forEach(k => { const v = get(k); if (v !== null) out[k] = v; }); return out; },
      putAll(obj, t) { Object.keys(obj || {}).forEach(k => put(k, obj[k], t)); },
      removeAll(ks) { (ks || []).forEach(remove); },
      commit() {
        del.forEach(k => { const e = S.cache.get(k); if (e) { S.cacheSize -= e.v.length; S.cache.delete(k); } });
        buf.forEach((e, k) => { const old = S.cache.get(k); if (old) { S.cacheSize -= old.v.length; S.cache.delete(k); } S.cache.set(k, e); S.cacheSize += e.v.length; });
        while (S.cacheSize > 48 * 1024 * 1024 && S.cache.size) { const k = S.cache.keys().next().value; S.cacheSize -= S.cache.get(k).v.length; S.cache.delete(k); }
      }
    };
  }

  function context(H) {
    const g = makeGlobals(H);
    g.globalThis = g;
    vm.createContext(g);
    H.ctx = g;
    script.runInContext(g);
    if (!S.version) { try { S.version = String(vm.runInContext('APP.VERSION', g)); } catch (e) { S.version = ''; } }
    return g;
  }

  function sign(text) {
    return crypto.createHmac('sha256', Buffer.from(String(cfg.props.CG_SECRET || ''), 'utf8')).update(Buffer.from(text, 'utf8')).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function applySy(list, R) {
    if (!Array.isArray(list) || !cfg.props.CG_SECRET) return 0;
    let n = 0;
    const now = Date.now();
    list.slice(0, 24).forEach(x => {
      if (!x || typeof x.k !== 'string' || typeof x.g !== 'string') return;
      const t = Number(x.t);
      if (!(t > now - 15 * 60000 && t < now + 120000)) return;
      if (!S.seenSy.has(x.g)) {
        if (sign(t + '\n' + encodeURIComponent(x.k)) !== x.g) return;
        S.seenSy.add(x.g);
        if (S.seenSy.size > 5000) S.seenSy.clear();
        x.k.split('\n').forEach(k => { if (!k) return; if ((S.marks[k] || 0) < t) S.marks[k] = t; if ((S.pendSy[k] || 0) < t) S.pendSy[k] = t; });
      }
      if (R) x.k.split('\n').forEach(k => { if (k && (R.floors[k] || 0) < t + SKEW) R.floors[k] = t + SKEW; });
      n++;
    });
    return n;
  }

  function mergeMarks(marks) {
    const now = Date.now();
    Object.keys(marks || {}).forEach(k => { const t = Number(marks[k]); if (t > now - 15 * 60000 && (S.marks[k] || 0) < t) S.marks[k] = t; });
  }
  function pruneMarks() {
    const cut = Date.now() - 15 * 60000;
    Object.keys(S.marks).forEach(k => { if (S.marks[k] < cut) delete S.marks[k]; });
  }

  function learned(act) {
    const L = S.learn[act];
    if (!L) return [];
    return Object.keys(L).filter(k => L[k] >= 0.5);
  }

  function learnUse(act, R, partial) {
    const L = S.learn[act] || {}, out = {};
    let ch = false;
    const used = new Set(Array.from(R.used.keys()).filter(k => R.snap.has(k)));
    Object.keys(L).forEach(k => {
      const s = used.has(k) ? Math.min(1, L[k] * 0.6 + 0.4) : (partial ? L[k] : L[k] * 0.6);
      if (s >= 0.2) out[k] = Math.round(s * 100) / 100;
      if (out[k] !== L[k]) ch = true;
    });
    used.forEach(k => { if (out[k] === undefined) { out[k] = 1; ch = true; } });
    const keys = Object.keys(out);
    if (keys.length > 60) { keys.sort((a, b) => out[b] - out[a]).slice(60).forEach(k => { delete out[k]; }); ch = true; }
    if (ch) { S.learn[act] = out; S.learnDirty = true; }
  }

  function store(kind, id, tab, a1, data, at, sum) {
    const e = { at, data, sum, used: at };
    if (kind === 'm') { S.meta.set(id, e); S.metaAt.set(id, at); }
    else if (kind === 'v') S.vals.set(id + '|' + tab, e);
    else if (kind === 'f') S.forms.set(id + '|' + tab, e);
    else if (kind === 'd') S.dvs.set(id + '|' + tab + '|' + a1, e);
    return e;
  }

  function evict(limitCells) {
    let cells = 0;
    S.vals.forEach(e => { cells += e.data.cells || 0; });
    if (cells <= limitCells) return;
    const list = Array.from(S.vals.entries()).sort((a, b) => (a[1].used || 0) - (b[1].used || 0));
    for (const [k, e] of list) { if (cells <= limitCells * 0.8) break; cells -= e.data.cells || 0; S.vals.delete(k); }
  }

  function clean(req) { const r = Object.assign({}, req); delete r.sy; delete r.nf; return r; }

  function gas(why, extra) { return { gas: true, why, text: JSON.stringify(Object.assign({ ok: false, gas: 1, why }, extra || {})) }; }

  function looksBroken(text) {
    if (text.indexOf('"ok":false') < 0) return '';
    try { const j = JSON.parse(text); return !j.ok && BROKEN_RE.test(String(j.error || '')) ? String(j.error) : ''; } catch (e) { return 'bad json'; }
  }

  function* serve(body) {
    const t0 = Date.now();
    let req;
    try { req = JSON.parse(body || '{}'); } catch (e) { return gas('bad'); }
    if (!req || typeof req !== 'object') return gas('bad');
    const act = String(req.action || '');
    if (act === 'fast.sync') { applySy(req.sy, null); return { sync: true, text: '{"ok":true}' }; }
    if (!cfg.ok) return gas('off');
    const hold = act + '|' + sha(String(req.token || '')).slice(0, 16);
    if (WRITE_RE.test(act) || (S.gas[hold] || 0) > t0) return gas('write');
    if (req.data && typeof req.data === 'object' && FILE_RE.test(String(req.data.format || ''))) return gas('file');
    const R = newReq(req, t0);
    yield { prep: true, R };
    applySy(req.sy, R);
    const pre = learned(act);
    if (pre.length) { R.pre = pre; yield { load: pre, R, prefetch: true }; R.fail = null; }
    const plain = clean(req);
    const seen = new Set();
    for (let round = 0; round < 16; round++) {
      const H = host(R);
      let out = null;
      R.ng = null;
      try {
        const g = context(H);
        out = g.api(plain);
      } catch (e) {
        if (!R.ng && !R.misses.size) return gas('error', { detail: String(e && e.message || e).slice(0, 200) });
      }
      if (R.misses.size) {
        const keys = Array.from(R.misses).filter(k => !seen.has(k));
        R.misses.clear();
        if (!keys.length) { learnUse(act, R, true); return gas('loop'); }
        keys.forEach(k => seen.add(k));
        R.loads = R.loads || [];
        R.loads.push(keys);
        yield { load: keys, R };
        if (R.fail) { learnUse(act, R, true); return gas(R.fail); }
        if (Date.now() - t0 > 8000) { learnUse(act, R, true); return gas('slow'); }
        continue;
      }
      if (R.ng) {
        if (!/^access /.test(R.ng)) {
          S.gas[hold] = t0 + HOLD;
          if (Object.keys(S.gas).length > 5000) S.gas = {};
          return gas('write', o.trace ? { what: R.ng, stack: R.ngStack } : { what: R.ng });
        }
        return gas('access');
      }
      if (typeof out !== 'string') return gas('error');
      const broken = looksBroken(out);
      if (broken) return gas('error', { detail: broken.slice(0, 200) });
      H.cache.commit();
      learnUse(act, R);
      return { text: out, rounds: round + 1, loads: R.loads || [] };
    }
    learnUse(act, R, true);
    return gas('rounds');
  }

  return { S, cfg, serve, store, state, entryFresh, newReq, applySy, mergeMarks, pruneMarks, sign, sha, evict, ttl, metaTtl, stale, WRITE_RE };
}

export { createCore, WRITE_RE, sha };
