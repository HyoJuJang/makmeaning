import { demoHome } from '../../../../src/data/demo-home.ts';

export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json(demoHome, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
