import 'server-only';
import { getAssetRepository } from './asset-db/database.ts';
import { remoteAssetLookup } from './remote-game-assets.ts';
import type { AssetLookup } from './remote-game-assets.ts';
import { getGameProduct } from './game-assets.ts';
import { readyGameAsset } from './game-product-display.ts';

/** A configured service failure is surfaced, never disguised as stale local success. */
export const lookupRoomGameAssets: AssetLookup = async ids => {
  if (process.env.ASSET_API_URL) return remoteAssetLookup(process.env.ASSET_API_URL)(ids);
  if (process.env.ASSET_DATABASE_URL) return getAssetRepository().findMany(ids);
  return ids.flatMap(id => {
    const product = getGameProduct(id);
    return product ? [{ prd_id: id, domain: product.domain, status: product.assetStatus, familyId: product.familyId,
      assetId: product.assetId, reasons: product.reasons, asset: readyGameAsset(id, product.domain) }] : [];
  });
};
