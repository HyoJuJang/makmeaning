# Shared product table

`public.products` follows the 13 columns in `docs/design/backend/tables.md`.
`prd_id` is text so leading zeroes survive. `discprice` is a non-negative whole KRW
amount, limited to JavaScript's maximum safe integer. Nullable category, brand and
`opt1`–`opt4` fields use SQL `NULL` for missing values.

Use the Vercel project's connected Neon database. Keep `DATABASE_URL` only in
Vercel environment variables or the ignored `.env.local`; never commit it.
Obtain local variables with the team's authorized Vercel account:

```sh
vercel env pull .env.local
node --env-file-if-exists=.env.local scripts/products-migrate.mjs
node --env-file-if-exists=.env.local scripts/products-seed.mjs
```

The migration runs in a transaction and does not drop anything. The seed inserts
the five supplied samples and skips existing product codes, preserving teammates'
edits. Its source aliases are normalized: `brd_nm` → `brand_name`, `price` →
`discprice`. The broken `living` line is restored; the book keeps its source
`fashion` domain. No beauty sample was supplied, so none is invented.

## Team edits

In the connected Neon SQL editor, teammates can update their shared optional
fields directly:

```sql
UPDATE public.products
SET opt1 = 'tab-fashion', opt2 = 'wardrobe'
WHERE prd_id = '1000000660';

SELECT * FROM public.products WHERE domain = 'fashion' ORDER BY prd_id;
```

For a JSON bulk import, include `prd_id`, `view_name`, `discprice` (or `price`) and
`domain` for each product. Additional fields are optional:

```json
[
  {
    "prd_id": "1000000660",
    "view_name": "~4XL 빅사이즈 기본코튼 와이드무지편한 무지밴딩팬츠_BP7206",
    "discprice": 22500,
    "domain": "fashion",
    "opt1": "tab-fashion"
  }
]
```

```sh
node scripts/products-import.mjs path/to/products.json --check
node --env-file-if-exists=.env.local scripts/products-import.mjs path/to/products.json
```

Validation checks every row before writing. Import uses one parameterized
transaction and upserts by `prd_id`. On existing rows, omitted optional fields
remain unchanged; an explicit `null` or blank string clears that field. On new
rows, omitted optional fields become `NULL`. The import accepts only the 13
specified fields and the two source aliases; duplicate product codes within one
file are rejected.
