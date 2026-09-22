import 'server-only';
import { neon } from '@neondatabase/serverless';
import { assetDatabaseUrl, mapAssetProduct, publicAsset, safeCount, validateAssetId, validateAssetProductId, validateResolveIds } from './contracts.ts';
import type { AssetRepository } from './contracts.ts';
import { assetByIdQuery, assetListQueries, assetProductsQuery } from './queries.ts';
import { assetBaseOrigin, assetWithBaseUrl, mappingWithBaseUrl } from './image-origin.ts';

/** Separate read-only connection. No import-time secret access or product-DB fallback. */
export function getAssetRepository(): AssetRepository {
  const sql = neon(assetDatabaseUrl(process.env), { fetchOptions: { cache: 'no-store', signal: AbortSignal.timeout(10000) } });
  const origin = assetBaseOrigin(process.env.ASSET_BASE_URL);
  const mapping = (row: Record<string, unknown>) => mappingWithBaseUrl(mapAssetProduct(row), origin);
  return {
    async list(filters) {
      const { page, count } = assetListQueries(filters);
      const [rows, totals] = await sql.transaction([sql.query(page.text, page.values), sql.query(count.text, count.values)],
        { isolationLevel: 'RepeatableRead', readOnly: true });
      return { products: rows.map(mapping), pagination: { limit: filters.limit, offset: filters.offset, total: safeCount(totals[0]?.total) } };
    },
    async find(id) {
      const query = assetProductsQuery([validateAssetProductId(id)]);
      const rows = await sql.query(query.text, query.values);
      return rows[0] ? mapping(rows[0]) : null;
    },
    async findMany(ids) {
      if (ids.length === 0) return [];
      const query = assetProductsQuery(validateResolveIds(ids));
      const rows = await sql.query(query.text, query.values);
      return rows.map(mapping);
    },
    async findAsset(id) {
      const query = assetByIdQuery(validateAssetId(id));
      const rows = await sql.query(query.text, query.values);
      return rows[0] ? assetWithBaseUrl(publicAsset(rows[0].metadata), origin) : null;
    },
  };
}
