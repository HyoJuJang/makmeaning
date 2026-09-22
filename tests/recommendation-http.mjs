import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { metadataMatch } from '../src/lib/recommendation/rules.ts';
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001';
const samples = JSON.parse(readFileSync(resolve(process.env.RECOMMENDATION_DATA_DIR || '.recommendation', 'samples.json'), 'utf8'));
const get = path => fetch(new URL(path, base), { signal: AbortSignal.timeout(15000) });
const page = await get('/recommendations');
assert.equal(page.status, 200);
assert.match(await page.text(), /추천/);
const status = await (await get('/api/recommendations/status')).json();
assert.equal(status.ready, true);
const post = body => fetch(new URL('/api/recommendations', base), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
for (const domain of ['fashion', 'living', 'food', 'beauty']) {
  for (const mode of ['behavior', 'metadata']) {
    const response = await post({ domain, mode, sample: domain });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const result = await response.json();
    assert.equal(result.items.length, 6);
    assert.equal(result.requestedMode, mode);
    assert.ok(result.items.every(item => item.product.domain === domain));
    if (mode === 'metadata') assert.ok(result.items.every(item => ['metadata', 'catalog'].includes(item.source)));
    assert.ok(!('userId' in result));
    const byId = await post({ domain, mode, userId: samples[domain] });
    assert.equal(byId.status, 200);
    const direct = await byId.json();
    // Compare only IDs to avoid printing private history in a failed assertion.
    assert.deepEqual(direct.items.map(item => item.product.prd_id), result.items.map(item => item.product.prd_id));
    assert.ok(!JSON.stringify(direct).includes(samples[domain]));
    const anchorProductId = result.anchors[0].product.prd_id;
    const selectedResponse = await post({ domain, mode, userId: samples[domain], anchorProductId });
    assert.equal(selectedResponse.status, 200);
    const selected = await selectedResponse.json();
    assert.deepEqual(selected.anchors.map(anchor => anchor.product.prd_id), [anchorProductId]);
    assert.ok(selected.items.every(item => item.anchorProductId === anchorProductId));
    assert.ok(selected.items.every(item => metadataMatch(selected.anchors[0].product, item.product)));
    assert.ok(selected.items.every(item => ['behavior', 'metadata'].includes(item.source)));
  }
  const cold = await (await post({ domain, userId: '__gscene_absent_qa_user__' })).json();
  assert.equal(cold.userState, 'unknown');
  assert.ok(cold.fallbackReason);
}
assert.equal((await post({ domain: 'beauty', mode: 'invalid' })).status, 400);
for (const path of ['/data/user_item_view.csv', '/.recommendation/catalog.json', '/.recommendation/samples.json']) assert.equal((await get(path)).status, 404);
console.log('Recommendation HTTP PASS: four domains × two modes, selected-product scope, real userid lookup, unknown users, validation, private files unavailable over HTTP.');
