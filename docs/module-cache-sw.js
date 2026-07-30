/*
Module-cache service worker for the doc site.

Live examples lazy-load their transpiler (tjs-lang) and any imports from a CDN.
The background test runner opens many doc pages, each in its own iframe; without
this, every iframe re-fetches the same cross-origin module. Chrome dedupes that
across iframes, but Firefox/Safari re-fetch per iframe -> slow. A service worker
is shared across all same-origin clients and its cache is persistent, so the
first fetch populates the cache and every later iframe / reload / session gets a
same-origin hit.

DIRECTION (roadmap phase-2): grow this into a `/lib/<spec>` resolver — rewrite
bare imports to a same-origin path, resolve + cache versioned libraries in
IndexedDB, serve them locally. That is the unbundled-web / versioned-endpoint
foundation (the same pattern tjs-lang and b8rjs use). For now it only caches the
CDN URLs the examples already request — no import rewriting, no IndexedDB.
*/

const CACHE = 'tosi-doc-modules-v1'
const CDN_HOSTS = ['cdn.jsdelivr.net', 'esm.sh', 'unpkg.com', 'cdn.skypack.dev']

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim())
)

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const isCdn = CDN_HOSTS.some(
    (host) => url.hostname === host || url.hostname.endsWith('.' + host)
  )
  if (!isCdn) return // let everything else hit the network normally

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(event.request)
      if (hit) return hit
      const response = await fetch(event.request)
      // CDN module responses are CORS (not opaque) and versioned in the URL, so
      // they're safe to cache immutably — a tjs-lang bump changes the URL.
      if (response.ok) cache.put(event.request, response.clone())
      return response
    })
  )
})
