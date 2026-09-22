import { getAssetRepository } from '../../../src/lib/asset-db/database.ts';
import { listAssets } from '../../../src/lib/asset-db/handlers.ts';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request: Request): Promise<Response> { return listAssets(request, getAssetRepository); }
