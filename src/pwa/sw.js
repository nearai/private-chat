// Retire the caching worker at the same URL used by existing installations.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await self.caches.keys();
      await Promise.all(cacheNames.map((cacheName) => self.caches.delete(cacheName)));

      // Only reload controlled windows. Fresh visits must not enter a reload loop.
      const clients = await self.clients.matchAll({ type: "window" });
      await self.registration.unregister();
      await Promise.allSettled(clients.map((client) => client.navigate(client.url)));
    })()
  );
});
