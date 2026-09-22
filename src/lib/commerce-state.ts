import type { CartLine, DisplayProduct } from '../types/catalog.ts';
import type { RecommendationDomain } from './recommendation/types.ts';

export interface CommerceState { version: 2; cart: CartLine[]; savedProductIds: string[] }
export const emptyCommerceState = (): CommerceState => ({ version: 2, cart: [], savedProductIds: [] });
export const realProductId = (id: unknown): id is string => typeof id === 'string' && /^\d{1,64}$/.test(id);
export const commerceBaseKey = (category: RecommendationDomain) => `gscene-commerce-${category}-v2`;

function parsed(value: unknown): Record<string, unknown> | null {
  try {
    const object = typeof value === 'string' ? JSON.parse(value) : value;
    return object && typeof object === 'object' && !Array.isArray(object) ? object : null;
  } catch { return null; }
}
/** Storage contains exact IDs and quantities only; a server lookup still has to validate them. */
export function normalizeCommerceState(value: unknown): CommerceState {
  const raw = parsed(value);
  if (!raw) return emptyCommerceState();
  const cart = new Map<string, number>();
  const lines = Array.isArray(raw.cart) ? raw.cart : Array.isArray(raw.cartIds) ? raw.cartIds.map(productId => ({ productId, quantity: 1 })) : [];
  for (const line of lines) {
    if (!line || !realProductId(line.productId) || !Number.isInteger(line.quantity) || line.quantity <= 0) continue;
    if (cart.size >= 50 && !cart.has(line.productId)) continue;
    cart.set(line.productId, Math.min(99, (cart.get(line.productId) ?? 0) + line.quantity));
  }
  const saved = Array.isArray(raw.savedProductIds) ? raw.savedProductIds : Array.isArray(raw.savedIds) ? raw.savedIds : [];
  return { version: 2, cart: [...cart].map(([productId, quantity]) => ({ productId, quantity })), savedProductIds: [...new Set(saved.filter(realProductId))].slice(0, 50) };
}
export function restoreCommerceState(current: unknown, legacy: unknown, legacyFood?: unknown): CommerceState {
  if (current !== null && current !== undefined) return normalizeCommerceState(current);
  if (legacy !== null && legacy !== undefined) return normalizeCommerceState(legacy);
  const food = parsed(legacyFood);
  const contexts = parsed(food?.contexts);
  return normalizeCommerceState(contexts?.home);
}
export function verifiedCommerceState(state: CommerceState, products: DisplayProduct[]): CommerceState {
  const ids = new Set(products.filter(product => realProductId(product.id) && product.id === product.prd_id && product.catalogSource === 'shared-products').map(product => product.id));
  return { version: 2, cart: state.cart.filter(line => ids.has(line.productId)), savedProductIds: state.savedProductIds.filter(id => ids.has(id)) };
}
