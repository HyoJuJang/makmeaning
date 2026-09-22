import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../app/api/demo/scenes/route.ts';
import personaSource from '../data/demo-persona-purchases.json' with { type: 'json' };
import { DEMO_PERSONA_COOKIE } from '../src/data/demo-personas.ts';
import { restoreSceneCollection } from '../src/lib/scene/collection-state.ts';

const request = category => new Request(`http://localhost/api/demo/scenes?category=${category}`);

for (const category of ['fashion', 'living']) {
  test(`${category} legacy scene never seeds fictional products or carts for any persona`, async () => {
    for (const persona of personaSource.personas) {
      const response = GET(new Request(request(category), { headers: { Cookie: `${DEMO_PERSONA_COOKIE}=${persona.id}` } }));
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /application\/json/);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await response.json(), { category, products: [], cartIds: [] });
    }
  });
}

test('missing and unsupported categories return a non-cacheable 400 response', async () => {
  for (const url of ['http://localhost/api/demo/scenes', ...['', 'food', 'beauty', 'FASHION', '__proto__'].map(category => request(category).url)]) {
    const response = GET(new Request(url));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { error: 'category must be fashion or living' });
  }
});

test('legacy stored sample carts and saves are discarded against the empty Scene catalog', async () => {
  for (const category of ['fashion', 'living']) {
    const scene = await GET(request(category)).json();
    const stored = JSON.stringify({ cartIds: ['fashion-loafers', 'living-rug'], savedIds: ['fashion-trousers', 'living-sofa'] });
    assert.deepEqual(restoreSceneCollection(scene, stored), { cartIds: [], savedIds: [] });
  }
});

test('client changes cannot seed products into another response or category', async () => {
  const first = await GET(request('fashion')).json();
  first.cartIds.push('fashion-loafers');
  first.products.push({ id: 'fashion-loafers' });
  for (const category of ['fashion', 'living']) {
    assert.deepEqual(await GET(request(category)).json(), { category, products: [], cartIds: [] });
  }
});
