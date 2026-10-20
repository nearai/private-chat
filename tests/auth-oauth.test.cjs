const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync, existsSync } = require('node:fs');
const { load, storage, browser, userStore, hookStore, transport, renderAuth, constants, keys, normalize, flush } = require('./helpers/auth.cjs');

function flow(local = storage(), win = browser('https://app.example/auth'), navigator = {}) {
  const sessionStorage = storage();
  const globals = { localStorage: local, sessionStorage, window: win, navigator };
  return { globals, useUserStore: userStore(local, navigator), pkce: load('src/lib/oauthCodeFlow.ts', {}, globals), callback: load('src/lib/authCallback.ts', {}, globals) };
}

test('PKCE matches RFC 7636; verifier is random, tab-local and consumed once', async () => {
  const { pkce, globals } = flow();
  assert.equal(await pkce.createPkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  const { state, codeChallenge } = await pkce.prepareOAuthCodeFlow();
  assert.match(state, /^[A-Za-z0-9_-]{43}$/);
  const verifier = pkce.consumeOAuthCodeFlow(state);
  assert.equal(await pkce.createPkceChallenge(verifier), codeChallenge);
  assert.equal(globals.localStorage.getItem('oauth_code_verifier'), null);
  assert.throws(() => pkce.consumeOAuthCodeFlow(state));
});
test('missing/mismatched state and unavailable storage fail closed', async () => {
  const { pkce } = flow();
  for (const returnedState of [null, 'wrong-state']) {
    const { state } = await pkce.prepareOAuthCodeFlow();
    assert.throws(() => pkce.consumeOAuthCodeFlow(returnedState));
    assert.throws(() => pkce.consumeOAuthCodeFlow(state));
  }
  await assert.rejects(() => pkce.prepareOAuthCodeFlow({ setItem() { throw new Error('unavailable'); } }));
});
for (const suffix of [
  '?token=sess_secret&token=other&session_id=id&redirect=%2Fc%2F1#plans',
  '?%74oken=sess_secret&session_id=id#token=hash_secret&session_id=hash_id&keep=yes',
]) {
  test(`sanitizes all query/fragment bearer copies and retains legacy memory handoff ${suffix}`, () => {
    const context = flow(storage(), browser(`https://app.example/auth/callback${suffix}`));
    context.callback.consumeAuthCallbackCredentials();
    assert.doesNotMatch(context.globals.window.location.href, /sess_secret|hash_secret|token|session_id/);
    assert.equal(context.callback.getQueryCallbackCredentials().token, 'sess_secret');
    context.callback.clearQueryCallbackCredentials();
    assert.equal(context.callback.getQueryCallbackCredentials().token, null);
    if (suffix.endsWith('#plans')) assert.equal(context.globals.window.location.hash, '#plans');
  });
}
test('code is removed before third-party startup and handed off only once', () => {
  const context = flow(storage(), browser('https://app.example/auth/callback?code=once&state=state&redirect=%2Fc%2F1'));
  context.callback.consumeAuthCallbackCredentials();
  assert.equal(context.globals.window.location.href, 'https://app.example/auth/callback?state=state&redirect=%2Fc%2F1');
  assert.deepEqual(normalize(context.callback.getQueryCallbackCredentials()), { code: 'once', token: null, sessionId: null });
  context.callback.clearQueryCallbackCredentials();
  assert.equal(context.callback.getQueryCallbackCredentials().code, null);
  const main = readFileSync('src/main.tsx', 'utf8');
  assert.ok(main.indexOf('consumeAuthCallbackCredentials();') < main.indexOf('initPosthog();'));
  assert.ok(main.indexOf('consumeAuthCallbackCredentials();') < main.indexOf('initCrisp();'));
  assert.doesNotMatch(readFileSync('index.html', 'utf8'), /client\.crisp\.chat/);
});
test('duplicate credential parameters are all removed from the address bar', () => {
  const context = flow(storage(), browser('https://app.example/auth/callback?code=a&code=b&token=t&token=t2&session_id=id'));
  context.callback.consumeAuthCallbackCredentials();
  assert.doesNotMatch(context.globals.window.location.href, /code=|token=|session_id=/);
});

test('OAuth initiation and exchange send only challenge/state in URL and verifier in POST body', async () => {
  const calls = [];
  const { authClient } = transport(storage(), async (...args) => {
    calls.push(args);
    return Response.json({ token: 'sess_new', session_id: 'new-id' });
  });
  for (const provider of ['google', 'github']) {
    const url = new URL(authClient.getOAuthUrl(provider, 'https://app.example', { responseMode: 'code', codeChallenge: 'A'.repeat(43), frontendState: 'B'.repeat(43) }));
    assert.equal(url.searchParams.get('frontend_response_mode'), 'code');
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(url.searchParams.get('frontend_state'), 'B'.repeat(43));
    assert.ok(!url.searchParams.has('token') && !url.searchParams.has('code_verifier'));
  }
  const response = await authClient.exchangeOAuthCode('one-time', 'verifier');
  assert.equal(response.token, 'sess_new');
  assert.equal(calls[0][0], 'https://api.example/v1/auth/exchange');
  assert.equal(calls[0][1].method, 'POST');
  assert.deepEqual(JSON.parse(calls[0][1].body), { code: 'one-time', code_verifier: 'verifier' });
});
for (const desktop of [false, true]) {
  test(`${desktop ? 'native' : 'browser'} exchange opts in to receiving the gateway cookie`, async () => {
    const calls = [];
    const { authClient } = transport(storage(), async (...args) => {
      calls.push(args);
      return Response.json({ token: 'sess_verified', session_id: 'verified-id' }, {
        headers: { 'Set-Cookie': 'gateway=verified; Domain=.near.ai; Path=/; Secure; HttpOnly; SameSite=None' },
      });
    }, undefined, { desktop });
    await authClient.exchangeOAuthCode('one-time-code', 'frontend-verifier');
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'https://api.example/v1/auth/exchange');
    assert.equal(calls[0][1].credentials, 'include');
    assert.deepEqual(JSON.parse(calls[0][1].body), { code: 'one-time-code', code_verifier: 'frontend-verifier' });
    assert.equal(calls[0][1].headers.Authorization, undefined);
  });
}

