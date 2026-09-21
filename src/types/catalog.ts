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
}

export interface DisplayProduct extends CatalogProduct {
  id: string;
  name: string;
  shortName: string;
  imageUrl: string;
}

/** Quantity is a shopping choice, never an inferred product size or inventory. */
export interface CartLine {
  productId: string;
  quantity: number;
}

export interface DemoCatalog {
  category: CatalogCategory;
  user: { id: string; name: string; avatarId: string };
  products: DisplayProduct[];
  /** Historical events do not assert current possession. */
  purchases: { productId: string; purchasedAt: string }[];
  initialCart: CartLine[];
}

export interface CatalogState {
  cart: CartLine[];
  savedProductIds: string[];
}

export interface StoredCatalogState extends CatalogState {
  version: 1;
}
