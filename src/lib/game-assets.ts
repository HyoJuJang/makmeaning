// Server-only catalog index. Clients receive a filtered page, not all 5,224 records.
import generated from '../generated/product-asset-map.json' with { type: 'json' };
import type { AssetLibraryResult, AssetStatus, AssetSummary, Domain, GameAsset, MappedProduct, ProductWithAsset } from './game-asset-types.ts';

const dataset = generated as unknown as { summary: AssetSummary; assets: GameAsset[]; products: MappedProduct[] };
const assets = new Map(dataset.assets.map(asset => [asset.id, asset]));
const products = new Map(dataset.products.map(product => [product.prd_id, product]));
const withAsset = (product: MappedProduct): ProductWithAsset => ({ ...product,
  asset: product.assetStatus === 'ready' && product.assetId ? assets.get(product.assetId) ?? null : null,
});

/** Use the original CSV ID string. Unknown IDs never receive a guessed asset. */
export function getGameProduct(prdId: string): ProductWithAsset | null {
  const product = products.get(prdId);
  return product ? structuredClone(withAsset(product)) : null;
}

export function listGameProducts(options: { domain?: Domain; status?: AssetStatus; query?: string; page?: number; limit?: number } = {}): AssetLibraryResult {
  const needle = options.query?.trim().toLocaleLowerCase() ?? '';
  const matching = dataset.products.filter(product => (!options.domain || product.domain === options.domain)
    && (!options.status || product.assetStatus === options.status)
    && (!needle || product.prd_id.includes(needle) || product.view_name.toLocaleLowerCase().includes(needle) || product.familyLabel.includes(needle)));
  const limit = options.limit ?? 12, pages = Math.max(1, Math.ceil(matching.length / limit));
  const page = Math.max(1, Math.min(options.page ?? 1, pages));
  return structuredClone({ summary: dataset.summary, products: matching.slice((page - 1) * limit, page * limit).map(withAsset), total: matching.length, page, pages });
}