for (const desktop of [false, true]) {
  for (const status of [401, 502, 'network failure']) {
    test(`${desktop ? 'native' : 'web'} exchange ${status} requires fresh sign-in without installing a session or retrying`, async () => {
      const local = storage(); local.setItem(keys.AGREED_TERMS, 'V2');
      const context = flow(local);
      const calls = [];
      const { authClient } = transport(local, async (...args) => {
        calls.push(args);
        if (status === 'network failure') throw new TypeError('Failed to fetch');
        return Response.json({ code: 'exchange_failed', message: 'Restart sign-in' }, { status });
      }, undefined, { desktop });
      let state;
      let ui;
      if (desktop) {
        ui = renderAuth(context, authClient, { desktop: true });
        await ui.click(0);
        state = new URL(ui.opened[0]).searchParams.get('frontend_state');
        ui.deliver({ code: 'one-time-code', state });
      } else {
        ({ state } = await context.pkce.prepareOAuthCodeFlow());
        context.globals.window.location = new URL(`https://app.example/auth/callback?code=one-time-code&state=${state}`);
        context.callback.consumeAuthCallbackCredentials();
        authClient.oauth2SignIn = (provider, callback, options) => {
          context.globals.window.location.href = authClient.getOAuthUrl(provider, callback ?? context.globals.window.location.origin, options);
        };
        ui = renderAuth(context, authClient);
      }
      await flush();
      assert.equal(calls.length, 1);
      assert.equal(local.getItem(keys.TOKEN), null);
      assert.equal(local.getItem(keys.SESSION), null);
      assert.equal(ui.errors.length, 1);
      assert.equal(ui.navigations.length, 0);
      assert.throws(() => context.pkce.consumeOAuthCodeFlow(state));
      if (desktop) ui.deliver({ code: 'one-time-code', state });
      else renderAuth(context, { exchangeOAuthCode() { assert.fail('Spent callback replay'); } });
      await flush();
      assert.equal(calls.length, 1);
      await ui.click(1);
      const restart = new URL(desktop ? ui.opened[1] : context.globals.window.location.href);
      assert.equal(restart.searchParams.get('frontend_response_mode'), 'code');
      assert.notEqual(restart.searchParams.get('frontend_state'), state);
      const verifier = context.pkce.consumeOAuthCodeFlow(restart.searchParams.get('frontend_state'));
      assert.equal(await context.pkce.createPkceChallenge(verifier), restart.searchParams.get('code_challenge'));
    });
  }
}

