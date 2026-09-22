import type { CategoryCollection, DemoHome } from './home.ts';
import type { GameAsset } from '../lib/game-asset-types.ts';

export type CatalogCategory = 'food' | 'beauty';

/** Exactly the agreed product extraction columns. */
export interface CatalogProduct {
  prd_id: string;
  view_name: string;
  price: number;
  cate1_nm: string;
  cate2_nm: string;
  cate3_nm: string;
  cate4_m: string;
  brd_mn: string;
  domain: string;
}

/** Local presentation only; artwork is not a promised source column. */
export interface ProductPresentation {
  shortName?: string;
  imageUrl?: string;
  illustrationKey?: string;
  imageKind?: 'illustration' | 'product-photo';
  catalogSource?: 'shared-products' | 'fictional-example';
}

export interface DisplayProduct extends CatalogProduct {
  gameAsset?: GameAsset | null;
  id: string;
  name: string;
  shortName: string;
  imageUrl: string;
  illustrationKey: string;
  imageKind: 'illustration' | 'product-photo';
  catalogSource: 'shared-products' | 'fictional-example';
  priceKind: 'catalog-reference' | 'fictional-example';
}

/** Quantity is a shopping choice, never an inferred product size or inventory. */
export interface CartLine {
  productId: string;
  quantity: number;
}

export interface DemoCatalog {
  category: CatalogCategory;
  collection: CategoryCollection;
  /** Same resolved user/purchases as the home API; confirmed personal state is overlaid client-side. */
  home: DemoHome;
  user: { id: string; name: string; avatarId: string };
  /** Illustration key (e.g. knit), NOT a product ID. Fallback artwork before saved appearance restores. */
  initialOutfitId?: string;
  products: DisplayProduct[];
  /** Historical events do not assert current possession. */
  purchases: { productId: string; purchaseId: string; purchasedAt: string }[];
  initialCart: CartLine[];
}

export interface CatalogState {
  cart: CartLine[];
  savedProductIds: string[];
}

export interface StoredCatalogState extends CatalogState {
  version: 1;
}
