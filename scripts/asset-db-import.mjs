import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { assetDatabaseUrl } from '../src/lib/asset-db/contracts.ts';
import { importQueries, normalizeAssetDataset, parseAssetCli, validateAssetFiles } from './asset-db-data.mjs';
try {
  const { apply, source } = parseAssetCli(process.argv.slice(2), true);
  const bytes = await readFile(source ?? new URL('../src/generated/product-asset-map.json', import.meta.url));
  const data = normalizeAssetDataset(JSON.parse(bytes.toString('utf8')));
  await validateAssetFiles(data, fileURLToPath(new URL('../', import.meta.url)));
  const sourceSha256 = createHash('sha256').update(bytes).digest('hex');
  if (apply) {
    const sql = neon(assetDatabaseUrl(process.env));
    await sql.transaction(importQueries(data, sourceSha256).map(query => sql.query(query.text, query.values)));
  }
  console.log(JSON.stringify({ mode: apply ? 'applied' : 'check', assets: data.assets.length, products: data.products.length,
    statuses: data.statusCounts, sourceSha256, writes: apply, catalogChanged: false }));
} catch {
  console.error('Asset import failed. Check the generated dataset, PNG checksums, migration and ASSET_DATABASE_URL. No partial import is committed; connection details are not logged.');
  process.exitCode = 1;
}
