/**
 * Read-only release contract checks against a running app.
 * SMOKE_BASE_URL=https://makmeaning.vercel.app node tests/release-contract.mjs
 * node tests/release-contract.mjs --api-only --write-baseline work/release-catalog-baseline.json
 * node tests/release-contract.mjs --compare-catalog work/release-catalog-baseline.json
 * --catalog-only checks the complete shared catalog without requiring new release routes.
 * Baseline files contain counts/digests only, no credentials or product/customer records.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const base = new URL(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001');
const catalogBase = new URL(process.env.SMOKE_CATALOG_BASE_URL || base);
const args = process.argv.slice(2);
const options = { apiOnly: false, catalogOnly: false, writeBaseline: null, compareCatalog: null };
for (let i = 0; i < args.length; i++) {
  const flag = args[i];
  if (flag === '--api-only') options.apiOnly = true;
  else if (flag === '--catalog-only') options.catalogOnly = true;
  else if (flag === '--write-baseline' || flag === '--compare-catalog') {
    const path = args[++i];
    assert.ok(path && !path.startsWith('--'), `${flag} requires a file path`);
    options[flag === '--write-baseline' ? 'writeBaseline' : 'compareCatalog'] = resolve(path);
  } else throw new Error(`Unknown option: ${flag}`);
}
assert.ok(!(options.writeBaseline && options.compareCatalog), 'Writing and comparing a baseline are separate actions');
if (options.catalogOnly) assert.ok(options.writeBaseline || options.compareCatalog, '--catalog-only requires a baseline action');

async function get(path, origin = base) {
  const url = new URL(path, origin);
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), cache: 'no-store' });
  assert.equal(response.status, 200, `GET ${url.pathname}${url.search} must return 200`);
  return response;
}
async function json(path, origin = base) {
  const response = await get(path, origin);
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  assert.match(response.headers.get('cache-control') || '', /no-store/);
  return response.json();
}
async function eachBatch(items, fn, size = 4) {
  const results = [];
  for (let i = 0; i < items.length; i += size) results.push(...await Promise.all(items.slice(i, i + size).map(fn)));
  return results;
}

const assets = new Map();
const addImage = path => assets.set(path.split('#')[0], /image\//);

if (!options.catalogOnly) {
  const home = await json('/api/demo/home');
  assert.equal(home.user.id, 'demo-user');
  assert.equal(home.purchases.length, 9);
  assert.equal(home.demo.isDemo, true);
  assert.equal(home.demo.ownership, 'fictional');
  assert.equal(home.demo.illustrations, 'not-product-appearance-or-fitting');
  assert.equal(new Set(home.purchases.map(p => p.id)).size, 9);
  assert.equal(new Set(home.purchases.map(p => p.purchaseId)).size, 9);
  assert.equal(new Set(home.purchases.map(p => p.roomSlot)).size, 9);
  for (const category of ['fashion', 'food', 'living', 'beauty']) {
    assert.ok(home.purchases.filter(p => p.category === category).length >= 2, `${category}: multiple purchases`);
  }
  await eachBatch(home.purchases, async purchase => {
    const { product } = await json(`/api/products/${encodeURIComponent(purchase.id)}`);
    assert.equal(purchase.id, product.prd_id, 'Home product ID matches shared product identity');
    assert.equal(purchase.name, product.view_name, `${purchase.id}: catalog name`);
    assert.equal(purchase.price, product.discprice, `${purchase.id}: catalog price`);
    assert.equal(purchase.category, product.domain, `${purchase.id}: category`);
    assert.equal(purchase.catalogSource, 'shared-products');
    assert.equal(purchase.imageKind, 'illustration');
    assert.equal(purchase.priceKind, 'catalog-reference');
    assert.notEqual(purchase.id, purchase.illustrationKey, 'Artwork keys are not product IDs');
    assert.equal(purchase.imageUrl, `/products/${purchase.illustrationKey}.svg`);
    addImage(purchase.imageUrl);
  });
  console.log('PASS: home 9 purchases match shared product ID/name/price/domain; demo/artwork boundaries explicit');

  for (const category of ['food', 'beauty']) {
    const catalog = await json(`/api/demo/${category}`);
    assert.equal(catalog.category, category);
    assert.deepEqual(catalog.user, home.user);
    assert.deepEqual(catalog.home, home, `${category}: same complete home contract`);
    assert.equal(catalog.initialOutfitId, home.purchases.find(p => p.state.wearing)?.illustrationKey);
    const owned = home.purchases.filter(p => p.category === category);
    assert.deepEqual(catalog.purchases, owned.map(p => ({ productId: p.id, purchaseId: p.purchaseId, purchasedAt: p.purchasedAt })));
    for (const purchase of owned) {
      const product = catalog.products.find(p => p.id === purchase.id);
      assert.ok(product, `${category}: purchase ${purchase.id} appears`);
      assert.equal(product.prd_id, purchase.id);
      assert.equal(product.name, purchase.name);
      assert.equal(product.view_name, purchase.name);
      assert.equal(product.price, purchase.price);
      assert.equal(product.imageUrl, purchase.imageUrl);
      assert.equal(product.illustrationKey, purchase.illustrationKey);
      assert.equal(product.catalogSource, 'shared-products');
      assert.equal(product.priceKind, 'catalog-reference');
    }
    const examples = catalog.products.filter(p => p.catalogSource === 'fictional-example');
    assert.equal(examples.length, category === 'food' ? 6 : 2, 'Existing examples preserved without expanding the catalog');
    assert.ok(examples.every(p => p.priceKind === 'fictional-example' && !home.purchases.some(h => h.id === p.id)));
    assert.ok(catalog.products.every(p => p.imageKind === 'illustration'));
    catalog.products.forEach(p => addImage(p.imageUrl));
    addImage(`/catalog-art/${category}-room.svg`);
    console.log(`PASS: ${category} shares home/user/purchases and separates ${examples.length} fictional examples`);
  }

  for (const category of ['fashion', 'living']) {
    const scene = await json(`/api/demo/scenes?category=${category}`);
    assert.equal(scene.category, category);
    assert.ok(scene.products.length >= 6);
    const ids = new Set(scene.products.map(p => p.id));
    assert.equal(ids.size, scene.products.length);
    assert.ok(scene.cartIds.every(id => ids.has(id)));
    for (const product of scene.products) {
      assert.equal(product.brand, 'G:Scene sample');
      assert.equal(product.category, category);
      assert.ok(product.id.startsWith(`${category}-`));
      assert.ok(!home.purchases.some(p => p.id === product.id), 'Scene examples do not become owned real products');
      addImage(product.imageUrl);
    }
    console.log(`PASS: ${category} Scene preserves ${scene.products.length} fictional recommendations and valid cart references`);
  }

  if (!options.apiOnly) {
    for (const path of ['/', '/fashion', '/food', '/living', '/beauty']) {
      const response = await get(path);
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
    addImage('/assets/gather-room.png');
    for (const id of ['m01', 'm02', 'f01', 'f02']) {
      addImage(`/assets/avatars/${id}-states.png`);
      addImage(`/assets/avatars/${id}-vanity-seated-back.png`);
    }
    for (const room of ['wardrobe-room.png', 'living-room.png']) addImage(`/scene-art/${room}`);
    await eachBatch([...assets], async ([path, type]) => {
      const response = await get(path);
      assert.match(response.headers.get('content-type') || '', type, `${path}: expected asset type`);
      const body = await response.arrayBuffer();
      assert.ok(body.byteLength > 0, `${path}: nonempty asset`);
    });
    console.log(`PASS: room + all four category pages and ${assets.size} required artwork/interaction assets`);
  }
}

if (options.writeBaseline || options.compareCatalog) {
  const first = await json('/api/products?limit=100&offset=0', catalogBase);
  const total = first.pagination.total;
  assert.ok(Number.isInteger(total) && total > 0);
  const offsets = Array.from({ length: Math.ceil(total / 100) - 1 }, (_, i) => (i + 1) * 100);
  const pages = await eachBatch(offsets, async offset => {
    const page = await json(`/api/products?limit=100&offset=${offset}`, catalogBase);
    assert.equal(page.pagination.total, total, 'Catalog changed during the snapshot: retry a coherent read');
    assert.equal(page.pagination.offset, offset);
    return page.products;
  });
  const rows = [...first.products, ...pages.flat()];
  assert.equal(rows.length, total);
  assert.equal(new Set(rows.map(p => p.prd_id)).size, total, 'No duplicate/missing products across pagination');
  const columns = ['prd_id', 'view_name', 'cate1_nm', 'cate2_nm', 'cate3_nm', 'cate4_nm', 'brand_name', 'discprice', 'domain', 'opt1', 'opt2', 'opt3', 'opt4'];
  const normalized = rows.sort((a, b) => a.prd_id < b.prd_id ? -1 : a.prd_id > b.prd_id ? 1 : 0).map(row => {
    assert.deepEqual(Object.keys(row).sort(), [...columns].sort(), 'Digest includes the complete public product contract');
    return Object.fromEntries(columns.map(key => [key, row[key]]));
  });
  const byDomain = Object.fromEntries(['fashion', 'food', 'living', 'beauty'].map(domain => [domain, rows.filter(row => row.domain === domain).length]));
  assert.equal(Object.values(byDomain).reduce((a, b) => a + b, 0), total);
  const snapshot = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    sourceOrigin: catalogBase.origin,
    count: total,
    byDomain,
    algorithm: 'sha256-json-products-v1',
    columns,
    sha256: createHash('sha256').update(JSON.stringify(normalized)).digest('hex'),
  };
  if (options.writeBaseline) {
    await mkdir(dirname(options.writeBaseline), { recursive: true });
    // Do not silently replace an earlier baseline with the post-test state.
    await writeFile(options.writeBaseline, JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' });
    console.log(`PASS: read-only catalog baseline saved (${snapshot.count} products, sha256 ${snapshot.sha256}) to ${options.writeBaseline}`);
  } else {
    const before = JSON.parse(await readFile(options.compareCatalog, 'utf8'));
    assert.equal(snapshot.algorithm, before.algorithm);
    assert.equal(snapshot.count, before.count, 'Shared catalog row count changed');
    assert.deepEqual(snapshot.byDomain, before.byDomain, 'Shared catalog domain counts changed');
    assert.equal(snapshot.sha256, before.sha256, 'Shared catalog content changed: investigate external edits or unintended writes');
    console.log(`PASS: complete shared catalog unchanged (${snapshot.count} products, sha256 ${snapshot.sha256})`);
  }
}
console.log(`Release contract PASS (${base.origin}; ${options.catalogOnly ? 'catalog only' : options.apiOnly ? 'APIs only' : 'APIs/pages/assets'}). Browser interactions require separate QA.`);
