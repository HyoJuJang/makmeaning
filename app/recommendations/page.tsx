import type { Metadata } from 'next';
import type { RecommendationDomain } from '@/lib/recommendation/types';
import RecommendationReview from '@/components/recommendation/RecommendationReview';

export const metadata: Metadata = {
  title: '추천 검토 — G:Scene',
  description: '사용자별 추천 상품과 추천 기준, 선정 근거를 확인합니다.',
};

export default async function RecommendationsPage({ searchParams }: { searchParams: Promise<{ domain?: string | string[] }> }) {
  const { domain } = await searchParams;
  const initialDomain: RecommendationDomain = typeof domain === 'string' && ['fashion', 'living', 'food', 'beauty'].includes(domain) ? domain as RecommendationDomain : 'beauty';
  return <RecommendationReview initialDomain={initialDomain} />;
}
