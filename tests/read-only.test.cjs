const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Load the real TypeScript client with a recording transport; no network or auth is needed.
function load(file, dependencies, globals = {}) {
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
    AbortController,
    ...globals,
  });
  return exports;
}
const policy = load('src/lib/read-only.ts', {});
function setup({ conversations = [], failedIds = [], listError } = {}) {
  const requests = [];
  class ApiClient {
    get(...args) {
      requests.push(['get', ...args]);
      if (args[0] === '/conversations') {
        return listError ? Promise.reject(listError) : Promise.resolve(conversations);
      }
      return Promise.resolve([]);
    }
    post(...args) { requests.push(['post', ...args]); return Promise.resolve([]); }
    patch(...args) { requests.push(['patch', ...args]); return Promise.resolve([]); }
    delete(...args) {
      requests.push(['delete', ...args]);
      return failedIds.some((id) => args[0] === `/conversations/${id}`)
        ? Promise.reject(new Error('Deletion failed')) : Promise.resolve([]);
    }
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
  'updateConversation', 'importChat', 'pinConversationById', 'unpinConversationById',
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


function loadReadOnlyComposer() {
  const dependencies = new Proxy({
    '@/lib/read-only': policy,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-i18next': { useTranslation: () => ({ t: (value) => value }) },
    '@/assets/icons/send-message.svg?react': { default: () => null },
    '../ui/button': { Button: (props) => require('react').createElement('button', props) },
  }, {
    has: () => true,
    get: (target, id) => target[id] ?? new Proxy({}, {
      get: () => () => { throw new Error('Writable composer must not mount'); },
    }),
  });
  const { default: MessageInput } = load('src/components/chat/MessageInput.tsx', dependencies);
  return MessageInput;
}

test('composer allows local typing but keeps sending and upload handlers unavailable', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const MessageInput = loadReadOnlyComposer();
  const html = renderToStaticMarkup(React.createElement(MessageInput, {
    prompt: 'Draft message',
    setPrompt: () => {},
    onSubmit: () => { throw new Error('Unexpected submission'); },
  }));
  assert.match(html, /<textarea[^>]*>Draft message<\/textarea>/);
  assert.doesNotMatch(html, /<textarea[^>]*disabled/);
  assert.match(html, /<button[^>]*id="send-message-button"[^>]*disabled=""/);
  assert.ok(!html.includes('<form'));
  assert.ok(!html.includes('type="file"'));
});

test('user settings remain readable and writable while conversations are read-only', async () => {
  const requests = [];
  class ApiClient {
    get(...args) { requests.push(['get', ...args]); return Promise.resolve({ settings: {} }); }
    post(...args) { requests.push(['post', ...args]); return Promise.resolve({}); }
  }
  const { usersClient } = load('src/api/users/client.ts', {
    '../base-client': { ApiClient },
  });
  const settings = {
    system_prompt: 'changed',
    appearance: 'Light',
    notification: true,
    web_search: false,
  };
  await usersClient.updateUserSettings(settings);
  await usersClient.getUserSettings();
  // Normalize objects created inside the TypeScript loader's VM context.
  assert.deepEqual(JSON.parse(JSON.stringify(requests)), [
    ['post', '/users/me/settings', settings, { apiVersion: 'v2' }],
    ['get', '/users/me/settings', { apiVersion: 'v2' }],
  ]);
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
      '@heroicons/react/24/solid': { ArrowDownTrayIcon: () => null, ArrowUpOnSquareIcon: () => null, TrashIcon: () => null },
      'dayjs': require('dayjs'),
      'sonner': { toast: {} },
      '@/api/chat/queries/useConversation': { useConversation: () => ({}) },
      '@/api/chat/queries/useGetConversations': { useGetConversations: () => ({}) },
      '@/api/chat/queries/useDeleteAllConversations': {
        useDeleteAllConversations: () => ({ isDeleting: false, progress: { completed: 0, total: 0 } }),
      },
      './DeleteAllChatsDialog': { default: () => null },
      '@/components/common/ExportProgress': { ExportProgress: () => React.createElement('span', null, 'Export progress') },
      '@/lib/read-only': policy,
      '@/lib/utils/transform-chat-history': {},
      '@/stores/useExportStore': {
        useExportStore: (selector) => selector({ progress: exporting ? {} : null, result: null, start: () => {} }),
      },
    });
    const html = renderToStaticMarkup(React.createElement(ChatsSettings, {}));
    assert.ok(html.includes('Chatting is disabled. You can still view, export, or delete your history.'));
    assert.ok(html.includes('Export Chats'));
    assert.ok(html.includes('Delete Chats'));
    assert.equal(html.includes('disabled=""'), exporting);
    assert.equal(html.includes('Export progress'), exporting);
    assert.ok(!html.includes('Import Chats'));
    assert.ok(!html.includes('type="file"'));
  });
}

