import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { CATALOG_COLUMNS, parseCsv, writeCsv, validateCatalog } from '../scripts/lib/catalog-csv.mjs';
import { resolveAsset, buildGameAssets, validateProductOverrides, validateReferenceStatuses } from '../scripts/build-game-assets.mjs';
import { getGameProduct } from '../src/lib/game-assets.ts';
import { GET } from '../app/api/demo/game-assets/route.ts';

const catalog = parseCsv(await readFile(new URL('../data/catalog/products.csv', import.meta.url), 'utf8'));
const generated = JSON.parse(await readFile(new URL('../src/generated/product-asset-map.json', import.meta.url), 'utf8'));
const request = query => new Request(`http://localhost/api/demo/game-assets?${query}`);
// Deterministic 1×1 transparent PNG: fixtures never depend on private generated files.
const fixturePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==', 'base64');
const originalReviewedIds = ['1128893597', '1128893626', '1053232515', '1059856091', '1118407031', '1050446036', '1050446037'];
// Isolated test IDs have their own approval list; never inherit or change the live manifest's approvals.
const blueAsset = { ...generated.assets.find(asset => asset.id === 'serum_dropper_round--blue'),
  approvedProductIds: ['1059856091', '9000000001', '9000000002'],
  width: 1, height: 1, frame: { x: 0, y: 0, width: 1, height: 1 },
  sha256: createHash('sha256').update(fixturePng).digest('hex'),
};
const sourceSerum = catalog.rows.find(row => row.prd_id === '1059856091');
const fixtureRows = [
  sourceSerum,
  { ...sourceSerum, prd_id: '9000000001', view_name: '새 브랜드 보습 세럼 30ml' },
  { ...sourceSerum, prd_id: '9000000002', view_name: '새 브랜드 진정 세럼 30ml' },
  catalog.rows.find(row => row.prd_id === '1080664026'),
];
const photoOverride = (prd_id, extra = {}) => ({ prd_id, familyId: 'serum_dropper_round', color: 'blue', pattern: 'solid',
  mappingStatus: 'classified', evidence: [`원본 사진에서 파란 원통 드로퍼 확인: ${prd_id}`], ...extra });

async function buildFixture(t, { rows = fixtureRows, assets = [blueAsset], overrides, references, includeImages = true } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'gscene-asset-build-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'data/catalog'), { recursive: true });
  await mkdir(path.join(dir, 'data/game-assets/overnight'), { recursive: true });
  await writeFile(path.join(dir, 'data/catalog/products.csv'), writeCsv(CATALOG_COLUMNS, rows));
  await writeFile(path.join(dir, 'data/game-assets/manifest.json'), JSON.stringify({ version: 'v1', assets }));
  for (const asset of includeImages ? assets : []) {
    await mkdir(path.dirname(path.join(dir, asset.sourcePath)), { recursive: true });
    await writeFile(path.join(dir, asset.sourcePath), fixturePng);
  }
  if (overrides !== undefined) await writeFile(path.join(dir, 'data/game-assets/product-overrides.json'), JSON.stringify(overrides));
  if (references !== undefined) await writeFile(path.join(dir, 'data/game-assets/overnight/reference-status.json'), JSON.stringify(references));
  return { repositoryRoot: dir, quiet: true, validateNativeFiles: true };
}

test('CSV round-trips string IDs, Korean, BOM, quoted commas/newlines and double quotes', () => {
  const rows = [{ prd_id: '000123', view_name: '깔끔한 "상품", 2개\n세트', cate1_nm: '식품', cate2_nm: '', cate3_nm: '', cate4_nm: '', brand_name: '브랜드', discprice: '9000', domain: 'food' }];
  const parsed = parseCsv(writeCsv(CATALOG_COLUMNS, rows));
  assert.deepEqual(parsed.rows, rows); assert.equal(validateCatalog(parsed).size, 1);
  assert.throws(() => parseCsv('a,b\n"unterminated'), /Unclosed/);
  assert.throws(() => parseCsv('a,b\n1'), /columns/);
  assert.throws(() => validateCatalog({ ...parsed, rows: [...rows, ...rows] }), /Duplicate product ID/);
});

