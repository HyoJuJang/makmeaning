# Fashion / Living review

2026-09-21 · feature branch `feat/fashion-living-scenes` · base `341bc5d`.

## Review → fix → rerun

1. Small choice/reason text had insufficient contrast. Darkened core labels and reasons, slightly increased mobile font sizes. Rebuilt and visually inspected again.
2. Saved list → product details → cart replaced the focused element. Reproduced focus falling to BODY. Added explicit dialog title focus and scroll reset per view. Rebuilt and reran the same saved → detail → cart path; focus now lands on each dialog title.
3. Living room illustration showed a blue cushion although the actual owned demo item is olive. Overlay the existing owned cushion asset and floor lamp; only numbered items imply ownership. Other room items remain decorative context.

## Functional verification

- Production build and TypeScript: PASS.
- Existing movement/input/object interaction and home API tests: PASS.
- New scene API tests: 4 PASS; recommendation tests: 8 PASS.
- Release smoke: homepage, 9 purchase images, old modules, /fashion, /living, both catalog APIs, new room/product artwork: PASS.
- Browser: main Fashion link → detail page; Living navigation and home return.
- Mobile fashion at 390 × 844: compact room, inventory rail, wrapping chips, two-column recommendations, fixed nav. DOM width 390 with no horizontal overflow. Also inspected 694px tablet/single-column and 1280px desktop/two-column Living layout.
- Fashion 30,000 KRW + two tastes: exactly two products, 19,000 and 29,000 KRW. No budget violation.
- Custom budget 100 KRW: visible validation and disabled Apply; 1,000 KRW: truthful empty state, no expensive fallback.
- Product detail → add cart → cart total; save product; reload restores added cart and saved item.
- Cart anchor: choose brown loafers, selected source changes to cart, anchor is excluded from its own recommendations. New discovery clears anchor.
- Living 30,000 KRW: exactly one 19,000 KRW suggestion. Purchase marker changes anchor and explanation.

## Prototype limits

Fictional customer, purchase history, catalog names/prices and generated sample imagery. No merchant checkout, authenticated account, real inventory or learned recommendation model. Local cart/favorites are category scoped. A real product feed can replace the scene API data without replacing the UI.

Local `next dev` encountered the host's file watcher limit (EMFILE), so browser verification and the delivered preview use `npm run build` + `npm start`. This is an environment restriction; the production build and server work.

The initial implementation was committed as 04956ac and pushed to feat/fashion-living-scenes at the user's request. Existing Vercel configuration is preserved; browser verification uses the local production server.


## Room-first pixel revision · 2026-09-21

User review: keep the main room's pixel/game feeling while showing the room and recommendations together; minimize always-visible scene controls.

- Pixel room frame, numbered selection corners, item slots, and subtle reduced-motion-aware character idle animation. Reuses the main avatar renderer and the saved avatar/outfit; does not change main-room state.
- Owned/cart selection updates the highlighted item and recommendation reasons. New discovery still works without an anchor.
- Room above recommendations at all widths. Applied conditions use one compact button; the full controls are in a native dialog. Draft reset/cancel does not change applied filters. Apply closes the sheet and returns focus to the condition button without jumping past the room.

Review → fix → rerun:
1. The character overlapped the room hint. Moved the hint to the top corner and checked both room screenshots again.
2. At 320 × 740, the first recommendation prices were hidden under the bottom menu. Reduced small-screen header/inventory spacing. Rerun: price bottom 667px, nav top 681px; both first-row images, names and prices visible, no horizontal overflow.
3. Removing the focused item from the cart discarded keyboard focus. Return focus to the dialog title after removal. Rerun with Enter: added a sample cushion, opened the cart, removed that cushion; focus is sc-dialog-title, original starter cart item retained.

Verification:
- Production build + TypeScript PASS; complete existing test suite and release smoke PASS.
- 390 × 844 Fashion: room plus first-row images/names/prices visible together; no horizontal overflow.
- 320 × 740 Living: room plus first-row images/names/prices visible together; no horizontal overflow. Filter sheet fits horizontally and scrolls vertically.
- 1280 × 900 Living: centered pixel room above a three-column product grid; no horizontal overflow.
- Fashion: weekend + minimalist/casual tastes + custom 45,000 KRW gives five products, all within budget. Reopening preserves the custom amount and tastes. Draft reset → Escape leaves the applied conditions unchanged.
- Invalid 100 KRW shows an error and disables Apply, even with the extra options folded.
- Room marker selection synchronizes the owned slot, caption, selection corners and recommendation reason. New discovery clears the owned selection.
- Product detail → cart → add/remove and keyboard focus checked in the actual browser. Main saved character is carried into both category rooms.

## Reversible interaction revision · 2026-09-21

Implemented and exercised in the local production build:
- Purchase pin/slot → wardrobe walk → change-clothes pose → return wearing the temporary knit/shirt. Deliberate repeats replay; rapid knit/shirt input ends with the latest shirt selection. Initial load and reset use the main room's saved appearance.
- Recommended fashion item → optional outfit board. Adding denim after charcoal trousers replaces the bottoms slot. Clearing the board removes it. Preview actions do not add cart items.
- Living light on/off and sofa sit/stand reuse the existing character artwork. The seated pose fits the sofa. Product placement supports blue cushion, cream check rug and two table lamps; other product cards retain normal detail/cart actions.
- Placement returns focus/scroll to the room, labels the result as a preview and exposes undo. Rug layers restore the original table/sofa foreground. Changing rug → lamp → cushion replaces the old preview. Cart remains at its original count.

Review → fix → rerun:
1. A seated avatar hid the new blue cushion. Moved the cushion beside the owned cushion and make placement requests stand the avatar up. Rebuilt and reran sit → cushion preview: the cushion is visible and avatar returns to idle. Undo removes the placement.
2. Hovering a selected room control made its dark text hard to read. Kept a light selected-hover background. Removed the purchase pin tooltip that overlapped the next pin in the narrow scene.
3. The outfit reset removes its own focused button. Return keyboard focus to the room after reset. Rebuilt and executed reset with Enter; activeElement is sc-room-preview.

Verification: production build/TypeScript PASS; full test suite PASS including eight new deterministic animation tests (rapid switch, mid-change reset, sit/stand reversal, repeated selection, reduced motion and stale callback cancellation). Release smoke PASS. Browser inspected at 390 × 844 and 1280 × 720; mobile first-row product images/prices remain visible in the initial state. Preview details grow the page only after the user opens them. No browser error/warning logs in final QA.

Preview state is intentionally temporary. Main-room clothing and purchase data are unchanged. Catalog and pixel representations remain explicit demo data; placements illustrate color/mood rather than actual dimensions.
