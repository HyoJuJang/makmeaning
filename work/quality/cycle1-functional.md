# Cycle 1 integrated Functional QA / State audit

2026-09-22, `/private/tmp/gscene-quality-20260922`, baseline HEAD `1bbbc0d` plus current cycle 1 working diff. Reviewed shared five-item nav, root hint/spacing, shared garment source/order, category heading polish and newly imported `src/components/scene/quality.css`. No product changes were made during this audit. No browser was used.

## Result

No new material P0/P1 functional/state regression found in the reviewed diff or executed checks. This is **not** visual acceptance or an assertion that all 20 browser canonical states pass. Previous Food placement P2 remains the separately queued cycle 2 issue.

## Actual execution

| Check | Result |
|---|---|
| `npm test` | PASS, exit 0. 70 Node cases (3+5+13+39+10), plus movement/input/interaction/object-art/home-food assertion scripts. Full log `work/quality/cycle1-npm-test.log`. |
| `npm run typecheck` | PASS, exit 0. |
| `git diff --check` | PASS. |
| `SMOKE_BASE_URL=http://127.0.0.1:3301 node tests/release-smoke.mjs` | PASS, exit 0. Home, 4 category pages, purchase/Scene/catalog APIs and room/catalog assets. |
| `SMOKE_BASE_URL=http://127.0.0.1:3301 node tests/release-contract.mjs --compare-catalog /Users/gsretail/Documents/my_docs/projects/makmeaning/work/release-catalog-baseline.json` | PASS, exit 0. 10 exact shared-catalog identities; Food/Beauty same home/user/purchases; fictional examples remain separated; 4 category pages and 39 required assets. |
| Additional actual HTTP route probe | `/`, `/fashion`, `/food`, `/living`, `/beauty` each have exactly 5 native anchors in Fashion/Food/Room/Living/Beauty order and exactly one active destination. |
| Additional live shared-art dependency probe | `/prototype/object-art.js`, `/prototype/garment-art.js`, `/products/knit.svg`, `/products/shirt.svg` return 200. Object art imports the new module; both SVGs use the expected shared long-sleeve viewBox. |

Full common catalog is unchanged: **6,036 products**, SHA-256 `d2caaf9ed958d13c724c87aff849cb7427b3f25514128db5082c4564e19a8dbe`, matching the original baseline. All catalog activity was read-only.

## Risk-focused source review

### Native anchor / root vanilla lifecycle

- CategoryNav now uses native `<a href>` for all destinations; there is no Next Link/router interception in the changed navigation. Root's existing `/prototype/app.js` module entry remains in `app/page.tsx` and the actual response.
- Entering root through the new center link therefore gets normal document boot rather than reusing an already-executed module in a client-only route transition. Returning with BFCache still takes the existing `pageshow.persisted` path: reload confirmed state, clear navigation-in-flight, dispatch BLUR cleanup and repaint.
- Root app state handlers and controller navigation guards are unchanged. Actual room-handler tests cover ready second tap exactly once, safe return dock/re-entry and persisted pageshow state restoration.
- CSS contract makes root modal overlay z30, tray z8 and nav z6; active root modal also hides nav. Expanded tray bottom includes nav height/safe area, and `ensureInteractionVisible` already reads the tray's actual top. These are source-level integration checks; pixel geometry, focus and hit testing require browser confirmation.

### Cross-screen apply / reset / state

- No changes to demo-state storage, normalization, apply, food commit or reset. The new nav does not initialize or clear demo data.
- Existing tests exercise stale page writes after another outfit/food update, exact product-ID persistence, blocked/quota storage, individual field merging, personal-only reset and catalog non-mutation. Collection restore tests cover stale saves after cross-tab reset.
- Main restores confirmed state on storage/persisted pageshow; category components restore saved/cart/confirmed state on storage/pageshow. Fashion/Living pageshow clears temporary previews; Food/Beauty restoration cancels eating. New category visual CSS/heading icons do not change these effects.
- Actual multi-tab browser event delivery, apply→room→reload, reset in another tab and immediate further edits remain Main's browser gate. Unit/source checks cannot substitute for those actions.

### Same identity / same artwork / ordering

- Main wardrobe, Fashion hanger and owned cards now resolve the same allowlisted generic SVG path. Owned catalog/API `imageUrl` still matches that path. The 2 knit purchases retain separate canonical IDs and stable slot numbers 1/3; no invented real-product color is asserted.
- `selectWardrobeProducts` remains the canonical ordering (confirmed first, then recency). Fashion's owned rail now uses the same representative ordering. Selected identity remains ID-based rather than array-index based, so applying an outfit reorders presentation without changing the selected product.
- The new regression applies each of the 3 garments and checks exact emitted product ID order, same source URL, stable distinct possession numbers and existing assets. It passes. This verifies data/source continuity; recognizable or attractive rendering still requires actual screenshot review.
- The root fallback icon map remains legacy code for exceptional broken-image recovery, not the successful renderer. New asset availability was verified live. No unrelated fallback redesign was introduced.

## Outstanding release/browser gates

- 390×844 and 320×568 canonical rendered states and actual four-category round trips.
- New center Room entry after scrolling, native return boot/back behavior, no duplicate handlers, preserved cart/outfit/food states.
- Root modal keyboard/touch blocking; collapsed/expanded tray clearance and scene visibility above new nav.
- Wardrobe/Fashion/card visual identity and numbers, hanger grounding, frame overlap, preview cancel/apply/reload.
- New `quality.css` card/CTA spacing and small-screen clipping. Code review found no functional state edits here, but typography/geometry cannot be passed from source.
- Production build and production deployment smoke after all cycle-selected fixes are integrated; this audit targeted the running local 3301 app.

Only `work/quality/cycle1-functional.md` and its test log were written by this audit. No browser, DB write, Git staging/commit or product edits.

## Subsequent actual-browser regression and repair

Main/critic subsequently reproduced a presentation regression missed by the source/test gate: explicit outfit apply reorders the confirmed garment first, but the horizontal inventory rail kept its previous scroll/snap offset (`scrollLeft=116`), putting the newly confirmed first card at x=-87 on 390px. IDs and storage were correct; the user's just-applied item appeared absent.

Scoped repair in `ScenePage.tsx`: successful explicit apply sets a one-shot ref; a layout effect after the confirmed-state DOM reorder scrolls only that owned Fashion rail to left=0 before paint. General browsing, previews, cart, cross-tab updates and selector/state contracts are unchanged. No CSS change. Typecheck, shared-state 10 cases and shared source/order regression pass. Actual same-scenario browser revalidation is pending Main; the earlier functional PASS did not and does not count as visual acceptance.
