import type { GameAsset } from '../lib/game-asset-types';
import type { CSSProperties } from 'react';

/** Display-only framing; the generated transparent source PNG stays untouched. */
export function GameItemSprite({ asset, className, style, x, y, width, height, productId }: {
  asset: GameAsset; className?: string; style?: CSSProperties;
  x?: number; y?: number; width?: number; height?: number; productId?: string;
}) {
  return <svg className={className} style={style} x={x} y={y} width={width} height={height} viewBox={`${asset.frame.x} ${asset.frame.y} ${asset.frame.width} ${asset.frame.height}`} role="img" aria-label={asset.label} data-game-asset={asset.id} preserveAspectRatio="xMidYMax meet">
    <image href={asset.url} width={asset.width} height={asset.height} data-product-image={productId} style={{ imageRendering: 'pixelated' }} />
  </svg>;
}
