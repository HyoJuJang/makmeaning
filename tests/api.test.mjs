import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../app/api/demo/home/route.ts';

test('home API returns one demo user and usable purchases in all four room areas', async () => {
  const response = GET();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const { user, purchases } = await response.json();
  assert.deepEqual(user, { id: 'demo-user', name: '민서', avatarId: 'short' });
  assert.equal(purchases.length, 9);
  assert.equal(new Set(purchases.map(item => item.id)).size, purchases.length);
  assert.equal(new Set(purchases.map(item => item.roomSlot)).size, purchases.length);

  const expectedSlots = {
    knit: ['fashion', 'wardrobe-1'], shirt: ['fashion', 'wardrobe-2'],
    milk: ['food', 'fridge-1'], water: ['food', 'fridge-2'], vitamin: ['food', 'pantry-1'],
    cushion: ['living', 'sofa-1'], lamp: ['living', 'lamp-1'],
    serum: ['beauty', 'vanity-1'], cream: ['beauty', 'vanity-2'],
  };

  for (const purchase of purchases) {
    assert.deepEqual([purchase.category, purchase.roomSlot], expectedSlots[purchase.id]);
    assert.ok(purchase.name.length > 0);
    assert.ok(Number.isSafeInteger(purchase.price) && purchase.price > 0);
    assert.equal(purchase.imageUrl, `/products/${purchase.id}.svg`);
    assert.equal(purchase.illustrationKey, purchase.id);
    assert.match(purchase.purchasedAt, /^\d{4}\.\d{2}\.\d{2}$/);
    assert.equal(typeof purchase.state, 'object');
    if (purchase.category === 'food') assert.equal(purchase.state.quantity, 3);
  }
  for (const category of ['fashion', 'food', 'living', 'beauty']) {
    assert.ok(purchases.filter(item => item.category === category).length >= 2);
  }
  assert.equal(purchases.filter(item => item.state.wearing).length, 1);
  assert.equal(purchases.filter(item => item.state.featured).length, 1);
  assert.equal(purchases.find(item => item.id === 'lamp').state.on, true);
});

test('one client cannot mutate the starting state returned to the next client', async () => {
  const first = await GET().json();
  first.user.name = 'changed';
  first.purchases.find(item => item.id === 'milk').state.quantity = 0;
  const second = await GET().json();
  assert.equal(second.user.name, '민서');
  assert.equal(second.purchases.find(item => item.id === 'milk').state.quantity, 3);
});
