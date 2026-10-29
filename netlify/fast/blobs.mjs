import zlib from 'node:zlib';

function context() {
  let raw = globalThis.netlifyBlobsContext;
  if (!raw && globalThis.Netlify && globalThis.Netlify.env && typeof globalThis.Netlify.env.get === 'function') raw = globalThis.Netlify.env.get('NETLIFY_BLOBS_CONTEXT');
  if (!raw) raw = process.env.NETLIFY_BLOBS_CONTEXT;
  if (!raw) return null;
  try { return JSON.parse(Buffer.from(String(raw), 'base64').toString('utf8')); } catch (e) { return null; }
}

function open(storeName, fetchImpl) {
  const c = context();
  if (!c || !c.siteID || !c.token) return null;
  const doFetch = fetchImpl || globalThis.fetch;
  const name = 'site:' + storeName;
  const putHeaders = { 'cache-control': 'max-age=0, stale-while-revalidate=60' };

  async function request(method, key, body, strong) {
    if (c.edgeURL) {
      const baseUrl = strong && c.uncachedEdgeURL ? c.uncachedEdgeURL : c.edgeURL;
      const url = new URL('/' + c.siteID + '/' + name + '/' + key, baseUrl);
      const headers = { authorization: 'Bearer ' + c.token };
      if (method === 'PUT') Object.assign(headers, putHeaders);
      return doFetch(url.toString(), { method, headers, body });
    }
    const api = new URL('/api/v1/blobs/' + c.siteID + '/' + name + '/' + key, c.apiURL || 'https://api.netlify.com');
    const r = await doFetch(api.toString(), { method, headers: { authorization: 'Bearer ' + c.token, accept: 'application/json;type=signed-url' } });
    if (r.status !== 200) { await r.arrayBuffer().catch(() => null); throw new Error('blobs ' + method + ' ' + r.status); }
    const j = await r.json();
    return doFetch(j.url, { method, headers: method === 'PUT' ? putHeaders : undefined, body });
  }

  return {
    strong: !!(c.uncachedEdgeURL || !c.edgeURL),
    async get(key, strong) {
      const r = await request('GET', key, undefined, strong);
      if (r.status === 404) { await r.arrayBuffer().catch(() => null); return null; }
      if (r.status !== 200) { await r.arrayBuffer().catch(() => null); throw new Error('blobs get ' + r.status); }
      return Buffer.from(await r.arrayBuffer());
    },
    async set(key, buf) {
      const r = await request('PUT', key, buf);
      await r.arrayBuffer().catch(() => null);
      if (r.status !== 200) throw new Error('blobs set ' + r.status);
    },
    async getJSON(key, strong) {
      const b = await this.get(key, strong);
      if (!b) return null;
      return JSON.parse((b[0] === 0x1f && b[1] === 0x8b ? zlib.gunzipSync(b) : b).toString('utf8'));
    },
    async setJSON(key, obj, gzip) {
      const s = Buffer.from(JSON.stringify(obj), 'utf8');
      return this.set(key, gzip ? zlib.gzipSync(s, { level: 4 }) : s);
    },
    async getText(key, strong) {
      const b = await this.get(key, strong);
      if (!b) return null;
      return (b[0] === 0x1f && b[1] === 0x8b ? zlib.gunzipSync(b) : b).toString('utf8');
    },
    async setText(key, text) { return this.set(key, zlib.gzipSync(Buffer.from(text, 'utf8'), { level: 4 })); }
  };
}

export { open, context };
