# Nightly functional baseline

2026-09-21 overnight run. Worktree: `/private/tmp/gscene-nightly-20260921`; checked HEAD `025bff68426f0b65a3cfa6db604ed7a19082d67b` (administrative baseline; released product code `a69db03`). Read AGENTS, nightly execution contract, and room/commerce identity-state contract. No product files, Git state, browser, shared DB, or concurrent feature worktree changed.

## Executed results

| Check | Result / exact scope |
| --- | --- |
| `npm test` | PASS, exit 0. 60 Node test cases (Home 5, Products 13, Scene/catalog/avatar 38, shared state 4), plus movement/input/interaction/object-art/home-food assertion scripts. |
| Movement | PASS: 176 routes, 100 random targets, 0 unreachable, 3,000 keyboard steps; held input, collision, keyup/blur/visibility cleanup. |
| Interaction and route guards | PASS: first tap stays in room; five objects only route after ready second tap; rapid input/stale epochs ignored; cleanup, safe return dock, re-entry; wardrobe/vanity commit once; window/lamp/bed cancellation; food inspection and zero guard. |
| Public `release-smoke.mjs` | PASS, exit 0, `https://makmeaning.vercel.app`: Home/Fashion/Food/Living/Beauty, purchase/Scene/catalog APIs, required artwork. |
| Public `release-contract.mjs --compare-catalog ...` | PASS, exit 0: all 9 purchased products exactly match `/api/products/:id` ID/name/price/domain. Food/Beauty home/user/purchases match. Scene fictional examples remain 8 Fashion / 6 Living; Food/Beauty existing examples remain 6 / 2. Five pages and 39 required assets pass. |
| Complete public catalog | PASS: all 6,036 rows unchanged from original baseline. SHA-256 `d2caaf9ed958d13c724c87aff849cb7427b3f25514128db5082c4564e19a8dbe`. |

Baseline file used read-only: `/Users/gsretail/Documents/my_docs/projects/makmeaning/work/release-catalog-baseline.json`.

No functional failure was reproduced by these checks. This is not a rendered mobile, visual, or full browser interaction PASS. Local nightly build/typecheck/port 3201 are Main Agent's separate checks. Public endpoint tests do not independently attest the deployed Git commit.

## Fresh QA gaps / priority

1. **Reset plus browser Back/BFCache — investigate first.** Source inspection finds ScenePage and CatalogScenePage restore confirmed state on `pageshow`/`storage`, while cart/saved state is loaded at mount only. Reproduce: add/save in category → room → reset → browser Back to category → inspect cart/saved → make another change → reload. Expected: reset personal choices stay reset; no previous choices resurrect. Existing tests verify storage deletion and room BFCache appearance, not React category cart/saved restoration. This is a candidate defect, not a browser-reproduced failure.
2. **Real pointer/DOM lifecycle.** Room event tests use a VM/minimal DOM; avatar tests use a controlled animation clock. Re-run all four categories' approach/open-or-sit/ready-second-tap/return and rapid tap during entry/exit at 390×844 and 320×568. Verify real label/object hit areas, scroll, overlay occlusion, and back-forward entry after a fix.
3. **Preview isolation in mounted screens.** Shared-state tests reject unowned application, but the preview-cancel test itself uses a local variable; it does not drive the React UI. Run owned outfit preview→cancel; preview→route away; preview→reload; explicit apply→room→reload. Also test Living lighting/placement preview cancel and route-away while preserving confirmed lamp state. Verify saved/cart after reload and reset. These require actual browser coverage.

## Incoming wardrobe/food integration acceptance

Do not test or edit `/private/tmp/gscene-outfit-food` while it is moving. After the owner's handoff commit is integrated:

- Confirm 3–4 owned Fashion products use unique canonical catalog IDs and purchase IDs. Every name/price/domain must join the same DB product; keep illustration keys separate. The baseline's hardcoded nine-purchase assertions in API/release tests must be deliberately updated to the new approved fixture size, while retaining exact identity checks and all four categories.
- Verify every owned garment can be selected in the room/category, previews remain temporary, only explicit application commits, exactly one outfit is confirmed, and room→category→room/reload shows the same ID and visible outfit. Check newly added art keys do not fall back to `base` through the existing knit/shirt allowlists, nor lose identity through art-key adapters.
- Verify wardrobe selection shows all 3–4 garments at both mobile widths without blocking the object second-tap route. Rapid change/cancel/route requests must not commit stale selection or navigate before ready.
- Food: first inspect shows product without decrement. Trigger consumption → actual visible action → decrement exactly once only at documented completion/commit. Check cancellation/move/visibility loss before commit consumes nothing; after commit no duplicate or rollback. Repeated taps cannot consume twice or route mid-animation.
- Food: consume to zero, verify no negative values, action disabled/absent at zero, room object/product representation updates, Food category shows the same remaining count, room return/reload preserves it. Reset restores only personal quantities/appearance/cart/saves.
- Re-run `npm test`, production build/typecheck, Home/Product/Food/Beauty/Scene contracts, the same complete catalog digest comparison, then actual four-category round trips and mid-animation canonical states. DB baseline must remain unchanged; do not write to the common catalog to support the new demo.
