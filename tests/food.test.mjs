import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../app/api/demo/food/route.ts';
import { demoFood, demoFoodCatalog } from '../src/data/demo-food.ts';
import { demoHome } from '../src/data/demo-home.ts';
import {
  adaptFoodProducts, addToCart, buildProductRows, cartTotal, normalizeCart,
  recommendScenarios, recommendationReason,
} from '../src/lib/food.ts';

const sourceColumns = ['prd_id', 'view_name', 'price', 'cate1_nm', 'cate2_nm', 'cate3_nm', 'cate4_m', 'brd_mn', 'domain'].sort();
const forbiddenFields = ['packSize', 'unit', 'optionLabel', 'available', 'amountPerServing', 'requiredAmount', 'requiredPacks', 'servings'];
const additions = rows => rows.filter(row => row.selected)
  .map(row => ({ productId: row.product.id, quantity: row.additionalQuantity }));
const recommend = (profile = 'new', cart = [], selected = null, intent = 'all', saved = [], data = demoFood) =>
  recommendScenarios(data, profile, cart, selected, intent, saved);
const scenario = id => demoFood.scenarios.find(item => item.id === id);
const sourceProduct = overrides => ({
  prd_id: 'new-product', view_name: '새로운 상품', price: 1234,
  cate1_nm: '식품', cate2_nm: '', cate3_nm: '', cate4_m: '', brd_mn: '', domain: '푸드', ...overrides,
});

test('source catalog uses only promised columns; presentation adaptation does not need size, quantity, option or image inputs', () => {
  for (const product of demoFoodCatalog) assert.deepEqual(Object.keys(product).sort(), sourceColumns);
  const raw = sourceProduct({ prd_id: 'source-only', view_name: '새 우유', cate3_nm: '우유' });
  const [product] = adaptFoodProducts([raw]);
  assert.equal(product.id, raw.prd_id);
  assert.equal(product.name, raw.view_name);
  assert.equal(product.shortName, raw.view_name);
  assert.equal(product.price, raw.price);
  assert.equal(product.imageUrl, '/products/milk.svg');
  const [decorated] = adaptFoodProducts([raw], { 'source-only': { shortName: '우유 예시', imageUrl: '/products/milk.svg' } });
  assert.equal(decorated.shortName, '우유 예시');
  for (const field of forbiddenFields) assert.equal(field in product, false, `${field} must not be inferred`);
  const [stripped] = adaptFoodProducts([{ ...raw, packSize: 500, unit: 'ml', available: true }]);
  for (const field of forbiddenFields) assert.equal(field in stripped, false, `${field} is not an extracted contract dependency`);
  assert.deepEqual(Object.keys(raw).sort(), sourceColumns, 'adapter does not mutate the input');
});

test('food API preserves home identity and purchase events without claiming present inventory', async () => {
  const response = GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const data = await response.json();
  assert.deepEqual(data.user, { id: demoHome.user.id, name: demoHome.user.name });
  const homeProfile = data.profiles.find(profile => profile.id === 'home');
  const foodPurchases = demoHome.purchases.filter(purchase => purchase.category === 'food');
  assert.deepEqual(homeProfile.purchases.map(purchase => purchase.productId), foodPurchases.map(purchase => purchase.id));
  assert.deepEqual(homeProfile.cart, []);
  for (const purchase of foodPurchases) {
    const product = data.products.find(item => item.id === purchase.id);
    assert.equal(product.name, purchase.name);
    assert.equal(product.imageUrl, purchase.imageUrl);
    assert.equal(product.price, purchase.price);
    const record = homeProfile.purchases.find(item => item.productId === purchase.id);
    assert.deepEqual(record, { productId: purchase.id, purchasedAt: purchase.purchasedAt });
  }
  assert.equal('recipes' in data, false);
  data.products[0].price = 0;
  assert.notEqual((await GET().json()).products[0].price, 0);
});

