import { createServer } from '../fast/server.mjs';
import app from '../fast/app.mjs';
const server = createServer({ app });
const HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
export default async (request, context) => {
  if (request.method !== 'POST') {
    let st;
    try { st = await server.status(); } catch (e) { st = { ready: false, error: String(e && e.message || e) }; }
    return new Response(JSON.stringify(st, null, 2), { status: 200, headers: HEADERS });
  }
  const t0 = Date.now();
  let out, act = '';
  try {
    const body = await request.text();
    act = (/"action"\s*:\s*"([^"]{1,60})"/.exec(body) || [])[1] || '';
    const wait = context && typeof context.waitUntil === 'function' ? (p) => context.waitUntil(p) : null;
    out = await server.handle(body, { waitUntil: wait });
  } catch (e) { out = { gas: true, why: 'error', text: '{"ok":false,"gas":1,"why":"error"}' }; }
  if (act !== 'fast.sync') {
    const what = out.gas ? (/"what":"([^"]{1,80})"/.exec(out.text) || [])[1] : '';
    console.log(act + ' ' + (Date.now() - t0) + 'ms ' + (out.gas ? 'apps-script:' + out.why + (what ? ' ' + what : '') : 'fast'));
  }
  return new Response(out.text, { status: 200, headers: HEADERS });
};
export const config = { path: '/api' };
