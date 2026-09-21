import { DOMAINS, MODES, recommendForUser } from './engine.ts';
import type { RecommendationDomain, RecommendationIndex, RecommendationMode, RecommendationRequest, UserProfile } from './types.ts';

type Store = {
  index(): RecommendationIndex;
  profile(userId?: string): UserProfile | null;
  sample(domain: RecommendationDomain): UserProfile | null;
  sampleDomains(): RecommendationDomain[];
  defaultMode(): RecommendationMode;
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
class InvalidRequest extends Error {}
function parseRequest(value: unknown, defaultMode: RecommendationMode): RecommendationRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InvalidRequest('요청 형식을 확인해 주세요.');
  const body = value as Record<string, unknown>;
  if (!DOMAINS.includes(body.domain as RecommendationDomain)) throw new InvalidRequest('fashion, living, food, beauty 중 카테고리를 선택해 주세요.');
  const mode = body.mode ?? defaultMode;
  if (!MODES.includes(mode as RecommendationMode)) throw new InvalidRequest('추천 방식은 behavior 또는 metadata여야 합니다.');
  const userId = body.userId;
  if (userId !== undefined && (typeof userId !== 'string' || userId.length > 512 || /[\u0000-\u001f]/.test(userId))) throw new InvalidRequest('사용자 ID 형식을 확인해 주세요.');
  if (body.sample !== undefined && (!DOMAINS.includes(body.sample as RecommendationDomain) || body.sample !== body.domain)) throw new InvalidRequest('예시 사용자는 선택한 카테고리와 같아야 합니다.');
  if (body.sample && typeof userId === 'string' && userId.trim()) throw new InvalidRequest('사용자 ID와 예시 사용자 중 하나를 선택해 주세요.');
  if (body.limit !== undefined && (!Number.isInteger(body.limit) || Number(body.limit) < 1 || Number(body.limit) > 24)) throw new InvalidRequest('추천 개수는 1~24 사이의 정수여야 합니다.');
  if (body.anchorProductId !== undefined && (typeof body.anchorProductId !== 'string' || body.anchorProductId.length > 128)) throw new InvalidRequest('기준 상품 ID 형식을 확인해 주세요.');
  const ids = (key: string) => {
    if (body[key] === undefined) return undefined;
    if (!Array.isArray(body[key]) || body[key].length > 200 || !body[key].every(id => typeof id === 'string' && id.length > 0 && id.length <= 128)) throw new InvalidRequest('상품 목록 형식을 확인해 주세요.');
    return [...new Set(body[key])] as string[];
  };
  return {
    domain: body.domain as RecommendationDomain, mode: mode as RecommendationMode,
    userId: typeof userId === 'string' ? userId.trim() : undefined, sample: body.sample as RecommendationDomain | undefined,
    limit: body.limit as number | undefined, anchorProductId: body.anchorProductId as string | undefined,
    purchasedProductIds: ids('purchasedProductIds'), cartProductIds: ids('cartProductIds'),
  };
}
export async function recommendationsResponse(request: Request, store: Store): Promise<Response> {
  try {
    // A bounded JSON body prevents accidental upload of raw event dumps through this endpoint.
    const raw = await request.text();
    if (raw.length > 65536) throw new InvalidRequest('요청이 너무 큽니다.');
    let body: unknown;
    try { body = JSON.parse(raw); } catch { throw new InvalidRequest('JSON 요청을 확인해 주세요.'); }
    const input = parseRequest(body, store.defaultMode());
    const index = store.index();
    const profile = input.sample ? store.sample(input.sample) : store.profile(input.userId);
    return json(recommendForUser(index, profile, input));
  } catch (error) {
    if (error instanceof InvalidRequest) return json({ error: { code: 'INVALID_RECOMMENDATION_REQUEST', message: error.message } }, 400);
    return json({ error: { code: 'RECOMMENDATION_DATA_UNAVAILABLE', message: '추천 데이터가 준비되지 않았습니다. 전처리를 실행한 뒤 다시 시도해 주세요.' } }, 503);
  }
}
export function recommendationStatusResponse(store: Store): Response {
  try {
    const index = store.index();
    return json({ ready: true, defaultMode: store.defaultMode(), builtAt: index.builtAt, window: index.window, summary: index.summary, sampleDomains: store.sampleDomains() });
  } catch {
    return json({ ready: false, defaultMode: store.defaultMode(), sampleDomains: [], error: { code: 'RECOMMENDATION_DATA_UNAVAILABLE', message: 'npm run recommendations:prepare 실행이 필요합니다.' } });
  }
}
