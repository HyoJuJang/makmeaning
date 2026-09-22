import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/components/ProductArtwork.tsx', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function component(photos = false) {
  let failed = null;
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(code, { exports, require(name) {
    if (name === 'react') return { useState: () => [failed, value => { failed = value; }] };
    if (name === './ProductImageMode') return { useProductImageMode: () => ({ showProductPhotos: photos }) };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    throw Error(name);
  } });
  return exports.default;
}
const asset = { id: 'reviewed', status: 'ready', url: 'https://example.test/mood.png', width: 100, height: 100, frame: { x: 10, y: 15, width: 60, height: 70 } };
test('ready asset renders its cropped sprite, not catalog photography', () => {
  const result = component()({ asset, name: '상품', productId: '123' });
  assert.equal(result.type, 'svg');
  assert.equal(result.props.viewBox, '10 15 60 70');
  assert.equal(result.props.children.props.href, asset.url);
  assert.equal(result.props.children.props['data-product-image'], '123');
});
test('unmapped and failed art remain honest placeholders rather than real-photo fallback', () => {
  const render = component();
  assert.equal(render({ name: '상품' }).props['data-artwork-state'], 'unavailable');
  render({ asset, name: '상품' }).props.children.props.onError();
  assert.equal(render({ asset, name: '상품' }).props['data-artwork-state'], 'unavailable');
  assert.equal(render({ asset: { ...asset, url: 'new.png' }, name: '다음 상품' }).type, 'svg');
});
test('recommendation cards use the same asset visual without hardcoded real photo URLs', () => {
  const cards = readFileSync(new URL('../src/components/recommendation/RecommendationCards.tsx', import.meta.url), 'utf8');
  assert.match(cards, /ProductArtwork asset=\{product.gameAsset\}/);
  assert.doesNotMatch(cards, /asset\.m-gs\.kr/);
});

const photoUrl = 'https://asset.m-gs.kr/prod/123/1/550';
test('explicit photo mode renders the exact catalog photograph even when game artwork is unavailable', () => {
  const render = component(true);
  for (const art of [asset, null]) {
    const result = render({ asset: art, photoUrl, name: '상품', productId: '123' });
    assert.equal(result.type, 'img');
    assert.equal(result.props.src, photoUrl);
    assert.equal(result.props['data-product-image'], '123');
    assert.equal(result.props['data-image-mode'], 'photo');
  }
});
test('photo failure stays explicit and never substitutes a generated depiction', () => {
  const render = component(true);
  render({ asset, photoUrl, name: '상품', productId: '123' }).props.onError();
  const result = render({ asset, photoUrl, name: '상품', productId: '123' });
  assert.equal(result.props['data-artwork-state'], 'unavailable');
  assert.equal(result.props['data-image-mode'], 'photo');
});
test('default mode retains the sprite even when an exact photo is available', () => {
  const result = component()({ asset, photoUrl, name: '상품', productId: '123' });
  assert.equal(result.type, 'svg');
  assert.equal(result.props.children.props.href, asset.url);
});
