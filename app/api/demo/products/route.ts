import { commerceProductsResponse } from '../../../../src/lib/commerce-products.ts';
import { getProductRepository } from '../../../../src/lib/products/database.ts';
import { lookupRoomGameAssets } from '../../../../src/lib/runtime-game-assets.ts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  return commerceProductsResponse(request, getProductRepository, lookupRoomGameAssets);
}
