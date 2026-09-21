'use client';

import { useState } from 'react';
import type { RecommendationItem, RecommendationResponse } from '@/lib/recommendation/types';

const SOURCES = { behavior: '행동 추천', metadata: '카테고리 연결', popularity: '인기도 백업', catalog: '상품 목록 백업', mixed: '행동 추천 + 백업 보충' };
const price = (value: number) => new Intl.NumberFormat('ko-KR').format(value);

function ProductPhoto({ productId, name }: { productId: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return <div className="rec-product-photo">
    {failed ? <span className="rec-photo-unavailable">이미지를 불러올 수 없어요</span> : <img
      src={`https://asset.m-gs.kr/prod/${encodeURIComponent(productId)}/1/550`}
      alt={name}
      width={550}
      height={550}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />}
  </div>;
}

export function RecommendationProducts({ items, diagnostic = false }: { items: RecommendationItem[]; diagnostic?: boolean }) {
  if (!items.length) return <p className="rec-empty">현재 조건으로 추천할 상품이 없어요. 다른 카테고리나 추천 방식을 선택해 주세요.</p>;
  return <ol className="rec-products">{items.map((item, index) => <li key={item.product.prd_id} className="rec-product">
    <div className="rec-product-top"><span className="rec-rank">{String(index + 1).padStart(2, '0')}</span><span className="rec-category">{item.product.cate2_nm || item.product.cate1_nm}</span></div>
    <ProductPhoto key={item.product.prd_id} productId={item.product.prd_id} name={item.product.view_name} />
    <p className="rec-brand">{item.product.brand_name || '브랜드 정보 없음'}</p>
    <h3>{item.product.view_name}</h3>
    <strong className="rec-price">{price(item.product.discprice)}<small>원</small></strong>
    <p className="rec-reason">{item.reason}</p>
    {diagnostic && <details className="rec-diagnostic"><summary>선정 근거 상세</summary><dl>
      <div><dt>상품 코드</dt><dd>{item.product.prd_id}</dd></div>
      <div><dt>추천 출처</dt><dd>{SOURCES[item.source]}</dd></div>
      <div><dt>최종 점수</dt><dd>{item.score.toFixed(4)}</dd></div>
      <div><dt>행동 / 메타 / 인기</dt><dd>{item.signals.behavior.toFixed(3)} / {item.signals.metadata.toFixed(3)} / {item.signals.popularity.toFixed(3)}</dd></div>
      {item.support !== undefined && <div><dt>함께 행동한 사용자 수</dt><dd>{item.support}</dd></div>}
      <div><dt>전체 분류</dt><dd>{[item.product.cate1_nm, item.product.cate2_nm, item.product.cate3_nm, item.product.cate4_nm].filter(Boolean).join(' › ')}</dd></div>
    </dl></details>}
  </li>)}</ol>;
}

export function RecommendationContext({ result }: { result: RecommendationResponse }) {
  const source = { order: '구매', cart: '장바구니', view: '클릭', selected: '선택' };
  return <details className="rec-context"><summary>추천 기준 상품 {result.anchors.length}개</summary>
    {result.anchors.length ? <ul>{result.anchors.map(anchor => <li key={`${anchor.source}-${anchor.product.prd_id}`}><span>{source[anchor.source]}</span>{anchor.product.view_name}</li>)}</ul> : <p>이 카테고리에서 사용할 기준 상품이 없어 백업 추천을 사용합니다.</p>}
  </details>;
}

export function RecommendationFallback({ result, compact = false }: { result: RecommendationResponse; compact?: boolean }) {
  if (!result.fallbackReason && compact) return null;
  const sourceLabel = result.effectiveMode === 'mixed' ? [...new Set(result.items.map(item => SOURCES[item.source]))].join(' · ') : SOURCES[result.effectiveMode];
  return <div className={`rec-result-note${result.fallbackReason ? ' rec-result-note-fallback' : ''}`}>
    {!compact && <strong>{sourceLabel}</strong>}
    {result.fallbackReason && <p>{result.fallbackReason}</p>}
  </div>;
}
