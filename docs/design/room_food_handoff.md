# Home pantry eat / drink handoff

Base: c78c957. Branch: feat/room-eat-drink. Worktree: /private/tmp/gscene-food-20260922.

## Final behavior

Main Room → pantry/fridge → click the specific owned product's 먹기 or 마시기 button. No preliminary selection click is required. The character remains at the existing safe approach point and uses a whole-body rear-view action; it does not stretch arms toward arbitrary product artwork. The exact selected product name is visible during the action.

Ready food assets with beverage_* families use drink; other families use eat. Legacy milk/water fixtures fall back to drink. Duration remains 2400ms / reduced motion 650ms. Completion consumes exactly one use of the selected canonical owned product. Repeated taps cannot switch the in-flight product; leaving cancels without consumption. Current outfit, other food quantities, lamp and room state are preserved.

## Artwork

app/assets/avatars/{m01,m02,f01,f02}-meal-back.png: four generated RGBA atlases, two by two poses (eat hold/bite, drink hold/sip). Image generation prompts: app/assets/avatars/meal-back-README.md.

app/meal-frames.js: bounded crops, planted-foot anchors and clothing-only masks. Atlas PNGs are unmodified built-in image_gen output. Existing approved art and older eating sheets remain intact. The same renderer/classifier is used by Food's EatingAvatar so the shared artwork change does not produce a different gesture for the same item.

## Implementation

- app/app.js: preload new atlas, direct owned-food selection/action, selected mode, UI action/status labels.
- app/interactions.js: captures eat/drink in the in-flight action and exposes it to rendering; existing cancellation and commit timing retained.
- app/food-action.js and .d.ts: food classification and Korean action labels.
- app/avatar.js and .d.ts: complete rear-facing atlas frames and existing outfit tint integration.
- src/components/catalog/EatingAvatar.tsx: passes the same product mode to shared renderer.
- app/tests: direct action identity, classification, selected quantity, repeat guard, four identities and both poses; existing cancellation/reload/zero-state coverage kept.

Room layout, movement geometry, Scene interactions and APIs unchanged.

## Review and verification

- Inspected all four avatars × eat/drink × base/hoodie/tee in a browser contact sheet; no opaque image rectangle, hair tinting or detached/stretched arm.
- 390×844 mobile: Jiwoo pantry, direct spaghetti eat 3→2; carrot juice drink 3→2; water stayed 3. Exact names visible and action buttons correctly labeled.
- Review fix: the top room hint was still showing category navigation while eating; it now shows eating/drinking status during the action.
- Tests: avatar-eating, home-food, input, interactions, owned-outfit, avatar-motion pass. TypeScript and production build pass; git diff --check clean.
- Build environment note: initial dependency symlink was rejected by Turbopack. Copied installed dependencies into this isolated worktree and reran the standard production build successfully; no config changes.

## Main session final steps — deployment authorized by user

1. Integrate the supplied commit on the latest main/current running checkout; preserve unrelated changes.
2. Run prepare-assets, applicable tests, typecheck and production build.
3. Verify actual pantry eat/drink on mobile with current product and outfit data.
4. Commit/push as needed and deploy production, as the user explicitly requested.
5. Verify publicly served new atlases, selected-product consumption, navigation and report live URL + deployed SHA. Do not treat local integration alone as deployment completion.
