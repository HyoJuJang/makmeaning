// Display-only equivalent of GameItemSprite for the existing imperative mini-room.
// Never changes purchase identity, animation state, world bounds or interaction targets.
export function gameItemArt(purchase, { x = 0, y = 0, w = 60, h = 60 } = {}) {
  const asset = purchase?.gameAsset;
  if (!asset || asset.status !== 'ready' || asset.domain !== purchase.category
    || typeof asset.id !== 'string' || !/^[a-z0-9_-]+$/.test(asset.id)
    || typeof asset.url !== 'string' || !/^(?:https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com)?\/assets\/game-items\/v1\/(fashion|food|living|beauty)\/[a-z0-9_-]+\/[a-z0-9_-]+\.png$/.test(asset.url)) return '';
  const frame = asset.frame;
  if (!frame || ![x, y, w, h, asset.width, asset.height, frame.x, frame.y, frame.width, frame.height].every(Number.isFinite)
    || w <= 0 || h <= 0 || asset.width <= 0 || asset.height <= 0 || frame.x < 0 || frame.y < 0
    || frame.width <= 0 || frame.height <= 0 || frame.x + frame.width > asset.width || frame.y + frame.height > asset.height) return '';
  const productId = String(purchase.catalogProductId ?? purchase.id ?? '').replace(/[&<>\"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[char]));
  return `<svg data-game-asset="${asset.id}" x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${frame.x} ${frame.y} ${frame.width} ${frame.height}" preserveAspectRatio="xMidYMax meet" style="pointer-events:none" aria-hidden="true"><image data-product-image="${productId}" href="${asset.url}" width="${asset.width}" height="${asset.height}" style="image-rendering:pixelated"/></svg>`;
}
