import assert from 'node:assert/strict';
import test from 'node:test';
import personaSource from '../data/demo-persona-purchases.json' with { type: 'json' };
import { demoHome } from '../src/data/demo-home.ts';
import { demoPurchaseSeeds } from '../src/data/demo-purchases.ts';
import { demoHomeResponse, resolveDemoHome, resolveCategoryCollections, projectDemoHome } from '../src/lib/demo-home.ts';
import { buildDemoCatalog } from '../src/data/demo-catalog.ts';
import { getCategoryProducts, getHeroProducts, getRoomMirrorProducts } from '../app/category-products.js';
import { ProductApiError } from '../src/lib/products/contracts.ts';

const selected = personaSource.personas.find(persona => persona.id === 'demo-f01');
const catalog = selected.purchases.map((item, index) => ({
  prd_id: item.productId, view_name: item.productName, discprice: 10000 + index * 100, domain: item.category,
  cate1_nm: null, cate2_nm: null, cate3_nm: null, cate4_nm: null,
  brand_name: null, opt1: null, opt2: null, opt3: null, opt4: null,
}));
const repository = (rows = catalog) => ({ async find(id) { return rows.find(item => item.prd_id === id) ?? null; } });
const GET = () => demoHomeResponse(() => repository());

test('home joins the default selected persona to real catalog IDs in all four room areas', async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const { user, purchases, demo, personas } = await response.json();
  assert.deepEqual(user, { id: 'demo-f01', name: '민서', avatarId: 'f01' });
  assert.equal(purchases.length, 10);
  assert.equal(personas.length, 4);
  for (const key of ['id', 'purchaseId', 'roomSlot']) {
    assert.equal(new Set(purchases.map(item => item[key])).size, purchases.length, key);
  }
  assert.equal(demo.isDemo, true);
  assert.equal(demo.ownership, 'fictional');
  assert.equal(demo.quantities, 'demo-remaining');
  assert.equal(demo.illustrations, 'not-product-appearance-or-fitting');
  assert.match(demo.notice, /실제 상품 외형이나 가상 피팅을 재현하지 않습니다/);

  const expectedSlots = {
    '1083830467': ['fashion', 'wardrobe-1'], '1124808739': ['fashion', 'wardrobe-2'], '1113830439': ['fashion', 'wardrobe-3'],
    '1113622242': ['food', 'fridge-1'], '1015281967': ['food', 'pantry-1'], '1134436378': ['food', 'pantry-2'],
    '1053232515': ['living', 'lamp-1'], '1057538146': ['living', 'table-1'],
    '16052422': ['beauty', 'vanity-1'], '1059856091': ['beauty', 'vanity-2'],
  };
  for (const purchase of purchases) {
    const item = catalog.find(row => row.prd_id === purchase.id);
    assert.ok(item, 'Every purchase uses an exact catalog ID');
    assert.equal(purchase.name, item.view_name);
    assert.equal(purchase.price, item.discprice);
    assert.equal(purchase.category, item.domain);
    assert.equal(purchase.purchaseId, selected.purchases.find(item => item.productId === purchase.id).purchaseId);
    assert.notEqual(purchase.id, purchase.illustrationKey);
    assert.deepEqual([purchase.category, purchase.roomSlot], expectedSlots[purchase.id]);
    assert.equal(purchase.imageUrl, `https://asset.m-gs.kr/prod/${purchase.id}/1/550`);
    assert.equal(purchase.catalogSource, 'shared-products');
    assert.equal(purchase.imageKind, 'product-photo');
    assert.equal(purchase.priceKind, 'catalog-reference');
    assert.match(purchase.purchasedAt, /^\d{4}\.\d{2}\.\d{2}$/);
    if (purchase.category === 'food') assert.equal(purchase.state.quantity, 3);
  }
  for (const category of ['fashion', 'food', 'living', 'beauty']) {
    assert.ok(purchases.filter(item => item.category === category).length >= 2);
  }
  assert.equal(purchases.filter(item => item.state.wearing).length, 0);
  assert.equal(purchases.filter(item => item.state.featured).length, 1);
  assert.equal(purchases.find(item => item.illustrationKey === 'lamp').state.on, true);
});

test('home is a compatibility projection of four authoritative category collections', async () => {
  const collections = await resolveCategoryCollections(repository());
  const home = projectDemoHome(collections);
  assert.deepEqual(Object.keys(home.categories), ['fashion', 'food', 'living', 'beauty']);
  assert.deepEqual(home.purchases, Object.values(collections).flatMap(collection => collection.ownedProducts));
  for (const [category, collection] of Object.entries(collections)) {
    assert.equal(collection.category, category);
    assert.deepEqual(collection.user, home.user);
    assert.ok(collection.ownedProducts.every(product => product.category === category));
    assert.ok(collection.ownedProducts.every(product => product.presentationRole && product.displayOrder > 0));
    assert.deepEqual(getRoomMirrorProducts(collection), getHeroProducts(collection));
  }
});

