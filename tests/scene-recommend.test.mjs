import assert from 'node:assert/strict';
import test from 'node:test';
import { demoScenes } from '../src/data/demo-scenes.ts';
import { recommend } from '../src/lib/scene/recommend.ts';

const filters = overrides => ({
  situation: '출근', tastes: ['미니멀'], budget: 50000, kind: '전체', sort: 'recommended', ...overrides,
});
const sample = overrides => ({
  id: 'sample', category: 'fashion', name: '예시 상품', brand: 'G:Scene sample', price: 30000,
  imageUrl: '/scene-art/products.png#trousers', kind: '하의',
  situations: [], tastes: [], description: '차분한 색감의 예시 상품이에요.', pairsWith: [], reasons: {}, ...overrides,
});

test('price and kind are hard limits, including exact budget boundaries', () => {
  const products = demoScenes.fashion.products;
  const results = recommend(products, filters({ budget: 39000, kind: '하의' }), null);
  assert.deepEqual(results.map(({ product }) => product.id), ['fashion-trousers']);
  assert.ok(results.every(({ product }) => product.price <= 39000 && product.kind === '하의'));
  assert.equal(recommend(products, filters({ budget: 0 }), null).length, products.length);
});

test('empty results never substitute products over budget or from another kind', () => {
  assert.deepEqual(recommend(demoScenes.living.products, filters({ budget: 10000 }), null), []);
  assert.deepEqual(recommend(demoScenes.fashion.products, filters({ budget: 50000, kind: '조명' }), null), []);
});

test('the selected item is excluded while owned-item reasons come only from a declared pair', () => {
  const anchor = { id: 'knit', name: '내 크림 니트' };
  const products = [
    sample({ id: 'knit' }),
    sample({ id: 'paired', pairsWith: ['knit'], reasons: { knit: '크림 니트와 차콜 팬츠를 연결해요.' } }),
    sample({ id: 'unpaired', reasons: { knit: '쓰면 안 되는 이유' } }),
  ];
  const results = recommend(products, filters(), anchor);
  assert.deepEqual(results.map(({ product }) => product.id), ['paired', 'unpaired']);
  assert.equal(results[0].reason, '크림 니트와 차콜 팬츠를 연결해요.');
  assert.deepEqual(results[0].matches, ['선택 상품과 조합']);
  assert.notEqual(results[1].reason, '쓰면 안 되는 이유');
  assert.deepEqual(results[1].matches, []);
});

test('several actual taste matches improve rank and duplicate requested tastes do not inflate it', () => {
  const products = [
    sample({ id: 'one', tastes: ['미니멀'] }),
    sample({ id: 'two', tastes: ['미니멀', '단정한'] }),
    sample({ id: 'none', tastes: ['캐주얼'] }),
  ];
  const results = recommend(products, filters({ tastes: ['미니멀', '단정한', '미니멀'] }), null);
  assert.deepEqual(results.map(({ product }) => product.id), ['two', 'one', 'none']);
  assert.deepEqual(results[0].matches, ['미니멀', '단정한']);
  assert.deepEqual(results[1].matches, ['미니멀']);
  assert.deepEqual(results[2].matches, []);
  assert.ok(results[0].reason.includes('미니멀 · 단정한'));
  assert.ok(!results[1].reason.includes('단정한'));
});

test('situation and tastes rank preferences without removing other eligible products', () => {
  const products = [
    sample({ id: 'weekend', situations: ['주말'], tastes: ['캐주얼'] }),
    sample({ id: 'office', situations: ['출근'], tastes: ['미니멀'] }),
  ];
  const results = recommend(products, filters(), null);
  assert.equal(results.length, 2);
  assert.equal(results[0].product.id, 'office');
  assert.deepEqual(results[0].matches, ['출근', '미니멀']);
  assert.ok(results[0].reason.includes('출근'));
  assert.deepEqual(results[1].matches, []);
  assert.ok(!results[1].reason.includes('출근'));
  assert.ok(!results[1].reason.includes('미니멀'));
});

