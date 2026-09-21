import assert from 'node:assert/strict';
import test from 'node:test';
import {
  databaseUrl, mapProduct, parseProductFilters, safeNonnegativeInteger,
} from '../src/lib/products/contracts.ts';
import { findProduct, listProducts } from '../src/lib/products/handlers.ts';
import { productByIdQuery, productListQueries } from '../src/lib/products/queries.ts';

const row = {
  prd_id: '001000000060', view_name: '상품 이름',
  cate1_nm: '식품', cate2_nm: null, cate3_nm: null, cate4_nm: null,
  brand_name: null, discprice: '9900', domain: 'food',
  opt1: null, opt2: null, opt3: null, opt4: null,
};
const product = mapProduct(row);
const request = (query = '') => new Request(`https://example.test/api/products${query}`);
const unusedRepository = () => { throw new Error('Validation should run before database access'); };

test('products JSON preserves text codes, nullable options and safe KRW integers', () => {
  assert.equal(product.prd_id, '001000000060');
  assert.equal(product.discprice, 9900);
  assert.equal(product.opt4, null);
  assert.equal(Object.keys(product).length, 13);
  assert.equal(safeNonnegativeInteger('9007199254740991'), Number.MAX_SAFE_INTEGER);
  assert.equal(safeNonnegativeInteger(0n), 0);
  for (const value of ['9007199254740992', -1, 1.5, '', null, '9,900']) {
    assert.throws(() => mapProduct({ ...row, discprice: value }));
  }
  assert.throws(() => mapProduct({ ...row, domain: 'anything' }));
});

test('query parsing bounds work and rejects malformed or ambiguous values before connecting', async () => {
  assert.deepEqual(parseProductFilters(new URLSearchParams()), { limit: 50, offset: 0 });
  assert.deepEqual(parseProductFilters(new URLSearchParams('domain=food&q=%20주스%20&limit=100&offset=10000')), {
    domain: 'food', q: '주스', limit: 100, offset: 10000,
  });
  for (const query of [
    '?domain=toys', '?domain=', '?limit=0', '?limit=101', '?limit=1.5', '?limit=1e2',
    '?limit=', '?offset=-1', '?offset=10001', '?offset=9007199254740993',
    '?domain=food&domain=fashion', '?wrong=1', `?q=${'a'.repeat(101)}`, '?q=%00',
  ]) {
    const response = await listProducts(request(query), unusedRepository);
    assert.equal(response.status, 400, query);
    assert.equal((await response.json()).error.code, 'INVALID_QUERY', query);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

test('list response includes filters, stable pagination and uncached data', async () => {
  let received;
  const repository = () => ({
    async list(filters) {
      received = filters;
      return { products: [product], pagination: { limit: filters.limit, offset: filters.offset, total: 11 } };
    },
  });
  const response = await listProducts(request('?domain=food&limit=2&offset=4&q=주스'), repository);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(received, { domain: 'food', limit: 2, offset: 4, q: '주스' });
  assert.deepEqual(await response.json(), { products: [product], pagination: { limit: 2, offset: 4, total: 11 } });
});

test('SQL parameters keep IDs and search text out of executable statements', () => {
  const needle = "50%_sale\\' OR true --";
  const { page, count } = productListQueries({ domain: 'food', q: needle, limit: 5, offset: 20 });
  assert.ok(!page.text.includes(needle));
  assert.ok(!count.text.includes(needle));
  assert.match(page.text, /domain = \$1/);
  assert.match(page.text, /view_name ILIKE \$2 OR brand_name ILIKE \$2/);
  assert.match(page.text, /ORDER BY prd_id LIMIT \$3 OFFSET \$4$/);
  assert.deepEqual(page.values, ['food', "%50\\%\\_sale\\\\' OR true --%", 5, 20]);
  assert.deepEqual(count.values, page.values.slice(0, 2));
  const id = "' OR true --";
  const query = productByIdQuery(id);
  assert.ok(!query.text.includes(id));
  assert.deepEqual(query.values, [id]);
});

test('single product endpoint returns product, 404 or validation error', async () => {
  const found = await findProduct(product.prd_id, () => ({
    async find(id) { assert.equal(id, product.prd_id); return product; },
  }));
  assert.equal(found.status, 200);
  assert.deepEqual(await found.json(), { product });
  const missing = await findProduct('missing', () => ({ async find() { return null; } }));
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, 'PRODUCT_NOT_FOUND');
  for (const id of ['', ' ', 'a'.repeat(65), ' invalid', 'bad\u0000id']) {
    const response = await findProduct(id, unusedRepository);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'INVALID_PRODUCT_ID');
  }
});

test('unconfigured database fails clearly and unexpected driver details never leak', async () => {
  assert.equal(databaseUrl({ DATABASE_URL: ' postgres://example ', POSTGRES_URL: 'fallback' }), 'postgres://example');
  assert.equal(databaseUrl({ POSTGRES_URL: 'fallback' }), 'fallback');
  const missing = await listProducts(request(), () => { databaseUrl({}); });
  assert.equal(missing.status, 503);
  assert.equal((await missing.json()).error.code, 'DATABASE_NOT_CONFIGURED');
  const secret = 'postgres://private_user:private_password@internal.example/database';
  const broken = () => ({
    async list() { throw new Error(secret); },
    async find() { throw new Error(secret); },
  });
  for (const response of [await listProducts(request(), broken), await findProduct('123', broken)]) {
    assert.equal(response.status, 503);
    const text = await response.text();
    assert.ok(!text.includes(secret));
    assert.ok(!text.includes('private_password'));
    assert.equal(JSON.parse(text).error.code, 'DATABASE_UNAVAILABLE');
  }
});
