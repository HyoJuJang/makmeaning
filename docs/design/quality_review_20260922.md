# Product quality review — 2026-09-22

Contract: `docs/criterion/crit02_overnight_quality_loop.md`. Baseline: `97fd72b`, remote rollback tag `baseline-quality-20260922-0121`. All work was isolated on `quality/overnight-20260922`. Product critics viewed rendered screens before app source. No new product feature, account, backend or catalog write was added.

## Two product cycles

| Cycle | Selected material defects | Same-state result |
| --- | --- | --- |
| 1 | Vanity standing-looking hips/legs (P1); wardrobe/Fashion garment identity (P1); persistent Room navigation (P2); category visual consistency (P2); initial movement/object affordance (P2) | Fixed. Rejected an overly high vanity pose and a double-image transition before accepting the final seated frame. An applied-outfit rail scroll regression found in review was also repaired. |
| 2 | Owned-card image alignment; Food room-slot placement; Scene copy/short-screen clipping; Food double-click retargeting; Living preview cushion occlusion (five P2) | Fixed and re-run in the actual browser. Independent final Critic found no remaining P0/P1/major P2 in the reviewed scope. |

Internal comparative quality score: **63 → 82 → 91 / 100**. Final: UX 18/20, plausibility 18/20, consistency 19/20, identity 14/15, interaction 13/15, mobile 9/10. Detailed one-line evidence and limitations are in `work/quality/cycle2-fresh-critic.md`. This is an internal design judgment, not customer research or conversion evidence.

## Actual browser coverage

Local production build: `http://127.0.0.1:3303`. Both **390×844 and 320×568** were inspected. Screenshots live in the task deliverable `outputs/quality-20260922/cycle2/`; the accompanying gallery selects stable captures. Earlier loading/scroll-paint frames were excluded from PASS evidence.

| Canonical concepts | Evidence filename stem, both sizes unless stated |
| --- | --- |
| 1 Room idle; 5 wardrobe closed | `01-05-idle-wardrobe-closed` (320 uses `-top`) |
| 2 walking | `02-walking` plus actual floor tap and Left/S keyboard movement |
| 3 sofa sitting | `03-sofa-seated` |
| 4 vanity sitting | `04-vanity-seated`; four-avatar steady and intermediate renderer comparisons |
| 6 wardrobe open; 7 clothes | `06-07-wardrobe-open-clothes` |
| 8 Fashion; 18 navigation | `08-18-fashion-nav` and all four category captures |
| 9 preview; 10 applied | `09-outfit-preview`, `10-outfit-applied` |
| 11 applied room; 19 return | `11-19-room-return-applied` plus reload and repeat interaction |
| 12 fridge open; 13 Food | `12-fridge-open`, `13-food` and selected/eating/completed captures |
| 14 Living | `14-living`, final `14-living-preview-*-fixed`, cancellation |
| 15 Beauty | `15-beauty` |
| 16 window | `16-window-open`, closed state and DOM open=0 confirmation |
| 17 lamp | `17-lamp-on-390`, `17-lamp-off-320` plus actual toggle and restored state |
| 20 Scene entry | `20-scene-selected`, `20-scene-summary`, 320 choice/reselection |

Actual checks passed: four objects first interact / ready second-click category / return / reuse; rapid taps during approach do not navigate; free floor movement remains continuous; keyboard direction changes; open/close window; lamp toggle; bed lie/stand; outfit preview cancellation, explicit apply, room return and refresh; Beauty cream selection and reload; Food quantity completion/cancellation and reload; Living placement/light preview cancellation, saved/cart persistence; personal reset restores the demo defaults. Reset retains the supplied initial demo cart rather than inventing an empty baseline.

The Food follow-up was found through actual double-clicking: scrolling moved a second physical click onto another product. The fix avoids unnecessary reveal and guards only the brief same-coordinate follow-up when the layout must move. 320 double-click + explicit cancel preserves quantity; 390 double-click completes once, 1→0, removes only the consumed item's room drawing and retains its purchase record.

## Release gates

- Production build and typecheck PASS.
- Full automated suite: **74/74** Node tests, plus movement/input/controller/object-art/eating assertions PASS.
- Live release smoke and API contracts PASS; actual 10 purchases and category/product identity joined correctly.
- Shared catalog unchanged: **6,036 rows**, SHA-256 `d2caaf9ed958d13c724c87aff849cb7427b3f25514128db5082c4564e19a8dbe` matches the original baseline.
- Presentation: 5 editable slides, two narrative/visual critique and revision cycles, final PPTX re-import/render and 5-page PDF render inspected. Main also viewed all five final slides. Native Microsoft PowerPoint was not used; PDF is the rendered preview.
- Public release verification is recorded separately in `docs/logs/nightly_quality_log.md`; local PASS does not imply production PASS.
- Public `719c1cb` subsequently passed actual 390/320 category round trips, confirmed state restoration, temporary preview cancellation, saved/cart, Scene and reset. Independent Critic reviewed 26 public screenshots without new P0/P1/major P2. Details: `work/quality/production-qa.md` and `work/quality/production-visual.md`. The final records-only release must preserve this exact product tree and pass the public release identity/smoke gate again.

Remaining limits: stylized generic product art, a single fictional customer's ownership, existing fictional recommendation examples and Scene-entry selection-only scope remain clearly labeled. Small category scenes and long product-name metadata are intentionally compact. Physical mobile Safari/device testing and customer-outcome validation were not performed.
