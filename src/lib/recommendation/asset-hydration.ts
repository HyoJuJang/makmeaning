import type { AssetLookup } from '../remote-game-assets.ts';
import type { AssetProductMapping } from '../asset-db/contracts.ts';
import type { RecommendationProduct, RecommendationResponse } from './types.ts';

/** Artwork is a presentation-only join: never filter, reorder or replace candidates. */
export async function hydrateRecommendationAssets(data: RecommendationResponse, lookup: AssetLookup): Promise<RecommendationResponse> {
  const products = [...data.items.map(item => item.product), ...data.anchors.map(anchor => anchor.product)];
  const ids = [...new Set(products.map(product => product.prd_id))];
  const eligible = ids.filter(id => /^[0-9]{1,64}$/.test(id));
  const mappings = new Map<string, AssetProductMapping>();
  let unavailable = false;
  // Includes anchors as well as result cards, while respecting the service's 50-ID limit.
  for (let start = 0; start < eligible.length; start += 50) {
    const batch = eligible.slice(start, start + 50);
    try {
      const rows = await lookup(batch);
      const seen = new Set<string>();
      for (const row of rows) {
        if (!batch.includes(row.prd_id) || seen.has(row.prd_id)) throw new Error('Invalid asset mapping');
        seen.add(row.prd_id);
      }
      for (const row of rows) mappings.set(row.prd_id, row);
    } catch {
      // Asset outages must not erase otherwise valid recommendations or expose driver errors.
      unavailable = true;
    }
  }
  const mappedIds = new Set<string>();
  const hydrate = (product: RecommendationProduct): RecommendationProduct => {
    const mapping = mappings.get(product.prd_id);
    const asset = mapping?.asset;
    const valid = mapping?.status === 'ready' && mapping.domain === product.domain
      && asset?.domain === product.domain && asset.status === 'ready'
      && mapping.assetId === asset.id && mapping.familyId === asset.familyId;
    if (valid) mappedIds.add(product.prd_id);
    return { ...product, gameAsset: valid ? asset : null, imageUrl: /^[0-9]{1,64}$/.test(product.prd_id) ? `https://asset.m-gs.kr/prod/${encodeURIComponent(product.prd_id)}/1/550` : undefined };
  };
  const items = data.items.map(item => ({ ...item, product: hydrate(item.product) }));
  const anchors = data.anchors.map(anchor => ({ ...anchor, product: hydrate(anchor.product) }));
  return { ...data, items, anchors, assets: {
    status: unavailable ? 'unavailable' : mappedIds.size === ids.length ? 'ready' : 'partial',
    mapped: mappedIds.size, total: ids.length,
  } };
}

export async function recommendationAssetResponse(response: Response, lookup: AssetLookup): Promise<Response> {
  if (!response.ok) return response;
  const data = await hydrateRecommendationAssets(await response.json() as RecommendationResponse, lookup);
  return Response.json(data, { status: response.status, headers: response.headers });
}
