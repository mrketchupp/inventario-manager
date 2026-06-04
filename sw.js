/* Service worker · Conteo Físico Inventario DLTA
   Precachea la app y todos sus recursos para que funcione sin conexión,
   especialmente al añadirla a la pantalla de inicio en iOS (Safari).
   Sube CACHE_VERSION cuando cambies algún recurso para forzar la actualización. */

const CACHE_VERSION = "conteo-dlta-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./assets/xlsx.full.min.js",
  "./assets/fonts.css",
  "./assets/fonts/oswald-latin-400-normal.woff2",
  "./assets/fonts/oswald-latin-500-normal.woff2",
  "./assets/fonts/oswald-latin-600-normal.woff2",
  "./assets/fonts/oswald-latin-700-normal.woff2",
  "./assets/fonts/ibm-plex-mono-latin-400-normal.woff2",
  "./assets/fonts/ibm-plex-mono-latin-500-normal.woff2",
  "./assets/fonts/ibm-plex-mono-latin-600-normal.woff2",
  "./assets/fonts/ibm-plex-sans-latin-400-normal.woff2",
  "./assets/fonts/ibm-plex-sans-latin-500-normal.woff2",
  "./assets/fonts/ibm-plex-sans-latin-600-normal.woff2"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Navegaciones: cache-first sobre index.html, con red como respaldo.
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html").then((cached) => cached || fetch(req))
    );
    return;
  }

  // Resto de recursos: cache-first; si falta, busca en red y lo guarda.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
