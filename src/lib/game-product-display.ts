import { getGameProduct } from './game-assets.ts';
import type { Domain, GameAsset } from './game-asset-types.ts';

/** Server-side, exact-ID join. Only the requested product's ready artwork crosses to the browser. */
export function readyGameAsset(prdId: string, domain: Domain): GameAsset | null {
  const product = getGameProduct(prdId);
  const asset = product?.domain === domain && product.assetStatus === 'ready' ? product.asset : null;
  if (!asset) return null;
  // Manifest approval lists may contain many other IDs. Keep those server-side.
  const { id, familyId, color, pattern, label, version, sourcePath, url, width, height, frame, anchor, placement, sha256, status } = asset;
  return { id, familyId, color, pattern, domain, label, version, sourcePath, url, width, height, frame, anchor, placement, sha256, status };
}
