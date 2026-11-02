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

The retirement script intentionally rejects installation after queuing the
unregister job. This prevents activation from firing an old client's automatic
reload, including when an old OAuth document registers late after retirement.
A failed-install message in browser developer tools is expected for this script.