test('welcome page keeps the shutdown notice and a composer with sending disabled', () => {
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
    '@/components/chat/MessageInput': { default: loadReadOnlyComposer() },
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
  assert.ok(html.includes('<textarea'));
  assert.match(html, /<button[^>]*id="send-message-button"[^>]*disabled=""/);
});

const normalize = (value) => JSON.parse(JSON.stringify(value));

test('individual conversation deletion remains available', async () => {
  const { chatClient, requests } = setup();
  await chatClient.deleteConversation('owned-id');
  assert.deepEqual(normalize(requests), [['delete', '/conversations/owned-id', { apiVersion: 'v2' }]]);
});

test('delete all uses the server list, includes archived chats, and reports progress', async () => {
  const { chatClient, requests } = setup({ conversations: [
    { id: 'normal' }, { id: 'archived', metadata: { archived_at: '123' } }, { id: 'normal' },
  ] });
  const progress = [];
  const result = await chatClient.deleteAllConversations((completed, total) => progress.push([completed, total]));
  assert.deepEqual(normalize(result), { deletedIds: ['normal', 'archived'], failedIds: [], stopped: false });
  assert.deepEqual(progress, [[0, 2], [1, 2], [2, 2]]);
  assert.deepEqual(normalize(requests).map(([method, path]) => [method, path]), [
    ['get', '/conversations'], ['delete', '/conversations/normal'], ['delete', '/conversations/archived'],
  ]);
  assert.ok(requests.every((request) => request[2].apiVersion === 'v2'));
});

test('delete all reports partial failure and continues with the remaining chats', async () => {
  const { chatClient } = setup({ conversations: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], failedIds: ['b'] });
  assert.deepEqual(normalize(await chatClient.deleteAllConversations()), {
    deletedIds: ['a', 'c'], failedIds: ['b'], stopped: false,
  });
});

test('delete all never deletes from a stale local list when the server list fails', async () => {
  const { chatClient, requests } = setup({ listError: new Error('Offline') });
  await assert.rejects(chatClient.deleteAllConversations(), /Offline/);
  assert.deepEqual(requests.map((request) => request[0]), ['get']);
});

test('delete all handles an empty account without delete requests', async () => {
  const { chatClient, requests } = setup();
  assert.deepEqual(normalize(await chatClient.deleteAllConversations()), { deletedIds: [], failedIds: [], stopped: false });
  assert.equal(requests.length, 1);
});

function descendants(node) {
  const React = require('react');
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray(node.props.children).flatMap(descendants)];
}

