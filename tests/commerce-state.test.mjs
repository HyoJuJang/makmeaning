import assert from 'node:assert/strict';
import test from 'node:test';
import { commerceBaseKey, emptyCommerceState, normalizeCommerceState, restoreCommerceState, verifiedCommerceState } from '../src/lib/commerce-state.ts';
import { personalStateKey } from '../app/demo-state.js';

const product = (id, extra = {}) => ({ id, prd_id: id, catalogSource: 'shared-products', price: 12000, ...extra });

test('all four carts start empty and have separate persona/category storage keys', () => {
  const keys = new Set();
  for (const category of ['fashion', 'living', 'food', 'beauty']) {
    assert.deepEqual(restoreCommerceState(null, null), emptyCommerceState());
    for (const persona of ['demo-f01', 'demo-f02', 'demo-m01', 'demo-m02']) keys.add(personalStateKey(commerceBaseKey(category), persona));
  }
  assert.equal(keys.size, 16);
});

test('legacy scene aliases disappear while exact numeric product IDs survive for server validation', () => {
  assert.deepEqual(restoreCommerceState(null, JSON.stringify({ cartIds: ['fashion-loafers', 'living-sofa', '1234', '1234'], savedIds: ['loafers', '5678'] })), {
    version: 2, cart: [{ productId: '1234', quantity: 2 }], savedProductIds: ['5678'],
  });
});

test('legacy catalog and food migration preserve real quantities and never import fictional aliases', () => {
  const legacy = { version: 1, cart: [{ productId: '1234', quantity: 4 }, { productId: 'food-pasta', quantity: 9 }], savedProductIds: ['5678', 'beauty-serum'] };
  assert.deepEqual(restoreCommerceState(null, legacy), { version: 2, cart: [{ productId: '1234', quantity: 4 }], savedProductIds: ['5678'] });
  assert.deepEqual(restoreCommerceState(null, null, { contexts: { home: legacy, cart: { cart: [{ productId: '7777', quantity: 8 }] } } }), normalizeCommerceState(legacy));
  assert.deepEqual(restoreCommerceState(emptyCommerceState(), legacy), emptyCommerceState(), 'an explicitly emptied v2 cart must not revive a legacy cart');
});

test('storage accepts bounded exact IDs and integer quantities only, never product snapshots', () => {
  const result = normalizeCommerceState({ cart: [
    { productId: '00123', quantity: 3, price: 1, name: 'untrusted' },
    { productId: '00123', quantity: 150 },
    { productId: 987, quantity: 1 }, { productId: ' 123', quantity: 1 },
    { productId: '9'.repeat(65), quantity: 1 }, { productId: '123', quantity: 1.2 }, { productId: '456', quantity: -1 },
  ], savedIds: ['123', '123', 'fake', '9'.repeat(65)] });
  assert.deepEqual(result, { version: 2, cart: [{ productId: '00123', quantity: 99 }], savedProductIds: ['123'] });
  assert.deepEqual(normalizeCommerceState('{broken'), emptyCommerceState());
});

test('canonical lookup omits unknown, mismatched and fictional products without changing quantities', () => {
  const state = normalizeCommerceState({ cart: [{ productId: '123', quantity: 3 }, { productId: '456', quantity: 2 }, { productId: '789', quantity: 1 }], savedProductIds: ['123', '456', '789', '999'] });
  assert.deepEqual(verifiedCommerceState(state, [product('123'), product('456', { prd_id: '999' }), product('789', { catalogSource: 'fictional-example' })]), { version: 2, cart: [{ productId: '123', quantity: 3 }], savedProductIds: ['123'] });
});
