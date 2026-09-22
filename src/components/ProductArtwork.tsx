'use client';

import { useState, type CSSProperties } from 'react';
import type { GameAsset } from '../lib/game-asset-types';
import { useProductImageMode } from './ProductImageMode';

/** Switch only the image for this exact product; missing images remain explicit. */
export default function ProductArtwork({ asset, photoUrl, name, productId, className = 'sc-product-visual', style }: {
  asset?: GameAsset | null; photoUrl?: string | null; name: string; productId?: string; className?: string; style?: CSSProperties;
}) {
  const { showProductPhotos } = useProductImageMode();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  if (showProductPhotos) {
    if (!photoUrl || failedPhotoUrl === photoUrl) {
      const message = photoUrl ? '사진을 불러오지 못했어요' : '실제 상품 사진 없음';
      return <span className={className} role="img" aria-label={`${name} ${message}`} data-product-image={productId} data-image-mode="photo" data-artwork-state="unavailable" style={{ display: 'grid', placeItems: 'center', padding: 8, background: '#f1f2ed', color: '#68775e', fontSize: 11, textAlign: 'center', ...style }}>{message}</span>;
    }
    return <img className={className} src={photoUrl} alt={`${name} 실제 상품 사진`} loading="lazy" decoding="async" referrerPolicy="no-referrer" data-product-image={productId} data-image-mode="photo" style={{ ...style, objectFit: 'contain', imageRendering: 'auto' }} onError={() => setFailedPhotoUrl(photoUrl)} />;
  }
  if (!asset || asset.status !== 'ready' || failedUrl === asset.url) {
    return <span className={className} role="img" aria-label={`${name} 공간 이미지 준비 중`} data-product-image={productId} data-image-mode="game" data-artwork-state="unavailable" style={{ display: 'grid', placeItems: 'center', padding: 8, background: '#edf0e4', color: '#68775e', fontSize: 11, textAlign: 'center', ...style }}>공간 이미지 준비 중</span>;
  }
  return <svg className={className} style={style} viewBox={`${asset.frame.x} ${asset.frame.y} ${asset.frame.width} ${asset.frame.height}`} role="img" aria-label={`${name} 공간용 이미지`} data-image-mode="game" data-game-asset={asset.id} preserveAspectRatio="xMidYMid meet">
    <image href={asset.url} width={asset.width} height={asset.height} data-product-image={productId} data-image-mode="game" style={{ imageRendering: 'pixelated' }} onError={() => setFailedUrl(asset.url)} />
  </svg>;
}
