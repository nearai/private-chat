const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Load the real TypeScript client with a recording transport; no network or auth is needed.
function load(file, dependencies) {
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
    URLSearchParams,
  });
  return exports;
}
const policy = load('src/lib/read-only.ts', {});
function setup() {
  const requests = [];
  class ApiClient {
    get(...args) { requests.push(['get', ...args]); return Promise.resolve([]); }
    post(...args) { requests.push(['post', ...args]); return Promise.resolve([]); }
    patch(...args) { requests.push(['patch', ...args]); return Promise.resolve([]); }
    delete(...args) { requests.push(['delete', ...args]); return Promise.resolve([]); }
    stream(...args) { requests.push(['stream', ...args]); return Promise.resolve([]); }
    requestWithoutJson(...args) {
      requests.push(['download', ...args]);
      return Promise.resolve({ blob: async () => 'file contents' });
    }
  }
  const { chatClient } = load('src/api/chat/client.ts', {
    '@/api/base-client': { ApiClient },
    '@/lib/read-only': policy,
    '@/lib/export-retry': load('src/lib/export-retry.ts', {}),
    '@/lib/constants': { LOCAL_STORAGE_KEYS: {}, DEFAULT_SIGNING_ALGO: 'ecdsa' },
    '@/lib/time': { getTimeRange: () => 'Today' },
  });
  return { chatClient, requests };
}

const writes = [
  'createChat', 'sentPrompt', 'generateChatTitle', 'createConversation', 'addItemsToConversation',
  'updateConversation', 'importChat', 'deleteConversation', 'pinConversationById', 'unpinConversationById',
  'cloneChatById', 'cloneSharedChatById', 'shareChatById', 'updateChatFolderIdById', 'archiveChatById',
  'unarchiveChatById', 'deleteSharedChatById', 'updateChatById', 'deleteChatById', 'addTagById',
  'deleteTagById', 'deleteTagsById', 'deleteAllChats', 'archiveAllChats', 'startStream', 'uploadFile',
  'deleteFile', 'createConversationShare', 'deleteConversationShare', 'createShareGroup',
  'updateShareGroup', 'deleteShareGroup',
];
for (const method of writes) {
  test(`${method} rejects before transport or file processing`, async () => {
    const { chatClient, requests } = setup();
    await assert.rejects(async () => chatClient[method]({}, {}), { message: policy.READ_ONLY_MESSAGE });
    assert.deepEqual(requests, []);
  });
}
for (const method of [
  'getConversation', 'getConversationItems', 'getConversations', 'getChatList', 'getArchivedChatList',
  'getAllChats', 'getAllArchivedChats', 'getAllUserChats', 'getChatByShareId',
  'getFiles', 'getFile', 'listConversationShares', 'listShareGroups', 'listSharedWithMe',
]) {
  test(`${method} remains available for reading/export`, async () => {
    const { chatClient, requests } = setup();
    await chatClient[method]('existing-id');
    assert.equal(requests.length, 1);
    assert.equal(requests[0][0], 'get');
  });
}
test('public reads retain unauthenticated access', async () => {
  const { chatClient, requests } = setup();
  await chatClient.getConversation('public-id', { requiresAuth: false });
  await chatClient.getConversationItems('public-id', { requiresAuth: false });
  assert.ok(requests.every((request) => request[2].requiresAuth === false));
});
test('file content download remains available', async () => {
  const { chatClient, requests } = setup();
  assert.equal(await chatClient.getFileContent('file-id'), 'file contents');
  assert.equal(requests[0][0], 'download');
});
test('read-only tag search still supports its POST transport', async () => {
  const { chatClient, requests } = setup();
  await chatClient.getChatListByTagName('tag');
  assert.equal(requests[0][0], 'post');
});


test('composer does not mount hooks, upload handlers, or prompt controls', () => {
  const dependencies = new Proxy({
    '@/lib/read-only': policy,
    'react/jsx-runtime': require('react/jsx-runtime'),
  }, {
    has: () => true,
    get: (target, id) => target[id] ?? new Proxy({}, {
      get: () => () => { throw new Error('Writable composer must not mount'); },
    }),
  });
  const { default: MessageInput } = load('src/components/chat/MessageInput.tsx', dependencies);
  assert.equal(MessageInput({}), null);
});

