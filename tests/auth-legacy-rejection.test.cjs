const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load, storage, browser, userStore, renderAuth, constants, keys, flush } = require('./helpers/auth.cjs');

for (const existingToken of [null, 'sess_victim']) {
for (const suffix of ['?token=sess_attacker&session_id=id', '?%74oken=sess_attacker', '#token=sess_attacker&session_id=id']) {
  test(`URL bearer cannot install or replace session (${existingToken}): ${suffix}`, async () => {
    const local = storage();
    if (existingToken) local.setItem(keys.TOKEN, existingToken);
    const globals = { localStorage: local, sessionStorage: storage(), window: browser(`https://app.example/auth/callback${suffix}`), navigator: {} };
    const context = { globals, useUserStore: userStore(local), pkce: load('src/lib/oauthCodeFlow.ts', {}, globals), callback: load('src/lib/authCallback.ts', {}, globals) };
    context.callback.consumeAuthCallbackCredentials();
    renderAuth(context, { exchangeOAuthCode() { assert.fail('Bearer URL must never exchange'); } });
    const effects = [];
    const { useAppInitialization } = load('src/hooks/useAppInitialization.ts', {
      react: { useEffect: fn => effects.push(fn), useState: value => [value, () => {}] },
      '@/api/config/queries': { useConfig: () => ({ isLoading: false }) },
      '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries() {} }) },
      '@/api/query-keys': { queryKeys: { models: { all: [] } } },
      '@/lib/authCallback': context.callback,
      '@/lib/sessionCredentials': load('src/lib/sessionCredentials.ts', { '@/lib/constants': constants, '@/stores/useUserStore': { useUserStore: context.useUserStore } }, globals),
      '@/utils/desktop': { initializeDesktopIntegrations: async () => {} },
    }, globals);
    useAppInitialization(); effects.forEach(effect => { effect(); });
    await flush();
    assert.equal(local.getItem(keys.TOKEN), existingToken);
    assert.doesNotMatch(globals.window.location.href, /sess_attacker|token=|session_id=/);
  });
}
}

for (const variant of ['query-bearer', 'hash-bearer', 'duplicate-code', 'duplicate-state', 'channel', 'hash-code']) {
  test(`valid PKCE state cannot legitimize mixed or ambiguous callback: ${variant}`, async () => {
    const local = storage();
    local.setItem(keys.TOKEN, 'sess_victim');
    const globals = { localStorage: local, sessionStorage: storage(), window: browser('https://app.example/auth/callback'), navigator: {} };
    const context = { globals, useUserStore: userStore(local), pkce: load('src/lib/oauthCodeFlow.ts', {}, globals), callback: load('src/lib/authCallback.ts', {}, globals) };
    const { state } = await context.pkce.prepareOAuthCodeFlow();
    const url = new URL(`https://app.example/auth/callback?code=once&state=${state}`);
    if (variant === 'query-bearer') url.search += '&%74oken=sess_attacker';
    if (variant === 'hash-bearer') url.hash = 'session_id=id&token=sess_attacker';
    if (variant === 'duplicate-code') url.search += '&%63ode=another';
    if (variant === 'duplicate-state') url.search += `&%73tate=${state}`;
    if (variant === 'channel') url.searchParams.set('oauth_channel', 'old-channel');
    if (variant === 'hash-code') url.hash = `code=another&state=${state}`;
    globals.window.location = url;
    context.callback.consumeAuthCallbackCredentials();
    globals.BroadcastChannel = class { constructor() { assert.fail('Cannot forward credentials'); } };
    const ui = renderAuth(context, { exchangeOAuthCode() { assert.fail('Reject before exchange'); } });
    await flush();
    assert.equal(local.getItem(keys.TOKEN), 'sess_victim');
    assert.equal(ui.errors.length, 1);
    assert.equal(ui.navigations.length, 0);
    assert.throws(() => context.pkce.consumeOAuthCodeFlow(state));
  });
}
