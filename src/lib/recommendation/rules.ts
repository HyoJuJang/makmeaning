import type { RecommendationDomain, RecommendationProduct } from './types.ts';

/** Exact category prefix: cate1, optionally cate2, cate3, and cate4. */
export type CategoryPath = readonly [string, ...string[]];
export interface MetadataRule {
  id: string;
  domain: RecommendationDomain;
  from: readonly CategoryPath[];
  to: readonly CategoryPath[];
  score: number;
  reason: string;
}
export interface MetadataMatch { score: number; ruleId: string; reason: string }

const tops: readonly CategoryPath[] = [
  ['티셔츠'], ['니트/가디건'], ['맨투맨/후드집업'], ['블라우스/셔츠'], ['셔츠/남방'], ['조끼'],
];
const bottoms: readonly CategoryPath[] = [['바지'], ['스커트']];
const everydayShoes: readonly CategoryPath[] = [
  ['신발', '남성신발', '운동화/스니커즈'], ['신발', '여성신발', '운동화/스니커즈'],
  ['신발', '남성신발', '로퍼/단화'], ['신발', '여성신발', '플랫/로퍼'],
  ['스포츠신발', '운동화/스니커즈'],
];

/** Curated browsing connections, not claims about fit, ingredients, or compatibility. */
export const metadataRules: readonly MetadataRule[] = [
  {
    id: 'fashion-top-bottom', domain: 'fashion', from: tops, to: bottoms, score: 100,
    reason: '상의와 함께 둘러볼 바지·스커트예요.',
  },
  {
    id: 'fashion-bottom-top', domain: 'fashion', from: bottoms, to: tops, score: 100,
    reason: '하의와 함께 둘러볼 상의예요.',
  },
  {
    id: 'fashion-top-outer', domain: 'fashion', from: tops, to: [['아우터']], score: 100,
    reason: '상의와 함께 둘러볼 아우터예요.',
  },
  {
    id: 'fashion-outer-top', domain: 'fashion', from: [['아우터']], to: tops, score: 100,
    reason: '아우터와 함께 둘러볼 상의예요.',
  },
  {
    id: 'fashion-clothes-shoes', domain: 'fashion', from: [...tops, ...bottoms, ['원피스']],
    to: everydayShoes, score: 100, reason: '옷과 함께 둘러볼 신발이에요.',
  },
  {
    id: 'fashion-shoes-socks', domain: 'fashion',
    from: [['신발', '남성신발'], ['신발', '여성신발'], ['스포츠신발']],
    to: [['양말/패션소품', '양말'], ['스포츠잡화', '스포츠양말']], score: 100,
    reason: '신발과 함께 둘러볼 양말이에요.',
  },
  {
    id: 'fashion-bag-wallet', domain: 'fashion',
    from: [['가방/지갑', '남성가방'], ['가방/지갑', '여성가방']],
    to: [['가방/지갑', '남성지갑'], ['가방/지갑', '여성지갑']], score: 100,
    reason: '가방과 함께 둘러볼 지갑이에요.',
  },
  {
    id: 'fashion-sports-shoes', domain: 'fashion', from: [['스포츠의류']],
    to: [['스포츠신발', '러닝화/워킹화'], ['스포츠신발', '운동화/스니커즈']], score: 100,
    reason: '스포츠 의류와 함께 둘러볼 운동화예요.',
  },
  {
    id: 'fashion-travel-accessories', domain: 'fashion', from: [['여행가방/소품', '여행가방']],
    to: [['여행가방/소품', '여행가방소품']], score: 100,
    reason: '여행가방과 함께 둘러볼 여행 소품이에요.',
  },
  {
    id: 'living-sofa-decor', domain: 'living', from: [['가구', '소파']],
    to: [['홈패브릭', '쿠션/방석/소파매트'], ['카페트/러그/발매트', '카페트/러그'], ['조명', '장스탠드']],
    score: 100, reason: '소파 주변에 함께 둘러볼 쿠션·러그·조명이에요.',
  },
  {
    id: 'living-bed-light', domain: 'living', from: [['가구', '침대'], ['가구', '매트리스']],
    to: [['조명', '단스탠드'], ['침구', '담요/스프레드/패드']], score: 100,
    reason: '침실에서 함께 둘러볼 조명·패브릭이에요.',
  },
  {
    id: 'living-dining-tableware', domain: 'living', from: [['가구', '식탁']],
    to: [['주방용품', '식기/홈세트'], ['주방용품', '수저/양식기']], score: 100,
    reason: '식탁과 함께 둘러볼 식기·수저예요.',
  },
  {
    id: 'living-desk-light', domain: 'living', from: [['가구', '책상']],
    to: [['생활가전', '책상/사무용스탠드'], ['수납/정리/생활잡화', '정리함/수납함', '화장대/데스크정리함']],
    score: 100, reason: '책상과 함께 둘러볼 스탠드·정리함이에요.',
  },
  {
    id: 'living-plant-gardening', domain: 'living',
    from: [['원예', '식물', '가드닝/식물'], ['원예', '식물', '공기정화식물'], ['원예', '식물', '씨앗/묘종/묘목']],
    to: [['원예', '원예용품', '화분/화병'], ['원예', '원예용품', '원예도구/소품']], score: 100,
    reason: '식물과 함께 둘러볼 화분·원예 소품이에요.',
  },
  {
    id: 'living-laundry-tools', domain: 'living', from: [['주방/세탁세제/용품', '세탁세제']],
    to: [['주방/세탁세제/용품', '세탁용품', '빨래바구니'], ['주방/세탁세제/용품', '세탁용품', '세탁망/세탁잡화']],
    score: 100, reason: '세탁세제와 함께 둘러볼 세탁용품이에요.',
  },
  {
    id: 'living-cookware-tools', domain: 'living', from: [['주방용품', '냄비'], ['주방용품', '프라이팬']],
    to: [['주방용품', '조리도구']], score: 100, reason: '조리용기와 함께 둘러볼 조리도구예요.',
  },
  {
    id: 'living-coffee-cups', domain: 'living', from: [['주방가전', '커피머신/커피메이커']],
    to: [['주방용품', '컵/머그/잔', '커피잔/찻잔'], ['주방용품', '컵/머그/잔', '머그잔']],
    score: 100, reason: '커피머신과 함께 둘러볼 머그·커피잔이에요.',
  },
  {
    id: 'living-storage-organizers', domain: 'living', from: [['가구', '수납가구'], ['가구', '드레스룸/행거']],
    to: [['수납/정리/생활잡화', '리빙박스'], ['수납/정리/생활잡화', '옷걸이']], score: 100,
    reason: '수납가구와 함께 둘러볼 정리용품이에요.',
  },
  {
    id: 'food-coffee-snack', domain: 'food', from: [['음료', '커피']],
    to: [['간식/과자', '과자'], ['간식/과자', '빵']], score: 100,
    reason: '커피와 함께 둘러볼 과자·빵이에요.',
  },
  {
    id: 'food-tea-snack', domain: 'food', from: [['음료', '차류']],
    to: [['간식/과자', '전통과자/한과']], score: 100, reason: '차와 함께 둘러볼 간식이에요.',
  },
  {
    id: 'food-cereal-milk', domain: 'food', from: [['간식/과자', '시리얼/시리얼바']],
    to: [['음료', '유제품', '우유'], ['음료', '유제품', '두유']], score: 100,
    reason: '시리얼과 함께 둘러볼 우유·두유예요.',
  },
  {
    id: 'food-yogurt-fruit', domain: 'food', from: [['음료', '유제품', '요거트/요구르트']],
    to: [['과일', '딸기/체리/베리'], ['견과/건과', '견과']], score: 100,
    reason: '요거트와 함께 둘러볼 과일·견과예요.',
  },
  {
    id: 'food-pasta-sauce', domain: 'food', from: [['기타가공식품', '면류', '스파게티면']],
    to: [['기타가공식품', '장/소스류', '스파게티소스']], score: 100,
    reason: '스파게티면과 함께 둘러볼 스파게티소스예요.',
  },
  {
    id: 'food-sauce-pasta', domain: 'food', from: [['기타가공식품', '장/소스류', '스파게티소스']],
    to: [['기타가공식품', '면류', '스파게티면']], score: 100,
    reason: '스파게티소스와 함께 둘러볼 스파게티면이에요.',
  },
  {
    id: 'food-rice-sides', domain: 'food', from: [['쌀/잡곡', '쌀'], ['기타가공식품', '즉석밥/죽/스프', '즉석밥']],
    to: [['국/탕/찌개'], ['김치/반찬']], score: 100, reason: '밥과 함께 둘러볼 국·반찬이에요.',
  },
  {
    id: 'food-bread-spread', domain: 'food', from: [['간식/과자', '빵']],
    to: [['기타가공식품', '잼/시럽'], ['기타가공식품', '버터/치즈']], score: 100,
    reason: '빵과 함께 둘러볼 잼·버터·치즈예요.',
  },
  {
    id: 'food-meat-greens', domain: 'food', from: [['축산', '돼지고기'], ['축산', '소고기']],
    to: [['채소', '상추/쌈채소']], score: 100, reason: '고기와 함께 둘러볼 쌈채소예요.',
  },
  {
    id: 'beauty-toner-serum', domain: 'beauty', from: [['스킨케어', '스킨/토너']],
    to: [['스킨케어', '에센스/세럼/앰플']], score: 100, reason: '토너와 함께 둘러볼 에센스·세럼이에요.',
  },
  {
    id: 'beauty-serum-cream', domain: 'beauty', from: [['스킨케어', '에센스/세럼/앰플']],
    to: [['스킨케어', '크림']], score: 100, reason: '세럼과 함께 둘러볼 크림이에요.',
  },
  {
    id: 'beauty-cream-cleansing', domain: 'beauty', from: [['스킨케어', '크림'], ['스킨케어', '로션']],
    to: [['클렌징', '클렌징폼/비누/파우더']], score: 100, reason: '스킨케어와 함께 둘러볼 클렌징 상품이에요.',
  },
  {
    id: 'beauty-shampoo-treatment', domain: 'beauty', from: [['헤어케어', '샴푸/린스']],
    to: [['헤어케어', '트리트먼트/헤어팩']], score: 100, reason: '샴푸와 함께 둘러볼 트리트먼트·헤어팩이에요.',
  },
  {
    id: 'beauty-treatment-essence', domain: 'beauty', from: [['헤어케어', '트리트먼트/헤어팩']],
    to: [['헤어케어', '헤어에센스/미스트']], score: 100, reason: '헤어팩과 함께 둘러볼 헤어에센스예요.',
  },
  {
    id: 'beauty-base-puff', domain: 'beauty', from: [['메이크업', '베이스메이크업']],
    to: [['미용소품', '메이크업소품', '퍼프/스펀지']], score: 100,
    reason: '베이스메이크업과 함께 둘러볼 퍼프·스펀지예요.',
  },
  {
    id: 'beauty-eye-remover', domain: 'beauty', from: [['메이크업', '아이메이크업'], ['메이크업', '립메이크업']],
    to: [['클렌징', '립앤아이리무버']], score: 100, reason: '메이크업과 함께 둘러볼 리무버예요.',
  },
  {
    id: 'beauty-bodywash-moisturizer', domain: 'beauty', from: [['바디케어', '바디워시/입욕제']],
    to: [['바디케어', '바디보습']], score: 100, reason: '바디워시와 함께 둘러볼 바디 보습 상품이에요.',
  },
  {
    id: 'beauty-nail-tools', domain: 'beauty', from: [['네일케어', '매니큐어'], ['네일케어', '네일팁/스티커']],
    to: [['네일케어', '네일케어도구']], score: 100, reason: '네일 상품과 함께 둘러볼 네일케어 도구예요.',
  },
];

