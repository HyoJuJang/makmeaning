import assert from 'node:assert/strict';
import { test } from 'node:test';
import source from '../data/demo-persona-purchases.json' with { type: 'json' };
import { demoRecommendationProfile } from '../src/lib/recommendation/personas.ts';
import { recommendForUser } from '../src/lib/recommendation/engine.ts';

const products = [...new Map(source.personas.flatMap(p => p.purchases).map(p => [p.productId, {
  prd_id: p.productId, view_name: p.productName, domain: p.category,
  cate1_nm: p.category, cate2_nm: '', cate3_nm: '', cate4_nm: '', brand_name: '', discprice: 10000,
}])).values()];
const index = { version: 1, products, neighbors: {}, popularity: {}, summary: {}, builtAt: 'test', window: { from: '', to: '' } };

test('each demo user ID resolves exactly the chosen ownership, with no fabricated click/cart evidence', () => {
  for (const persona of source.personas) {
    const profile = demoRecommendationProfile(persona.id);
    assert.deepEqual(profile.items.map(item => item.productId), persona.purchases.map(item => item.productId));
    assert.ok(profile.items.every(item => item.orderCount === 1 && item.cartCount === 0 && item.viewCount === 0 && item.lastAt === ''));
    profile.items.pop();
    assert.equal(demoRecommendationProfile(persona.id).items.length, 10);
  }
  assert.equal(demoRecommendationProfile('real-user'), null);
  assert.equal(demoRecommendationProfile(), null);
});

test('all four persona IDs seed both recommendation modes and exclude owned products; selection stays the only anchor', () => {
  for (const persona of source.personas) for (const domain of ['fashion', 'food', 'living', 'beauty']) for (const mode of ['behavior', 'metadata']) {
    const owned = persona.purchases.filter(p => p.category === domain).map(p => p.productId);
    const profile = demoRecommendationProfile(persona.id);
    const request = { userId: persona.id, domain, mode };
    const result = recommendForUser(index, profile, request);
    assert.equal(result.userState, 'history');
    assert.deepEqual(new Set(result.anchors.map(a => a.product.prd_id)), new Set(owned));
    assert.ok(result.items.every(item => !owned.includes(item.product.prd_id)));
    const selected = recommendForUser(index, profile, { ...request, anchorProductId: owned[0] });
    assert.deepEqual(selected.anchors.map(a => a.product.prd_id), [owned[0]]);
    assert.ok(selected.items.every(item => item.anchorProductId === owned[0] && !owned.includes(item.product.prd_id)));
  }
});
