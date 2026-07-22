// La constante CACHE contient un identifiant généré à chaque build par
// scripts/stamp-sw.mjs : ça change le contenu de ce fichier à chaque
// déploiement, ce qui est indispensable pour que le navigateur détecte
// qu'une nouvelle version du service worker existe.
const CACHE = 'supertimer-__BUILD_ID__';
const ASSET_URLS = ['./', './index.html', './manifest.webmanifest', './icon.svg', './logo.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        // cache: 'reload' pour contourner le cache HTTP du navigateur et
        // garantir qu'on met bien en cache la dernière version déployée.
        Promise.all(ASSET_URLS.map((url) => fetch(url, { cache: 'reload' }).then((res) => cache.put(url, res))))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => (event.request.mode === 'navigate' ? caches.match('./index.html') : undefined));
    })
  );
});
