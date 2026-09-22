import test from 'node:test';
import assert from 'node:assert/strict';
import { FAMILIES, classifyProduct } from './game-asset-rules.mjs';

const row = (domain, name, cats = [], prdId = 'fixture') => ({
  prd_id: prdId, view_name: name, cate1_nm: cats[0] || '', cate2_nm: cats[1] || '',
  cate3_nm: cats[2] || '', cate4_nm: cats[3] || '', brand_name: '시험 브랜드', discprice: '19900', domain,
});

test('family vocabulary is fixed and every family specifies its intended placement', () => {
  // Visually reviewed shapes may expand the vocabulary; SKU counts must not define it.
  assert.ok(Object.isFrozen(FAMILIES));
  for (const [key, family] of Object.entries(FAMILIES)) {
    assert.ok(Object.isFrozen(family));
    assert.match(key, /^[a-z][a-z_]+$/);
    assert.ok(['fashion', 'living', 'food', 'beauty'].includes(family.domain));
    assert.ok(['wardrobe', 'shelf', 'floor', 'table', 'vanity', 'wall'].includes(family.placement));
    assert.equal(family.suggestedSize.length, 2);
  }
});

test('reviewed references preserve neckline, container shape and meaningful colors', () => {
  const cases = [
    ['1128893597', 'fashion', 'cardigan_vneck_solid', 'navy'],
    ['1128893626', 'fashion', 'cardigan_vneck_solid', 'gray'],
    ['1134622052', 'fashion', 'cardigan_round_solid', 'burgundy'],
    ['1053232515', 'living', 'table_lamp_dome', 'ivory'],
    ['1080664026', 'food', 'pasta_long_pouch', 'unspecified'],
    ['1050446037', 'food', 'pasta_long_pouch', 'unspecified'],
    ['1050446036', 'food', 'pasta_long_pouch', 'unspecified'],
    ['1059856091', 'beauty', 'serum_dropper_round', 'blue'],
    ['1118407031', 'beauty', 'serum_dropper_round', 'yellow'],
    ['16052422', 'beauty', 'cosmetic_cylinder_capped', 'unspecified'],
    ['1104285714', 'food', 'beverage_carton', 'unspecified'],
    ['1110422732', 'food', 'beverage_pouch', 'unspecified'],
  ];
  for (const [id, domain, family, color] of cases) {
    const classified = classifyProduct(row(domain, '검토된 상품', [], id));
    assert.equal(classified.familyId, family, id);
    assert.equal(classified.color, color, id);
    assert.equal(classified.mappingStatus, 'classified', id);
    assert.equal(classified.attributes.referenceVerified, true);
  }
});

test('brand, price and pack counts do not split otherwise identical reusable families', () => {
  const a = row('fashion', '무지 브이넥 가디건 네이비', ['니트/가디건', '가디건'], 'a');
  const b = { ...a, prd_id: 'b', view_name: '무지 브이넥 가디건 네이비 2개', brand_name: '다른 브랜드', discprice: '1000' };
  for (const key of ['familyId', 'color', 'pattern', 'mappingStatus']) assert.equal(classifyProduct(a)[key], classifyProduct(b)[key]);
});

test('brand and marketing language are not physical colors or silhouettes', () => {
  const blueJacket = classifyProduct(row('fashion', '블랙야크 블루종 재킷', ['아우터', '블루종']));
  assert.equal(blueJacket.familyId, 'jacket');
  assert.equal(blueJacket.color, 'unspecified');
  const serum = classifyProduct(row('beauty', '화이트닝 유자 블루 세럼 30ml', ['스킨케어', '에센스/세럼/앰플']));
  assert.equal(serum.familyId, 'beauty_review');
  assert.equal(serum.color, 'unspecified');
  assert.equal(serum.mappingStatus, 'needs_review');
});

test('category alone never equates every serum to a dropper or soy drink to a carton', () => {
  const serum = classifyProduct(row('beauty', '새 브랜드 세럼 30ml', ['스킨케어', '에센스/세럼/앰플']));
  const soy = classifyProduct(row('food', '검은콩 두유 16팩', ['음료', '유제품', '두유']));
  const spaghetti = classifyProduct(row('food', '다른 브랜드 스파게티 500g', ['기타가공식품', '면류', '스파게티면']));
  for (const result of [serum, soy, spaghetti]) assert.equal(result.mappingStatus, 'needs_review');
  assert.equal(serum.familyId, 'beauty_review');
  assert.equal(soy.familyId, 'food_review');
  assert.equal(spaghetti.familyId, 'food_review');
});

