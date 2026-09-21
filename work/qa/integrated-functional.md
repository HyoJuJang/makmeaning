# Integrated functional checks after feature merge

Verified 2026-09-21 in `/private/tmp/gscene-nightly-20260921`, integrated feature HEAD `16e0d70`. This report contains source/controller/API verification, not browser or visual acceptance.

## Commands and result

- `npm test` — PASS, exit 0. 70 Node test cases (3 eating frames, 5 home, 13 products, 39 Scene/catalog/avatar, 10 shared state), plus movement, room input, interaction, object art, home catalog and food assertion scripts. Full log: `work/qa/integrated-npm-test.log`.
- `SMOKE_BASE_URL=http://127.0.0.1:3201 node tests/release-smoke.mjs` — PASS, exit 0. Home, four category pages, home/catalog/Scene APIs, room assets and interaction modules.
- `SMOKE_BASE_URL=http://127.0.0.1:3201 node tests/release-contract.mjs --compare-catalog /Users/gsretail/Documents/my_docs/projects/makmeaning/work/release-catalog-baseline.json` — PASS, exit 0. All 10 home purchases match common catalog product ID/name/reference price/domain. Food and Beauty share the identical home/user/purchase contract; their 6/2 fictional examples remain separated. Fashion/Living preserve 8/6 fictional Scene recommendations. Four category pages and 39 required artwork/interaction assets return correctly.
- Full shared catalog remains 6,036 products, SHA-256 `d2caaf9ed958d13c724c87aff849cb7427b3f25514128db5082c4564e19a8dbe`, equal to the pre-change baseline. Queries are read-only; no database mutation occurred.

## Important integration coverage

- Three owned Fashion product IDs stay distinct despite two sharing knit illustration. Wardrobe supports a stable representative set, excludes confirmed wearing state correctly, and does not use artwork as product identity.
- Food eating commits only at animation completion, once; duplicate taps, movement/hide/reset interruption and zero quantity do not consume. Reload/field updates retain consumption; blocked storage does not replenish the current session.
- Related stale-screen state tests and cross-tab Scene reset restoration now pass. Actual multi-tab browser reproduction/retest remains Main Agent's separate evidence.
- Existing second-click category mapping, animation guards, safe interruption/cleanup and return state assertion scripts pass.
- Movement assertions cover 176 routes, 100 random targets with 0 unreachable, and 3,000 keyboard steps.

## Canonical visual harness readiness

`http://127.0.0.1:3202/` restarted with the new fixture and source module imports. Current server returns 10 purchases and Fashion IDs `1106041553`, `1083830467`, `1065577366`.

460 deterministic combinations (23 presets × 5 frames × 4 avatars) construct from the real controller, avatar and object renderers without errors. Real eating state keeps quantity 3 at midpoint and consumes once to 2 at completion. New eating assets and module URLs return 200; private paths remain 404. The obsolete Main wardrobe outfit-change preset is removed. All canonical controls are labeled synthetic; they do not write application state.

## Limits

No browser was used by this helper and no visual PASS is implied. Main Agent/Visual Critic must inspect actual rendering, intermediate poses, mobile clipping/touch, object arrival and second-tap navigation, and the stale multi-tab reset scenario. Production deployment verification belongs to the release owner. No product runtime, Git staging, commit or database writes were performed during this follow-up.
