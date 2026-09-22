import raw from '../data/demo-personas.json' with { type: 'json' };
import type { DemoPurchaseSeed, DemoPurchaseSource } from '../data/demo-purchases.ts';
import type { Category, DemoUser } from '../types/home.ts';

export const PERSONA_COOKIE = 'gscene-persona';
export const DEFAULT_PERSONA_ID = 'demo-f01';
const categories: Category[] = ['fashion', 'food', 'living', 'beauty'];
const personas = raw.personas as Array<DemoUser & { purchases: DemoPurchaseSeed[] }>;
export const demoPersonaChoices: DemoUser[] = personas.map(({ id, name, avatarId, theme }) => ({ id, name, avatarId, theme }));

/** Only the approved fictional identities are selectable; uploaded image metadata is not a runtime source. */
export function getPersonaSource(id: string = DEFAULT_PERSONA_ID): DemoPurchaseSource {
  const persona = personas.find(persona => persona.id === id);
  if (!persona) throw new Error('Unknown demo persona');
  const { id: userId, name, avatarId, theme } = persona;
  const owned: DemoPurchaseSource['categories'] = { fashion: [], food: [], living: [], beauty: [] };
  for (const category of categories) owned[category] = structuredClone(persona.purchases.filter(purchase => purchase.category === category));
  return {
    user: { id: userId, name, avatarId, theme },
    categories: owned,
    personas: structuredClone(demoPersonaChoices),
  };
}

export function personaSourceFromRequest(request?: Request): DemoPurchaseSource {
  const values = (request?.headers.get('cookie') ?? '').split(';')
    .map(value => value.trim()).filter(value => value.startsWith(PERSONA_COOKIE + '='));
  let id = DEFAULT_PERSONA_ID;
  if (values.length === 1) {
    try {
      const candidate = decodeURIComponent(values[0].slice(PERSONA_COOKIE.length + 1));
      if (demoPersonaChoices.some(persona => persona.id === candidate)) id = candidate;
    } catch { /* Malformed or unknown cookies return the approved default. */ }
  }
  return getPersonaSource(id);
}
