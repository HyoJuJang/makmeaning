import { AssetApiError, publicAsset } from './contracts.ts';
import type { AssetProductMapping, PublicGameAsset } from './contracts.ts';

/** An optional server setting, restricted to one public Vercel Blob store origin. */
export function assetBaseOrigin(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'https:' || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.public\.blob\.vercel-storage\.com$/.test(parsed.hostname)
      || parsed.username || parsed.password || parsed.port || parsed.pathname !== '/' || parsed.search || parsed.hash
      || /[\\\r\n\t?#@]/.test(value)) throw new Error('Invalid image origin');
    return parsed.origin;
  } catch {
    throw new AssetApiError(503, 'ASSET_IMAGE_ORIGIN_INVALID', '에셋 이미지 주소 설정을 확인해 주세요.');
  }
}

/** Metadata stays relative in storage. This returns a new response-only value. */
export function assetWithBaseUrl(asset: PublicGameAsset, baseUrl?: string): PublicGameAsset {
  const clean = publicAsset(asset), origin = assetBaseOrigin(baseUrl);
  return { ...clean, url: origin ? `${origin}${clean.url}` : clean.url };
}
export function mappingWithBaseUrl(mapping: AssetProductMapping, baseUrl?: string): AssetProductMapping {
  return { ...mapping, reasons: [...mapping.reasons], asset: mapping.asset ? assetWithBaseUrl(mapping.asset, baseUrl) : null };
}
