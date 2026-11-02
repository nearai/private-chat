// Keep the original worker URL available for existing installations.
// Do not skipWaiting: old bundles reload on activation and may hold an OAuth
// code only in memory. Let controlled pages finish and close before activation.
// No fetch handler, clients.claim(), or forced navigation is needed.
async function clearLegacyPwaCaches() {
  const cacheNames = await self.caches.keys();
  await Promise.allSettled(
    cacheNames
      .filter((name) => name === "html-pages" || name === "static-resources" || name.startsWith("workbox-precache-"))
      .map((name) => self.caches.delete(name))
  );
}

self.addEventListener("activate", (event) => {
  // A storage error must not prevent unregistering this worker.
  event.waitUntil(Promise.allSettled([clearLegacyPwaCaches(), self.registration.unregister()]));
});
