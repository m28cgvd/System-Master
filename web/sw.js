var CACHE = 'cg1-d8a7554e34e2';

self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE && k.indexOf('cg1-') === 0; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(url.pathname.indexOf('/b/') >= 0 ? fromCache(req) : fromNetwork(req));
});

function fromCache(req) {
  return caches.open(CACHE).then(function (c) {
    return c.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) { if (res.ok) c.put(req, res.clone()); return res; });
    });
  });
}

function fromNetwork(req) {
  return caches.open(CACHE).then(function (c) {
    var net = fetch(req).then(function (res) { if (res.ok) c.put(req, res.clone()); return res; });
    var slow = new Promise(function (resolve) { setTimeout(resolve, 2500); }).then(function () { return c.match(req, { ignoreSearch: true }); });
    return Promise.race([net, slow.then(function (hit) { return hit || net; })]).catch(function () {
      return c.match(req, { ignoreSearch: true }).then(function (hit) { return hit || Response.error(); });
    });
  });
}
