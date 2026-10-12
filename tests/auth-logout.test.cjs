const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync, existsSync } = require('node:fs');
const { load, storage, browser, userStore, hookStore, transport, renderAuth, constants, keys, normalize, flush } = require('./helpers/auth.cjs');


for (const sessionId of [null, 'id']) {
  test(`logout always revokes via bearer even with session ID=${sessionId}`, async () => {
    const local = storage(); local.setItem(keys.TOKEN, 'sess_old');
    if (sessionId) local.setItem(keys.SESSION, sessionId);
    const calls = [];
    let client;
    client = transport(local, async (...args) => {
      calls.push(args);
      assert.equal(local.getItem(keys.TOKEN), 'sess_old');
      return new Response(null, { status: 204 });
    }, (_, { expectedToken }) => client.clearSession(expectedToken));
    assert.equal(await client.revokeCurrentSessionAndLogout(), true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'https://api.example/v1/auth/logout');
    assert.equal(calls[0][1].headers.Authorization, 'Bearer sess_old');
    assert.deepEqual(JSON.parse(calls[0][1].body), sessionId ? { session_id: sessionId } : {});
    assert.equal(local.getItem(keys.TOKEN), null);
    assert.equal(local.getItem(keys.SESSION), null);
  });
}
for (const status of ['network', 403, 500]) {
  test(`revocation failure ${status} retains local auth for retry`, async () => {
    const local = storage(); local.setItem(keys.TOKEN, 'sess_old'); local.setItem(keys.SESSION, 'id');
    const client = transport(local, async () => {
      if (status === 'network') throw new Error('network');
      return Response.json({ detail: 'failed' }, { status });
    });
    await assert.rejects(client.revokeCurrentSessionAndLogout());
    assert.equal(local.getItem(keys.TOKEN), 'sess_old');
    assert.equal(local.getItem(keys.SESSION), 'id');
    assert.deepEqual(client.events, []);
  });
}
test('already-invalid server session completes logout via authenticated 401', async () => {
  const local = storage(); local.setItem(keys.TOKEN, 'sess_old');
  let client;
  client = transport(local, async () => Response.json({ detail: 'unauthorized' }, { status: 401 }), (_, { expectedToken }) => client.clearSession(expectedToken));
  assert.equal(await client.revokeCurrentSessionAndLogout(), true);
  assert.equal(local.getItem(keys.TOKEN), null);
});
for (const status of [204, 401]) {
  test(`delayed logout ${status} cannot clear a newer login`, async () => {
    const local = storage(); local.setItem(keys.TOKEN, 'sess_old');
    let resolveFetch, client;
    client = transport(local, () => new Promise((resolve) => { resolveFetch = resolve; }), (_, { expectedToken }) => client.clearSession(expectedToken));
    const pending = client.revokeCurrentSessionAndLogout();
    await flush();
    await client.useUserStore.getState().setSession('sess_new', 'new-id');
    resolveFetch(status === 204 ? new Response(null, { status }) : Response.json({ detail: 'unauthorized' }, { status }));
    assert.equal(await pending, false);
    assert.equal(local.getItem(keys.TOKEN), 'sess_new');
    assert.equal(local.getItem(keys.SESSION), 'new-id');
    if (status === 401) assert.deepEqual(client.events, []);
  });
}
test('streaming 401 is also bound to its request token', async () => {
  const local = storage(); local.setItem(keys.TOKEN, 'sess_old');
  let resolveFetch, client;
  client = transport(local, () => new Promise((resolve) => { resolveFetch = resolve; }), (_, { expectedToken }) => client.clearSession(expectedToken));
  const streaming = new client.ApiClient().stream('/responses', {});
  await flush();
  await client.useUserStore.getState().setSession('sess_new', null);
  resolveFetch(Response.json({ detail: 'unauthorized' }, { status: 401 }));
  await assert.rejects(streaming);
  assert.deepEqual(client.events, [['logout', { expectedToken: 'sess_old' }]]);
  assert.equal(local.getItem(keys.TOKEN), 'sess_new');
});

