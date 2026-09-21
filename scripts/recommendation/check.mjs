import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { recommendForUser, DOMAINS } from '../../src/lib/recommendation/engine.ts';

const dir = resolve(process.env.RECOMMENDATION_DATA_DIR || '.recommendation');
const index = JSON.parse(readFileSync(join(dir, 'catalog.json'), 'utf8'));
const samples = JSON.parse(readFileSync(join(dir, 'samples.json'), 'utf8'));
const results = [];
for (const domain of DOMAINS) {
  const id = samples[domain];
  const profile = id ? JSON.parse(readFileSync(join(dir, 'users', `${createHash('sha256').update(id).digest('hex').slice(0, 2)}.json`), 'utf8'))[id] : null;
  const excluded = new Set(profile?.items.filter(item => item.orderCount || item.cartCount).map(item => item.productId));
  for (const mode of ['behavior', 'metadata']) {
    const start = performance.now();
    const result = recommendForUser(index, profile, { domain, mode, limit: 6 });
    assert.ok(result.items.length > 0, `${domain}/${mode} must have results`);
    assert.equal(new Set(result.items.map(item => item.product.prd_id)).size, result.items.length);
    assert.ok(result.items.every(item => item.product.domain === domain && !excluded.has(item.product.prd_id) && Number.isFinite(item.score)));
    if (mode === 'metadata') assert.ok(result.items.every(item => !['behavior', 'popularity'].includes(item.source)));
    results.push({ domain, mode, count: result.items.length, sources: [...new Set(result.items.map(item => item.source))], milliseconds: Math.round(performance.now() - start), first: result.items[0].product.view_name, fallback: result.fallbackReason });
  }
  for (const mode of ['behavior', 'metadata']) {
    const result = recommendForUser(index, null, { domain, mode, limit: 6 });
    assert.equal(result.items.length, 6);
    assert.ok(result.fallbackReason);
  }
}
// Aggregate evidence only. Raw user/session/order identifiers are intentionally not printed.
console.log(JSON.stringify({ passed: true, window: index.window, products: index.products.length, sampleComparisons: results }, null, 2));
