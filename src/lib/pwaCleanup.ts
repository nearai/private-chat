const RETRY_DELAYS_MS = [1000, 5000];

async function clearLegacyPwaHtml(): Promise<void> {
  if (typeof caches === "undefined") return;
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((name) => name === "html-pages" || name.startsWith("workbox-precache-"))
      .map(async (name) => {
        const cache = await caches.open(name);
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
}

async function unregisterLegacyPwa(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const workerUrl = new URL("/sw.js", window.location.href).href;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) =>
        [registration.active, registration.waiting, registration.installing].some(
          (worker) => worker?.scriptURL === workerUrl
        )
      )
      .map((registration) => registration.unregister())
  );
}

/** Retire HTML caches on every startup without evicting another tab's assets. */
export async function cleanupLegacyPwa(): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    // Neither operation may block the other, or interrupt an in-flight login.
    // Unregistration stops new documents using PWA caches. Old controlled tabs
    // can still need cached build assets, including modules not yet imported.
    const results = await Promise.allSettled([clearLegacyPwaHtml(), unregisterLegacyPwa()]);
    if (results.every((result) => result.status === "fulfilled")) return;
    if (attempt === RETRY_DELAYS_MS.length) {
      console.warn("Legacy PWA cleanup failed; it will be retried on the next visit.");
      return;
    }
    await new Promise<void>((resolve) => window.setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
  }
}
