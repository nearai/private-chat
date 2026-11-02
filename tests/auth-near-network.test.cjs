const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function config(env) {
  const source = readFileSync('src/api/constants.ts', 'utf8').replaceAll('import.meta.env', 'testEnv');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    testEnv: env,
    require: (id) => {
      assert.equal(id, '@/lib/utm');
      return { withUtm: (url) => url };
    },
  });
  return exports;
}

for (const [name, env, network, rpc] of [
  ['defaults to testnet', {}, 'testnet', 'https://test.rpc.fastnear.com'],
  ['supports production mainnet', { VITE_NEAR_NETWORK_ID: 'mainnet' }, 'mainnet', 'https://free.rpc.fastnear.com'],
  ['trims network configuration', { VITE_NEAR_NETWORK_ID: ' mainnet ' }, 'mainnet', 'https://free.rpc.fastnear.com'],
  ['ignores blank overrides', { VITE_NEAR_NETWORK_ID: ' ', VITE_NEAR_RPC_URL: ' ' }, 'testnet', 'https://test.rpc.fastnear.com'],
  ['preserves a custom RPC', { VITE_NEAR_RPC_URL: ' https://rpc.example/ ' }, 'testnet', 'https://rpc.example/'],
]) {
  test(`NEAR configuration ${name}`, () => {
    const actual = config(env);
    assert.equal(actual.NEAR_AUTH_RECIPIENT, "private-chat-stg.near.ai");
    assert.equal(actual.NEAR_NETWORK_ID, network);
    assert.equal(actual.NEAR_RPC_URL, rpc);
  });
}
