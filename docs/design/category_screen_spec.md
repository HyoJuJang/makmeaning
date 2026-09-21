# Fashion / Living Scene screens

2026-09-21 · Based on doc03_final_ideation.md and main commit 341bc5d.

## Customer problem → interface
- Too many irrelevant promotions → no campaign banners; one compact condition panel and a focused recommendation list.
- Cannot imagine personal use → small pixel room, actual demo purchases, and an explicit pairing reason on each suggested product.
- Difficult to choose → situation × multiple tastes × per-item additional budget; category and sort controls.
- Purchase intent includes new discoveries → owned/cart anchors are optional. “새롭게 둘러보기” works without an owned item.

## Flow
Main room Fashion/Living label → /fashion or /living → compact room + owned/cart rail → choose anchor → select conditions → apply → product reason/detail → demo cart.
Furniture hotspots retain existing avatar interactions. Wardrobe/sofa trays also link to category screens. Native links reload the main room safely when returning; its existing local state remains intact.

## Visual direction
Reuse the main room's cream, warm wood, muted forest green and neutral typography. Pixel art is limited to room imagery. Product images and controls stay clean and readable. Small room preview, horizontal owned items, compact wrapping chips. One column on mobile; editorial two-column workspace on wide screens. No lime, promotion labels or infinite feeds.

## Data and limits
/api/demo/home remains source of purchased items. /api/demo/scenes provides explicit fictional samples and one starter cart item per category. The room image is a decorative scene; only numbered/selected products and the purchase rail imply ownership. Product photos are generated sample illustrations, not verified GS SHOP listings.
Rule-based prototype matching, no AI/model claims. Price and product kind are hard constraints. Selected situation/tastes and anchor compatibility determine ranking and honest matching explanations. Unknown filter combinations show an empty state, never ignore budget silently.
Cart and favorites persist locally; cart is not a purchase. Main demo reset also clears category cart/favorites.
