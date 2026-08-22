// Service Worker — Mi Garaje
// Estrategia NETWORK-FIRST: siempre busca la versión más reciente en la red.
// Solo usa la caché si no hay conexión (para que la app funcione offline).
// Al cambiar CACHE_VERSION se fuerza la actualización en todos los dispositivos.

const CACHE_VERSION = 'mi-garaje-v6';
const FILES = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

// Instalación: cachea los archivos base y activa de inmediato
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c => c.addAll(FILES)).catch(() => {})
  );
});

// Activación: borra cachés viejas y toma el control
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: NETWORK-FIRST para la navegación (HTML)
self.addEventListener('fetch', e => {
  const req = e.request;

  // Para la página / documentos HTML: intenta la red primero
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          // Guarda la versión nueva en caché para uso offline
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match(req)))
    );
    return;
  }

  // Para el resto de recursos: red primero, caché de respaldo
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});
