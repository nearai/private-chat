// Browser fixture reproducing the old Workbox app's precached SPA shell,
// CacheFirst scripts, immediate activation and client claiming.
const precacheName = "workbox-precache-v2-browser-regression";

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([caches.open(precacheName).then((cache) => cache.add("/index.html")), self.skipWaiting()])
  );
});
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.open(precacheName).then(async (cache) => (await cache.match("/index.html")) || fetch(event.request))
    );
  } else if (url.pathname.endsWith(".js")) {
    event.respondWith(
      caches.open("static-resources").then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        await cache.put(event.request, response.clone());
        return response;
      })
    );
  }
});
