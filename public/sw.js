// Keep the original worker URL available for existing installations.
// Retire during install so waiting cannot keep serving the old app. Installation
// is deliberately rejected after queuing unregister: even a late registration
// from an old OAuth document must never activate and trigger its autoUpdate
// listener, which could discard an authorization code held only in memory.
async function clearLegacyPwaHtml() {
  const cacheNames = await self.caches.keys();
  const results = await Promise.allSettled(
    cacheNames
      .filter((name) => name === "html-pages" || name.startsWith("workbox-precache-"))
      .map(async (name) => {
        const cache = await self.caches.open(name);
        const requests = await cache.keys();
        await Promise.all(
          requests.map(async (request) => {
            if (name === "html-pages") {
              const response = await cache.match(request);
              const type = response?.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
              if (type !== "text/html" && type !== "application/xhtml+xml") return;
            } else {
              const pathname = new URL(request.url).pathname;
              if (pathname !== "/" && pathname !== "/index.html") return;
            }
            await cache.delete(request);
          })
        );
      })
  );
  if (results.some((result) => result.status === "rejected")) {
    throw new Error("Failed to clear legacy PWA caches");
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        for (let attempt = 0; ; attempt++) {
          try {
            // Evict the SPA shell so subsequent navigations reach the new app.
            // Do not delete asset entries or cache containers: a legacy document
            // may already hold old HTML and still need its JS/CSS after rollout.
            await clearLegacyPwaHtml();
            break;
          } catch (error) {
            if (attempt === 2) throw error;
            await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 1000 : 5000));
          }
        }
      } finally {
        // Unregister is queued behind this install's update job. Enqueue it even
        // on storage failure, but do not await it here or the jobs would deadlock.
        // The browser owns the queued job; rejection is handled to avoid an
        // unhandled promise. New-page cleanup retries failed unregistering.
        void self.registration.unregister().catch(() => {});
      }
      throw new Error("PWA retired: service worker installation is disabled");
    })()
  );
});
