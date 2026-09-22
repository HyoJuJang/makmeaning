import { demoPersonaIdFromRequest, getDemoPersona, getDemoPersonaSummaries } from '../data/demo-personas.ts';
import { demoDisclosure } from '../data/demo-purchases.ts';
import type { Category, CategoryCollections, CategoryCollection, DemoHome, Purchase } from '../types/home.ts';
import { ProductApiError } from './products/contracts.ts';
import type { ProductRepository } from './products/contracts.ts';

import { readyGameAsset } from './game-product-display.ts';
import type { AssetLookup } from './remote-game-assets.ts';

type ReadCatalog = Pick<ProductRepository, 'find'>;

/** Read-only category source join. Room geometry never chooses catalog products. */
export async function resolveCategoryCollections(repository: ReadCatalog, personaId?: string, lookup?: AssetLookup): Promise<CategoryCollections> {
  const persona = getDemoPersona(personaId);
  const user = { id: persona.id, name: persona.name, avatarId: persona.avatarId };
  const categories = await Promise.all((['fashion', 'food', 'living', 'beauty'] as Category[]).map(async category => {
    const ownedProducts: Purchase[] = await Promise.all(persona.purchases.filter(seed => seed.category === category).map(async seed => {
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
        gameAsset: lookup ? null : readyGameAsset(product.prd_id, product.domain),
        catalogDetails: { cate1_nm: product.cate1_nm, cate2_nm: product.cate2_nm, cate3_nm: product.cate3_nm, cate4_nm: product.cate4_nm, brand_name: product.brand_name },
        catalogMetadata: { cate1_nm: product.cate1_nm ?? '', cate2_nm: product.cate2_nm ?? '', cate3_nm: product.cate3_nm ?? '', cate4_m: product.cate4_nm ?? '', brd_mn: product.brand_name ?? '' },
        catalogSource: 'shared-products' as const,
        imageKind: 'product-photo' as const,
        priceKind: 'catalog-reference' as const,
      };
    }));
    const collection: CategoryCollection = { category, user: { ...user }, ownedProducts };
    return [category, collection] as const;
  }));
  const result = Object.fromEntries(categories) as CategoryCollections;
  if (lookup) {
    const products = categories.flatMap(([, collection]) => collection.ownedProducts);
    const mappings = await lookup(products.map(product => product.id));
    const byId = new Map(mappings.map(mapping => [mapping.prd_id, mapping]));
    if (byId.size !== mappings.length) throw new Error('Duplicate asset mapping');
    for (const product of products) {
      const mapping = byId.get(product.id);
      product.gameAsset = mapping?.status === 'ready' && mapping.domain === product.category && mapping.asset?.domain === product.category ? mapping.asset : null;
    }
  }
  return result;
}

/** Legacy home shape is only a projection of the authoritative category collections. */
export function projectDemoHome(categories: CategoryCollections): DemoHome {
  return { user: { ...categories.fashion.user }, categories, ...(categories.fashion.user.id.startsWith('demo-') && categories.fashion.user.id !== 'demo-user' ? { personas: getDemoPersonaSummaries() } : {}),
    purchases: Object.values(categories).flatMap(collection => collection.ownedProducts),
    demo: { ...demoDisclosure } };
}

export async function resolveDemoHome(repository: ReadCatalog, personaId?: string, lookup?: AssetLookup): Promise<DemoHome> {
  return projectDemoHome(await resolveCategoryCollections(repository, personaId, lookup));
}

export async function demoHomeResponse(getRepository: () => ReadCatalog, request?: Request, lookup?: AssetLookup): Promise<Response> {
  try {
    return Response.json(await resolveDemoHome(getRepository(), demoPersonaIdFromRequest(request), lookup), { headers: { 'Cache-Control': 'no-store', Vary: 'Cookie' } });
  } catch (error) {
    // Driver errors may contain credentials. Only explicitly safe application errors may leave the server.
    const known = error instanceof ProductApiError;
    return Response.json({ error: {
      code: known ? error.code : 'DEMO_CATALOG_UNAVAILABLE',
      message: known ? error.message : '상품 정보를 불러오지 못해 내 공간을 열 수 없습니다. 잠시 후 다시 시도해 주세요.',
    } }, { status: 503, headers: { 'Cache-Control': 'no-store', Vary: 'Cookie' } });
  }
}
