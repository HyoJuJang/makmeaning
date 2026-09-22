import test from 'node:test';
import assert from 'node:assert/strict';
import { hydrateRecommendationAssets, recommendationAssetResponse } from '../src/lib/recommendation/asset-hydration.ts';

const product = id => ({ prd_id: String(id), domain: 'fashion', view_name: `Product ${id}`, discprice: 1000 });
const item = id => ({ product: product(id), score: 10, reason: 'Existing reason', source: 'catalog', signals: { behavior: 0, metadata: 1, popularity: 0 } });
const response = (count = 2) => ({ domain: 'fashion', items: Array.from({ length: count }, (_, i) => item(i + 1)), anchors: [{ product: product(1), source: 'selected' }], totalCandidates: 123 });
const mapping = id => ({ prd_id: String(id), domain: 'fashion', status: 'ready', familyId: 'shirt', assetId: 'shirt-white', asset: { id: 'shirt-white', familyId: 'shirt', domain: 'fashion', status: 'ready', url: 'https://store.public.blob.vercel-storage.com/assets/game-items/v1/fashion/shirt/white.png' } });

test('recommendation assets use exact IDs and preserve ranking, identity, signals and anchors', async () => {
  const original = response();
  const result = await hydrateRecommendationAssets(original, async ids => {
    assert.deepEqual(ids, ['1', '2']);
    return [mapping(1)];
  });
  assert.equal(result.items[0].product.gameAsset.id, 'shirt-white');
  assert.equal(result.anchors[0].product.gameAsset.id, 'shirt-white');
  assert.equal(result.items[1].product.gameAsset, null);
  assert.deepEqual(result.assets, { status: 'partial', mapped: 1, total: 2 });
  assert.equal(original.items[0].product.gameAsset, undefined);
  for (let i = 0; i < result.items.length; i++) {
    const { gameAsset, imageUrl, ...raw } = result.items[i].product;
    assert.equal(imageUrl, `https://asset.m-gs.kr/prod/${original.items[i].product.prd_id}/1/550`);
    assert.deepEqual({ ...result.items[i], product: raw }, original.items[i]);
  }
  assert.equal(result.totalCandidates, original.totalCandidates);
});

test('lookup deduplicates IDs and batches at 50 without changing result order', async () => {
  const batches = [];
  const result = await hydrateRecommendationAssets(response(103), async ids => { batches.push(ids); return ids.map(mapping); });
  assert.deepEqual(batches.map(ids => ids.length), [50, 50, 3]);
  assert.deepEqual(result.items.map(item => item.product.prd_id), Array.from({ length: 103 }, (_, i) => String(i + 1)));
  assert.deepEqual(result.assets, { status: 'ready', mapped: 103, total: 103 });
});

test('wrong domain, pending and mismatched asset identity never become artwork', async () => {
  for (const bad of [
    { ...mapping(1), domain: 'beauty' },
    { ...mapping(1), status: 'needs_review' },
    { ...mapping(1), assetId: 'another-shirt' },
    { ...mapping(1), asset: { ...mapping(1).asset, domain: 'beauty' } },
  ]) {
    const result = await hydrateRecommendationAssets(response(), async () => [bad]);
    assert.equal(result.items[0].product.gameAsset, null);
  }
});

test('outage and invalid response preserve recommendations without exposing errors', async () => {
  for (const lookup of [async () => { throw Error('private credential'); }, async () => [mapping(1), mapping(1)], async () => [mapping(999)]]) {
    const result = await hydrateRecommendationAssets(response(), lookup);
    assert.equal(result.assets.status, 'unavailable');
    assert.equal(result.items.length, 2);
    assert(result.items.every(item => item.product.gameAsset === null));
    assert(!JSON.stringify(result).includes('credential'));
  }
});

test('HTTP error bodies are untouched and successful headers remain no-store', async () => {
  const error = Response.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  assert.equal(await recommendationAssetResponse(error, async () => { throw Error('must not call'); }), error);
  const success = await recommendationAssetResponse(Response.json(response(), { headers: { 'Cache-Control': 'no-store' } }), async () => [mapping(1)]);
  assert.equal(success.status, 200);
  assert.equal(success.headers.get('Cache-Control'), 'no-store');
  assert.equal((await success.json()).items[0].product.gameAsset.id, 'shirt-white');
});
