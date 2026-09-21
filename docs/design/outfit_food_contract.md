# Outfit / Food interaction contract — 2026-09-21

Scope: explicit Fashion outfit confirmation, shared owned wardrobe garments, Food eating. No new category/recommendation/backend features.

- `gscene-main-v1` version 2 remains the only confirmed state. `outfitId`, `foodQuantity` keys, and all ownership are canonical shared-catalog product IDs. Illustration keys are render-only.
- Fashion preview is page-local. Only Fashion's explicit apply writes `outfitId`; leaving/cancelling preserves confirmed state. Main wardrobe shows the same owned IDs and links to Fashion to change clothes.
- Wardrobe shows up to four owned garments, confirmed first then recent purchases, using three verified demo purchases minimum. Hangers and clothes stay within existing rail/interior bounds. Generic illustrations remain disclosed as illustrative, not exact product fittings.
- Food selection never decrements. Explicit 먹기 starts one cancellable, exclusive action. Completion decrements exactly once; leaving, hiding, reset or cancellation before completion does not consume. Empty items disable eating. Refresh restores completed results.
- Main and Food category use the same state helper and natural raster eating poses. Preserve current avatar and confirmed garment palette. No new body deformation. Reduced motion uses a stable pose and short completion.
- Save only the changed confirmed field against the latest stored state to avoid overwriting another page's outfit. Storage/BFCache restoration refreshes rendered state.
- Run O1–O7 and F1–F7, 390×844 / 320×568 rendered QA, interruption/double input/reset regressions, existing tests, typecheck and production build. Review at most three material defects, fix and repeat the same scenarios before commit.
