import type { AssetStatus, Domain, GameAsset } from '../game-asset-types.ts';

export type PublicGameAsset = Omit<GameAsset, 'sourcePath'>;
export interface AssetProductMapping {
  prd_id: string; domain: Domain; status: AssetStatus; familyId: string;
  assetId: string | null; reasons: string[]; asset: PublicGameAsset | null;
}
export interface AssetFilters { domain?: Domain; status?: AssetStatus; limit: number; offset: number }
export interface AssetList {
  products: AssetProductMapping[];
  pagination: { limit: number; offset: number; total: number };
}
export interface AssetRepository {
  list(filters: AssetFilters): Promise<AssetList>;
  find(prdId: string): Promise<AssetProductMapping | null>;
  /** Found IDs only, in requested order. Unknown IDs do not get guessed assets. */
  findMany(ids: string[]): Promise<AssetProductMapping[]>;
  findAsset(assetId: string): Promise<PublicGameAsset | null>;
}
export class AssetApiError extends Error {
  status: number; code: string;
  constructor(status: number, code: string, message: string) {
    super(message); this.name = 'AssetApiError'; this.status = status; this.code = code;
  }
}
const domains = new Set(['fashion', 'food', 'living', 'beauty']);
const statuses = new Set(['ready', 'pending_generation', 'needs_review']);
function invalid(message: string): never { throw new AssetApiError(400, 'INVALID_ASSET_QUERY', message); }
export function validateAssetProductId(id: string): string {
  if (typeof id !== 'string' || !/^[0-9]{1,64}$/.test(id)) {
    throw new AssetApiError(400, 'INVALID_PRODUCT_ID', '상품 ID는 공백 없는 1~64자리 숫자 문자열이어야 합니다.');
  }
  return id;
}
export function validateAssetId(id: string): string {
  if (typeof id !== 'string' || !/^[a-z0-9_-]{1,240}$/.test(id)) {
    throw new AssetApiError(400, 'INVALID_ASSET_ID', '올바른 에셋 ID를 입력해 주세요.');
  }
  return id;
}
export function validateResolveIds(ids: string[]): string[] {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 50) invalid('한 번에 상품 ID 1~50개를 조회할 수 있습니다.');
  ids.forEach(validateAssetProductId);
  if (new Set(ids).size !== ids.length) invalid('상품 ID는 중복될 수 없습니다.');
  return [...ids];
}
function checkKeys(params: URLSearchParams, allowed: string[]) {
  for (const key of params.keys()) if (!allowed.includes(key) || params.getAll(key).length !== 1) invalid('지원하지 않거나 중복된 쿼리 항목입니다.');
}
export function parseResolveIds(params: URLSearchParams): string[] {
  checkKeys(params, ['ids']);
  return validateResolveIds((params.get('ids') ?? '').split(','));
}
export function parseAssetFilters(params: URLSearchParams): AssetFilters {
  checkKeys(params, ['domain', 'status', 'limit', 'offset']);
  const domain = params.get('domain'), status = params.get('status');
  if (domain !== null && !domains.has(domain)) invalid('domain은 fashion, food, living, beauty 중 하나여야 합니다.');
  if (status !== null && !statuses.has(status)) invalid('status는 ready, pending_generation, needs_review 중 하나여야 합니다.');
  const integer = (key: string, fallback: number, min: number, max: number) => {
    const raw = params.get(key); if (raw === null) return fallback;
    const value = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < min || value > max) invalid(`${key}의 범위가 올바르지 않습니다.`);
    return value;
  };
  return { ...(domain ? { domain: domain as Domain } : {}), ...(status ? { status: status as AssetStatus } : {}),
    limit: integer('limit', 24, 1, 100), offset: integer('offset', 0, 0, 1000000) };
}
export function assetDatabaseUrl(env: Record<string, string | undefined>): string {
  const url = env.ASSET_DATABASE_URL?.trim();
  if (!url) throw new AssetApiError(503, 'ASSET_DATABASE_NOT_CONFIGURED', '에셋 데이터베이스가 아직 연결되지 않았습니다.');
  return url;
}
export function safeCount(value: unknown): number {
  if (!(typeof value === 'number' || typeof value === 'bigint' || (typeof value === 'string' && /^\d+$/.test(value)))) throw new Error('Invalid count');
  const result = Number(value); if (!Number.isSafeInteger(result) || result < 0) throw new Error('Invalid count');
  return result;
}
/** Explicit allowlist: never serialize arbitrary metadata or generation/approval fields. */
export function publicAsset(value: unknown): PublicGameAsset {
  if (!value || typeof value !== 'object') throw new Error('Invalid asset');
  const a = value as Record<string, unknown>;
  if (typeof a.id !== 'string' || !/^[a-z0-9_-]{1,240}$/.test(a.id) || !domains.has(String(a.domain)) || a.status !== 'ready'
    || a.version !== 'v1' || typeof a.familyId !== 'string' || !/^[a-z0-9_-]+$/.test(a.familyId)
    || typeof a.url !== 'string' || !/^\/assets\/game-items\/v1\/(fashion|food|living|beauty)\/[a-z0-9_-]+\/[a-z0-9_-]+\.png$/.test(a.url)
    || !a.url.startsWith(`/assets/game-items/v1/${a.domain}/${a.familyId}/`)
    || typeof a.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(a.sha256)) throw new Error('Invalid asset');
  const width = Number(a.width), height = Number(a.height);
  const frame = a.frame as PublicGameAsset['frame'], anchor = a.anchor as PublicGameAsset['anchor'];
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0 || !frame || !anchor
    || ![frame.x, frame.y, frame.width, frame.height].every(Number.isInteger)
    || frame.x < 0 || frame.y < 0 || frame.width <= 0 || frame.height <= 0 || frame.x + frame.width > width || frame.y + frame.height > height
    || ![anchor.x, anchor.y].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)
    || !['color', 'pattern', 'label', 'placement'].every(key => typeof a[key] === 'string')) throw new Error('Invalid asset geometry');
  return { id: a.id, domain: a.domain as Domain, familyId: a.familyId, version: 'v1', status: 'ready',
    color: a.color as string, pattern: a.pattern as string, label: a.label as string, placement: a.placement as string,
    url: a.url, sha256: a.sha256, width, height,
    frame: { x: frame.x, y: frame.y, width: frame.width, height: frame.height }, anchor: { x: anchor.x, y: anchor.y } };
}
export function mapAssetProduct(row: Record<string, unknown>): AssetProductMapping {
  if (typeof row.prd_id !== 'string' || !/^[0-9]{1,64}$/.test(row.prd_id) || !domains.has(String(row.domain))
    || !statuses.has(String(row.status)) || typeof row.family_id !== 'string' || !Array.isArray(row.reasons)
    || !row.reasons.every(r => typeof r === 'string')) throw new Error('Invalid asset mapping');
  const asset = row.asset_metadata == null ? null : publicAsset(row.asset_metadata);
  const ready = row.status === 'ready';
  if (ready ? (!asset || row.asset_id !== asset.id || row.domain !== asset.domain || row.family_id !== asset.familyId)
    : (row.asset_id !== null || asset !== null)) throw new Error('Inconsistent asset mapping');
  return { prd_id: row.prd_id, domain: row.domain as Domain, status: row.status as AssetStatus, familyId: row.family_id,
    assetId: ready ? asset!.id : null, reasons: [...row.reasons] as string[], asset };
}