test('six core scenarios link real demo catalog products without capacity or serving assumptions', () => {
  assert.equal(new Set(demoFood.products.map(product => product.id)).size, demoFood.products.length);
  assert.equal(new Set(demoFood.scenarios.map(item => item.id)).size, demoFood.scenarios.length);
  assert.ok(demoFood.scenarios.length >= 6);
  assert.deepEqual(new Set(demoFood.scenarios.map(item => item.kind)), new Set(['meal', 'routine', 'outing']));
  for (const item of demoFood.scenarios) {
    assert.ok(item.steps.length > 0 && item.products.length > 0);
    assert.equal(new Set(item.products.map(product => product.productId)).size, item.products.length);
    assert.equal('minutes' in item, false);
    for (const link of item.products) {
      const product = demoFood.products.find(product => product.id === link.productId);
      assert.ok(product);
      assert.ok(Number.isSafeInteger(product.price) && product.price > 0);
      for (const field of forbiddenFields) assert.equal(field in link || field in product, false);
    }
  }
});

test('purchases, cart choices and saves ground recommendation ranking', () => {
  assert.equal(recommend()[0].id, 'tomato-pasta');
  assert.equal(recommend('purchased')[0].id, 'tomato-pasta');
  assert.equal(recommend('new', [{ productId: 'tomato', quantity: 1 }])[0].id, 'tomato-pasta');
  assert.equal(recommend('new', [], null, 'all', ['mushroom-rice'])[0].id, 'mushroom-rice');
  assert.ok(recommend('new', [], 'milk').every(item => item.products.some(product => product.productId === 'milk')));
  assert.equal(recommend('new', [], 'milk', 'morning')[0].id, 'simple-breakfast');
  assert.equal(recommend('new', [], null, 'outdoor')[0].id, 'outing');
});

test('vitamin and water produce relevant non-cooking scenarios, including conflicting topic selections', () => {
  for (const intent of ['all', 'quick', 'hearty', 'morning', 'outdoor', 'routine']) {
    const vitaminResults = recommend('home', [], 'vitamin', intent);
    assert.ok(vitaminResults.length > 0);
    assert.ok(vitaminResults.every(item => item.kind === 'routine'));
    assert.equal(vitaminResults[0].id, 'daily-food');
    const vitaminContent = vitaminResults.map(item => [item.name, item.description, ...item.steps].join(' ')).join(' ');
    assert.doesNotMatch(vitaminContent, /복용|섭취|효능|면역|건강해|치료|예방|레시피|재료/);
    const waterResults = recommend('home', [], 'water', intent);
    assert.ok(waterResults.length > 0);
    assert.ok(waterResults.every(item => item.kind !== 'meal'));
  }
  assert.equal(recommend('home', [], 'water', 'outdoor')[0].id, 'outing');
  assert.equal(recommend('home', [], 'water')[0].id, 'outing', 'selected water prioritizes the outing that uses it as a core product');
  assert.match(recommendationReason(demoFood, scenario('daily-food'), 'home', [], 'vitamin', 'quick', []), /선택한 주제 대신/);
});

test('every known product and every topic has a result; unknown selections fall back honestly', () => {
  for (const id of [...demoFood.products.map(product => product.id), 'unknown']) {
    for (const intent of ['all', 'quick', 'hearty', 'morning', 'outdoor', 'routine']) {
      const results = recommend('new', [], id, intent);
      assert.ok(results.length > 0, `${id}/${intent} must have a scenario or fallback`);
      if (id === 'unknown') {
        assert.match(recommendationReason(demoFood, results[0], 'new', [], id, intent, []), /직접 연결되는 장면이 없어 기본/);
      }
    }
  }
});

