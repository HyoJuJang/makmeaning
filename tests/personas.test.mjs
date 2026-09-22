import assert from 'node:assert/strict';
import test from 'node:test';
import source from '../data/demo-persona-purchases.json' with { type: 'json' };
import { demoPersonaIdFromRequest, findDemoPersona, getDemoPersona, getDemoPersonaSummaries } from '../src/data/demo-personas.ts';
import { demoHomeResponse, resolveDemoHome } from '../src/lib/demo-home.ts';
import { demoCatalogResponse } from '../src/lib/demo-catalog.ts';
import { getCategoryProducts, getHeroProducts, getRoomMirrorProducts } from '../app/category-products.js';

// A read-only catalog with deliberately different names from the JSON proves metadata is still a DB join.
const catalog = new Map(source.personas.flatMap(persona => persona.purchases).map((item, index) => [item.productId, {
  prd_id: item.productId, view_name: `DB 상품: ${item.productName}`, discprice: 10000 + index,
  domain: item.category, cate1_nm: `대분류-${item.category}`, cate2_nm: `중분류-${item.productId}`,
  cate3_nm: `소분류-${item.productId}`, cate4_nm: null, brand_name: `브랜드-${item.productId}`,
  opt1: null, opt2: null, opt3: null, opt4: null,
}]));
const repository = { async find(id) { return catalog.get(id) ?? null; } };
const request = cookie => new Request('http://localhost/api/demo/home', cookie ? { headers: { Cookie: cookie } } : {});

test('all four personas preserve the exact selected purchase IDs and event IDs without inferring avatar IDs', async () => {
  assert.equal(source.personas.length, 4);
  assert.deepEqual(getDemoPersonaSummaries(), source.personas.map(persona => ({
    id: persona.id, name: persona.name, avatarId: persona.avatarLabel.toLowerCase(), theme: persona.theme,
  })));
  for (const persona of source.personas) {
    const home = await resolveDemoHome(repository, persona.id);
    assert.deepEqual(home.user, { id: persona.id, name: persona.name, avatarId: persona.avatarLabel.toLowerCase() });
    assert.equal(home.purchases.length, 10);
    assert.deepEqual(home.purchases, Object.values(home.categories).flatMap(collection => collection.ownedProducts));
    for (const [category, collection] of Object.entries(home.categories)) {
      assert.equal(collection.category, category);
      assert.deepEqual(collection.user, home.user);
      assert.deepEqual(collection.ownedProducts.map(item => item.id), persona.purchases.filter(item => item.category === category).map(item => item.productId));
      assert.deepEqual(collection.ownedProducts.map(item => item.displayOrder), collection.ownedProducts.map((_, index) => index + 1));
      assert.ok(collection.ownedProducts.every(item => item.presentationRole && item.imageKind === 'product-photo'));
      assert.equal(getCategoryProducts(collection).length, collection.ownedProducts.length);
      assert.deepEqual(getRoomMirrorProducts(collection), getHeroProducts(collection));
    }
    assert.deepEqual(home.purchases.map(purchase => [purchase.id, purchase.purchaseId, purchase.category]),
      persona.purchases.map(purchase => [purchase.productId, purchase.purchaseId, purchase.category]));
    assert.equal(new Set(home.purchases.map(purchase => purchase.roomSlot)).size, 10);
    assert.equal(home.purchases.filter(purchase => purchase.state.wearing).length, 0);
    for (const purchase of home.purchases) {
      const product = catalog.get(purchase.id);
      assert.equal(purchase.name, product.view_name);
      assert.equal(purchase.price, product.discprice);
      assert.equal(purchase.catalogMetadata.cate3_nm, product.cate3_nm);
      assert.equal(purchase.catalogMetadata.brd_mn, product.brand_name);
      assert.equal(purchase.imageKind, 'product-photo');
      assert.equal(purchase.imageUrl, `https://asset.m-gs.kr/prod/${purchase.id}/1/550`);
    }
    const lamp = home.purchases.find(purchase => purchase.roomSlot === 'lamp-1');
    const sourceLamp = persona.purchases.find(purchase => purchase.productId === lamp.id);
    assert.match(sourceLamp.assetId, /^(?:table_lamp|floor_lamp)/);
    assert.equal(lamp.state.on, true);
  }
});

