# Workbox regression fixture

These files are generated test data from `workbox-build@7.4.0`, including its
real precaching and CacheFirst implementations. They are not application assets
and are served only by the browser test's local fixture server.

The snapshot was generated with `generateSW` using:

- `index.html` from `../legacy-workbox-index.html`
- `legacy-main.js` from `../legacy-main.js`
- `auth-callback.js` transpiled from `src/lib/authCallback.ts`
- `skipWaiting: true`, `clientsClaim: true`, `navigateFallback: "/"`
- The legacy app's `/v1/`, `/docs`, `/health`, and `/api-docs` navigation exclusions
- A `CacheFirst` JavaScript route named `static-resources`

The generated runtime filename is normalized to `workbox-runtime.js`. The
upstream runtime is retained verbatim with a license notice and a file-level
lint suppression. Its MIT license is included in `LICENSE.workbox`.

The application does not depend on or bundle Workbox. Keeping the snapshot here
lets the regression run offline without reinstalling the retired PWA tooling.
