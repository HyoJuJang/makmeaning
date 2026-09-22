import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

async function load(path, imports, env = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, process: { env }, Response, URL,
    require(name) {
      if (name === 'server-only') return {};
      for (const [suffix, value] of Object.entries(imports)) if (name.endsWith(suffix)) return value;
      throw Error(`Unexpected import ${name}`);
    },
  });
  return exports;
}
async function runtime(env, findMany = async () => ['database'], remote = async () => ['remote']) {
  return load('../src/lib/runtime-game-assets.ts', {
    '/database.ts': { getAssetRepository: () => ({ findMany }) },
    '/remote-game-assets.ts': { remoteAssetLookup: () => remote },
  }, env);
}
test('unconfigured runtime never promotes local manifest images to ready', async () => {
  const api = await runtime({});
  assert.equal((await api.lookupRoomGameAssets(['123'])).length, 0);
});
test('runtime supports DB-only configuration and gives API configuration precedence', async () => {
  assert.deepEqual(await (await runtime({ ASSET_DATABASE_URL: 'configured' })).lookupRoomGameAssets(['123']), ['database']);
  assert.deepEqual(await (await runtime({ ASSET_DATABASE_URL: 'configured', ASSET_API_URL: 'configured' })).lookupRoomGameAssets(['123']), ['remote']);
});
test('configured service failures are not replaced by local success', async () => {
  const api = await runtime({ ASSET_API_URL: 'configured' }, undefined, async () => { throw Error('service unavailable'); });
  await assert.rejects(api.lookupRoomGameAssets(['123']), /unavailable/);
});
const product = { prd_id: '123', domain: 'food', assetStatus: 'ready', assetId: 'local', assetUrl: '/missing.png', asset: { url: '/missing.png', sourcePath: 'local-only' } };
async function route(lookupRoomGameAssets) {
  return load('../app/api/demo/game-assets/route.ts', {
    '/game-assets.ts': { getGameProduct: () => product, listGameProducts: () => ({ products: [product] }) },
    '/runtime-game-assets.ts': { lookupRoomGameAssets },
  });
}
test('library shares runtime mappings and removes unconfigured local ready cards', async () => {
  const api = await route(async () => []);
  const data = await (await api.GET(new Request('https://app.example/api/demo/game-assets'))).json();
  assert.equal(data.products[0].asset, null);
  assert.equal(data.products[0].assetUrl, null);
  assert.equal(data.products[0].assetStatus, 'needs_review');
});
test('library uses runtime asset without reintroducing local metadata', async () => {
  const asset = { id: 'remote', url: 'https://store.public.blob.vercel-storage.com/ready.png' };
  const api = await route(async () => [{ prd_id: '123', domain: 'food', status: 'ready', asset }]);
  const data = await (await api.GET(new Request('https://app.example/api/demo/game-assets?id=123'))).json();
  assert.deepEqual(data.asset, asset);
});
test('library turns runtime errors into safe unavailable responses', async () => {
  const api = await route(async () => { throw Error('private connection details'); });
  const response = await api.GET(new Request('https://app.example/api/demo/game-assets'));
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /private/);
});
