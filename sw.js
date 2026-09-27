// Service worker : garde l'appli en mémoire pour qu'elle s'ouvre sans internet.
const CACHE = 'chrono-orientation-v9';
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
const FILES = ['./', './index.html', XLSX_URL];
const ALLOWED_ORIGINS = [self.location.origin, 'https://cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {})))) // le fichier Excel ne bloque pas l'installation s'il est indisponible
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Réponse immédiate depuis la mémoire, mise à jour en arrière-plan si internet est disponible.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !ALLOWED_ORIGINS.includes(new URL(req.url).origin)) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cached => {
      const net = fetch(req)
        .then(res => {
          if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() => cached || caches.match('./index.html'));
      return cached || net;
    })
  );
});
