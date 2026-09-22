export type AssetStatus = 'ready' | 'pending_generation' | 'needs_review';
export type Domain = 'fashion' | 'food' | 'living' | 'beauty';
export type GameAsset = {
  id: string; familyId: string; color: string; pattern: string; domain: Domain;
  label: string; version: string; sourcePath?: string; url: string; width: number; height: number;
  frame: { x: number; y: number; width: number; height: number };
  anchor: { x: number; y: number }; placement: string; sha256: string; status: 'ready';
};
export type MappedProduct = {
  prd_id: string; view_name: string; cate1_nm: string; cate2_nm: string; cate3_nm: string;
  cate4_nm: string; brand_name: string; discprice: string; domain: Domain; sourceImageUrl: string;
  familyId: string; familyLabel: string; color: string; pattern: string; attributes: Record<string, unknown>;
  mappingStatus: 'classified' | 'needs_review'; evidence: string[]; reasons: string[];
  placement: string; assetStatus: AssetStatus; assetId: string | null; assetUrl: string | null;
  assetRequestKey: string | null;
};
export type AssetSummary = {
  totalProducts: number; uniqueProductIds: number; domains: Record<Domain, number>;
  assetStatuses: Record<AssetStatus, number>; assetFiles: number; pendingAssetGroups: number;
};
export type ProductWithAsset = MappedProduct & { asset: GameAsset | null };
export type AssetLibraryResult = { summary: AssetSummary; products: ProductWithAsset[]; total: number; page: number; pages: number };
