// Service Worker de EstibaX (ICOLTRANS)
// Estrategias:
//  - Navegaciones (HTML): network-first con fallback a caché (modo offline).
//  - /assets/* (bundles con hash, inmutables): cache-first.
//  - Resto del mismo origen (manifest, iconos): stale-while-revalidate.
//  - La API del backend NUNCA se cachea: los datos son en vivo.
const CACHE_NAME = 'estibax-v2';
const SHELL = ['/', '/index.html', '/manifest.json', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Datos en vivo: jamás cachear la API (cualquier origen distinto al del frontend)
  if (url.origin !== self.location.origin) return;

  // Navegaciones (HTML): network-first, fallback offline al shell cacheado
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Bundles con hash (inmutables): cache-first
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
            return res;
          })
      )
    );
    return;
  }

  // Resto del mismo origen (manifest, iconos, favicon): stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const red = fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => cached);
      return cached || red;
    })
  );
});
