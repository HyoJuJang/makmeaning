import { demoCatalogs } from '../../../../src/data/demo-catalog.ts';

export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json(demoCatalogs.food, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
