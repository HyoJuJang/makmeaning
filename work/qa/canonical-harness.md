# Canonical renderer harness (developer only)

Launch from nightly repository root:

```sh
node work/qa/canonical-server.mjs
# Optional: QA_PORT=3203 node work/qa/canonical-server.mjs
```

Current server: `http://127.0.0.1:3202/`. Binds localhost only. No Next route, runtime/public file, product feature, storage write, API call to the live DB, or duplicated art implementation is added.

## Repeatable screenshot URLs

- All four, lamp reach at exactly 50%: `http://127.0.0.1:3202/?state=lamp-reach&avatar=all&outfit=base&p=0.5`
- Lamp full motion contact sheet, one avatar: `http://127.0.0.1:3202/?state=lamp-reach&avatar=m01&outfit=knit&series=1`
- Food eating midpoint: `http://127.0.0.1:3202/?state=food-eat&avatar=all&p=.5`
- Pantry eating contact sheet: `http://127.0.0.1:3202/?state=pantry-eat&avatar=f01&series=1`
- Faces: `http://127.0.0.1:3202/?state=face&avatar=all&direction=down`
- Sofa settled: `http://127.0.0.1:3202/?state=sofa-seated&avatar=all`
- Vanity strict rear seated: `http://127.0.0.1:3202/?state=vanity-seated&avatar=all`
- Vanity cosmetic mid-frame: `http://127.0.0.1:3202/?state=vanity-cosmetic&avatar=all&p=0.5`
- Hinges: choose `wardrobe-open`, `wardrobe-close`, `fridge-open`, `fridge-close`, `window-open`, `window-close`, then `series=1` (0/.25/.5/.75/1).

Controls also include walk frames, sit/stand transitions, wardrobe rummaging, fridge/pantry eating, and existing bed poses. Main no longer exposes wardrobe outfit-change, so that obsolete preset is removed. The outfit control selects a synthetic confirmed state using actual owned product IDs (three garments; two deliberately share knit artwork); it does not apply clothing in the app. `p` is continuous normalized progress; `series=1` renders five fixed progress samples. Use 1280px+ browser width for four-avatar comparison or normal mobile widths for one card per row. Wait for the visible `READY` status / `html[data-qa-ready="true"]` before capturing. `data-state`, card `data-avatar`, and `data-progress` identify evidence. Inspect the rendered pixels; the harness does not assign visual PASS.

## Authentic sources / controlled construction

`canonical-state.mjs` directly imports the real `InteractionController`, `OBJECTS`, `APPROACHES`, and START. It dispatches REQUEST/ARRIVED and advances exact controller step duration to a requested progress; it never overwrites controller internals. No navigation, real walking, persisted commerce commit, or localStorage is executed. Eating dispatches real SELECT_FOOD/EAT events with canonical product IDs; its completion uses the actual pure consumeOwnedFood function on a synthetic in-memory state.

`canonical.js` directly imports real `avatarSVG`, `AVATARS`, and `objectArt`. Same approved raster assets and exact controller renderOffset/40×64 actor dimensions are used. SVG IDs are namespaced only to prevent cross-card clip/filter collisions. The server returns the existing deterministic demoHome fixture for room object data (10 purchases after the feature merge). Wardrobe selection and food quantities use the real shared-state selectors; source artwork is selected only at the rendering boundary.

**Every screenshot is SYNTHETIC/FROZEN renderer evidence, not an actual UI interaction screenshot.** Context crops combine original room bitmap, real objectArt, and avatar renderer at real approach+offset coordinates. Private app.js product overlays, glow, labels, CSS breathing, input hit areas, and final z-index are not reproduced. Confirm any defect/fix again in the real app; do not use these to claim navigation, arrival, state persistence, or mobile UI PASS. At progress=1 the actual controller advances to its next state naturally.

## Validation performed without browser

- 460 combinations: 23 state presets × 5 progress samples × 4 avatars construct with real controller/avatar/object renderers without errors.
- Eating midpoint retains quantity 3; completion consumes exactly once to quantity 2 using its real canonical ID.
- Lamp midpoint is reach/progress=.5; settled vanity seatProgress=1.
- JS syntax checks PASS.
- 18 server/module/fixture/eating-asset URLs return 200; `.env.local`, `.git/config`, app.js, and package.json are not served.
- Current fixture has 10 purchases and Fashion IDs 1106041553, 1083830467, 1065577366.
- No browser or visual judgement performed by harness builder. Main captures; independent Visual Critic judges screenshots.
