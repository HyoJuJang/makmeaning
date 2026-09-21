import type {
  CartLine, CatalogProduct, DemoFood, FoodIntent, FoodProduct, FoodProductPresentation,
  FoodProfileId, FoodScenario, ProductRow,
} from '../types/food.ts';

export const MAX_CART_QUANTITY = 99;

type FoodGroup = 'supplement' | 'water' | 'dairy' | 'pasta' | 'sauce' | 'mushroom' | 'rice' | 'egg' | 'oil' | 'other';

function groupFromLabel(label: string): FoodGroup {
  if (/비타민|건강기능|건강식품|영양제|보충제/.test(label)) return 'supplement';
  if (/생수|먹는샘물|미네랄워터/.test(label)) return 'water';
  if (/우유|유제품/.test(label)) return 'dairy';
  if (/소스/.test(label)) return 'sauce';
  if (/파스타|스파게티/.test(label)) return 'pasta';
  if (/버섯/.test(label)) return 'mushroom';
  if (/즉석밥|쌀밥/.test(label)) return 'rice';
  if (/달걀|계란/.test(label)) return 'egg';
  if (/올리브오일|식용유/.test(label)) return 'oil';
  return 'other';
}

/** Specific source categories take precedence over incidental words in a name. */
function foodGroup(product: CatalogProduct): FoodGroup {
  for (const label of [product.cate4_m, product.cate3_nm, product.cate2_nm, product.cate1_nm, product.view_name]) {
    const group = groupFromLabel(label);
    if (group !== 'other') return group;
  }
  return 'other';
}

const groupArtwork: Record<FoodGroup, string> = {
  supplement: '/products/vitamin.svg', water: '/products/water.svg', dairy: '/products/milk.svg',
  pasta: '/food/products/pasta.svg', sauce: '/food/products/tomato.svg', mushroom: '/food/products/mushroom.svg',
  rice: '/food/products/rice.svg', egg: '/food/products/egg.svg', oil: '/food/products/olive-oil.svg',
  other: '/food/products/generic.svg',
};

/** Keep source columns explicit so unsupported upstream fields never become dependencies. */
export function adaptFoodProducts(
  products: CatalogProduct[],
  presentation: Record<string, FoodProductPresentation> = {},
): FoodProduct[] {
  return products.map(product => ({
    prd_id: product.prd_id, view_name: product.view_name, price: product.price,
    cate1_nm: product.cate1_nm, cate2_nm: product.cate2_nm, cate3_nm: product.cate3_nm,
    cate4_m: product.cate4_m, brd_mn: product.brd_mn, domain: product.domain,
    id: product.prd_id, name: product.view_name,
    shortName: presentation[product.prd_id]?.shortName || product.view_name,
    imageUrl: presentation[product.prd_id]?.imageUrl || groupArtwork[foodGroup(product)],
  }));
}

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

/** Recover only known products and bounded, positive integer user choices. */
export function normalizeCart(data: DemoFood, value: unknown): CartLine[] {
  const productIds = new Set(data.products.map(product => product.id));
  return readCart(value).filter(line => productIds.has(line.productId));
}

export function addToCart(cart: CartLine[], additions: CartLine[]): CartLine[] {
  return readCart([...cart, ...additions]);
}

export function cartTotal(data: DemoFood, cart: CartLine[]): number {
  const prices = new Map(data.products.map(product => [product.id, product.price]));
  return normalizeCart(data, cart).reduce((total, line) => total + (prices.get(line.productId) ?? 0) * line.quantity, 0);
}

function hasProduct(scenario: FoodScenario, productId: string): boolean {
  return scenario.products.some(product => product.productId === productId);
}

/** 2 = curated product link, 1 = related category, 0 = no grounded relation. */
function relation(data: DemoFood, scenario: FoodScenario, productId: string): number {
  const product = data.products.find(item => item.id === productId);
  if (!product) return 0;
  if (hasProduct(scenario, productId)) return 2;
  const group = foodGroup(product);
  if (group === 'other') return 0;
  return scenario.products.some(item => {
    const candidate = data.products.find(value => value.id === item.productId);
    return candidate && foodGroup(candidate) === group;
  }) ? 1 : 0;
}

/** Prefer a relevant product scenario; conflicting intent never creates an empty result. */
export function recommendScenarios(
  data: DemoFood,
  profileId: FoodProfileId,
  cart: CartLine[],
  selectedProductId: string | null,
  intent: FoodIntent,
  savedIds: string[],
): FoodScenario[] {
  const profile = data.profiles.find(item => item.id === profileId);
  const cartIds = normalizeCart(data, cart).map(line => line.productId);
  const purchasedIds = profile?.purchases.map(purchase => purchase.productId) ?? [];
  const savedProducts = [...new Set(data.scenarios.filter(scenario => savedIds.includes(scenario.id))
    .flatMap(scenario => scenario.products.filter(product => !product.optional).map(product => product.productId)))];

  let candidates = data.scenarios;
  if (selectedProductId) {
    const direct = candidates.filter(scenario => relation(data, scenario, selectedProductId) === 2);
    const category = candidates.filter(scenario => relation(data, scenario, selectedProductId) === 1);
    candidates = direct.length ? direct : category.length ? category : candidates;
  }
  const matchingIntent = candidates.filter(scenario => intent === 'all' || scenario.tags.includes(intent));
  if (matchingIntent.length) candidates = matchingIntent;

  const selected = data.products.find(product => product.id === selectedProductId);
  const isPrimaryMatch = (scenario: FoodScenario) => selected && scenario.products.some(item => {
    if (item.optional) return false;
    if (item.productId === selected.id) return true;
    const candidate = data.products.find(product => product.id === item.productId);
    return candidate && foodGroup(selected) !== 'other' && foodGroup(candidate) === foodGroup(selected);
  });
  const score = (scenario: FoodScenario) => (isPrimaryMatch(scenario) ? 1000 : 0)
    + cartIds.reduce((total, id) => total + relation(data, scenario, id) * 30, 0)
    + purchasedIds.reduce((total, id) => total + relation(data, scenario, id) * 5, 0)
    + savedProducts.reduce((total, id) => total + relation(data, scenario, id) * 8, 0);

  return candidates.map((scenario, index) => ({ scenario, index, score: score(scenario) }))
    .sort((a, b) => b.score - a.score || a.index - b.index).map(item => item.scenario);
}

