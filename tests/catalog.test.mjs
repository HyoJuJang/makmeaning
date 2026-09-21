import assert from 'node:assert/strict';
import test from 'node:test';
import { GET as getFood } from '../app/api/demo/food/route.ts';
import { GET as getBeauty } from '../app/api/demo/beauty/route.ts';
import { demoCatalogRows, demoCatalogs } from '../src/data/demo-catalog.ts';
import { demoHome } from '../src/data/demo-home.ts';
import {
  adaptCatalogProducts, addToCart, cartTotal, normalizeCart, restoreCatalogState,
} from '../src/lib/catalog.ts';

const sourceColumns = ['prd_id', 'view_name', 'price', 'cate1_nm', 'cate2_nm', 'cate3_nm', 'cate4_m', 'brd_mn', 'domain'].sort();
const removedFields = ['scenarios', 'recipes', 'intent', 'tags', 'steps', 'minutes', 'packSize', 'unit', 'optionLabel', 'available', 'amountPerServing', 'requiredAmount', 'requiredPacks', 'servings', 'owned'];
const food = demoCatalogs.food;
const beauty = demoCatalogs.beauty;
const line = (productId, quantity = 1) => ({ productId, quantity });
const legacy = (cart, version = 2) => ({
  version, profileId: 'cart',
  contexts: {
    home: { cart, savedIds: ['daily-food', 'milk'], scenarioId: 'daily-food' },
    cart: { cart: [line('egg', 8)], savedIds: ['tomato-pasta'] },
    new: { cart: [line('water', 9)] },
  },
});

function assertNoRemovedFields(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert.equal(removedFields.includes(key), false, `${key} must be absent from the catalog API`);
    assertNoRemovedFields(child);
  }
}

test('both raw catalogs contain exactly the promised nine source columns', () => {
  assert.equal(demoCatalogRows.food.length, 9);
  assert.equal(demoCatalogRows.beauty.length, 4);
  for (const category of ['food', 'beauty']) {
    const rows = demoCatalogRows[category];
    assert.equal(new Set(rows.map(product => product.prd_id)).size, rows.length);
    for (const product of rows) {
      assert.deepEqual(Object.keys(product).sort(), sourceColumns);
      assert.ok(Number.isSafeInteger(product.price) && product.price > 0);
      for (const field of sourceColumns.filter(field => field !== 'price')) assert.equal(typeof product[field], 'string');
    }
  }
});

test('display adaptation works from the nine source columns without images, sizing, or recommendation metadata', () => {
  const source = { prd_id: 'new-source', view_name: '새 상품', price: 1234, cate1_nm: '식품', cate2_nm: '', cate3_nm: '', cate4_m: '', brd_mn: '', domain: '푸드' };
  const [plain] = adaptCatalogProducts([source]);
  assert.equal(plain.id, source.prd_id);
  assert.equal(plain.name, source.view_name);
  assert.equal(plain.shortName, source.view_name);
  assert.equal(plain.imageUrl, '/food/products/generic.svg');
  assert.equal(plain.price, source.price);
  const [decorated] = adaptCatalogProducts([source], { 'new-source': { shortName: '표시 이름', imageUrl: '/products/milk.svg' } });
  assert.equal(decorated.shortName, '표시 이름');
  assert.equal(decorated.name, '새 상품');
  assert.equal(decorated.imageUrl, '/products/milk.svg');
  const [stripped] = adaptCatalogProducts([{ ...source, packSize: 500, unit: 'ml', available: true, scenarios: ['breakfast'], imageUrl: '/source-image.jpg' }]);
  assertNoRemovedFields(stripped);
  assert.equal(stripped.imageUrl, '/food/products/generic.svg', 'source-only image fields are not assumed');
  assert.deepEqual(Object.keys(source).sort(), sourceColumns, 'adapter does not mutate raw data');
});

for (const [category, get] of [['food', getFood], ['beauty', getBeauty]]) {
  test(`${category} API preserves home user, avatar, and purchase events without inventory or scenarios`, async () => {
    const response = get();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const result = await response.json();
    assert.deepEqual(Object.keys(result).sort(), ['category', 'initialCart', 'products', 'purchases', 'user']);
    assert.equal(result.category, category);
    assert.deepEqual(result.user, demoHome.user);
    const purchases = demoHome.purchases.filter(purchase => purchase.category === category);
    assert.deepEqual(result.purchases, purchases.map(purchase => ({ productId: purchase.id, purchasedAt: purchase.purchasedAt })));
    assert.deepEqual(result.initialCart, []);
    for (const purchase of purchases) {
      const product = result.products.find(product => product.id === purchase.id);
      assert.equal(product.name, purchase.name);
      assert.equal(product.price, purchase.price);
      assert.equal(product.imageUrl, purchase.imageUrl);
      assert.equal(product.prd_id, purchase.id);
      assert.equal(product.view_name, purchase.name);
    }
    assertNoRemovedFields(result);
    result.products[0].price = 0;
    assert.notEqual((await get().json()).products[0].price, 0, 'response objects do not mutate the shared fixture');
  });
}