test('web callback exchanges code before persisting credentials and redirecting', async () => {
  const local = storage();
  const context = flow(local);
  const { state } = await context.pkce.prepareOAuthCodeFlow();
  context.globals.window.location = new URL(`https://app.example/auth/callback?code=once&state=${state}`);
  context.callback.consumeAuthCallbackCredentials();
  let resolveExchange;
  const calls = [];
  const ui = renderAuth(context, { exchangeOAuthCode: (...args) => { calls.push(args); return new Promise((resolve) => { resolveExchange = resolve; }); } });
  assert.equal(local.getItem(keys.TOKEN), null);
  assert.equal(calls.length, 1);
  resolveExchange({ token: 'sess_new', session_id: 'id', is_new_user: false });
  await flush();
  assert.equal(local.getItem(keys.TOKEN), 'sess_new');
  assert.equal(local.getItem(keys.SESSION), 'id');
  assert.equal(ui.navigations.length, 1);
  assert.equal(ui.errors.length, 0);
  renderAuth(context, { exchangeOAuthCode() { assert.fail('Callback replay'); } });
  await flush();
});
for (const handoff of ['?code=bad&state=wrong']) {
  test(`mismatched code state cannot log in: ${handoff}`, async () => {
    const context = flow(storage(), browser(`https://app.example/auth/callback${handoff}`));
    await context.pkce.prepareOAuthCodeFlow();
    context.callback.consumeAuthCallbackCredentials();
    const ui = renderAuth(context, { exchangeOAuthCode() { assert.fail('Invalid callback exchange'); } });
    await flush();
    assert.equal(context.globals.localStorage.getItem(keys.TOKEN), null);
    assert.equal(ui.errors.length, 1);
    assert.equal(ui.navigations.length, 0);
  });
}
test('web OAuth buttons always prepare PKCE before navigation', async () => {
  const local = storage(); local.setItem(keys.AGREED_TERMS, 'V2');
  const context = flow(local);
  const { authClient } = transport(local, () => assert.fail('No request expected'));
  authClient.oauth2SignIn = (provider, callback, options) => { context.globals.window.location.href = authClient.getOAuthUrl(provider, callback ?? context.globals.window.location.origin, options); };
  const ui = renderAuth(context, authClient);
  await ui.click(0);
  const url = new URL(context.globals.window.location.href);
  assert.equal(url.searchParams.get('frontend_response_mode'), 'code');
  const verifier = context.pkce.consumeOAuthCodeFlow(url.searchParams.get('frontend_state'));
  assert.equal(await context.pkce.createPkceChallenge(verifier), url.searchParams.get('code_challenge'));
});
for (const mode of ['code', 'near']) {
  test(`native ${mode} callbacks check initiating state and mode before persisting; replay is ignored`, async () => {
    const local = storage(); local.setItem(keys.AGREED_TERMS, 'V2');
    const context = flow(local);
    const calls = [];
    const { authClient } = transport(local, async (...args) => {
      calls.push(args);
      return Response.json({ token: 'sess_code', session_id: 'code-id', is_new_user: false });
    });
    const ui = renderAuth(context, authClient, { desktop: true });
    await ui.click(mode === 'code' ? 0 : 2);
    const url = new URL(ui.opened[0]);
    const state = url.searchParams.get(mode === 'code' ? 'frontend_state' : 'state');
    const payload = mode === 'code' ? { code: 'one-time', state } : { token: 'sess_near', sessionId: 'near-id', state };
    ui.deliver({ ...payload, state: 'wrong' });
    ui.deliver(mode === 'code' ? { token: 'wrong-transport', sessionId: 'id', state } : { code: 'wrong-transport', state });
    assert.equal(local.getItem(keys.TOKEN), null);
    assert.equal(calls.length, 0);
    ui.deliver(payload); ui.deliver(payload);
    await flush();
    assert.equal(local.getItem(keys.TOKEN), mode === 'code' ? 'sess_code' : 'sess_near');
    assert.equal(calls.length, mode === 'code' ? 1 : 0);
    assert.equal(ui.navigations.length, 1);
    assert.equal(ui.errors.length, 0);
  });
}

test('native NEAR destination accepts only exact loopback route with explicit port and random state', () => {
  const { validateDesktopNearCallback: validate } = load('src/lib/desktopNearCallback.ts');
  const state = 'A'.repeat(43);
  assert.equal(validate('http://127.0.0.1:54321/oauth/callback', state), 'http://127.0.0.1:54321/oauth/callback');
  for (const callback of [null, 'https://attacker.example/oauth/callback', 'http://localhost:54321/oauth/callback', 'http://127.0.0.1/oauth/callback', 'http://127.0.0.1:54321/oauth/callback?token=x', 'http://127.0.0.1:54321/oauth/callback#x', 'http://user@127.0.0.1:54321/oauth/callback', 'http://127.0.0.1:54321/oauth/callback/other']) {
    assert.throws(() => validate(callback, state));
  }
  assert.throws(() => validate('http://127.0.0.1:54321/oauth/callback', 'wrong'));
});
test('native NEAR places bearer only in POST form body, never action URL', () => {
  let submitted;
  const body = { appendChild() {} };
  const document = { body, createElement: () => ({ children: [], appendChild(child) { this.children.push(child); }, remove() {}, submit() { submitted = this; } }) };
  const { postDesktopNearCallback } = load('src/lib/desktopNearCallback.ts', {}, { document });
  postDesktopNearCallback('http://127.0.0.1:54321/oauth/callback', 'A'.repeat(43), { token: 'sess_secret', session_id: 'id', is_new_user: true });
  assert.equal(submitted.method, 'POST');
  assert.equal(submitted.action, 'http://127.0.0.1:54321/oauth/callback');
  assert.equal(submitted.children.find((input) => input.name === 'token').value, 'sess_secret');
  assert.ok(submitted.children.every((input) => input.type === 'hidden'));
});

