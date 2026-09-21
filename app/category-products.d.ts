import type { Category, CategoryCollection, CategoryProductEntry } from '../src/types/home';
export interface CategoryConfirmedState {
  userId?: string;
  outfitId?: string;
  foodQuantity?: Record<string, number>;
  featuredBeautyId?: string | null;
  lampOn?: boolean;
}
export const CATEGORY_HERO_LIMITS: Readonly<Record<Category, number>>;
export function getCategoryProducts(collection: CategoryCollection | null | undefined, confirmed?: CategoryConfirmedState | null): CategoryProductEntry[];
export function getHeroProducts(collection: CategoryCollection | null | undefined, confirmed?: CategoryConfirmedState | null): CategoryProductEntry[];
export function getRoomMirrorProducts(collection: CategoryCollection | null | undefined, confirmed?: CategoryConfirmedState | null): CategoryProductEntry[];
