'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'web');
const STATIC = path.join(__dirname, 'web-static');

function read(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8').replace(/\r\n/g, '\n');
}

function appConst(src, key) {
  const m = new RegExp('\\b' + key + ":\\s*'([^']*)'").exec(src);
  return m ? m[1] : '';
}

function bundleList(src) {
  const m = /var UI_BUNDLES = \[([^\]]*)\]/.exec(src);
  if (!m) throw new Error('UI_BUNDLES not found in Code.gs');
  return m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
}

function execUrl(raw) {
  const u = String(raw || '').trim();
  if (!u) return '';
  const m = /\/s\/([A-Za-z0-9_-]{20,})\/(exec|dev)\b/.exec(u);
  if (!m) throw new Error('That is not an Apps Script web app link (it should end in /exec): ' + u);
  return 'https://script.google.com/macros/s/' + m[1] + '/' + m[2];
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function write(rel, text) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function appSource() {
  const gs = fs.readdirSync(ROOT).filter((f) => /\.gs$/.test(f) && f !== 'CG_SSO.gs')
    .sort((a, b) => (a === 'Config.gs' ? -1 : b === 'Config.gs' ? 1 : a.localeCompare(b)));
  const html = {};
  fs.readdirSync(ROOT).filter((f) => /\.html$/.test(f)).sort().forEach((f) => { html[f.replace(/\.html$/, '')] = read(f); });
  const manifest = JSON.parse(read('appsscript.json'));
  return { SRC: gs.map((f) => read(f)).join('\n;\n'), HTML: html, TZ: manifest.timeZone || 'Asia/Kolkata', FILES: gs };
}

function writeServer() {
  const a = appSource();
  const version = appConst(read('Config.gs'), 'VERSION');
  const file = path.join(ROOT, 'netlify', 'fast', 'app.mjs');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'export default ' + JSON.stringify({ VERSION: version, TZ: a.TZ, SRC: a.SRC, HTML: a.HTML }) + ';\n');
  return a.FILES.length;
}

