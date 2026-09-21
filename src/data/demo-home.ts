import type { DemoHome } from '../types/home.ts';

// Fictional customer, purchases, names and prices for the interactive demo.
// These records are not scraped from GS SHOP and do not describe a real account.
export const demoHome: DemoHome = {
  user: { id: 'demo-user', name: '민서', avatarId: 'short' },
  purchases: [
    {
      id: 'knit', category: 'fashion', name: '데일리 크림 니트', price: 39000,
      imageUrl: '/products/knit.svg', roomSlot: 'wardrobe-1',
      purchasedAt: '2026.09.18', illustrationKey: 'knit', state: { wearing: true },
    },
    {
      id: 'shirt', category: 'fashion', name: '코튼 블루 셔츠', price: 32000,
      imageUrl: '/products/shirt.svg', roomSlot: 'wardrobe-2',
      purchasedAt: '2026.09.16', illustrationKey: 'shirt', state: { wearing: false },
    },
    {
      id: 'milk', category: 'food', name: '아침을 여는 우유', price: 6900,
      imageUrl: '/products/milk.svg', roomSlot: 'fridge-1',
      purchasedAt: '2026.09.20', illustrationKey: 'milk', state: { quantity: 3 },
    },
    {
      id: 'water', category: 'food', name: '매일 마시는 생수', price: 4900,
      imageUrl: '/products/water.svg', roomSlot: 'fridge-2',
      purchasedAt: '2026.09.20', illustrationKey: 'water', state: { quantity: 3 },
    },
    {
      id: 'vitamin', category: 'food', name: '데일리 멀티비타민', price: 18900,
      imageUrl: '/products/vitamin.svg', roomSlot: 'pantry-1',
      purchasedAt: '2026.09.17', illustrationKey: 'vitamin', state: { quantity: 3 },
    },
    {
      id: 'cushion', category: 'living', name: '올리브 린넨 쿠션', price: 15900,
      imageUrl: '/products/cushion.svg', roomSlot: 'sofa-1',
      purchasedAt: '2026.09.15', illustrationKey: 'cushion', state: {},
    },
    {
      id: 'lamp', category: 'living', name: '웜 우드 플로어 램프', price: 49000,
      imageUrl: '/products/lamp.svg', roomSlot: 'lamp-1',
      purchasedAt: '2026.09.12', illustrationKey: 'lamp', state: { on: true },
    },
    {
      id: 'serum', category: 'beauty', name: '촉촉한 데일리 세럼', price: 22900,
      imageUrl: '/products/serum.svg', roomSlot: 'vanity-1',
      purchasedAt: '2026.09.19', illustrationKey: 'serum', state: { featured: true },
    },
    {
      id: 'cream', category: 'beauty', name: '편안한 보습 크림', price: 19800,
      imageUrl: '/products/cream.svg', roomSlot: 'vanity-2',
      purchasedAt: '2026.09.19', illustrationKey: 'cream', state: { featured: false },
    },
  ],
};