test('category source edits flow into hero, mirror and catalog without reading legacy room purchases', () => {
  const collections = structuredClone(demoHome.categories);
  const original = JSON.stringify(demoHome);
  const water = collections.food.ownedProducts.find(product => product.illustrationKey === 'water');
  water.name = 'category source edit'; water.imageUrl = '/products/source-water.svg'; water.price += 123;
  const home = projectDemoHome(collections);
  // A stale compatibility list must never re-create the category source.
  home.purchases = [];
  const catalog = buildDemoCatalog(collections.food, home);
  const product = catalog.products.find(product => product.id === water.id);
  const hero = getHeroProducts(collections.food).find(item => item.id === water.id);
  const mirror = getRoomMirrorProducts(collections.food).find(item => item.id === water.id);
  assert.equal(product.name, water.name); assert.equal(product.price, water.price);
  assert.equal(hero.product.name, water.name); assert.equal(hero.imageUrl, water.imageUrl);
  assert.deepEqual(mirror, hero);
  assert.equal(JSON.stringify(demoHome), original);
});

test('adding, removing and reordering owned source products changes all four category mirrors consistently', () => {
  for (const original of Object.values(demoHome.categories)) {
    const collection = structuredClone(original);
    const extra = { ...collection.ownedProducts[0], id: `extra-${collection.category}`, purchaseId: `event-${collection.category}`, displayOrder: 0, roomSlot: 'unmapped-99', state: {} };
    collection.ownedProducts.push(extra);
    const before = JSON.stringify(collection);
    const all = getCategoryProducts(collection, { outfitId: 'base' });
    assert.equal(all.length, original.ownedProducts.length + 1);
    assert.equal(all[0].productId, extra.id);
    const expected = getHeroProducts(collection, { outfitId: 'base' });
    assert.ok(expected.some(entry => entry.id === extra.id));
    assert.deepEqual(getRoomMirrorProducts(collection, { outfitId: 'base' }), expected);
    assert.equal(JSON.stringify(collection), before, 'Selectors never mutate category source');
    collection.ownedProducts.reverse();
    assert.deepEqual(getHeroProducts(collection, { outfitId: 'base' }), expected, 'Explicit category order survives API array reordering');
    collection.ownedProducts = collection.ownedProducts.filter(product => product.id !== extra.id);
    assert.ok(!getRoomMirrorProducts(collection).some(entry => entry.id === extra.id));
    assert.equal(getCategoryProducts(collection).length, original.ownedProducts.length);
  }
});

test('fashion hero has at most four owned garments, keeps the applied ID first, and retains all-owned inventory', () => {
  const collection = structuredClone(demoHome.categories.fashion);
  for (let i = 4; i <= 5; i++) collection.ownedProducts.push({ ...collection.ownedProducts[0], id: `extra-knit-${i}`, purchaseId: `event-${i}`, displayOrder: i, state: { wearing: false } });
  const confirmed = { outfitId: 'extra-knit-5' };
  const hero = getHeroProducts(collection, confirmed);
  assert.equal(getCategoryProducts(collection, confirmed).length, 5);
  assert.equal(hero.length, 4);
  assert.equal(hero[0].productId, confirmed.outfitId);
  assert.equal(hero[0].status, 'applied');
  assert.deepEqual(hero.map(item => item.displayIndex), [1, 2, 3, 4]);
  assert.deepEqual(getRoomMirrorProducts(collection, confirmed), hero);
});

test('roomSlot changes cannot change category identity, order, role, source or confirmed quantities', () => {
  const summary = entries => entries.map(({product, ...entry}) => entry);
  for (const original of Object.values(demoHome.categories)) {
    const changed = structuredClone(original);
    changed.ownedProducts.forEach(product => { product.roomSlot = 'legacy-slot-replaced'; });
    assert.deepEqual(summary(getHeroProducts(changed)), summary(getHeroProducts(original)));
    assert.deepEqual(summary(getRoomMirrorProducts(changed)), summary(getHeroProducts(original)));
  }
});

test('two foods sharing an illustration retain separate canonical quantities and consumed placeholders', () => {
  const collection = structuredClone(demoHome.categories.food);
  const first = collection.ownedProducts[0];
  const second = { ...first, id: 'second-milk', purchaseId: 'second-milk-event', displayOrder: 4, roomSlot: 'fridge-99' };
  collection.ownedProducts.push(second);
  const confirmed = { foodQuantity: { [first.id]: 2, [second.id]: 0 } };
  const hero = getHeroProducts(collection, confirmed);
  const milk = hero.find(entry => entry.id === first.id), empty = hero.find(entry => entry.id === second.id);
  assert.equal(milk.remaining, 2); assert.equal(milk.artVisible, true); assert.equal(milk.status, 'owned');
  assert.equal(empty.remaining, 0); assert.equal(empty.artVisible, false); assert.equal(empty.status, 'consumed');
  assert.equal(empty.illustrationKey, milk.illustrationKey);
  assert.equal(getCategoryProducts(collection, confirmed).length, 4);
  assert.deepEqual(getRoomMirrorProducts(collection, confirmed), hero);
});

