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
for (const category of ['fashion', 'living']) {
  assert.match(html, new RegExp(`data-room="${category}"`), 'The room needs an interactive category object');
  assert.equal((await fetch(`${base}/${category}`)).status, 200, `${category} page must load`);
  const sceneResponse = await fetch(`${base}/api/demo/scenes?category=${category}`);
  assert.equal(sceneResponse.status, 200);
  const scene = await sceneResponse.json();
  assert.equal(scene.category, category);
  for (const imageUrl of new Set(scene.products.map(product => product.imageUrl.split('#')[0]))) {
    const asset = await fetch(new URL(imageUrl, base));
    assert.equal(asset.status, 200, 'Scene product image must load');
    assert.match(asset.headers.get('content-type'), /image\//);
  }
}
for (const room of ['wardrobe-room.png', 'living-room.png']) {
  assert.equal((await fetch(`${base}/scene-art/${room}`)).status, 200);
}
console.log(`Release smoke PASS: homepage, API, ${data.purchases.length} purchase assets, room and interaction modules (${base})`);
console.log('Release smoke PASS: fashion/living pages, category entries, scene APIs and artwork');

for (const category of ['food', 'beauty']) {
  const page = await fetch(`${base}/${category}`);
  assert.equal(page.status, 200, `${category} page must load`);
  assert.match(page.headers.get('content-type'), /text\/html/);
  const pageHtml = await page.text();
  assert.match(pageHtml, /나의 공간을 준비하고 있어요/);
  assert.match(pageHtml, /role="status"/, 'Loading status is accessible');
  const response = await fetch(`${base}/api/demo/${category}`);
  assert.equal(response.status, 200, `${category} API must load`);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const catalog = await response.json();
  assert.equal(catalog.category, category);
  assert.equal(catalog.user.id, data.user.id);
  assert.equal(catalog.user.avatarId, data.user.avatarId);
  assert.ok(catalog.products.length > 0);
  for (const field of ['scenarios', 'recipes', 'profiles', 'intents']) {
    assert.equal(field in catalog, false, `Obsolete ${field} is absent`);
  }
  for (const product of catalog.products) {
    for (const field of ['prd_id', 'view_name', 'price', 'cate1_nm', 'cate2_nm', 'cate3_nm', 'cate4_m', 'brd_mn', 'domain']) {
      assert.ok(field in product, `${product.id} preserves ${field}`);
    }
    for (const field of ['packSize', 'unit', 'optionLabel', 'available', 'servings']) {
      assert.equal(field in product, false, `${product.id} must not require ${field}`);
    }
  }
  assert.deepEqual(catalog.purchases.map(p => p.productId), data.purchases.filter(p => p.category === category).map(p => p.id));
  const artwork = new Set([...catalog.products.map(p => p.imageUrl), `/catalog-art/${category}-room.svg`]);
  for (const path of artwork) {
    assert.match(path, /^\/.*\.svg$/);
    const asset = await fetch(new URL(path, base));
    assert.equal(asset.status, 200, `${path} artwork must load`);
    assert.match(asset.headers.get('content-type'), /image\/svg\+xml/);
    assert.match(await asset.text(), /<svg\b/);
  }
  console.log(`${category} release smoke PASS: page, catalog API, source columns, home purchases, ${artwork.size} artwork assets (${base})`);
}