const legacyNearChannel = '550e8400-e29b-41d4-a716-446655440000';
const nearCallbackUrl = 'http://127.0.0.1:54321/oauth/callback';
const nearAuthResponse = { token: 'sess+secret&token=other', session_id: 'id&state=other', is_new_user: true };

test('old desktop NEAR protocol returns encoded GET credentials with the original channel', () => {
  const destinations = [];
  const helper = load('src/lib/desktopNearCallback.ts', {}, {
    window: { location: { replace: (destination) => destinations.push(destination) } },
  });
  const callback = helper.resolveDesktopNearCallback(new URLSearchParams({
    frontend_callback: nearCallbackUrl, oauth_channel: legacyNearChannel,
  }));
  assert.equal(callback.mode, 'legacy');
  helper.completeDesktopNearCallback(callback, nearAuthResponse);
  assert.equal(destinations.length, 1);
  const url = new URL(destinations[0]);
  assert.equal(url.origin + url.pathname, nearCallbackUrl);
  assert.equal(url.searchParams.get('oauth_channel'), legacyNearChannel);
  assert.equal(url.searchParams.get('token'), nearAuthResponse.token);
  assert.equal(url.searchParams.get('session_id'), nearAuthResponse.session_id);
  assert.equal(url.searchParams.get('is_new_user'), 'true');
  assert.equal(url.searchParams.has('state'), false);
  assert.equal(url.searchParams.getAll('token').length, 1);
});

test('valid modern state selects POST even when a legacy channel is also present', () => {
  let submitted;
  const document = { body: { appendChild() {} }, createElement: () => ({
    children: [], appendChild(child) { this.children.push(child); }, remove() {}, submit() { submitted = this; },
  }) };
  const helper = load('src/lib/desktopNearCallback.ts', {}, {
    document, window: { location: { replace() { assert.fail('Modern callback must not navigate to a bearer URL'); } } },
  });
  const state = 'A'.repeat(43);
  const callback = helper.resolveDesktopNearCallback(new URLSearchParams({
    frontend_callback: nearCallbackUrl, state, oauth_channel: legacyNearChannel,
  }));
  assert.equal(callback.mode, 'post');
  helper.completeDesktopNearCallback(callback, nearAuthResponse);
  assert.equal(submitted.method, 'POST');
  assert.equal(submitted.action, nearCallbackUrl);
  assert.equal(submitted.children.find((input) => input.name === 'state').value, state);
  assert.equal(submitted.children.find((input) => input.name === 'token').value, nearAuthResponse.token);
  assert.equal(submitted.children.some((input) => input.name === 'oauth_channel'), false);
});

test('invalid or duplicate protocol parameters cannot downgrade to legacy NEAR', () => {
  const { resolveDesktopNearCallback: resolve } = load('src/lib/desktopNearCallback.ts');
  for (const state of ['', 'wrong', 'A'.repeat(42), 'A'.repeat(43) + '=']) {
    assert.throws(() => resolve(new URLSearchParams({ frontend_callback: nearCallbackUrl, state, oauth_channel: legacyNearChannel })));
  }
  for (const channel of [null, '', 'desktop-channel', '550e8400-e29b-11d4-a716-446655440000', '550e8400-e29b-41d4-7716-446655440000']) {
    const params = new URLSearchParams({ frontend_callback: nearCallbackUrl });
    if (channel !== null) params.set('oauth_channel', channel);
    assert.throws(() => resolve(params));
  }
  for (const field of ['frontend_callback', 'state', 'oauth_channel']) {
    const params = new URLSearchParams({ frontend_callback: nearCallbackUrl, state: 'A'.repeat(43), oauth_channel: legacyNearChannel });
    params.append(field, params.get(field));
    assert.throws(() => resolve(params));
  }
  const encodedDuplicate = new URLSearchParams({ frontend_callback: nearCallbackUrl, oauth_channel: legacyNearChannel });
  assert.throws(() => resolve(new URLSearchParams(`${encodedDuplicate}&%73tate=&state=${'A'.repeat(43)}`)));
});

test('legacy NEAR cannot send credentials outside the exact loopback destination', () => {
  const { resolveDesktopNearCallback: resolve, completeDesktopNearCallback: complete } = load('src/lib/desktopNearCallback.ts', {}, {
    window: { location: { replace() { assert.fail('Rejected destination must not receive credentials'); } } },
  });
  for (const callbackUrl of [null, 'https://attacker.example/oauth/callback', 'http://localhost:54321/oauth/callback', 'http://127.0.0.1/oauth/callback', 'http://user@127.0.0.1:54321/oauth/callback', `${nearCallbackUrl}?token=x`, `${nearCallbackUrl}#x`, `${nearCallbackUrl}/other`]) {
    const params = new URLSearchParams({ oauth_channel: legacyNearChannel });
    if (callbackUrl !== null) params.set('frontend_callback', callbackUrl);
    assert.throws(() => resolve(params));
    assert.throws(() => complete({ mode: 'legacy', callbackUrl, oauthChannel: legacyNearChannel }, nearAuthResponse));
  }
});

