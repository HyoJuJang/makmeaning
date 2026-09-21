# Confirmed integration regression — cross-tab reset

Production a69db03, actual IAB 390×844, 2026-09-21 night.

1. Open Fashion, save White Basic Tee. Header shows saved 1.
2. Open a separate room tab at the same production origin. Use explicit demo reset.
3. Return to still-mounted Fashion. Header incorrectly still shows saved 1.
4. Save Grey Canvas Sneakers. Header becomes saved 2: pre-reset tee has been resurrected by the next write.

Cause: category storage/pageshow listeners restore confirmed room state only, leaving collection state stale. Same lifecycle exists in Food/Beauty. Browser Back remounted in this browser, so BFCache reproduction is not claimed. Cross-tab storage-event reproduction is confirmed.

Expected after fix: existing category shows reset saved 0 and seeded/default cart; next save adds only that product. A second open category tab stays consistent without write loops. Confirmed state and temporary preview isolation remain intact.

## Fixed same-scenario rerun

Integrated production build 3201: Fashion save1 → other room tab reset → existingFashion saved0; next save becomes1, reload1. Beauty save1/cart1 → other room reset → existingBeauty saved0/cart0. PASS. This includes actual storage events and does not claim browser BFCache availability.
