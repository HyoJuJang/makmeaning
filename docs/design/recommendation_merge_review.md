# Recommendation merge — 2026-09-22

## Integration contract

- Starting main: `00114fc`; incoming: `c9fff4c` (`feat/recommendation`).
- Category tab UI and recommendation behavior use the incoming branch. Retain only shared-state safety fixes needed for integration.
- Home keeps its layout, navigation ready gate, movement, completed/cancelled eating, category-owned product selection and product-ID-based quantities.
- Adopt four fictional personas and their 10 purchases, photo metadata and persona-specific saved state. Actual photos are not supported fitting sprites; persona avatars use base outfits.
- Do not commit raw CSV, user recommendation indexes, secrets or generated assets. No DB writes, push or deployment are part of this merge request.

## Home-impact groups / rollback planning

- H1 — home persona picker, API photo validation, persona-aware return bookmark and BFCache reload. UI integration should have a dedicated commit.
- H2 — persona purchase source, API cookie selection and scoped storage/reset. Coupled to tab identity: do not revert state isolation alone while keeping persona switching. Existing `demo-user` keys remain intact for legacy fixtures.
- H3 — render real photos without legacy food-illustration crops; allow the third garment photo in the wardrobe. Pure home presentation support should have a separate commit.
- Retain original room bitmap/layout/styles, controller and animation assets. Do not adopt feature's older fixed-slot validator, artwork-key quantities, direct home outfit applying or older whole-state overwrite logic.

## Review / verification

### Commits and rollback boundaries

| Group | Commit | Files / effect | Rollback caution |
| --- | --- | --- | --- |
| Tabs + H2 shared identity | `09d149b` | Recommendation UI/API, four personas × ten purchases, cookie-selected API source, scoped saved state/reset; default user changes to demo-f01 | Coupled tab/home data contract. Do not revert scoped storage alone while retaining persona selection. |
| H1 home integration | `1184d2a` | `app/app.js`: persona picker names/theme, switch+reload, product-photo validation, per-person return bookmark, cached return refresh | To revert only picker UX, retain photo validation and persona-aware state keys. Whole-commit revert with new API would break home loading. |
| H3 home photo rendering | `0c41ca2` | `app/room-mirror.js`, `app/garment-art.js`, `app/object-art.js`: no old food SVG crop on photos, third garment photo, honest total food quantity label; five regression tests | Display-only changes; reverting restores old photo cropping/label limitations, not previous purchase data. |

The source adaptation in `09d149b` also places mugs/plants in the living table role rather than treating every non-lamp item as a sofa cushion. Original `app/index.html`, `app/style.css`, `app/interactions.js`, `app/movement.js`, avatar animation assets and background art are unchanged from starting main.

### Review → fix → rerun

1. Preserved main's canonical product-ID food consumption and field-wise `updateDemoState`; feature's older whole-state writes were not restored. Added persona isolation/stale-update tests.
2. Fixed actual photos being cropped with old milk/water SVG geometry; third clothing photo can render, generic food total avoids calling oatmeal water or nuts vitamins.
3. Preserved category-owned collections and latest movement/eating contracts instead of feature's fixed-slot/art-key home model.

### Verified

- Full `npm test` PASS, including 30 recommendation/integration Node tests and 9 Python tests; existing movement, five object routes, completed/cancelled eating, per-product quantities and category source tests preserved.
- Production build and `npm run typecheck` PASS after fixes.
- Read-only live DB release contract PASS: ten purchases, same source across home/Food/Beauty, all four pages and 46 assets. One initial transient DB 503 occurred; two subsequent full checks passed.
- Browser at `http://127.0.0.1:3112`: 390px first fridge tap stays home; ready second tap enters Food. Product selection updates recommendation anchor. Food/Beauty content and return home checked; 320px Food/home screenshots inspected. Persona picker changes Minseo to Jiwoo and displays Jiwoo's purchases. Fashion rendering also inspected.
- Automated tests cover all five object navigation routes; this is not a claim of a complete new public-deployment QA pass.

### Remaining limitation

At the initial merge, recommendation runtime indexes were absent and the API returned safe 503. This limitation was resolved locally by the follow-up below. No raw user logs/indexes, secrets, DB writes, remote push or deployment were included.

## Follow-up: aggregate catalog update `140580c`

- Incoming changes are only `.gitignore` and `.recommendation/catalog.json`: 6,031 products, aggregate popularity/neighbors and summary; no individual user shards or sample identity file.
- Integrated without conflicts or home/tab code changes. Existing 3112 server detects the new catalog at runtime without restart.
- Recommendation tests: 30 Node + 9 Python PASS. Actual HTTP: all four default persona domains return 200 with six results. All 40 persona-owned product anchors return nonempty, same-domain results excluding owned items.
- On the existing Beauty browser page, clicking “다시 확인” replaces the unavailable message with actual recommendation cards (names, images, prices and reasons).
- Individual historical-user profiles and sample-user lookup still require private shards/samples. Four built-in fictional personas do not require those files.
- No deployment performed. Existing Next tracing excludes `.recommendation` from deployment bundles; a future Vercel release must explicitly package only the shareable aggregate catalog, keeping private shards excluded.
