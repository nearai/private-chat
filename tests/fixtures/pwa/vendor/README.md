# Workbox regression fixture

These files are generated test data from `workbox-build@7.4.0`, including its
real precaching and CacheFirst implementations. They are not application assets
and are served only by the browser test's local fixture server.

The snapshot was generated with `generateSW` using:

- `index.html` from `../legacy-workbox-index.html`
- `legacy-main.js` from `../legacy-main.js`
- `auth-callback.js` transpiled from `src/lib/authCallback.ts`
- `skipWaiting: true`, `clientsClaim: true`, `navigateFallback: "/index.html"`
- The legacy app's `/v1/`, `/docs`, `/health`, and `/api-docs` navigation exclusions
- A `CacheFirst` JavaScript route named `static-resources`

The generated runtime filename is normalized to `workbox-runtime.js`. The
upstream runtime is retained verbatim with a license notice and a file-level
lint suppression. Its MIT license is included in `LICENSE.workbox`.

The application does not depend on or bundle Workbox. Keeping the snapshot here
lets the regression run offline without reinstalling the retired PWA tooling.

The navigation fallback must match the precached `index.html` URL. Workbox's
`createHandlerBoundToURL` does not apply the directory-index URL matching used
for fetch requests; binding it to `/` would throw before registering the
navigation route. The worker-retirement regression asserts that its discovery
navigation receives legacy HTML from the service worker and never runs the new
page's cleanup, so page cleanup cannot hide a broken retirement worker.
