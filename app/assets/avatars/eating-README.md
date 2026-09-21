# Eating poses — runtime assets

Built-in `image_gen` edit mode, 2026-09-21. Sources are the approved `docs/design/avatar-options/*-states.png`; the latest room-angle lamp and seated-back references were inspected for anatomy and room style. Original reference files are unchanged.

Files: `m01-eating-states.png`, `m02-eating-states.png`, `f01-eating-states.png`, `f02-eating-states.png`. Each unmodified RGBA PNG contains three intact whole-body poses: hold a small cup, sip, lower the cup satisfied. The cup illustrates the existing milk/water/vitamin use; it is not exact merchant packaging.

`app/eating-frames.js` supplies inspected crop, foot anchor, and garment clip metadata. `app/avatar.js` uses uniform whole-image scale to match each approved right-idle height and puts all feet at local y=61. Code does not reposition or distort limbs. Base keeps generated clothing; knit/shirt use the existing confirmed outfit palette in garment-only masks. Left-facing eating mirrors the entire pose. Reduced motion holds the sip state without cycling. Normal progress uses idle at start/end with three discrete states between.

Review/fix: first M01 draft swapped near/far drinking arm at sip. A targeted edit corrected the same-arm anatomy, then its sheet became the pose reference for the remaining identities. Browser contact-sheet inspection of all 4 identities × base/knit/shirt found first-pass garment masks touching hair fringe and F01 cup; masks were constrained, then the same contact sheets were rendered again. Feet, apparent height, face, hair identity, same short bent arm, cup at lips and current clothing were inspected. Actual mobile integration QA is recorded separately by the Main Agent.

## Exact generation prompts

### m01

Use case: identity-preserve.
Asset type: G:Scene runtime eating/drinking sprite sheet, transparent PNG.
Input 1 is the approved character identity and exact pixel-art style reference (M01 NAVY). Keep the SAME tousled black hair, tiny face, relaxed 3-head-tall body, oversized navy long-sleeved shirt, charcoal wide trousers, off-white shoes. Do not redesign.
Generate exactly THREE isolated full-body poses in ONE horizontal row on genuinely transparent alpha background, 1536x1024 canvas. No labels, text, shadows, furniture, frames, checkerboard, glow or background. All three sprites face screen RIGHT in the SAME near-profile angle as IDLE RIGHT from the reference. Head size, leg lengths, stance, shoes, camera and pixel texture IDENTICAL across all three. Feet on a common baseline, equal sprite heights, wide clean gutters.
Left pose HOLD: both feet planted, upper arm close to torso, naturally bent elbow, right hand holds a small plain ivory drinking cup at lower-chest height.
Middle pose SIP: exactly same body and legs and head, right elbow bends naturally to bring that same small cup rim to the lips. Cup rim meets mouth; hand wraps cup OUTSIDE face. Normal short forearm, no arm stretch, no hand inside face, no extra arm. Head barely tips, cup does not cover eyes or nose.
Right pose SATISFIED: lower the same cup back to chest level, tiny relaxed satisfied mouth, otherwise unchanged face and body.
Other hand naturally rests down beside body in all poses. Keep adult-cozy understated expression, original reference palette/outline/shading and crisp low-resolution pixel treatment. Clothes unchanged. These must look like three frames of one identical character, not three redesigns.

### m01Correction

Edit the attached THREE-frame M01 sprite sheet. Change ONLY the arm and cup pose of the MIDDLE sprite. The cup must remain held by the SAME near-side arm as the LEFT and RIGHT sprites. In those outer sprites the NEAR shoulder is on the viewer-left edge of torso, its elbow bends near the viewer-left waist and forearm crosses in front of the chest, holding the cup at right. For the middle SIP pose lift THIS SAME NEAR FOREARM in front of the chest toward the mouth. The near upper arm stays close to torso, elbow down by ribs, short forearm diagonally bends up to mouth. Far hand stays hanging at the viewer-right side hip, just as left/right frames. Remove the currently hanging near arm and incorrect raised far arm entirely; exactly two arms. Cup rim touches lips naturally, fingers outside face. Do not change anything else: character identity, hair, face, body, legs, clothing colors, image dimensions, positions of all sprites, or left and right frames. Preserve true transparency. No glow, no shadows, no background, no text.

### m02

