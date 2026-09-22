import { recommendationStatusResponse } from '../../../../src/lib/recommendation/handlers.ts';
import { recommendationStore } from '../../../../src/lib/recommendation/server.ts';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export function GET(): Response { return recommendationStatusResponse(recommendationStore); }