test('all home and category endpoints honor the same allowlisted persona cookie', async () => {
  for (const persona of source.personas) {
    const req = request(`other=value; gscene-persona=${encodeURIComponent(persona.id)}; trailing=value`);
    const homeResponse = await demoHomeResponse(() => repository, req);
    assert.equal(homeResponse.status, 200);
    const home = await homeResponse.json();
    for (const category of ['food', 'beauty']) {
      const response = await demoCatalogResponse(category, () => repository, req);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const data = await response.json();
      assert.deepEqual(data.user, home.user);
      assert.deepEqual(data.home, home);
      assert.deepEqual(data.collection, home.categories[category]);
      assert.deepEqual(data.purchases.map(purchase => purchase.productId),
        persona.purchases.filter(purchase => purchase.category === category).map(purchase => purchase.productId));
      for (const purchase of data.purchases) {
        const item = data.products.find(item => item.id === purchase.productId);
        const product = catalog.get(item.id);
        assert.equal(item.shortName, product.view_name, 'No milk/water/cream alias becomes a product label');
        assert.equal(item.cate2_nm, product.cate2_nm);
        assert.equal(item.cate3_nm, product.cate3_nm);
        assert.equal(item.imageKind, 'product-photo');
      }
    }
  }
});

test('unknown, absent and malformed persona selections default safely without querying arbitrary identities', async () => {
  for (const cookie of [undefined, 'gscene-persona=unknown', 'gscene-persona=%E0%A4%A', 'other-gscene-persona=demo-m02']) {
    assert.equal(demoPersonaIdFromRequest(request(cookie)), 'demo-f01');
    const seen = [];
    const response = await demoHomeResponse(() => ({ async find(id) { seen.push(id); return catalog.get(id); } }), request(cookie));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).user.id, 'demo-f01');
    assert.deepEqual(seen, source.personas.find(persona => persona.id === 'demo-f01').purchases.map(item => item.productId));
  }
  assert.equal((await resolveDemoHome(repository, 'not-a-persona')).user.id, 'demo-f01');
  assert.equal(findDemoPersona('not-a-persona'), undefined);
  assert.equal(findDemoPersona('demo-m02').avatarId, 'm02');
});

test('response and seed edits never mutate the selected JSON or another persona', async () => {
  const before = JSON.stringify(source);
  const first = getDemoPersona('demo-m02');
  first.name = 'edited';
  first.purchases[0].id = 'edited';
  first.purchases.find(purchase => purchase.category === 'food').state.quantity = 0;
  const home = await resolveDemoHome(repository, 'demo-m02');
  home.personas[0].name = 'edited';
  home.purchases[0].name = 'edited';
  home.purchases[0].catalogMetadata.cate3_nm = 'edited';
  const next = await resolveDemoHome(repository, 'demo-m02');
  assert.equal(next.user.name, '준호');
  assert.equal(next.personas[0].name, '민서');
  assert.equal(next.purchases[0].name, catalog.get(next.purchases[0].id).view_name);
  assert.equal(next.purchases[0].catalogMetadata.cate3_nm, catalog.get(next.purchases[0].id).cate3_nm);
  assert.equal(next.purchases.find(purchase => purchase.category === 'food').state.quantity, 3);
  assert.equal(JSON.stringify(source), before);
});

test('a selected persona with missing or recategorized products fails consistently across APIs', async () => {
  const persona = source.personas.find(persona => persona.id === 'demo-m01');
  for (const invalid of [null, { ...catalog.get(persona.purchases[0].productId), domain: 'food' }]) {
    const factory = () => ({ async find(id) { return id === persona.purchases[0].productId ? invalid : catalog.get(id); } });
    const req = request(`gscene-persona=${persona.id}`);
    const responses = await Promise.all([demoHomeResponse(factory, req), demoCatalogResponse('beauty', factory, req)]);
    for (const response of responses) {
      assert.equal(response.status, 503);
      assert.equal((await response.json()).error.code, 'DEMO_CATALOG_MISMATCH');
    }
  }
});
