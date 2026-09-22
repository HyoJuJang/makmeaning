'use client';

import type { GameAsset } from '../lib/game-asset-types';
import { useState, type CSSProperties } from 'react';
import { useProductImageMode } from './ProductImageMode';

/** Display-only framing; the generated transparent source PNG stays untouched. */
export function GameItemSprite({ asset, photoUrl, name, className, style, x, y, width, height, productId }: {
  asset?: GameAsset | null; photoUrl?: string | null; name?: string; className?: string; style?: CSSProperties;
  x?: number; y?: number; width?: number; height?: number; productId?: string;
}) {
  const { showProductPhotos } = useProductImageMode();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const label = name ?? asset?.label ?? '상품';
  const unavailable = showProductPhotos ? !photoUrl || failedPhotoUrl === photoUrl : !asset || asset.status !== 'ready' || failedUrl === asset.url;
  const mode = showProductPhotos ? 'photo' : 'game';
  if (unavailable) {
    const message = showProductPhotos ? photoUrl ? '사진을 불러오지 못했어요' : '실제 상품 사진 없음' : '공간 이미지 준비 중';
    return <svg className={className} style={style} x={x} y={y} width={width} height={height} viewBox="0 0 100 100" role="img" aria-label={`${label} ${message}`} data-product-image={productId} data-image-mode={mode} data-artwork-state="unavailable" preserveAspectRatio="xMidYMax meet">
      <title>{label} {message}</title>
      <rect x="1" y="1" width="98" height="98" rx="8" fill="#edf0e4" stroke="#a7b299" strokeWidth="2" />
      <path d="M29 31h42v31H29Zm0 23 12-12 12 12 8-8 10 10" fill="none" stroke="#819176" strokeWidth="4" strokeLinejoin="round" />
      <text x="50" y="82" textAnchor="middle" fill="#68775e" fontSize="13">{showProductPhotos ? '사진 없음' : '준비 중'}</text>
    </svg>;
  }
  if (showProductPhotos && photoUrl) {
    return <svg className={className} style={style} x={x} y={y} width={width} height={height} viewBox="0 0 100 100" role="img" aria-label={`${label} 실제 상품 사진`} data-image-mode="photo" preserveAspectRatio="xMidYMax meet">
      <image href={photoUrl} width="100" height="100" preserveAspectRatio="xMidYMid meet" data-product-image={productId} data-image-mode="photo" style={{ imageRendering: 'auto' }} onError={() => setFailedPhotoUrl(photoUrl)} />
    </svg>;
  }
  if (!asset) return null;
  return <svg className={className} style={style} x={x} y={y} width={width} height={height} viewBox={`${asset.frame.x} ${asset.frame.y} ${asset.frame.width} ${asset.frame.height}`} role="img" aria-label={asset.label} data-image-mode="game" data-game-asset={asset.id} preserveAspectRatio="xMidYMax meet">
    <image href={asset.url} width={asset.width} height={asset.height} data-product-image={productId} data-image-mode="game" style={{ imageRendering: 'pixelated' }} onError={() => setFailedUrl(asset.url)} />
  </svg>;
}
