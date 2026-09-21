import type { DemoHome } from '../types/home.ts';
import { demoDisclosure, demoPurchaseSeeds, demoUser } from './demo-purchases.ts';

/**
 * Verified catalog snapshot for deterministic fixtures (public API checked 2026-09-21).
 * The runtime home API must resolve these IDs from ProductRepository; this is NOT its fallback.
 * The fictional purchase events and generic illustrations remain separate from real catalog data.
 */
const catalogFixture: Record<string, { name: string; price: number }> = {
  '1106041553': { name: '타미힐피거 크루넥 케이블 니트 남여공용 소매 로고 포인트', price: 69000 },
  '1083830467': { name: '[지오다노/본사] 345518 여 린넨셔츠', price: 31120 },
  '1065577366': { name: '[비버리힐즈폴로클럽] 남여 자수 케이블 라운드 긴팔 니트티셔츠', price: 35910 },
  '1113622242': { name: '서울우유 멸균우유 1000mlx10개', price: 26500 },
  '1033331215': { name: '동원샘물 미니 생수 300ml x 20개', price: 5000 },
  '19026466': { name: '고려은단 비타민C 1000 180정 x 1개 (6개월분) +쇼핑백', price: 20900 },
  '32470670': { name: '러프 쿠션솜 45x45 소파쿠션 사각쿠션 속통 쿠션속통 1P', price: 4310 },
  '1056652878': { name: '[이케아 무료배송] 스탠드조명 무드등 장스탠드(전구포함) TP124', price: 29400 },
  '16052422': { name: '아이소이 로즈PDRN 브라이트닝 세럼(NEW잡티세럼) 15ml', price: 28000 },
  '1088835047': { name: '아브카 [체험특가] 히알루론산 고수분 크림 200ml', price: 8900 },
};

export const demoHome: DemoHome = {
  user: { ...demoUser },
  demo: { ...demoDisclosure },
  purchases: demoPurchaseSeeds.map(seed => ({
    ...seed,
    ...catalogFixture[seed.id],
    state: { ...seed.state },
    imageUrl: `/products/${seed.illustrationKey}.svg`,
    catalogSource: 'shared-products', imageKind: 'illustration', priceKind: 'catalog-reference',
  })),
};