const categoryKeys = ['cate1_nm', 'cate2_nm', 'cate3_nm', 'cate4_nm'] as const;
const maleCategories = new Set([
  '남성속옷', '남성잠옷/내의', '남성가방', '남성지갑', '남성골프의류', '남성등산의류',
  '남성수영복', '남성스포츠의류', '남성신발', '남성벨트/멜빵',
]);
const femaleCategories = new Set([
  '여성속옷', '여성잠옷/내의', '여성가방', '여성지갑', '여성골프의류', '여성등산의류',
  '여성수영복', '여성스포츠의류', '여성신발', '여성벨트',
]);

function category(product: RecommendationProduct, index: number): string {
  const value = product[categoryKeys[index]];
  return typeof value === 'string' ? value.trim() : '';
}

function matches(product: RecommendationProduct, paths: readonly CategoryPath[]): boolean {
  return paths.some(path => path.every((name, index) => name !== '' && category(product, index) === name));
}

function explicitFashionAudience(product: RecommendationProduct): 'male' | 'female' | null {
  const values = categoryKeys.map((_, index) => category(product, index));
  const male = values.some(value => maleCategories.has(value));
  const female = values.some(value => femaleCategories.has(value));
  return male === female ? null : male ? 'male' : 'female';
}

export function metadataMatch(anchor: RecommendationProduct, candidate: RecommendationProduct): MetadataMatch | null {
  if (anchor.prd_id === candidate.prd_id || anchor.domain !== candidate.domain) return null;
  if (anchor.domain === 'fashion') {
    const anchorAudience = explicitFashionAudience(anchor);
    const candidateAudience = explicitFashionAudience(candidate);
    // Only the explicit catalog labels are checked; no user or product-name gender inference.
    if (anchorAudience && candidateAudience && anchorAudience !== candidateAudience) return null;
  }
  const rule = metadataRules.find(rule => rule.domain === anchor.domain && matches(anchor, rule.from) && matches(candidate, rule.to));
  if (rule) return { score: rule.score, ruleId: rule.id, reason: rule.reason };

  const first = category(anchor, 0);
  if (!first || first !== category(candidate, 0)) return null;
  const second = category(anchor, 1);
  if (second && second === category(candidate, 1)) {
    return { score: 30, ruleId: 'same-category-2', reason: `같은 ${second} 분류에서 둘러볼 상품이에요.` };
  }
  return { score: 10, ruleId: 'same-category-1', reason: `같은 ${first} 분류에서 둘러볼 상품이에요.` };
}
