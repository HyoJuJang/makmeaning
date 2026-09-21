# A / Slouch — runtime sprite sheets

남자 M01/M02, 여자 F01/F02. 사용자 원본 docs/design/avatar-options의 외형/포즈를 기준으로 내장 image_gen에서 배경과 타이틀만 제거했다. PNG의 alpha를 보존하며 원본 sheet를 덮어쓰지 않는다. app/avatar-frames.js가 프레임 경계와 발 anchor를 지정한다. app/avatar.js가 동일 artwork로 움직임·착석·착장을 렌더링한다.

## M01-navy

Use case: background-extraction. Edit the provided M01-navy character state sheet for use as a web-app sprite atlas. Preserve the exact same character identity, face, hairstyle, pixel artwork, colors, clothing, proportions and all nine existing poses. Do not redesign. Remove ALL ivory background and ALL titles/labels, producing a genuinely TRANSPARENT RGBA canvas, not white and not a drawn checkerboard. Keep the original 1536x1024 canvas and all character positions and scales exactly unchanged so existing cells can be extracted. Exactly 3 columns × 3 rows. Row1 front/back/left; row2 right/walkA/walkB; row3 sitting/wardrobe/vanity. No shadows, no furniture, no text. Preserve off-white shoes and skin as opaque. The F02 character has LONG LOOSE dark chestnut hair below the shoulders, not a ponytail. Only extract existing sprites and remove background and typography.

## M02-sage

Use case: background-extraction. Edit the provided M02-sage character state sheet for use as a web-app sprite atlas. Preserve the exact same character identity, face, hairstyle, pixel artwork, colors, clothing, proportions and all nine existing poses. Do not redesign. Remove ALL ivory background and ALL titles/labels, producing a genuinely TRANSPARENT RGBA canvas, not white and not a drawn checkerboard. Keep the original 1536x1024 canvas and all character positions and scales exactly unchanged so existing cells can be extracted. Exactly 3 columns × 3 rows. Row1 front/back/left; row2 right/walkA/walkB; row3 sitting/wardrobe/vanity. No shadows, no furniture, no text. Preserve off-white shoes and skin as opaque. The F02 character has LONG LOOSE dark chestnut hair below the shoulders, not a ponytail. Only extract existing sprites and remove background and typography.

## F01-oat

Use case: background-extraction. Edit the provided F01-oat character state sheet for use as a web-app sprite atlas. Preserve the exact same character identity, face, hairstyle, pixel artwork, colors, clothing, proportions and all nine existing poses. Do not redesign. Remove ALL ivory background and ALL titles/labels, producing a genuinely TRANSPARENT RGBA canvas, not white and not a drawn checkerboard. Keep the original 1536x1024 canvas and all character positions and scales exactly unchanged so existing cells can be extracted. Exactly 3 columns × 3 rows. Row1 front/back/left; row2 right/walkA/walkB; row3 sitting/wardrobe/vanity. No shadows, no furniture, no text. Preserve off-white shoes and skin as opaque. The F02 character has LONG LOOSE dark chestnut hair below the shoulders, not a ponytail. Only extract existing sprites and remove background and typography.

## F02-slate

Use case: background-extraction. Edit the provided F02-slate character state sheet for use as a web-app sprite atlas. Preserve the exact same character identity, face, hairstyle, pixel artwork, colors, clothing, proportions and all nine existing poses. Do not redesign. Remove ALL ivory background and ALL titles/labels, producing a genuinely TRANSPARENT RGBA canvas, not white and not a drawn checkerboard. Keep the original 1536x1024 canvas and all character positions and scales exactly unchanged so existing cells can be extracted. Exactly 3 columns × 3 rows. Row1 front/back/left; row2 right/walkA/walkB; row3 sitting/wardrobe/vanity. No shadows, no furniture, no text. Preserve off-white shoes and skin as opaque. The F02 character has LONG LOOSE dark chestnut hair below the shoulders, not a ponytail. Only extract existing sprites and remove background and typography.


## Vanity seated back

`*-vanity-seated-back.png` 네 파일은 사용자 제공 `docs/design/avatar-options/vanity-seated-back/` 원본과 byte-identical하다. 원본은 ivory 배경과 참고용 스툴을 포함하므로 직접 img로 표시하지 않는다. `app/vanity-frames.js`의 body/legs/shirt SVG clip metadata로 캐릭터만 표시하며 기존 방의 의자를 재사용한다. 의류 tint와 V08 동작은 `avatar.js`가 담당한다. 원본 수정 없이 새 reference를 유지한다.
