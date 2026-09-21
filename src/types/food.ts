export type FoodUnit = 'g' | 'ml' | '개';
export type FoodIntent = 'all' | 'quick' | 'hearty' | 'new';

export interface FoodProduct {
  id: string;
  name: string;
  shortName: string;
  imageUrl: string;
  /** Illustrative KRW price per pack, excluding shipping. */
  price: number;
  packSize: number;
  unit: FoodUnit;
  optionLabel: string;
  available: boolean;
}

export interface RecipeIngredient {
  productId: string;
  amountPerServing: number;
  optional?: boolean;
}

export interface FoodRecipe {
  id: string;
  name: string;
  description: string;
  minutes: number;
  tags: Exclude<FoodIntent, 'all'>[];
  imageUrl: string;
  ingredients: RecipeIngredient[];
  steps: string[];
}

/** A purchase record never implies current possession or remaining quantity. */
export interface FoodPurchase {
  productId: string;
  purchasedAt: string;
  optionLabel: string;
}

export interface CartLine {
  productId: string;
  quantity: number;
}

export type FoodProfileId = 'home' | 'new' | 'purchased' | 'cart';

export interface FoodProfile {
  id: FoodProfileId;
  label: string;
  purchases: FoodPurchase[];
  cart: CartLine[];
}

export interface DemoFood {
  user: { id: string; name: string };
  products: FoodProduct[];
  recipes: FoodRecipe[];
  profiles: FoodProfile[];
}

export interface IngredientRow {
  product: FoodProduct;
  requiredAmount: number;
  requiredPacks: number;
  inCart: number;
  /** New packs only; a deselected row retains its suggested quantity. */
  additionalQuantity: number;
  owned: boolean;
  selected: boolean;
  optional: boolean;
}
