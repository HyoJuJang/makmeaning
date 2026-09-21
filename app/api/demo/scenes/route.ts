import { demoScenes } from '../../../../src/data/demo-scenes.ts';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  const category = new URL(request.url).searchParams.get('category');
  const headers = { 'Cache-Control': 'no-store' };
  if (category !== 'fashion' && category !== 'living') {
    return Response.json(
      { error: 'category must be fashion or living' },
      { status: 400, headers },
    );
  }
  return Response.json(demoScenes[category], { headers });
}
