# Fashion / Living Scene screens

2026-09-21 · Based on doc03_final_ideation.md and main commit 341bc5d.

## Customer problem → interface
- Too many irrelevant promotions → no campaign banners; one compact condition panel and a focused recommendation list.
- Cannot imagine personal use → small pixel room, actual demo purchases, and an explicit pairing reason on each suggested product.
- Difficult to choose → situation × multiple tastes × per-item additional budget; category and sort controls.
- Purchase intent includes new discoveries → owned/cart anchors are optional. “새롭게 둘러보기” works without an owned item.

## Flow
Main room Fashion/Living label → /fashion or /living → compact room + owned/cart rail → choose anchor → open the single-line condition summary → select conditions in a dialog → apply → product reason/detail → demo cart.
Furniture hotspots retain existing avatar interactions. Wardrobe/sofa trays also link to category screens. Native links reload the main room safely when returning; its existing local state remains intact.

## Visual direction
Reuse the main room's cream, warm wood, muted forest green and neutral typography. Pixel room framing, numbered selection corners and beveled item slots extend the main room's visual language. The existing main avatar renderer and saved appearance are reused. Product images stay clear and readable. Room and recommendations stack vertically at every width; two product columns on mobile and three on desktop. The applied conditions occupy one row. Full situation/taste/budget/kind choices live in a native dialog; drafts apply only through the CTA. Cancelling or resetting a draft does not change the active recommendations. No lime, promotion labels or infinite feeds.

## Data and limits
/api/demo/home remains source of purchased items. /api/demo/scenes provides explicit fictional samples and one starter cart item per category. The room image is a decorative scene; only numbered/selected products and the purchase rail imply ownership. Product photos are generated sample illustrations, not verified GS SHOP listings.
Rule-based prototype matching, no AI/model claims. Price and product kind are hard constraints. Selected situation/tastes and anchor compatibility determine ranking and honest matching explanations. Unknown filter combinations show an empty state, never ignore budget silently.
Cart and favorites persist locally; cart is not a purchase. Main demo reset also clears category cart/favorites.


## Reversible room interactions

Fashion: deliberately selecting a purchased knit/shirt walks the existing avatar to the garment, plays the existing change-clothes pose, and returns wearing a temporary preview. A reset restores the main room's saved outfit. Initial page load preserves that outfit. Recommended products go into an optional outfit board, one item per kind; the board appears only after a preview action.

Living: local light and sofa controls warm the room or move the avatar into the existing sofa pose. Supported recommended decor items can be previewed one at a time using hand-authored pixel illustrations in the room. Preview labels and undo distinguish them from purchased items. These are color/mood illustrations, not measurements or virtual fit guarantees. Unsupported product types keep their normal product detail/cart flow until an appropriate placement illustration is supplied.

All preview state is page-local. It never writes purchases, the main appearance, or the cart. Product previews return focus and scroll to the room; cart actions remain explicit. Latest interactions cancel previous animation callbacks. Reduced motion skips character travel and suppresses placement/slot animation.


## Default discovery

First entry has no situation, taste, price cap, product-kind restriction, or automatically selected purchase/cart anchor. The complete category is shown immediately. Inventory tabs only switch the visible item rail; a product becomes the pairing anchor only after an explicit item click. The condition summary shows only active choices, with “조건 없이 추천받는 중” and “조건 추가” when empty. Situation has an explicit “전체” choice and budget starts at “제한 없음”. Filter reset restores the unrestricted defaults; cancelling a draft still preserves applied filters. A separately chosen pairing anchor remains until the user chooses new discovery or changes inventory source.
