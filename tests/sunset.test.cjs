const assert = require('node:assert/strict');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { load } = require('./helpers/auth.cjs');

const policy = load('src/lib/sunset.ts');
const jsx = require('react/jsx-runtime');

for (const [time, expected] of [
  ['2026-11-14T23:59:59.999Z', false],
  ['2026-11-15T00:00:00.000Z', true],
  ['2026-11-16T00:00:00.000Z', true],
]) {
  test(`shutdown boundary at ${time}`, () => {
    assert.equal(policy.isPrivateChatShutdown(Date.parse(time)), expected);
  });
}

function renderPage(now) {
  const commands = [], effects = [], timers = [], listeners = new Map(), stateUpdates = [];
  const window = {
    $crisp: commands,
    setTimeout: (callback, delay) => { timers.push({ callback, delay }); return timers.length; },
    clearTimeout: (id) => { timers[id - 1].cleared = true; },
    addEventListener: (event, callback) => listeners.set(event, callback),
    removeEventListener: (event) => listeners.delete(event),
  };
  class Clock extends Date { static now() { return now.value; } }
  const sunset = load('src/lib/sunset.ts', {}, { Date: Clock });
  const { openFeedback } = load('src/lib/crisp.ts', {}, { window });
  const { default: SunsetBanner } = load('src/components/common/SunsetBanner.tsx', {
    'react/jsx-runtime': jsx,
    '@/lib/sunset': sunset,
  });
  let feedback;
  const { default: SunsetPage } = load('src/pages/SunsetPage.tsx', {
    'react/jsx-runtime': jsx,
    react: {
      useState: (initial) => [initial(), (value) => stateUpdates.push(value)],
      useEffect: (effect) => effects.push(effect),
    },
    '@/assets/icons/near-ai.svg?react': { default: () => null },
    '@/assets/icons/feedback.svg?react': { default: () => null },
    '@/components/common/SunsetBanner': { default: SunsetBanner },
    '@/components/ui/button': { Button: ({ onClick, children }) => {
      feedback = onClick;
      return React.createElement('button', null, children);
    } },
    '@/lib/crisp': { openFeedback },
    '@/lib/sunset': sunset,
  }, { window, Date: Clock });
  // Any legacy App imports or startup hooks fail here: only the sunset page is allowed.
  const { default: App } = load('src/App.tsx', {
    'react/jsx-runtime': jsx,
    '@/pages/SunsetPage': { default: SunsetPage },
  });
  const html = renderToStaticMarkup(React.createElement(App));
  const cleanup = effects.map((effect) => effect()).filter(Boolean);
  return { html, commands, timers, listeners, stateUpdates, cleanup, clickFeedback: () => feedback() };
}

for (const [time, title] of [
  ['2026-11-09T00:00:00Z', 'Private Chat is sunsetting'],
  ['2026-11-15T00:00:00Z', 'Private Chat has shut down'],
]) {
  test(`notice and Feedback remain available at ${time}`, () => {
    const page = renderPage({ value: Date.parse(time) });
    assert.match(page.html, new RegExp(title));
    assert.match(page.html, /November 15, 2026 at 00:00 UTC/);
    assert.match(page.html, /encrypted archive/);
    assert.doesNotMatch(page.html, /permanently deleted|Sign in|Export Chats/);

    assert.deepEqual(page.commands, []);
    page.clickFeedback();
    assert.deepEqual(JSON.parse(JSON.stringify(page.commands)), [
      ['do', 'chat:show'], ['do', 'chat:open'],
    ]);
  });
}

test('an open tab updates at cutoff and cleans up its timer and focus listener', () => {
  const now = { value: policy.SHUTDOWN_AT - 1000 };
  const page = renderPage(now);
  assert.equal(page.timers[0].delay, 1000);

  now.value = policy.SHUTDOWN_AT;
  page.timers[0].callback();
  page.listeners.get('focus')();
  assert.deepEqual(page.stateUpdates, [true, true]);

  page.cleanup.forEach((cleanup) => cleanup());
  assert.equal(page.timers[0].cleared, true);
  assert.equal(page.listeners.size, 0);
});

test('after shutdown no cutoff timer is needed', () => {
  const page = renderPage({ value: policy.SHUTDOWN_AT });
  assert.equal(page.timers.length, 0);
});
