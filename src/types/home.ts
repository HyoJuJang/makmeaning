export type Category = 'fashion' | 'food' | 'living' | 'beauty';

export type RoomSlot =
  | 'wardrobe-1' | 'wardrobe-2' | 'wardrobe-3' | 'fridge-1' | 'fridge-2' | 'pantry-1'
  | 'sofa-1' | 'lamp-1' | 'vanity-1' | 'vanity-2';

export type IllustrationKey = 'knit' | 'shirt' | 'milk' | 'water' | 'vitamin' | 'cushion' | 'lamp' | 'serum' | 'cream';

export interface DemoUser {
  id: string;
  name: string;
  avatarId: string;
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
  purchasedAt: string;
  illustrationKey: IllustrationKey;
  state: PurchaseState;
  catalogSource: 'shared-products';
  imageKind: 'illustration';
  priceKind: 'catalog-reference';
}

export interface DemoHome {
  user: DemoUser;
  purchases: Purchase[];
  demo: {
    isDemo: true;
    ownership: 'fictional';
    quantities: 'demo-remaining';
    illustrations: 'not-product-appearance-or-fitting';
    notice: string;
  };
}
