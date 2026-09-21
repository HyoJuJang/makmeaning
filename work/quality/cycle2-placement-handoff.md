# Cycle 2 DATA-02 — Category owned-object placement

Source implementation ready; actual rendered QA pending Main/independent critic.

`src/lib/catalog-room.ts` maps the existing canonical room slots to the 450×150 category illustration coordinates. It joins only actual home purchases and shared-products catalog entries; list/API array order and fictional examples cannot create or move an owned object.

- Milk `fridge-1` and water `fridge-2`: two visible shelves inside the existing fridge frame, both approach x22%. Number pins sit beside that same fridge with subtle connectors.
- Vitamin `pantry-1`: upper pantry shelf, approach x77%.
- Beauty `vanity-1` / `vanity-2`: existing vanity and adjacent shelf, approach x55% / x76%. Confirmed featured item keeps a subtle grounding highlight.
- Existing generic API SVGs are reused and cropped/aligned to their lower edge, with contact shadows. Static fridge interior replaces the closed front in this category illustration; no new fridge-opening animation or shopping feature was added.
- Food at confirmed quantity 0 removes its object picture while its existing purchase marker remains inspectable; quantity/disabled eating remain the existing confirmed-state logic. IDs, slot and remaining state are exposed as DOM data attributes.
- Original select/eat lifecycle, cart/saved and API/DB contracts are unchanged.

Files: `CatalogScenePage.tsx`, placement-only additions to `catalog.css`, new `src/lib/catalog-room.ts`, two meaningful regressions in `tests/catalog.test.mjs`.

Checks: typecheck PASS; catalog suite 18/18 PASS; home-food integration assertions PASS; diff check PASS. New tests shuffle home/events/catalog arrays and preserve exact geometry/IDs; depleted food and changed featured Beauty state remain correct; a fictional recommendation cannot become an owned object. No DB/Git mutation.

Required actual review after production rebuild: Food/Beauty 390×844 and 320×568; actual product grounding in the fridge and pantry rather than door stickers; number targets readable/tappable; water marker→approach at fridge; milk/water/vitamin eating and cancellation; decrement/0 state→room return/reload; Beauty selected state preserved. Inspect source SVG pixels in context and revise geometry if unnatural. These tests do not constitute visual PASS.
