import { getProductRepository } from '../../../../src/lib/products/database.ts';
import { findProduct } from '../../../../src/lib/products/handlers.ts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ prdId: string }> },
): Promise<Response> {
  const { prdId } = await context.params;
  return findProduct(prdId, getProductRepository);
}
