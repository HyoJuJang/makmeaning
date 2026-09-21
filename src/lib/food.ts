import type {
  CartLine, DemoFood, FoodIntent, FoodProfileId, FoodRecipe, IngredientRow,
} from '../types/food.ts';

export const MAX_CART_QUANTITY = 99;
export const MAX_SERVINGS = 4;

function validQuantity(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function readCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const quantities = new Map<string, number>();
  for (const line of value) {
    if (!line || typeof line !== 'object') continue;
    const { productId, quantity } = line;
    if (typeof productId !== 'string' || !productId.trim() || !validQuantity(quantity)) continue;
    quantities.set(productId, Math.min(MAX_CART_QUANTITY, (quantities.get(productId) ?? 0) + quantity));
  }
  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
}

/** Recover only known products and bounded, positive integer quantities. */
export function normalizeCart(data: DemoFood, value: unknown): CartLine[] {
  const productIds = new Set(data.products.map(product => product.id));
  return readCart(value).filter(line => productIds.has(line.productId));
}

/** Add incremental packs; combine repeated SKU lines without mutating input. */
export function addToCart(cart: CartLine[], additions: CartLine[]): CartLine[] {
  return readCart([...cart, ...additions]);
}

export function cartTotal(data: DemoFood, cart: CartLine[]): number {
  const prices = new Map(data.products.map(product => [product.id, product.price]));
  return normalizeCart(data, cart).reduce((total, line) => total + (prices.get(line.productId) ?? 0) * line.quantity, 0);
}

function hasIngredient(recipe: FoodRecipe, productId: string): boolean {
  return recipe.ingredients.some(ingredient => ingredient.productId === productId);
}

export function recommendRecipes(
  data: DemoFood,
  profileId: FoodProfileId,
  cart: CartLine[],
  selectedProductId: string | null,
  intent: FoodIntent,
  savedIds: string[],
): FoodRecipe[] {
  const profile = data.profiles.find(item => item.id === profileId);
  const cartIds = new Set(normalizeCart(data, cart).map(line => line.productId));
  const purchasedIds = new Set(profile?.purchases.map(purchase => purchase.productId));
  const savedIngredients = new Set(data.recipes.filter(recipe => savedIds.includes(recipe.id))
    .flatMap(recipe => recipe.ingredients.filter(ingredient => !ingredient.optional).map(ingredient => ingredient.productId)));

  const score = (recipe: FoodRecipe) => recipe.ingredients.reduce((total, ingredient) => {
    if (ingredient.optional) return total;
    return total + (cartIds.has(ingredient.productId) ? 30 : 0)
      + (purchasedIds.has(ingredient.productId) ? 5 : 0)
      + (savedIngredients.has(ingredient.productId) ? 8 : 0);
  }, 0);

  return data.recipes
    .filter(recipe => (!selectedProductId || hasIngredient(recipe, selectedProductId))
      && (intent === 'all' || recipe.tags.includes(intent)))
    .map((recipe, index) => ({ recipe, index, score: score(recipe) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(item => item.recipe);
}

export function recommendationReason(
  data: DemoFood,
  recipe: FoodRecipe,
  profileId: FoodProfileId,
  cart: CartLine[],
  selectedProductId: string | null,
  intent: FoodIntent,
  savedIds: string[],
): string {
  const name = (productId: string) => data.products.find(product => product.id === productId)?.shortName ?? '재료';
  if (selectedProductId && hasIngredient(recipe, selectedProductId)) {
    return `${name(selectedProductId)}로 즐길 수 있는 메뉴예요`;
  }
  if (intent === 'quick') return `${recipe.minutes}분이면 완성하는 간단한 한 끼예요`;
  if (intent === 'hearty') return '든든한 한 끼를 원할 때 골라보세요';
  if (intent === 'new') return '색다른 조합을 찾을 때 시도해 보세요';
  const cartProduct = normalizeCart(data, cart).find(line => hasIngredient(recipe, line.productId));
  if (cartProduct) return `장바구니의 ${name(cartProduct.productId)}를 활용하는 메뉴예요`;
  const savedRecipe = data.recipes.find(item => savedIds.includes(item.id)
    && item.ingredients.some(ingredient => !ingredient.optional && hasIngredient(recipe, ingredient.productId)));
  if (savedRecipe) return '저장한 메뉴와 비슷한 재료를 활용해요';
  const purchase = data.profiles.find(profile => profile.id === profileId)?.purchases
    .find(item => hasIngredient(recipe, item.productId));
  if (purchase) return `${name(purchase.productId)} 구매 기록을 참고했어요 · 보유 여부는 확인해 주세요`;
  return '마음에 드는 메뉴부터 가볍게 골라보세요';
}

/**
 * Purchase history never sets owned. Cart quantities offset required packs only.
 * Omitting excludedIds excludes optional ingredients; an explicit list is the
 * user's full selection state. Quantity overrides are additional packs only.
 */
export function buildIngredientRows(
  data: DemoFood,
  recipeId: string,
  servings: number,
  ownedIds: string[],
  cart: CartLine[],
  excludedIds?: string[],
  quantityOverrides: Record<string, number> = {},
): IngredientRow[] {
  const recipe = data.recipes.find(item => item.id === recipeId);
  if (!recipe) return [];
  const portions = Number.isFinite(servings) ? Math.min(MAX_SERVINGS, Math.max(1, Math.floor(servings))) : 1;
  const cartQuantities = new Map(normalizeCart(data, cart).map(line => [line.productId, line.quantity]));
  const excluded = new Set(excludedIds ?? recipe.ingredients.filter(item => item.optional).map(item => item.productId));
  const ownedSet = new Set(ownedIds);

  return recipe.ingredients.flatMap(ingredient => {
    const product = data.products.find(item => item.id === ingredient.productId);
    if (!product || product.packSize <= 0 || ingredient.amountPerServing <= 0) return [];
    const requiredAmount = ingredient.amountPerServing * portions;
    const requiredPacks = Math.ceil(requiredAmount / product.packSize);
    const inCart = cartQuantities.get(product.id) ?? 0;
    const owned = ownedSet.has(product.id);
    const missing = Math.max(0, requiredPacks - inCart);
    const override = quantityOverrides[product.id];
    const requested = validQuantity(override) ? override : missing;
    // Once the recipe is covered, reopening cannot add another copy through a
    // stale override. Deliberate extra purchases use the separate buy-again flow.
    const additionalQuantity = owned || !product.available || missing === 0
      ? 0 : Math.min(MAX_CART_QUANTITY - inCart, requested);
    return [{
      product, requiredAmount, requiredPacks, inCart, additionalQuantity, owned,
      selected: !excluded.has(product.id) && additionalQuantity > 0,
      optional: Boolean(ingredient.optional),
    }];
  });
}
