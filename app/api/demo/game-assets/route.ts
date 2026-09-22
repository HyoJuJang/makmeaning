import { getGameProduct, listGameProducts } from '../../../../src/lib/game-assets.ts';
import { remoteAssetLookup } from '../../../../src/lib/remote-game-assets.ts';
import type { ProductWithAsset } from '../../../../src/lib/game-asset-types.ts';
import type { AssetStatus, Domain } from '../../../../src/lib/game-asset-types.ts';

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const plainJson = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  const json = (body: unknown, status = 200): Response | Promise<Response> => {
    if (status !== 200 || !process.env.ASSET_API_URL) return plainJson(body, status);
    const page = body as { products?: ProductWithAsset[] };
    const products = page.products ?? [body as ProductWithAsset];
    if (!products.length) return plainJson(body);
    return remoteAssetLookup(process.env.ASSET_API_URL)(products.map(product => product.prd_id)).then(mappings => {
      const byId = new Map(mappings.map(mapping => [mapping.prd_id, mapping]));
      const hydrated = products.map(product => {
        const mapping = byId.get(product.prd_id);
        const asset = mapping?.domain === product.domain && mapping.status === 'ready' ? mapping.asset : null;
        return { ...product, assetStatus: mapping?.status ?? 'needs_review', assetId: asset?.id ?? null,
          assetUrl: asset?.url ?? null, asset: asset ? { ...product.asset, ...asset } : null };
      });
      return plainJson(page.products ? { ...page, products: hydrated } : hydrated[0]);
    }).catch(() => plainJson({ error: 'Asset service unavailable' }, 503));
  };
  if (params.has('id')) {
    const id = params.get('id')!;
    if (!/^\d+$/.test(id)) return json({ error: 'id must be an original numeric product ID string' }, 400);
    const product = getGameProduct(id);
    return product ? json(product) : json({ error: 'Product not found' }, 404);
  }
  const domain = params.get('domain') || undefined, status = params.get('status') || undefined;
  const page = params.get('page') ?? '1', limit = params.get('limit') ?? '12';
  if (domain && !['fashion', 'food', 'living', 'beauty'].includes(domain)) return json({ error: 'Invalid domain' }, 400);
  if (status && !['ready', 'pending_generation', 'needs_review'].includes(status)) return json({ error: 'Invalid status' }, 400);
  if (!/^\d+$/.test(page) || !Number.isSafeInteger(Number(page)) || Number(page) < 1) return json({ error: 'Invalid page' }, 400);
  if (!/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 48) return json({ error: 'limit must be between 1 and 48' }, 400);
  const query = params.get('q') ?? '';
  if (query.length > 200) return json({ error: 'Search text is too long' }, 400);
  return json(listGameProducts({ domain: domain as Domain | undefined, status: status as AssetStatus | undefined,
    query, page: Number(page), limit: Number(limit) }));
}