function queuedLocks() {
  let tail = Promise.resolve();
  const names = [];
  return {
    names,
    request(name, operation) {
      names.push(name);
      const result = tail.then(operation);
      tail = result.then(() => {}, () => {});
      return result;
    },
  };
}
for (const withLocks of [false, true]) {
  test(`store login/logout uses paired credentials and persists only profile (Web Locks=${withLocks})`, async () => {
    const local = storage();
    const locks = queuedLocks();
    const store = userStore(local, withLocks ? { locks } : {});
    await store.getState().setSession('sess_tab_a', 'session-a');
    store.getState().setUser({ id: 'user' });
    const record = JSON.parse(local.getItem('user-storage'));
    assert.equal(record.state.token, undefined);
    assert.equal(record.state.sessionId, undefined);
    assert.equal(record.state.user.id, 'user');
    assert.equal(await store.getState().logout('sess_tab_a'), true);
    assert.equal(store.getState().token, null);
    assert.equal(store.getState().sessionId, null);
    assert.equal(store.getState().user, null);
    assert.equal(local.getItem(keys.TOKEN), null);
    assert.equal(local.getItem(keys.SESSION), null);
    if (withLocks) assert.deepEqual(locks.names, ['private-chat-auth-storage', 'private-chat-auth-storage']);
  });
}
test('legacy persisted token is removed before hydration; dedicated session keys remain authoritative', () => {
  const local = storage();
  local.setItem(keys.TOKEN, 'sess_current'); local.setItem(keys.SESSION, 'id');
  local.setItem('user-storage', JSON.stringify({ state: { user: { id: 'user' }, token: 'sess_obsolete' }, version: 0 }));
  const store = userStore(local);
  assert.equal(store.getState().token, 'sess_current');
  assert.equal(store.getState().sessionId, 'id');
  assert.equal(store.getState().user.id, 'user');
  assert.equal(JSON.parse(local.getItem('user-storage')).state.token, undefined);
});
test('store logout clears this tab while preserving a newer session written by another tab', async () => {
  const local = storage();
  const store = userStore(local, { locks: queuedLocks() });
  await store.getState().setSession('sess_tab_a', 'session-a');
  local.setItem(keys.TOKEN, 'sess_tab_b'); local.setItem(keys.SESSION, 'session-b');
  assert.equal(await store.getState().logout('sess_tab_a'), true);
  assert.equal(store.getState().token, null);
  assert.equal(local.getItem(keys.TOKEN), 'sess_tab_b');
  assert.equal(local.getItem(keys.SESSION), 'session-b');
});
test('store ignores a delayed logout after a newer same-tab login', async () => {
  const local = storage();
  const store = userStore(local, { locks: queuedLocks() });
  await store.getState().setSession('sess_tab_b', 'session-b');
  assert.equal(await store.getState().logout('sess_tab_a'), false);
  assert.equal(store.getState().token, 'sess_tab_b');
  assert.equal(local.getItem(keys.TOKEN), 'sess_tab_b');
});
test('Web Lock serializes a login beginning during logout cleanup without removing its credentials', async () => {
  const local = storage();
  const store = userStore(local, { locks: queuedLocks() });
  await store.getState().setSession('sess_tab_a', 'session-a');
  const getItem = local.getItem;
  let newerLogin, triggered = false;
  local.getItem = (key) => {
    if (key === keys.TOKEN && !triggered) {
      triggered = true;
      newerLogin = store.getState().setSession('sess_tab_b', 'session-b');
    }
    return getItem(key);
  };
  assert.equal(await store.getState().logout('sess_tab_a'), true);
  await newerLogin;
  assert.equal(store.getState().token, 'sess_tab_b');
  assert.equal(store.getState().sessionId, 'session-b');
  assert.equal(local.getItem(keys.TOKEN), 'sess_tab_b');
  assert.equal(local.getItem(keys.SESSION), 'session-b');
});
test('bearer and session ID stay paired in memory across another tab login', async () => {
  const local = storage(); local.setItem(keys.TOKEN, 'sess_tab_a'); local.setItem(keys.SESSION, 'session-a');
  const requests = [];
  const client = transport(local, async (...args) => { requests.push(args); return new Response(null, { status: 204 }); });
  local.setItem(keys.TOKEN, 'sess_tab_b'); local.setItem(keys.SESSION, 'session-b');
  await client.authClient.signOut();
  assert.equal(requests[0][1].headers.Authorization, 'Bearer sess_tab_a');
  assert.deepEqual(JSON.parse(requests[0][1].body), { session_id: 'session-a' });
  await new client.ApiClient().get('/read');
  assert.equal(requests[1][1].headers.Authorization, 'Bearer sess_tab_a');
});
test('lowercase bearer header binds unauthorized response to its token', async () => {
  const local = storage(); local.setItem(keys.TOKEN, 'sess_current');
  const client = transport(local, async () => Response.json({ detail: 'unauthorized' }, { status: 401 }));
  await assert.rejects(new client.ApiClient({ includeAuth: false }).get('/read', { headers: { authorization: 'Bearer sess_header' } }));
  assert.deepEqual(client.events, [['logout', { expectedToken: 'sess_header' }]]);
});

