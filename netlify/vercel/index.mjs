import { createServer } from '../fast/server.mjs';
import app from '../fast/app.mjs';

const server = createServer({ app });
const HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

function waitUntil() {
  try {
    const c = globalThis[Symbol.for('@vercel/request-context')];
    const x = c && typeof c.get === 'function' ? c.get() : null;
    return x && typeof x.waitUntil === 'function' ? (p) => x.waitUntil(p) : null;
  } catch (e) {
    return null;
  }
}

function readBody(req) {
  if (typeof req.body === 'string') return Promise.resolve(req.body);
  if (req.body && Buffer.isBuffer(req.body)) return Promise.resolve(req.body.toString('utf8'));
  return new Promise((resolve, reject) => {
    const parts = [];
    req.on('data', (c) => parts.push(c));
    req.on('end', () => resolve(Buffer.concat(parts).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res, text) {
  res.writeHead(200, HEADERS);
  res.end(text);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    let st;
    try { st = await server.status(); } catch (e) { st = { ready: false, error: String(e && e.message || e) }; }
    st.host = 'vercel' + (process.env.VERCEL_REGION ? ' ' + process.env.VERCEL_REGION : '');
    return send(res, JSON.stringify(st, null, 2));
  }
  const t0 = Date.now();
  let out, act = '';
  try {
    const body = await readBody(req);
    act = (/"action"\s*:\s*"([^"]{1,60})"/.exec(body) || [])[1] || '';
    out = await server.handle(body, { waitUntil: waitUntil() });
  } catch (e) {
    out = { gas: true, why: 'error', text: '{"ok":false,"gas":1,"why":"error"}' };
  }
  if (act !== 'fast.sync') {
    const what = out.gas ? (/"what":"([^"]{1,80})"/.exec(out.text) || [])[1] : '';
    console.log(act + ' ' + (Date.now() - t0) + 'ms ' + (out.gas ? 'apps-script:' + out.why + (what ? ' ' + what : '') : 'fast'));
  }
  send(res, out.text);
}
