import { ProductApiError } from './products/contracts.ts';
import type { ProductRepository } from './products/contracts.ts';
import type { ProductDomain } from '../types/product.ts';
import type { DisplayProduct } from '../types/catalog.ts';
import type { AssetLookup } from './remote-game-assets.ts';

const categories = new Set(['fashion', 'food', 'living', 'beauty']);
const headers = { 'Cache-Control': 'no-store' };

/** Read-only, canonical hydration of personal cart IDs. This never creates ownership. */
export async function commerceProductsResponse(request: Request, repository: () => Pick<ProductRepository, 'find'>, lookup?: AssetLookup): Promise<Response> {
  try {
    const params = new URL(request.url).searchParams;
    const category = params.get('category');
    const raw = params.get('ids') ?? '';
    if ([...params.keys()].some(key => !['category', 'ids'].includes(key) || params.getAll(key).length !== 1)
      || !category || !categories.has(category)) throw new ProductApiError(400, 'INVALID_QUERY', '올바른 카테고리와 상품 코드를 선택해 주세요.');
    const requested = raw ? raw.split(',') : [];
    if (requested.length > 50 || requested.some(id => !/^[0-9]{1,64}$/.test(id))) throw new ProductApiError(400, 'INVALID_PRODUCT_IDS', '실상품 코드를 최대 50개까지 조회할 수 있어요.');
    const ids = [...new Set(requested)];
    if (!ids.length) return Response.json({ category, products: [] }, { headers });
    const source = repository();
    const products: DisplayProduct[] = [];
    for (let offset = 0; offset < ids.length; offset += 6) {
      const batch = await Promise.all(ids.slice(offset, offset + 6).map(async id => {
        const row = await source.find(id);
        if (!row || row.prd_id !== id || row.domain !== category) return null;
        return {
          id: row.prd_id, prd_id: row.prd_id, name: row.view_name, view_name: row.view_name,
          shortName: row.view_name, price: row.discprice,
          cate1_nm: row.cate1_nm ?? '', cate2_nm: row.cate2_nm ?? '', cate3_nm: row.cate3_nm ?? '',
          cate4_m: row.cate4_nm ?? '', brd_mn: row.brand_name ?? '', domain: row.domain,
          imageUrl: `https://asset.m-gs.kr/prod/${encodeURIComponent(row.prd_id)}/1/550`,
          illustrationKey: row.prd_id, imageKind: 'product-photo' as const,
          catalogSource: 'shared-products' as const, priceKind: 'catalog-reference' as const,
          gameAsset: null,
        } satisfies DisplayProduct;
      }));
      products.push(...batch.filter((product): product is NonNullable<typeof product> => product !== null));
    }
    if (lookup && products.length) {
      try {
        const rows = await lookup(products.map(product => product.id));
        const mappings = new Map(rows.map(row => [row.prd_id, row]));
        if (mappings.size !== rows.length || rows.some(row => !products.some(product => product.id === row.prd_id))) throw new Error('Invalid artwork mapping');
        for (const product of products) {
          const mapping = mappings.get(product.id), asset = mapping?.asset;
          if (mapping?.status === 'ready' && mapping.domain === category && asset?.domain === category
            && asset.status === 'ready' && mapping.assetId === asset.id && mapping.familyId === asset.familyId) product.gameAsset = asset;
        }
      } catch { /* Artwork availability cannot erase a verified real cart product. */ }
    }
    return Response.json({ category: category as ProductDomain, products }, { headers });
  } catch (error) {
    const known = error instanceof ProductApiError;
    return Response.json({ error: {
      code: known ? error.code : 'CATALOG_UNAVAILABLE',
      message: known ? error.message : '상품을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',
    } }, { status: known ? error.status : 503, headers });
  }
}
