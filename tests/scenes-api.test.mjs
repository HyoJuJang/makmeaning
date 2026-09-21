import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../app/api/demo/scenes/route.ts';

const request = category => new Request(`http://localhost/api/demo/scenes?category=${category}`);
const options = {
  fashion: {
    anchors: ['knit', 'shirt'], kinds: ['하의', '아우터', '신발', '상의'],
    situations: ['출근', '주말', '여행', '약속'], tastes: ['미니멀', '캐주얼', '포근한', '단정한'],
  },
  living: {
    anchors: ['cushion', 'lamp'], kinds: ['패브릭', '가구', '조명'],
    situations: ['퇴근 후 휴식', '집들이', '주말 홈카페', '집중하는 시간'], tastes: ['내추럴', '미니멀', '포근한', '모던'],
  },
};

for (const category of ['fashion', 'living']) {
  test(`${category} scene exposes usable sample products, anchor reasons and cart references`, async () => {
    const response = GET(request(category));
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const scene = await response.json();
    assert.equal(scene.category, category);
    assert.ok(scene.products.length >= 6);
    const ids = scene.products.map(product => product.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(scene.cartIds.length > 0);
    assert.equal(new Set(scene.cartIds).size, scene.cartIds.length);
    for (const cartId of scene.cartIds) assert.ok(ids.includes(cartId));
    for (const product of scene.products) {
      assert.ok(product.id.startsWith(`${category}-`));
      assert.equal(product.category, category);
      assert.equal(product.brand, 'G:Scene sample');
      assert.ok(product.name.length > 0 && product.description.length > 0);
      assert.ok(Number.isSafeInteger(product.price) && product.price > 0);
      assert.match(product.imageUrl, /^\/scene-art\/products\.png#[a-z-]+$/);
      assert.equal(new URL(product.imageUrl, 'http://localhost').pathname, '/scene-art/products.png');
      assert.ok(options[category].kinds.includes(product.kind));
      for (const field of ['situations', 'tastes']) {
        assert.ok(product[field].length > 0);
        for (const value of product[field]) assert.ok(options[category][field].includes(value));
      }
      assert.ok(product.pairsWith.length > 0);
      assert.deepEqual(Object.keys(product.reasons).sort(), [...product.pairsWith].sort());
      for (const anchor of product.pairsWith) {
        assert.ok(options[category].anchors.includes(anchor));
        assert.ok(product.reasons[anchor].length > 0);
      }
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

test('client changes cannot alter another response or the other category', async () => {
  const first = await GET(request('fashion')).json();
  first.cartIds.length = 0;
  first.products[0].reasons.knit = 'changed';
  first.products[0].situations.push('changed');
  first.products[0].price = 0;
  const second = await GET(request('fashion')).json();
  assert.deepEqual(second.cartIds, ['fashion-loafers']);
  assert.notEqual(second.products[0].reasons.knit, 'changed');
  assert.ok(!second.products[0].situations.includes('changed'));
  assert.ok(second.products[0].price > 0);
  const living = await GET(request('living')).json();
  assert.deepEqual(living.cartIds, ['living-rug']);
  assert.ok(living.products.every(product => product.category === 'living'));
});
