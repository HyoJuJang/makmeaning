import { getAssetRepository } from '../../../../src/lib/asset-db/database.ts';
import { resolveAssets } from '../../../../src/lib/asset-db/handlers.ts';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request: Request): Promise<Response> { return resolveAssets(request, getAssetRepository); }