function renderApp(client, local) {
  const effects = [], cleanups = [], navigations = [];
  const calls = { exportStop: 0, reset: 0, cacheClear: 0, queryClear: 0 };
  let logoutHandler;
  const dependencies = new Proxy({
    'react/jsx-runtime': require('react/jsx-runtime'),
    react: { useCallback: (fn) => fn, useEffect: (fn) => effects.push(fn) },
    'react-router': { useLocation: () => ({ pathname: '/', search: '' }), useNavigate: () => (...args) => navigations.push(args) },
    '@tanstack/react-query': { useQueryClient: () => ({ clear: () => calls.queryClear++ }) },
    '@/hooks/useAppInitialization': { useAppInitialization: () => ({ isInitialized: false, isLoading: false }) },
    './stores/useUserStore': { useUserStore: hookStore(client.useUserStore) },
    './api/models/queries': { useModels: () => ({ isFetching: false }) },
    './api/users/queries/useUserData': { useUserData: () => ({ isFetching: false }) },
    './api/config/queries/useRemoteConfig': { useRemoteConfig: () => ({ isFetching: false }) },
    './hooks/useInitRemoteSettings': { default: () => ({ isSettingsLoading: false }) },
    './hooks/useIsOnline': { useIsOnline: () => true },
    './lib/posthog': { posthogPageView() {}, posthogReset: () => calls.reset++ },
    './lib/offlineCache': { offlineCache: { clearAll: () => calls.cacheClear++ } },
    './lib/event': { eventEmitter: { on: (_, handler) => { logoutHandler = handler; }, off() {} } },
    '@/stores/useExportStore': { useExportStore: { getState: () => ({ stop: () => calls.exportStop++ }) } },
    '@/pages/routes': { APP_ROUTES: { AUTH: '/auth' } },
  }, {
    has: () => true,
    get: (target, id) => target[id] ?? new Proxy({}, { get: () => () => null }),
  });
  const { default: App } = load('src/App.tsx', dependencies, { localStorage: local });
  App(); effects.forEach((effect) => cleanups.push(effect()));
  return { calls, navigations, logout: (payload) => logoutHandler(payload) };
}
test('authenticated 401 and actual App listener complete logout through a queued Web Lock', async () => {
  const local = storage();
  const store = userStore(local, { locks: queuedLocks() });
  await store.getState().setSession('sess_old', 'old-id');
  let app;
  const client = transport(local, async () => Response.json({ detail: 'unauthorized' }, { status: 401 }), (_, payload) => app.logout(payload));
  app = renderApp(client, local);
  assert.equal(await client.revokeCurrentSessionAndLogout(), true);
  await flush();
  assert.equal(store.getState().token, null);
  assert.equal(local.getItem(keys.TOKEN), null);
  assert.deepEqual(app.calls, { exportStop: 1, reset: 1, cacheClear: 1, queryClear: 1 });
  assert.deepEqual(normalize(app.navigations), [['/auth', { replace: true }]]);
});
test('App ignores old logout without clearing exports, cache or route after a new login', async () => {
  const local = storage();
  const store = userStore(local, { locks: queuedLocks() });
  await store.getState().setSession('sess_new', 'new-id');
  const client = transport(local, () => assert.fail('Unexpected request'));
  const app = renderApp(client, local);
  await app.logout({ expectedToken: 'sess_old' });
  assert.equal(store.getState().token, 'sess_new');
  assert.equal(local.getItem(keys.TOKEN), 'sess_new');
  assert.deepEqual(app.calls, { exportStop: 0, reset: 0, cacheClear: 0, queryClear: 0 });
  assert.deepEqual(app.navigations, []);
});
test('App clears only this tab when another tab has stored a newer session', async () => {
  const local = storage();
  const store = userStore(local, { locks: queuedLocks() });
  await store.getState().setSession('sess_tab_a', 'session-a');
  const client = transport(local, () => assert.fail('Unexpected request'));
  const app = renderApp(client, local);
  local.setItem(keys.TOKEN, 'sess_tab_b'); local.setItem(keys.SESSION, 'session-b');
  await app.logout({ expectedToken: 'sess_tab_a' });
  assert.equal(store.getState().token, null);
  assert.equal(local.getItem(keys.TOKEN), 'sess_tab_b');
  assert.equal(local.getItem(keys.SESSION), 'session-b');
  assert.equal(app.navigations.length, 1);
});

