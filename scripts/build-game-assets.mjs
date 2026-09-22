import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { CATALOG_COLUMNS, parseCsv, writeCsv, validateCatalog } from './lib/catalog-csv.mjs';
import { FAMILIES, classifyProduct } from './lib/game-asset-rules.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const countBy = (rows, key) => rows.reduce((result, row) => { result[row[key]] = (result[row[key]] || 0) + 1; return result; }, {});
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const blockedReferenceStates = new Set(['missing', 'invalid', 'error']);

async function optionalJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

function stringList(value, label, { nonempty = false } = {}) {
  if (!Array.isArray(value) || nonempty && value.length === 0 || value.some(item => typeof item !== 'string' || !item.trim())) throw new Error(`Invalid ${label}: expected ${nonempty ? 'nonempty ' : ''}string array`);
  return [...value];
}

/** Photo review is additive metadata: it cannot replace any original CSV field. */
export function validateProductOverrides(overrides, catalogRows) {
  if (!Array.isArray(overrides)) throw new Error('Product overrides must be an array');
  const products = new Map(catalogRows.map(row => [row.prd_id, row])), result = new Map();
  for (const override of overrides) {
    if (!isRecord(override) || typeof override.prd_id !== 'string' || !products.has(override.prd_id)) throw new Error(`Unknown override product ID: ${override?.prd_id}`);
    if (result.has(override.prd_id)) throw new Error(`Duplicate override product ID: ${override.prd_id}`);
    const source = products.get(override.prd_id);
    for (const field of CATALOG_COLUMNS.filter(key => key !== 'prd_id')) {
      if (hasOwn(override, field)) throw new Error(`Override cannot change original catalog field ${field}: ${override.prd_id}`);
    }
    if (!FAMILIES[override.familyId] || FAMILIES[override.familyId].domain !== source.domain) throw new Error(`Invalid override family or domain: ${override.prd_id}`);
    if (!['classified', 'needs_review'].includes(override.mappingStatus)) throw new Error(`Invalid override mapping status: ${override.prd_id}`);
    for (const field of ['color', 'pattern']) {
      if (typeof override[field] !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(override[field])) throw new Error(`Invalid override ${field}: ${override.prd_id}`);
    }
    result.set(override.prd_id, {
      familyId: override.familyId, color: override.color, pattern: override.pattern, mappingStatus: override.mappingStatus,
      evidence: stringList(override.evidence, `override evidence for ${override.prd_id}`, { nonempty: true }),
      reasons: stringList(override.reasons ?? [], `override reasons for ${override.prd_id}`),
    });
  }
  return result;
}

/**
 * Downloader contract: {version:1, products:{'prdId':{status,url,localPath,...}}}.
 * An absent record is notchecked. A failed download is never a successful review.
 */
export function validateReferenceStatuses(input, catalogRows) {
  if (input === null) return new Map();
  const ids = new Set(catalogRows.map(row => row.prd_id));
  const raw = isRecord(input) && hasOwn(input, 'products') ? input.products : input;
  let entries;
  if (Array.isArray(raw)) entries = raw.map(record => [record?.prd_id, record]);
  else if (isRecord(raw)) entries = Object.entries(raw);
  else throw new Error('Reference statuses must contain a products object or array');
  const result = new Map(), allowed = new Set(['available', 'missing', 'invalid', 'error', 'unknown', 'notchecked']);
  for (const [id, record] of entries) {
    if (typeof id !== 'string' || !ids.has(id)) throw new Error(`Unknown reference product ID: ${id}`);
    if (result.has(id)) throw new Error(`Duplicate reference product ID: ${id}`);
    if (!isRecord(record) || hasOwn(record, 'prd_id') && record.prd_id !== id) throw new Error(`Invalid reference record: ${id}`);
    if (record.availability && record.status && record.availability !== record.status) throw new Error(`Conflicting reference status: ${id}`);
    const availability = record.availability ?? record.status ?? 'unknown';
    if (!allowed.has(availability)) throw new Error(`Invalid reference availability for ${id}: ${availability}`);
    result.set(id, { availability, detail: typeof record.error === 'string' ? record.error : typeof record.reason === 'string' ? record.reason : '' });
  }
  return result;
}

