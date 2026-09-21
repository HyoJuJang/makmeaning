import { buildDemoCatalog } from '../data/demo-catalog.ts';
import type { CatalogCategory } from '../types/catalog.ts';
import { resolveDemoHome } from './demo-home.ts';
import { ProductApiError } from './products/contracts.ts';
import type { ProductRepository } from './products/contracts.ts';

/** Home and category resolve the same read-only ownership/catalog join, with no fixture fallback. */
export async function demoCatalogResponse(category: CatalogCategory, getRepository: () => Pick<ProductRepository, 'find'>): Promise<Response> {
  try {
    const home = await resolveDemoHome(getRepository());
    return Response.json(buildDemoCatalog(category, home), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const known = error instanceof ProductApiError;
    return Response.json({ error: {
      code: known ? error.code : 'DEMO_CATALOG_UNAVAILABLE',
      message: known ? error.message : '구매 상품을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
    } }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
