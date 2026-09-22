import { getAssetRepository } from '../../../../../src/lib/asset-db/database.ts';
import { findAsset } from '../../../../../src/lib/asset-db/handlers.ts';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(_request: Request, context: { params: Promise<{ assetId: string }> }): Promise<Response> {
  const { assetId } = await context.params; return findAsset(assetId, getAssetRepository);
}