test('bulk deletion requires backup acknowledgement and provides export and cancel actions', () => {
  const React = require('react');
  let backedUp = false;
  let confirmations = 0;
  let exports = 0;
  let cancellations = 0;
  let stops = 0;
  const components = Object.fromEntries([
    'AlertDialog', 'AlertDialogContent', 'AlertDialogDescription', 'AlertDialogFooter',
    'AlertDialogHeader', 'AlertDialogTitle',
  ].map((name) => [name, name]));
  const { default: Dialog } = load('src/components/common/dialogs/settings/DeleteAllChatsDialog.tsx', {
    'react': { useState: () => [backedUp, (value) => { backedUp = value; }] },
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@/components/ui/alert-dialog': components,
    '@/components/ui/button': { Button: 'button' },
  });
  const render = (isDeleting = false, isStopping = false) => descendants(Dialog({
    isDeleting, isStopping, progress: { completed: 1, total: 3 },
    onCancel: () => { cancellations++; }, onExport: () => { exports++; },
    onConfirm: () => { confirmations++; },
    onStop: () => { stops++; },
  }));
  const button = (nodes, label) => nodes.find((node) => node.type === 'button' && node.props.children === label);
  const before = render();
  const warning = before.find((node) => node.type === 'AlertDialogDescription').props.children;
  assert.match(warning, /Export and save a copy/);
  assert.match(warning, /including archived chats/);
  assert.match(warning, /cannot be undone/);
  assert.equal(button(before, 'Delete all chats').props.disabled, true);
  button(before, 'Delete all chats').props.onClick();
  assert.equal(confirmations, 0);
  button(before, 'Export Chats first').props.onClick();
  button(before, 'Cancel').props.onClick();
  assert.equal(exports, 1);
  assert.equal(cancellations, 1);
  before.find((node) => node.type === 'input').props.onChange({ target: { checked: true } });
  const acknowledged = render();
  assert.equal(button(acknowledged, 'Delete all chats').props.disabled, false);
  button(acknowledged, 'Delete all chats').props.onClick();
  assert.equal(confirmations, 1);
  const pending = render(true);
  assert.ok(pending.filter((node) => (node.type === 'button' || node.type === 'input') && node.props.children !== 'Stop deleting').every((node) => node.props.disabled));
  assert.equal(button(pending, 'Stop deleting').props.disabled, false);
  button(pending, 'Stop deleting').props.onClick();
  assert.equal(stops, 1);
  assert.equal(button(render(true, true), 'Stopping…').props.disabled, true);
  button(pending, 'Deleting…').props.onClick();
  assert.equal(confirmations, 1);
});