export function resolveAsset(classification, assets, productId = classification.prd_id) {
  if (classification.mappingStatus !== 'classified') return null;
  return assets.filter(asset => asset.status === 'ready' && asset.familyId === classification.familyId
    && (!hasOwn(asset, 'approvedProductIds') || Array.isArray(asset.approvedProductIds) && asset.approvedProductIds.includes(productId))
    && (asset.colorPolicy === 'generic' || asset.color === classification.color)
    && (asset.pattern === 'generic' || asset.pattern === classification.pattern))
    .sort((a, b) => {
      // Exact color + pattern wins regardless of manifest ordering. A generic
      // legacy silhouette must not intercept a subsequently reviewed sprite.
      const specificity = asset => (asset.colorPolicy === 'generic' ? 0 : 2) + (asset.pattern === 'generic' ? 0 : 1);
      return specificity(b) - specificity(a)
        || Number(hasOwn(b, 'approvedProductIds')) - Number(hasOwn(a, 'approvedProductIds'))
        || String(a.id).localeCompare(String(b.id));
    })[0] ?? null;
}

// Deployment builds use published assets and validate the mapping metadata only.
// Generation/upload operators opt into byte validation with --validate-files.
export async function buildGameAssets({ repositoryRoot = root, quiet = false, validateNativeFiles = false } = {}) {
  const sourceFile = path.join(repositoryRoot, 'data/catalog/products.csv');
  const bytes = await readFile(sourceFile);
  const catalog = parseCsv(bytes.toString('utf8'));
  const ids = validateCatalog(catalog);
  const manifest = JSON.parse(await readFile(path.join(repositoryRoot, 'data/game-assets/manifest.json'), 'utf8'));
  const overrides = validateProductOverrides(await optionalJson(path.join(repositoryRoot, 'data/game-assets/product-overrides.json'), []), catalog.rows);
  const referenceStatuses = validateReferenceStatuses(await optionalJson(path.join(repositoryRoot, 'data/game-assets/overnight/reference-status.json'), null), catalog.rows);
  const catalogById = new Map(catalog.rows.map(row => [row.prd_id, row]));
  const assetIds = new Set(), urls = new Set();
  if (!isRecord(manifest) || !Array.isArray(manifest.assets)) throw new Error('Invalid asset manifest');
  for (const asset of manifest.assets) {
    if (!isRecord(asset) || typeof asset.id !== 'string' || !/^[a-z0-9_-]+$/.test(asset.id)) throw new Error('Invalid asset identity');
    if (assetIds.has(asset.id) || urls.has(asset.url)) throw new Error(`Duplicate asset identity or URL: ${asset.id}`);
    assetIds.add(asset.id); urls.add(asset.url);
    if (!FAMILIES[asset.familyId] || FAMILIES[asset.familyId].domain !== asset.domain) throw new Error(`Invalid asset family: ${asset.id}`);
    if (hasOwn(asset, 'approvedProductIds')) {
      const approved = stringList(asset.approvedProductIds, `approved product IDs for ${asset.id}`);
      if (new Set(approved).size !== approved.length) throw new Error(`Duplicate approved product ID: ${asset.id}`);
      for (const id of approved) {
        if (!ids.has(id)) throw new Error(`Unknown approved product ID: ${id}`);
        if (catalogById.get(id).domain !== asset.domain) throw new Error(`Approved product domain mismatch: ${id}`);
      }
    }
    if (asset.sourcePath !== `app${asset.url}` || !/^\/assets\/game-items\/v1\/[a-z0-9_/-]+\.png$/.test(asset.url)) throw new Error(`Unsafe or inconsistent asset path: ${asset.id}`);
    if (typeof asset.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(asset.sha256)) throw new Error(`Invalid asset checksum metadata: ${asset.id}`);
    const f = asset.frame;
    if (!Number.isSafeInteger(asset.width) || asset.width <= 0 || !Number.isSafeInteger(asset.height) || asset.height <= 0
      || !isRecord(f) || ![f.x, f.y, f.width, f.height].every(Number.isSafeInteger)
      || f.x < 0 || f.y < 0 || f.width <= 0 || f.height <= 0 || f.x + f.width > asset.width || f.y + f.height > asset.height) {
      throw new Error(`Invalid asset dimensions or display frame: ${asset.id}`);
    }
    if (validateNativeFiles) {
      const file = path.join(repositoryRoot, asset.sourcePath);
      let image;
      try {
        if (!(await stat(file)).isFile()) throw new Error(`Missing asset: ${file}`);
        image = await readFile(file);
      } catch (error) {
        if (error.code === 'ENOENT') throw new Error(`Missing asset: ${file}`);
        throw error;
      }
      if (image.length < 33 || image.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
        || image.subarray(12, 16).toString() !== 'IHDR') throw new Error(`Invalid PNG: ${file}`);
      if (hash(image) !== asset.sha256) throw new Error(`Asset checksum changed: ${file}`);
      if (image.readUInt32BE(16) !== asset.width || image.readUInt32BE(20) !== asset.height) throw new Error(`Invalid PNG dimensions: ${asset.id}`);
    }
  }
  const products = catalog.rows.map(row => {
    const override = overrides.get(row.prd_id);
    let classification = override ? {
      ...override,
      attributes: { referenceVerified: true, classificationSource: 'photo-review-override' },
      evidence: [...override.evidence, `상품 ID별 사진 검수 적용: ${row.prd_id}`],
      reasons: [...override.reasons],
    } : classifyProduct(row);
    const reference = referenceStatuses.get(row.prd_id), sourceImageAvailability = reference?.availability ?? 'notchecked';
    if (blockedReferenceStates.has(sourceImageAvailability)) classification = {
      ...classification, mappingStatus: 'needs_review',
      evidence: [...classification.evidence, `원본 이미지 수집 상태: ${sourceImageAvailability}`],
      reasons: [...classification.reasons, `원본 이미지를 사용할 수 없어 에셋 연결을 보류합니다 (${sourceImageAvailability})${reference.detail ? `: ${reference.detail}` : ''}`],
    };
    const family = FAMILIES[classification.familyId];
    if (!family || family.domain !== row.domain) throw new Error(`Classification domain mismatch: ${row.prd_id}`);
    const asset = resolveAsset(classification, manifest.assets, row.prd_id);
    const assetStatus = classification.mappingStatus === 'needs_review' ? 'needs_review' : asset ? 'ready' : 'pending_generation';
    const assetRequestKey = classification.mappingStatus === 'needs_review' ? null
      : [classification.familyId, classification.color, classification.pattern].join('--');
    return { ...row, sourceImageUrl: `https://asset.m-gs.kr/prod/${row.prd_id}/1/550`, sourceImageAvailability,
      ...classification, familyLabel: family.label, placement: family.placement,
      assetStatus, assetId: asset?.id ?? null, assetUrl: asset?.url ?? null, assetRequestKey };
  });
  if (products.length !== ids.size || products.some(row => !ids.has(row.prd_id))) throw new Error('Product ID coverage mismatch');
  if (catalog.rows.some((source, index) => CATALOG_COLUMNS.some(column => products[index][column] !== source[column]))) throw new Error('Original catalog fields changed during mapping');

  const queue = new Map();
  for (const product of products.filter(row => row.assetStatus === 'pending_generation')) {
    if (!queue.has(product.assetRequestKey)) queue.set(product.assetRequestKey, {
      assetRequestKey: product.assetRequestKey, domain: product.domain, familyId: product.familyId,
      familyLabel: product.familyLabel, color: product.color, pattern: product.pattern,
      placement: product.placement, ...FAMILIES[product.familyId], productIds: [], referenceProductIds: [],
      referenceRequired: product.color === 'unspecified' || product.pattern === 'unspecified',
    });
    const group = queue.get(product.assetRequestKey);
    group.productIds.push(product.prd_id);
    if (group.referenceProductIds.length < 3) group.referenceProductIds.push(product.prd_id);
  }
  const generationQueue = [...queue.values()].sort((a, b) => b.productIds.length - a.productIds.length || a.assetRequestKey.localeCompare(b.assetRequestKey));
  const summary = {
    source: 'data/catalog/products.csv', sourceSha256: hash(bytes), schemaVersion: 1, assetVersion: manifest.version,
    totalProducts: products.length, uniqueProductIds: ids.size, domains: countBy(products, 'domain'),
    mappingStatuses: countBy(products, 'mappingStatus'), assetStatuses: countBy(products, 'assetStatus'),
    photoReviewOverrides: overrides.size, sourceImageAvailability: countBy(products, 'sourceImageAvailability'),
    assetFiles: manifest.assets.length, usedAssetFiles: new Set(products.filter(p => p.assetId).map(p => p.assetId)).size,
    familyCount: Object.keys(FAMILIES).length, classifiedFamilies: new Set(products.filter(p => p.mappingStatus === 'classified').map(p => p.familyId)).size,
    pendingAssetGroups: generationQueue.length,
    validation: { duplicateProductIds: 0, missingMappingIds: 0, orphanMappingIds: 0, invalidAssetPaths: 0,
      mode: validateNativeFiles ? 'native-files' : 'metadata-only',
      nativeFilesChecked: validateNativeFiles ? manifest.assets.length : 0,
      checksumFailures: validateNativeFiles ? 0 : null,
      originalSchemaPreserved: true,
      sourceImagesDownloaded: products.some(product => product.sourceImageAvailability === 'available'),
      sourceImageAvailabilityVerified: products.every(product => ['available', 'missing', 'invalid'].includes(product.sourceImageAvailability)) },
  };
  const generated = path.join(repositoryRoot, 'src/generated');
  const exports = path.join(repositoryRoot, 'data/game-assets/generated');
  await mkdir(generated, { recursive: true }); await mkdir(exports, { recursive: true });
  await writeFile(path.join(generated, 'product-asset-map.json'), JSON.stringify({ summary, assets: manifest.assets, products }));
  const extraHeaders = ['asset_family', 'asset_color', 'asset_pattern', 'asset_key', 'asset_status', 'asset_url', 'source_image_url', 'source_image_availability', 'mapping_status', 'mapping_evidence', 'review_reasons'];
  const csvRows = products.map(p => ({ ...p, asset_family: p.familyId, asset_color: p.color, asset_pattern: p.pattern,
    asset_key: p.assetId, asset_status: p.assetStatus, asset_url: p.assetUrl, source_image_url: p.sourceImageUrl, source_image_availability: p.sourceImageAvailability,
    mapping_status: p.mappingStatus, mapping_evidence: p.evidence.join(' | '), review_reasons: p.reasons.join(' | ') }));
  await writeFile(path.join(exports, 'product-asset-mapping.csv'), writeCsv([...CATALOG_COLUMNS, ...extraHeaders], csvRows));
  await writeFile(path.join(exports, 'products-needing-review.csv'), writeCsv([...CATALOG_COLUMNS, ...extraHeaders], csvRows.filter(p => p.asset_status === 'needs_review')));
  await writeFile(path.join(exports, 'generation-queue.json'), JSON.stringify(generationQueue, null, 2) + '\n');
  await writeFile(path.join(exports, 'generation-queue.csv'), writeCsv(
    ['asset_request_key', 'domain', 'family', 'label', 'color', 'pattern', 'placement', 'product_count', 'reference_required', 'reference_product_ids', 'reference_image_urls'],
    generationQueue.map(group => ({ asset_request_key: group.assetRequestKey, domain: group.domain,
      family: group.familyId, label: group.familyLabel, color: group.color, pattern: group.pattern,
      placement: group.placement, product_count: group.productIds.length, reference_required: group.referenceRequired,
      reference_product_ids: group.referenceProductIds.join(' | '),
      reference_image_urls: group.referenceProductIds.map(id => `https://asset.m-gs.kr/prod/${id}/1/550`).join(' | '),
    }))));
  await writeFile(path.join(exports, 'asset-families.csv'), writeCsv(
    ['domain', 'family', 'label', 'placement', 'view', 'product_count', 'ready_count', 'pending_count', 'review_count'],
    Object.entries(FAMILIES).map(([familyId, family]) => {
      const members = products.filter(p => p.familyId === familyId);
      return { ...family, family: familyId, product_count: members.length,
        ready_count: members.filter(p => p.assetStatus === 'ready').length,
        pending_count: members.filter(p => p.assetStatus === 'pending_generation').length,
        review_count: members.filter(p => p.assetStatus === 'needs_review').length };
    })));
  await writeFile(path.join(exports, 'validation.json'), JSON.stringify(summary, null, 2) + '\n');
  if (!quiet) console.log(JSON.stringify(summary, null, 2));
  return { summary, assets: manifest.assets, products, generationQueue };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildGameAssets({ validateNativeFiles: process.argv.includes('--validate-files') });
