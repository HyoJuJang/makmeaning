import type { Metadata } from 'next';
import FoodKitchen from './FoodKitchen';

export const metadata: Metadata = {
  title: '내 주방 — G:Scene',
  description: '내가 고른 식품에서 시작하는 한 끼. 메뉴를 발견하고 필요한 재료를 확인해 보세요.',
};

export default function FoodPage() {
  return <FoodKitchen />;
}
