export type Category = 'fashion' | 'food' | 'living' | 'beauty';

export type RoomSlot =
  | 'wardrobe-1'
  | 'wardrobe-2'
  | 'fridge-1'
  | 'fridge-2'
  | 'pantry-1'
  | 'sofa-1'
  | 'lamp-1'
  | 'vanity-1'
  | 'vanity-2';

export interface DemoUser {
  id: string;
  name: string;
  avatarId: string;
}

export interface PurchaseState {
  wearing?: boolean;
  quantity?: number;
  on?: boolean;
  featured?: boolean;
}

export interface Purchase {
  id: string;
  category: Category;
  name: string;
  /** Illustrative price in KRW; this is not a live merchant price. */
  price: number;
  imageUrl: string;
  roomSlot: RoomSlot;
  purchasedAt: string;
  illustrationKey: string;
  state: PurchaseState;
}

export interface DemoHome {
  user: DemoUser;
  purchases: Purchase[];
}