Use case: identity-preserve. Asset: three-frame transparent eating sprite sheet.
Input 1 is the APPROVED pose/layout guide: three same-size full-body right-facing profile sprites in one row, holding a cup / sipping it / lowering it satisfied. Input 2 is the authoritative CHARACTER IDENTITY reference. Make the exact same three-frame layout and natural near-side arm poses as input 1, but use only the character from input 2: M02: chestnut-brown soft parted short hair, muted sage-green oversized sweatshirt, very dark navy wide trousers, off-white shoes. Preserve his tiny eyes and face.
Maintain input 2's original A/Slouch approximately three-head body proportions, crisp pixel outlines, tiny understated facial features, original colors, fabric shading, relaxed homewear personality. All three sprites must be exactly the same character and clothing.
Use the SAME NEAR ARM to hold and lift the small plain ivory cup in all three frames, matching input 1. In middle sip, near elbow bends at ribs, forearm angles up in front of torso, cup rim meets lips, fingers stay outside face. Other arm naturally down. No hand over eyes, no stretched arms, no duplicate arms.
Feet, head size and body scale consistent across the three; both feet planted at identical baseline. 1536x1024 landscape, exactly three fullbody sprites evenly spaced in a single horizontal row. GENUINELY TRANSPARENT alpha backdrop; no black/white/ivory/checkerboard background, no gradients/glow/shadows/furniture, no text or labels. Head and feet fully within frame. Preserve original hair silhouette, face and body identity aggressively.

### f01

Use case: identity-preserve. Asset: three-frame transparent eating sprite sheet.
Input 1 is the APPROVED pose/layout guide: three same-size full-body right-facing profile sprites in one row, holding a cup / sipping it / lowering it satisfied. Input 2 is the authoritative CHARACTER IDENTITY reference. Make the exact same three-frame layout and natural near-side arm poses as input 1, but use only the character from input 2: F01: charcoal chin-length bob with soft blunt bangs, oatmeal oversized sweatshirt, muted blue wide denim trousers, off-white shoes. Preserve her tiny eyes and face. No extra eyelashes or makeup.
Maintain input 2's original A/Slouch approximately three-head body proportions, crisp pixel outlines, tiny understated facial features, original colors, fabric shading, relaxed homewear personality. All three sprites must be exactly the same character and clothing.
Use the SAME NEAR ARM to hold and lift the small plain ivory cup in all three frames, matching input 1. In middle sip, near elbow bends at ribs, forearm angles up in front of torso, cup rim meets lips, fingers stay outside face. Other arm naturally down. No hand over eyes, no stretched arms, no duplicate arms.
Feet, head size and body scale consistent across the three; both feet planted at identical baseline. 1536x1024 landscape, exactly three fullbody sprites evenly spaced in a single horizontal row. GENUINELY TRANSPARENT alpha backdrop; no black/white/ivory/checkerboard background, no gradients/glow/shadows/furniture, no text or labels. Head and feet fully within frame. Preserve original hair silhouette, face and body identity aggressively.

### f02

Use case: identity-preserve. Asset: three-frame transparent eating sprite sheet.
Input 1 is the APPROVED pose/layout guide: three same-size full-body right-facing profile sprites in one row, holding a cup / sipping it / lowering it satisfied. Input 2 is the authoritative CHARACTER IDENTITY reference. Make the exact same three-frame layout and natural near-side arm poses as input 1, but use only the character from input 2: F02: dark chestnut LOOSE LONG hair falling below shoulders, soft curtain fringe, muted slate-blue oversized sweatshirt, olive-charcoal cargo wide trousers, off-white shoes. Absolutely no ponytail and no bob. Preserve her tiny eyes and face. No extra eyelashes or makeup.
Maintain input 2's original A/Slouch approximately three-head body proportions, crisp pixel outlines, tiny understated facial features, original colors, fabric shading, relaxed homewear personality. All three sprites must be exactly the same character and clothing.
Use the SAME NEAR ARM to hold and lift the small plain ivory cup in all three frames, matching input 1. In middle sip, near elbow bends at ribs, forearm angles up in front of torso, cup rim meets lips, fingers stay outside face. Other arm naturally down. No hand over eyes, no stretched arms, no duplicate arms.
Feet, head size and body scale consistent across the three; both feet planted at identical baseline. 1536x1024 landscape, exactly three fullbody sprites evenly spaced in a single horizontal row. GENUINELY TRANSPARENT alpha backdrop; no black/white/ivory/checkerboard background, no gradients/glow/shadows/furniture, no text or labels. Head and feet fully within frame. Preserve original hair silhouette, face and body identity aggressively.
