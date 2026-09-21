export type CategoryId = 'fashion' | 'food' | 'living' | 'beauty';
export const CATEGORY_ROUTES: Readonly<Record<CategoryId, { href: string; label: string }>>;
export const CATEGORY_OBJECTS: Readonly<Record<CategoryId, string>>;
export const OBJECT_CATEGORIES: Readonly<Record<string, CategoryId>>;
export function readyObjectCategory(controller: {objectId: string | null; phase: string; step: string; categoryNavigation?: string | null; objects: Record<string, {stable: string; transition: unknown}>}, id: string): CategoryId | null;
