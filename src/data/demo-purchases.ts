import type { Category, DemoHome, IllustrationKey, PurchaseState, RoomSlot } from '../types/home.ts';

export interface DemoPurchaseSeed {
  id: string;
  purchaseId: string;
  category: Category;
  illustrationKey: IllustrationKey;
  roomSlot: RoomSlot;
  purchasedAt: string;
  state: PurchaseState;
}

/** Only this private-to-the-demo ownership map is fictional; IDs refer to the shared catalog. */
export const demoPurchaseSeeds: readonly DemoPurchaseSeed[] = [
  { id: '1106041553', purchaseId: 'demo-purchase-knit', category: 'fashion', illustrationKey: 'knit', roomSlot: 'wardrobe-1', purchasedAt: '2026.09.18', state: { wearing: true } },
  { id: '1083830467', purchaseId: 'demo-purchase-shirt', category: 'fashion', illustrationKey: 'shirt', roomSlot: 'wardrobe-2', purchasedAt: '2026.09.16', state: { wearing: false } },
  { id: '1113622242', purchaseId: 'demo-purchase-milk', category: 'food', illustrationKey: 'milk', roomSlot: 'fridge-1', purchasedAt: '2026.09.20', state: { quantity: 3 } },
  { id: '1033331215', purchaseId: 'demo-purchase-water', category: 'food', illustrationKey: 'water', roomSlot: 'fridge-2', purchasedAt: '2026.09.20', state: { quantity: 3 } },
  { id: '19026466', purchaseId: 'demo-purchase-vitamin', category: 'food', illustrationKey: 'vitamin', roomSlot: 'pantry-1', purchasedAt: '2026.09.17', state: { quantity: 3 } },
  { id: '32470670', purchaseId: 'demo-purchase-cushion', category: 'living', illustrationKey: 'cushion', roomSlot: 'sofa-1', purchasedAt: '2026.09.15', state: {} },
  { id: '1056652878', purchaseId: 'demo-purchase-lamp', category: 'living', illustrationKey: 'lamp', roomSlot: 'lamp-1', purchasedAt: '2026.09.12', state: { on: true } },
  { id: '16052422', purchaseId: 'demo-purchase-serum', category: 'beauty', illustrationKey: 'serum', roomSlot: 'vanity-1', purchasedAt: '2026.09.19', state: { featured: true } },
  { id: '1088835047', purchaseId: 'demo-purchase-cream', category: 'beauty', illustrationKey: 'cream', roomSlot: 'vanity-2', purchasedAt: '2026.09.19', state: { featured: false } },
];

export const demoUser: DemoHome['user'] = { id: 'demo-user', name: '민서', avatarId: 'short' };
export const demoDisclosure: DemoHome['demo'] = {
  isDemo: true,
  ownership: 'fictional',
  quantities: 'demo-remaining',
  illustrations: 'not-product-appearance-or-fitting',
  notice: '실상품 카탈로그와 연결한 가상 사용자의 구매·보유 데모입니다. 가격은 카탈로그 참고가, 잔량은 데모 수량입니다. 공간의 그림은 실제 상품 외형이나 가상 피팅을 재현하지 않습니다.',
};
