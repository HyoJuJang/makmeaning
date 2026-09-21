import { useId, type CSSProperties } from 'react';
import type { CategoryProductEntry, Purchase } from '../../types/home';

/** Only geometry belongs to this view. Identity, art and numbering come from the collection. */
function placement(entry: CategoryProductEntry, entries: CategoryProductEntry[]) {
  const roleIndex = entries.filter(item => item.presentationRole === entry.presentationRole).findIndex(item => item.id === entry.id);
  if (entry.presentationRole === 'sofa') return {
    art: { left: `${32.8 + roleIndex * 15}%`, top: '13%', width: '13%', height: '36%' },
    pin: { left: `${30 + roleIndex * 20}%`, top: '35%' },
  };
  if (entry.presentationRole === 'lamp') return {
    art: { left: `${74 + roleIndex * 12}%`, top: '6%', width: '12%', height: '73%' },
    pin: { left: `${80 + roleIndex * 12}%`, top: '36%' },
  };
  // A category-owned shelf item gets a real surface even when it has no legacy roomSlot.
  return {
    art: { left: `${72 + roleIndex * 8}%`, top: '34%', width: '8%', height: '27%' },
    pin: { left: `${76 + roleIndex * 8}%`, top: '29%' },
  };
}

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
      const position = placement(entry, entries);
      return <span className="sc-living-owned-product" key={entry.id} data-hero-product-id={entry.id} data-hero-status={entry.status} data-hero-role={entry.presentationRole} data-hero-source-image={entry.imageUrl} data-hero-on={entry.on ?? undefined}>
        {entry.artVisible && <img className={`sc-living-owned-art${entry.presentationRole === 'lamp' ? ' sc-living-owned-art--lamp' : ''}`} src={entry.imageUrl} alt="" aria-hidden="true" data-hero-art-product-id={entry.id} style={{ ...position.art, '--hero-lamp-on': lit ? 1 : 0 } as CSSProperties} />}
        {selectedId === entry.id && <span className="sc-room-target sc-living-owned-target" style={position.art} aria-hidden="true" />}
        <button className="sc-room-pin sc-living-owned-pin" style={position.pin} data-hero-control-product-id={entry.id} aria-label={`${entry.product.name} 기준으로 추천받기`} aria-pressed={selectedId === entry.id} onClick={() => onSelect(entry.product)}><span>{entry.displayIndex}</span></button>
      </span>;
    })}
  </>;
}
