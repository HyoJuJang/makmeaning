import type { DemoScene, SceneCategory } from '../types/scene.ts';

/** Legacy endpoint shape only. Product browsing and carts use canonical catalog IDs. */
export const demoScenes: Record<SceneCategory, DemoScene> = {
  fashion: { category: 'fashion', cartIds: [], products: [] },
  living: { category: 'living', cartIds: [], products: [] },
};