for (const outcome of ['complete', 'partial', 'stopped', 'stopped-with-failures']) {
  const incomplete = outcome !== 'complete';
  const stopped = outcome.startsWith('stopped');
  const failed = outcome === 'partial' || outcome === 'stopped-with-failures';
  test(`bulk deletion cleans only successfully deleted conversations (${outcome})`, async () => {
    const { QueryClient } = require('@tanstack/react-query');
    const { queryKeys } = load('src/api/query-keys.ts', {});
    const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    const conversations = [{ id: 'a' }, { id: 'b' }];
    queryClient.setQueryData(queryKeys.conversation.all, conversations);
    queryClient.setQueryData(queryKeys.conversation.byId('a'), { id: 'a' });
    queryClient.setQueryData(queryKeys.conversation.byId('b'), { id: 'b' });
    queryClient.setQueryData(queryKeys.users.meSettings, { appearance: 'dark' });
    let options;
    let savedList;
    let reset = false;
    const cleared = [];
    const navigations = [];
    const notices = [];
    const { useDeleteAllConversations } = load('src/api/chat/queries/useDeleteAllConversations.ts', {
      '@tanstack/react-query': {
        useQueryClient: () => queryClient, useIsMutating: () => 0,
        useMutation: (value) => { options = value; return {}; },
      },
      '@/stores/useDeleteChatsStore': { useDeleteChatsStore: () => ({ progress: { completed: 0, total: 0 }, isStopping: false, stop: () => {} }) },
      'react-router': { useNavigate: () => (...args) => navigations.push(args) },
      'sonner': { toast: { success: (msg) => notices.push(['success', msg]), error: (msg) => notices.push(['error', msg]), info: (msg) => notices.push(['info', msg]) } },
      '@/api/query-keys': { queryKeys },
      '@/lib/offlineCache': { offlineCache: {
        clearConversationDetail: (id) => cleared.push(id),
        clearConversationDetails: () => cleared.push('all'),
        getConversationList: () => conversations,
        saveConversationList: (list) => { savedList = list; },
      } },
      '@/pages/routes': { APP_ROUTES: { HOME: '/' } },
      '@/stores/useConversationStore': { useConversationStore: { getState: () => ({
        conversation: { conversationId: incomplete ? 'b' : 'a' },
        resetConversation: () => { reset = true; },
      }) } },
      '@/stores/useExportStore': { useExportStore: { getState: () => ({ progress: null, dismissResult: () => {} }) } },
      '@/stores/useMessagesSignaturesStore': { useMessagesSignaturesStore: { getState: () => ({ clearAllSignatures: () => {} }) } },
      '../client': { chatClient: {} },
    });
    useDeleteAllConversations();
    assert.equal(options.retry, false);
    assert.equal(options.networkMode, 'always');
    await options.onSuccess({ deletedIds: incomplete ? ['a'] : ['a', 'b'], failedIds: failed ? ['b'] : [], stopped });
    assert.equal(queryClient.getQueryData(queryKeys.conversation.byId('a')), undefined);
    assert.deepEqual(queryClient.getQueryData(queryKeys.conversation.byId('b')), incomplete ? { id: 'b' } : undefined);
    assert.deepEqual(normalize(savedList), incomplete ? [{ id: 'b' }] : []);
    assert.deepEqual(normalize(queryClient.getQueryData(queryKeys.conversation.all)), normalize(savedList));
    assert.deepEqual(queryClient.getQueryData(queryKeys.users.meSettings), { appearance: 'dark' });
    assert.deepEqual(cleared, incomplete ? ['a'] : ['a', 'b', 'all']);
    assert.equal(reset, !incomplete);
    assert.equal(navigations.length, incomplete ? 0 : 1);
    assert.equal(notices[0][0], stopped ? 'info' : failed ? 'error' : 'success');
    queryClient.clear();
  });
}

test('stopping before deletion starts sends no requests', async () => {
  const { chatClient, requests } = setup();
  const controller = new AbortController();
  controller.abort();
  const result = await chatClient.deleteAllConversations(undefined, controller.signal);
  assert.deepEqual(normalize(result), { deletedIds: [], failedIds: [], stopped: true });
  assert.deepEqual(requests, []);
});

test('stopping during list loading never starts a deletion', async () => {
  const { chatClient, requests } = setup();
  const controller = new AbortController();
  chatClient.getConversations = (signal) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
  const deletion = chatClient.deleteAllConversations(undefined, controller.signal);
  controller.abort();
  assert.deepEqual(normalize(await deletion), { deletedIds: [], failedIds: [], stopped: true });
  assert.deepEqual(requests, []);
});

for (const fails of [false, true]) {
  test(`stop waits for the in-flight deletion and preserves its result (fails: ${fails})`, async () => {
    const { chatClient } = setup({ conversations: [{ id: 'a' }, { id: 'b' }] });
    const controller = new AbortController();
    const called = [];
    let finishRequest;
    let started;
    const requestStarted = new Promise((resolve) => { started = resolve; });
    chatClient.deleteConversation = (id) => {
      called.push(id);
      started();
      return new Promise((resolve, reject) => {
        finishRequest = () => fails ? reject(new Error('Failed')) : resolve();
      });
    };
    let settled = false;
    const deletion = chatClient.deleteAllConversations(undefined, controller.signal)
      .then((result) => { settled = true; return result; });
    await requestStarted;
    controller.abort();
    await Promise.resolve();
    assert.equal(settled, false);
    finishRequest();
    assert.deepEqual(normalize(await deletion), {
      deletedIds: fails ? [] : ['a'], failedIds: fails ? ['a'] : [], stopped: true,
    });
    assert.deepEqual(called, ['a']);
  });
}

