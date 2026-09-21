-- Run as one transaction with scripts/products-migrate.mjs.
-- Non-destructive: existing rows and teammates' opt1–opt4 values are preserved.
CREATE TABLE IF NOT EXISTS public.products (
  prd_id TEXT PRIMARY KEY
    CHECK (char_length(prd_id) BETWEEN 1 AND 64 AND length(btrim(prd_id)) > 0),
  view_name TEXT NOT NULL CHECK (length(btrim(view_name)) > 0),
  cate1_nm TEXT,
  cate2_nm TEXT,
  cate3_nm TEXT,
  cate4_nm TEXT,
  brand_name TEXT,
  discprice BIGINT NOT NULL CHECK (discprice BETWEEN 0 AND 9007199254740991),
  domain TEXT NOT NULL CHECK (domain IN ('fashion', 'food', 'living', 'beauty')),
  opt1 TEXT,
  opt2 TEXT,
  opt3 TEXT,
  opt4 TEXT
);

CREATE INDEX IF NOT EXISTS products_domain_idx ON public.products (domain);
