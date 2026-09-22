import { demoHomeResponse } from '../../../../src/lib/demo-home.ts';
import { getProductRepository } from '../../../../src/lib/products/database.ts';

import { lookupRoomGameAssets } from '../../../../src/lib/runtime-game-assets.ts';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  return demoHomeResponse(getProductRepository, request, lookupRoomGameAssets);
}
