import { findDemoPersona } from '../../data/demo-personas.ts';
import type { UserProfile } from './types.ts';

/** Explicit fictional ownership; no real user's dump is reused or rewritten. */
export function demoRecommendationProfile(userId?: string): UserProfile | null {
  const persona = findDemoPersona(userId);
  if (!persona) return null;
  return { items: persona.purchases.map(purchase => ({
    productId: purchase.id, orderCount: 1, cartCount: 0, viewCount: 0, lastAt: '',
  })) };
}
