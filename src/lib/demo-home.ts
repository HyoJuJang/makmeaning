import { demoDisclosure, demoPurchaseSeeds, demoUser } from '../data/demo-purchases.ts';
import type { DemoHome } from '../types/home.ts';
import { ProductApiError } from './products/contracts.ts';
import type { ProductRepository } from './products/contracts.ts';

type ReadCatalog = Pick<ProductRepository, 'find'>;

/** Read-only join: a catalog edit is visible on the next request, never copied into ownership. */
export async function resolveDemoHome(repository: ReadCatalog): Promise<DemoHome> {
  const purchases = await Promise.all(demoPurchaseSeeds.map(async seed => {
    const product = await repository.find(seed.id);
    if (!product || product.prd_id !== seed.id || product.domain !== seed.category) {
      throw new ProductApiError(503, 'DEMO_CATALOG_MISMATCH', '내 공간에 연결된 상품을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.');
    }
    return {
      ...seed,
      category: product.domain,
      name: product.view_name,
      price: product.discprice,
      state: { ...seed.state },
      imageUrl: `/products/${seed.illustrationKey}.svg`,
      catalogSource: 'shared-products' as const,
      imageKind: 'illustration' as const,
      priceKind: 'catalog-reference' as const,
    };
  }));
  return { user: { ...demoUser }, purchases, demo: { ...demoDisclosure } };
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
