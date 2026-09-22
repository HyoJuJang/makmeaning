import { useId, type CSSProperties } from 'react';
import type { CategoryProductEntry, Purchase } from '../../types/home';
import ProductArtwork from '../ProductArtwork';
import { livingHeroPlacement } from '../../../app/living-hero-placement.js';

export default function LivingOwnedProducts({ entries, selectedId, lit, onSelect }: {
  entries: CategoryProductEntry[];
  selectedId: string | null;
  lit: boolean;
  onSelect: (product: Purchase) => void;
}) {
  const repairId = useId();
  return <>
    {/* Cover the bitmap's decorative blue cushion with neighbouring sofa upholstery.
        This repair is furniture, so an empty collection never reveals a phantom product. */}
    <svg className="sc-living-art-repair" viewBox="0 0 600 200" preserveAspectRatio="none" aria-hidden="true">
      <defs><clipPath id={repairId}><path d="M212 42H262V85H212Z" /></clipPath></defs>
      <g clipPath={`url(#${repairId})`}><image href="/scene-art/living-room.png" x="-88" y="0" width="600" height="200" /></g>
    </svg>
    {entries.map(entry => {
      const position = livingHeroPlacement(entry, entries);
      return <span className="sc-living-owned-product" key={entry.id} data-hero-product-id={entry.id} data-hero-status={entry.status} data-hero-role={entry.presentationRole} data-hero-source-image={entry.imageUrl} data-hero-on={entry.on ?? undefined}>
        {entry.artVisible && <ProductArtwork asset={entry.product.gameAsset} name={entry.product.name} productId={entry.id} photoUrl={entry.imageUrl} className={`sc-living-owned-art${entry.presentationRole === 'lamp' ? ' sc-living-owned-art--lamp' : ''}`} style={{ ...position.art, '--hero-lamp-on': lit ? 1 : 0 } as CSSProperties} />}
        {selectedId === entry.id && <span className="sc-room-target sc-living-owned-target" style={position.art} aria-hidden="true" />}
        <button className="sc-room-pin sc-living-owned-pin" style={position.pin} data-hero-control-product-id={entry.id} aria-label={`${entry.product.name} 기준으로 추천받기`} aria-pressed={selectedId === entry.id} onClick={() => onSelect(entry.product)}><span>{entry.displayIndex}</span></button>
      </span>;
    })}
  </>;
}
