import type {
  CartLine, CatalogProduct, CatalogState, DemoCatalog, DisplayProduct, ProductPresentation,
} from '../types/catalog.ts';

export const MAX_CART_QUANTITY = 99;
const FALLBACK_IMAGE = '/food/products/generic.svg';

/** Copy only agreed source fields, then attach explicitly separate UI metadata. */
export function adaptCatalogProducts(
  rows: CatalogProduct[],
  presentation: Record<string, ProductPresentation> = {},
): DisplayProduct[] {
  return rows.map(row => ({
    prd_id: row.prd_id, view_name: row.view_name, price: row.price,
    cate1_nm: row.cate1_nm, cate2_nm: row.cate2_nm, cate3_nm: row.cate3_nm,
    cate4_m: row.cate4_m, brd_mn: row.brd_mn, domain: row.domain,
    id: row.prd_id, name: row.view_name,
    shortName: presentation[row.prd_id]?.shortName || row.view_name,
    imageUrl: presentation[row.prd_id]?.imageUrl || FALLBACK_IMAGE,
    illustrationKey: presentation[row.prd_id]?.illustrationKey || row.prd_id,
    imageKind: presentation[row.prd_id]?.imageKind ?? 'illustration',
    catalogSource: presentation[row.prd_id]?.catalogSource || 'fictional-example',
    priceKind: presentation[row.prd_id]?.catalogSource === 'shared-products' ? 'catalog-reference' : 'fictional-example',
  }));
}

function readCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const quantities = new Map<string, number>();
  for (const line of value) {
    if (!line || typeof line !== 'object' || Array.isArray(line)) continue;
    const { productId, quantity } = line;
    if (typeof productId !== 'string' || !productId.trim()
      || typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity <= 0) continue;
    quantities.set(productId, Math.min(MAX_CART_QUANTITY, (quantities.get(productId) ?? 0) + quantity));
  }
  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
}

/** Only known formerly alias-keyed purchased products migrate; fictional IDs remain distinct. */
function canonicalProductId(data: DemoCatalog, value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const exact = data.products.find(product => product.id === value);
  if (exact) return exact.id;
  return data.products.find(product => product.catalogSource === 'shared-products' && product.illustrationKey === value)?.id ?? null;
}

/** Scope recovered lines to this catalog and keep bounded positive whole counts. */
export function normalizeCart(data: DemoCatalog, value: unknown): CartLine[] {
  const mapped = readCart(value).flatMap(line => {
    const productId = canonicalProductId(data, line.productId);
    return productId ? [{ productId, quantity: line.quantity }] : [];
  });
  return readCart(mapped);
}

/** Increment selected quantities without mutating either input. */
export function addToCart(cart: CartLine[], additions: CartLine[]): CartLine[] {
  return readCart([...cart, ...additions]);
}

export function cartTotal(data: DemoCatalog, cart: CartLine[]): number {
  const prices = new Map(data.products.map(product => [product.id, product.price]));
  return normalizeCart(data, cart).reduce((total, line) => total + (prices.get(line.productId) ?? 0) * line.quantity, 0);
}

function readObject(value: unknown): Record<string, unknown> | null {
  let parsed = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return null; }
  }
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
}

/**
 * Accepts parsed objects or raw localStorage strings. Valid current state always
 * wins. Only the old food home cart migrates; old scene saves are not product saves.
 */
export function restoreCatalogState(data: DemoCatalog, stored: unknown, legacy?: unknown): CatalogState {
  const current = readObject(stored);
  if (current?.version === 1 && Array.isArray(current.cart) && Array.isArray(current.savedProductIds)) {
    return {
      cart: normalizeCart(data, current.cart),
      savedProductIds: [...new Set(current.savedProductIds.map(id => canonicalProductId(data, id)).filter((id): id is string => id !== null))],
    };
  }
  if (data.category === 'food') {
    const old = readObject(legacy);
    const contexts = readObject(old?.contexts);
    const home = readObject(contexts?.home);
    if ((old?.version === 1 || old?.version === 2) && Array.isArray(home?.cart)) {
      return { cart: normalizeCart(data, home.cart), savedProductIds: [] };
    }
  }
  return { cart: normalizeCart(data, data.initialCart), savedProductIds: [] };
}