test('legacy navigation errors do not expose the credential URL to error logging', () => {
  const { completeDesktopNearCallback: complete } = load('src/lib/desktopNearCallback.ts', {}, {
    window: { location: { replace(destination) { throw new Error(`Navigation rejected: ${destination}`); } } },
  });
  assert.throws(() => complete({ mode: 'legacy', callbackUrl: nearCallbackUrl, oauthChannel: legacyNearChannel }, nearAuthResponse), (error) => {
    assert.equal(error.message, 'Unable to deliver desktop login callback');
    assert.doesNotMatch(error.message, /sess|token|127\.0\.0\.1/);
    return true;
  });
});

function renderNearLogin(params) {
  const effects = [], errors = [], calls = [], destinations = [];
  const document = { body: { appendChild() {} }, createElement: () => ({
    children: [], appendChild(child) { this.children.push(child); }, remove() {},
    submit() { calls.push(['post', this.action, Object.fromEntries(this.children.map((input) => [input.name, input.value]))]); },
  }) };
  const globals = { document, window: { location: { replace: (destination) => destinations.push(destination) } } };
  const helper = load('src/lib/desktopNearCallback.ts', {}, globals);
  const { default: NearLogin } = load('src/pages/NearLogin.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    react: { useRef: (current) => ({ current }), useEffect: (effect) => effects.push(effect), useState: (initial) => [initial, (next) => { if (initial === null) errors.push(next); }] },
    'react-router': { useSearchParams: () => [params] },
    '@hot-labs/near-connect': { NearConnector: class { async connect() { calls.push(['wallet']); } } },
    'near-kit': { fromHotConnect: () => ({}), generateNonce: () => new Uint8Array(32), Near: class { async signMessage() { calls.push(['signature']); return {}; } } },
    '@/api/auth/client': { authClient: { async sendNearAuth() { calls.push(['auth']); return nearAuthResponse; } } },
    '@/api/config/queries': { useConfig: () => ({ data: { signInMessage: 'Sign in' } }) },
    '@/assets/icons/near-ai.svg?react': { default: () => null },
    '@/components/common/Spinner': { default: () => null }, '@/components/ui/button': { Button: () => null },
    '@/lib/desktopNearCallback': helper, '@/api/constants': { CHAT_API_BASE_URL: 'https://api.example' },
  }, globals);
  NearLogin();
  // React StrictMode replays the effect; the same mounted flow must sign only once.
  for (const effect of effects) { effect(); effect(); }
  return { calls, errors, destinations };
}

for (const mode of ['modern', 'legacy']) {
  test(`hosted NEAR page completes ${mode} desktop login using its matching transport`, async () => {
    const params = new URLSearchParams({ frontend_callback: nearCallbackUrl });
    params.set(mode === 'modern' ? 'state' : 'oauth_channel', mode === 'modern' ? 'A'.repeat(43) : legacyNearChannel);
    const page = renderNearLogin(params);
    await flush();
    assert.deepEqual(page.calls.slice(0, 3), [['wallet'], ['signature'], ['auth']]);
    assert.deepEqual(page.errors, []);
    if (mode === 'modern') {
      assert.equal(page.destinations.length, 0);
      assert.equal(page.calls.length, 4);
      assert.equal(page.calls[3][0], 'post');
      assert.equal(page.calls[3][1], nearCallbackUrl);
      assert.equal(page.calls[3][2].state, 'A'.repeat(43));
    } else {
      assert.equal(page.calls.length, 3);
      assert.equal(page.destinations.length, 1);
      assert.equal(new URL(page.destinations[0]).searchParams.get('oauth_channel'), legacyNearChannel);
    }
  });
}

test('hosted NEAR rejects malformed callbacks before wallet connection or authentication', async () => {
  const invalidRequests = [
    new URLSearchParams({ frontend_callback: nearCallbackUrl, state: '', oauth_channel: legacyNearChannel }),
    new URLSearchParams({ frontend_callback: 'https://attacker.example/oauth/callback', oauth_channel: legacyNearChannel }),
    new URLSearchParams({ frontend_callback: nearCallbackUrl }),
    new URLSearchParams({ frontend_callback: nearCallbackUrl, oauth_channel: 'bad-channel' }),
    new URLSearchParams(`frontend_callback=${encodeURIComponent(nearCallbackUrl)}&state=${'A'.repeat(43)}&state=${'B'.repeat(43)}`),
  ];
  for (const params of invalidRequests) {
    const page = renderNearLogin(params);
    await flush();
    assert.deepEqual(page.calls, []);
    assert.equal(page.destinations.length, 0);
    assert.equal(page.errors.length, 1);
  }
});
test('unauthenticated code exchange 401 cannot clear an existing login', async () => {
  const local = storage(); local.setItem(keys.TOKEN, 'sess_existing');
  const client = transport(local, async () => Response.json({ detail: 'unauthorized' }, { status: 401 }));
  await assert.rejects(client.authClient.exchangeOAuthCode('bad', 'bad'));
  assert.deepEqual(client.events, []);
  assert.equal(local.getItem(keys.TOKEN), 'sess_existing');
});

