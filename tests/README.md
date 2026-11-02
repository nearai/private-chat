# Browser regression for PWA retirement

Install dependencies, then install the test browser once:

```sh
pnpm exec playwright-core install chromium
pnpm test:pwa:browser
```

Alternatively set `PWA_BROWSER_PATH` to a local Chromium or Chrome executable.

The fixture reproduces the previous precached SPA shell, CacheFirst scripts,
client claiming, and the old client's reload-on-activation behavior. The tests
serve the real retirement worker, auth callback parser, and page cleanup code.
They keep old chat and pending OAuth pages open, deploy the new worker, and
trigger discovery by ordinary refresh or opening a tab. No service worker update
or activation is called by the test.

The navigation that discovers the replacement can already have received old
HTML. Once installation queues unregistration, subsequent ordinary navigations
must load the current app from the network without closing any existing tabs.
Both transient and permanent worker-side storage failures are also covered.

Retirement removes the precached SPA entrypoints and cached HTML responses, but
preserves JS, CSS, fonts, images, and their cache containers. An old document can
still import an old module after its deployment assets are gone from the server.
Neither the retirement worker nor new-page cleanup can safely infer when every
legacy tab has finished, so they must not sweep those asset caches. The retained
bytes can remain after retirement; new documents no longer have a registration
that would serve them through the old PWA.

Two regressions use the checked-in output from workbox-build@7.4.0. They hold an
old document before its module import, deploy a server that returns 404 for that
module, then release the import after worker retirement or new-page cleanup.
The legacy document must start and complete its OAuth exchange using its cached
module. These tests failed with whole-cache deletion and pass with HTML-only
eviction. The Workbox runtime is a licensed, test-only fixture; no Workbox package
is added to the app's dependencies.

The retirement script intentionally rejects installation after queuing the
unregister job. This prevents activation from firing an old client's automatic
reload, including when an old OAuth document registers late after retirement.
A failed-install message in browser developer tools is expected for this script.
