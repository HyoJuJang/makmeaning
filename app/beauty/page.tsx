import type { Metadata } from 'next';
import CatalogScenePage from '../../src/components/catalog/CatalogScenePage';

export const metadata: Metadata = {
  title: '내 화장대 — G:Scene',
  description: '내 화장대에서 구매한 뷰티 상품과 장바구니를 살펴보세요.',
};
export default function BeautyPage() { return <CatalogScenePage category="beauty" />; }