test('all 5,224 source rows have exactly one mapping without altering any original field', () => {
  assert.equal(catalog.rows.length, 5224); assert.equal(generated.products.length, 5224);
  const indexed = new Map(generated.products.map(p => [p.prd_id, p]));
  assert.equal(indexed.size, 5224);
  for (const source of catalog.rows) {
    const product = indexed.get(source.prd_id); assert.ok(product);
    for (const column of CATALOG_COLUMNS) assert.equal(product[column], source[column]);
    assert.equal(product.sourceImageUrl, `https://asset.m-gs.kr/prod/${source.prd_id}/1/550`);
    if (product.assetStatus !== 'ready') { assert.equal(product.assetId, null); assert.equal(product.assetUrl, null); }
    else assert.ok(generated.assets.some(asset => asset.id === product.assetId && asset.url === product.assetUrl));
  }
});

test('matching pasta packs share one file while a different observed wrapper stays separate', () => {
  const three = getGameProduct('1050446036'), five = getGameProduct('1050446037'), otherBrand = getGameProduct('1080664026');
  assert.ok(three.asset); assert.equal(three.asset.id, five.asset.id);
  // Photo review corrected the white/blue wrapper with a small oval window;
  // it cannot inherit the mostly clear wrapper with green ends.
  assert.equal(otherBrand.color, 'white_blue');
  assert.notEqual(otherBrand.asset?.id, three.asset.id);
  if (otherBrand.asset) assert.equal(otherBrand.asset.color, 'white_blue');
  assert.notEqual(three.prd_id, five.prd_id); assert.notEqual(three.view_name, five.view_name);
  assert.ok(three.view_name.includes('3')); assert.ok(five.view_name.includes('5'));
});

test('different neckline, packaging and unverified color never receive a misleading ready asset', () => {
  for (const [id, family] of [
    ['1134622052', 'cardigan_round_solid'], ['16052422', 'cosmetic_cylinder_capped'],
    ['1083830467', 'shirt'], ['1048766965', 'jeans'], ['33323431', 'table'],
  ]) {
    const product = getGameProduct(id); assert.ok(product);
    if (product.asset) assert.equal(product.asset.familyId, family, `Correct generated family for ${id}`);
  }
  assert.equal(getGameProduct('1134622052').familyId, 'cardigan_round_solid');
  assert.notEqual(getGameProduct('1104285714').familyId, getGameProduct('1110422732').familyId);
  assert.equal(getGameProduct('16052422').familyId, 'cosmetic_cylinder_capped');
  assert.equal(getGameProduct('1128893597').asset.color, 'navy');
  assert.equal(getGameProduct('1128893626').asset.color, 'gray');
  // Resolution failures use fixed fixtures: a legitimate new asset must not
  // invalidate a test that merely assumed it had not been generated yet.
  const vneckFixture = { id: 'vneck-fixture', status: 'ready', familyId: 'cardigan_vneck_solid', colorPolicy: 'exact', color: 'navy', pattern: 'solid' };
  assert.equal(resolveAsset({ mappingStatus: 'classified', familyId: 'cardigan_vneck_solid', color: 'unspecified', pattern: 'solid' }, [vneckFixture]), null);
  assert.equal(resolveAsset({ mappingStatus: 'needs_review', familyId: 'cardigan_vneck_solid', color: 'navy', pattern: 'solid' }, [vneckFixture]), null);
  assert.equal(resolveAsset({ mappingStatus: 'classified', familyId: 'cardigan_vneck_solid', color: 'navy', pattern: 'stripe' }, [vneckFixture]), null);
  assert.equal(resolveAsset({ mappingStatus: 'classified', familyId: 'cardigan_round_solid', color: 'burgundy', pattern: 'solid' }, [{ ...vneckFixture, color: 'burgundy' }]), null);
  assert.equal(resolveAsset({ mappingStatus: 'classified', familyId: 'cosmetic_cylinder_capped', color: 'blue', pattern: 'generic' }, [blueAsset]), null);
});

