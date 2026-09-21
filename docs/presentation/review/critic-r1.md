# Independent deck critique — Draft R1c

Reviewed all five actual rendered PNGs in `work/deck/draft-r1c/`, then checked `docs/presentation/narrative.md` and the overnight presentation contract. No PPT source-code inference substitutes for these rendered slides.

## Verdict

The five-slide product-first narrative is understandable within 30 seconds. Customer problem →生活-context question → G:Scene room → flow → product meaning is coherent. G:Scene remains the protagonist and Agent content is confined to the conclusion. No fabricated metric or verified-customer-outcome claim appears. Font hierarchy, spacing and restrained forest/paper palette are consistent; no visible text clipping or overflow.

**Revision requested: 3 concrete improvements.** None requires another slide or new product scope.

## DECK-01 — Medium: Slide 4 promises a loop but shows only the starting room and a listing

Evidence: `slide-4.png`. Left room has a closed wardrobe and small idle avatar; the middle screenshot is a Fashion listing. The page says “옷장을 누르면 다가가서 열고” and “적용한 착장은 내 공간에 남는다”, but neither the open-wardrobe moment nor returned/applied room is visibly evidenced. This is the central implementation proof slide, so generic screenshots weaken it.

Expected revision: replace with the already-planned current screenshots, choosing **wardrobe interaction → Fashion explicit apply/preview → same room with changed outfit**. A compact 3-frame sequence with one short verb under each can replace the two large text blocks. Do not imply exact product fitting. If only two images fit, show the changed room and Fashion application state and use a small arrow to establish return. Preserve the existing ownership/example limitation as a small footnote.

## DECK-02 — Medium: Slide 2's enlarged screenshot is visibly soft and its toolbar becomes visual noise

Evidence: `slide-2.png`. The room screenshot is approximately 560 px wide but the MY LIVING ROOM/menu text is visibly enlarged and blurry. It sits alone in a generous empty area, making softness conspicuous instead of feeling like a deliberate product detail.

Expected revision: use the latest actual rendered Living crop at native/higher capture density. Prefer a deliberate crop of the **owned cushion/lamp and inhabited room**, with less tiny toolbar text; do not resynthesize or AI-upscale evidence. Alternatively reduce its display size while keeping a clear room/caption relationship. The right visual should make “이미 가진 물건” visible rather than presenting an indistinct miniature application header.

## DECK-03 — Medium: GS SHOP context is too implicit in the first two slides

Evidence: `slide-1.png` and `slide-2.png`. The opening has G:Scene branding and a broad ecommerce problem. A viewer unfamiliar with the project sees no GS SHOP name and may read this as an unrelated avatar-shopping idea until late. The closing “기존 상품과 공급 역량” is also generic.

Expected revision: add GS SHOP naturally into the existing Slide 1 supporting sentence or Slide 2 explanatory copy, e.g. “GS SHOP의 상품을 내 생활과 연결하기 어려운…” while keeping the explicit **problem hypothesis** qualifier. No extra logo cluster or architecture diagram needed. Keep G:Scene as the largest remembered brand on Slide 5.

## Gates and limits

| Gate | Result |
|---|---|
| Problem readable within 30 seconds | PASS; GS SHOP specificity improvement requested |
| One principal message per slide | PASS |
| Product before Agent story | PASS |
| Actual prototype visible | PASS |
| Implemented loop visually evidenced | REVISION: Slide 4 |
| No invented impact metrics | PASS |
| At most 5 slides | PASS |
| Readability/alignment/overflow | PASS |
| Final remembered product is G:Scene | PASS |

The closing Agent sentence is factually restrained. A small verified “구현 → 실제 화면 QA → 수정 → 재검증” line may sharpen it, but is optional and should not compete with the product conclusion. Release/build/test outcomes must not be claimed before Main's final production gate.