test('legacy callback does not replay when session publication remounts the login page', async () => {
  const local = storage();
  const context = { globals: { localStorage: local, sessionStorage: storage(), window: browser('https://app.example/auth/callback?token=sess_legacy&session_id=id&redirect=%2Fc%2F1') }, useUserStore: userStore(local) };
  if (existsSync('src/lib/authCallback.ts')) {
    context.callback = load('src/lib/authCallback.ts', {}, context.globals);
    context.pkce = load('src/lib/oauthCodeFlow.ts', {}, context.globals);
    context.callback.consumeAuthCallbackCredentials();
  }
  let resolveTracking, trackingCalls = 0;
  const options = {
    userFetch: () => { trackingCalls++; return new Promise(resolve => { resolveTracking = resolve; }); },
    onNavigate: target => {
      const previous = context.globals.window.location;
      context.globals.window.location = typeof target === 'string' ? new URL(target, previous) : new URL(target.pathname + (target.search ? '?' + target.search.replace(/^\?/, '') : '') + (target.hash || ''), previous);
    },
  };
  const first = renderAuth(context, {}, options);
  await flush();
  assert.equal(context.useUserStore.getState().token, 'sess_legacy');
  assert.equal(context.useUserStore.getState().sessionId, 'id');
  assert.equal(context.globals.window.location.searchParams.has('token'), false);
  first.unmount();
  const second = renderAuth(context, {}, options);
  await flush();
  assert.equal(trackingCalls, 1);
  assert.equal(second.errors.length, 0);
  resolveTracking({ user: { id: 'user' } });
  await flush();
  assert.equal(context.globals.window.location.pathname, '/c/1');
});

for (const status of [204, 401]) {
  test(`logout ${status} awaits a deferred Web Lock and actual App cleanup`, async () => {
    const local = storage();
    local.setItem(keys.TOKEN, 'sess_old'); local.setItem(keys.SESSION, 'id');
    let grant;
    const store = userStore(local, { locks: { request: (_name, operation) => new Promise(resolve => { grant = () => resolve(operation()); }) } });
    let app;
    const client = transport(local, async () => status === 204 ? new Response(null, { status }) : Response.json({ detail: 'unauthorized' }, { status }), (_, payload) => app.logout(payload));
    app = renderApp(client, local);
    let completed = false;
    const pending = client.revokeCurrentSessionAndLogout().then(result => { completed = true; return result; });
    await flush();
    assert.equal(completed, false);
    assert.equal(store.getState().token, 'sess_old');
    assert.deepEqual(app.navigations, []);
    grant();
    assert.equal(await pending, true);
    assert.equal(store.getState().token, null);
    assert.deepEqual(app.calls, { exportStop: 1, reset: 1, cacheClear: 1, queryClear: 1 });
    assert.deepEqual(normalize(app.navigations), [['/auth', { replace: true }]]);
  });
}
test('guarded session write cannot overwrite a newer login while waiting for its Web Lock', async () => {
  const local = storage(); let grant;
  const store = userStore(local, { locks: { request: (_name, operation) => new Promise(resolve => { grant = () => resolve(operation()); }) } });
  const pending = store.getState().setSession('sess_delayed', 'delayed-id', { expectedToken: null });
  local.setItem(keys.TOKEN, 'sess_newer'); local.setItem(keys.SESSION, 'newer-id');
  grant();
  assert.equal(await pending, false);
  assert.equal(local.getItem(keys.TOKEN), 'sess_newer');
  assert.equal(local.getItem(keys.SESSION), 'newer-id');
});

test('cancelled session write is rejected inside the reactive store lock', async () => {
  const local = storage(); let grant;
  const store = userStore(local, { locks: { request: (_name, operation) => new Promise(resolve => { grant = () => resolve(operation()); }) } });
  let current = true;
  const pending = store.getState().setSession('sess_cancelled', 'id', { expectedToken: null, isCurrent: () => current });
  current = false; grant();
  assert.equal(await pending, false);
  assert.equal(local.getItem(keys.TOKEN), null);
  assert.equal(store.getState().token, null);
});


test('legacy hash cleanup preserves query parameters and unrelated fragment values', () => {
  const local = storage(); const window = browser('https://app.example/auth?redirect=%2Fc%2F1#token=sess_secret&session_id=id&keep=yes');
  const helper = load('src/lib/sessionCredentials.ts', { '@/lib/constants': constants, '@/stores/useUserStore': { useUserStore: userStore(local) } }, { localStorage: local, window });
  helper.clearLegacyHashCredentials();
  assert.equal(window.location.searchParams.get('redirect'), '/c/1');
  assert.equal(window.location.hash, '#keep=yes');
});
