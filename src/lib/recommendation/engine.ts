import type {
  RecommendationDomain, RecommendationIndex, RecommendationItem, RecommendationMode,
  RecommendationProduct, RecommendationRequest, RecommendationResponse, UserItem, UserProfile,
} from './types.ts';
import { metadataMatch } from './rules.ts';

export const DOMAINS: RecommendationDomain[] = ['fashion', 'living', 'food', 'beauty'];
export const MODES: RecommendationMode[] = ['behavior', 'metadata'];
const DEFAULT_CATEGORIES: Record<RecommendationDomain, string[]> = {
  fashion: ['티셔츠', '니트/가디건', '바지', '아우터', '신발', '가방/지갑'],
  living: ['홈패브릭', '조명', '인테리어소품', '카페트/러그/발매트', '수납/정리/생활잡화', '주방용품'],
  food: ['과일', '채소', '간식/과자', '쌀/잡곡', '견과/건과', '김치/반찬'],
  beauty: ['스킨케어', '클렌징', '선케어', '헤어케어', '바디케어', '마스크/팩/패드'],
};
const compareIds = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const round = (value: number) => Math.round(value * 10000) / 10000;
const count = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(3, value)) : 0;
const strength = (item: UserItem) => 5 * count(item.orderCount) + 3 * count(item.cartCount) + count(item.viewCount);
const validBrand = (brand: string) => Boolean(brand.trim()) && !['기타', '기타브랜드', '노브랜드', 'unknown', 'sellerhubshop', 'null'].includes(brand.trim().toLowerCase());
const zeroSignals = () => ({ behavior: 0, metadata: 0, popularity: 0 });

