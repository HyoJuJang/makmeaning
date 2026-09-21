import { getProductRepository } from '../../../src/lib/products/database.ts';
import { listProducts } from '../../../src/lib/products/handlers.ts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  return listProducts(request, getProductRepository);
}
