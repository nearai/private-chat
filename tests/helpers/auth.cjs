const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { readFileSync, existsSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the real TypeScript boundaries with recording browser/transport seams.
function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  vm.runInNewContext(outputText, {
    exports,
    require: (id) => {
      assert.ok(id in dependencies, `Unexpected dependency: ${id}`);
      return dependencies[id];
    },
    URL, URLSearchParams, TextEncoder, Uint8Array, FormData, Response, AbortController,
    crypto: webcrypto, btoa, console: { error() {}, warn() {} }, ...globals,
  });
  return exports;
}
function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
const constants = load('src/lib/constants.ts');
const keys = constants.LOCAL_STORAGE_KEYS;
function browser(href) {
  const win = { location: new URL(href), history: { state: { retained: true } } };
  win.history.replaceState = (state, _, next) => {
    assert.equal(state, win.history.state);
    win.location = new URL(next, win.location);
  };
  return win;
}
const stores = new WeakMap();
function userStore(local, navigator = {}) {
  if (stores.has(local)) return stores.get(local);
  const middleware = require('zustand/middleware');
  const purge = existsSync('src/lib/legacyTokenPurge.ts') ? load('src/lib/legacyTokenPurge.ts') : {};
  const { useUserStore } = load('src/stores/useUserStore.ts', {
    zustand: require('zustand'),
    'zustand/middleware': { persist: (initializer, options) => middleware.persist(initializer, { ...options, storage: middleware.createJSONStorage(() => local) }) },
    '../lib/constants': constants, '../lib/legacyTokenPurge': purge,
  }, { localStorage: local, navigator });
  stores.set(local, useUserStore);
  return useUserStore;
}
function hookStore(store) {
  return Object.assign((selector = (state) => state) => selector(store.getState()), store);
}
const normalize = (value) => JSON.parse(JSON.stringify(value));
const flush = () => new Promise((resolve) => setImmediate(resolve));

function transport(local, fetch, onLogout = () => {}, { desktop = false } = {}) {
  const useUserStore = userStore(local);
  const events = [];
  const eventEmitter = { emit: (...args) => {
    events.push(normalize(args));
    const result = onLogout(...args);
    if (args[1]?.complete) Promise.resolve(result).then((didLogout) => args[1].complete(didLogout !== false));
  } };
  const { ApiClient } = load('src/api/base-client.ts', {
    'eventsource-parser': {}, openai: { default: class {} }, sonner: { toast: {} }, '@/lib': {},
    '@/lib/constants': constants, '@/lib/event': { eventEmitter }, '@/lib/network': { isOnline: () => true, isOfflineError: () => false },
    '@/stores/useUserStore': { useUserStore },
    '@/stores/useConversationStore': { useConversationStore: { getState: () => ({ updateConversation: () => {} }) } },
    '@/types': {}, '@/utils/desktop': { isTauri: () => desktop },
    '@tauri-apps/plugin-http': { fetch },
    './constants': { CHAT_API_BASE_URL: 'https://api.example', DEPRECATED_API_BASE_URL: 'https://legacy.example' },
    './query-keys': {}, '@/lib/utils/mock': {},
  }, { localStorage: local, fetch: desktop ? () => assert.fail('Native exchange must use plugin-http') : fetch });
  const { authClient } = load('src/api/auth/client.ts', { '@/api/base-client': { ApiClient }, '@/stores/useUserStore': { useUserStore }, '@/lib/constants': constants }, { localStorage: local, window: { location: { origin: 'https://app.example' } } });
  const clearSession = (expectedToken) => useUserStore.getState().logout(expectedToken);
  const logout = existsSync('src/lib/logout.ts') ? load('src/lib/logout.ts', { '@/api/auth/client': { authClient }, '@/stores/useUserStore': { useUserStore }, '@/lib/event': { eventEmitter } }, { localStorage: local }) : {};
  return { authClient, ApiClient, events, clearSession, useUserStore, ...logout };
}

function renderAuth(context, authClient, { desktop = false, userFetch = async () => ({ user: { id: "user" } }), onNavigate = () => {} } = {}) {
  const effects = [], errors = [], navigations = [], opened = [];
  let nativeHandler;
  const sessionCredentials = load('src/lib/sessionCredentials.ts', { '@/lib/constants': constants, '@/stores/useUserStore': { useUserStore: context.useUserStore } }, context.globals);
  const dependencies = new Proxy({
    'react/jsx-runtime': require('react/jsx-runtime'),
    react: { useRef: (current) => ({ current }), useCallback: (fn) => fn, useEffect: (fn) => effects.push(fn), useState: (value) => [value, () => {}] },
    'react-router': { useSearchParams: () => [context.globals.window.location.searchParams], useNavigate: () => (...args) => { navigations.push(args); onNavigate(...args); } },
    '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries() {} }) },
    '@/api/auth/client': { authClient }, '@/api/config/queries': { useConfig: () => ({ data: { name: 'App' } }) },
    '@/api/query-keys': { queryKeys: { models: { all: [] }, users: { userData: [] } } },
    '@/api/users/client': { usersClient: { getUserData: userFetch } },
    '@/stores/useUserStore': { useUserStore: hookStore(context.useUserStore) },
    '@/lib/sessionCredentials': sessionCredentials,
    '@/lib/authCallback': context.callback, '@/lib/oauthCodeFlow': context.pkce, '@/lib/constants': constants,
    '@/lib/posthog': { posthogOauthLogin() {}, posthogOauthSignup() {} },
    '@/lib': { cn: (...classes) => classes.join(' ') },
    '@/utils/desktop': { isTauri: () => desktop, getDesktopOAuthCallbackUrl: async () => 'http://127.0.0.1:54321/oauth/callback', listenForDesktopOAuth: async (handler) => { nativeHandler = handler; return () => {}; } },
    '@/api/constants': { NEAR_LOGIN_URL: 'https://app.example' },
    '@tauri-apps/plugin-shell': { open: async (url) => opened.push(url) },
    './routes': { APP_ROUTES: { HOME: '/', NEAR_LOGIN: '/near-login' } },
    sonner: { toast: { error: (message) => errors.push(message), message() {} } },
  }, {
    has: () => true,
    get: (target, id) => target[id] ?? new Proxy({}, { get: () => () => null }),
  });
  const { default: AuthPage } = load('src/pages/AuthPage.tsx', dependencies, context.globals);
  const tree = AuthPage();
  let cleanups = effects.map((effect) => effect()).filter((cleanup) => typeof cleanup === "function");
  function buttons(node, found = []) {
    if (!node || typeof node !== 'object') return found;
    if (node.props?.onClick) found.push(node.props.onClick);
    for (const child of [node.props?.children].flat(Infinity)) buttons(child, found);
    return found;
  }
  return { errors, navigations, opened, unmount: () => cleanups.forEach((cleanup) => cleanup()), replayEffects: () => { cleanups.forEach((cleanup) => cleanup()); cleanups = effects.map((effect) => effect()).filter((cleanup) => typeof cleanup === "function"); }, click: (index) => buttons(tree)[index](), handler: () => nativeHandler, deliver: (payload) => nativeHandler(payload) };
}
module.exports = { load, storage, browser, userStore, hookStore, transport, renderAuth, constants, keys, normalize, flush };
