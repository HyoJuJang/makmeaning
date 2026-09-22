import { mapAssetProduct, validateResolveIds } from './asset-db/contracts.ts';
import type { AssetProductMapping } from './asset-db/contracts.ts';
import { assetBaseOrigin } from './asset-db/image-origin.ts';

export type AssetLookup = (ids: string[]) => Promise<AssetProductMapping[]>;

/** Server-to-server lookup; browser clients never receive a database credential. */
export function remoteAssetLookup(baseUrl: string, request: typeof fetch = fetch): AssetLookup {
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new Error('Invalid asset API origin');
  return async ids => {
    validateResolveIds(ids);
    const url = new URL('/api/game-assets/resolve', base);
    url.searchParams.set('ids', ids.join(','));
    const response = await request(url, { cache: 'no-store', signal: AbortSignal.timeout(10000), redirect: 'error' });
    if (!response.ok) throw new Error('Asset service unavailable');
    const data = await response.json();
    if (!Array.isArray(data.products)) throw new Error('Invalid asset service response');
    const seen = new Set<string>();
    return data.products.map((value: AssetProductMapping) => {
      if (!value || !ids.includes(value.prd_id) || seen.has(value.prd_id)) throw new Error('Unexpected asset product');
      seen.add(value.prd_id);
      let imageOrigin = '';
      let metadata = value.asset;
      if (metadata?.url.startsWith('https://')) {
        const image = new URL(metadata.url);
        imageOrigin = assetBaseOrigin(image.origin) ?? '';
        if (image.username || image.password || image.search || image.hash) throw new Error('Invalid asset image URL');
        metadata = { ...metadata, url: image.pathname };
      }
      const mapping = mapAssetProduct({ prd_id: value.prd_id, domain: value.domain, status: value.status, family_id: value.familyId,
        asset_id: value.assetId, reasons: value.reasons, asset_metadata: metadata });
      if (mapping.asset && imageOrigin) mapping.asset.url = imageOrigin + mapping.asset.url;
      return mapping;
    });
  };
}
