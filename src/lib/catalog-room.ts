import { getHeroProducts } from '../../app/category-products.js';
import type { DemoCatalog, CatalogCategory } from '../types/catalog.ts';
import type { CategoryProductEntry } from '../types/home.ts';

type Placement = {
  category: CatalogCategory;
  zone: 'fridge' | 'pantry' | 'vanity' | 'shelf';
  label: string;
  number: number;
  approachX: number;
  pin: { x: number; y: number };
  art: { x: number; y: number; width: number; height: number; viewBox: string };
};

// Geometry only: item identity, visibility, source image and ordering are shared data.
const CROP: Readonly<Record<string, string>> = {
  milk: '17 2 33 53', water: '17 3 29 52', vitamin: '15 8 33 47',
  serum: '16 0 30 54', cream: '8 22 46 31',
};

export function catalogRoomPlacement(entry: CategoryProductEntry | undefined, entries: CategoryProductEntry[] = entry ? [entry] : []): Placement | null {
  if (!entry || (entry.category !== 'food' && entry.category !== 'beauty')) return null;
  const sameSurface = (item: CategoryProductEntry) => entry.category === 'food'
    ? (entry.presentationRole === 'fridge' ? item.presentationRole === 'fridge' : item.presentationRole !== 'fridge')
    : (entry.presentationRole === 'vanity' ? item.presentationRole === 'vanity' : item.presentationRole !== 'vanity');
  const peers = entries.filter(item => item.category === entry.category && sameSurface(item));
  const index = Math.max(0, peers.findIndex(item => item.id === entry.id));
  const category = entry.category;
  const base = { category, number: entry.displayIndex };
  const viewBox = CROP[entry.illustrationKey] ?? '0 0 60 60';
  if (category === 'food' && entry.presentationRole === 'fridge') {
    const columns = peers.length > 2 ? 2 : 1;
    const column = index % columns, row = Math.floor(index / columns);
    const width = columns === 2 ? 13 : 21;
    const x = columns === 2 ? 73 + column * 15 : 77;
    const y = 34 + row * (peers.length > 4 ? 23 : 40);
    const height = peers.length > 4 ? 21 : 30;
    return { ...base, zone: 'fridge', label: '냉장고', approachX: 22,
      pin: { x: 126 + column * 30, y: peers.length > 2 ? 26 + row * 35 : 30 + row * 74 }, art: { x, y, width, height, viewBox } };
  }
  if (category === 'food') {
    const columns = peers.length > 4 ? 3 : 2;
    const column = index % columns, row = Math.floor(index / columns);
    return { ...base, zone: entry.presentationRole === 'pantry' ? 'pantry' : 'shelf', label: '팬트리', approachX: 77,
      pin: { x: 374 + column * 22, y: 43 + row * 34 }, art: { x: 324 + column * (columns === 3 ? 16 : 24), y: 34 + row * 29, width: columns === 3 ? 14 : 20, height: 22, viewBox } };
  }
  if (entry.presentationRole === 'vanity') {
    return { ...base, zone: 'vanity', label: '화장대', approachX: 55,
      pin: { x: 229 - index * 32, y: 44 }, art: { x: 242 - index * 26, y: 54, width: 14, height: 25, viewBox } };
  }
  const shelfWidth = peers.length > 2 ? 12 : peers.length === 2 ? 18 : 20;
  const shelfX = peers.length === 1 ? 335 : 313 + index * (peers.length > 2 ? 14 : 25);
  return { ...base, zone: 'shelf', label: '화장대 옆 선반', approachX: 76,
    pin: { x: 366 + index * 22, y: 51 }, art: { x: shelfX, y: 66, width: shelfWidth, height: 15, viewBox } };
}

type Confirmed = { userId?: string; foodQuantity?: Record<string, number>; featuredBeautyId?: string | null } | null;
export function catalogRoomItems(catalog: DemoCatalog, confirmed: Confirmed) {
  const entries = getHeroProducts(catalog.collection, confirmed);
  return entries.flatMap(entry => {
    const product = catalog.products.find(item => item.id === entry.id && item.catalogSource === 'shared-products');
    const placement = catalogRoomPlacement(entry, entries);
    if (!product || !placement) return [];
    return [{ entry, purchase: entry.product, product, placement, remaining: entry.remaining, visible: entry.artVisible, featured: entry.featured }];
  });
}
