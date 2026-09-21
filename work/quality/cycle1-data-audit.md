# Cycle 1 — State / Data audit

2026-09-22. Worktree `/private/tmp/gscene-quality-20260922`, observed HEAD `1bbbc0d`. Read `crit02_overnight_quality_loop.md` and AGENTS.md. This is a source/data audit; Main and independent critics own rendered-browser judgement. The original wardrobe and room bitmap assets were visually inspected, but no browser was used by this auditor.

## Findings for prioritization

### DATA-01 — P1: wardrobe identity presentation diverges despite correct IDs

- State/evidence: Main wardrobe-open → Fashion wardrobe/owned. User-supplied known issue; source cause verified. Main `app/object-art.js:9–24` redraws each garment with a private long/narrow SVG silhouette and colors; Fashion `ScenePage.tsx:311–315` uses `/products/knit.svg` and `/products/shirt.svg`, with different silhouettes, colors and proportions. The product cards use those latter assets. The two screens share a selector and exact IDs, **but not the garment drawing source**.
- Count/source check: both selectors return the same 3 actual purchases, not six fabricated products. Two separate real products (`1106041553`, `1065577366`) intentionally share `knit` artwork, so their displayed clothing is visually indistinguishable. Fashion numbers identify the two; Main garments have only hidden data attributes.
- Additional verified source cause: Fashion's backdrop `public/scene-art/wardrobe-room.png` contains six drawn garments plus shoes. A flat rectangle at 23.5%/13% with size 50.8%/67% (`scene.css:402`) covers that artwork and holds the real three items. Main draws an entirely different wardrobe interior. Actual rendered overlap/patch appearance must be judged by the critic, not passed because data IDs match.
- Why it matters: users cannot confidently recognize the same owned items across room and shopping. This is the current wardrobe mismatch's presentation cause, not a database identity failure.
- Proposed bounded fix: use one existing generic garment-art source in Main wardrobe, Fashion wardrobe and owned cards; preserve canonical IDs and the disclosed illustrative nature. Keep three actual purchases. Maintain a stable, subtle visual identity cue shared with the owned rail for the two knits; do not invent accurate product color/fitting claims. Review the category interior/rail covering against the actual screenshot so stock background garments are not presented as extra ownership.
- Result: unresolved; no product edits made. Browser severity/visual acceptance pending Product and Visual Critic.

### DATA-02 — P2: Food spatial mapping ignores the shared room slot

- State/evidence: Food category kitchen → choose second owned item (water). `CatalogScenePage.tsx:15,239` maps products by array index to x=22/42/77. The source image puts the fridge around x=15–26%, the counter around x=29–67%, and pantry around x=70–84%. Water's canonical `roomSlot` is `fridge-2`, but its marker/action target is x=42% over the counter. Main correctly renders it inside the fridge. CatalogScenePage does not consult `roomSlot` for placement.
- The category scene renders static kitchen artwork + numbered pins, with no owned-product illustrations or depletion representation. Main's real milk/water/vitamin overlays disappear at confirmed quantity 0; category numbers and static scene remain while the rail correctly says 0. This is a spatial/visual continuity weakness, **not a wrong quantity or wrong product ID**.
- Proposed bounded fix: declare category placement from the existing canonical room slots rather than array order, and use existing product illustrations/remaining-state for the selected owned product in the relevant fridge/pantry area if the critic confirms it aids clarity. Preserve Food scope and current eating state machine; no recommendation/new shopping flow.
- Result: unresolved; source cause verified, rendered prioritization pending critic.

### DATA-03 — P2 documentation: release contract still says nine purchases

- `docs/design/room_commerce_contract.md` says the runtime joins nine products. Current seeds/API/tests correctly use ten after adding the third owned Fashion item. Update the one stale sentence during integration to avoid future implementation drift. No runtime or DB change needed.

No new P0 flow/state/API failure was found by this audit. The first two issues are presentation continuity defects; API PASS does not clear them.

## Exact current identity map

| Category / slot | Canonical product ID | Generic art |
|---|---|---|
| Fashion / wardrobe-1 | 1106041553 | knit |
| Fashion / wardrobe-2 | 1083830467 | shirt |
| Fashion / wardrobe-3 | 1065577366 | knit |
| Food / fridge-1 | 1113622242 | milk |
| Food / fridge-2 | 1033331215 | water |
| Food / pantry-1 | 19026466 | vitamin |
| Living / sofa-1 | 32470670 | cushion |
| Living / lamp-1 | 1056652878 | lamp |
| Beauty / vanity-1 | 16052422 | serum |
| Beauty / vanity-2 | 1088835047 | cream |

`selectWardrobeProducts` is used by Main and Fashion. It includes all three garments (including confirmed wearing), sorts confirmed first, then purchase recency, caps at four. Applying each of the three canonical IDs retained that distinct ID and produced the same ID order in both consumers. The two knit IDs are not collapsed by storage. Garment art is intentionally generic; exact product/fitting reproduction is not claimed.

