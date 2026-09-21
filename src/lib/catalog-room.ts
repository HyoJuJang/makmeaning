import type { DemoCatalog, CatalogCategory } from '../types/catalog.ts';
import type { Purchase } from '../types/home.ts';

type Placement = {
  category: CatalogCategory;
  zone: 'fridge' | 'pantry' | 'vanity';
  label: string;
  number: number;
  approachX: number;
  pin: { x: number; y: number };
  art: { x: number; y: number; width: number; height: number; viewBox: string };
};

// Coordinates belong to the existing 450×150 category illustrations. Ownership
// and image URLs still come from the joined home API, never from this geometry.
const PLACEMENTS: Readonly<Record<string, Placement>> = {
  'fridge-1': { category: 'food', zone: 'fridge', label: '냉장고', number: 1, approachX: 22, pin: { x: 126, y: 30 }, art: { x: 77, y: 34, width: 21, height: 30, viewBox: '17 2 33 53' } },
  'fridge-2': { category: 'food', zone: 'fridge', label: '냉장고', number: 2, approachX: 22, pin: { x: 126, y: 104 }, art: { x: 78, y: 74, width: 19, height: 30, viewBox: '17 3 29 52' } },
  'pantry-1': { category: 'food', zone: 'pantry', label: '팬트리', number: 3, approachX: 77, pin: { x: 375, y: 43 }, art: { x: 325, y: 35, width: 15, height: 21, viewBox: '15 8 33 47' } },
  'vanity-1': { category: 'beauty', zone: 'vanity', label: '화장대', number: 1, approachX: 55, pin: { x: 229, y: 44 }, art: { x: 242, y: 54, width: 14, height: 25, viewBox: '16 0 30 54' } },
  'vanity-2': { category: 'beauty', zone: 'vanity', label: '화장대 옆 선반', number: 2, approachX: 76, pin: { x: 366, y: 51 }, art: { x: 335, y: 66, width: 20, height: 15, viewBox: '8 22 46 31' } },
};

type Confirmed = { foodQuantity?: Record<string, number>; featuredBeautyId?: string | null } | null;
export function catalogRoomItems(catalog: DemoCatalog, confirmed: Confirmed) {
  return catalog.purchases.flatMap(event => {
    const purchase = catalog.home.purchases.find(item => item.id === event.productId && item.category === catalog.category);
    const product = catalog.products.find(item => item.id === event.productId);
    const placement = purchase && PLACEMENTS[purchase.roomSlot];
    if (!purchase || !product || product.catalogSource !== 'shared-products' || !placement || placement.category !== catalog.category) return [];
    const remaining = purchase.category === 'food' ? confirmed?.foodQuantity?.[purchase.id] ?? purchase.state.quantity ?? 0 : null;
    return [{ purchase, product, placement, remaining, visible: remaining === null || remaining > 0, featured: (confirmed?.featuredBeautyId ?? catalog.home.purchases.find(item => item.state.featured)?.id) === purchase.id }];
  }).sort((a, b) => a.placement.number - b.placement.number);
}

export function catalogRoomPlacement(purchase: Pick<Purchase, 'category' | 'roomSlot'> | undefined) {
  if (!purchase) return null;
  const placement = PLACEMENTS[purchase.roomSlot];
  return placement?.category === purchase.category ? placement : null;
}
