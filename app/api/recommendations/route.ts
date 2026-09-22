import { recommendationsResponse } from '../../../src/lib/recommendation/handlers.ts';
import { recommendationStore } from '../../../src/lib/recommendation/server.ts';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function POST(request: Request): Promise<Response> {
  return recommendationsResponse(request, recommendationStore);
}
