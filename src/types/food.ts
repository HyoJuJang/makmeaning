export type FoodIntent = 'all' | 'quick' | 'hearty' | 'morning' | 'outdoor' | 'routine';

/** Only the columns promised by the product extraction contract. */
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

/** Optional local artwork and display copy, separate from source product data. */
export interface FoodProductPresentation {
  shortName?: string;
  imageUrl?: string;
}

export interface FoodProduct extends CatalogProduct {
  id: string;
  name: string;
  shortName: string;
  imageUrl: string;
}

export interface FoodScenario {
  id: string;
  name: string;
  description: string;
  kind: 'meal' | 'routine' | 'outing';
  tags: Exclude<FoodIntent, 'all'>[];
  imageUrl: string;
  /** Curated demo links, not inferred serving sizes or current inventory. */
  products: { productId: string; optional?: boolean }[];
  steps: string[];
}

/** A purchase record never implies current possession or remaining quantity. */
export interface FoodPurchase {
  productId: string;
  purchasedAt: string;
}

/** Quantity is the user's shopping choice, not a product capacity or pack size. */
export interface CartLine {
  productId: string;
  quantity: number;
}

export type FoodProfileId = 'home' | 'new' | 'purchased' | 'cart';

export interface FoodProfile {
  id: FoodProfileId;
  label: string;
  purchases: FoodPurchase[];
  cart: CartLine[];
}

export interface DemoFood {
  user: { id: string; name: string };
  products: FoodProduct[];
  scenarios: FoodScenario[];
  profiles: FoodProfile[];
}

export interface ProductRow {
  product: FoodProduct;
  inCart: number;
  additionalQuantity: number;
  /** Excluded by the user for this scenario; this is not an inventory fact. */
  owned: boolean;
  selected: boolean;
  optional: boolean;
}
