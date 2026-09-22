export type Category = 'fashion' | 'food' | 'living' | 'beauty';

/** Legacy room placement metadata; never determines category ownership or selection. */
export type RoomSlot = `${'wardrobe' | 'fridge' | 'pantry' | 'sofa' | 'lamp' | 'vanity'}-${number}`;
export type PresentationRole = 'wardrobe' | 'fridge' | 'pantry' | 'sofa' | 'lamp' | 'vanity' | 'shelf';

export type IllustrationKey = 'knit' | 'shirt' | 'garment' | 'milk' | 'water' | 'vitamin' | 'cushion' | 'lamp' | 'serum' | 'cream';

export interface DemoUser {
  id: string;
  name: string;
  avatarId: string;
}

export interface DemoPersonaSummary extends DemoUser {
  theme: string;
}

/** A fictional customer's confirmed state, never a mutation of catalog data. */
export interface PurchaseState {
  wearing?: boolean;
  quantity?: number;
  on?: boolean;
  featured?: boolean;
}

export interface Purchase {
  /** Canonical public.products.prd_id, shared with GET /api/products/:prdId. */
  id: string;
  /** Fictional purchase event, distinct from the catalog identity. */
  purchaseId: string;
  category: Category;
  name: string;
  /** Current catalog reference price in KRW, not a paid purchase price. */
  price: number;
  imageUrl: string;
  roomSlot: RoomSlot;
  /** Category-owned presentation semantics, independent of either screen's coordinates. */
  presentationRole: PresentationRole;
  displayOrder: number;
  purchasedAt: string;
  illustrationKey: IllustrationKey;
  state: PurchaseState;
  catalogSource: 'shared-products';
  imageKind: 'illustration' | 'product-photo';
  priceKind: 'catalog-reference';
  /** Optional catalog extraction metadata, never inferred from the generic illustration. */
  catalogMetadata?: { cate1_nm: string; cate2_nm: string; cate3_nm: string; cate4_m: string; brd_mn: string; };
  catalogDetails?: {
    cate1_nm: string | null; cate2_nm: string | null; cate3_nm: string | null;
    cate4_nm: string | null; brand_name: string | null;
  };
}

/** Primary owned-product source shared by a category hero and its room mirror. */
export interface CategoryCollection {
  category: Category;
  user: DemoUser;
  ownedProducts: Purchase[];
}
export type CategoryCollections = Record<Category, CategoryCollection>;

export interface CategoryProductEntry {
  id: string;
  productId: string;
  product: Purchase;
  category: Category;
  status: 'owned' | 'applied' | 'consumed';
  remaining: number | null;
  featured: boolean;
  on: boolean | null;
  displayIndex: number;
  presentationRole: PresentationRole;
  imageUrl: string;
  illustrationKey: IllustrationKey;
  artVisible: boolean;
}

export interface DemoHome {
  user: DemoUser;
  personas?: DemoPersonaSummary[];
  categories: CategoryCollections;
  /** Compatibility projection of categories' ownedProducts, not an independent source. */
  purchases: Purchase[];
  demo: {
    isDemo: true;
    ownership: 'fictional';
    quantities: 'demo-remaining';
    illustrations: 'not-product-appearance-or-fitting';
    notice: string;
  };
}
