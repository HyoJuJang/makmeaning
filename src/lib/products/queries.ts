import type { ProductFilters } from './contracts.ts';

const columns = 'prd_id, view_name, cate1_nm, cate2_nm, cate3_nm, cate4_nm, brand_name, discprice, domain, opt1, opt2, opt3, opt4';

export function productListQueries(filters: ProductFilters) {
  const values: (string | number)[] = [];
  const conditions: string[] = [];
  if (filters.domain) {
    values.push(filters.domain);
    conditions.push(`domain = $${values.length}`);
  }
  if (filters.q) {
    // Treat SQL LIKE wildcard characters as literal parts of the search term.
    values.push(`%${filters.q.replace(/[\\%_]/g, '\\$&')}%`);
    conditions.push(`(view_name ILIKE $${values.length} OR brand_name ILIKE $${values.length})`);
  }
  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  return {
    page: {
      text: `SELECT ${columns} FROM public.products${where} ORDER BY prd_id LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      values: [...values, filters.limit, filters.offset],
    },
    count: { text: `SELECT count(*) AS total FROM public.products${where}`, values },
  };
}

export function productByIdQuery(prdId: string) {
  return { text: `SELECT ${columns} FROM public.products WHERE prd_id = $1`, values: [prdId] };
}
