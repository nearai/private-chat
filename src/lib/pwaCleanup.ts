const RETRY_DELAYS_MS = [1000, 5000];

async function clearLegacyPwaCaches(): Promise<void> {
  if (typeof caches === "undefined") return;
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((name) => name === "html-pages" || name === "static-resources" || name.startsWith("workbox-precache-"))
      .map((name) => caches.delete(name))
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

/** Runs on every startup, including when an earlier worker's cleanup failed. */
export async function cleanupLegacyPwa(): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    // Neither operation may block the other, or interrupt an in-flight login.
    const results = await Promise.allSettled([clearLegacyPwaCaches(), unregisterLegacyPwa()]);
    if (results.every((result) => result.status === "fulfilled")) return;
    if (attempt === RETRY_DELAYS_MS.length) {
      console.warn("Legacy PWA cleanup failed; it will be retried on the next visit.");
      return;
    }
    await new Promise<void>((resolve) => window.setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
  }
}
