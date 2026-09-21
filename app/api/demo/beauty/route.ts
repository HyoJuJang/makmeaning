import { demoCatalogResponse } from '../../../../src/lib/demo-catalog.ts';
import { getProductRepository } from '../../../../src/lib/products/database.ts';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return demoCatalogResponse('beauty', getProductRepository);
}
