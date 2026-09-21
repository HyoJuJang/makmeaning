import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../app/api/demo/food/route.ts';
import { demoFood } from '../src/data/demo-food.ts';
import { demoHome } from '../src/data/demo-home.ts';
import {
  addToCart, buildIngredientRows, cartTotal, normalizeCart,
  recommendRecipes, recommendationReason,
} from '../src/lib/food.ts';

const additions = rows => rows.filter(row => row.selected)
  .map(row => ({ productId: row.product.id, quantity: row.additionalQuantity }));

test('food API preserves the home identity and purchases without treating quantities as possession', async () => {
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
    assert.equal(record.purchasedAt, purchase.purchasedAt);
    assert.equal('quantity' in record, false);
    assert.equal('owned' in record, false);
  }
  const pastaScenario = data.profiles.find(profile => profile.id === 'purchased');
  assert.match(pastaScenario.label, /체험/);
  assert.deepEqual(pastaScenario.purchases.map(purchase => purchase.productId), ['pasta']);
  data.products[0].price = 0;
  assert.notEqual((await GET().json()).products[0].price, 0);
});

test('every recipe ingredient has a usable pack, exact amount, and a valid catalog reference', () => {
  assert.equal(new Set(demoFood.products.map(product => product.id)).size, demoFood.products.length);
  assert.equal(new Set(demoFood.recipes.map(recipe => recipe.id)).size, demoFood.recipes.length);
  for (const recipe of demoFood.recipes) {
    assert.ok(recipe.minutes > 0 && recipe.steps.length > 0);
    assert.equal(new Set(recipe.ingredients.map(ingredient => ingredient.productId)).size, recipe.ingredients.length);
    for (const ingredient of recipe.ingredients) {
      const product = demoFood.products.find(item => item.id === ingredient.productId);
      assert.ok(product);
      assert.ok(product.packSize > 0 && Number.isSafeInteger(product.price) && product.price > 0);
      assert.ok(ingredient.amountPerServing > 0);
    }
  }
});

test('recommendations follow explicit ingredient and intent, then cart, saved, and purchase signals', () => {
  const recommend = (profile, cart = [], selected = null, intent = 'all', saved = []) =>
    recommendRecipes(demoFood, profile, cart, selected, intent, saved);
  assert.equal(recommend('new')[0].id, 'tomato-pasta');
  assert.equal(recommend('home')[0].id, 'creamy-pasta');
  assert.equal(recommend('purchased')[0].id, 'tomato-pasta');
  assert.equal(recommend('home', [{ productId: 'tomato', quantity: 1 }])[0].id, 'tomato-pasta');
  assert.equal(recommend('new', [], null, 'all', ['mushroom-rice'])[0].id, 'mushroom-rice');
  assert.deepEqual(recommend('new', [], 'milk').map(recipe => recipe.id), ['creamy-pasta']);
  assert.deepEqual(recommend('new', [], 'milk', 'quick'), []);
  assert.deepEqual(recommend('home', [], 'vitamin'), []);
  assert.deepEqual(recommend('home', [], 'water'), []);
  assert.deepEqual(recommend('new', [], 'unknown'), []);
  assert.ok(recommend('new', [], null, 'quick').every(recipe => recipe.minutes <= 20));
});

test('recommendation reasons reflect actual source data without asserting possession', () => {
  const recipe = demoFood.recipes.find(item => item.id === 'creamy-pasta');
  assert.match(recommendationReason(demoFood, recipe, 'home', [], null, 'all', []), /우유 구매 기록/);
  assert.match(recommendationReason(demoFood, recipe, 'home', [], null, 'all', []), /보유 여부는 확인/);
  assert.match(recommendationReason(demoFood, recipe, 'new', [{ productId: 'milk', quantity: 1 }], null, 'all', []), /장바구니의 우유/);
  assert.match(recommendationReason(demoFood, recipe, 'home', [], 'milk', 'all', []), /우유로/);
});

test('first visit can choose a meal without history; optional oil is not added by default', () => {
  const rows = buildIngredientRows(demoFood, 'tomato-pasta', 1, [], []);
  assert.deepEqual(additions(rows), [
    { productId: 'pasta', quantity: 1 },
    { productId: 'tomato', quantity: 1 },
    { productId: 'mushroom', quantity: 1 },
  ]);
  assert.equal(cartTotal(demoFood, additions(rows)), 11200);
  assert.equal(rows.find(row => row.product.id === 'olive-oil').selected, false);
  const optedIn = buildIngredientRows(demoFood, 'tomato-pasta', 1, [], [], []);
  assert.equal(cartTotal(demoFood, additions(optedIn)), 20100);
});

test('current possession is explicit for any product and independent from historical purchases', () => {
  const homeRows = buildIngredientRows(demoFood, 'creamy-pasta', 1, [], []);
  const milk = homeRows.find(row => row.product.id === 'milk');
  assert.equal(milk.owned, false);
  assert.equal(milk.selected, true);
  const owned = buildIngredientRows(demoFood, 'tomato-pasta', 1, ['pasta', 'olive-oil'], [], []);
  assert.equal(owned.find(row => row.product.id === 'pasta').additionalQuantity, 0);
  assert.equal(owned.find(row => row.product.id === 'olive-oil').additionalQuantity, 0);
  assert.equal(cartTotal(demoFood, additions(owned)), 7400);
  const excluded = buildIngredientRows(demoFood, 'tomato-pasta', 1, [], [], ['pasta', 'olive-oil']);
  assert.equal(excluded.find(row => row.product.id === 'pasta').owned, false);
  assert.equal(excluded.find(row => row.product.id === 'pasta').selected, false);
  assert.equal(excluded.find(row => row.product.id === 'pasta').additionalQuantity, 1);
});

