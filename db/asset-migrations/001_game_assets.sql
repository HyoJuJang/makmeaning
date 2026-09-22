-- Run only against the separate asset database through ASSET_DATABASE_URL.
-- No statement in this migration touches the catalog's public.products table.
CREATE TABLE IF NOT EXISTS public.game_assets (
  asset_id TEXT PRIMARY KEY CHECK (asset_id ~ '^[a-z0-9_-]{1,240}$'),
  domain TEXT NOT NULL CHECK (domain IN ('fashion','food','living','beauty')),
  family_id TEXT NOT NULL CHECK (family_id ~ '^[a-z0-9_-]+$'),
  version TEXT NOT NULL CHECK (version = 'v1'),
  sha256 TEXT NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  metadata JSONB NOT NULL CHECK (jsonb_typeof(metadata) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (asset_id, domain, family_id),
  CHECK (metadata->>'id' = asset_id AND metadata->>'domain' = domain AND metadata->>'familyId' = family_id
    AND metadata->>'version' = version AND metadata->>'sha256' = sha256 AND metadata->>'status' = 'ready'),
  CHECK (metadata ?& ARRAY['id','domain','familyId','version','sha256','status','url','frame','anchor','width','height']),
  CHECK (NOT metadata ?| ARRAY['sourcePath','approvedProductIds','generationPrompt','prompt','refs','references'])
);
CREATE TABLE IF NOT EXISTS public.product_game_assets (
  prd_id TEXT PRIMARY KEY CHECK (prd_id ~ '^[0-9]{1,64}$'),
  domain TEXT NOT NULL CHECK (domain IN ('fashion','food','living','beauty')),
  status TEXT NOT NULL CHECK (status IN ('ready','pending_generation','needs_review')),
  family_id TEXT NOT NULL,
  asset_id TEXT,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(reasons) = 'array'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (asset_id, domain, family_id) REFERENCES public.game_assets(asset_id, domain, family_id),
  CHECK ((status = 'ready' AND asset_id IS NOT NULL) OR (status <> 'ready' AND asset_id IS NULL))
);
CREATE INDEX IF NOT EXISTS product_game_assets_domain_status_id ON public.product_game_assets(domain, status, prd_id);
CREATE INDEX IF NOT EXISTS product_game_assets_asset_id ON public.product_game_assets(asset_id) WHERE asset_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.game_asset_imports (
  source_sha256 TEXT PRIMARY KEY CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  asset_count INTEGER NOT NULL CHECK (asset_count >= 0),
  product_count INTEGER NOT NULL CHECK (product_count >= 0),
  status_counts JSONB NOT NULL CHECK (jsonb_typeof(status_counts) = 'object'),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
