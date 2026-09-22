import source from '../../data/demo-persona-purchases.json' with { type: 'json' };
import type { DemoPurchaseSeed } from './demo-purchases.ts';
import type { Category, DemoPersonaSummary, IllustrationKey, PresentationRole, RoomSlot } from '../types/home.ts';

export const DEFAULT_DEMO_PERSONA_ID = 'demo-f01';
export const DEMO_PERSONA_COOKIE = 'gscene-persona';

interface DemoPersona extends DemoPersonaSummary {
  purchases: DemoPurchaseSeed[];
}

const avatars: Record<string, string> = { F01: 'f01', F02: 'f02', M01: 'm01', M02: 'm02' };
const slots: Record<Exclude<Category, 'living'>, readonly [RoomSlot, IllustrationKey][]> = {
  fashion: [['wardrobe-1', 'knit'], ['wardrobe-2', 'shirt'], ['wardrobe-3', 'garment']],
  food: [['fridge-1', 'milk'], ['fridge-2', 'water'], ['pantry-1', 'vitamin']],
  beauty: [['vanity-1', 'serum'], ['vanity-2', 'cream']],
};
const purchasedAt = source.createdAt.slice(0, 10).replaceAll('-', '.');

/** The selected JSON is ownership truth. Slot aliases are only legacy room artwork, not product facts. */
const personas: readonly DemoPersona[] = source.personas.map(persona => {
  const avatarId = avatars[persona.avatarLabel];
  if (!avatarId || persona.id !== `demo-${avatarId}`) throw new Error('Invalid demo persona identity');
  const indexes = { fashion: 0, food: 0, living: 0, beauty: 0 };
  const purchases = persona.purchases.map(item => {
    if (!Object.hasOwn(indexes, item.category)) throw new Error('Invalid demo purchase category');
    const category = item.category as Category;
    const index = indexes[category]++;
    const isLamp = category === 'living' && /^(?:table_lamp|floor_lamp)/.test(item.assetId);
    const slot: readonly [RoomSlot, IllustrationKey] | undefined = category === 'living'
      ? isLamp ? ['lamp-1', 'lamp'] : ['sofa-1', 'cushion']
      : slots[category][index];
    if (!slot || !item.productId || !item.purchaseId || item.ownership !== 'fictional') {
      throw new Error('Invalid demo purchase');
    }
    return {
      id: item.productId,
      purchaseId: item.purchaseId,
      category,
      roomSlot: slot[0],
      presentationRole: (category === 'living' && !isLamp && !item.assetId.startsWith('cushion') ? 'shelf' : category === 'beauty' && index > 0 ? 'shelf' : slot[0].split('-')[0]) as PresentationRole,
      displayOrder: index + 1,
      imageUrl: `https://asset.m-gs.kr/prod/${encodeURIComponent(item.productId)}/1/550`,
      illustrationKey: slot[1],
      purchasedAt,
      state: category === 'fashion' ? { wearing: false }
        : category === 'food' ? { quantity: 3 }
        : category === 'beauty' ? { featured: index === 0 }
        : isLamp ? { on: true } : {},
    } satisfies DemoPurchaseSeed;
  });
  if (purchases.length !== source.purchasesPerPerson
    || new Set(purchases.map(purchase => purchase.roomSlot)).size !== purchases.length
    || new Set(purchases.map(purchase => purchase.id)).size !== purchases.length
    || new Set(purchases.map(purchase => purchase.purchaseId)).size !== purchases.length) {
    throw new Error('Invalid demo persona purchases');
  }
  return { id: persona.id, name: persona.name, avatarId, theme: persona.theme, purchases };
});

/** Allowlist selection: arbitrary cookies never become catalog queries or user identities. */
export function resolveDemoPersonaId(value: unknown): string {
  return typeof value === 'string' && personas.some(persona => persona.id === value) ? value : DEFAULT_DEMO_PERSONA_ID;
}

export function demoPersonaIdFromRequest(request?: Request): string {
  const cookies = request?.headers.get('cookie')?.split(';') ?? [];
  const selection = cookies.find(cookie => cookie.trim().startsWith(`${DEMO_PERSONA_COOKIE}=`));
  if (!selection) return DEFAULT_DEMO_PERSONA_ID;
  try {
    return resolveDemoPersonaId(decodeURIComponent(selection.trim().slice(DEMO_PERSONA_COOKIE.length + 1)));
  } catch {
    return DEFAULT_DEMO_PERSONA_ID;
  }
}

/** Fresh copies prevent UI/demo state from changing the JSON-backed ownership map. */
export function findDemoPersona(value: unknown): DemoPersona | undefined {
  const persona = personas.find(persona => persona.id === value);
  return persona ? structuredClone(persona) : undefined;
}

export function getDemoPersona(value?: string): DemoPersona {
  return findDemoPersona(resolveDemoPersonaId(value))!;
}

export function getDemoPersonaSummaries(): DemoPersonaSummary[] {
  return personas.map(({ id, name, avatarId, theme }) => ({ id, name, avatarId, theme }));
}
