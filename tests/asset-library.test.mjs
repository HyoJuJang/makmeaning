import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../app/asset-library/AssetLibrary.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
const summary = { totalProducts: 1, assetFiles: 1, assetStatuses: { ready: 1, needs_review: 0, pending_generation: 0 } };

function mount(fetch) {
  const states = [], effects = [];
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(compiled, { exports, AbortController, URLSearchParams, fetch,
    require(name) {
      if (name === 'react') return {
        useState(initial) { const index = states.length; states.push(initial); return [initial, value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
        useEffect(effect) { effects.push(effect); },
      };
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name.endsWith('.css')) return { default: {} };
      if (name.endsWith('/GameItemSprite')) return { GameItemSprite() {} };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  exports.AssetLibrary({ summary });
  return { states, start: () => effects[0]() };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('first visit fetches API-hydrated cards, never raw manifest images', async () => {
  const expected = { summary, products: [{ prd_id: '123', asset: { url: 'https://store.public.blob.vercel-storage.com/assets/game-items/v1/food/food/food.png' } }], page: 1, pages: 1, total: 1 };
  let calls = 0;
  const client = mount(async (url, options) => {
    calls++;
    assert.equal(new URL(url, 'https://app.example').pathname, '/api/demo/game-assets');
    assert.equal(options.signal.aborted, false);
    return Response.json(expected);
  });
  assert.equal(client.states[0], null);
  client.start(); await settle();
  assert.equal(calls, 1);
  assert.deepEqual(client.states[0], expected);
});

test('service failure stays unavailable rather than showing local ready cards', async () => {
  const client = mount(async () => new Response('unavailable', { status: 503 }));
  client.start(); await settle();
  assert.equal(client.states[0], null);
  assert(client.states.some(value => typeof value === 'string' && value.includes('에셋 서비스')));
});

test('aborted first request cannot publish stale cards', async () => {
  let complete;
  const client = mount(() => new Promise(resolve => { complete = resolve; }));
  const cleanup = client.start(); cleanup();
  complete(Response.json({ products: [{ prd_id: 'old' }] })); await settle();
  assert.equal(client.states[0], null);
});

test('server shell passes counts only, not unhydrated product cards', async () => {
  const page = await readFile(new URL('../app/asset-library/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /summary=\{listGameProducts\([^]*?\)\.summary\}/);
  assert.doesNotMatch(page, /initial=/);
});
