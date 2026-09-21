# Visual round 1 — independent rendered-image review

Baseline: production `https://makmeaning.vercel.app`, baseline tag `baseline-nightly-20260921` (`a69db03`).

## Method and evidence boundary

Main operated the actual browser and captured the canonical states. This Visual Critic independently opened the saved PNG files using `view_image`; product implementation code was not inspected. The critic's browser provider did not expose an IAB tab, so this report does not claim independent browser interaction. Screenshots are under `/Users/gsretail/Documents/Codex/2026-09-21/agents-md-docs-ideas-doc03-final/outputs/nightly-qa/round1/`.

## Round 1 verdict

**Confirmed visual defects: High 0, Medium 1 in the reviewed screenshots.** This is a visual verdict only; functional and release checks belong to the separate regression report. No artificial defect quota is used.

Room screenshots show coherent character face/eye placement, feet at the floor, sofa pelvis on the seating surface, and vanity legs/feet aligned beneath the stool. The cupboard clothing and fridge goods have visible support. The window remains inside its existing frame. Lamp on/off keeps the lamp geometry fixed and changes the light. Category scenes show grounded avatars; the mobile navigation icons, labels and active indicators align without overlap. The cabinet/fridge vector rendering is flatter than the illustrated room but is not a High/Medium geometry defect.

## Evidence reviewed so far

| Canonical states | Actual screenshot evidence | Visual finding |
|---|---|---|
| V01 default, V02 idle, V04 wardrobe closed, V07 fridge closed, V20 placed products | `V01-idle-390.png` | No clear anatomy, grounding or clipping defect. |
| V03 walking | `V03-walk-390.png`, `V03-walk-320-recapture.png` | No malformed rendered pose or clipping in the captured frames; continuity cannot be proved by a still. |
| V05 wardrobe open/browsing | `V05-wardrobe-390.png`, `V05-rummage-mid-390.png` | Open wardrobe and product tray are coherent. The latter file captures the stable tray, not a reliable intermediate browsing pose. |
| V06 outfit | `V06-changing-mid-390.png`, `V06-outfit-390.png` | Back-facing changing frame and blue-shirt final state have no clear anatomy defect. |
| V08 fridge open | `V08-fridge-open-390.png` | Interior goods align with the shelf; no obvious impossible final door position. |
| V09 sofa | `V09-sofa-390.png` | Pelvis and legs align with the seat; no floating body. |
| V10 vanity, V11 cosmetic use | `V10-vanity-390.png`, `V10-vanity-320.png`, `V11-beauty-mid-390.png` | Stable seated anatomy is coherent. Cosmetic-to-hand contact at its exact active instant is not established by this near-stable frame. |
| V12 window | `V12-window-open-320.png` | Open sash remains in the original frame, adjacent plant/fridge unaffected. |
| V13 lamp off, V14 lamp on | `V13-lamp-off-320.png`, `V14-lamp-on-320.png` | Geometry remains stationary, light changes visibly. `*-reach-mid-320.png` actually shows stable completion and is not intermediate-pose evidence. |
| V15 Fashion | `V15-fashion-320.png`, `V15-fashion-390.png` | Character face, clothing display, labels and navigation have no clear defect. |
| V16 Food | `V16-food-320.png`, `V16-food-390.png` | Character grounded, cards and typography aligned. Partial next card at right is a horizontal-list continuation, not accidental clipping. |
| V17 Living, V18 Beauty, V19 navigation | `V17-living-320.png`, `V18-beauty-320.png` and the category files above | Sofa/product perspective and character placement coherent; four nav labels/icons and active state fit. |

## Evidence quality corrections and pending coverage

- `V03-walk-320.png` is a malformed/scaled capture (262 px wide with content compressed and empty area). **Excluded** from viewport judgment; `V03-walk-320-recapture.png` replaces it.
- File names containing `mid` do not themselves prove a mid-animation frame. Main is producing controlled renderer frames as supplemental evidence, explicitly separate from live production interaction.
- This is not yet a full 20 × 2 screenshot matrix. Room states have mixed 390/320 coverage as listed; subsequent screenshots will be added to this report. Do not claim every state at both dimensions from this interim matrix.


## VIS-01 — Medium: lamp reach carries a stray dark rectangular fragment

**State:** V13/V14 lamp reach, F01 base outfit, intermediate progress 0.25/0.50/0.75. The all-avatar sheet shows the same family of artifact.

**Reproducer:** select F01, approach/tap the lamp, inspect the brief reaching motion. For deterministic visual evidence, the actual-renderer harness freezes the existing interaction controller at these progress values.

**Evidence:** `H-lamp-all-mid.png`, `H-lamp-f01-series.png`. In the isolated sprite and the room-context crop, a dark blue rectangular piece protrudes past/below the reaching hand. On cream-shirt F01 its different color makes it particularly clear. It reads as a phone/block attached to the forearm, not a natural sleeve or hand. The stable idle endpoints do not have this protrusion.

**Why it matters:** reaching toward a lamp should be a simple believable arm gesture; the temporary rectangular appendage exposes compositing/cropping during an otherwise coherent motion.

**Expected:** the sleeve should connect to the hand, with no unrelated dark piece outside the hand silhouette.

**Suggested fix:** narrowly adjust the reaching-arm source crop or mask to remove the unwanted dark rectangular fragment. Preserve the palm, sleeve, reach distance, stable poses and existing interaction timing. Re-render all four avatars at the same progress values; no interaction redesign is needed.

## Supplemental frozen-renderer review (completed)