test('a cart anchor uses shared taste across kinds without claiming ownership', () => {
  const anchor = { id: 'cart-shoe', name: '브라운 로퍼', kind: '신발', tastes: ['단정한'] };
  const products = [
    sample({ id: 'cart-shoe', kind: '신발', tastes: ['단정한'] }),
    sample({ id: 'matching-trousers', kind: '하의', tastes: ['단정한'] }),
    sample({ id: 'other-shoe', kind: '신발', tastes: ['단정한'] }),
    sample({ id: 'casual-tee', kind: '상의', tastes: ['캐주얼'] }),
  ];
  const results = recommend(products, filters({ situation: '', tastes: [] }), anchor);
  assert.equal(results.length, 3);
  assert.equal(results[0].product.id, 'matching-trousers');
  assert.ok(results[0].reason.includes('브라운 로퍼') && results[0].reason.includes('단정한'));
  assert.doesNotMatch(results[0].reason, /구매|보유|소유|내 옷/);
  assert.deepEqual(results[0].matches, ['공통 취향 연결']);
  assert.ok(results.slice(1).every(result => !result.reason.includes('브라운 로퍼')));
  assert.ok(results.slice(1).every(result => result.matches.length === 0));
});

test('price sort ignores preference score and has deterministic ID ties', () => {
  const products = [
    sample({ id: 'b', price: 20000, situations: ['출근'] }),
    sample({ id: 'a', price: 20000 }),
    sample({ id: 'expensive', price: 40000, situations: ['출근'], tastes: ['미니멀'] }),
  ];
  const results = recommend(products, filters({ sort: 'price-low' }), null);
  assert.deepEqual(results.map(({ product }) => product.id), ['a', 'b', 'expensive']);
  const recommended = recommend(products, filters(), null);
  assert.deepEqual(recommended.map(({ product }) => product.id), ['expensive', 'b', 'a']);
  assert.deepEqual(recommend([...products].reverse(), filters(), null), recommended);
});

test('unmatched unlimited suggestions use the description without claiming a match, and inputs stay intact', () => {
  const products = [sample({ id: 'b' }), sample({ id: 'a' })];
  const settings = filters({ budget: 0 });
  const before = structuredClone({ products, settings });
  const results = recommend(products, settings, { id: 'unknown', name: '연결 정보 없는 물건' });
  assert.equal(results[0].reason, results[0].product.description);
  assert.deepEqual(results[0].matches, []);
  assert.deepEqual({ products, settings }, before);
  assert.deepEqual(results.map(({ product }) => product.id), ['a', 'b']);
});


test('no conditions and no selected product show the complete category without invented matches', () => {
  const unrestricted = filters({ situation: '', tastes: [], budget: 0, kind: '전체' });
  const blankTag = recommend([sample({ situations: [''] })], unrestricted, null)[0];
  assert.deepEqual(blankTag.matches, []);
  assert.equal(blankTag.reason, blankTag.product.description);
  for (const scene of Object.values(demoScenes)) {
    const results = recommend(scene.products, unrestricted, null);
    assert.equal(results.length, scene.products.length);
    assert.deepEqual(new Set(results.map(({ product }) => product.id)), new Set(scene.products.map(product => product.id)));
    assert.ok(results.some(({ product }) => product.price > 50000));
    for (const result of results) {
      assert.deepEqual(result.matches, []);
      assert.equal(result.reason, result.product.description);
    }
  }
});


test('owned canonical product IDs use their explicit illustration pairing without changing identity', () => {
  const anchor = { id: 'catalog-987654', name: '실상품 카탈로그 이름', illustrationKey: 'knit' };
  const products = [
    sample({ id: 'catalog-987654', pairsWith: ['knit'] }),
    sample({ id: 'paired-example', pairsWith: ['knit'], reasons: { knit: '선택한 공간 그림과 조합하는 예시예요.' } }),
    sample({ id: 'wrong-id-pair', pairsWith: ['catalog-987654'], reasons: { 'catalog-987654': '쓰면 안 되는 이유' } }),
  ];
  const before = structuredClone(anchor);
  const results = recommend(products, filters({ situation: '', tastes: [] }), anchor);
  assert.deepEqual(results.map(({ product }) => product.id), ['paired-example', 'wrong-id-pair']);
  assert.equal(results[0].reason, '선택한 공간 그림과 조합하는 예시예요.');
  assert.deepEqual(results[0].matches, ['선택 상품과 조합']);
  assert.notEqual(results[1].reason, '쓰면 안 되는 이유');
  assert.deepEqual(anchor, before);
});
