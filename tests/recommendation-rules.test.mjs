import assert from 'node:assert/strict';
import test from 'node:test';
import { metadataMatch, metadataRules } from '../src/lib/recommendation/rules.ts';

const product = (domain, path, id = path.join('/')) => ({
  prd_id: id, view_name: '상품명은 분류 매칭에 사용하지 않음', domain,
  cate1_nm: path[0] ?? '', cate2_nm: path[1] ?? '', cate3_nm: path[2] ?? '', cate4_nm: path[3] ?? '',
  brand_name: '브랜드', discprice: 10000,
});

test('each domain has a compact, unique explicit category rule set', () => {
  assert.equal(new Set(metadataRules.map(rule => rule.id)).size, metadataRules.length);
  for (const domain of ['fashion', 'living', 'food', 'beauty']) {
    const rules = metadataRules.filter(rule => rule.domain === domain);
    assert.ok(rules.length >= 6 && rules.length <= 10);
    for (const rule of rules) {
      assert.ok(rule.from.length && rule.to.length);
      assert.ok(rule.score > 30, `${rule.id} must outrank same-category alternatives`);
      for (const path of [...rule.from, ...rule.to]) {
        assert.ok(path.length >= 1 && path.length <= 4);
        assert.ok(path.every(value => typeof value === 'string' && value.trim()));
      }
    }
  }
});

test('all four domains connect concrete purchase categories to companion categories', () => {
  const examples = [
    ['fashion', ['니트/가디건', '니트/스웨터'], ['바지', '긴바지'], 'fashion-top-bottom'],
    ['living', ['가구', '소파', '가죽소파'], ['홈패브릭', '쿠션/방석/소파매트'], 'living-sofa-decor'],
    ['food', ['음료', '커피', '원두커피'], ['간식/과자', '과자'], 'food-coffee-snack'],
    ['beauty', ['스킨케어', '에센스/세럼/앰플'], ['스킨케어', '크림'], 'beauty-serum-cream'],
    ['beauty', ['헤어케어', '샴푸/린스'], ['헤어케어', '트리트먼트/헤어팩'], 'beauty-shampoo-treatment'],
  ];
  for (const [domain, from, to, ruleId] of examples) {
    const result = metadataMatch(product(domain, from), product(domain, to));
    assert.equal(result?.ruleId, ruleId);
    assert.match(result.reason, /함께 둘러볼/);
  }
});

test('pasta sauces use the exact leaf; noodle soup and other sauces are not pasta matches', () => {
  const pasta = product('food', ['기타가공식품', '면류', '스파게티면']);
  const sauce = product('food', ['기타가공식품', '장/소스류', '스파게티소스']);
  assert.equal(metadataMatch(pasta, sauce)?.ruleId, 'food-pasta-sauce');
  assert.equal(metadataMatch(sauce, pasta)?.ruleId, 'food-sauce-pasta');
  for (const path of [['기타가공식품', '면류', '냉면'], ['기타가공식품', '장/소스류', '간장']]) {
    assert.notEqual(metadataMatch(product('food', path), sauce)?.ruleId, 'food-pasta-sauce');
    assert.notEqual(metadataMatch(pasta, product('food', path))?.ruleId, 'food-pasta-sauce');
  }
  const renamedNoodle = { ...product('food', ['기타가공식품', '면류', '냉면']), view_name: '스파게티 파스타' };
  assert.notEqual(metadataMatch(renamedNoodle, sauce)?.ruleId, 'food-pasta-sauce');
});

test('base makeup connects exactly to puff/sponge without assuming accessory compatibility', () => {
  const anchor = product('beauty', ['메이크업', '베이스메이크업']);
  assert.equal(metadataMatch(anchor, product('beauty', ['미용소품', '메이크업소품', '퍼프/스펀지']))?.ruleId, 'beauty-base-puff');
  assert.equal(metadataMatch(anchor, product('beauty', ['미용소품', '메이크업소품', '메이크업브러시'])), null);
});

