import type { Metadata } from 'next';
import type { RecommendationDomain } from '@/lib/recommendation/types';
import RecommendationReview from '@/components/recommendation/RecommendationReview';

export const metadata: Metadata = {
  title: '추천 비교 — G:Scene',
  description: '행동 기반 추천과 상품 메타데이터 백업을 같은 조건에서 비교합니다.',
};

export default async function RecommendationsPage({ searchParams }: { searchParams: Promise<{ domain?: string | string[] }> }) {
  const { domain } = await searchParams;
  const initialDomain: RecommendationDomain = typeof domain === 'string' && ['fashion', 'living', 'food', 'beauty'].includes(domain) ? domain as RecommendationDomain : 'beauty';
  return <RecommendationReview initialDomain={initialDomain} />;
}
