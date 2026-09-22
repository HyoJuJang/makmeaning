import { getAssetRepository } from '../../../../../src/lib/asset-db/database.ts';
import { findAssetProduct } from '../../../../../src/lib/asset-db/handlers.ts';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(_request: Request, context: { params: Promise<{ prdId: string }> }): Promise<Response> {
  const { prdId } = await context.params; return findAssetProduct(prdId, getAssetRepository);
}