test('desktop sign-in remains pending during exchange and cannot start a competing account login', async () => {
  const local = storage(); local.setItem(keys.AGREED_TERMS, 'V2');
  const context = flow(local);
  let resolveExchange;
  const { authClient } = transport(local, () => new Promise((resolve) => { resolveExchange = resolve; }));
  const ui = renderAuth(context, authClient, { desktop: true });
  await ui.click(0);
  const state = new URL(ui.opened[0]).searchParams.get('frontend_state');
  ui.deliver({ code: 'first-code', state });
  await flush();
  await ui.click(1);
  assert.equal(ui.opened.length, 1);
  assert.equal(local.getItem(keys.TOKEN), null);
  resolveExchange(Response.json({ token: 'sess_first', session_id: 'first-id', is_new_user: false }));
  await flush();
  assert.equal(local.getItem(keys.TOKEN), 'sess_first');
  assert.equal(ui.navigations.length, 1);
});

test('desktop login can retry before callback; a stale listener cannot consume the new flow', async () => {
  const local = storage(); local.setItem(keys.AGREED_TERMS, 'V2');
  const context = flow(local);
  const { authClient } = transport(local, () => assert.fail('NEAR should not exchange OAuth code'));
  const ui = renderAuth(context, authClient, { desktop: true });
  await ui.click(2);
  const firstState = new URL(ui.opened[0]).searchParams.get('state');
  const firstHandler = ui.handler();
  await ui.click(2);
  const newState = new URL(ui.opened[1]).searchParams.get('state');
  assert.notEqual(newState, firstState);
  firstHandler({ token: 'sess_stale', sessionId: 'old-id', state: firstState });
  await flush();
  assert.equal(local.getItem(keys.TOKEN), null);
  ui.deliver({ token: 'sess_new', sessionId: 'new-id', state: newState });
  await flush();
  assert.equal(local.getItem(keys.TOKEN), 'sess_new');
  assert.equal(ui.errors.length, 0);
  assert.equal(ui.navigations.length, 1);
});

for (const sessionId of [null, 'legacy-id']) {
  test(`legacy web query callback logs in after URL cleanup (session ID=${sessionId})`, async () => {
    const suffix = sessionId ? `&session_id=${sessionId}` : '';
    const context = flow(storage(), browser(`https://app.example/auth/callback?token=sess_legacy${suffix}&is_new_user=true&redirect=%2Fc%2F1`));
    await context.pkce.prepareOAuthCodeFlow();
    assert.equal(context.callback.consumeAuthCallbackCredentials(), true);
    assert.doesNotMatch(context.globals.window.location.href, /sess_legacy|token=|session_id=/);
    const ui = renderAuth(context, { exchangeOAuthCode() { assert.fail('Legacy flow must not exchange a code'); } });
    await flush();
    assert.equal(context.globals.localStorage.getItem(keys.TOKEN), 'sess_legacy');
    assert.equal(context.globals.localStorage.getItem(keys.SESSION), sessionId);
    assert.equal(ui.errors.length, 0);
    assert.equal(context.callback.getQueryCallbackCredentials().token, null);
    assert.throws(() => context.pkce.consumeOAuthCodeFlow('any-state'));
    renderAuth(context, { exchangeOAuthCode() { assert.fail('Consumed callback replay'); } });
    await flush();
    assert.equal(ui.navigations.length, 1);
  });
}

