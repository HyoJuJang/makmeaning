import type { Category, DemoHome, IllustrationKey, PresentationRole, PurchaseState, RoomSlot } from '../types/home.ts';

export interface DemoPurchaseSeed {
  id: string;
  purchaseId: string;
  category: Category;
  illustrationKey: IllustrationKey;
  imageUrl: string;
  presentationRole: PresentationRole;
  displayOrder: number;
  roomSlot: RoomSlot;
  purchasedAt: string;
  state: PurchaseState;
}

/** Category-owned fictional purchase events; catalog identity is real, placement is presentation only. */
export const demoCategoryPurchaseSeeds: Record<Category, readonly DemoPurchaseSeed[]> = {
  fashion: [
    { id: '1106041553', purchaseId: 'demo-purchase-knit', category: 'fashion', illustrationKey: 'knit', imageUrl: '/products/knit.svg', presentationRole: 'wardrobe', displayOrder: 1, roomSlot: 'wardrobe-1', purchasedAt: '2026.09.18', state: { wearing: true } },
    { id: '1083830467', purchaseId: 'demo-purchase-shirt', category: 'fashion', illustrationKey: 'shirt', imageUrl: '/products/shirt.svg', presentationRole: 'wardrobe', displayOrder: 2, roomSlot: 'wardrobe-2', purchasedAt: '2026.09.16', state: { wearing: false } },
    { id: '1065577366', purchaseId: 'demo-purchase-polo-knit', category: 'fashion', illustrationKey: 'knit', imageUrl: '/products/knit.svg', presentationRole: 'wardrobe', displayOrder: 3, roomSlot: 'wardrobe-3', purchasedAt: '2026.09.14', state: { wearing: false } },
  ],
  food: [
    { id: '1113622242', purchaseId: 'demo-purchase-milk', category: 'food', illustrationKey: 'milk', imageUrl: '/products/milk.svg', presentationRole: 'fridge', displayOrder: 1, roomSlot: 'fridge-1', purchasedAt: '2026.09.20', state: { quantity: 3 } },
    { id: '1033331215', purchaseId: 'demo-purchase-water', category: 'food', illustrationKey: 'water', imageUrl: '/products/water.svg', presentationRole: 'fridge', displayOrder: 2, roomSlot: 'fridge-2', purchasedAt: '2026.09.20', state: { quantity: 3 } },
    { id: '19026466', purchaseId: 'demo-purchase-vitamin', category: 'food', illustrationKey: 'vitamin', imageUrl: '/products/vitamin.svg', presentationRole: 'pantry', displayOrder: 3, roomSlot: 'pantry-1', purchasedAt: '2026.09.17', state: { quantity: 3 } },
  ],
  living: [
    { id: '32470670', purchaseId: 'demo-purchase-cushion', category: 'living', illustrationKey: 'cushion', imageUrl: '/products/cushion.svg', presentationRole: 'sofa', displayOrder: 1, roomSlot: 'sofa-1', purchasedAt: '2026.09.15', state: {} },
    { id: '1056652878', purchaseId: 'demo-purchase-lamp', category: 'living', illustrationKey: 'lamp', imageUrl: '/products/lamp.svg', presentationRole: 'lamp', displayOrder: 2, roomSlot: 'lamp-1', purchasedAt: '2026.09.12', state: { on: true } },
  ],
  beauty: [
    { id: '16052422', purchaseId: 'demo-purchase-serum', category: 'beauty', illustrationKey: 'serum', imageUrl: '/products/serum.svg', presentationRole: 'vanity', displayOrder: 1, roomSlot: 'vanity-1', purchasedAt: '2026.09.19', state: { featured: true } },
    { id: '1088835047', purchaseId: 'demo-purchase-cream', category: 'beauty', illustrationKey: 'cream', imageUrl: '/products/cream.svg', presentationRole: 'shelf', displayOrder: 2, roomSlot: 'vanity-2', purchasedAt: '2026.09.19', state: { featured: false } },
  ],
};

/** Compatibility export for existing tests and CI seeding; category sources own these records. */
export const demoPurchaseSeeds: readonly DemoPurchaseSeed[] = Object.values(demoCategoryPurchaseSeeds).flat();

export const demoUser: DemoHome['user'] = { id: 'demo-user', name: '민서', avatarId: 'short' };
export const demoDisclosure: DemoHome['demo'] = {
  isDemo: true,
  ownership: 'fictional',
  quantities: 'demo-remaining',
  illustrations: 'not-product-appearance-or-fitting',
  notice: '실상품 카탈로그와 연결한 가상 사용자의 구매·보유 데모입니다. 가격은 카탈로그 참고가, 잔량은 데모 수량입니다. 공간의 그림은 실제 상품 외형이나 가상 피팅을 재현하지 않습니다.',
};
