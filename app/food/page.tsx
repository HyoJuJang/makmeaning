import type { Metadata } from 'next';
import CatalogScenePage from '../../src/components/catalog/CatalogScenePage';

export const metadata: Metadata = {
  title: '내 주방 — G:Scene',
  description: '내 주방에서 구매한 식품과 장바구니 상품을 살펴보세요.',
};
export default function FoodPage() { return <CatalogScenePage category="food" />; }