test('query and fragment handoffs have separate owners and clearing cannot consume the other', () => {
  const context = flow(storage(), browser('https://app.example/auth?token=query-token&session_id=query-id#token=hash-token&session_id=hash-id'));
  context.callback.consumeAuthCallbackCredentials();
  context.callback.clearQueryCallbackCredentials();
  assert.equal(context.callback.getQueryCallbackCredentials().token, null);
  assert.equal(context.callback.getHashCallbackCredentials().token, 'hash-token');
  context.callback.clearHashCallbackCredentials();
  assert.equal(context.callback.getHashCallbackCredentials().token, null);
});
for (const sessionId of [null, 'hash-id']) {
  test(`legacy fragment callback initializes the session store (session ID=${sessionId})`, async () => {
    const context = flow(storage(), browser(`https://app.example/#token=sess_hash${sessionId ? `&session_id=${sessionId}` : ''}`));
    context.callback.consumeAuthCallbackCredentials();
    const effects = [], updates = [], desktopCalls = [];
    const { useAppInitialization } = load('src/hooks/useAppInitialization.ts', {
      react: { useEffect: (fn) => effects.push(fn), useState: (value) => [value, (next) => updates.push(next)] },
      '@/api/config/queries': { useConfig: () => ({ isLoading: false }) },
      '@/lib/authCallback': context.callback,
      '@/stores/useUserStore': { useUserStore: hookStore(context.useUserStore) },
      '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries() {} }) },
      '@/api/query-keys': { queryKeys: { models: { all: [] } } },
      '@/lib/sessionCredentials': load('src/lib/sessionCredentials.ts', { '@/lib/constants': constants, '@/stores/useUserStore': { useUserStore: context.useUserStore } }, context.globals),
      '@/utils/desktop': { initializeDesktopIntegrations: async () => desktopCalls.push(true) },
    }, context.globals);
    useAppInitialization(); effects.forEach((effect) => effect()); await flush();
    assert.equal(context.globals.localStorage.getItem(keys.TOKEN), 'sess_hash');
    assert.equal(context.globals.localStorage.getItem(keys.SESSION), sessionId);
    assert.equal(context.callback.getHashCallbackCredentials().token, null);
    assert.equal(desktopCalls.length, 1);
    assert.ok(updates.includes(true));
    assert.equal(context.globals.window.location.href, 'https://app.example/');
  });
}
test('sanitization failure disables third-party startup; ordinary codes/anchors remain intact', () => {
  const context = flow(storage(), browser('https://app.example/auth?token=sess_secret'));
  context.globals.window.history.replaceState = () => { throw new Error('unavailable'); };
  assert.equal(context.callback.consumeAuthCallbackCredentials(), false);
  assert.equal(context.callback.consumeAuthCallbackCredentials(), false);
  assert.match(readFileSync('src/main.tsx', 'utf8'), /if \(authCallbackUrlSanitized\) \{\s*initPosthog\(\);\s*initCrisp\(\);/);
  const ordinary = flow(storage(), browser('https://app.example/shared?code=public-invite#plans'));
  ordinary.callback.consumeAuthCallbackCredentials();
  assert.equal(ordinary.globals.window.location.href, 'https://app.example/shared?code=public-invite#plans');
});
for (const mode of ['code', 'near']) {
  test(`active native ${mode} login accepts old backend bearer GET fallback exactly once`, async () => {
    const local = storage(); local.setItem(keys.AGREED_TERMS, 'V2');
    const context = flow(local);
    const { authClient } = transport(local, () => assert.fail('Legacy callback must not exchange OAuth code'));
    const ui = renderAuth(context, authClient, { desktop: true });
    await ui.click(mode === 'code' ? 0 : 2);
    ui.deliver({ legacy: true, token: 'sess_wrong_state', sessionId: 'id', state: 'wrong' });
    assert.equal(context.globals.localStorage.getItem(keys.TOKEN), null);
    const payload = { legacy: true, token: 'sess_legacy', sessionId: 'legacy-id', state: null };
    ui.deliver(payload); ui.deliver(payload);
    await flush();
    assert.equal(context.globals.localStorage.getItem(keys.TOKEN), 'sess_legacy');
    assert.equal(ui.navigations.length, 1);
    assert.equal(ui.errors.length, 0);
    assert.throws(() => context.pkce.consumeOAuthCodeFlow('any-state'));
  });
}
test('unmounted native login cannot accept legacy bearer callback through its old listener', async () => {
  const local = storage(); local.setItem(keys.AGREED_TERMS, 'V2');
  const context = flow(local);
  const { authClient } = transport(local, () => assert.fail('Unexpected request'));
  const ui = renderAuth(context, authClient, { desktop: true });
  await ui.click(0);
  const oldHandler = ui.handler();
  ui.unmount();
  oldHandler({ legacy: true, token: 'sess_stale' });
  await flush();
  assert.equal(context.globals.localStorage.getItem(keys.TOKEN), null);
  assert.equal(ui.navigations.length, 0);
});

test('code callback with invalid state cannot downgrade to a legacy token in the same URL', async () => {
  const context = flow(storage(), browser('https://app.example/auth/callback?code=bad&state=wrong&token=sess_legacy&session_id=id'));
  await context.pkce.prepareOAuthCodeFlow();
  context.callback.consumeAuthCallbackCredentials();
  const ui = renderAuth(context, { exchangeOAuthCode() { assert.fail('Invalid state must reject before exchange'); } });
  await flush();
  assert.equal(context.globals.localStorage.getItem(keys.TOKEN), null);
  assert.equal(ui.errors.length, 1);
  assert.equal(ui.navigations.length, 0);
});
test('legacy channel callback delivers in memory without creating a browser session or replaying', async () => {
  const context = flow(storage(), browser('https://app.example/auth/callback?token=sess_legacy&session_id=id&oauth_channel=desktop-channel'));
  const messages = [];
  context.globals.BroadcastChannel = class {
    constructor(name) { assert.equal(name, 'desktop-channel'); }
    postMessage(payload) { messages.push(normalize(payload)); }
    close() {}
  };
  context.callback.consumeAuthCallbackCredentials();
  const ui = renderAuth(context, { exchangeOAuthCode() { assert.fail('No code exchange expected'); } });
  await flush();
  assert.deepEqual(messages, [{ token: 'sess_legacy', sessionId: 'id', isNewUser: false }]);
  assert.equal(context.globals.localStorage.getItem(keys.TOKEN), null);
  assert.equal(context.callback.getQueryCallbackCredentials().token, null);
  assert.equal(ui.errors.length, 0);
  assert.equal(ui.navigations.length, 0);
});

for (const variant of ['code', 'legacy']) {
  test(`${variant} callback is not replayed when publishing session remounts AuthPage during tracking`, async () => {
    const context = flow();
    const { state } = await context.pkce.prepareOAuthCodeFlow();
    context.globals.window.location = new URL(variant === 'code'
      ? `https://app.example/auth/callback?code=once&state=${state}`
      : 'https://app.example/auth/callback?token=sess_new&session_id=id');
    context.callback.consumeAuthCallbackCredentials();
    let resolveTracking, trackingCalls = 0;
    const authClient = { exchangeOAuthCode: async () => ({ token: 'sess_new', session_id: 'id', is_new_user: false }) };
    const options = { userFetch: () => {
      trackingCalls++;
      return new Promise((resolve) => { resolveTracking = resolve; });
    } };
    const firstMount = renderAuth(context, authClient, options);
    await flush();
    assert.equal(context.globals.localStorage.getItem(keys.TOKEN), 'sess_new');
    assert.deepEqual(normalize(context.callback.getQueryCallbackCredentials()), { token: null, sessionId: null, code: null });
    firstMount.unmount();
    const secondMount = renderAuth(context, authClient, options);
    await flush();
    assert.equal(trackingCalls, 1);
    assert.equal(secondMount.errors.length, 0);
    resolveTracking({ user: { id: 'user' } });
    await flush();
    assert.equal(firstMount.navigations.length, 1);
    assert.equal(secondMount.navigations.length, 0);
  });
}

for (const scenario of ['unmount', 'newer-session', 'strict-mode']) {
  test(`pending web OAuth completion respects ${scenario}`, async () => {
    const context = flow();
    const { state } = await context.pkce.prepareOAuthCodeFlow();
    context.globals.window.location = new URL(`https://app.example/auth/callback?code=pending&state=${state}`);
    context.callback.consumeAuthCallbackCredentials();
    let finish, exchanges = 0;
    const ui = renderAuth(context, { exchangeOAuthCode: () => { exchanges++; return new Promise(resolve => { finish = resolve; }); } });
    if (scenario === 'unmount') ui.unmount();
    if (scenario === 'newer-session') {
      const writer = load('src/lib/sessionCredentials.ts', { '@/lib/constants': constants, '@/stores/useUserStore': { useUserStore: context.useUserStore } }, context.globals);
      await writer.setSessionCredentials('sess_newer', 'newer-id');
    }
    if (scenario === 'strict-mode') ui.replayEffects();
    finish({ token: 'sess_delayed', session_id: 'delayed-id', is_new_user: false });
    await flush();
    assert.equal(exchanges, 1);
    assert.equal(context.globals.localStorage.getItem(keys.TOKEN), scenario === 'strict-mode' ? 'sess_delayed' : scenario === 'newer-session' ? 'sess_newer' : null);
    assert.equal(ui.navigations.length, scenario === 'strict-mode' ? 1 : 0);
    assert.equal(ui.errors.length, 0);
  });
}
for (const scenario of ['unmount', 'newer-session']) {
  test(`OAuth session write checks ${scenario} again when its storage lock is granted`, async () => {
    let grant;
    const navigator = { locks: { request: (_name, operation) => new Promise(resolve => { grant = () => resolve(operation()); }) } };
    const context = flow(storage(), browser('https://app.example/auth'), navigator);
    const { state } = await context.pkce.prepareOAuthCodeFlow();
    context.globals.window.location = new URL(`https://app.example/auth/callback?code=pending&state=${state}`);
    context.callback.consumeAuthCallbackCredentials();
    const ui = renderAuth(context, { exchangeOAuthCode: async () => ({ token: 'sess_delayed', session_id: 'id', is_new_user: false }) });
    await flush();
    assert.equal(typeof grant, 'function');
    if (scenario === 'unmount') ui.unmount();
    else {
      context.globals.localStorage.setItem(keys.TOKEN, 'sess_newer');
      context.globals.localStorage.setItem(keys.SESSION, 'newer-id');
    }
    grant(); await flush();
    assert.equal(context.globals.localStorage.getItem(keys.TOKEN), scenario === 'newer-session' ? 'sess_newer' : null);
    assert.equal(ui.navigations.length, 0);
    assert.equal(ui.errors.length, 0);
  });
}
