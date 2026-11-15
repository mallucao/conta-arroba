/* Cache simples para uso no campo: online busca sempre a versão nova; sem internet, serve a última guardada. */
const CACHE = 'conta-arroba-v1';
const SHELL = ['./', './index.html', './styles.css', './core.js', './app.js', './icon.svg', './manifest.webmanifest', './quote.json'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE)
    .then(cache => Promise.all(SHELL.map(url => cache.add(url).catch(() => null))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  url.search = '';
  const key = url.href;
  event.respondWith(fetch(request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(key, copy)).catch(() => null);
    }
    return response;
  }).catch(() => caches.match(key)
    .then(cached => cached || (request.mode === 'navigate' ? caches.match('./index.html') : null))
    .then(result => result || Response.error())));
});