test('settings updates are blocked while existing settings remain readable', async () => {
  const requests = [];
  class ApiClient {
    get(path) { requests.push(['get', path]); return Promise.resolve({ settings: {} }); }
    post(path) { requests.push(['post', path]); return Promise.resolve({}); }
  }
  const { usersClient } = load('src/api/users/client.ts', {
    '../base-client': { ApiClient },
    '@/lib/read-only': policy,
  });
  await assert.rejects(() => usersClient.updateUserSettings({ system_prompt: 'changed' }), {
    message: policy.READ_ONLY_MESSAGE,
  });
  assert.deepEqual(requests, []);
  await usersClient.getUserSettings();
  assert.deepEqual(requests, [['get', '/users/me/settings']]);
});

for (const publicShare of [undefined, { id: 'public-share' }]) {
  test(`public access status remains visible without write controls (${!!publicShare})`, () => {
    const { renderToStaticMarkup } = require('react-dom/server');
    const { createElement } = require('react');
    const { PublicAccessSection } = load('src/components/chat/share/PublicAccessSection.tsx', {
      '@/lib/read-only': policy,
      'react/jsx-runtime': require('react/jsx-runtime'),
      'react-i18next': { useTranslation: () => ({ t: (value) => value }) },
      '@heroicons/react/24/outline': { GlobeAltIcon: () => null },
      '@/components/ui/button': { Button: () => { throw new Error('Write control rendered'); } },
    });
    const html = renderToStaticMarkup(createElement(PublicAccessSection, {
      publicShare,
      isPending: false,
      onCreatePublicLink: () => { throw new Error('Unexpected write'); },
      onRemovePublicLink: () => { throw new Error('Unexpected write'); },
    }));
    assert.ok(html.includes(publicShare ? 'Public access enabled' : 'Public access disabled'));
  });
}

for (const exporting of [false, true]) {
  test(`chat settings keep export available and import hidden (exporting: ${exporting})`, () => {
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { default: ChatsSettings } = load('src/components/common/dialogs/settings/ChatsSettings.tsx', {
      'react': React,
      'react/jsx-runtime': require('react/jsx-runtime'),
      '@heroicons/react/24/solid': { ArrowDownTrayIcon: () => null, ArrowUpOnSquareIcon: () => null },
      'dayjs': require('dayjs'),
      'sonner': { toast: {} },
      '@/api/chat/queries/useConversation': { useConversation: () => ({}) },
      '@/api/chat/queries/useGetConversations': { useGetConversations: () => ({}) },
      '@/components/common/ExportProgress': { ExportProgress: () => React.createElement('span', null, 'Export progress') },
      '@/lib/read-only': policy,
      '@/lib/utils/transform-chat-history': {},
      '@/stores/useExportStore': {
        useExportStore: (selector) => selector({ progress: exporting ? {} : null, result: null, start: () => {} }),
      },
    });
    const html = renderToStaticMarkup(React.createElement(ChatsSettings, {}));
    assert.ok(html.includes(policy.READ_ONLY_MESSAGE));
    assert.ok(html.includes('Export Chats'));
    assert.equal(html.includes('disabled=""'), exporting);
    assert.equal(html.includes('Export progress'), exporting);
    assert.ok(!html.includes('Import Chats'));
    assert.ok(!html.includes('type="file"'));
  });
}

test('welcome page keeps the shutdown notice and read-only message without mounting a composer', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const Container = ({ children }) => React.createElement('div', null, children);
  const { default: WelcomePage } = load('src/pages/WelcomePage.tsx', {
    'react': React,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-router': { useNavigate: () => () => {} },
    '@/assets/icons/chevron-welcome.svg?react': { default: () => null },
    '@/assets/icons/near-ai.svg?react': { default: () => null },
    '@/components/chat/ChatPlaceholder': { default: () => { throw new Error('Prompt suggestions rendered'); } },
    '@/components/chat/MessageInput': { default: () => { throw new Error('Composer rendered'); } },
    '@/components/common/SunsetBanner': { default: () => React.createElement('aside', null, 'Shutdown notice') },
    '@/lib/read-only': policy,
    '@/lib/constants': { LOCAL_STORAGE_KEYS: {} },
    '@/lib/posthog': {},
    '../components/ui/dropdown-menu': {
      DropdownMenu: Container, DropdownMenuContent: Container, DropdownMenuTrigger: Container,
    },
    './routes': { APP_ROUTES: {} },
  });
  const html = renderToStaticMarkup(React.createElement(WelcomePage));
  assert.ok(html.includes('Shutdown notice'));
  assert.ok(html.includes('Private Chat is read-only. Sign in to view and export your conversations.'));
});
