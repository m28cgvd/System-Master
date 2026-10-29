import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = process.cwd();
const JOBS = [['web.zip', [], 'web', 'index.html'], ['server.zip', ['netlify.zip'], 'server', path.join('fast', 'server.mjs')]];

function find(name) {
  const hit = fs.readdirSync(root).filter(f => f.toLowerCase() === name);
  if (hit.length > 1) throw new Error('More than one ' + name + ' in the repository: ' + hit.join(', '));
  return hit.length ? path.join(root, hit[0]) : '';
}

function entries(buf, file) {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error(file + ' is not a zip file.');
  const count = buf.readUInt16LE(e + 10);
  let p = buf.readUInt32LE(e + 16);
  const out = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error(file + ' is damaged.');
    const flags = buf.readUInt16LE(p + 8), method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nlen).toString(flags & 0x800 ? 'utf8' : 'latin1').replace(/\\/g, '/');
    p += 46 + nlen + xlen + clen;
    const start = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
    out.push({ name, method, data: buf.subarray(start, start + size) });
  }
  return out;
}

function strip(list) {
  for (;;) {
    const files = list.filter(x => x.name && !x.name.endsWith('/'));
    if (!files.length || !files.every(x => x.name.indexOf('/') > 0)) return list;
    const tops = new Set(files.map(x => x.name.split('/')[0]));
    if (tops.size !== 1) return list;
    const t = tops.values().next().value + '/';
    list.forEach(x => { x.name = x.name.startsWith(t) ? x.name.slice(t.length) : ''; });
  }
}

function unpack(file, dir) {
  const list = strip(entries(fs.readFileSync(file), path.basename(file)));
  const base = path.join(root, dir);
  fs.rmSync(base, { recursive: true, force: true });
  let n = 0;
  for (const x of list) {
    if (!x.name || x.name.endsWith('/')) continue;
    const to = path.join(base, x.name);
    if (!to.startsWith(base + path.sep)) throw new Error(path.basename(file) + ' has a file outside its folder: ' + x.name);
    const data = x.method === 0 ? x.data : x.method === 8 ? zlib.inflateRawSync(x.data) : null;
    if (!data) throw new Error(path.basename(file) + ': ' + x.name + ' is packed in a way this build cannot read. Make the zip with Windows (Send to ▸ Compressed folder).');
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, data);
    n++;
  }
  return n;
}

const NO_CACHE = { 'Cache-Control': 'no-cache' };

function vercelOutput() {
  const out = path.join(root, '.vercel', 'output');
  fs.rmSync(out, { recursive: true, force: true });
  fs.cpSync(path.join(root, 'web'), path.join(out, 'static'), { recursive: true, filter: (src) => !/[\\/](vercel\.json|_headers)$/.test(src) });
  const fn = path.join(out, 'functions', 'api.func');
  fs.cpSync(path.join(root, 'server', 'fast'), path.join(fn, 'fast'), { recursive: true });
  fs.cpSync(path.join(root, 'server', 'vercel'), path.join(fn, 'vercel'), { recursive: true });
  const region = String(process.env.CG_REGION || 'bom1').trim();
  fs.writeFileSync(path.join(fn, '.vc-config.json'), JSON.stringify({
    runtime: 'nodejs22.x', handler: 'vercel/index.mjs', launcherType: 'Nodejs', shouldAddHelpers: false,
    maxDuration: 60, memory: 1024, regions: [region]
  }, null, 2));
  fs.writeFileSync(path.join(out, 'config.json'), JSON.stringify({
    version: 3,
    routes: [
      { src: '^/(index\\.html)?$', headers: NO_CACHE, continue: true },
      { src: '^/(config\\.js|sw\\.js|manifest\\.webmanifest|version\\.json)$', headers: NO_CACHE, continue: true },
      { src: '^/b/(.*)$', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
      { src: '^/api$', headers: { 'Cache-Control': 'no-store' }, continue: true },
      { handle: 'filesystem' }
    ]
  }, null, 2));
  return region;
}

try {
  const lines = [];
  for (const [name, other, dir, must] of JOBS) {
    let f = find(name);
    for (let i = 0; !f && i < other.length; i++) f = find(other[i]);
    if (f) lines.push(path.basename(f) + ' → ' + dir + '/ (' + unpack(f, dir) + ' files)');
    else lines.push(name + ' not found — using the ' + dir + ' folder as it is');
    if (!fs.existsSync(path.join(root, dir, must))) throw new Error(dir + '/' + must.replace(/\\/g, '/') + ' is missing. Upload ' + name + ' again.');
  }
  if (process.env.VERCEL) {
    if (!fs.existsSync(path.join(root, 'server', 'vercel', 'index.mjs'))) throw new Error('server.zip is from before 2.9.4 (no vercel/index.mjs). Upload the new server.zip.');
    lines.push('fast server → /api (region ' + vercelOutput() + ')');
  }
  let v = '';
  try { v = JSON.parse(fs.readFileSync(path.join(root, 'web', 'version.json'), 'utf8')).version || ''; } catch (e) { v = ''; }
  console.log(lines.join('\n') + '\nOne Login web version ' + (v || 'unknown'));
} catch (e) {
  console.error('One Login build stopped: ' + e.message);
  process.exit(1);
}
