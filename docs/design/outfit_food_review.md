# Outfit / Food interaction review

2026-09-21–22 · branch `feat/outfit-food-interaction` · dev `http://127.0.0.1:3114` · final production build `http://127.0.0.1:3115`

## State / Fashion implementation and verification

- Confirmed state uses canonical catalog product IDs. Only Fashion's explicit `내 착장으로 적용` action commits an owned outfit; page-local preview is discarded on exit/cancel. Updates merge action-owned fields into the latest persisted state, so an old room/category snapshot cannot overwrite a newer outfit or remaining food quantity.
- Added one fictional owned garment from the existing read-only catalog: `1065577366`, `[비버리힐즈폴로클럽] 남여 자수 케이블 라운드 긴팔 니트티셔츠`, reference price 35,910 KRW. Public `/api/products?domain=fashion&q=니트&limit=100` verified ID, domain, name and price on this date. No shared DB mutation. Total owned Fashion products: 3; total home purchases: 10.
- `selectWardrobeProducts` selects at most four actual owned Fashion purchases, confirmed outfit first, followed by purchase date and product ID. Main and Fashion consume the same product objects. Both knit products intentionally share a generic knit illustration; visual similarity does not collapse their product IDs. Images remain labeled as illustrative, not exact product appearance or fitting.
- Removed the reverse artwork-to-confirmed-state adapter because multiple products can share an artwork key. Existing legacy stored-art-key migration remains supported when reading old state.
- `consumeOwnedFood` accepts canonical owned Food IDs only, consumes one unit per call, clamps at zero, and does not mutate its input. Completion timing remains the responsibility of the interaction owner.

## Rendered Fashion QA

Actual browser interaction at 390×844:

1. Applied shirt `1083830467` in Fashion, returned to Main, and observed `.walker[data-outfit-product-id="1083830467"]`: **O1 PASS**.
2. Previewed third garment `1065577366`, returned without applying, and observed Main still wearing `1083830467`: **O3 PASS**.
3. Explicitly applied `1065577366`, returned to Main, and refreshed. Both before and after refresh, Main reported and rendered the confirmed `1065577366`: **O4/O5 PASS**.
4. Opened the Main wardrobe. The avatar walked to it and entered the engaged state while retaining `1065577366`. Main wardrobe `data-product` values were `[1065577366, 1106041553, 1083830467]`, matching Fashion's shared representative garments: **wardrobe round trip / identity PASS**.
5. Inspected screenshots of Main's open wardrobe and Fashion. Three garments remained inside the wardrobe and hung separately. Fashion's static unrelated garment artwork is covered by the dynamic owned rail.

At 320×568:

- All three Fashion garment targets measured approximately 47×61 CSS pixels and fit inside the rail without overlap.
- `document.documentElement.scrollWidth === innerWidth === 320`; no page horizontal overflow.
- Preview and apply/cancel controls were visible and reachable. Cancelling retained confirmed outfit `1065577366` and removed the preview ID.
- Browser console warnings/errors: none observed.

## Review → fix → rerun

1. **Fashion garments initially floated below their hangers.** Raised the image within each garment target; rechecked at both viewports so the collar and hanger meet naturally.
2. **Confirmed-outfit text overflowed the narrow product rail.** Allowed the price/current-outfit line to wrap; rechecked the 390px and 320px screenshots with the third garment confirmed.
3. **Readable storage plus quota failure could replenish food from stale persisted data.** Added a per-storage weakly held failed-write snapshot. Repeated session actions continue from current state while that unchanged stale snapshot remains, but a changed external snapshot wins; a successful write clears the marker. Focused test covers 3→2→1 under failed writes, external outfit changes, and recovery.

Focused state/API tests: **15 PASS**. Typecheck: **PASS**, including the final storage-failure fix and removal of the reverse adapter. The final integration gate is recorded by Main below.

## Main integration / Food evidence