export function recommendationReason(
  data: DemoFood,
  scenario: FoodScenario,
  profileId: FoodProfileId,
  cart: CartLine[],
  selectedProductId: string | null,
  intent: FoodIntent,
  savedIds: string[],
): string {
  const name = (productId: string) => data.products.find(product => product.id === productId)?.shortName ?? '상품';
  const intentFallback = intent !== 'all' && !scenario.tags.includes(intent) ? ' · 선택한 주제 대신 상품과 관련된 장면을 보여드려요' : '';
  if (selectedProductId) {
    const match = relation(data, scenario, selectedProductId);
    if (match === 2) return `‘${name(selectedProductId)}’에 맞춰 골라본 장면이에요${intentFallback}`;
    if (match === 1) return `‘${name(selectedProductId)}’의 식품 분류를 참고했어요 · 구성 상품은 데모 예시예요${intentFallback}`;
    return '선택 상품과 직접 연결되는 장면이 없어 기본 추천을 보여드려요';
  }
  const cartProduct = normalizeCart(data, cart).find(line => relation(data, scenario, line.productId) > 0);
  if (cartProduct) return relation(data, scenario, cartProduct.productId) === 2
    ? `장바구니 상품 ‘${name(cartProduct.productId)}’ 기준으로 골랐어요${intentFallback}`
    : `장바구니 상품 ‘${name(cartProduct.productId)}’의 식품 분류를 참고했어요${intentFallback}`;
  const savedScenario = data.scenarios.find(item => savedIds.includes(item.id)
    && item.products.some(product => !product.optional && relation(data, scenario, product.productId) > 0));
  if (savedScenario) return `저장한 장면과 관련 있는 상품을 참고했어요${intentFallback}`;
  const purchase = data.profiles.find(profile => profile.id === profileId)?.purchases
    .find(item => relation(data, scenario, item.productId) > 0);
  if (purchase) return relation(data, scenario, purchase.productId) === 2
    ? `${name(purchase.productId)} 구매 기록을 참고했어요 · 현재 보유 상태와는 달라요${intentFallback}`
    : `${name(purchase.productId)} 구매 기록의 식품 분류를 참고했어요${intentFallback}`;
  const intentReasons: Record<FoodIntent, string> = {
    all: '마음에 드는 장면부터 가볍게 골라보세요', quick: '간단하게 준비하는 식사를 골라봤어요',
    hearty: '든든한 식사를 준비하고 싶을 때 골라보세요', morning: '아침 식탁을 준비하는 장면이에요',
    outdoor: '외출을 앞두고 챙길 상품을 정리해 보세요', routine: '일상 식품의 구매 목록을 정리해 보세요',
  };
  return scenario.tags.includes(intent as Exclude<FoodIntent, 'all'>) || intent === 'all'
    ? intentReasons[intent] : '선택한 주제에 맞는 장면이 없어 기본 추천을 보여드려요';
}

/**
 * Quantity is an explicit shopping choice, never a calculated recipe need.
 * Existing cart lines are unselected by default to prevent accidental duplicates.
 * `ownedIds` only expresses "do not buy in this scenario" and is not saved inventory.
 */
export function buildProductRows(
  data: DemoFood,
  scenarioId: string,
  ownedIds: string[],
  cart: CartLine[],
  excludedIds?: string[],
  quantityOverrides: Record<string, number> = {},
): ProductRow[] {
  const scenario = data.scenarios.find(item => item.id === scenarioId);
  if (!scenario) return [];
  const cartQuantities = new Map(normalizeCart(data, cart).map(line => [line.productId, line.quantity]));
  const excluded = new Set(excludedIds ?? scenario.products.filter(item => item.optional).map(item => item.productId));
  const ownedSet = new Set(ownedIds);
  return scenario.products.flatMap(item => {
    const product = data.products.find(value => value.id === item.productId);
    if (!product) return [];
    const inCart = cartQuantities.get(product.id) ?? 0;
    const owned = ownedSet.has(product.id);
    const override = quantityOverrides[product.id];
    const requested = validQuantity(override) ? override : inCart > 0 ? 0 : 1;
    const additionalQuantity = owned ? 0 : Math.min(MAX_CART_QUANTITY - inCart, requested);
    return [{ product, inCart, additionalQuantity, owned,
      selected: !excluded.has(product.id) && additionalQuantity > 0, optional: Boolean(item.optional) }];
  });
}