test('four exact portions calculate required amounts and only the packs missing from the cart', () => {
  const existing = [
    { productId: 'pasta', quantity: 1 },
    { productId: 'tomato', quantity: 1 },
    { productId: 'mushroom', quantity: 1 },
  ];
  const rows = buildIngredientRows(demoFood, 'tomato-pasta', 4, [], existing);
  assert.deepEqual(rows.slice(0, 3).map(row => [row.requiredAmount, row.requiredPacks, row.inCart, row.additionalQuantity]), [
    [400, 1, 1, 0], [600, 2, 1, 1], [320, 2, 1, 1],
  ]);
  assert.equal(cartTotal(demoFood, additions(rows)), 7400);
  const cart = addToCart(existing, additions(rows));
  assert.deepEqual(cart, [
    { productId: 'pasta', quantity: 1 },
    { productId: 'tomato', quantity: 2 },
    { productId: 'mushroom', quantity: 2 },
  ]);
  assert.equal(cartTotal(demoFood, cart), 18600);
  const reopened = buildIngredientRows(demoFood, 'tomato-pasta', 4, [], cart, undefined, { tomato: 1 });
  assert.deepEqual(additions(reopened), []);
  assert.equal(existing[1].quantity, 1, 'cart helper must not mutate the original state');
});

test('cart sufficiency, owning everything, and deselecting everything remain different states', () => {
  const ingredientIds = demoFood.recipes[0].ingredients.map(item => item.productId);
  const owned = buildIngredientRows(demoFood, 'tomato-pasta', 1, ingredientIds, []);
  const deselected = buildIngredientRows(demoFood, 'tomato-pasta', 1, [], [], ingredientIds);
  const covered = buildIngredientRows(demoFood, 'tomato-pasta', 1, [], ingredientIds.map(productId => ({ productId, quantity: 1 })));
  for (const rows of [owned, deselected, covered]) assert.deepEqual(additions(rows), []);
  assert.ok(owned.every(row => row.owned));
  assert.ok(deselected.every(row => !row.owned && row.additionalQuantity > 0));
  assert.ok(covered.every(row => !row.owned && row.inCart > 0));
});

test('quantity overrides are additional packs and bounded; unavailable products cannot be selected', () => {
  const rows = buildIngredientRows(demoFood, 'tomato-pasta', 4, [], [{ productId: 'tomato', quantity: 1 }], undefined,
    { tomato: 4, pasta: 1000, mushroom: -1 });
  assert.equal(rows.find(row => row.product.id === 'tomato').additionalQuantity, 4);
  assert.equal(rows.find(row => row.product.id === 'pasta').additionalQuantity, 99);
  assert.equal(rows.find(row => row.product.id === 'mushroom').additionalQuantity, 2);
  const unavailable = structuredClone(demoFood);
  unavailable.products.find(product => product.id === 'tomato').available = false;
  const row = buildIngredientRows(unavailable, 'tomato-pasta', 1, [], []).find(item => item.product.id === 'tomato');
  assert.equal(row.selected, false);
  assert.equal(row.additionalQuantity, 0);
});

test('corrupt or stale stored carts cannot introduce unknown products, fractional counts or unbounded totals', () => {
  for (const value of [null, undefined, 'not json', 12, {}]) assert.deepEqual(normalizeCart(demoFood, value), []);
  const cart = normalizeCart(demoFood, [
    null, true, {},
    { productId: 'pasta', quantity: 2 },
    { productId: 'pasta', quantity: 3 },
    { productId: 'tomato', quantity: 999 },
    { productId: 'unknown', quantity: 1 },
    { productId: 'milk', quantity: -1 },
    { productId: 'water', quantity: 1.5 },
    { productId: 'vitamin', quantity: '2' },
    { productId: 'egg', quantity: Infinity },
    { productId: 'rice', quantity: NaN },
  ]);
  assert.deepEqual(cart, [{ productId: 'pasta', quantity: 5 }, { productId: 'tomato', quantity: 99 }]);
  assert.equal(cartTotal(demoFood, cart), 464500);
  assert.deepEqual(addToCart([{ productId: 'tomato', quantity: 98 }], [{ productId: 'tomato', quantity: 4 }]), [
    { productId: 'tomato', quantity: 99 },
  ]);
});

test('invalid servings and missing recipes have predictable bounded results', () => {
  assert.deepEqual(buildIngredientRows(demoFood, 'unknown', 1, [], []), []);
  for (const servings of [NaN, Infinity, -1, 0]) {
    assert.equal(buildIngredientRows(demoFood, 'tomato-pasta', servings, [], [])[0].requiredAmount, 100);
  }
  assert.equal(buildIngredientRows(demoFood, 'tomato-pasta', 200, [], [])[0].requiredAmount, 400);
});
