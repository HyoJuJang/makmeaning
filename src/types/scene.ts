export type SceneCategory = 'fashion' | 'living';

export interface SceneProduct {
  id: string;
  category: SceneCategory;
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
  kind: string;
  situations: string[];
  tastes: string[];
  description: string;
  pairsWith: string[];
  reasons: Record<string, string>;
}

export interface DemoScene {
  category: SceneCategory;
  cartIds: string[];
  products: SceneProduct[];
}
