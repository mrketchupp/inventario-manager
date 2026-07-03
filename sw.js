/* Service worker · Conteo Físico Inventario DLTA
   Precachea la app y todos sus recursos para que funcione sin conexión,
   especialmente al añadirla a la pantalla de inicio en iOS (Safari).
   Sube CACHE_VERSION cuando cambies algún recurso para forzar la actualización. */

const CACHE_VERSION = "conteo-dlta-v6";

const ASSETS = [
  "./",
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

/* Reconstruye una respuesta para eliminar el flag `redirected`.
   Cloudflare Pages redirige /index.html -> /, y servir una respuesta
   redirigida desde el SW provoca el error
   "Response served by service worker has redirections". */
async function stripRedirect(response) {
  if (!response || !response.redirected) return response;
  const body = await response.clone().arrayBuffer();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await Promise.all(ASSETS.map(async (url) => {
      try {
        const res = await fetch(url, { cache: "reload", redirect: "follow" });
        if (res && res.ok) await cache.put(url, await stripRedirect(res));
      } catch (e) { /* recurso opcional: se intentará en runtime */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Navegaciones: network-first (para recuperar/actualizar), con respaldo
  // al index cacheado. Siempre se limpia el flag de redirección.
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const clean = await stripRedirect(fresh);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE_VERSION);
          cache.put("./", clean.clone());
        }
        return clean;
      } catch (e) {
        const cached = (await caches.match("./")) || (await caches.match(req));
        return (await stripRedirect(cached)) || Response.error();
      }
    })());
    return;
  }

  // Resto de recursos: cache-first; si falta, va a la red y lo guarda.
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === "basic") {
        const cache = await caches.open(CACHE_VERSION);
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      return cached || Response.error();
    }
  })());
});
