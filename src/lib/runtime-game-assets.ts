import 'server-only';
import { getAssetRepository } from './asset-db/database.ts';
import { remoteAssetLookup } from './remote-game-assets.ts';
import type { AssetLookup } from './remote-game-assets.ts';

/** A configured service failure is surfaced, never disguised as stale local success. */
export const lookupRoomGameAssets: AssetLookup = async ids => {
  if (process.env.ASSET_API_URL) return remoteAssetLookup(process.env.ASSET_API_URL)(ids);
  if (process.env.ASSET_DATABASE_URL) return getAssetRepository().findMany(ids);
  // Normal app builds do not ship generated PNGs. A local manifest approval
  // does not establish runtime image availability; retain product-photo fallback.
  return [];
};
