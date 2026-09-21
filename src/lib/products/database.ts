import 'server-only';
import { neon } from '@neondatabase/serverless';
import { databaseUrl, mapProduct, safeNonnegativeInteger } from './contracts.ts';
import type { ProductRepository } from './contracts.ts';
import { productByIdQuery, productListQueries } from './queries.ts';

/** Called per request; importing routes/building never requires a database secret. */
export function getProductRepository(): ProductRepository {
  const sql = neon(databaseUrl(process.env), {
    fetchOptions: { cache: 'no-store', signal: AbortSignal.timeout(10000) },
  });
  return {
    async list(filters) {
      const { page, count } = productListQueries(filters);
      // One snapshot keeps pagination accurate when teammates import concurrently.
      const [rows, totals] = await sql.transaction([
        sql.query(page.text, page.values),
        sql.query(count.text, count.values),
      ], { isolationLevel: 'RepeatableRead', readOnly: true });
      return {
        products: rows.map(mapProduct),
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: safeNonnegativeInteger(totals[0]?.total),
        },
      };
    },
    async find(prdId) {
      const query = productByIdQuery(prdId);
      const rows = await sql.query(query.text, query.values);
      return rows[0] ? mapProduct(rows[0]) : null;
    },
  };
}
