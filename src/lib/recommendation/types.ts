import type { GameAsset } from '../game-asset-types.ts';
export type RecommendationDomain = 'fashion' | 'living' | 'food' | 'beauty';
export type RecommendationMode = 'behavior' | 'metadata';
export type RecommendationSource = RecommendationMode | 'popularity' | 'catalog';
export interface RecommendationProduct {
  prd_id: string; view_name: string; cate1_nm: string; cate2_nm: string;
  cate3_nm: string; cate4_nm: string; brand_name: string; discprice: number;
  domain: RecommendationDomain;
  /** Exact-ID generated artwork; absence never licenses another product's image. */
  gameAsset?: GameAsset | null;
  /** Catalog photograph for this exact product, independent of generated artwork. */
  imageUrl?: string;
}
export interface UserItem {
  productId: string; viewCount: number; cartCount: number; orderCount: number; lastAt: string;
}
export interface UserProfile { items: UserItem[] }
export interface RecommendationIndex {
  version: 1; builtAt: string; window: { from: string; to: string };
  products: RecommendationProduct[];
  popularity: Record<string, number>;
  neighbors: Record<string, { productId: string; score: number; support: number }[]>;
  summary: {
    products: number; users: number; domains: Record<string, number>;
    files: Record<string, { rows: number; matchedRows: number; usableRows: number; anonymousRows: number; invalidRows: number }>;
    [key: string]: unknown;
  };
}
export interface RecommendationRequest {
  userId?: string; sample?: RecommendationDomain; domain: RecommendationDomain;
  mode?: RecommendationMode; limit?: number;
  /** When selected, use only this product as a seed and never fill with unrelated defaults. */
  anchorProductId?: string;
  /** Explicit current screen context supplements the historical dump; it does not mutate it. */
  purchasedProductIds?: string[]; cartProductIds?: string[];
}
export interface RecommendationItem {
  product: RecommendationProduct; score: number; reason: string;
  source: RecommendationSource; anchorProductId?: string; support?: number;
  signals: { behavior: number; metadata: number; popularity: number };
}
export interface RecommendationResponse {
  assets?: { status: 'ready' | 'partial' | 'unavailable'; mapped: number; total: number };
  domain: RecommendationDomain; requestedMode: RecommendationMode;
  effectiveMode: RecommendationSource | 'mixed'; fallbackReason: string | null;
  userState: 'history' | 'views-only' | 'no-domain-history' | 'unknown';
  items: RecommendationItem[];
  anchors: { product: RecommendationProduct; source: 'order' | 'cart' | 'view' | 'selected' }[];
  excludedCount: number; totalCandidates: number;
  data: { builtAt: string; window: { from: string; to: string } };
}
