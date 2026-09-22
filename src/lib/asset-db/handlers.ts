import { AssetApiError, parseAssetFilters, parseResolveIds, validateAssetId, validateAssetProductId } from './contracts.ts';
import type { AssetRepository } from './contracts.ts';
type Factory = () => AssetRepository;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
function failure(error: unknown): Response {
  if (error instanceof AssetApiError) return json({ error: { code: error.code, message: error.message } }, error.status);
  return json({ error: { code: 'ASSET_DATABASE_UNAVAILABLE', message: '에셋 정보를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.' } }, 503);
}
export async function listAssets(request: Request, getRepository: Factory): Promise<Response> {
  try { return json(await getRepositoryAfterParsing(request, getRepository)); } catch (error) { return failure(error); }
}
function getRepositoryAfterParsing(request: Request, getRepository: Factory) {
  const filters = parseAssetFilters(new URL(request.url).searchParams);
  return getRepository().list(filters);
}
export async function resolveAssets(request: Request, getRepository: Factory): Promise<Response> {
  try {
    const ids = parseResolveIds(new URL(request.url).searchParams);
    const products = await getRepository().findMany(ids), found = new Set(products.map(p => p.prd_id));
    return json({ products, missingIds: ids.filter(id => !found.has(id)) });
  } catch (error) { return failure(error); }
}
export async function findAssetProduct(id: string, getRepository: Factory): Promise<Response> {
  try {
    const valid = validateAssetProductId(id), product = await getRepository().find(valid);
    if (!product) throw new AssetApiError(404, 'ASSET_PRODUCT_NOT_FOUND', '에셋 대상 목록에 없는 상품입니다.');
    return json({ product });
  } catch (error) { return failure(error); }
}
export async function findAsset(id: string, getRepository: Factory): Promise<Response> {
  try {
    const valid = validateAssetId(id), asset = await getRepository().findAsset(valid);
    if (!asset) throw new AssetApiError(404, 'ASSET_NOT_FOUND', '해당 에셋을 찾을 수 없습니다.');
    return json({ asset });
  } catch (error) { return failure(error); }
}
