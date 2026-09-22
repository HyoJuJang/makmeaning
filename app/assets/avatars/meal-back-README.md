# Rear-view eat / drink — approved implementation

Built-in image_gen generated four new RGBA atlases on 2026-09-22. Files: app/assets/avatars/{m01,m02,f01,f02}-meal-back.png. Original approved identity sheets and previous eating sheets are preserved.

Each 1536×1024 atlas has four whole-body poses: top-left eat hold, top-right bite, bottom-left drink hold, bottom-right sip. The camera stays behind the character. Hands remain naturally bent in front; food packaging is deliberately not reproduced. Renderers uniformly scale and anchor the complete pose at the existing feet. app/meal-frames.js contains read-only crop and reviewed garment masks, derived without rewriting the raster PNGs. Existing confirmed outfits still tint only clothes; long hair, skin and trousers remain unchanged.

Product classification uses ready food gameAsset.familyId starting with beverage_; legacy milk/water keys provide a fallback. All other foods use eat. The home action captures the exact owned product ID and mode before starting. Completion alone consumes one use; interrupted or repeated taps cannot consume another item. Food category uses the same classifier and sprite renderer.

## Exact generation prompts

### M01
Use case: identity-preserve. Asset: production G:Scene avatar sprite atlas. Reference is the authoritative M01 character, not layout.
Make exactly FOUR intact fullbody pixel-art sprites of this SAME M01 character in a 2-column by 2-row grid, on genuinely TRANSPARENT alpha background, canvas 1536x1024. Crisp pixel art, same tousled black hair, navy oversized sweatshirt, charcoal wide trousers, ivory shoes, relaxed approximately 3-head adult-like cute proportions. No text labels, borders, furniture, scenery, ground shadows, checkerboard or gradients.
All four sprites face AWAY from camera in a strict REAR view, tiny 10-degree turn toward screen RIGHT allowed only so a rim of cup/bowl is visible at right side. No eyes or frontal face. Same body scale, leg lengths, hair, clothing and feet planted; comfortable normal short arms bent in FRONT of torso, never outstretched. Equal gutters; whole head and soles in each cell; sprite centers x=384 and1152; feet baseline y=470(top row) and982(bottom row); body height about410px.
TOP LEFT: EAT prepare, both elbows close to ribs, left hand supports a tiny plain ivory bowl in front at chest height, mostly hidden by body, right hand holds short spoon above bowl.
TOP RIGHT: EAT bite, same pose and bowl height, right elbow bends to bring spoon to hidden mouth; only small elbow shape visible alongside torso. Do not extend arm beyond a natural short bent arm. No floating spoon, no food packaging.
BOTTOM LEFT: DRINK prepare, left arm relaxed down, right elbow bends to hold a small plain ivory handleless cup at chest height in front, cup edge peeking just right of torso.
BOTTOM RIGHT: DRINK sip, SAME RIGHT arm bends to lift cup to hidden mouth, cup rim touching hidden lips, tiny natural head tilt, left arm still down. No long arm or duplicate limbs. This must read as rear-view eating versus drinking, with the small bowl retained ONLY in top row.
Keep original approved character identity, exact cozy subdued pixel style and fully connected anatomy. These are direct runtime sprite frames, not concept presentation. True transparent background.

### M02
Use case: identity-preserve. Production G:Scene runtime sprite atlas. Image 1 is ONLY a 4-pose layout and anatomy reference. Image 2 is authoritative character identity and pixel-art style: M02: short soft chestnut parted hair, sage green oversized sweatshirt, navy-charcoal wide trousers, ivory shoes. Replace all four characters in image 1 with EXACTLY this identity from image 2. Preserve approved original hairstyle, proportions, garment palette and dark crisp pixel outline.
Canvas 1536x1024, 2 columns x2 rows, four isolated WHOLE BODY sprites on genuinely TRANSPARENT alpha background. NO text, borders, ground shadows, glow, backdrop, gradients or checkerboard. All four face AWAY from viewer in almost strict rear view, 10 degree turn to right maximum, no eyes visible. Same head/body size across all frames, feet on common baseline within each row, wide clean gutters, keep all head and feet.
Top left: EAT prepare with small ivory bowl held in left hand in front of chest, mostly occluded by back. Right hand holds short spoon just above bowl. Elbows stay at ribs.
Top right: EAT bite with SAME right hand raising spoon to hidden mouth, SAME left hand retaining bowl. Short normal bent arms, connected shoulders.
Bottom left: DRINK prepare, SAME right hand holding small plain handleless ivory cup at chest in front, left arm naturally down.
Bottom right: DRINK sip, right elbow bends to raise same cup to hidden lips; other arm down; slight head tip.
All gestures understated, natural human proportions matching original A/slouch identity. Food is mostly hidden in front; no huge props, no stretched arms, no floating hands. Copy pose consistency from image1, use ONLY identity from image2. Preserve TRUE transparency and zero halo; deliver directly usable clean sprite atlas.

