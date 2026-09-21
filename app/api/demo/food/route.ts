import { demoFood } from '../../../../src/data/demo-food.ts';

export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json(demoFood, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
