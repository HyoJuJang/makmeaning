import type { Product, ProductDomain } from '../../types/product.ts';

const domains = new Set<string>(['fashion', 'food', 'living', 'beauty']);

export interface ProductFilters {
  domain?: ProductDomain;
  q?: string;
  limit: number;
  offset: number;
}

export interface ProductList {
  products: Product[];
  pagination: { limit: number; offset: number; total: number };
}

export interface ProductRepository {
  list(filters: ProductFilters): Promise<ProductList>;
  find(prdId: string): Promise<Product | null>;
}

export class ProductApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ProductApiError';
    this.status = status;
    this.code = code;
  }
}

function invalid(message: string): never {
  throw new ProductApiError(400, 'INVALID_QUERY', message);
}

export function parseProductFilters(params: URLSearchParams): ProductFilters {
  const allowed = new Set(['domain', 'q', 'limit', 'offset']);
  for (const key of params.keys()) {
    if (!allowed.has(key) || params.getAll(key).length !== 1) {
      invalid(`지원하지 않거나 중복된 쿼리 항목입니다: ${key.slice(0, 40)}`);
    }
  }

  const domain = params.get('domain');
  if (domain !== null && !domains.has(domain)) {
    invalid('domain은 fashion, food, living, beauty 중 하나여야 합니다.');
  }
  const q = params.get('q')?.trim();
  if (q && (q.length > 100 || /[\u0000-\u001f]/.test(q))) {
    invalid('q는 제어 문자 없는 100자 이하의 검색어여야 합니다.');
  }

  function integer(key: string, fallback: number, min: number, max: number): number {
    const raw = params.get(key);
    if (raw === null) return fallback;
    if (!/^\d+$/.test(raw)) invalid(`${key}는 정수여야 합니다.`);
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < min || value > max) {
      invalid(`${key}는 ${min} 이상 ${max} 이하여야 합니다.`);
    }
    return value;
  }

  return {
    ...(domain ? { domain: domain as ProductDomain } : {}),
    ...(q ? { q } : {}),
    limit: integer('limit', 50, 1, 100),
    offset: integer('offset', 0, 0, 10000),
  };
}

export function validateProductId(value: string): string {
  if (!value || value.length > 64 || value !== value.trim() || /[\u0000-\u001f]/.test(value)) {
    throw new ProductApiError(400, 'INVALID_PRODUCT_ID', '상품 코드는 공백 없이 1~64자여야 합니다.');
  }
  return value;
}

export function databaseUrl(env: Record<string, string | undefined>): string {
  const url = env.DATABASE_URL?.trim() || env.POSTGRES_URL?.trim();
  if (!url) {
    throw new ProductApiError(503, 'DATABASE_NOT_CONFIGURED', '상품 데이터베이스가 아직 연결되지 않았습니다.');
  }
  return url;
}

export function safeNonnegativeInteger(value: unknown): number {
  if (typeof value !== 'number' && typeof value !== 'bigint' &&
      !(typeof value === 'string' && /^\d+$/.test(value))) {
    throw new Error('Invalid database integer');
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error('Invalid database integer');
  return number;
}

export function mapProduct(row: Record<string, unknown>): Product {
  function requiredText(key: string): string {
    const value = row[key];
    if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid product data');
    return value;
  }
  function nullableText(key: string): string | null {
    const value = row[key];
    if (value === null) return null;
    if (typeof value !== 'string') throw new Error('Invalid product data');
    return value;
  }
  const domain = requiredText('domain');
  if (!domains.has(domain)) throw new Error('Invalid product domain');
  return {
    prd_id: requiredText('prd_id'),
    view_name: requiredText('view_name'),
    cate1_nm: nullableText('cate1_nm'),
    cate2_nm: nullableText('cate2_nm'),
    cate3_nm: nullableText('cate3_nm'),
    cate4_nm: nullableText('cate4_nm'),
    brand_name: nullableText('brand_name'),
    discprice: safeNonnegativeInteger(row.discprice),
    domain: domain as ProductDomain,
    opt1: nullableText('opt1'),
    opt2: nullableText('opt2'),
    opt3: nullableText('opt3'),
    opt4: nullableText('opt4'),
  };
}
