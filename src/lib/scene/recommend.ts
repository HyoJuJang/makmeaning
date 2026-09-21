import type { SceneProduct } from '../../types/scene.ts';

export type SceneFilters = {
  situation: string;
  tastes: string[];
  /** Maximum price per product in KRW. Zero means no limit. */
  budget: number;
  kind: string;
  sort: 'recommended' | 'price-low';
};

export type SceneAnchor = {
  id: string;
  name: string;
  kind?: string;
  tastes?: string[];
};

export type SceneRecommendation = {
  product: SceneProduct;
  reason: string;
  matches: string[];
};

const compareIds = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0;

/** Explainable demo ranking: preference tags are not inventory or fit guarantees. */
export function recommend(
  products: SceneProduct[],
  filters: SceneFilters,
  anchor: SceneAnchor | null,
): SceneRecommendation[] {
  const requestedTastes = [...new Set(filters.tastes)];
  const ranked = products
    .filter(product => product.id !== anchor?.id)
    .filter(product => filters.budget === 0 || product.price <= filters.budget)
    .filter(product => filters.kind === '전체' || product.kind === filters.kind)
    .map(product => {
      const kindEnding = (product.kind.charCodeAt(product.kind.length - 1) - 0xac00) % 28 ? '이에요.' : '예요.';
      const situationMatches = product.situations.includes(filters.situation);
      const matchedTastes = requestedTastes.filter(taste => product.tastes.includes(taste));
      const ownedReason = anchor && product.pairsWith.includes(anchor.id)
        ? product.reasons[anchor.id]?.trim()
        : undefined;
      const sharedAnchorTastes = anchor?.kind && anchor.kind !== product.kind
        ? [...new Set(anchor.tastes ?? [])].filter(taste => product.tastes.includes(taste))
        : [];
      const matches: string[] = [];
      let reason: string;
      let score = (situationMatches ? 4 : 0) + matchedTastes.length * 2;

      if (ownedReason) {
        reason = ownedReason;
        score += 12;
        matches.push('선택 상품과 조합');
      } else if (anchor && sharedAnchorTastes.length > 0) {
        reason = `${anchor.name}에서 고른 ${sharedAnchorTastes.join(' · ')} 취향을 ${product.kind}에도 이어가요.`;
        score += 6;
        matches.push('공통 취향 연결');
      } else if (situationMatches && matchedTastes.length > 0) {
        reason = `${filters.situation}에 어울리는 ${matchedTastes.join(' · ')} 스타일의 ${product.kind}${kindEnding}`;
      } else if (situationMatches) {
        reason = `${filters.situation} 장면에 어울리는 ${product.kind}로 골랐어요.`;
      } else if (matchedTastes.length > 0) {
        reason = `선택한 ${matchedTastes.join(' · ')} 취향에 맞는 ${product.kind}${kindEnding}`;
      } else if (filters.budget > 0) {
        reason = `${product.price.toLocaleString('ko-KR')}원으로 설정한 예산 안에서 둘러볼 수 있어요.`;
      } else {
        reason = product.description;
      }

      if (situationMatches) matches.push(filters.situation);
      matches.push(...matchedTastes);
      return { product, reason, matches, score };
    });

  ranked.sort((left, right) => {
    if (filters.sort === 'recommended' && left.score !== right.score) return right.score - left.score;
    return left.product.price - right.product.price || compareIds(left.product.id, right.product.id);
  });

  return ranked.map(({ product, reason, matches }) => ({ product, reason, matches }));
}