test('product ID API returns the exact product, no arbitrary fallback or mutable shared data', async () => {
  const response = GET(request('id=1059856091')); assert.equal(response.status, 200);
  const product = await response.json(); assert.equal(product.prd_id, '1059856091'); assert.equal(product.asset.color, 'blue');
  assert.equal(GET(request('id=99999999999999999')).status, 404);
  assert.equal(GET(request('id=__proto__')).status, 400);
  assert.equal(GET(request('id=')).status, 400);
  assert.equal(getGameProduct('made-up-id'), null);
  const first = getGameProduct('1059856091'); first.asset.url = '/wrong'; first.evidence.length = 0;
  assert.notEqual(getGameProduct('1059856091').asset.url, '/wrong');
  assert.ok(getGameProduct('1059856091').evidence.length);
});

test('filtered and paginated API results retain valid mapped products and reject invalid filters', async () => {
  const ready = await GET(request('status=ready')).json(); assert.ok(ready.total >= originalReviewedIds.length);
  const readyIds = new Set(generated.products.filter(product => product.assetStatus === 'ready').map(product => product.prd_id));
  for (const id of originalReviewedIds) assert.ok(readyIds.has(id), `Original reviewed product remains ready: ${id}`);
  assert.ok(ready.products.every(p => p.assetStatus === 'ready' && p.asset));
  const fashion = await GET(request('domain=fashion&limit=2&page=2')).json();
  assert.equal(fashion.total, 1680); assert.equal(fashion.products.length, 2); assert.equal(fashion.page, 2);
  const search = await GET(request('q=1050446037')).json(); assert.equal(search.total, 1); assert.equal(search.products[0].prd_id, '1050446037');
  for (const query of ['domain=__proto__', 'status=fake', 'limit=0', 'limit=49', 'page=-1', 'page=1.5']) assert.equal(GET(request(query)).status, 400);
});

test('CSV mapping and review exports agree with the runtime catalog', async () => {
  const csv = parseCsv(await readFile(new URL('../data/game-assets/generated/product-asset-mapping.csv', import.meta.url), 'utf8'));
  assert.deepEqual(csv.headers.slice(0, 9), CATALOG_COLUMNS); assert.equal(csv.rows.length, 5224);
  const review = parseCsv(await readFile(new URL('../data/game-assets/generated/products-needing-review.csv', import.meta.url), 'utf8'));
  assert.equal(review.rows.length, generated.summary.assetStatuses.needs_review);
  assert.ok(review.rows.every(row => !row.asset_url && row.asset_status === 'needs_review'));
  const queue = JSON.parse(await readFile(new URL('../data/game-assets/generated/generation-queue.json', import.meta.url), 'utf8'));
  assert.equal(queue.flatMap(group => group.productIds).length, generated.summary.assetStatuses.pending_generation);
  assert.equal(new Set(queue.flatMap(group => group.productIds)).size, generated.summary.assetStatuses.pending_generation);
});

test('photo overrides change only mapping metadata and optional review files may be absent', async t => {
  const baseline = await buildGameAssets(await buildFixture(t));
  assert.equal(baseline.products.find(product => product.prd_id === '1059856091').assetStatus, 'ready');
  assert.equal(baseline.products.find(product => product.prd_id === '9000000001').assetStatus, 'needs_review');
  assert.equal(baseline.summary.photoReviewOverrides, 0);
  assert.deepEqual(baseline.summary.sourceImageAvailability, { notchecked: fixtureRows.length });

  const options = await buildFixture(t, { overrides: [photoOverride('9000000001')] });
  const reviewed = await buildGameAssets(options);
  const product = reviewed.products.find(product => product.prd_id === '9000000001');
  assert.equal(product.assetStatus, 'ready'); assert.equal(product.color, 'blue'); assert.equal(product.pattern, 'solid');
  assert.equal(reviewed.summary.photoReviewOverrides, 1);
  assert.ok(product.evidence.includes('원본 사진에서 파란 원통 드로퍼 확인: 9000000001'));
  for (const source of fixtureRows) {
    const result = reviewed.products.find(product => product.prd_id === source.prd_id);
    for (const column of CATALOG_COLUMNS) assert.equal(result[column], source[column]);
  }
  const exported = parseCsv(await readFile(path.join(options.repositoryRoot, 'data/game-assets/generated/product-asset-mapping.csv'), 'utf8'));
  assert.deepEqual(exported.headers.slice(0, 9), CATALOG_COLUMNS);
  assert.equal(exported.rows.find(row => row.prd_id === '9000000001').source_image_availability, 'notchecked');
});

