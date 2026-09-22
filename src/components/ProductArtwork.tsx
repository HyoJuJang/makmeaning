'use client';

import { useState, type CSSProperties } from 'react';
import type { GameAsset } from '../lib/game-asset-types';

/** Catalog photos remain source metadata, never the visual fallback for real products. */
export default function ProductArtwork({ asset, name, productId, className = 'sc-product-visual', style }: {
  asset?: GameAsset | null; name: string; productId?: string; className?: string; style?: CSSProperties;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!asset || asset.status !== 'ready' || failedUrl === asset.url) {
    return <span className={className} role="img" aria-label={`${name} 공간 이미지 준비 중`} data-artwork-state="unavailable" style={{ display: 'grid', placeItems: 'center', padding: 8, background: '#edf0e4', color: '#68775e', fontSize: 11, textAlign: 'center', ...style }}>공간 이미지 준비 중</span>;
  }
  return <svg className={className} style={style} viewBox={`${asset.frame.x} ${asset.frame.y} ${asset.frame.width} ${asset.frame.height}`} role="img" aria-label={`${name} 공간용 이미지`} data-game-asset={asset.id} preserveAspectRatio="xMidYMid meet">
    <image href={asset.url} width={asset.width} height={asset.height} data-product-image={productId} style={{ imageRendering: 'pixelated' }} onError={() => setFailedUrl(asset.url)} />
  </svg>;
}