### F01
Use case: identity-preserve. Production G:Scene runtime sprite atlas. Image 1 is ONLY a 4-pose layout and anatomy reference. Image 2 is authoritative character identity and pixel-art style: F01: charcoal chin-length bob, oatmeal oversized sweatshirt, muted blue wide jeans, ivory shoes. Replace all four characters in image 1 with EXACTLY this identity from image 2. Preserve approved original hairstyle, proportions, garment palette and dark crisp pixel outline.
Canvas 1536x1024, 2 columns x2 rows, four isolated WHOLE BODY sprites on genuinely TRANSPARENT alpha background. NO text, borders, ground shadows, glow, backdrop, gradients or checkerboard. All four face AWAY from viewer in almost strict rear view, 10 degree turn to right maximum, no eyes visible. Same head/body size across all frames, feet on common baseline within each row, wide clean gutters, keep all head and feet.
Top left: EAT prepare with small ivory bowl held in left hand in front of chest, mostly occluded by back. Right hand holds short spoon just above bowl. Elbows stay at ribs.
Top right: EAT bite with SAME right hand raising spoon to hidden mouth, SAME left hand retaining bowl. Short normal bent arms, connected shoulders.
Bottom left: DRINK prepare, SAME right hand holding small plain handleless ivory cup at chest in front, left arm naturally down.
Bottom right: DRINK sip, right elbow bends to raise same cup to hidden lips; other arm down; slight head tip.
All gestures understated, natural human proportions matching original A/slouch identity. Food is mostly hidden in front; no huge props, no stretched arms, no floating hands. Copy pose consistency from image1, use ONLY identity from image2. Preserve TRUE transparency and zero halo; deliver directly usable clean sprite atlas.

### F02
Use case: identity-preserve. Production G:Scene runtime sprite atlas. Image 1 is ONLY a 4-pose layout and anatomy reference. Image 2 is authoritative character identity and pixel-art style: F02: LOOSE LONG chestnut hair down past shoulders to mid-back, never tied, slate blue oversized sweatshirt, charcoal olive cargo pants, ivory shoes. Replace all four characters in image 1 with EXACTLY this identity from image 2. Preserve approved original hairstyle, proportions, garment palette and dark crisp pixel outline.
Canvas 1536x1024, 2 columns x2 rows, four isolated WHOLE BODY sprites on genuinely TRANSPARENT alpha background. NO text, borders, ground shadows, glow, backdrop, gradients or checkerboard. All four face AWAY from viewer in almost strict rear view, 10 degree turn to right maximum, no eyes visible. Same head/body size across all frames, feet on common baseline within each row, wide clean gutters, keep all head and feet.
Top left: EAT prepare with small ivory bowl held in left hand in front of chest, mostly occluded by back. Right hand holds short spoon just above bowl. Elbows stay at ribs.
Top right: EAT bite with SAME right hand raising spoon to hidden mouth, SAME left hand retaining bowl. Short normal bent arms, connected shoulders.
Bottom left: DRINK prepare, SAME right hand holding small plain handleless ivory cup at chest in front, left arm naturally down.
Bottom right: DRINK sip, right elbow bends to raise same cup to hidden lips; other arm down; slight head tip.
All gestures understated, natural human proportions matching original A/slouch identity. Food is mostly hidden in front; no huge props, no stretched arms, no floating hands. Copy pose consistency from image1, use ONLY identity from image2. Preserve TRUE transparency and zero halo; deliver directly usable clean sprite atlas.
