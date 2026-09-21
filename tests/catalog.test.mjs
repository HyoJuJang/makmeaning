import assert from 'node:assert/strict';
import test from 'node:test';
import { demoCatalogResponse } from '../src/lib/demo-catalog.ts';
import { resolveDemoHome } from '../src/lib/demo-home.ts';
import { demoCatalogRows, demoCatalogs } from '../src/data/demo-catalog.ts';
import { demoHome } from '../src/data/demo-home.ts';
import { catalogRoomItems, catalogRoomPlacement } from '../src/lib/catalog-room.ts';
import { roomArtworkIsVisible, repeatedEatingPointer } from '../src/lib/catalog-eating-input.ts';
import {
  adaptCatalogProducts, addToCart, cartTotal, normalizeCart, restoreCatalogState,
} from '../src/lib/catalog.ts';

const sharedRows = demoHome.purchases.map(p => ({
  prd_id: p.id, view_name: p.name, discprice: p.price, domain: p.category,
  cate1_nm: null, cate2_nm: null, cate3_nm: null, cate4_nm: null,
  brand_name: null, opt1: null, opt2: null, opt3: null, opt4: null,
}));
const repository = () => ({ async find(id) { return sharedRows.find(p => p.prd_id === id) ?? null; } });
const getFood = () => demoCatalogResponse('food', repository);
const getBeauty = () => demoCatalogResponse('beauty', repository);
const productId = alias => demoHome.purchases.find(p => p.illustrationKey === alias)?.id ?? alias;

const sourceColumns = ['prd_id', 'view_name', 'price', 'cate1_nm', 'cate2_nm', 'cate3_nm', 'cate4_m', 'brd_mn', 'domain'].sort();
const removedFields = ['scenarios', 'recipes', 'intent', 'tags', 'steps', 'minutes', 'packSize', 'unit', 'optionLabel', 'available', 'amountPerServing', 'requiredAmount', 'requiredPacks', 'servings', 'owned'];

test('eating keeps a visible room stable and only reveals clipped artwork', () => {
  for (const bottom of [778, 502]) {
    const usable = { top: 0, bottom };
    assert.equal(roomArtworkIsVisible({ top: 104, bottom: 226 }, usable), true);
    assert.equal(roomArtworkIsVisible({ top: 0, bottom }, usable), true);
    assert.equal(roomArtworkIsVisible({ top: -1, bottom: 120 }, usable), false);
    assert.equal(roomArtworkIsVisible({ top: bottom - 120, bottom: bottom + 1 }, usable), false);
  }
  assert.equal(roomArtworkIsVisible({ top: 55, bottom: 175 }, { top: 60, bottom: 502 }), false);
});

