import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');
test('game asset integration preserves recommendation panels and uses mood artwork for real product lists', () => {
  for (const path of ['../src/components/scene/ScenePage.tsx', '../src/components/catalog/CatalogScenePage.tsx']) {
    const page = source(path);
    assert.match(page, /<RecommendationPanel domain=\{category\}/);
    assert.match(page, /<ProductArtwork asset=\{(?:item|product)\.gameAsset\}/);
    assert.match(page, /ProductArtwork/);
    assert.doesNotMatch(page, /PersonaSwitcher/);
  }
});
test('room sprites use category ownership and keep cart items out of the hero', () => {
  const scene = source('../src/components/scene/ScenePage.tsx');
  const catalog = source('../src/components/catalog/CatalogScenePage.tsx');
  assert.match(scene, /getHeroProducts\(collection, confirmedState\)/);
  assert.match(scene, /<LivingOwnedProducts entries=\{heroEntries\}/);
  assert.match(catalog, /catalogRoomItems\(data, confirmed\)/);
  assert.match(catalog, /visible && <GameItemSprite asset=\{entry\.product\.gameAsset\}/);
  assert.doesNotMatch(scene, /className="sc-room-cushion"/);
});
