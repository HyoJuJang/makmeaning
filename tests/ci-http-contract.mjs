/**
 * Credential-free CI checks against a real production Next server.
 * Run the server and this script with DATABASE_URL='' POSTGRES_URL=''.
 * This verifies fail-closed HTTP behavior, not a successful live DB connection.
 * Successful joins remain covered by repository-injected unit tests and by
 * tests/release-contract.mjs against the deployed, DB-connected release.
 */
import assert from 'node:assert/strict';
import { demoHome } from '../src/data/demo-home.ts';

assert.ok(!process.env.DATABASE_URL && !process.env.POSTGRES_URL, 'CI contract must run without database credentials');
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
async function request(path) {
  return fetch(new URL(path, base), { signal: AbortSignal.timeout(15000), cache: 'no-store' });
}
async function json(path, expectedStatus) {
  const response = await request(path);
  assert.equal(response.status, expectedStatus, `${path}: HTTP ${expectedStatus}`);
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  assert.match(response.headers.get('cache-control') || '', /no-store/);
  return response.json();
}

for (const path of ['/api/demo/home', '/api/demo/food', '/api/demo/beauty', '/api/products', '/api/products/1106041553']) {
  const body = await json(path, 503);
  assert.deepEqual(body, { error: {
    code: 'DATABASE_NOT_CONFIGURED',
    message: '상품 데이터베이스가 아직 연결되지 않았습니다.',
  } }, `${path}: no silently invented purchases or catalog fallback`);
}
assert.equal((await json('/api/products?domain=invalid', 400)).error.code, 'INVALID_QUERY');
console.log('PASS: five DB-backed endpoints fail closed with safe non-cacheable 503; query validation remains 400');

const assets = new Map();
const image = path => assets.set(path.split('#')[0], /image\//);
for (const category of ['fashion', 'living']) {
  const scene = await json(`/api/demo/scenes?category=${category}`, 200);
  assert.equal(scene.category, category);
  assert.ok(scene.products.length >= 6);
  const ids = new Set(scene.products.map(product => product.id));
  assert.equal(ids.size, scene.products.length);
  assert.ok(scene.cartIds.every(id => ids.has(id)));
  for (const product of scene.products) {
    assert.equal(product.brand, 'G:Scene sample');
    assert.equal(product.category, category);
    image(product.imageUrl);
  }
}
assert.deepEqual(await json('/api/demo/scenes?category=food', 400), { error: 'category must be fashion or living' });
console.log('PASS: both preserved fictional Scene APIs run without a DB; invalid category remains 400');

for (const path of ['/', '/fashion', '/food', '/living', '/beauty']) {
  const response = await request(path);
  assert.equal(response.status, 200, `${path}: production page loads without server crash`);
  assert.match(response.headers.get('content-type') || '', /text\/html/);
  const html = await response.text();
  assert.match(html, /G:Scene/);
  if (path === '/') {
    assert.match(html, /\/prototype\/app\.js/);
    for (const category of ['fashion', 'food', 'living', 'beauty']) assert.ok(html.includes(`data-room="${category}"`));
  }
}
for (const file of ['app.js', 'avatar.js', 'avatar-frames.js', 'vanity-frames.js', 'interactions.js', 'movement.js', 'object-art.js', 'scene-entry.js', 'category-routes.js', 'demo-state.js']) {
  assets.set(`/prototype/${file}`, /javascript/);
}
demoHome.purchases.forEach(p => image(p.imageUrl));
image('/assets/gather-room.png');
for (const id of ['m01', 'm02', 'f01', 'f02']) {
  image(`/assets/avatars/${id}-states.png`);
  image(`/assets/avatars/${id}-vanity-seated-back.png`);
}
for (const room of ['wardrobe-room.png', 'living-room.png']) image(`/scene-art/${room}`);
for (const category of ['food', 'beauty']) image(`/catalog-art/${category}-room.svg`);
for (const [path, type] of assets) {
  const response = await request(path);
  assert.equal(response.status, 200, `${path}: asset exists`);
  assert.match(response.headers.get('content-type') || '', type, `${path}: correct content type`);
  assert.ok((await response.arrayBuffer()).byteLength > 0, `${path}: nonempty asset`);
}
console.log(`PASS: five production page shells and ${assets.size} room/category/interaction assets`);
console.log('Credential-free CI HTTP contract PASS. This is not evidence of a successful live catalog connection.');