test('explicit opposite fashion audience labels are excluded, including category fallbacks', () => {
  const bag = product('fashion', ['가방/지갑', '남성가방']);
  assert.equal(metadataMatch(bag, product('fashion', ['가방/지갑', '여성지갑'])), null);
  assert.equal(metadataMatch(bag, product('fashion', ['가방/지갑', '남성지갑']))?.ruleId, 'fashion-bag-wallet');
  assert.equal(metadataMatch(
    product('fashion', ['스포츠의류', '남성스포츠의류', '긴바지']),
    product('fashion', ['스포츠의류', '여성스포츠의류', '티셔츠']),
  ), null);
  assert.equal(metadataMatch(
    product('fashion', ['스포츠의류', '여성스포츠의류', '긴바지']),
    product('fashion', ['스포츠신발', '운동화/스니커즈']),
  )?.ruleId, 'fashion-sports-shoes');
  const neutralTop = { ...product('fashion', ['티셔츠', '반팔티셔츠']), view_name: '남성 여름 티셔츠' };
  assert.equal(metadataMatch(neutralTop, product('fashion', ['신발', '여성신발', '운동화/스니커즈']))?.ruleId, 'fashion-clothes-shoes');
});

test('vitamins and supplements receive category alternatives, never meal or recipe connections', () => {
  const vitamin = product('food', ['비타민/미네랄', '멀티비타민']);
  const sameCategory = product('food', ['비타민/미네랄', '멀티비타민'], 'another-vitamin');
  assert.equal(metadataMatch(vitamin, sameCategory)?.ruleId, 'same-category-2');
  assert.doesNotMatch(metadataMatch(vitamin, sameCategory).reason, /한끼|요리|식단|레시피|효능|치료/);
  for (const path of [['간식/과자', '빵'], ['기타가공식품', '즉석밥/죽/스프', '즉석밥'], ['스킨케어', '크림']]) {
    assert.equal(metadataMatch(vitamin, product('food', path)), null);
  }
  assert.equal(metadataMatch(product('food', ['영양제', '기타영양제']), product('food', ['국/탕/찌개', '삼계탕'])), null);
});

test('same-category fallbacks require the complete nonempty parent path', () => {
  const anchor = product('living', ['청소용품', '막대걸레/청소포']);
  assert.equal(metadataMatch(anchor, product('living', ['청소용품', '막대걸레/청소포'], 'second'))?.score, 30);
  assert.equal(metadataMatch(anchor, product('living', ['청소용품', '걸레/와이퍼타올']))?.score, 10);
  assert.equal(metadataMatch(anchor, product('living', ['주방용품', '막대걸레/청소포'])), null);
  const blank = product('food', [], 'blank-1');
  assert.equal(metadataMatch(blank, product('food', [], 'blank-2')), null);
  assert.equal(metadataMatch({ ...blank, cate1_nm: null, cate2_nm: null }, { ...blank, prd_id: 'null-2' }), null);
  assert.equal(metadataMatch(product('living', ['청소용품'], 'a'), product('living', ['청소용품'], 'b'))?.score, 10);
});

test('self and cross-domain products are excluded even if their category paths match', () => {
  const anchor = product('beauty', ['스킨케어', '에센스/세럼/앰플']);
  assert.equal(metadataMatch(anchor, { ...anchor }), null);
  assert.equal(metadataMatch(anchor, { ...product('beauty', ['스킨케어', '크림']), domain: 'food' }), null);
  assert.equal(metadataMatch(anchor, { ...anchor, domain: 'living', prd_id: 'other' }), null);
});

test('rules do not depend on price, brand, name, clicks, orders, or popularity fields', () => {
  const anchor = product('beauty', ['스킨케어', '에센스/세럼/앰플']);
  const candidate = product('beauty', ['스킨케어', '크림']);
  const expected = metadataMatch(anchor, candidate);
  assert.deepEqual(metadataMatch(
    { ...anchor, view_name: '다른이름', brand_name: '', discprice: 0 },
    { ...candidate, view_name: '', brand_name: '무관', discprice: 9999999, rating: 999, clicks: 1234 },
  ), expected);
});