test('eating reveal rejects a same-position follow-up click without blocking deliberate input', () => {
  const first = { clientX: 280, clientY: 460, timeStamp: 1000, detail: 1 };
  assert.equal(repeatedEatingPointer(first, { ...first, timeStamp: 1210, detail: 2 }), true);
  // Re-targeting another element may reset click detail to 1, including on touch.
  assert.equal(repeatedEatingPointer(first, { ...first, clientX: 284, timeStamp: 1200 }), true);
  assert.equal(repeatedEatingPointer(first, { ...first, clientX: 320, timeStamp: 1200 }), false);
  assert.equal(repeatedEatingPointer(first, { ...first, timeStamp: 1451 }), false);
  assert.equal(repeatedEatingPointer(first, { ...first, timeStamp: 999 }), false);
  assert.equal(repeatedEatingPointer(first, { ...first, timeStamp: 1200, detail: 0 }), false);
  assert.equal(repeatedEatingPointer({ ...first, detail: 0 }, first), false);
  assert.equal(repeatedEatingPointer(null, first), false);
});
const food = demoCatalogs.food;
const beauty = demoCatalogs.beauty;
const line = (id, quantity = 1) => ({ productId: productId(id), quantity });
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
    const response = await get();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const result = await response.json();
    assert.deepEqual(Object.keys(result).sort(), ['category', 'collection', 'home', 'initialCart', 'initialOutfitId', 'products', 'purchases', 'user']);
    assert.deepEqual(result.collection, result.home.categories[category]);
    assert.equal(result.category, category);
    assert.deepEqual(result.user, demoHome.user);
    assert.equal(result.initialOutfitId, demoHome.purchases.find(purchase => purchase.category === 'fashion' && purchase.state.wearing === true)?.illustrationKey);
    const purchases = demoHome.purchases.filter(purchase => purchase.category === category);
    assert.deepEqual(result.purchases, purchases.map(purchase => ({ productId: purchase.id, purchaseId: purchase.purchaseId, purchasedAt: purchase.purchasedAt })));
    assert.deepEqual(result.home, await resolveDemoHome(repository()));
    assert.deepEqual(result.initialCart, []);
    for (const purchase of purchases) {
      const product = result.products.find(product => product.id === purchase.id);
      assert.equal(product.name, purchase.name);
      assert.equal(product.price, purchase.price);
      assert.equal(product.imageUrl, purchase.imageUrl);
      assert.equal(product.prd_id, purchase.id);
      assert.equal(product.view_name, purchase.name);
      assert.equal(product.catalogSource, 'shared-products');
      assert.equal(product.illustrationKey, purchase.illustrationKey);
      assert.equal(product.imageKind, 'illustration');
      assert.equal(product.priceKind, 'catalog-reference');
    }
    assertNoRemovedFields(result);
    result.products[0].price = 0;
    assert.notEqual((await (await get()).json()).products[0].price, 0, 'response objects do not mutate the shared fixture');
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
  assert.deepEqual(result, { cart: [line('milk', 5)], savedProductIds: [productId('vitamin')] });
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
  assert.deepEqual(restoreCatalogState(food, stored), { cart: [line('milk')], savedProductIds: [productId('milk')] });
  assert.deepEqual(restoreCatalogState(beauty, stored), { cart: [line('serum', 2)], savedProductIds: [productId('cream')] });
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
  assert.equal(cartTotal(food, next), 578000);
  assert.equal(cartTotal(beauty, [line('milk'), line('serum', 2)]), 56000, 'totals stay scoped to the current category');
});


test('existing fictional examples remain explicitly distinct from owned shared products', () => {
  for (const catalog of [food, beauty]) {
    const owned = new Set(catalog.purchases.map(p => p.productId));
    for (const product of catalog.products) {
      assert.equal(product.catalogSource, owned.has(product.id) ? 'shared-products' : 'fictional-example');
      assert.equal(product.priceKind, owned.has(product.id) ? 'catalog-reference' : 'fictional-example');
      assert.equal(product.imageKind, 'illustration');
    }
  }
  assert.equal(food.products.filter(p => p.catalogSource === 'fictional-example').length, 6);
  assert.equal(beauty.products.filter(p => p.catalogSource === 'fictional-example').length, 2);
});

test('prior alias IDs migrate to the same canonical purchases without losing cart or saved choices', () => {
  const old = { version: 1, cart: [{ productId: 'milk', quantity: 2 }, line('milk', 1)], savedProductIds: ['water', productId('water')] };
  assert.deepEqual(restoreCatalogState(food, old), { cart: [line('milk', 3)], savedProductIds: [productId('water')] });
  assert.deepEqual(restoreCatalogState(beauty, { version: 1, cart: [{ productId: 'serum', quantity: 2 }], savedProductIds: ['cream'] }), {
    cart: [line('serum', 2)], savedProductIds: [productId('cream')],
  });
});

test('live category values reflect the same catalog join as home, not the fixture', async () => {
  const changed = sharedRows.map(p => ({ ...p, view_name: `갱신 ${p.view_name}`, discprice: p.discprice + 300 }));
  const changedRepo = () => ({ async find(id) { return changed.find(p => p.prd_id === id); } });
  const home = await resolveDemoHome(changedRepo());
  for (const category of ['food', 'beauty']) {
    const response = await demoCatalogResponse(category, changedRepo);
    assert.equal(response.status, 200);
    const catalog = await response.json();
    assert.deepEqual(catalog.home, home);
    for (const purchase of home.purchases.filter(p => p.category === category)) {
      const product = catalog.products.find(p => p.id === purchase.id);
      assert.equal(product.name, purchase.name);
      assert.equal(product.price, purchase.price);
    }
  }
});