Actual browser-rendered synthetic/controller-frozen frames were independently inspected. These are **renderer evidence**, not proof of production click timing or input behavior.

- `H-face-all.png`: all four front faces; no obvious eye alignment/anatomy defect.
- `H-lamp-all-mid.png`, `H-lamp-f01-series.png`: confirmed VIS-01; lamp geometry itself stays fixed.
- `H-sofa-seated-all-mid.png`, `H-sofa-sit-f01-series.png`: seated pelvis and knees match the sofa. Transition crossfade produces overlapping semi-transparent silhouettes in frozen frames, but no persistent malformed endpoint. No additional Medium/High issue selected.
- `H-vanity-seated-all-mid.png`, `H-vanity-sit-f01-series.png`: all four backs face the vanity, feet sit beneath the stool. The isolated sprite gap below the torso is occluded by the actual chair in room context and is not counted as a defect.
- `H-vanity-cosmetic-all-mid.png`, `H-vanity-cosmetic-f01-series.png`: holding the product beside the torso is consistent with the current “꺼내두기” interaction; no claim of facial application is required. Earlier concern about hand-to-face distance is withdrawn on this interaction context.
- `H-window-open-all-mid.png`, `H-fridge-open-all-mid.png`, `H-wardrobe-open-all-mid.png`: the half-open sash/doors and reaching arms show no clear impossible hinge, adjacent-object incursion or severe limb clipping.

Round 1 concludes with **one narrow Medium fix request and no observed High visual defect**. The mixed-viewport/full-matrix limitation above remains explicit. Product source code was not used to manufacture this verdict.

## Same-state fix verification — VIS-01 resolved

This is the requested fix/review portion of Round 1, not a new broad visual round. Independently opened all seven actual PNGs in `outputs/nightly-qa/integrated/`.

**VIS-01: PASS.** `H-lamp-all-mid-fixed.png` shows all four avatars at 50% without the dark rectangular appendage. `H-lamp-f01-series-fixed.png` shows F01 at 0/.25/.50/.75/1: the cream sleeve now terminates at the visible skin-colored hand, with no navy block at the wrist. Arm pose, stable endpoints, reach toward the lamp and lamp grounding remain coherent when compared to the original Round 1 frames.

Integrated visual regression:

- `wardrobe-open-390.png`: three garments hang beneath the rail; no label/door collision or obvious floating garment.
- `fashion-apply-390.png`: explicit preview/apply controls, product cards and selected blue-shirt avatar are readable and aligned.
- `room-applied-shirt-390.png`: same character appears in the blue shirt back at the wardrobe; room composition and actor grounding preserved.
- `main-eating-mid-390.png`: actor and held item have a readable eating/holding pose without detached limbs, door clipping or tray overflow.
- `food-eating-mid-320.png`: category eating state has coherent room/avatar/card/nav layout. **Evidence caveat: despite its filename, this PNG is actually 390×844 (verified using image metadata), so it is not counted as 320-pixel viewport proof.** A single still does not establish animation continuity or consumption commit timing.

**Visual stop decision:** observed High 0, remaining confirmed Medium 0. The one selected Medium has been corrected and verified in the same states; early termination is appropriate under the visual-polish contract. No further cosmetic iteration is requested. This verdict retains the explicit viewport/evidence limits and does not replace Main's functional/production gates.

## Verified 320×568 regression supplement

Opened and independently inspected `integrated/room-320-verified.png`, `sofa-320-verified.png`, `living-320-verified.png`, and `food-eating-320-verified.png`; image metadata confirms **all four are exactly 320×568**. Main additionally reports simultaneous `innerWidth=320`, `innerHeight=568`, `scrollWidth=320` for the Food capture.

- Room idle: actor face/body and visible room/category labels fit the width; natural vertical scrolling remains expected.
- Sofa: seated avatar stays on the sofa, legs/body coherent; bottom action tray and all controls fit.
- Living: product cards, header and four navigation items align without accidental clipping.
- Food eating: actor, eating controls, cancellation link and bottom navigation fit. The partially visible third product belongs to the horizontal card list; the viewport itself has no horizontal overflow per Main's DOM check.

**Regression visual PASS; no new High/Medium issue.** The previous falsely named `food-eating-mid-320.png` is superseded for the Food small-viewport claim by `food-eating-320-verified.png`. Other files named `vanity-320.png` or `beauty-320-verified.png` that are actually 390 px wide must not be counted as 320 evidence. This supplement establishes these four states only; it does not imply the full 20-state matrix at both viewport sizes. No new polish round is opened.

### Final remaining small-viewport regression

Independently viewed `integrated/vanity-320-corrected.png`, `beauty-320-corrected.png`, and `fashion-preview-320-verified.png`. Metadata verifies all three are **320×568**; Main also confirms DOM width/height 320×568 and scrollWidth 320.

- Vanity: seated back, hips and feet remain aligned with the stool. The complete bottom tray and close control fit.
- Beauty: avatar face/body, vanity products, header and active Beauty navigation remain readable and aligned. The next card is intentionally partially visible in its horizontal list.
- Fashion preview: wardrobe garments, preview strip, explicit apply/cancel controls and bottom navigation fit. The avatar is captured during approach, so this still is not evidence of the completed blue-shirt preview. Main separately verified cancellation preserves `data-outfit=knit`; that is Main's functional observation, not a visual claim from the screenshot.

**Final visual regression PASS. Remaining confirmed High 0 / Medium 0.** Corrected images now provide valid small-viewport evidence for these states. Source code remained unopened for this visual review. The original single build→review→fix loop and same-state regression are complete; no further product or cosmetic change is requested.
