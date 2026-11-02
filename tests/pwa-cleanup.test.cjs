const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");
const { load, storage, browser, userStore, renderAuth, keys, flush } = require("./helpers/auth.cjs");

const legacyCaches = ["workbox-precache-v2-https://app.example/", "html-pages", "static-resources"];

function cacheStorage(names = legacyCaches, { list, remove } = {}) {
  const remaining = new Set(names);
  const deleted = [];
  return {
    remaining,
    deleted,
    api: {
      keys: async () => (list ? list() : [...remaining]),
      delete: async (name) => {
        if (remove) await remove(name);
        deleted.push(name);
        return remaining.delete(name);
      },
    },
  };
}

function loadWorker(caches = cacheStorage(), unregister = async () => true) {
  const listeners = new Map();
  const delays = [];
  let unregistered = false;
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    setTimeout: (callback, delay) => {
      delays.push(delay);
      queueMicrotask(callback);
    },
    self: {
      caches: caches.api,
      addEventListener: (name, handler) => listeners.set(name, handler),
      skipWaiting: () => assert.fail("Old autoUpdate bundles must not activate during an in-flight login"),
      clients: {
        claim: () => assert.fail("Must not take over open pages"),
        matchAll: () => assert.fail("Must not navigate any open pages, including OAuth callbacks"),
      },
      registration: {
        unregister: async () => {
          unregistered = true;
          return unregister();
        },
      },
    },
  });
  return {
    listeners,
    delays,
    isUnregistered: () => unregistered,
    dispatch(name) {
      let lifetime;
      listeners.get(name)({
        waitUntil: (promise) => {
          lifetime = promise;
        },
      });
      assert.ok(lifetime, `${name} must keep cleanup operations alive`);
      return lifetime;
    },
    install() {
      return this.dispatch("install");
    },
  };
}

function loadPage({
  caches = cacheStorage(),
  registrations = [],
  getRegistrations,
  window = browser("https://app.example/"),
} = {}) {
  const delays = [];
  const warnings = [];
  window.setTimeout = (callback, delay) => {
    delays.push(delay);
    queueMicrotask(callback);
  };
  window.location.reload = () => assert.fail("Cleanup must not reload during OAuth exchange");
  const globals = {
    window,
    caches: caches.api,
    navigator: { serviceWorker: { getRegistrations: getRegistrations || (async () => registrations) } },
    console: { warn: (...args) => warnings.push(args) },
  };
  return {
    globals,
    delays,
    warnings,
    cleanup: load("src/lib/pwaCleanup.ts", {}, globals).cleanupLegacyPwa,
  };
}

test("retirement clears caches in install without forced activation or a fetch handler", async () => {
  const worker = loadWorker();
  assert.deepEqual([...worker.listeners.keys()], ["install"]);
  await assert.rejects(worker.install(), /PWA retired/);
  assert.equal(worker.isUnregistered(), true);
});

test("install keeps cache cleanup alive and queues unregister without waiting for activation", async () => {
  let finish;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  const caches = cacheStorage(legacyCaches, { remove: () => pending });
  const worker = loadWorker(caches);
  const installation = assert.rejects(worker.install(), /PWA retired/);
  await flush();
  assert.equal(worker.isUnregistered(), false);
  finish();
  await installation;
  assert.equal(caches.remaining.size, 0);
  assert.equal(worker.isUnregistered(), true);
});

test("install does not deadlock on the unregister job queued behind itself", async () => {
  let finish;
  const pendingUnregister = new Promise((resolve) => {
    finish = resolve;
  });
  const worker = loadWorker(undefined, () => pendingUnregister);
  await assert.rejects(worker.install(), /PWA retired/);
  assert.equal(worker.isUnregistered(), true);
  finish(true);
});

test("install retries cache failures and rejects persistent failures so future browser updates can retry", async () => {
  let attempts = 0;
  const caches = cacheStorage([], {
    list: () => {
      attempts++;
      throw new Error("Storage unavailable");
    },
  });
  const worker = loadWorker(caches);
  await assert.rejects(worker.install(), /Storage unavailable/);
  assert.equal(attempts, 3);
  assert.deepEqual(worker.delays, [1000, 5000]);
  assert.equal(worker.isUnregistered(), true);
});

test("cache enumeration failure cannot prevent worker unregistering", async () => {
  const worker = loadWorker(
    cacheStorage([], {
      list: () => {
        throw new Error("Storage unavailable");
      },
    })
  );
  await assert.rejects(worker.install(), /Storage unavailable/);
  assert.equal(worker.isUnregistered(), true);
});

test("one failed deletion does not prevent other caches or the registration being removed", async () => {
  const caches = cacheStorage(legacyCaches, {
    remove: (name) => {
      if (name === "html-pages") throw new Error("Transient deletion error");
    },
  });
  const worker = loadWorker(caches);
  await assert.rejects(worker.install(), /Failed to clear legacy PWA caches/);
  assert.equal(worker.isUnregistered(), true);
  assert.deepEqual([...caches.remaining], ["html-pages"]);
});

