export const PRODUCT_COLUMNS = Object.freeze([
  'prd_id', 'view_name', 'cate1_nm', 'cate2_nm', 'cate3_nm', 'cate4_nm',
  'brand_name', 'discprice', 'domain', 'opt1', 'opt2', 'opt3', 'opt4',
]);

const DOMAINS = new Set(['fashion', 'food', 'living', 'beauty']);
const ALLOWED_KEYS = new Set([...PRODUCT_COLUMNS, 'brd_nm', 'price']);
const OPTIONAL_TEXT = ['cate1_nm', 'cate2_nm', 'cate3_nm', 'cate4_nm', 'opt1', 'opt2', 'opt3', 'opt4'];

function nullableText(value, field) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.includes('\0')) {
    throw new Error(`${field} must be text without null bytes`);
  }
  return value.trim() || null;
}

function requiredText(value, field) {
  const text = nullableText(value, field);
  if (text === null) throw new Error(`${field} is required`);
  return text;
}

function price(value) {
  if (typeof value === 'string') {
    const input = value.trim();
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(input)) {
      throw new Error('discprice must be a whole non-negative KRW amount');
    }
    value = Number(input.replaceAll(',', ''));
  }
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('discprice must be a non-negative safe integer');
  }
  return value;
}

function alias(row, canonical, source, normalize) {
  const hasCanonical = Object.hasOwn(row, canonical);
  const hasSource = Object.hasOwn(row, source);
  const value = normalize(hasCanonical ? row[canonical] : row[source], canonical);
  if (hasCanonical && hasSource && value !== normalize(row[source], source)) {
    throw new Error(`${canonical} conflicts with ${source}`);
  }
  return value;
}

/** Normalize the table document's source aliases without guessing missing data. */
export function normalizeProduct(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error('Each product must be an object');
  }
  for (const key of Object.keys(row)) {
    if (!ALLOWED_KEYS.has(key)) throw new Error(`Unknown product field: ${key}`);
  }
  const prd_id = requiredText(row.prd_id, 'prd_id');
  if ([...prd_id].length > 64) throw new Error('prd_id must be at most 64 characters');
  const view_name = requiredText(row.view_name, 'view_name');
  const domain = requiredText(row.domain, 'domain');
  if (!DOMAINS.has(domain)) throw new Error('domain must be fashion, food, living, or beauty');

  const normalized = {
    prd_id, view_name,
    brand_name: alias(row, 'brand_name', 'brd_nm', nullableText),
    discprice: alias(row, 'discprice', 'price', price),
    domain,
  };
  for (const field of OPTIONAL_TEXT) normalized[field] = nullableText(row[field], field);
  return Object.fromEntries(PRODUCT_COLUMNS.map(field => [field, normalized[field]]));
}

export function normalizeProducts(rows) {
  if (!Array.isArray(rows)) throw new Error('Products must be a JSON array');
  const seen = new Set();
  return rows.map((row, index) => {
    try {
      const product = normalizeProduct(row);
      if (seen.has(product.prd_id)) throw new Error('Duplicate prd_id');
      seen.add(product.prd_id);
      return product;
    } catch (error) {
      throw new Error(`Product row ${index + 1}: ${error.message}`);
    }
  });
}

/** The seed never updates an existing row, including teammates' optional values. */
export function createSeedQuery(row) {
  const product = normalizeProduct(row);
  return {
    text: `INSERT INTO public.products (${PRODUCT_COLUMNS.join(', ')}) VALUES (${PRODUCT_COLUMNS.map((_, index) => `$${index + 1}`).join(', ')}) ON CONFLICT (prd_id) DO NOTHING RETURNING prd_id`,
    values: PRODUCT_COLUMNS.map(field => product[field]),
  };
}

/** Upsert full product input while leaving omitted optional fields untouched on existing rows. */
export function createImportQuery(row) {
  const product = normalizeProduct(row);
  const updates = PRODUCT_COLUMNS.filter(field => field !== 'prd_id' && (
    Object.hasOwn(row, field)
    || (field === 'brand_name' && Object.hasOwn(row, 'brd_nm'))
    || (field === 'discprice' && Object.hasOwn(row, 'price'))
  ));
  return {
    text: `INSERT INTO public.products (${PRODUCT_COLUMNS.join(', ')}) VALUES (${PRODUCT_COLUMNS.map((_, index) => `$${index + 1}`).join(', ')}) ON CONFLICT (prd_id) DO UPDATE SET ${updates.map(field => `${field} = EXCLUDED.${field}`).join(', ')} RETURNING prd_id`,
    values: PRODUCT_COLUMNS.map(field => product[field]),
  };
}