test('new SKU recommendations use category/name metadata; unrelated products receive a labeled general fallback', () => {
  const [vitamin, milk, unknown] = adaptFoodProducts([
    sourceProduct({ prd_id: 'new-vitamin', view_name: '데일리 상품', cate2_nm: '건강식품', cate3_nm: '멀티비타민' }),
    sourceProduct({ prd_id: 'new-milk', view_name: '새 우유' }),
    sourceProduct({ prd_id: 'new-unknown', view_name: '알 수 없는 상품' }),
  ]);
  const data = { ...demoFood, products: [...demoFood.products, vitamin, milk, unknown] };
  assert.equal(unknown.imageUrl, '/food/products/generic.svg');
  assert.equal(recommend('new', [], vitamin.id, 'quick', [], data)[0].id, 'daily-food');
  assert.match(recommendationReason(data, scenario('daily-food'), 'new', [], vitamin.id, 'quick', []), /식품 분류를 참고/);
  assert.match(recommendationReason(data, scenario('daily-food'), 'new', [], vitamin.id, 'quick', []), /데모 예시/);
  assert.equal(recommend('new', [], milk.id, 'morning', [], data)[0].id, 'simple-breakfast');
  const fallback = recommend('new', [], unknown.id, 'all', [], data);
  assert.ok(fallback.length > 0);
  assert.match(recommendationReason(data, fallback[0], 'new', [], unknown.id, 'all', []), /직접 연결되는 장면이 없어/);
  const withPurchase = { ...data, profiles: [{ id: 'new', label: '신규 구매', cart: [], purchases: [{ productId: vitamin.id, purchasedAt: '2026.09.21' }] }] };
  assert.equal(recommend('new', [], null, 'all', [], withPurchase)[0].id, 'daily-food');
  assert.equal(recommend('new', [{ productId: vitamin.id, quantity: 1 }], null, 'all', [], data)[0].id, 'daily-food');
});

test('recommendation reasons describe their actual source without claiming possession', () => {
  const item = scenario('creamy-pasta');
  assert.match(recommendationReason(demoFood, item, 'home', [], null, 'all', []), /우유 구매 기록/);
  assert.match(recommendationReason(demoFood, item, 'home', [], null, 'all', []), /현재 보유 상태와는 달라/);
  assert.match(recommendationReason(demoFood, item, 'new', [{ productId: 'milk', quantity: 1 }], null, 'all', []), /장바구니 상품 ‘우유’/);
  assert.match(recommendationReason(demoFood, item, 'home', [], 'milk', 'all', []), /‘우유’에 맞춰 골라본 장면/);
  assert.match(recommendationReason(demoFood, scenario('daily-food'), 'home', [], 'vitamin', 'all', []), /‘멀티비타민’에 맞춰 골라본 장면/);
});

test('specific source categories override ambiguous product-name words', () => {
  const products = adaptFoodProducts([
    sourceProduct({ prd_id: 'water-name', view_name: '비타민 워터', cate3_nm: '생수' }),
    sourceProduct({ prd_id: 'sauce-name', view_name: '우유 버섯 파스타소스', cate3_nm: '파스타소스' }),
  ]);
  const data = { ...demoFood, products: [...demoFood.products, ...products] };
  assert.equal(recommend('new', [], 'water-name', 'all', [], data)[0].id, 'outing');
  assert.equal(recommend('new', [], 'sauce-name', 'all', [], data)[0].id, 'tomato-pasta');
  assert.equal(products[0].imageUrl, '/products/water.svg');
  assert.equal(products[1].imageUrl, '/food/products/tomato.svg');
});

test('first visit selects one of each core product, while optional oil stays unselected', () => {
  const rows = buildProductRows(demoFood, 'tomato-pasta', [], []);
  assert.deepEqual(additions(rows), [{ productId: 'pasta', quantity: 1 }, { productId: 'tomato', quantity: 1 }, { productId: 'mushroom', quantity: 1 }]);
  assert.equal(cartTotal(demoFood, additions(rows)), 11200);
  assert.equal(rows.find(row => row.product.id === 'olive-oil').selected, false);
  const optedIn = buildProductRows(demoFood, 'tomato-pasta', [], [], []);
  assert.equal(cartTotal(demoFood, additions(optedIn)), 20100);
  for (const row of rows) for (const field of forbiddenFields) assert.equal(field in row, false);
});

test('purchase history never excludes a product; exclusions apply only to the current shopping choice', () => {
  const milk = buildProductRows(demoFood, 'creamy-pasta', [], []).find(row => row.product.id === 'milk');
  assert.equal(milk.owned, false);
  assert.equal(milk.selected, true);
  const excluded = buildProductRows(demoFood, 'tomato-pasta', ['pasta', 'olive-oil'], [], []);
  assert.equal(excluded.find(row => row.product.id === 'pasta').additionalQuantity, 0);
  assert.equal(excluded.find(row => row.product.id === 'olive-oil').additionalQuantity, 0);
  assert.equal(cartTotal(demoFood, additions(excluded)), 7400);
  assert.equal(buildProductRows(demoFood, 'tomato-pasta', [], [])[0].selected, true, 'new scenario check does not retain exclusions');
});

