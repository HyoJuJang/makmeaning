import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendForUser } from '../src/lib/recommendation/engine.ts';
import { recommendationsResponse, recommendationStatusResponse } from '../src/lib/recommendation/handlers.ts';

const product = (id, category = '크림', domain = 'beauty') => ({
  prd_id: id, view_name: `상품 ${id}`, cate1_nm: domain === 'beauty' ? '스킨케어' : '티셔츠',
  cate2_nm: category, cate3_nm: '', cate4_nm: '', brand_name: '테스트브랜드', discprice: 10000, domain,
});
const item = (id, order = 0, cart = 0, view = 0) => ({ productId: id, orderCount: order, cartCount: cart, viewCount: view, lastAt: '2026092012' });
function fixture() {
  return {
    version: 1, builtAt: '2026-09-21T00:00:00Z', window: { from: '20260918', to: '20260920' },
    products: [product('anchor', '에센스/세럼/앰플'), product('cart'), product('peer'), product('meta'), product('popular'), product('fashion', '긴팔티셔츠', 'fashion')],
    popularity: { peer: 1, meta: 5, popular: 100, fashion: 10000 },
    neighbors: { anchor: [{ productId: 'peer', score: 0.7, support: 3 }, { productId: 'fashion', score: 1, support: 10 }, { productId: 'cart', score: 1, support: 5 }] },
    summary: { products: 6, users: 1, domains: { beauty: 5, fashion: 1 }, files: {} },
  };
}
const request = { domain: 'beauty', mode: 'behavior', limit: 3 };

test('behavior uses personal anchors, separates domains, excludes every order/cart, and explains fallback', () => {
  const result = recommendForUser(fixture(), { items: [item('anchor', 1), item('cart', 0, 1)] }, request);
  assert.equal(result.items[0].product.prd_id, 'peer');
  assert.equal(result.items[0].source, 'behavior');
  assert.equal(result.items[0].support, 3);
  assert.equal(result.effectiveMode, 'mixed');
  assert.equal(result.excludedCount, 2);
  assert.equal(result.items.length, 3);
  assert.ok(result.fallbackReason);
  assert.ok(result.items.every(row => row.product.domain === 'beauty' && !['anchor', 'cart'].includes(row.product.prd_id)));
});

test('metadata ranking is independent of clicks, popularity, neighbors, frequency and dates', () => {
  const index = fixture();
  const input = { ...request, mode: 'metadata', limit: 4 };
  const first = recommendForUser(index, { items: [item('anchor', 1)] }, input);
  const changed = structuredClone(index);
  changed.popularity = { peer: 99999999 };
  changed.neighbors = {};
  const second = recommendForUser(changed, { items: [{ ...item('anchor', 3, 0, 999), lastAt: '1999010100' }, item('meta', 0, 0, 999999)] }, input);
  assert.deepEqual(first.items, second.items);
  assert.ok(first.items.every(row => row.source === 'metadata' && row.signals.popularity === 0 && row.signals.behavior === 0));
});

test('unknown users receive domain popularity in behavior and metadata-only catalog diversity in backup', () => {
  const index = fixture();
  const behavior = recommendForUser(index, null, request);
  assert.equal(behavior.userState, 'unknown');
  assert.equal(behavior.items[0].product.prd_id, 'popular');
  assert.equal(behavior.items[0].source, 'popularity');
  const before = recommendForUser(index, null, { ...request, mode: 'metadata' });
  index.popularity = { anchor: 9999 };
  const after = recommendForUser(index, null, { ...request, mode: 'metadata' });
  assert.deepEqual(before.items, after.items);
  assert.ok(before.items.every(row => row.source === 'catalog'));
});

test('click-only history is weak evidence in main and is not a metadata anchor', () => {
  const history = { items: [item('anchor', 0, 0, 20)] };
  const main = recommendForUser(fixture(), history, request);
  assert.equal(main.userState, 'views-only');
  assert.equal(main.items[0].source, 'behavior');
  const backup = recommendForUser(fixture(), history, { ...request, mode: 'metadata' });
  assert.equal(backup.anchors.length, 0);
  assert.ok(backup.items.every(row => row.source === 'catalog'));
});

test('same user without category history does not import unrelated category preferences', () => {
  const result = recommendForUser(fixture(), { items: [item('fashion', 1)] }, request);
  assert.equal(result.userState, 'no-domain-history');
  assert.equal(result.anchors.length, 0);
  assert.equal(result.items[0].source, 'popularity');
});