Main food overlays use canonical purchase/slot lookup plus the one-way art adapter. Sequentially consuming each of the three foods to 0 removes that exact product's Main SVG node, without changing the others' identities. Food category purchases derive from API purchase events and the identical joined home. Beauty's selected canonical item and lamp state read the same shared confirmed state.

## Confirmed state / previews / reset

- Canonical state lives in `gscene-main-v1`; outfitId, featuredBeautyId and quantity keys are actual product IDs. Art aliases stay in the rendering adapter.
- Fashion owned preview is local until explicit `내 착장으로 적용`; invalid/unowned IDs cannot become confirmed clothing. Main and category avatars use the same outfit-art selector. Two different knit products yielding the same palette is a disclosed generic-art limitation, not a storage collapse.
- Fictional Scene recommendation previews and saved/cart contents do not become purchases.
- `updateDemoState` merges changed fields against latest persisted state. Shared state tests cover stale page updates, storage quota failure and canonical ID restoration.
- Main restores on storage and persisted pageshow. Fashion/Living restore saved/cart + confirmed state on storage; pageshow additionally clears previews. Food/Beauty restore saved/cart + confirmed state and cancel eating. Reset clears only personal storage keys. No fresh stale-cart regression was identified in source; browser multi-tab/reset remains a separate acceptance gate.
- Cross-tab reset during a Scene preview does not explicitly clear that local preview on the storage event (pageshow does). It remains marked as preview and does not overwrite confirmed state, so this is not promoted to a new P0/P1 without actual confusing user-flow evidence.

## Executed checks

1. `node --test tests/api.test.mjs tests/demo-state.test.mjs tests/scene-recommend.test.mjs tests/catalog.test.mjs` — **42/42 PASS**, exit 0.
2. `node app/tests/object-art.test.mjs` and `node app/tests/home-food.test.mjs` — PASS. Object purchase/slot/depletion, category ready second tap, return state, duplicate guard, outfit preservation, food completion/interruption/reset/blocked-storage assertions.
3. An independent direct-selector/render probe applied each Fashion ID, checked all three wardrobe node IDs, and consumed each Food ID to zero: exact identities preserved, corresponding depleted SVG nodes absent.
4. `SMOKE_BASE_URL=https://makmeaning.vercel.app node tests/release-contract.mjs --api-only --compare-catalog /Users/gsretail/Documents/my_docs/projects/makmeaning/work/release-catalog-baseline.json` — **PASS**, exit 0. All 10 purchased products match live `/api/products/:id` for ID/name/price/domain; Food/Beauty share home/user/purchases; Fashion/Living keep 8/6 fictional examples.
5. Shared catalog **6,036** products, SHA-256 `d2caaf9ed958d13c724c87aff849cb7427b3f25514128db5082c4564e19a8dbe`, identical to original baseline. GET/read-only only; no DB mutations.

## Required rendered recheck after any selected fix

At 390×844 and 320×568: Main wardrobe open → Fashion owned rack/rail (all 3 canonical items) → each outfit preview/cancel/apply → room/reload; food fridge/pantry item selection → category placement → eat/deplete → room/reload; reset while other category tab is open. Compare room/category side by side, not only DOM IDs. Distinguish data-source proof from human visual recognition and plausibility.

Only this report was written. No product files, runtime installation, Git state or shared DB were changed.

## DATA-01 Builder handoff (awaiting rendered review)

Main's actual 390px Fashion screenshot confirmed the source divergence as P1. Scoped implementation now uses `/products/knit.svg` and `/products/shirt.svg` everywhere, containing the existing Main long-sleeve illustration (including its hanger). `app/garment-art.js` supplies the same allowlisted source and stable room-slot number. Main's wardrobe references these SVGs; Fashion's rack and owned cards use the same mapping and selector order. Stable possession numbers 1/2/3 distinguish the two knit IDs without inventing real-product colors or exact-fitting claims. The owning canonical IDs and avatar/interaction/state modules are unchanged.

Changed: `app/object-art.js` wardrobe branch only; `app/garment-art.js` + declaration; two existing `public/products` garment SVGs; scoped Fashion parts of `ScenePage.tsx`; two wardrobe-only CSS rules appended to `scene.css`; focused object-art regression additions. `scripts/prepare-assets.mjs` was run. Live 3301 serves the new helper, object art, both SVGs and Fashion successfully.

Verification: object-art/source/order regression PASS; related shared-state/recommendation tests 21/21 PASS; home-food assertions PASS; typecheck PASS; diff whitespace check PASS. New regression applies each of the three canonical garments and verifies Main preserves selector order, exact owned-card source URLs and stable distinct numbers. No database/Git mutation. `next-env.d.ts` is a dev-runtime-generated change, not authored by this Builder.

**Visual PASS remains pending:** Main/critic must inspect the same room-open/Fashion/owned states at both mobile sizes, including hanger grounding, remaining background artwork, number readability, after-apply reordering and cancel/room return. The implementation's type/API tests do not decide this visual gate.
