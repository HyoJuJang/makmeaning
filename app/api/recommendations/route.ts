import { recommendationsResponse } from '../../../src/lib/recommendation/handlers.ts';
import { recommendationStore } from '../../../src/lib/recommendation/server.ts';
import { recommendationAssetResponse } from '../../../src/lib/recommendation/asset-hydration.ts';
import { lookupRoomGameAssets } from '../../../src/lib/runtime-game-assets.ts';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function POST(request: Request): Promise<Response> {
  return recommendationAssetResponse(await recommendationsResponse(request, recommendationStore), lookupRoomGameAssets);
}