/** Offline dump history is interest evidence, not a claim about current cart contents or stock. */
export function recommendForUser(
  index: RecommendationIndex,
  profile: UserProfile | null,
  request: RecommendationRequest,
): RecommendationResponse {
  const mode = request.mode ?? 'behavior';
  const limit = Math.min(24, Math.max(1, Math.trunc(request.limit ?? 6)));
  const byId = new Map(index.products.map(product => [product.prd_id, product]));
  const domainProducts = index.products.filter(product => product.domain === request.domain);
  const history = new Map<string, UserItem>();
  for (const item of profile?.items ?? []) {
    if (byId.get(item.productId)?.domain !== request.domain) continue;
    history.set(item.productId, { ...item });
  }
  // Screen context is an explicit supplement, never written back to the offline profile.
  for (const [ids, field] of [[request.purchasedProductIds, 'orderCount'], [request.cartProductIds, 'cartCount']] as const) {
    for (const id of ids ?? []) {
      if (byId.get(id)?.domain !== request.domain) continue;
      const item = history.get(id) ?? { productId: id, viewCount: 0, cartCount: 0, orderCount: 0, lastAt: '' };
      history.set(id, { ...item, [field]: Math.max(1, item[field]) });
    }
  }
  const relevant = [...history.values()];
  const strong = relevant.filter(item => item.orderCount > 0 || item.cartCount > 0);
  const ordered = (items: UserItem[]) => [...items].sort((a, b) => strength(b) - strength(a) || b.lastAt.localeCompare(a.lastAt) || compareIds(a.productId, b.productId));
  const selected = request.anchorProductId ? byId.get(request.anchorProductId) : null;
  const selectedProduct = selected?.domain === request.domain ? selected : null;
  const anchors: RecommendationResponse['anchors'] = [];
  if (selectedProduct) anchors.push({ product: selectedProduct, source: 'selected' });
  const primary = mode === 'metadata'
    ? [...strong].sort((a, b) => compareIds(a.productId, b.productId))
    : ordered(strong);
  for (const item of primary.slice(0, 8)) {
    if (item.productId === selectedProduct?.prd_id) continue;
    anchors.push({ product: byId.get(item.productId)!, source: item.orderCount > 0 ? 'order' : 'cart' });
  }
  if (mode === 'behavior') {
    for (const item of ordered(relevant.filter(item => !item.orderCount && !item.cartCount)).slice(0, strong.length ? 3 : 8)) {
      if (item.productId !== selectedProduct?.prd_id) anchors.push({ product: byId.get(item.productId)!, source: 'view' });
    }
  }
  const excluded = new Set(strong.map(item => item.productId));
  if (selectedProduct) excluded.add(selectedProduct.prd_id);
  const candidates = domainProducts.filter(product => !excluded.has(product.prd_id));
  const userState = strong.length ? 'history' : relevant.length ? 'views-only' : profile?.items.length ? 'no-domain-history' : 'unknown';
  const maxPopularity = Math.max(0, ...domainProducts.map(product => index.popularity[product.prd_id] ?? 0));
  const popularity = (id: string) => maxPopularity > 0 ? Math.log1p(Math.max(0, index.popularity[id] ?? 0)) / Math.log1p(maxPopularity) : 0;

  const metadata = new Map<string, RecommendationItem>();
  // Metadata mode deliberately ignores click history, counts, dates, item-item similarity and popularity.
  for (const product of candidates) {
    for (const anchor of anchors.filter(anchor => anchor.source !== 'view')) {
      const match = metadataMatch(anchor.product, product);
      if (!match) continue;
      const sameBrand = validBrand(product.brand_name) && product.brand_name.trim() === anchor.product.brand_name.trim();
      const score = match.score + (sameBrand ? 8 : 0);
      const current = metadata.get(product.prd_id);
      if (!current || score > current.score) metadata.set(product.prd_id, {
        product, score, source: 'metadata', anchorProductId: anchor.product.prd_id,
        reason: `${match.reason}${sameBrand ? ' 같은 브랜드 상품을 먼저 골랐어요.' : ''}`,
        signals: { behavior: 0, metadata: score, popularity: 0 },
      });
    }
  }
  const metadataRanked = [...metadata.values()].sort((a, b) => b.score - a.score || compareIds(a.product.prd_id, b.product.prd_id));
  const behavior = new Map<string, { score: number; support: number; anchorId: string; best: number }>();
  if (mode === 'behavior') {
    for (const anchor of anchors) {
      const item = history.get(anchor.product.prd_id);
      const weight = anchor.source === 'selected' ? 8 : item ? strength(item) : 1;
      for (const neighbor of index.neighbors[anchor.product.prd_id] ?? []) {
        if (byId.get(neighbor.productId)?.domain !== request.domain || excluded.has(neighbor.productId) || neighbor.support < 2 || !Number.isFinite(neighbor.score) || neighbor.score <= 0) continue;
        const contribution = weight * neighbor.score;
        const previous = behavior.get(neighbor.productId);
        behavior.set(neighbor.productId, {
          score: (previous?.score ?? 0) + contribution,
          best: Math.max(previous?.best ?? 0, contribution),
          anchorId: !previous || contribution > previous.best ? anchor.product.prd_id : previous.anchorId,
          support: !previous || contribution > previous.best ? neighbor.support : previous.support,
        });
      }
    }
  }
  const maxBehavior = Math.max(0, ...[...behavior.values()].map(item => item.score));
  const behaviorRanked: RecommendationItem[] = [...behavior].map(([id, signal]) => {
    const relation = Math.min(1, (metadata.get(id)?.score ?? 0) / 108);
    const affinity = maxBehavior ? signal.score / maxBehavior : 0;
    const popular = popularity(id);
    return {
      product: byId.get(id)!, score: round(100 * (0.75 * affinity + 0.15 * relation + 0.1 * popular)),
      source: 'behavior' as const, anchorProductId: signal.anchorId, support: signal.support,
      reason: `기준 상품과 이 상품에 관심을 보인 사용자들의 행동을 바탕으로 골랐어요.`,
      signals: { behavior: round(affinity), metadata: round(relation), popularity: round(popular) },
    };
  }).sort((a, b) => b.score - a.score || compareIds(a.product.prd_id, b.product.prd_id));

  const results: RecommendationItem[] = [];
  const used = new Set<string>();
  const append = (items: RecommendationItem[]) => {
    for (const item of items) {
      if (results.length >= limit) break;
      if (!used.has(item.product.prd_id)) { used.add(item.product.prd_id); results.push(item); }
    }
  };
  if (mode === 'behavior') append(behaviorRanked);
  append(metadataRanked);
  if (mode === 'behavior') {
    append(candidates.filter(product => popularity(product.prd_id) > 0).sort((a, b) => popularity(b.prd_id) - popularity(a.prd_id) || compareIds(a.prd_id, b.prd_id)).map(product => ({
      product, score: round(100 * popularity(product.prd_id)), source: 'popularity',
      reason: '같은 카테고리의 3일 집계 인기도를 기준으로 골랐어요.',
      signals: { ...zeroSignals(), popularity: round(popularity(product.prd_id)) },
    })));
  }
  // No-history metadata fallback is explicitly a varied catalog selection, not a popularity claim.
  const buckets = new Map<string, RecommendationProduct[]>();
  for (const product of [...candidates].sort((a, b) => compareIds(a.prd_id, b.prd_id))) {
    const key = product.cate1_nm || '기타';
    const bucket = buckets.get(key) ?? [];
    bucket.push(product); buckets.set(key, bucket);
  }
  const categoryOrder = [...DEFAULT_CATEGORIES[request.domain], ...[...buckets.keys()].sort()].filter((value, i, values) => values.indexOf(value) === i);
  const diverse: RecommendationItem[] = [];
  for (let offset = 0; diverse.length < candidates.length; offset++) {
    let added = false;
    for (const key of categoryOrder) {
      const product = buckets.get(key)?.[offset];
      if (product) { diverse.push({ product, score: 0, reason: '개인화 근거가 부족해 카테고리별 상품을 골고루 보여드려요.', source: 'catalog', signals: zeroSignals() }); added = true; }
    }
    if (!added) break;
  }
  append(diverse);
  const sources = new Set(results.map(item => item.source));
  const effectiveMode = sources.size > 1 ? 'mixed' : results[0]?.source ?? (mode === 'behavior' ? 'popularity' : 'catalog');
  let fallbackReason: string | null = null;
  const labels = { metadata: '카테고리 연결', popularity: '인기도', catalog: '카테고리별 기본 상품', behavior: '행동 추천' };
  const backupLabels = [...sources].filter(source => source !== mode).map(source => labels[source]).join(' · ');
  if (!candidates.length) fallbackReason = domainProducts.length
    ? '이미 주문하거나 장바구니에 담은 상품을 제외하니 추천할 상품이 없습니다.'
    : '이 카테고리에 추천할 상품이 없습니다.';
  else if (!anchors.length) fallbackReason = `이 카테고리에서 연결할 구매·장바구니 이력이 없어 ${backupLabels || labels[results[0]?.source ?? 'catalog']} 기준으로 보여드립니다.`;
  else if (backupLabels) fallbackReason = mode === 'behavior'
    ? `행동 근거가 부족한 자리는 ${backupLabels} 기준으로 보충했습니다.`
    : `연결 규칙에 맞는 상품이 부족한 자리는 ${backupLabels} 기준으로 보충했습니다.`;
  return {
    domain: request.domain, requestedMode: mode, effectiveMode, fallbackReason, userState,
    items: results, anchors, excludedCount: excluded.size, totalCandidates: candidates.length,
    data: { builtAt: index.builtAt, window: index.window },
  };
}