test('saved, cart and temporary preview cannot create category ownership or overwrite confirmed mirror state', () => {
  const collection = structuredClone(demoHome.categories.fashion);
  const initial = getRoomMirrorProducts(collection);
  collection.cart = [{ ...collection.ownedProducts[0], id: 'cart-only' }];
  collection.saved = ['saved-only']; collection.preview = { productId: 'preview-only' };
  assert.deepEqual(getRoomMirrorProducts(collection), initial);
  collection.ownedProducts.push({ ...collection.ownedProducts[0], id: 'fictional-example', catalogSource: 'fictional-example' });
  assert.deepEqual(getCategoryProducts(collection).map(entry => entry.id), initial.map(entry => entry.id));
  const beauty = demoHome.categories.beauty, cream = beauty.ownedProducts[1];
  const selected = getRoomMirrorProducts(beauty, { featuredBeautyId: cream.id });
  assert.deepEqual(selected.filter(entry => entry.featured).map(entry => entry.productId), [cream.id]);
  assert.equal(getHeroProducts(demoHome.categories.living, { lampOn: false }).find(entry => entry.presentationRole === 'lamp').on, false);
  assert.deepEqual(getHeroProducts(collection, { userId: 'someone-else', outfitId: collection.ownedProducts[1].id }), initial);
});

test('G4: consumer product mutations cannot flow backward into category source, confirmed state or another render', () => {
  for (const category of Object.keys(demoHome.categories)) for (const select of [getCategoryProducts, getHeroProducts, getRoomMirrorProducts]) {
    const collection = structuredClone(demoHome.categories[category]);
    collection.ownedProducts[0].catalogDetails = { cate1_nm: 'source', cate2_nm: null, cate3_nm: 'source subtype', cate4_nm: null, brand_name: null };
    const confirmed = { userId: collection.user.id, outfitId: collection.ownedProducts[0].id, foodQuantity: Object.fromEntries(collection.ownedProducts.map(product => [product.id, 2])), featuredBeautyId: collection.ownedProducts[0].id, lampOn: false };
    const sourceBefore = structuredClone(collection), stateBefore = structuredClone(confirmed);
    const expected = select(collection, confirmed), consumer = select(collection, confirmed);
    assert.notEqual(consumer[0].product, collection.ownedProducts[0]);
    assert.notEqual(consumer[0].product.state, collection.ownedProducts[0].state);
    consumer[0].product.name = 'Room-only annotation';
    consumer[0].product.imageUrl = '/products/consumer-only.svg';
    consumer[0].product.state.quantity = 0;
    consumer[0].product.state.wearing = false;
    consumer[0].product.catalogDetails.cate3_nm = 'consumer-only subtype';
    consumer[0].remaining = 0; consumer[0].featured = false;
    consumer.reverse();
    assert.deepEqual(collection, sourceBefore, `${category}: source is not a writable view reference`);
    assert.deepEqual(confirmed, stateBefore, `${category}: views cannot write confirmed state`);
    assert.deepEqual(select(collection, confirmed), expected, `${category}: later views still read authoritative data`);
    assert.deepEqual(getRoomMirrorProducts(collection, confirmed), getHeroProducts(collection, confirmed));
  }
});

test('runtime catalog values are joined on every request rather than replaced by a fixture', async () => {
  const updated = catalog.map(item => ({ ...item, view_name: `현재 DB: ${item.view_name}`, discprice: item.discprice + 100 }));
  const seen = [];
  const home = await resolveDemoHome({ async find(id) {
    seen.push(id);
    return updated.find(item => item.prd_id === id);
  } });
  assert.deepEqual(seen, selected.purchases.map(item => item.productId));
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
  const beforeSeeds = JSON.stringify(personaSource);
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
  assert.equal(JSON.stringify(personaSource), beforeSeeds);
});

test('legacy category fixture remains deterministic for historical state and artwork regression tests', () => {
  assert.equal(demoHome.user.id, 'demo-user');
  assert.equal(demoHome.purchases.length, 10);
  assert.deepEqual(demoHome.purchases.map(item => item.id), demoPurchaseSeeds.map(item => item.id));
  assert.ok(demoHome.purchases.every(item => item.imageKind === 'illustration'));
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
