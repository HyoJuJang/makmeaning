import type { AssetFilters } from './contracts.ts';
export type AssetQuery = { text: string; values: unknown[] };
const fields = 'm.prd_id, m.domain, m.status, m.family_id, m.asset_id, m.reasons, a.metadata AS asset_metadata';
const source = 'public.product_game_assets m LEFT JOIN public.game_assets a ON a.asset_id = m.asset_id AND a.domain = m.domain AND a.family_id = m.family_id';
export function assetListQueries(filters: AssetFilters): { page: AssetQuery; count: AssetQuery } {
  const values: unknown[] = [], clauses: string[] = [];
  if (filters.domain) { values.push(filters.domain); clauses.push(`m.domain = $${values.length}`); }
  if (filters.status) { values.push(filters.status); clauses.push(`m.status = $${values.length}`); }
  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  return { page: { text: `SELECT ${fields} FROM ${source}${where} ORDER BY m.prd_id COLLATE "C" LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, values: [...values, filters.limit, filters.offset] },
    count: { text: `SELECT count(*) AS total FROM public.product_game_assets m${where}`, values } };
}
export function assetProductsQuery(ids: string[]): AssetQuery {
  return { text: `SELECT ${fields} FROM ${source} WHERE m.prd_id = ANY($1::text[]) ORDER BY array_position($1::text[], m.prd_id)`, values: [ids] };
}
export function assetByIdQuery(id: string): AssetQuery {
  return { text: 'SELECT metadata FROM public.game_assets WHERE asset_id = $1', values: [id] };
}
