import { DEFAULT_DEMO_PERSONA_ID, DEMO_PERSONA_COOKIE, demoPersonaIdFromRequest, findDemoPersona, getDemoPersonaSummaries } from '../data/demo-personas.ts';
import type { DemoPurchaseSource } from '../data/demo-purchases.ts';
import type { Category } from '../types/home.ts';
export const PERSONA_COOKIE = DEMO_PERSONA_COOKIE;
export const DEFAULT_PERSONA_ID = DEFAULT_DEMO_PERSONA_ID;
export const demoPersonaChoices = getDemoPersonaSummaries();
/** Compatibility adapter: the recommendation persona source remains ownership truth. */
export function getPersonaSource(id: string = DEFAULT_PERSONA_ID): DemoPurchaseSource {
  const persona = findDemoPersona(id);
  if (!persona) throw new Error('Unknown demo persona');
  const { name, avatarId } = persona;
  const categories: DemoPurchaseSource['categories'] = { fashion: [], food: [], living: [], beauty: [] };
  for (const category of ['fashion', 'food', 'living', 'beauty'] as Category[]) {
    categories[category] = persona.purchases.filter(purchase => purchase.category === category);
  }
  return { user: { id, name, avatarId }, categories, personas: getDemoPersonaSummaries() };
}
export function personaSourceFromRequest(request?: Request): DemoPurchaseSource {
  return getPersonaSource(demoPersonaIdFromRequest(request));
}