function build() {
  const config = read('Config.gs');
  const code = read('Code.gs');
  const version = appConst(config, 'VERSION');
  const buildDate = appConst(config, 'BUILD');
  const name = appConst(config, 'NAME') || 'Chai Govindam';
  const logo = appConst(config, 'LOGO');
  const bundles = bundleList(code);
  const core = { Styles: read('Styles.html'), Script: read('Script.html'), ViewsWork: read('ViewsWork.html') };
  const files = {};
  bundles.forEach((n) => { files[n] = read(n + '.html'); });

  const all = ['Styles', 'Script', 'ViewsWork'].map((n) => core[n]).concat(bundles.map((n) => files[n])).join('|');
  const uiv = crypto.createHash('md5').update(all, 'utf8').digest('hex').substring(0, 12);

  const configFile = path.join(OUT, 'config.js');
  const arg = process.argv[2];
  let api = '', fast = '';
  if (fs.existsSync(configFile)) {
    const old = fs.readFileSync(configFile, 'utf8');
    const m = /CG_API\s*=\s*'([^']*)'/.exec(old), f = /CG_FAST\s*=\s*'([^']*)'/.exec(old);
    api = m && m[1] ? execUrl(m[1]) : '';
    fast = f ? f[1] : '';
  }
  if (arg) api = execUrl(arg);
  if (process.argv[3] !== undefined) fast = process.argv[3] === 'off' ? '' : process.argv[3];

  fs.rmSync(path.join(OUT, 'b'), { recursive: true, force: true });
  bundles.forEach((n) => write('b/' + n + '.html', files[n]));

  const cg = { name: name, logo: logo, mark: '', version: version, build: buildDate, uiv: uiv, link: '', web: true };

  write('index.html', [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">',
    '<meta name="theme-color" content="#FBF6EE">',
    '<title>' + esc(name) + '</title>',
    '<link rel="icon" type="image/png" href="icon-192.png">',
    '<link rel="apple-touch-icon" href="icon-192.png">',
    '<link rel="manifest" href="manifest.webmanifest">',
    '<link rel="preconnect" href="https://script.google.com" crossorigin>',
    '<link rel="preconnect" href="https://script.googleusercontent.com" crossorigin>',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600&display=swap" rel="stylesheet">',
    '<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,450,0..1,0&display=block" rel="stylesheet">',
    core.Styles,
    '<script src="config.js"></script>',
    '</head>',
    '<body>',
    '<div id="boot"><div class="spinner"></div></div>',
    '<div id="app"></div>',
    '<div id="toasts"></div>',
    '<script>',
    'var CG = ' + JSON.stringify(cg) + ';',
    'try { var cgApp = JSON.parse(localStorage.getItem(\'cg1_app\') || \'null\'); if (cgApp) { CG.name = cgApp.name || CG.name; CG.logo = cgApp.logo || CG.logo; CG.mark = cgApp.mark || \'\'; } } catch (e) {}',
    'CG.link = location.origin + location.pathname;',
    'if (window.CG_API && /[?&]page=/.test(location.search)) { CG.away = true; location.replace(window.CG_API + location.search); }',
    '</script>',
    core.Script,
    core.ViewsWork,
    '<script>',
    'if (CG.away) {}',
    'else if (window.CG_API) boot();',
    'else { document.getElementById(\'boot\').classList.add(\'hide\'); document.getElementById(\'app\').innerHTML = \'<div class="login-wrap"><div class="login-card"><h1>Web app link missing</h1><p class="sub">Open config.js in this folder, paste the Apps Script web app link (it ends in /exec) between the quotes and upload the folder again.</p></div></div>\'; }',
    'if (\'serviceWorker\' in navigator && location.protocol === \'https:\') window.addEventListener(\'load\', function () { navigator.serviceWorker.register(\'sw.js\').catch(function () {}); });',
    '</script>',
    '</body>',
    '</html>',
    ''
  ].join('\n'));

  write('config.js', "window.CG_API = '" + api + "';\n" + (fast ? "window.CG_FAST = '" + fast + "';\n" : ''));

  write('sw.js', [
    "var CACHE = 'cg1-" + uiv + "';",
    '',
    "self.addEventListener('install', function () { self.skipWaiting(); });",
    '',
    "self.addEventListener('activate', function (e) {",
    '  e.waitUntil(caches.keys().then(function (keys) {',
    "    return Promise.all(keys.filter(function (k) { return k !== CACHE && k.indexOf('cg1-') === 0; }).map(function (k) { return caches.delete(k); }));",
    '  }).then(function () { return self.clients.claim(); }));',
    '});',
    '',
    "self.addEventListener('fetch', function (e) {",
    '  var req = e.request, url = new URL(req.url);',
    "  if (req.method !== 'GET' || url.origin !== location.origin) return;",
    "  e.respondWith(url.pathname.indexOf('/b/') >= 0 ? fromCache(req) : fromNetwork(req));",
    '});',
    '',
    'function fromCache(req) {',
    '  return caches.open(CACHE).then(function (c) {',
    '    return c.match(req).then(function (hit) {',
    '      return hit || fetch(req).then(function (res) { if (res.ok) c.put(req, res.clone()); return res; });',
    '    });',
    '  });',
    '}',
    '',
    'function fromNetwork(req) {',
    '  return caches.open(CACHE).then(function (c) {',
    '    var net = fetch(req).then(function (res) { if (res.ok) c.put(req, res.clone()); return res; });',
    '    var slow = new Promise(function (resolve) { setTimeout(resolve, 2500); }).then(function () { return c.match(req, { ignoreSearch: true }); });',
    '    return Promise.race([net, slow.then(function (hit) { return hit || net; })]).catch(function () {',
    '      return c.match(req, { ignoreSearch: true }).then(function (hit) { return hit || Response.error(); });',
    '    });',
    '  });',
    '}',
    ''
  ].join('\n'));

  write('manifest.webmanifest', JSON.stringify({
    name: name + ' One Login',
    short_name: 'One Login',
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: '#FBF6EE',
    theme_color: '#FBF6EE',
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }, null, 2) + '\n');

  write('_headers', [
    '/',
    '  Cache-Control: no-cache',
    '/index.html',
    '  Cache-Control: no-cache',
    '/config.js',
    '  Cache-Control: no-cache',
    '/sw.js',
    '  Cache-Control: no-cache',
    '/manifest.webmanifest',
    '  Cache-Control: no-cache',
    '/b/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    ''
  ].join('\n'));

  const noCache = [{ key: 'Cache-Control', value: 'no-cache' }];
  write('vercel.json', JSON.stringify({
    cleanUrls: false,
    trailingSlash: false,
    headers: [
      { source: '/', headers: noCache },
      { source: '/index.html', headers: noCache },
      { source: '/config.js', headers: noCache },
      { source: '/sw.js', headers: noCache },
      { source: '/manifest.webmanifest', headers: noCache },
      { source: '/b/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }
    ]
  }, null, 2) + '\n');

  fs.readdirSync(STATIC).forEach((f) => fs.copyFileSync(path.join(STATIC, f), path.join(OUT, f)));

  write('version.json', JSON.stringify({ version: version, build: buildDate, uiv: uiv }) + '\n');

  const n = writeServer();
  console.log('web/ built: v' + version + ' (' + uiv + '), ' + bundles.length + ' screens' + (api ? ', API ' + api : ', config.js has no web app link yet') +
    (fast ? ', fast server ' + fast : '') + ' · netlify/fast/app.mjs: ' + n + ' server files');
}

if (require.main === module) build();
module.exports = { appSource, writeServer, build };
