import { buildDemoCatalog } from '../data/demo-catalog.ts';
import type { CatalogCategory } from '../types/catalog.ts';
import { projectDemoHome, resolveCategoryCollections } from './demo-home.ts';
import { ProductApiError } from './products/contracts.ts';
import type { ProductRepository } from './products/contracts.ts';
import type { AssetLookup } from './remote-game-assets.ts';
import type { DemoPurchaseSource } from '../data/demo-purchases.ts';

/** Category owns its source; home is an additive compatibility projection of the same join. */
export async function demoCatalogResponse(category: CatalogCategory, getRepository: () => Pick<ProductRepository, 'find'>, lookup?: AssetLookup, source?: DemoPurchaseSource): Promise<Response> {
  try {
    const collections = await resolveCategoryCollections(getRepository(), lookup, source);
    const catalog = buildDemoCatalog(collections[category], projectDemoHome(collections, source?.personas));
    catalog.products = catalog.products.map(product => ({ ...product,
      gameAsset: product.catalogSource === 'shared-products' ? collections[category].ownedProducts.find(owned => owned.id === product.prd_id)?.gameAsset ?? null : null,
    }));
    return Response.json(catalog, { headers: { 'Cache-Control': 'no-store', Vary: 'Cookie' } });
  } catch (error) {
    const known = error instanceof ProductApiError;
    return Response.json({ error: {
      code: known ? error.code : 'DEMO_CATALOG_UNAVAILABLE',
      message: known ? error.message : '구매 상품을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
    } }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
