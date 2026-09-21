# Cycle 1 navigation/hint Builder handoff

Scope: critic-confirmed Q-nav P2 and Q-hint P2. No state/animation/commerce changes.

- Shared native-anchor navigation now orders Fashion / Food / 내 공간 / Living / Beauty on root and all four category pages. The existing four icon drawings are unchanged. The new 26px cutaway-room icon shares stroke, palette and active wash, without an oversized button/pill. Active route is explicit via `aria-current`.
- Full document anchor navigation preserves the vanilla room's existing boot/unload/BFCache behavior. No custom route handlers or secondary state were introduced.
- Nav height is 66px plus bottom safe area. Root/category bottom padding and root interaction tray bottom account for it. Root modal z-index 30 > tray 8 > nav 6. A root modal hides navigation to remove keyboard/touch access while it owns focus.
- The short instruction “바닥을 눌러 걷고, 가구를 눌러 사용해요” sits immediately below scene metadata and above the room. Existing dynamic ready-object/category feedback is unchanged.
- `prepare-assets` rerun after HTML change.

Verification: typecheck PASS; room input tests PASS (movement, collision, held keys, visibility, API boot/restore, actual ready second tap and return); home-food assertions PASS; shared-state tests 10/10 PASS. Real HTTP 3301 responses for `/`, `/fashion`, `/food`, `/living`, `/beauty` each include exactly five native anchors in the specified order and exactly one correct active destination. Root includes the hint before house markup and retains `/prototype/app.js`.

Rendered QA remains required: 390×844 and 320×568 root first fold, active nav/icon readability, all four category→room returns while scrolled, root→category, modal coverage/focus, expanded/collapsed trays above nav, object/character visibility and food/outfit/cart persistence after return. Code/HTTP checks do not imply visual PASS.

Authored only `CategoryNav.tsx`, `category-nav.css`, `app/page.tsx`, `app/index.html`, and navigation/hint-specific CSS in `app/style.css`. No Git commit, DB mutation, avatar, interaction or state modifications.