test('current version 1 state is authoritative and restores only known unique product saves', () => {
  const stored = {
    version: 1,
    cart: [line('milk', 2), line('milk', 3), line('serum'), line('unknown')],
    savedProductIds: ['vitamin', 'vitamin', 'tomato-pasta', 'serum', null, 17],
    savedIds: ['daily-food'],
  };
  const result = restoreCatalogState(food, JSON.stringify(stored), JSON.stringify(legacy([line('egg', 7)])));
  assert.deepEqual(result, { cart: [line('milk', 5)], savedProductIds: ['vitamin'] });
  assert.deepEqual(restoreCatalogState(food, { version: 1, cart: [], savedProductIds: [] }, legacy([line('egg', 7)])), {
    cart: [], savedProductIds: [],
  }, 'an intentionally emptied current cart does not revive the legacy cart');
});

test('invalid entries in a valid current state are sanitized instead of reviving legacy choices', () => {
  const result = restoreCatalogState(food, {
    version: 1, cart: [null, line('missing'), line('milk', -1), line('egg', 1.5)],
    savedProductIds: [null, 'daily-food', 'missing'],
  }, legacy([line('milk', 4)]));
  assert.deepEqual(result, { cart: [], savedProductIds: [] });
});

test('legacy food migration imports only the home cart and never converts scene saves into product saves', () => {
  for (const version of [1, 2]) {
    const result = restoreCatalogState(food, null, legacy([line('milk', 2), line('milk', 1), line('serum')], version));
    assert.deepEqual(result, { cart: [line('milk', 3)], savedProductIds: [] });
  }
  assert.deepEqual(restoreCatalogState(food, null, legacy([])), { cart: [], savedProductIds: [] });
  assert.deepEqual(restoreCatalogState(food, null, { version: 2, contexts: { new: { cart: [line('milk')] } } }), { cart: [], savedProductIds: [] });
});

test('food and beauty carts and saved products remain separate, including migration', () => {
  const stored = { version: 1, cart: [line('milk'), line('serum', 2)], savedProductIds: ['milk', 'cream'] };
  assert.deepEqual(restoreCatalogState(food, stored), { cart: [line('milk')], savedProductIds: ['milk'] });
  assert.deepEqual(restoreCatalogState(beauty, stored), { cart: [line('serum', 2)], savedProductIds: ['cream'] });
  assert.deepEqual(restoreCatalogState(beauty, null, legacy([line('serum', 9)])), { cart: [], savedProductIds: [] }, 'beauty never imports old food state');
});

test('malformed storage cannot stop browsing; invalid current state can fall back to a valid legacy home cart', () => {
  const broken = [undefined, null, '', '{broken', 'null', '3', '[]', 17, false, [], {},
    { version: 4, cart: [], savedProductIds: [] },
    { version: 1, cart: 'bad', savedProductIds: [] },
    { version: 1, cart: [], savedProductIds: null },
  ];
  for (const value of broken) {
    assert.deepEqual(restoreCatalogState(food, value), { cart: [], savedProductIds: [] });
    assert.deepEqual(restoreCatalogState(food, value, JSON.stringify(legacy([line('water', 2)]))), { cart: [line('water', 2)], savedProductIds: [] });
  }
  for (const value of [...broken, { version: 2, contexts: [] }, { version: 2, contexts: { home: { cart: 'bad' } } }, legacy([line('milk')], 99)]) {
    assert.deepEqual(restoreCatalogState(food, null, value), { cart: [], savedProductIds: [] });
  }
});

test('initial cart is sanitized and copied when no usable state exists', () => {
  const fixture = { ...food, initialCart: [line('tomato', 2), line('unknown')] };
  const restored = restoreCatalogState(fixture, null);
  assert.deepEqual(restored, { cart: [line('tomato', 2)], savedProductIds: [] });
  restored.cart[0].quantity = 8;
  assert.equal(fixture.initialCart[0].quantity, 2);
});

test('cart normalization rejects unknown products, invalid counts and non-array payloads', () => {
  for (const value of [null, undefined, 'cart', {}, 3, true]) assert.deepEqual(normalizeCart(food, value), []);
  const result = normalizeCart(food, [null, true, {}, [],
    line('pasta', 2), line('pasta', 3), line('tomato', 999), line('unknown'), line('serum'),
    line('milk', -1), line('water', 1.5), line('vitamin', '2'), line('egg', Infinity), line('rice', NaN),
    line('', 1), line('  ', 1), line('milk', Number.MAX_SAFE_INTEGER + 1),
  ]);
  assert.deepEqual(result, [line('pasta', 5), line('tomato', 99)]);
  assert.equal(cartTotal(food, result), 464500);
});

test('cart additions aggregate user-selected quantities, cap at 99, and do not mutate inputs', () => {
  const original = [line('tomato', 98)];
  const additions = [line('tomato', 4), line('milk', 2), line('milk', 3)];
  const next = addToCart(original, additions);
  assert.deepEqual(next, [line('tomato', 99), line('milk', 5)]);
  assert.deepEqual(original, [line('tomato', 98)]);
  assert.deepEqual(additions, [line('tomato', 4), line('milk', 2), line('milk', 3)]);
  assert.equal(cartTotal(food, next), 480000);
  assert.equal(cartTotal(beauty, [line('milk'), line('serum', 2)]), 45800, 'totals stay scoped to the current category');
});