test('category DB errors or missing purchased IDs return 503 without fixture fallback or secret leaks', async () => {
  for (const category of ['food', 'beauty']) {
    for (const getRepository of [() => ({ async find() { return null; } }), () => { throw new Error('private_password'); }]) {
      const response = await demoCatalogResponse(category, getRepository);
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const text = await response.text();
      assert.equal(text.includes('private_password'), false);
      assert.equal(JSON.parse(text).products, undefined);
    }
  }
});


test('hero placement follows category roles and display order even when API arrays reorder', () => {
  const before=JSON.stringify(food),items=catalogRoomItems(food,null);
  assert.equal(items.length,3);
  const byArt=Object.fromEntries(items.map(item=>[item.purchase.illustrationKey,item]));
  assert.equal(byArt.milk.placement.zone,'fridge');
  assert.equal(byArt.water.placement.zone,'fridge');
  assert.equal(byArt.vitamin.placement.zone,'pantry');
  assert.equal(byArt.milk.placement.approachX,byArt.water.placement.approachX);
  assert.notEqual(byArt.water.placement.approachX,byArt.vitamin.placement.approachX);
  const reordered=structuredClone(food);reordered.purchases.reverse();reordered.products.reverse();reordered.home.purchases.reverse();reordered.collection.ownedProducts.reverse();
  assert.deepEqual(catalogRoomItems(reordered,null),items);
  for(const item of items){assert.equal(item.product.id,item.purchase.id);assert.equal(item.product.imageUrl,item.purchase.imageUrl);assert.deepEqual(catalogRoomPlacement(item.entry,items.map(item=>item.entry)),item.placement);}
  assert.equal(JSON.stringify(food),before);
});

test('room objects use confirmed remaining/beauty state without inventing possessions', () => {
  const waterId=productId('water'),before=JSON.stringify(food);
  const depleted=catalogRoomItems(food,{foodQuantity:{[waterId]:0}});
  assert.equal(depleted.find(item=>item.purchase.id===waterId).visible,false);
  assert.equal(depleted.find(item=>item.purchase.illustrationKey==='milk').visible,true);
  assert.equal(depleted.length,3,'Empty goods retain an inspectable purchase marker');
  const beautyItems=catalogRoomItems(beauty,{featuredBeautyId:productId('cream')});
  assert.equal(beautyItems.length,2);assert.deepEqual(beautyItems.filter(item=>item.featured).map(item=>item.purchase.id),[productId('cream')]);
  const bogus=structuredClone(food);bogus.purchases.push({productId:food.products.find(item=>item.catalogSource==='fictional-example').id,purchaseId:'fake',purchasedAt:'never'});
  assert.equal(catalogRoomItems(bogus,null).length,3,'Fictional catalog examples cannot appear as owned room objects');
  assert.equal(catalogRoomPlacement(undefined),null);
  assert.equal(catalogRoomPlacement({category:'fashion',presentationRole:'wardrobe'}),null);
  assert.equal(JSON.stringify(food),before);
});


test('new category-owned goods receive hero artwork without a legacy Room slot', () => {
  const expanded=structuredClone(food);
  const base=expanded.collection.ownedProducts[0];
  const added={...base,id:'new-category-product',purchaseId:'new-category-purchase',roomSlot:'not-a-room-slot',presentationRole:'shelf',displayOrder:4};
  expanded.collection.ownedProducts.push(added);
  expanded.products.push({...expanded.products.find(item=>item.id===base.id),id:added.id,prd_id:added.id});
  const items=catalogRoomItems(expanded,null);
  const item=items.find(item=>item.entry.id===added.id);
  assert.ok(item,'Category-owned data is the source even before the Room projection contains the product');
  assert.equal(item.entry.imageUrl,added.imageUrl);
  assert.equal(item.placement.zone,'shelf');
  assert.equal(item.placement.number,item.entry.displayIndex);
  assert.notEqual(item.placement.art.x,items.find(other=>other.entry.illustrationKey==='vitamin').placement.art.x,'Items sharing a pantry surface cannot occupy the same coordinates');
  assert.ok(item.placement.art.x>=0&&item.placement.art.x+item.placement.art.width<=450);
  assert.ok(item.placement.art.y>=0&&item.placement.art.y+item.placement.art.height<=150);
});
