const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");

function loadWorker({ cacheNames = [], clients = [], deleteCache = async () => true } = {}) {
  const listeners = new Map();
  const calls = [];
  const self = {
    addEventListener: (name, handler) => listeners.set(name, handler),
    skipWaiting: async () => {
      calls.push("skipWaiting");
    },
    caches: {
      keys: async () => cacheNames,
      delete: async (name) => {
        await deleteCache(name);
        calls.push(`delete:${name}`);
        return true;
      },
    },
    clients: {
      matchAll: async (options) => {
        assert.equal(options.type, "window");
        assert.equal(options.includeUncontrolled, undefined);
        return clients;
      },
    },
    registration: {
      unregister: async () => {
        calls.push("unregister");
        return true;
      },
    },
  };
  runInNewContext(readFileSync("src/pwa/sw.js", "utf8"), { self });
  return {
    calls,
    listeners,
    dispatch(name) {
      let lifetime;
      listeners.get(name)({
        waitUntil: (promise) => {
          lifetime = promise;
        },
      });
      assert.ok(lifetime, `${name} must keep the worker alive until completion`);
      return lifetime;
    },
  };
}

test("old PWA caches finish deleting before unregistering and reloading controlled pages", async () => {
  let finishDeletion;
  const pendingDeletion = new Promise((resolve) => {
    finishDeletion = resolve;
  });
  const navigated = [];
  const url = "https://chat.example/chat/123?view=full#latest";
  const worker = loadWorker({
    cacheNames: ["workbox-precache-v2", "html-pages", "static-resources"],
    deleteCache: () => pendingDeletion,
    clients: [
      {
        url,
        navigate: async (next) => {
          assert.equal(worker.calls.at(-1), "unregister");
          navigated.push(next);
        },
      },
    ],
  });
  await worker.dispatch("install");
  const activation = worker.dispatch("activate");
  await new Promise(setImmediate);
  assert.deepEqual(worker.calls, ["skipWaiting"]);
  assert.deepEqual(navigated, []);

  finishDeletion();
  await activation;
  assert.deepEqual(worker.calls, [
    "skipWaiting",
    "delete:workbox-precache-v2",
    "delete:html-pages",
    "delete:static-resources",
    "unregister",
  ]);
  assert.deepEqual(navigated, [url]);
  assert.equal(worker.listeners.has("fetch"), false);
});

test("fresh visits unregister without reloading uncontrolled pages", async () => {
  const worker = loadWorker();
  await worker.dispatch("activate");
  assert.deepEqual(worker.calls, ["unregister"]);
});

test("a closing tab does not prevent the other controlled tabs from refreshing", async () => {
  const navigated = [];
  const worker = loadWorker({
    clients: [
      {
        url: "https://chat.example/closed",
        navigate: async () => {
          throw new Error("Tab closed");
        },
      },
      {
        url: "https://chat.example/open",
        navigate: async (url) => {
          navigated.push(url);
        },
      },
    ],
  });
  await worker.dispatch("activate");
  assert.deepEqual(worker.calls, ["unregister"]);
  assert.deepEqual(navigated, ["https://chat.example/open"]);
});
