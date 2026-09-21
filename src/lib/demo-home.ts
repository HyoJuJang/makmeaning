import { demoDisclosure, demoCategoryPurchaseSeeds, demoUser } from '../data/demo-purchases.ts';
import type { Category, CategoryCollections, CategoryCollection, DemoHome, Purchase } from '../types/home.ts';
import { ProductApiError } from './products/contracts.ts';
import type { ProductRepository } from './products/contracts.ts';

type ReadCatalog = Pick<ProductRepository, 'find'>;

/** Read-only category source join. Room geometry never chooses catalog products. */
export async function resolveCategoryCollections(repository: ReadCatalog): Promise<CategoryCollections> {
  const categories = await Promise.all((Object.keys(demoCategoryPurchaseSeeds) as Category[]).map(async category => {
    const ownedProducts: Purchase[] = await Promise.all(demoCategoryPurchaseSeeds[category].map(async seed => {
      const product = await repository.find(seed.id);
      if (!product || product.prd_id !== seed.id || product.domain !== category || seed.category !== category) {
        throw new ProductApiError(503, 'DEMO_CATALOG_MISMATCH', '내 공간에 연결된 상품을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      }
      return {
        ...seed,
        category: product.domain,
        name: product.view_name,
        price: product.discprice,
        state: { ...seed.state },
        catalogDetails: { cate1_nm: product.cate1_nm, cate2_nm: product.cate2_nm, cate3_nm: product.cate3_nm, cate4_nm: product.cate4_nm, brand_name: product.brand_name },
        catalogSource: 'shared-products' as const,
        imageKind: 'illustration' as const,
        priceKind: 'catalog-reference' as const,
      };
    }));
    const collection: CategoryCollection = { category, user: { ...demoUser }, ownedProducts };
    return [category, collection] as const;
  }));
  return Object.fromEntries(categories) as CategoryCollections;
}

/** Legacy home shape is only a projection of the authoritative category collections. */
export function projectDemoHome(categories: CategoryCollections): DemoHome {
  return { user: { ...categories.fashion.user }, categories,
    purchases: Object.values(categories).flatMap(collection => collection.ownedProducts),
    demo: { ...demoDisclosure } };
}

export async function resolveDemoHome(repository: ReadCatalog): Promise<DemoHome> {
  return projectDemoHome(await resolveCategoryCollections(repository));
}

export async function demoHomeResponse(getRepository: () => ReadCatalog): Promise<Response> {
  try {
    return Response.json(await resolveDemoHome(getRepository()), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // Driver errors may contain credentials. Only explicitly safe application errors may leave the server.
    const known = error instanceof ProductApiError;
    return Response.json({ error: {
      code: known ? error.code : 'DEMO_CATALOG_UNAVAILABLE',
      message: known ? error.message : '상품 정보를 불러오지 못해 내 공간을 열 수 없습니다. 잠시 후 다시 시도해 주세요.',
    } }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
