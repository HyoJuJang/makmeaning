import type { DemoScene } from '../../types/scene';

/** The same validation is used at first load and after a reset in another tab. */
export function restoreSceneCollection(catalog: Pick<DemoScene, 'products' | 'cartIds'>, raw: string | null) {
  const ids = new Set(catalog.products.map(product => product.id));
  const valid = (value: unknown): string[] => Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === 'string' && ids.has(id)))] : [];
  const initial = { cartIds: valid(catalog.cartIds), savedIds: [] as string[] };
  try {
    const stored = JSON.parse(raw || 'null');
    return {
      cartIds: Array.isArray(stored?.cartIds) ? valid(stored.cartIds) : initial.cartIds,
      savedIds: valid(stored?.savedIds),
    };
  } catch { return initial; }
}
