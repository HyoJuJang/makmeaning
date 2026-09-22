import { demoHome } from './demo-home.ts';
import type { CategoryCollection, DemoHome } from '../types/home.ts';
import { adaptCatalogProducts } from '../lib/catalog.ts';
import type { CatalogCategory, CatalogProduct, DemoCatalog } from '../types/catalog.ts';

function categoryRows(collection: CategoryCollection): CatalogProduct[] {
  return collection.ownedProducts.map(purchase => ({
    prd_id: purchase.id, view_name: purchase.name, price: purchase.price,
    cate1_nm: purchase.catalogDetails?.cate1_nm ?? (collection.category === 'food' ? '식품' : '뷰티'),
    cate2_nm: purchase.catalogDetails?.cate2_nm ?? '', cate3_nm: purchase.catalogDetails?.cate3_nm ?? '',
    cate4_m: purchase.catalogDetails?.cate4_nm ?? '', brd_mn: purchase.catalogDetails?.brand_name ?? '',
    domain: collection.category === 'food' ? '푸드' : '뷰티',
  }));
}

/** Category collection is primary; home is included only for shared-avatar compatibility. */
export function buildDemoCatalog(collection: CategoryCollection, home: DemoHome): DemoCatalog {
  if (collection.category !== 'food' && collection.category !== 'beauty') throw new Error('Unsupported catalog category');
  const category = collection.category;
  const purchased = collection.ownedProducts;
  const ownedPresentation = Object.fromEntries(purchased.map(purchase => [purchase.id, {
    shortName: purchase.name,
    illustrationKey: purchase.illustrationKey,
    imageUrl: purchase.imageUrl,
    imageKind: purchase.imageKind,
    catalogSource: 'shared-products' as const,
  }]));
  return {
    category,
    collection: structuredClone(collection),
    home: structuredClone(home),
    user: { ...home.user },
    initialOutfitId: home.categories.fashion.ownedProducts.find(purchase => purchase.state.wearing === true)?.illustrationKey,
    products: adaptCatalogProducts(categoryRows(collection), ownedPresentation),
    purchases: purchased.map(purchase => ({ productId: purchase.id, purchaseId: purchase.purchaseId, purchasedAt: purchase.purchasedAt })),
    initialCart: [],
  };
}

/** Deterministic fixtures only. Routes resolve live shared products before calling buildDemoCatalog. */
export const demoCatalogRows: Record<CatalogCategory, CatalogProduct[]> = {
  food: categoryRows(demoHome.categories.food),
  beauty: categoryRows(demoHome.categories.beauty),
};
export const demoCatalogs: Record<CatalogCategory, DemoCatalog> = {
  food: buildDemoCatalog(demoHome.categories.food, demoHome),
  beauty: buildDemoCatalog(demoHome.categories.beauty, demoHome),
};
