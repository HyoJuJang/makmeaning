import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { publicAsset, validateAssetProductId } from '../src/lib/asset-db/contracts.ts';
export const ASSET_DB_LOCK = 724603219;
const domains = new Set(['fashion', 'food', 'living', 'beauty']);
const statuses = new Set(['ready', 'pending_generation', 'needs_review']);
function reject(message) { throw new Error(message); }
/** Validate the entire source before any connection is opened; preserve every ID string. */
export function normalizeAssetDataset(dataset) {
  if (!dataset || !Array.isArray(dataset.assets) || !Array.isArray(dataset.products) || !dataset.assets.length || !dataset.products.length) reject('A nonempty generated asset dataset is required');
  const assets = [], byId = new Map(), products = [], ids = new Set();
  for (const raw of dataset.assets) {
    const asset = publicAsset(raw);
    if (byId.has(asset.id)) reject('Duplicate asset ID');
    byId.set(asset.id, asset); assets.push(asset);
  }
  const statusCounts = { ready: 0, pending_generation: 0, needs_review: 0 };
  for (const raw of dataset.products) {
    const id = validateAssetProductId(raw.prd_id);
    if (ids.has(id)) reject('Duplicate product ID'); ids.add(id);
    if (!domains.has(raw.domain) || !statuses.has(raw.assetStatus) || typeof raw.familyId !== 'string'
      || !Array.isArray(raw.reasons) || !raw.reasons.every(reason => typeof reason === 'string')) reject('Invalid product mapping');
    if (raw.mappingStatus !== undefined && raw.mappingStatus !== (raw.assetStatus === 'needs_review' ? 'needs_review' : 'classified')) reject('Classification and asset status disagree');
    const ready = raw.assetStatus === 'ready';
    if (ready) {
      const asset = byId.get(raw.assetId);
      if (!asset || asset.domain !== raw.domain || asset.familyId !== raw.familyId || asset.url !== raw.assetUrl) reject('Unknown or mismatched mapped asset');
    } else if (raw.assetId !== null || raw.assetUrl !== null) reject('Unready product must have no asset');
    products.push({ prd_id: id, domain: raw.domain, status: raw.assetStatus, family_id: raw.familyId,
      asset_id: ready ? raw.assetId : null, reasons: [...raw.reasons] });
    statusCounts[raw.assetStatus]++;
  }
  if (dataset.summary && (dataset.summary.totalProducts !== products.length || dataset.summary.assetFiles !== assets.length
    || dataset.summary.uniqueProductIds !== products.length)) reject('Source summary counts disagree');
  if (dataset.summary?.assetStatuses && Object.keys(statusCounts).some(status => dataset.summary.assetStatuses[status] !== statusCounts[status])) reject('Source status counts disagree');
  return { assets, products, statusCounts };
}
export async function validateAssetFiles(dataset, repositoryRoot) {
  // Native bytes are only read. Do not copy, transform, crop or recompress artwork here.
  for (const asset of dataset.assets) {
    const file = path.join(repositoryRoot, 'app', asset.url);
    const bytes = await readFile(file);
    if (!bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) reject('Asset is not a PNG');
    if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) reject('Asset checksum mismatch');
    if (bytes.readUInt32BE(16) !== asset.width || bytes.readUInt32BE(20) !== asset.height) reject('Asset dimensions mismatch');
  }
}
export function importQueries(data, sourceSha256) {
  if (!/^[a-f0-9]{64}$/.test(sourceSha256)) reject('Invalid import digest');
  const assets = data.assets.map(asset => ({ asset_id: asset.id, domain: asset.domain, family_id: asset.familyId,
    version: asset.version, sha256: asset.sha256, metadata: asset }));
  return [
    { text: 'SELECT pg_advisory_xact_lock($1)', values: [ASSET_DB_LOCK] },
    { text: `INSERT INTO public.game_assets (asset_id, domain, family_id, version, sha256, metadata)
SELECT asset_id, domain, family_id, version, sha256, metadata FROM jsonb_to_recordset($1::jsonb)
 AS source(asset_id text, domain text, family_id text, version text, sha256 text, metadata jsonb)
ON CONFLICT (asset_id) DO UPDATE SET domain=EXCLUDED.domain, family_id=EXCLUDED.family_id, version=EXCLUDED.version,
 sha256=EXCLUDED.sha256, metadata=EXCLUDED.metadata, updated_at=now()
WHERE (game_assets.domain, game_assets.family_id, game_assets.version, game_assets.sha256, game_assets.metadata)
 IS DISTINCT FROM (EXCLUDED.domain, EXCLUDED.family_id, EXCLUDED.version, EXCLUDED.sha256, EXCLUDED.metadata)`, values: [JSON.stringify(assets)] },
    { text: `INSERT INTO public.product_game_assets (prd_id, domain, status, family_id, asset_id, reasons)
SELECT prd_id, domain, status, family_id, asset_id, reasons FROM jsonb_to_recordset($1::jsonb)
 AS source(prd_id text, domain text, status text, family_id text, asset_id text, reasons jsonb)
ON CONFLICT (prd_id) DO UPDATE SET domain=EXCLUDED.domain, status=EXCLUDED.status, family_id=EXCLUDED.family_id,
 asset_id=EXCLUDED.asset_id, reasons=EXCLUDED.reasons, updated_at=now()
WHERE (product_game_assets.domain, product_game_assets.status, product_game_assets.family_id, product_game_assets.asset_id, product_game_assets.reasons)
 IS DISTINCT FROM (EXCLUDED.domain, EXCLUDED.status, EXCLUDED.family_id, EXCLUDED.asset_id, EXCLUDED.reasons)`, values: [JSON.stringify(data.products)] },
    { text: `INSERT INTO public.game_asset_imports (source_sha256, asset_count, product_count, status_counts)
VALUES ($1, $2, $3, $4::jsonb) ON CONFLICT (source_sha256) DO NOTHING`, values: [sourceSha256, assets.length, data.products.length, JSON.stringify(data.statusCounts)] },
  ];
}
export function parseAssetCli(args, allowSource = false) {
  const known = new Set(['--check', '--apply']);
  if (args.some(arg => arg.startsWith('--') && !known.has(arg)) || args.filter(arg => arg === '--check').length > 1
    || args.filter(arg => arg === '--apply').length > 1 || (args.includes('--check') && args.includes('--apply'))) reject('Invalid command arguments');
  const paths = args.filter(arg => !arg.startsWith('--'));
  if (paths.length > (allowSource ? 1 : 0)) reject('Invalid source arguments');
  return { apply: args.includes('--apply'), source: paths[0] };
}