test('stop after the last chat finishes still reports complete deletion', async () => {
  const { chatClient } = setup({ conversations: [{ id: 'a' }] });
  const controller = new AbortController();
  const result = await chatClient.deleteAllConversations((completed) => {
    if (completed === 1) controller.abort();
  }, controller.signal);
  assert.deepEqual(normalize(result), { deletedIds: ['a'], failedIds: [], stopped: false });
});

test('shared deletion controls retain progress, stop once, and allow a fresh run', () => {
  const { useDeleteChatsStore: store } = load('src/stores/useDeleteChatsStore.ts', {
    zustand: require('zustand'),
  });
  const controller = store.getState().begin();
  store.getState().setProgress(2, 5);
  assert.deepEqual(normalize(store.getState().progress), { completed: 2, total: 5 });
  assert.throws(() => store.getState().begin(), /already running/);
  store.getState().stop();
  store.getState().stop();
  assert.equal(controller.signal.aborted, true);
  assert.equal(store.getState().isStopping, true);
  store.getState().finish(controller);
  assert.equal(store.getState().controller, null);
  assert.equal(store.getState().isStopping, false);
  const next = store.getState().begin();
  assert.equal(next.signal.aborted, false);
  assert.deepEqual(normalize(store.getState().progress), { completed: 0, total: 0 });
  store.getState().finish(controller);
  assert.equal(store.getState().controller, next);
  store.getState().finish(next);
});

function conversationQuery(cached, fetcher) {
  let options;
  const persisted = [];
  const { useGetConversations } = load('src/api/chat/queries/useGetConversations.ts', {
    '@tanstack/react-query': { useQuery: (value) => { options = value; return {}; } },
    '@/api/query-keys': { queryKeys: { conversation: { all: ['conversations'] } } },
    '@/lib/constants': { LOCAL_STORAGE_KEYS: { TOKEN: 'sessionToken' } },
    '@/lib/offlineCache': { offlineCache: {
      getConversationList: () => cached,
      saveConversationList: (value) => persisted.push(value),
    } },
    '../client': { chatClient: { getConversations: fetcher } },
  }, { window: {}, localStorage: { getItem: () => 'test-token' } });
  useGetConversations();
  return { options: { ...options, retry: false }, persisted };
}

for (const cached of [[], [{ id: 'existing', metadata: {} }]]) {
  test(`persisted conversation list is refreshed immediately on mount (${cached.length} cached)`, async () => {
    const { QueryClient, QueryObserver } = require('@tanstack/react-query');
    let requests = 0;
    const fresh = [{ id: 'archived', metadata: { title: 'Archived conversation', archived_at: '123' } }];
    const { options, persisted } = conversationQuery(cached, async () => { requests++; return fresh; });
    const client = new QueryClient();
    const observer = new QueryObserver(client, options);
    assert.equal(observer.getCurrentResult().isStale, true);
    const unsubscribe = observer.subscribe(() => {});
    const result = await observer.refetch({ cancelRefetch: false });
    assert.equal(requests, 1);
    assert.deepEqual(result.data, fresh);
    assert.deepEqual(persisted, [fresh]);
    unsubscribe();
    client.clear();
  });
}

for (const cached of [[], [{ id: 'archived', metadata: { archived_at: '123' } }]]) {
  test(`failed refresh remains an error while retaining cached history (${cached.length} cached)`, async () => {
    const { QueryClient, QueryObserver } = require('@tanstack/react-query');
    const { options, persisted } = conversationQuery(cached, async () => { throw new Error('Request failed'); });
    const client = new QueryClient();
    const observer = new QueryObserver(client, options);
    const result = await observer.refetch();
    assert.equal(result.isError, true);
    assert.deepEqual(result.data, cached);
    assert.deepEqual(persisted, []);
    observer.destroy();
    client.clear();
  });
}

