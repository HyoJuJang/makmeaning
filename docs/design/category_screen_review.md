# Fashion / Living review

2026-09-21 · feature branch `feat/fashion-living-scenes` · base `341bc5d`.

## Review → fix → rerun

1. Small choice/reason text had insufficient contrast. Darkened core labels and reasons, slightly increased mobile font sizes. Rebuilt and visually inspected again.
2. Saved list → product details → cart replaced the focused element. Reproduced focus falling to BODY. Added explicit dialog title focus and scroll reset per view. Rebuilt and reran the same saved → detail → cart path; focus now lands on each dialog title.
3. Living room illustration showed a blue cushion although the actual owned demo item is olive. Overlay the existing owned cushion asset and floor lamp; only numbered items imply ownership. Other room items remain decorative context.

## Functional verification

- Production build and TypeScript: PASS.
- Existing movement/input/object interaction and home API tests: PASS.
- New scene API tests: 4 PASS; recommendation tests: 8 PASS.
- Release smoke: homepage, 9 purchase images, old modules, /fashion, /living, both catalog APIs, new room/product artwork: PASS.
- Browser: main Fashion link → detail page; Living navigation and home return.
- Mobile fashion at 390 × 844: compact room, inventory rail, wrapping chips, two-column recommendations, fixed nav. DOM width 390 with no horizontal overflow. Also inspected 694px tablet/single-column and 1280px desktop/two-column Living layout.
- Fashion 30,000 KRW + two tastes: exactly two products, 19,000 and 29,000 KRW. No budget violation.
- Custom budget 100 KRW: visible validation and disabled Apply; 1,000 KRW: truthful empty state, no expensive fallback.
- Product detail → add cart → cart total; save product; reload restores added cart and saved item.
- Cart anchor: choose brown loafers, selected source changes to cart, anchor is excluded from its own recommendations. New discovery clears anchor.
- Living 30,000 KRW: exactly one 19,000 KRW suggestion. Purchase marker changes anchor and explanation.

## Prototype limits

Fictional customer, purchase history, catalog names/prices and generated sample imagery. No merchant checkout, authenticated account, real inventory or learned recommendation model. Local cart/favorites are category scoped. A real product feed can replace the scene API data without replacing the UI.

Local `next dev` encountered the host's file watcher limit (EMFILE), so browser verification and the delivered preview use `npm run build` + `npm start`. This is an environment restriction; the production build and server work.

No deployment or remote branch push is part of this local implementation delivery. Existing Vercel configuration is preserved.
