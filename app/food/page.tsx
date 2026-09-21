import type { Metadata } from 'next';
import FoodKitchen from './FoodKitchen';

export const metadata: Metadata = {
  title: '내 주방 — G:Scene',
  description: '내가 고른 식품에서 시작하는 일상. 한 끼, 아침, 외출에 어울리는 장면과 함께할 상품을 만나보세요.',
};

export default function FoodPage() {
  return <FoodKitchen />;
}