| Acceptance | Result and observed evidence |
| --- | --- |
| O1 | PASS — Fashion apply shirt → Main renders canonical ID `1083830467`. |
| O2 | PASS — walking, wardrobe and Food/pantry interactions retain the confirmed outfit. |
| O3 | PASS — preview another owned garment and leave/cancel → previous confirmed garment remains. |
| O4 | PASS — explicitly apply third garment → Main renders `1065577366`. |
| O5 | PASS — refresh restores the confirmed product ID and corresponding palette. |
| O6 | PASS — three owned garments hang inside Main wardrobe; IDs match Fashion. |
| O7 | PASS — Main and Fashion consume the same owned-product selector, with no decorative substitute product IDs. |
| F1 | PASS — Food and Main fridge/pantry expose the same three owned foods and remaining counts. |
| F2 | PASS — selection does not consume; explicit 먹기 starts the action. |
| F3 | PASS — four identities inspected in base/knit/shirt contact sheets; actual Main F02 and Food M01 mobile eating show intact faces, short bent arms, cup at lips and consistent body scale. |
| F4 | PASS — quantity stays 3 during Main eating and becomes 2 on completion; cancel preserves 2; Food completion becomes 1. Final production rerun independently observed 2 during action → 1 on completion. |
| F5 | PASS — other room interactions preserve consumed quantities and confirmed outfit. |
| F6 | PASS — Main/Food round trip and refresh preserve 2, 1 and 0 after completed actions. |
| F7 | PASS — 0 persists after refresh; 다 먹었어요 is disabled and additional consumption is guarded. |

Demo reset restored M01, initial confirmed knit `1106041553`, and all three food quantities to 3. Automated runtime/controller checks cover rapid repeat input, interruption, hidden page, zero stock, reset, and reduced motion. Food category cancellation was also exercised in the actual browser.

## Main integration / Food review — second pass

Actual Food UI: selection preserved 3, completed Main eating reduced 3→2; Food route restored2; cancellation preserved2; completion reduced2→1; reload restored1; final completion→0; disabled empty action and reload0 verified.

Three additional visual findings were fixed in this pass:

1. Food action inherited muted text color from generic anchor-caption button styles; at320px contrast was too low. Scoped the eat action to white text/12px while retaining the disabled empty palette.
2. Actual 320px sip screenshot showed the owned-product number pin over the avatar's face. Hide room number pins for the short eating transaction, then restore them after completion/cancellation. Product rail remains available. The same sip scenario was rerun and the face, hand and cup are unobscured: **PASS**.
3. Main's Fashion entry pill overlapped the first hanger in the open wardrobe. Move it above the open rail; actual 390px rerun shows all three hangers attached and garments inside the wardrobe: **PASS**.

The Visual Asset Agent separately reviewed and corrected M01's same-arm continuity, garment masks near hair/cup, and inherited M01/F01 idle tint masks. Final four identity contact sheets were inspected again. No new limb transforms are used; poses are intact generated raster states with uniform scaling and a fixed foot anchor. The old change-clothes horizontal body compression was removed.

## Final regression / production gate

- `npm test`: **PASS** — existing movement/input/object/scene/catalog tests plus canonical state, actual Main handler transactions, food controller and four-avatar eating assets.
- `npm run typecheck`: **PASS**.
- `npm run build`: **PASS**, default Next.js 16.3.5 Turbopack production build, final runtime and assets.
- `SMOKE_BASE_URL=http://127.0.0.1:3115 node tests/release-smoke.mjs`: **PASS** against the restarted final build; pages, APIs, all ten purchase assets, original and new avatar atlases.
- `SMOKE_BASE_URL=http://127.0.0.1:3115 node tests/release-contract.mjs --api-only`: **PASS**; all ten purchases match shared catalog ID/name/price/category, existing category contracts preserved.
- Actual mobile visual QA at **390×844 / 320×568: PASS** after fixes. No horizontal overflow or observed browser warning/error; final production Food selection → eat → complete → reload restored the remaining count.
- `git diff --check`: **PASS**.

Evidence is in `outfit-food-qa/`: `wardrobe-390.png`, `main-f02-eating-390.png`, `food-m01-eating-320.png`, and one five-state / three-palette pose check per identity. Generation prompts and asset handling are in `app/assets/avatars/eating-README.md`.

## Known limits / separate integration follow-up

- Wardrobe illustrations are generic owned-product representations; two distinct knit IDs intentionally share one knit artwork. Food uses a common cup action for the current milk/water/vitamin demo. Neither represents exact merchant packaging or virtual fitting.
- If browser storage cannot be written, the app continues coherently within the session and displays its storage notice; persistence across refresh cannot be guaranteed in that environment.
- The coordinating nightly task independently reproduced a pre-existing cross-tab reset issue for category-local cart/saved lists (old lists can reappear from an already-open category). It is outside this outfit/Food transaction scope and is assigned to that task's integration pass; it is not counted as a passing reset test here. Confirmed outfit and food reset/persistence are verified above.
