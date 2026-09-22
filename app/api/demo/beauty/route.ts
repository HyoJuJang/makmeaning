import { demoCatalogResponse } from '../../../../src/lib/demo-catalog.ts';
import { getProductRepository } from '../../../../src/lib/products/database.ts';

import { lookupRoomGameAssets } from '../../../../src/lib/runtime-game-assets.ts';
import { personaSourceFromRequest } from '../../../../src/lib/demo-personas.ts';

export const dynamic = 'force-dynamic';

export async function GET(request?: Request): Promise<Response> {
  return demoCatalogResponse('beauty', getProductRepository, lookupRoomGameAssets, personaSourceFromRequest(request));
}
