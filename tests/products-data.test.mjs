import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PRODUCT_COLUMNS, createImportQuery, createSeedQuery, normalizeProduct, normalizeProducts } from '../scripts/products-data.mjs';

const product = { prd_id: '000123', view_name: '상품', discprice: 9900, domain: 'fashion' };

test('source aliases and comma prices normalize to the 13-column team contract', () => {
  const normalized = normalizeProduct({
    prd_id: '000123', view_name: ' 상품 ', brd_nm: ' 브랜드 ', price: '9,900',
    domain: 'fashion', cate3_nm: ' ', cate4_nm: '', opt1: '탭 A',
  });
  assert.deepEqual(Object.keys(normalized), PRODUCT_COLUMNS);
  assert.equal(normalized.prd_id, '000123');
  assert.equal(normalized.view_name, '상품');
  assert.equal(normalized.brand_name, '브랜드');
  assert.equal(normalized.discprice, 9900);
  assert.equal(normalized.cate3_nm, null);
  assert.equal(normalized.cate4_nm, null);
  assert.equal(normalized.opt1, '탭 A');
  for (const field of ['opt2', 'opt3', 'opt4']) assert.equal(normalized[field], null);
});

test('invalid prices cannot silently round, become zero, or lose precision', () => {
  for (const discprice of [undefined, null, true, '', ' ', '1,23', '1.5', '1e3', '-1', -1, 0.5, Infinity, NaN, '9007199254740992', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => normalizeProduct({ ...product, discprice }), /discprice/);
  }
  assert.equal(normalizeProduct({ ...product, discprice: 0 }).discprice, 0);
  assert.equal(normalizeProduct({ ...product, discprice: '9,007,199,254,740,991' }).discprice, Number.MAX_SAFE_INTEGER);
});

test('required codes, names, domains and nullable text fields are validated', () => {
  for (const prd_id of [123, '', ' ', null, 'x'.repeat(65)]) {
    assert.throws(() => normalizeProduct({ ...product, prd_id }), /prd_id/);
  }
  assert.throws(() => normalizeProduct({ ...product, view_name: ' ' }), /view_name/);
  assert.throws(() => normalizeProduct({ ...product, view_name: 'a\0b' }), /view_name/);
  assert.throws(() => normalizeProduct({ ...product, opt1: { tab: 'a' } }), /opt1/);
  for (const domain of ['Fashion', 'home', '', null]) {
    assert.throws(() => normalizeProduct({ ...product, domain }), /domain/);
  }
  for (const domain of ['fashion', 'food', 'living', 'beauty']) {
    assert.equal(normalizeProduct({ ...product, domain }).domain, domain);
  }
});

test('unknown columns, conflicting aliases and duplicate product codes fail before writing', () => {
  assert.throws(() => normalizeProduct({ ...product, price: 1 }), /conflicts/);
  assert.throws(() => normalizeProduct({ ...product, brand_name: 'A', brd_nm: 'B' }), /conflicts/);
  assert.equal(normalizeProduct({ ...product, price: '9,900' }).discprice, 9900);
  assert.throws(() => normalizeProduct({ ...product, opt5: 'typo' }), /Unknown product field/);
  assert.throws(() => normalizeProducts([product, product]), /row 2: Duplicate/);
  assert.throws(() => normalizeProducts({}), /JSON array/);
});

test('seed writes are parameterized and never overwrite an existing row', () => {
  const unusualName = "상품'); DROP TABLE products; --";
  const query = createSeedQuery({ ...product, view_name: unusualName });
  assert.ok(!query.text.includes(unusualName));
  assert.match(query.text, /VALUES \(\$1, \$2, .*\$13\)/);
  assert.match(query.text, /ON CONFLICT \(prd_id\) DO NOTHING/);
  assert.equal(query.values.length, 13);
  assert.equal(query.values[1], unusualName);
});

test('team imports preserve omitted optional columns and only clear explicit null values', () => {
  const query = createImportQuery({ ...product, opt1: '탭 A', opt3: null });
  const updateClause = query.text.split('DO UPDATE SET ')[1];
  assert.match(updateClause, /view_name = EXCLUDED.view_name/);
  assert.match(updateClause, /opt1 = EXCLUDED.opt1/);
  assert.match(updateClause, /opt3 = EXCLUDED.opt3/);
  assert.ok(!updateClause.includes('opt2'));
  assert.ok(!updateClause.includes('opt4'));
  assert.ok(!updateClause.includes('brand_name'));
  assert.ok(!updateClause.includes('cate1_nm'));
  assert.equal(query.values[11], null);
  const aliasQuery = createImportQuery({ prd_id: '1', view_name: '상품', price: '9,900', brd_nm: '브랜드', domain: 'food' });
  assert.match(aliasQuery.text, /brand_name = EXCLUDED.brand_name/);
  assert.match(aliasQuery.text, /discprice = EXCLUDED.discprice/);
});

test('the five supplied samples retain their source classifications and empty team columns', async () => {
  const samples = normalizeProducts(JSON.parse(await readFile(new URL('../db/products.seed.json', import.meta.url), 'utf8')));
  assert.equal(samples.length, 5);
  assert.equal(samples.find(row => row.prd_id === '1000000060').domain, 'fashion');
  assert.equal(samples.find(row => row.prd_id === '1000000054').domain, 'living');
  assert.equal(samples.find(row => row.prd_id === '1000000643').discprice, 72900);
  for (const row of samples) {
    assert.equal(Object.keys(row).length, 13);
    for (const field of ['opt1', 'opt2', 'opt3', 'opt4']) assert.equal(row[field], null);
  }
});
