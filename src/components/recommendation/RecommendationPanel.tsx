'use client';

import { useState } from 'react';
import type { RecommendationDomain } from '@/lib/recommendation/types';
import { DOMAIN_LABELS, saveRecommendationMode, useRecommendationPreferences, useRecommendationResult, useRecommendationStatus } from './client';
import { RecommendationFallback, RecommendationProducts } from './RecommendationCards';
import './recommendation.css';

export interface RecommendationPanelProps {
  domain: RecommendationDomain;
  userId?: string;
  anchorProductId?: string;
  purchasedProductIds?: string[];
  cartProductIds?: string[];
}

export default function RecommendationPanel({ domain, userId, anchorProductId, purchasedProductIds, cartProductIds }: RecommendationPanelProps) {
  const [retry, setRetry] = useState(0);
  const status = useRecommendationStatus(retry);
  const preferences = useRecommendationPreferences(status.data?.defaultMode);
  const selectedUser = preferences.userId || userId;
  const reviewingAnotherUser = Boolean(preferences.userId && preferences.userId !== userId);
  const state = useRecommendationResult(preferences.ready && status.data?.ready ? {
    domain, mode: preferences.mode, limit: 4,
    ...(selectedUser ? { userId: selectedUser } : {}),
    ...(!reviewingAnotherUser && anchorProductId ? { anchorProductId } : {}),
    ...(!reviewingAnotherUser && purchasedProductIds?.length ? { purchasedProductIds } : {}),
    ...(!reviewingAnotherUser && cartProductIds?.length ? { cartProductIds } : {}),
  } : null, retry);
  const error = state.error || status.error;
  const unavailable = status.data?.ready === false || state.unavailable;
  return <section className="rec-panel" aria-label={`${DOMAIN_LABELS[domain]} 추천 상품`}>
    <div className="rec-panel-heading"><div><span className="rec-eyebrow">FOR YOU</span><h2>함께 둘러볼 상품</h2></div><a className="rec-text-link" href={`/recommendations?domain=${domain}`}>추천 비교</a></div>
    <div className="rec-panel-controls"><span>추천 방식</span><div className="rec-segment" aria-label="추천 방식">
      <button type="button" aria-pressed={preferences.mode === 'behavior'} onClick={() => saveRecommendationMode('behavior')}>본 추천</button>
      <button type="button" aria-pressed={preferences.mode === 'metadata'} onClick={() => saveRecommendationMode('metadata')}>백업 추천</button>
    </div></div>
    {reviewingAnotherUser && <p className="rec-personalization-note">비교에서 선택한 사용자 기준으로 추천하고 있어요.</p>}
    <div aria-live="polite" aria-busy={status.loading || state.loading}>
      {unavailable ? <div className="rec-empty"><p>추천 데이터를 준비하고 있어요.</p><button className="rec-text-button" type="button" onClick={() => setRetry(value => value + 1)}>다시 확인</button></div>
        : error ? <div className="rec-empty" role="alert"><p>{error}</p><button className="rec-text-button" type="button" onClick={() => setRetry(value => value + 1)}>다시 시도</button></div>
        : status.loading || state.loading || !preferences.ready ? <p className="rec-empty">어울리는 상품을 찾고 있어요…</p>
        : state.result && <><RecommendationFallback result={state.result} compact /><RecommendationProducts items={state.result.items} /></>}
    </div>
  </section>;
}
