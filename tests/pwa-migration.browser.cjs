const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { before, after, test } = require("node:test");
const { chromium } = require("playwright-core");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const fixtureRoot = path.join(__dirname, "fixtures/pwa");
let browser;

before(async () => {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PWA_BROWSER_PATH ? { executablePath: process.env.PWA_BROWSER_PATH } : {}),
  });
});
after(async () => {
  await browser?.close();
});

async function waitForRetirement(page) {
  const deadline = Date.now() + 15000;
  while (!(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length === 0))) {
    assert.ok(Date.now() < deadline, "Old registration must retire while the old pages remain open");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

async function expectHtmlRetiredAndAssetsPreserved(page) {
  const state = await page.evaluate(async () => {
    const precacheNames = (await caches.keys()).filter((name) => name.startsWith("workbox-precache-"));
    const entrypoints = (
      await Promise.all(
        precacheNames.map(async (name) => {
          const cache = await caches.open(name);
          return (await cache.keys()).filter((request) => ["/", "/index.html"].includes(new URL(request.url).pathname));
        })
      )
    ).flat().length;
    return {
      entrypoints,
      html: Boolean(await (await caches.open("html-pages")).match("/entry")),
      script: Boolean(await (await caches.open("static-resources")).match("/legacy-main.js")),
      unrelated: Boolean(await (await caches.open("unrelated-cache")).match("/entry")),
    };
  });
  assert.deepEqual(state, { entrypoints: 0, html: false, script: true, unrelated: true });
}

async function fixture(t, storageFailure = "none", options = {}) {
  const compile = async (file) =>
    ts.transpileModule(await readFile(path.join(root, file), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
  const callback = await compile("src/lib/authCallback.ts");
  const cleanup = await compile("src/lib/pwaCleanup.ts");
  const retirementWorker = await readFile(path.join(root, "public/sw.js"), "utf8");
  const legacyWorker = await readFile(
    path.join(fixtureRoot, options.realWorkbox ? "vendor/legacy-worker.js" : "legacy-worker.js"),
    "utf8"
  );
  const workboxRuntime = options.realWorkbox
    ? await readFile(path.join(fixtureRoot, "vendor/workbox-runtime.js"))
    : null;
  const legacyHtml = options.realWorkbox
    ? await readFile(path.join(fixtureRoot, "legacy-workbox-index.html"), "utf8")
    : null;
  const oldMain = await readFile(path.join(fixtureRoot, "legacy-main.js"), "utf8");
  const newMain = await readFile(path.join(fixtureRoot, "current-main.js"), "utf8");
  let deployed = false;
  const gates = [];
  let removedAssetRequests = 0;
  const releaseLegacyModules = () => {
    for (const response of gates.splice(0)) response.end("released");
  };
  const html = () =>
    !deployed && legacyHtml
      ? legacyHtml
      : `<!doctype html><h1 id="version">${deployed ? "current" : "legacy"}</h1>
    <script type="module" src="/${deployed ? "current" : "legacy"}-main.js"></script>`;
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", pathname.endsWith(".js") ? "text/javascript" : "text/html");
    if (pathname === "/sw.js") {
      let prefix = "";
      if (deployed && storageFailure !== "none") {
        prefix = `const realKeys = self.caches.keys.bind(self.caches);
          let attempts = 0;
          self.caches.keys = () => ${storageFailure === "permanent" ? "true" : "attempts++ < 2"}
            ? Promise.reject(new Error("Injected storage failure")) : realKeys();\n`;
      }
      response.end(deployed && options.retireWorker !== false ? prefix + retirementWorker : legacyWorker);
    } else if (pathname === "/workbox-runtime.js") response.end(workboxRuntime);
    else if (pathname === "/legacy-module-gate") {
      gates.push(response);
    } else if (pathname === "/auth-callback.js") response.end(callback);
    else if (pathname === "/pwa-cleanup.js") response.end(cleanup);
    else if (pathname === "/legacy-main.js") {
      if (deployed && options.removeOldAssets) {
        removedAssetRequests++;
        response.statusCode = 404;
        response.end("Old deployment asset removed");
      } else response.end(oldMain);
    } else if (pathname === "/current-main.js") response.end(newMain);
    else response.end(html());
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const context = await browser.newContext();
  context.setDefaultTimeout(15000);
  t.after(async () => {
    releaseLegacyModules();
    await context.close();
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    });
  });
  return {
    context,
    origin: `http://127.0.0.1:${server.address().port}`,
    deploy: () => {
      deployed = true;
    },
    releaseLegacyModules,
    removedAssetRequests: () => removedAssetRequests,
  };
}

async function startDelayedDocument(app) {
  const page = await app.context.newPage();
  await page.goto(`${app.origin}/auth/callback?code=delayed&state=state&delay_module=1`, { waitUntil: "commit" });
  await page.waitForFunction(() => window.waitingForLegacyModule === true);
  return page;
}

async function expectDelayedDocumentToStart(app, page) {
  app.releaseLegacyModules();
  await page.waitForFunction(() => window.pendingCode === "delayed" || window.legacyModuleError);
  const result = await page.evaluate(() => ({ code: window.pendingCode, error: window.legacyModuleError }));
  assert.equal(result.error, undefined, "The legacy document must still import assets missing from the new deployment");
  assert.equal(result.code, "delayed");
  assert.equal(app.removedAssetRequests(), 0, "The retired Workbox cache must still supply the old module");
  await page.evaluate(() => window.finishExchange());
  await page.waitForFunction(() => window.exchanged === "delayed");
  assert.equal(await page.evaluate(() => Number(sessionStorage.loads)), 1);
}

test(
  "real Workbox preserves delayed legacy modules when the retirement worker installs",
  { timeout: 30000 },
  async (t) => {
    const app = await fixture(t, "none", { realWorkbox: true, removeOldAssets: true });
    const old = await app.context.newPage();
    await old.goto(app.origin);
    await old.waitForFunction(() => navigator.serviceWorker.controller);
    const delayed = await startDelayedDocument(app);
    app.deploy();
    const visitor = await app.context.newPage();
    await visitor.goto(`${app.origin}/c/discover-retirement`);
    await waitForRetirement(visitor);
    await expectDelayedDocumentToStart(app, delayed);
    assert.equal(old.isClosed(), false);
  }
);

test(
  "new-page cleanup preserves modules still needed by another legacy Workbox document",
  { timeout: 30000 },
  async (t) => {
    // Keep the old worker unchanged to exercise page cleanup independently of the
    // retirement worker. /docs is excluded by the shipped navigation denylist.
    const app = await fixture(t, "none", { realWorkbox: true, removeOldAssets: true, retireWorker: false });
    const old = await app.context.newPage();
    await old.goto(app.origin);
    await old.waitForFunction(() => navigator.serviceWorker.controller);
    const delayed = await startDelayedDocument(app);
    app.deploy();
    const current = await app.context.newPage();
    await current.goto(`${app.origin}/docs/current-app`);
    await current.waitForFunction(() => window.cleanupDone);
    await current.evaluate(() => window.cleanupDone);
    await waitForRetirement(current);
    assert.equal(await current.locator("#version").textContent(), "current");
    await expectDelayedDocumentToStart(app, delayed);
    assert.equal(old.isClosed(), false);
  }
);

async function seedOldPages(t, storageFailure) {
  const app = await fixture(t, storageFailure);
  const old = await app.context.newPage();
  await old.goto(`${app.origin}/c/old?view=full#latest`);
  await old.waitForFunction(() => navigator.serviceWorker.controller);
  await old.evaluate(async () => {
    localStorage.setItem("session-marker", "keep-me");
    for (const name of ["html-pages", "unrelated-cache"]) {
      const cache = await caches.open(name);
      await cache.put("/entry", new Response("<html>legacy</html>", { headers: { "content-type": "text/html" } }));
    }
  });
  const auth = await app.context.newPage();
  await auth.goto(`${app.origin}/auth/callback?code=once&state=state`);
  await auth.waitForFunction(() => window.pendingCode === "once");
  assert.doesNotMatch(auth.url(), /code=/);
  assert.equal(await auth.locator("#version").textContent(), "legacy");
  return { ...app, old, auth };
}

for (const trigger of ["reload", "new-tab"]) {
  test(
    `ordinary ${trigger} retires the old registration while existing and OAuth tabs stay open`,
    { timeout: 30000 },
    async (t) => {
      const app = await seedOldPages(t);
      let visitor;
      if (trigger === "reload") {
        visitor = await app.context.newPage();
        await visitor.goto(`${app.origin}/c/visitor`);
        await visitor.waitForFunction(() => window.registrationReady);
      }
      app.deploy();
      if (trigger === "reload") await visitor.reload();
      else {
        visitor = await app.context.newPage();
        await visitor.goto(`${app.origin}/c/visitor`);
      }
      // Use ordinary navigation only: no forced update, skipWaiting, bypass, or
      // direct activation. The old cached HTML can be the first response while
      // the browser downloads /sw.js; installation must still retire the cache.
      await waitForRetirement(visitor);
      assert.equal(app.old.isClosed(), false);
      assert.equal(app.auth.isClosed(), false);
      await expectHtmlRetiredAndAssetsPreserved(visitor);
      assert.equal(await app.old.evaluate(() => Number(sessionStorage.loads)), 1);
      assert.equal(await app.auth.evaluate(() => Number(sessionStorage.loads)), 1);
      assert.equal(await app.auth.evaluate(() => window.pendingCode), "once");

      const response = await visitor.reload();
      assert.equal(response.fromServiceWorker(), false);
      await visitor.waitForFunction(() => window.cleanupDone);
      await visitor.evaluate(() => window.cleanupDone);
      assert.equal(await visitor.locator("#version").textContent(), "current");
      const fresh = await app.context.newPage();
      const freshResponse = await fresh.goto(`${app.origin}/c/new`);
      assert.equal(freshResponse.fromServiceWorker(), false);
      await fresh.waitForFunction(() => window.cleanupDone);
      assert.equal(await fresh.locator("#version").textContent(), "current");
      assert.equal(await fresh.evaluate(() => navigator.serviceWorker.controller), null);
      assert.equal(await fresh.evaluate(() => localStorage.getItem("session-marker")), "keep-me");
      await expectHtmlRetiredAndAssetsPreserved(fresh);
      await app.auth.evaluate(() => window.finishExchange());
      await app.auth.waitForFunction(() => window.exchanged === "once");
      assert.equal(await app.auth.evaluate(() => Number(sessionStorage.loads)), 1);
    }
  );
}

for (const storageFailure of ["transient", "permanent"]) {
  test(
    `${storageFailure} install storage failures do not leave old registrations waiting`,
    { timeout: 30000 },
    async (t) => {
      const app = await seedOldPages(t, storageFailure);
      app.deploy();
      const visitor = await app.context.newPage();
      await visitor.goto(`${app.origin}/c/visitor`);
      await waitForRetirement(visitor);
      const response = await visitor.reload();
      assert.equal(response.fromServiceWorker(), false);
      await visitor.waitForFunction(() => window.cleanupDone);
      await visitor.evaluate(() => window.cleanupDone);
      assert.equal(await visitor.locator("#version").textContent(), "current");
      await expectHtmlRetiredAndAssetsPreserved(visitor);
      assert.equal(await app.auth.evaluate(() => Number(sessionStorage.loads)), 1);
      assert.equal(await app.auth.evaluate(() => window.pendingCode), "once");
      await app.auth.evaluate(() => window.finishExchange());
      await app.auth.waitForFunction(() => window.exchanged === "once");
      assert.equal(app.old.isClosed(), false);
      assert.equal(app.auth.isClosed(), false);
    }
  );
}

test(
  "late legacy registration preserves OAuth and the next ordinary navigation retires it again",
  { timeout: 30000 },
  async (t) => {
    const app = await seedOldPages(t);
    const late = await app.context.newPage();
    await late.goto(`${app.origin}/auth/callback?code=late&state=state&defer_registration=1`);
    await late.waitForFunction(() => window.pendingCode === "late");
    app.deploy();
    const visitor = await app.context.newPage();
    await visitor.goto(`${app.origin}/c/visitor`);
    await waitForRetirement(visitor);
    await late.evaluate(() => window.startRegistration());
    // Wait for any old autoUpdate listener's reload to settle before checking the
    // in-memory code. The document must keep the code until its exchange finishes.
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(await late.evaluate(() => Number(sessionStorage.loads)), 1);
    assert.equal(await late.evaluate(() => window.pendingCode), "late");
    // A late old bundle may resurrect its still-controlling legacy registration.
    // Its HTML cache is gone, so an ordinary visit must reach the new cleanup.
    await visitor.reload();
    await visitor.waitForFunction(() => window.cleanupDone);
    await visitor.evaluate(() => window.cleanupDone);
    await waitForRetirement(visitor);
    assert.equal(await visitor.locator("#version").textContent(), "current");
    assert.equal(await late.evaluate(() => Number(sessionStorage.loads)), 1);
    await late.evaluate(() => window.finishExchange());
    await late.waitForFunction(() => window.exchanged === "late");
  }
);
