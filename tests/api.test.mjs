import assert from 'node:assert/strict';
import test from 'node:test';
import { demoHome } from '../src/data/demo-home.ts';
import { demoPurchaseSeeds } from '../src/data/demo-purchases.ts';
import { demoHomeResponse, resolveDemoHome } from '../src/lib/demo-home.ts';
import { ProductApiError } from '../src/lib/products/contracts.ts';

const catalog = demoHome.purchases.map(item => ({
  prd_id: item.id, view_name: item.name, discprice: item.price, domain: item.category,
  cate1_nm: null, cate2_nm: null, cate3_nm: null, cate4_nm: null,
  brand_name: null, opt1: null, opt2: null, opt3: null, opt4: null,
}));
const repository = (rows = catalog) => ({ async find(id) { return rows.find(item => item.prd_id === id) ?? null; } });
const GET = () => demoHomeResponse(() => repository());

test('home joins one fictional user to real catalog IDs in all four room areas', async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const { user, purchases, demo } = await response.json();
  assert.deepEqual(user, { id: 'demo-user', name: '민서', avatarId: 'short' });
  assert.equal(purchases.length, 10);
  for (const key of ['id', 'purchaseId', 'roomSlot']) {
    assert.equal(new Set(purchases.map(item => item[key])).size, purchases.length, key);
  }
  assert.equal(demo.isDemo, true);
  assert.equal(demo.ownership, 'fictional');
  assert.equal(demo.quantities, 'demo-remaining');
  assert.equal(demo.illustrations, 'not-product-appearance-or-fitting');
  assert.match(demo.notice, /실제 상품 외형이나 가상 피팅을 재현하지 않습니다/);

  const expectedSlots = {
    knit: ['fashion', 'wardrobe-1'], shirt: ['fashion', 'wardrobe-2'],
    milk: ['food', 'fridge-1'], water: ['food', 'fridge-2'], vitamin: ['food', 'pantry-1'],
    cushion: ['living', 'sofa-1'], lamp: ['living', 'lamp-1'],
    serum: ['beauty', 'vanity-1'], cream: ['beauty', 'vanity-2'],
  };
  for (const purchase of purchases) {
    const item = catalog.find(row => row.prd_id === purchase.id);
    assert.ok(item, 'Every purchase uses an exact catalog ID');
    assert.equal(purchase.name, item.view_name);
    assert.equal(purchase.price, item.discprice);
    assert.equal(purchase.category, item.domain);
    assert.equal(purchase.purchaseId, demoPurchaseSeeds.find(seed => seed.id === purchase.id).purchaseId);
    assert.notEqual(purchase.id, purchase.illustrationKey);
    assert.deepEqual([purchase.category, purchase.roomSlot], purchase.id === '1065577366' ? ['fashion', 'wardrobe-3'] : expectedSlots[purchase.illustrationKey]);
    assert.equal(purchase.imageUrl, `/products/${purchase.illustrationKey}.svg`);
    assert.equal(purchase.catalogSource, 'shared-products');
    assert.equal(purchase.imageKind, 'illustration');
    assert.equal(purchase.priceKind, 'catalog-reference');
    assert.match(purchase.purchasedAt, /^\d{4}\.\d{2}\.\d{2}$/);
    if (purchase.category === 'food') assert.equal(purchase.state.quantity, 3);
  }
  for (const category of ['fashion', 'food', 'living', 'beauty']) {
    assert.ok(purchases.filter(item => item.category === category).length >= 2);
  }
  assert.equal(purchases.filter(item => item.state.wearing).length, 1);
  assert.equal(purchases.filter(item => item.category === 'fashion').length, 3);
  assert.equal(purchases.filter(item => item.state.featured).length, 1);
  assert.equal(purchases.find(item => item.illustrationKey === 'lamp').state.on, true);
});

test('runtime catalog values are joined on every request rather than replaced by a fixture', async () => {
  const updated = catalog.map(item => ({ ...item, view_name: `현재 DB: ${item.view_name}`, discprice: item.discprice + 100 }));
  const seen = [];
  const home = await resolveDemoHome({ async find(id) {
    seen.push(id);
    return updated.find(item => item.prd_id === id);
  } });
  assert.deepEqual(seen, demoPurchaseSeeds.map(item => item.id));
  for (const item of home.purchases) {
    const product = updated.find(row => row.prd_id === item.id);
    assert.equal(item.name, product.view_name);
    assert.equal(item.price, product.discprice);
  }
});

test('personal state changes and reset cannot mutate the catalog or another home response', async () => {
  // The only injected capability is read. No write API is available to the home resolver.
  const rows = catalog.map(item => Object.freeze({ ...item }));
  Object.freeze(rows);
  const beforeCatalog = JSON.stringify(rows);
  const beforeSeeds = JSON.stringify(demoPurchaseSeeds);
  const first = await resolveDemoHome(repository(rows));
  first.user.name = 'changed';
  first.purchases.find(item => item.illustrationKey === 'milk').state.quantity = 0;
  first.purchases.find(item => item.illustrationKey === 'shirt').state.wearing = true;
  first.purchases.find(item => item.illustrationKey === 'lamp').state.on = false;
  first.purchases[0].name = 'local change';
  const reset = await resolveDemoHome(repository(rows));
  assert.equal(reset.user.name, '민서');
  assert.equal(reset.purchases.find(item => item.illustrationKey === 'milk').state.quantity, 3);
  assert.equal(reset.purchases.find(item => item.illustrationKey === 'shirt').state.wearing, false);
  assert.equal(reset.purchases.find(item => item.illustrationKey === 'lamp').state.on, true);
  assert.equal(reset.purchases[0].name, rows[0].view_name);
  assert.equal(JSON.stringify(rows), beforeCatalog);
  assert.equal(JSON.stringify(demoPurchaseSeeds), beforeSeeds);
});

test('missing, misidentified or recategorized purchased products fail closed without fictional replacements', async () => {
  const cases = [null, { ...catalog[0], prd_id: 'wrong' }, { ...catalog[0], domain: 'food' }];
  for (const invalid of cases) {
    const response = await demoHomeResponse(() => ({ async find(id) {
      return id === catalog[0].prd_id ? invalid : catalog.find(item => item.prd_id === id);
    } }));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json();
    assert.equal(body.error.code, 'DEMO_CATALOG_MISMATCH');
    assert.equal(body.purchases, undefined);
  }
});

test('database configuration/unavailability produces safe errors and never silently uses fixture data', async () => {
  const secret = 'postgres://private_user:private_password@internal.example/database';
  const failures = [
    () => { throw new ProductApiError(503, 'DATABASE_NOT_CONFIGURED', '상품 데이터베이스가 아직 연결되지 않았습니다.'); },
    () => ({ async find() { throw new Error(secret); } }),
  ];
  for (const factory of failures) {
    const response = await demoHomeResponse(factory);
    assert.equal(response.status, 503);
    const text = await response.text();
    assert.ok(!text.includes(secret));
    assert.ok(!text.includes('private_password'));
    const body = JSON.parse(text);
    assert.equal(body.purchases, undefined);
    assert.match(body.error.code, /^(DATABASE_NOT_CONFIGURED|DEMO_CATALOG_UNAVAILABLE)$/);
  }
});