test('cancelled conversation reads do not overwrite the persisted list', async () => {
  const controller = new AbortController();
  const { options, persisted } = conversationQuery([], async () => {
    controller.abort();
    return [{ id: 'deleted-chat' }];
  });
  await assert.rejects(options.queryFn({ signal: controller.signal }), { name: 'AbortError' });
  assert.deepEqual(persisted, []);
});

function archivedModal(query) {
  const React = require('react');
  const effects = [];
  const { default: Modal } = load('src/components/common/dialogs/archived-chats/ArchivedChatsModal.tsx', {
    'react': { ...React, useEffect: (effect) => effects.push(effect) },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-i18next': { useTranslation: () => ({ t: (value) => value }) },
    '@/lib/read-only': policy,
    '@heroicons/react/24/outline': { ArrowUpOnSquareIcon: () => null, MagnifyingGlassIcon: () => null, TrashIcon: () => null },
    'dayjs': { default: require('dayjs') },
    'dayjs/plugin/localizedFormat': { default: require('dayjs/plugin/localizedFormat') },
    'file-saver': { default: { saveAs() {} } },
    'sonner': { toast: {} },
    '@/components/ui/button': { Button: ({ children, onClick }) => React.createElement('button', { onClick }, children) },
    '@/components/ui/dialog': Object.fromEntries(['Dialog', 'DialogContent', 'DialogDescription', 'DialogHeader', 'DialogTitle'].map((key) => [key, ({ children }) => React.createElement('div', null, children)])),
    '@/components/ui/table': { Table: 'table', TableBody: 'tbody', TableCell: 'td', TableHead: 'th', TableHeader: 'thead', TableRow: 'tr' },
    '@/components/ui/tooltip': { CompactTooltip: ({ children }) => children },
    '../ConfirmDialog': { default: () => null },
    '@tanstack/react-query': { useQueryClient: () => ({}) },
    '@/api/chat/queries/useGetConversations': { useGetConversations: () => query },
    '@/api/chat/queries': { useDeleteChat: () => ({}), useUnarchiveChat: () => ({}) },
    '@/api/query-keys': { queryKeys: {} },
  });
  return {
    render: (open = true) => require('react-dom/server').renderToStaticMarkup(React.createElement(Modal, { open, onOpenChange() {} })),
    runEffects: () => effects.splice(0).forEach((effect) => effect()),
  };
}

test('archived chats refresh on opening and reopening the modal', () => {
  const calls = [];
  const modal = archivedModal({ data: [], refetch: (options) => { calls.push(normalize(options)); } });
  modal.render(false);
  modal.runEffects();
  assert.equal(calls.length, 0);
  modal.render(true);
  modal.runEffects();
  modal.render(false);
  modal.runEffects();
  modal.render(true);
  modal.runEffects();
  assert.deepEqual(calls, [{ cancelRefetch: false }, { cancelRefetch: false }]);
});

for (const status of ['loading', 'error', 'offline', 'empty', 'cached-error']) {
  test(`archived chats distinguish ${status} from an empty server result`, () => {
    const modal = archivedModal({
      data: status === 'cached-error' ? [{ id: 'archived', metadata: { title: 'Saved history', archived_at: '123' } }] : [],
      isPending: false,
      isFetching: status === 'loading',
      isError: status === 'error' || status === 'cached-error',
      isPaused: status === 'offline',
      refetch() {},
    });
    const html = modal.render();
    assert.equal(html.includes('You have no archived conversations.'), status === 'empty');
    assert.equal(html.includes('role="alert"'), ['error', 'offline', 'cached-error'].includes(status));
    assert.equal(html.includes('Saved history'), status === 'cached-error');
    assert.equal(html.includes('Retry'), ['error', 'offline', 'cached-error'].includes(status));
  });
}