test('literal packaging descriptions can support a family without inferring its color', () => {
  assert.equal(classifyProduct(row('food', '유리병 사과주스 6병', ['음료', '과일/야채음료'])).familyId, 'beverage_bottle');
  assert.equal(classifyProduct(row('food', '종이팩 우유 24개', ['음료', '유제품', '우유'])).familyId, 'beverage_carton');
  assert.equal(classifyProduct(row('beauty', '펌프형 로션', ['스킨케어', '로션'])).familyId, 'cosmetic_pump');
});

test('accessories, incompatible parts and mixtures do not masquerade as the whole item', () => {
  for (const r of [
    row('fashion', '운동화 뒤꿈치 패드', ['신발', '신발용품']),
    row('fashion', '이너백 호환', ['가방/지갑', '여성가방', '이너백']),
    row('living', '밥솥 내솥', ['주방가전', '전기밥솥', '내솥/패킹']),
    row('beauty', '쿠션 리필 2개', ['메이크업', '베이스메이크업', '쿠션/에센스팩트']),
    row('beauty', '선스틱2+세럼2+키링1', ['선케어', '선스틱']),
    row('living', '식탁 의자 세트', ['가구', '테이블', '거실테이블']),
  ]) assert.equal(classifyProduct(r).mappingStatus, 'needs_review', r.view_name);
});

test('substring collisions in Korean taxonomy do not create wrong objects', () => {
  assert.equal(classifyProduct(row('fashion', '데일리 백팩', ['가방/지갑', '여성가방', '백팩'])).familyId, 'backpack');
  assert.equal(classifyProduct(row('fashion', '나일론 토트백', ['가방/지갑', '여성가방', '토트백'])).familyId, 'handbag');
  assert.equal(classifyProduct(row('living', '음식물처리기', ['주방가전', '음식물처리기'])).familyId, 'living_review');
  assert.equal(classifyProduct(row('living', '공기청정기', ['계절가전', '공기청정기', '공기청정기'])).familyId, 'living_review');
  assert.equal(classifyProduct(row('beauty', '토마토 폼클렌징 500ml', ['클렌징', '클렌징폼/비누/파우더'])).familyId, 'beauty_review');
  assert.equal(classifyProduct(row('fashion', '베스트상품 카고조거팬츠', ['등산/아웃도어', '여성등산의류', '바지/스커트'])).familyId, 'fashion_review');
  assert.equal(classifyProduct(row('fashion', '여성 숄더백', ['양말/패션소품', '스카프/머플러/숄'])).familyId, 'fashion_review');
});

test('multiple color choices and taxonomy conflicts remain unresolved', () => {
  const choice = classifyProduct(row('fashion', '스니커즈 2color', ['신발', '여성신발', '운동화/스니커즈']));
  assert.equal(choice.color, 'unspecified');
  assert.equal(choice.mappingStatus, 'needs_review');
  assert.deepEqual(choice.attributes.colorOptions, []);
  for (const r of [
    row('living', '흙소파 카우치', ['가구', '침대', '기능성침대']),
    row('living', '암막 블라인드', ['커튼/블라인드', '블라인드']),
    row('fashion', '니트 조거팬츠', ['니트/가디건', '니트/스웨터']),
  ]) assert.equal(classifyProduct(r).mappingStatus, 'needs_review', r.view_name);
});

test('classification is deterministic, total and does not mutate source rows', () => {
  const input = Object.freeze(row('fashion', '무지 반팔티셔츠 블랙', ['티셔츠', '반팔티셔츠']));
  assert.deepEqual(classifyProduct(input), classifyProduct(input));
  for (const input of [null, undefined, {}, { domain: 'invalid' }, row('food', '외형 미확인')]) {
    const result = classifyProduct(input);
    assert.ok(FAMILIES[result.familyId]);
    assert.equal(result.mappingStatus, 'needs_review');
    assert.ok(result.reasons.length);
  }
});