test('single-user pairs and invalid similarities cannot become collaborative recommendations', () => {
  const index = fixture();
  index.neighbors.anchor = [{ productId: 'peer', score: 1, support: 1 }, { productId: 'meta', score: Number.NaN, support: 4 }];
  const result = recommendForUser(index, { items: [item('anchor', 1)] }, request);
  assert.ok(result.items.every(row => row.source !== 'behavior'));
});

test('explicit screen context updates anchors/exclusions without mutating history and ignores fixture IDs', () => {
  const profile = { items: [item('anchor', 1)] };
  const copy = structuredClone(profile);
  const result = recommendForUser(fixture(), profile, { ...request, cartProductIds: ['peer'], purchasedProductIds: ['cart'], anchorProductId: 'old-demo-serum' });
  assert.deepEqual(profile, copy);
  assert.equal(result.excludedCount, 3);
  assert.ok(result.items.every(row => !['anchor', 'peer', 'cart'].includes(row.product.prd_id)));
  assert.equal(new Set(result.items.map(row => row.product.prd_id)).size, result.items.length);
});

test('empty catalog and all-excluded catalog terminate with honest empty results', () => {
  const index = fixture();
  assert.deepEqual(recommendForUser({ ...index, products: [] }, null, request).items, []);
  const result = recommendForUser(index, { items: index.products.map(p => item(p.prd_id, 1)) }, request);
  assert.equal(result.items.length, 0);
  assert.ok(result.fallbackReason);
});

function store(overrides = {}) {
  return { index: fixture, profile: () => ({ items: [item('anchor', 1)] }), sample: () => ({ items: [item('anchor', 1)] }), sampleDomains: () => ['beauty'], defaultMode: () => 'metadata', ...overrides };
}
const http = body => new Request('http://localhost/api/recommendations', { method: 'POST', body: JSON.stringify(body) });
test('API defaults can switch independently of callers and do not echo user identifiers', async () => {
  const response = await recommendationsResponse(http({ domain: 'beauty', userId: 'private-user' }), store());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const result = await response.json();
  assert.equal(result.requestedMode, 'metadata');
  assert.ok(!JSON.stringify(result).includes('private-user'));
  assert.equal((await (await recommendationsResponse(http({ domain: 'beauty', mode: 'behavior' }), store())).json()).requestedMode, 'behavior');
});

test('API rejects invalid category, mode, duplicate identity, limits and product-list shapes', async () => {
  const invalid = [null, [], { domain: 'bad' }, { domain: 'beauty', mode: 'auto' }, { domain: 'beauty', limit: 0 }, { domain: 'beauty', limit: 1.5 }, { domain: 'beauty', sample: 'fashion' }, { domain: 'beauty', sample: 'beauty', userId: 'x' }, { domain: 'beauty', cartProductIds: 'x' }, { domain: 'beauty', userId: 123 }];
  for (const input of invalid) assert.equal((await recommendationsResponse(http(input), store())).status, 400);
  assert.equal((await recommendationsResponse(new Request('http://localhost', { method: 'POST', body: '{' }), store())).status, 400);
});

test('unprepared index is a safe 503, status remains usable and no filesystem detail leaks', async () => {
  const broken = store({ index: () => { throw new Error('/private/user/dump/secret.csv'); } });
  const response = await recommendationsResponse(http({ domain: 'food' }), broken);
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes('/private/'));
  const status = await recommendationStatusResponse(broken).json();
  assert.equal(status.ready, false);
  assert.equal(status.defaultMode, 'metadata');
  const ready = await recommendationStatusResponse(store()).json();
  assert.deepEqual(ready.sampleDomains, ['beauty']);
  assert.equal(ready.ready, true);
});

test('fallback explanations describe actual sources when popularity is missing', () => {
  const index = fixture(); index.popularity = {}; index.neighbors = {};
  const cold = recommendForUser(index, null, request);
  assert.equal(cold.effectiveMode, 'catalog');
  assert.doesNotMatch(cold.fallbackReason, /인기도/);
  assert.match(cold.fallbackReason, /기본 상품/);
  const selected = recommendForUser(index, null, { ...request, anchorProductId: 'anchor' });
  assert.equal(selected.userState, 'unknown', 'A selected item alone is not a purchase history');
  assert.equal(selected.anchors[0].source, 'selected');
  assert.doesNotMatch(selected.fallbackReason, /인기도/);
});
