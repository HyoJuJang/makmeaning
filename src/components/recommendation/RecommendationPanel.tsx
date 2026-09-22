'use client';

import { useState } from 'react';
import type { RecommendationDomain } from '@/lib/recommendation/types';
import { DOMAIN_LABELS, useRecommendationResult, useRecommendationStatus } from './client';
import { RecommendationFallback, RecommendationProducts, type RecommendationCartActions } from './RecommendationCards';
import './recommendation.css';

export interface RecommendationPanelProps extends RecommendationCartActions {
  domain: RecommendationDomain;
  userId?: string;
  anchorProductId?: string;
  anchorProductName?: string;
  purchasedProductIds?: string[];
  cartProductIds?: string[];
}

export default function RecommendationPanel({ domain, userId, anchorProductId, anchorProductName, purchasedProductIds, cartProductIds, onAddToCart, onViewCart, pendingProductId, cartReady }: RecommendationPanelProps) {
  const [retry, setRetry] = useState(0);
  const status = useRecommendationStatus(retry);
  const state = useRecommendationResult(status.data?.ready ? {
    domain, limit: 4,
    ...(userId ? { userId } : {}),
    ...(anchorProductId ? { anchorProductId } : {}),
    ...(purchasedProductIds?.length ? { purchasedProductIds } : {}),
    ...(cartProductIds?.length ? { cartProductIds } : {}),
  } : null, retry);
  const error = state.error || status.error;
  const unavailable = status.data?.ready === false || state.unavailable;
  return <section className="rec-panel" aria-label={`${DOMAIN_LABELS[domain]} 추천 상품`}>
    <div className="rec-panel-heading"><div><span className="rec-eyebrow">FOR YOU</span><h2>{anchorProductId ? '이 상품과 함께 둘러보세요' : '함께 둘러볼 상품'}</h2></div></div>
    <p className="rec-selection-note" aria-live="polite">{anchorProductId
      ? <><strong>{anchorProductName || state.result?.anchors.find(anchor => anchor.source === 'selected')?.product.view_name || '선택한 상품'}</strong><span>이 상품을 기준으로 추천해요.</span></>
      : '구매·장바구니 상품을 선택하면 그 상품에 맞춰 추천해드려요.'}</p>
    <div aria-live="polite" aria-busy={status.loading || state.loading}>
      {unavailable ? <div className="rec-empty"><p>추천 데이터를 준비하고 있어요.</p><button className="rec-text-button" type="button" onClick={() => setRetry(value => value + 1)}>다시 확인</button></div>
        : error ? <div className="rec-empty" role="alert"><p>{error}</p><button className="rec-text-button" type="button" onClick={() => setRetry(value => value + 1)}>다시 시도</button></div>
        : status.loading || state.loading ? <p className="rec-empty">어울리는 상품을 찾고 있어요…</p>
        : state.result && <><RecommendationFallback result={state.result} compact /><RecommendationProducts items={state.result.items} cartProductIds={cartProductIds} onAddToCart={onAddToCart} onViewCart={onViewCart} pendingProductId={pendingProductId} cartReady={cartReady} /></>}
    </div>
  </section>;
}
