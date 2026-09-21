import { ProductApiError, parseProductFilters, validateProductId } from './contracts.ts';
import type { ProductRepository } from './contracts.ts';

type RepositoryFactory = () => ProductRepository;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function errorResponse(error: unknown): Response {
  if (error instanceof ProductApiError) {
    return json({ error: { code: error.code, message: error.message } }, error.status);
  }
  // Driver errors can contain hosts, SQL and credentials; never forward them.
  return json({ error: {
    code: 'DATABASE_UNAVAILABLE',
    message: '상품 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.',
  } }, 503);
}

export async function listProducts(request: Request, getRepository: RepositoryFactory): Promise<Response> {
  try {
    const filters = parseProductFilters(new URL(request.url).searchParams);
    return json(await getRepository().list(filters));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function findProduct(prdId: string, getRepository: RepositoryFactory): Promise<Response> {
  try {
    const id = validateProductId(prdId);
    const product = await getRepository().find(id);
    if (!product) throw new ProductApiError(404, 'PRODUCT_NOT_FOUND', '해당 상품을 찾을 수 없습니다.');
    return json({ product });
  } catch (error) {
    return errorResponse(error);
  }
}