test("worker unregister failure does not prevent cache deletion", async () => {
  const caches = cacheStorage();
  const worker = loadWorker(caches, async () => {
    throw new Error("Unregister unavailable");
  });
  await assert.rejects(worker.install(), /PWA retired/);
  assert.equal(caches.remaining.size, 0);
});

test("page cleanup removes only the old PWA caches and registrations", async () => {
  const caches = cacheStorage([...legacyCaches, "unrelated"]);
  const unregistered = [];
  const registration = (name, scriptURL) => ({
    [name]: { scriptURL },
    unregister: async () => {
      unregistered.push(scriptURL);
      return true;
    },
  });
  const page = loadPage({
    caches,
    registrations: [
      registration("active", "https://app.example/sw.js"),
      registration("waiting", "https://app.example/sw.js"),
      registration("installing", "https://app.example/sw.js"),
      registration("active", "https://app.example/another-app/sw.js"),
    ],
  });
  await page.cleanup();
  assert.deepEqual([...caches.remaining], ["unrelated"]);
  assert.deepEqual(unregistered, Array(3).fill("https://app.example/sw.js"));
  assert.deepEqual(page.delays, []);
});

test("page retries failed cache deletions even after worker unregistration succeeds", async () => {
  let failures = 0;
  let unregistered = 0;
  const caches = cacheStorage(legacyCaches, {
    remove: (name) => {
      if (name === "html-pages" && failures++ < 2) throw new Error("Transient");
    },
  });
  const page = loadPage({
    caches,
    getRegistrations: async () =>
      unregistered
        ? []
        : [
            {
              active: { scriptURL: "https://app.example/sw.js" },
              unregister: async () => {
                unregistered++;
                return true;
              },
            },
          ],
  });
  await page.cleanup();
  assert.equal(unregistered, 1);
  assert.equal(caches.remaining.size, 0);
  assert.deepEqual(page.delays, [1000, 5000]);
  assert.deepEqual(page.warnings, []);
});

test("enumerating workers can fail independently while cache cleanup succeeds", async () => {
  let attempts = 0;
  const caches = cacheStorage();
  const page = loadPage({
    caches,
    getRegistrations: async () => {
      if (attempts++ === 0) throw new Error("Temporary registration error");
      return [];
    },
  });
  await page.cleanup();
  assert.equal(caches.remaining.size, 0);
  assert.equal(attempts, 2);
  assert.deepEqual(page.delays, [1000]);
});

test("permanent storage failures have bounded retries and are retried again on the next startup", async () => {
  let failing = true;
  let attempts = 0;
  const caches = cacheStorage(legacyCaches, {
    list: () => {
      attempts++;
      if (failing) throw new Error("Storage unavailable");
      return [...caches.remaining];
    },
  });
  const page = loadPage({ caches });
  await page.cleanup();
  assert.equal(attempts, 3);
  assert.equal(page.warnings.length, 1);
  assert.deepEqual(page.delays, [1000, 5000]);
  failing = false;
  await page.cleanup();
  assert.equal(caches.remaining.size, 0);
});

test("unsupported service worker and Cache Storage APIs are harmless", async () => {
  const { cleanupLegacyPwa } = load("src/lib/pwaCleanup.ts", {}, { navigator: {}, window: {} });
  await cleanupLegacyPwa();
});

test("cleanup during a pending OAuth exchange preserves the stripped in-memory authorization code", async () => {
  const local = storage();
  const session = storage();
  const win = browser("https://app.example/auth/callback");
  const page = loadPage({ window: win });
  const globals = { ...page.globals, localStorage: local, sessionStorage: session };
  const context = {
    globals,
    useUserStore: userStore(local),
    pkce: load("src/lib/oauthCodeFlow.ts", {}, globals),
    callback: load("src/lib/authCallback.ts", {}, globals),
  };
  const { state } = await context.pkce.prepareOAuthCodeFlow();
  win.location = new URL(`https://app.example/auth/callback?code=once&state=${state}`);
  context.callback.consumeAuthCallbackCredentials();
  let finishExchange;
  const ui = renderAuth(context, {
    exchangeOAuthCode: () =>
      new Promise((resolve) => {
        finishExchange = resolve;
      }),
  });
  await page.cleanup();
  assert.doesNotMatch(win.location.search, /code=/);
  assert.equal(win.location.href, `https://app.example/auth/callback?state=${state}`);
  assert.deepEqual(page.warnings, []);
  assert.equal(context.callback.getQueryCallbackCredentials().code, "once");
  assert.equal(local.getItem(keys.TOKEN), null);
  assert.deepEqual(ui.navigations, []);
  finishExchange({ token: "sess_after_cleanup", session_id: "id", is_new_user: false });
  await flush();
  assert.equal(local.getItem(keys.TOKEN), "sess_after_cleanup");
  assert.equal(ui.navigations.length, 1);
  assert.deepEqual(ui.errors, []);
});
