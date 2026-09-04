/* Service worker — un clu de bordado PWA
 * Estrategia:
 *  - Navegaciones (páginas): network-first, con fallback a /offline.html sin conexión.
 *  - Estáticos de Next (/_next/static) e imágenes: stale-while-revalidate.
 *  - Nunca cachea /api, /auth ni peticiones con credenciales de Supabase.
 */
const VERSION = "v2";
const STATIC_CACHE = `clu-static-${VERSION}`;
const PAGES_CACHE = `clu-pages-${VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE = [OFFLINE_URL, "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, PAGES_CACHE].includes(k))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname === "/logo.png" ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Nunca interceptar datos dinámicos / auth.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/admin/export") ||
    url.pathname.startsWith("/_next/data/")
  ) {
    return;
  }

  // Páginas: network-first con fallback offline.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(PAGES_CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(PAGES_CACHE);
          const cached = await cache.match(request);
          return cached || (await caches.match(OFFLINE_URL));
        }
      })(),
    );
    return;
  }

  // Estáticos: stale-while-revalidate.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res && res.status === 200) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })(),
    );
  }
});
