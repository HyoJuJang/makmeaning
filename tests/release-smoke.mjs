import assert from 'node:assert/strict';

const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const home = await fetch(base);
assert.equal(home.status, 200, 'Homepage must load');
const html = await home.text();
assert.match(html, /G:Scene/);
assert.match(html, /\/prototype\/app.js/);
const response = await fetch(`${base}/api/demo/home`);
assert.equal(response.status, 200, 'Demo API must load');
assert.match(response.headers.get('content-type'), /application\/json/);
const data = await response.json();
assert.equal(typeof data.user.name, 'string');
assert.equal(new Set(data.purchases.map(p => p.id)).size, data.purchases.length);
for (const category of ['fashion', 'food', 'living', 'beauty']) {
  const items = data.purchases.filter(p => p.category === category);
  assert.ok(items.length >= 2 && items.length <= 6, `${category} needs 2–6 purchases`);
  for (const p of items) {
    assert.ok(p.roomSlot, `${p.id} has a visual room slot`);
    assert.ok(Number.isFinite(p.price) && p.price >= 0, `${p.id} has a demo price`);
    const asset = await fetch(new URL(p.imageUrl, base));
    assert.equal(asset.status, 200, `${p.id} artwork must load`);
    assert.match(asset.headers.get('content-type'), /image\//);
  }
}
for (const file of ['app.js', 'avatar.js', 'interactions.js', 'movement.js', 'object-art.js', 'scene-entry.js']) {
  assert.equal((await fetch(`${base}/prototype/${file}`)).status, 200, `${file} must load`);
}
assert.equal((await fetch(`${base}/assets/gather-room.png`)).status, 200);
console.log(`Release smoke PASS: homepage, API, ${data.purchases.length} purchase assets, room and interaction modules (${base})`);

const foodPage = await fetch(`${base}/food`);
assert.equal(foodPage.status, 200, 'Food page must load');
assert.match(foodPage.headers.get('content-type'), /text\/html/);
const foodHtml = await foodPage.text();
assert.match(foodHtml, /내 주방/);
assert.match(foodHtml, /오늘의 한 끼를 준비하고 있어요/, 'Food page renders its initial loading shell');
assert.match(foodHtml, /role="status"/, 'Food loading status is accessible');

const foodResponse = await fetch(`${base}/api/demo/food`);
assert.equal(foodResponse.status, 200, 'Food API must load');
assert.match(foodResponse.headers.get('content-type'), /application\/json/);
assert.equal(foodResponse.headers.get('cache-control'), 'no-store', 'Food API must not cache customer demo state');
const food = await foodResponse.json();
assert.equal(food.user.id, data.user.id, 'Food and home use the same demo user');
assert.ok(food.products.length > 0 && food.recipes.length > 0, 'Food catalog and recipes must be available');
assert.deepEqual(
  food.profiles.find(profile => profile.id === 'home').purchases.map(purchase => purchase.productId),
  data.purchases.filter(purchase => purchase.category === 'food').map(purchase => purchase.id),
  'Food home profile must preserve the homepage purchase records',
);
const foodArtwork = new Set([...food.products, ...food.recipes].map(item => item.imageUrl));
for (const path of foodArtwork) {
  assert.match(path, /^\/.*\.svg$/, 'Demo food artwork is a local SVG');
  const asset = await fetch(new URL(path, base));
  assert.equal(asset.status, 200, `${path} food artwork must load`);
  assert.match(asset.headers.get('content-type'), /image\/svg\+xml/, `${path} must return SVG content`);
  assert.match(await asset.text(), /<svg\b/, `${path} must contain an SVG image`);
}
console.log(`Food release smoke PASS: page loading shell, API, ${foodArtwork.size} unique product and meal assets (${base})`);
