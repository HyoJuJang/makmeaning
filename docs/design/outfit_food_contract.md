# Outfit / Food interaction contract — 2026-09-21

Scope: explicit Fashion outfit confirmation, shared owned wardrobe garments, Food eating. No new category/recommendation/backend features.

- `gscene-main-v1` version 2 remains the only confirmed state. `outfitId`, `foodQuantity` keys, and all ownership are canonical shared-catalog product IDs. Illustration keys are render-only.
- 2026-09-22 user correction: Fashion owned garments expose an explicit `입기` action directly on the wardrobe/card. It walks to that garment, changes, returns, then commits its exact owned `outfitId` once. Until completion, Cancel / Escape / page hide / leaving / rapid reselection cancels the pending write and preserves the confirmed outfit. Cart and recommendation previews remain page-local. Main wardrobe only mirrors the confirmed ID and links to Fashion.
- Wardrobe shows up to four owned garments, confirmed first then recent purchases, using three verified demo purchases minimum. Hangers and clothes stay within existing rail/interior bounds. Generic illustrations remain disclosed as illustrative, not exact product fittings.
- Food selection never decrements. Explicit 먹기 starts one cancellable, exclusive action. Completion decrements exactly once; leaving, hiding, reset or cancellation before completion does not consume. Empty items disable eating. Refresh restores completed results.
- Main and Food category use the same state helper and natural raster eating poses. Preserve current avatar and confirmed garment palette. No new body deformation. Reduced motion uses a stable pose and short completion.
- Save only the changed confirmed field against the latest stored state to avoid overwriting another page's outfit. Storage/BFCache restoration refreshes rendered state.
- Run O1–O7 and F1–F7, 390×844 / 320×568 rendered QA, interruption/double input/reset regressions, existing tests, typecheck and production build. Review at most three material defects, fix and repeat the same scenarios before commit.

## Supported appearance boundary (2026-09-22)

`getOutfitAppearance` uses reviewed game-asset family/color/pattern metadata, separately from catalog `imageKind`. Eight of the twelve current owned garments have supported long-sleeve renderings: F01 3, F02 1, M01 2, M02 2. Shirt, round/V cardigan, sweatshirt and the two reviewed M02 cardigan assets have distinct palette/neckline/closure details. Unsupported hood/short-sleeve/trim variants show `착장 준비 중` and remain usable as recommendation anchors; they never silently apply the same generic shirt. The approved raster silhouette remains a stylized demo, not exact product fit.

Confirmed state stores canonical `outfitId`; optional `{productId,key}` appearance cache only preserves the already-applied same owned product when external asset metadata temporarily disappears. An explicitly unsupported asset cannot use that fallback. Persona storage stays isolated.