test('existing cart products are excluded by default without calculating sufficiency', () => {
  const existing = [{ productId: 'tomato', quantity: 1 }];
  const rows = buildProductRows(demoFood, 'tomato-pasta', [], existing);
  const tomato = rows.find(row => row.product.id === 'tomato');
  assert.deepEqual([tomato.inCart, tomato.additionalQuantity, tomato.selected, tomato.owned], [1, 0, false, false]);
  assert.equal(cartTotal(demoFood, additions(rows)), 6700);
  const cart = addToCart(existing, additions(rows));
  assert.equal(cart.find(line => line.productId === 'tomato').quantity, 1);
  assert.deepEqual(additions(buildProductRows(demoFood, 'tomato-pasta', [], cart)), []);
  assert.deepEqual(existing, [{ productId: 'tomato', quantity: 1 }], 'original cart remains untouched');
});

test('explicit quantities are user choices, bounded at 99 and never based on serving counts', () => {
  const rows = buildProductRows(demoFood, 'tomato-pasta', [], [{ productId: 'tomato', quantity: 1 }], undefined,
    { tomato: 4, pasta: 1000, mushroom: -1 });
  assert.equal(rows.find(row => row.product.id === 'tomato').additionalQuantity, 4);
  assert.equal(rows.find(row => row.product.id === 'pasta').additionalQuantity, 99);
  assert.equal(rows.find(row => row.product.id === 'mushroom').additionalQuantity, 1);
  const capped = buildProductRows(demoFood, 'tomato-pasta', [], [{ productId: 'tomato', quantity: 98 }], undefined, { tomato: 9 });
  assert.equal(capped.find(row => row.product.id === 'tomato').additionalQuantity, 1);
  const full = buildProductRows(demoFood, 'tomato-pasta', [], [{ productId: 'tomato', quantity: 99 }], undefined, { tomato: 1 });
  assert.equal(full.find(row => row.product.id === 'tomato').selected, false);
});

test('user exclusions, deselection and existing cart states stay distinct', () => {
  const ids = scenario('tomato-pasta').products.map(item => item.productId);
  const excluded = buildProductRows(demoFood, 'tomato-pasta', ids, []);
  const deselected = buildProductRows(demoFood, 'tomato-pasta', [], [], ids);
  const inCart = buildProductRows(demoFood, 'tomato-pasta', [], ids.map(productId => ({ productId, quantity: 1 })));
  for (const rows of [excluded, deselected, inCart]) assert.deepEqual(additions(rows), []);
  assert.ok(excluded.every(row => row.owned));
  assert.ok(deselected.every(row => !row.owned && row.additionalQuantity > 0));
  assert.ok(inCart.every(row => !row.owned && row.inCart > 0));
});

test('corrupt or stale carts cannot introduce unknown products, fractional counts or unbounded totals', () => {
  for (const value of [null, undefined, 'not json', 12, {}]) assert.deepEqual(normalizeCart(demoFood, value), []);
  const cart = normalizeCart(demoFood, [null, true, {},
    { productId: 'pasta', quantity: 2 }, { productId: 'pasta', quantity: 3 }, { productId: 'tomato', quantity: 999 },
    { productId: 'unknown', quantity: 1 }, { productId: 'milk', quantity: -1 }, { productId: 'water', quantity: 1.5 },
    { productId: 'vitamin', quantity: '2' }, { productId: 'egg', quantity: Infinity }, { productId: 'rice', quantity: NaN },
  ]);
  assert.deepEqual(cart, [{ productId: 'pasta', quantity: 5 }, { productId: 'tomato', quantity: 99 }]);
  assert.equal(cartTotal(demoFood, cart), 464500);
  assert.deepEqual(addToCart([{ productId: 'tomato', quantity: 98 }], [{ productId: 'tomato', quantity: 4 }]), [{ productId: 'tomato', quantity: 99 }]);
  assert.deepEqual(buildProductRows(demoFood, 'unknown', [], []), []);
});