test('override validation rejects unknown and duplicate IDs, domain conflicts and source-field edits', () => {
  const cases = [
    [[photoOverride('9999999999')], /Unknown override product ID/],
    [[photoOverride('9000000001'), photoOverride('9000000001')], /Duplicate override product ID/],
    [[photoOverride('9000000001', { familyId: 'not_a_family' })], /Invalid override family/],
    [[photoOverride('9000000001', { familyId: 'tee_long' })], /Invalid override family or domain/],
    [[photoOverride('9000000001', { view_name: '바뀐 상품명' })], /cannot change original catalog field/],
    [[photoOverride('9000000001', { domain: 'food' })], /cannot change original catalog field/],
    [[photoOverride('9000000001', { discprice: '1' })], /cannot change original catalog field/],
    [[photoOverride('9000000001', { prd_id: 9000000001 })], /Unknown override product ID/],
    [[photoOverride('9000000001', { evidence: [] })], /Invalid override evidence/],
    [[photoOverride('9000000001', { mappingStatus: 'ready' })], /Invalid override mapping status/],
  ];
  for (const [input, expected] of cases) assert.throws(() => validateProductOverrides(input, fixtureRows), expected);
  assert.throws(() => validateProductOverrides({}, fixtureRows), /must be an array/);
});

test('approved product IDs restrict matching and exact attributes beat generic fallbacks in any order', () => {
  const classification = { mappingStatus: 'classified', familyId: 'serum_dropper_round', color: 'blue', pattern: 'solid' };
  const generic = { ...blueAsset, id: 'generic', colorPolicy: 'generic', color: 'neutral', pattern: 'generic' };
  const exact = { ...blueAsset, id: 'exact', pattern: 'solid', approvedProductIds: ['9000000001'] };
  const exactColor = { ...blueAsset, id: 'color-only' };
  for (const assets of [[generic, exactColor, exact], [exact, generic, exactColor]]) {
    assert.equal(resolveAsset(classification, assets, '9000000001').id, 'exact');
    assert.equal(resolveAsset(classification, assets, '9000000002').id, 'color-only');
  }
  assert.equal(resolveAsset(classification, [exact], '9000000002'), null);
  assert.equal(resolveAsset(classification, [exact]), null);
  assert.equal(resolveAsset(classification, [{ ...exact, approvedProductIds: [] }], '9000000001'), null);
  assert.equal(resolveAsset({ ...classification, color: 'yellow' }, [exact], '9000000001'), null);
  assert.equal(resolveAsset({ ...classification, pattern: 'stripe' }, [exact], '9000000001'), null);
});

test('build enforces approved ID lists and rejects invalid approval IDs or domains', async t => {
  const approved = { ...blueAsset, approvedProductIds: ['9000000001'] };
  const result = await buildGameAssets(await buildFixture(t, {
    assets: [approved], overrides: [photoOverride('9000000001'), photoOverride('9000000002')],
  }));
  assert.equal(result.products.find(product => product.prd_id === '9000000001').assetStatus, 'ready');
  assert.equal(result.products.find(product => product.prd_id === '9000000002').assetStatus, 'pending_generation');
  assert.equal(result.products.find(product => product.prd_id === '1059856091').assetStatus, 'pending_generation');
  for (const [approvedProductIds, expected] of [
    [['999999999'], /Unknown approved product ID/],
    [['9000000001', '9000000001'], /Duplicate approved product ID/],
    [['1080664026'], /Approved product domain mismatch/],
    [[9000000001], /Invalid approved product IDs/],
  ]) {
    const options = await buildFixture(t, { assets: [{ ...blueAsset, approvedProductIds }] });
    await assert.rejects(buildGameAssets(options), expected);
  }
});

