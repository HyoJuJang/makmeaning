import { demoHome } from './demo-home.ts';
import type { CategoryCollection, DemoHome } from '../types/home.ts';
import { adaptCatalogProducts } from '../lib/catalog.ts';
import type { CatalogCategory, CatalogProduct, DemoCatalog, ProductPresentation } from '../types/catalog.ts';

function categoryRows(collection: CategoryCollection): CatalogProduct[] {
  return collection.ownedProducts.map(purchase => ({
    prd_id: purchase.id, view_name: purchase.name, price: purchase.price,
    cate1_nm: purchase.catalogDetails?.cate1_nm ?? (collection.category === 'food' ? '식품' : '뷰티'),
    cate2_nm: purchase.catalogDetails?.cate2_nm ?? '', cate3_nm: purchase.catalogDetails?.cate3_nm ?? '',
    cate4_m: purchase.catalogDetails?.cate4_nm ?? '', brd_mn: purchase.catalogDetails?.brand_name ?? '',
    domain: collection.category === 'food' ? '푸드' : '뷰티',
  }));
}

/** Existing fictional examples stay separate from the purchased shared catalog items. */
const fictionalRows: Record<CatalogCategory, CatalogProduct[]> = {
  food: [
    { prd_id: 'pasta', view_name: '듀럼밀 스파게티', price: 3800, cate1_nm: '식품', cate2_nm: '면류', cate3_nm: '파스타면', cate4_m: '', brd_mn: '', domain: '푸드' },
    { prd_id: 'tomato', view_name: '토마토 바질 파스타소스', price: 4500, cate1_nm: '식품', cate2_nm: '소스', cate3_nm: '파스타소스', cate4_m: '', brd_mn: '', domain: '푸드' },
    { prd_id: 'mushroom', view_name: '향긋한 양송이버섯', price: 2900, cate1_nm: '식품', cate2_nm: '채소', cate3_nm: '버섯', cate4_m: '', brd_mn: '', domain: '푸드' },
    { prd_id: 'olive-oil', view_name: '엑스트라 버진 올리브오일', price: 8900, cate1_nm: '식품', cate2_nm: '조미료', cate3_nm: '식용유', cate4_m: '', brd_mn: '', domain: '푸드' },
    { prd_id: 'rice', view_name: '한 끼 즉석밥', price: 1800, cate1_nm: '식품', cate2_nm: '간편식', cate3_nm: '즉석밥', cate4_m: '', brd_mn: '', domain: '푸드' },
    { prd_id: 'egg', view_name: '신선한 달걀', price: 3900, cate1_nm: '식품', cate2_nm: '축산', cate3_nm: '달걀', cate4_m: '', brd_mn: '', domain: '푸드' },
  ],
  beauty: [
    { prd_id: 'cleanser', view_name: '데일리 페이스 클렌저', price: 14900, cate1_nm: '뷰티', cate2_nm: '스킨케어', cate3_nm: '클렌저', cate4_m: '', brd_mn: '', domain: '뷰티' },
    { prd_id: 'sunscreen', view_name: '데일리 선크림', price: 17900, cate1_nm: '뷰티', cate2_nm: '스킨케어', cate3_nm: '선크림', cate4_m: '', brd_mn: '', domain: '뷰티' },
  ],
};

/** Existing local illustrations are display examples, not product photographs. */
const presentation: Record<string, ProductPresentation> = {
  milk: { shortName: '우유', imageUrl: '/products/milk.svg' },
  water: { shortName: '생수', imageUrl: '/products/water.svg' },
  vitamin: { shortName: '멀티비타민', imageUrl: '/products/vitamin.svg' },
  pasta: { shortName: '파스타면', imageUrl: '/food/products/pasta.svg' },
  tomato: { shortName: '토마토소스', imageUrl: '/food/products/tomato.svg' },
  mushroom: { shortName: '양송이버섯', imageUrl: '/food/products/mushroom.svg' },
  'olive-oil': { shortName: '올리브오일', imageUrl: '/food/products/olive-oil.svg' },
  rice: { shortName: '즉석밥', imageUrl: '/food/products/rice.svg' },
  egg: { shortName: '달걀', imageUrl: '/food/products/egg.svg' },
  serum: { shortName: '세럼', imageUrl: '/products/serum.svg' },
  cream: { shortName: '크림', imageUrl: '/products/cream.svg' },
  cleanser: { shortName: '클렌저', imageUrl: '/products/serum.svg' },
  sunscreen: { shortName: '선크림', imageUrl: '/products/cream.svg' },
};

/** Category collection is primary; home is included only for shared-avatar compatibility. */
export function buildDemoCatalog(collection: CategoryCollection, home: DemoHome): DemoCatalog {
  if (collection.category !== 'food' && collection.category !== 'beauty') throw new Error('Unsupported catalog category');
  const category = collection.category;
  const purchased = collection.ownedProducts;
  const ownedPresentation = Object.fromEntries(purchased.map(purchase => [purchase.id, {
    ...presentation[purchase.illustrationKey],
    illustrationKey: purchase.illustrationKey,
    imageUrl: purchase.imageUrl,
    catalogSource: 'shared-products' as const,
  }]));
  const examplePresentation = Object.fromEntries(fictionalRows[category].map(row => [row.prd_id, {
    ...presentation[row.prd_id], illustrationKey: row.prd_id, catalogSource: 'fictional-example' as const,
  }]));
  return {
    category,
    collection: structuredClone(collection),
    home: structuredClone(home),
    user: { ...home.user },
    initialOutfitId: home.categories.fashion.ownedProducts.find(purchase => purchase.state.wearing === true)?.illustrationKey,
    products: adaptCatalogProducts([...categoryRows(collection), ...fictionalRows[category]], { ...examplePresentation, ...ownedPresentation }),
    purchases: purchased.map(purchase => ({ productId: purchase.id, purchaseId: purchase.purchaseId, purchasedAt: purchase.purchasedAt })),
    initialCart: [],
  };
}

/** Deterministic fixtures only. Routes resolve live shared products before calling buildDemoCatalog. */
export const demoCatalogRows: Record<CatalogCategory, CatalogProduct[]> = {
  food: [...categoryRows(demoHome.categories.food), ...fictionalRows.food],
  beauty: [...categoryRows(demoHome.categories.beauty), ...fictionalRows.beauty],
};
export const demoCatalogs: Record<CatalogCategory, DemoCatalog> = {
  food: buildDemoCatalog(demoHome.categories.food, demoHome),
  beauty: buildDemoCatalog(demoHome.categories.beauty, demoHome),
};
