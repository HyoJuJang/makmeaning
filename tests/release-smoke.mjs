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