test('missing, invalid and errored references block even explicitly approved assets and record the reason', async t => {
  for (const availability of ['missing', 'invalid', 'error']) {
    const result = await buildGameAssets(await buildFixture(t, {
      assets: [{ ...blueAsset, approvedProductIds: ['9000000001'] }],
      overrides: [photoOverride('9000000001')],
      references: { version: 1, products: { '9000000001': { status: availability, error: '원본 이미지 확인 실패' } }, counts: { [availability]: 1 } },
    }));
    const product = result.products.find(product => product.prd_id === '9000000001');
    assert.equal(product.mappingStatus, 'needs_review'); assert.equal(product.assetStatus, 'needs_review');
    assert.equal(product.assetId, null); assert.equal(product.assetUrl, null); assert.equal(product.assetRequestKey, null);
    assert.equal(product.sourceImageAvailability, availability);
    assert.ok(product.reasons.some(reason => reason.includes(availability) && reason.includes('원본 이미지 확인 실패')));
    assert.ok(!result.generationQueue.some(group => group.productIds.includes(product.prd_id)));
  }
});

test('available, unknown, notchecked and absent reference records do not invent failures', async t => {
  for (const availability of ['available', 'unknown', 'notchecked']) {
    const result = await buildGameAssets(await buildFixture(t, {
      overrides: [photoOverride('9000000001'), photoOverride('9000000002')],
      references: { version: 1, products: { '9000000001': { status: availability } } },
    }));
    assert.equal(result.products.find(product => product.prd_id === '9000000001').assetStatus, 'ready');
    const absent = result.products.find(product => product.prd_id === '9000000002');
    assert.equal(absent.sourceImageAvailability, 'notchecked'); assert.equal(absent.assetStatus, 'ready');
    assert.equal(result.summary.validation.sourceImageAvailabilityVerified, false);
  }
  assert.throws(() => validateReferenceStatuses({ products: { '999999999': { status: 'available' } } }, fixtureRows), /Unknown reference product ID/);
  assert.throws(() => validateReferenceStatuses([
    { prd_id: '9000000001', availability: 'available' }, { prd_id: '9000000001', availability: 'error' },
  ], fixtureRows), /Duplicate reference product ID/);
  assert.throws(() => validateReferenceStatuses({ products: { '9000000001': { status: 'available', availability: 'missing' } } }, fixtureRows), /Conflicting reference status/);
});


test('metadata-only builds work without generated PNGs and explicitly report skipped byte validation', async t => {
  const options = await buildFixture(t, { includeImages: false });
  const result = await buildGameAssets({ ...options, validateNativeFiles: false });
  assert.equal(result.products.find(product => product.prd_id === '1059856091').assetStatus, 'ready');
  assert.equal(result.summary.validation.mode, 'metadata-only');
  assert.equal(result.summary.validation.nativeFilesChecked, 0);
  assert.equal(result.summary.validation.checksumFailures, null);
  await assert.rejects(buildGameAssets(options), /Missing asset/);
});

test('strict local validation checks fixture bytes and catches changed PNGs', async t => {
  const options = await buildFixture(t);
  const result = await buildGameAssets(options);
  assert.equal(result.summary.validation.mode, 'native-files');
  assert.equal(result.summary.validation.nativeFilesChecked, 1);
  assert.equal(result.summary.validation.checksumFailures, 0);
  const changed = Buffer.from(fixturePng); changed[40] ^= 1;
  await writeFile(path.join(options.repositoryRoot, blueAsset.sourcePath), changed);
  await assert.rejects(buildGameAssets(options), /Asset checksum changed/);
});

test('metadata-only mode still rejects invalid identities, checksums and frames', async t => {
  for (const [extra, expected] of [
    [{ id: '' }, /Invalid asset identity/],
    [{ sha256: 'not-a-checksum' }, /Invalid asset checksum metadata/],
    [{ frame: { x: 0, y: 0, width: 2, height: 1 } }, /Invalid asset dimensions or display frame/],
    [{ width: 1.5 }, /Invalid asset dimensions or display frame/],
  ]) {
    const options = await buildFixture(t, { assets: [{ ...blueAsset, ...extra }], includeImages: false });
    await assert.rejects(buildGameAssets({ ...options, validateNativeFiles: false }), expected);
  }
});
