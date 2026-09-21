# Production functional verification

Verified 2026-09-22 (Asia/Seoul) at `https://makmeaning.vercel.app` following Main Agent's READY confirmation for release `0942add`, deployment `dpl_99DniU37UeQvB1mUdMQbuvrQcsYv`. Release/deployment identity and GitHub CI status are Main Agent supplied; the results below were independently executed against the public URL.

## Read-only commands

```sh
SMOKE_BASE_URL=https://makmeaning.vercel.app node tests/release-smoke.mjs
SMOKE_BASE_URL=https://makmeaning.vercel.app node tests/release-contract.mjs --compare-catalog /Users/gsretail/Documents/my_docs/projects/makmeaning/work/release-catalog-baseline.json
```

Both exited 0 (PASS).

## Observed results

- `/api/demo/home` returns **10 purchases**, confirming the old nine-purchase contract is no longer being served. All 10 match `/api/products/:id` for canonical product ID, name, catalog reference price, and domain. Fictional ownership and illustration boundaries remain explicit.
- Food and Beauty APIs share the same full home, user and purchase contracts. The existing 6 Food / 2 Beauty fictional examples remain separate from owned real products.
- Fashion and Living Scene APIs preserve 8 / 6 fictional recommendations and valid cart references.
- Home and all four category pages pass. The contract suite verifies 39 required artwork/interaction assets; release smoke additionally verifies room modules and Food/Beauty catalog artwork.
- The complete shared catalog remains **6,036 products**. SHA-256 is `d2caaf9ed958d13c724c87aff849cb7427b3f25514128db5082c4564e19a8dbe`, identical to the original pre-change baseline.
- No failed assertions, HTTP failures, or catalog mismatch occurred.

## Limits and ownership

This helper performed GET-only API/page/asset checks. It made no product, Git, browser, deployment or database changes; only this report was written. Mobile interaction, visual plausibility, four room→category→room journeys, preview/persistence and multi-tab reset are Main Agent's separate production browser checks. API success does not establish customer problem resolution or conversion performance.


## Main Agent actual public browser verification

Actual public URL, two separately measured viewports: 390×844 and 320×568. Saved production screenshots live in the task's `outputs/nightly-qa/production/` directory.

- First rapid double taps of wardrobe/fridge/sofa/vanity stayed in room during approach. After the visible engaged state, second taps reached Fashion/Food/Living/Beauty respectively. Room returns and subsequent interactions remained usable.
- Fashion: three shared owned garments visible; preview/cancel retained knit; explicit shirt apply produced canonical `1083830467` in room; reload retained it. Saved product1 and cart2 (including initial cart1) survived category refresh. No purchase/ownership was created by these actions.
- Food: selecting milk preserved3; actual eating showed3 until completion then2; refresh restored2. Next completed action reached1; explicit cancel before completion kept1. Local integration and automated controller tests additionally covered zero/rapid-repeat/hide cases; zero was not separately replayed in this final public pass.
- Beauty: room return → re-seat → cream choice → reload → Beauty displayed cream as 꺼내두었어요. Lamp toggle off survived reload; window opened then closed. Living lamp preview cancel restored confirmed on state in its earlier check.
- Cross-tab reset: an already-mounted Fashion page reset saved to0/cart toseed1, next save became1 without resurrecting old items. Beauty save1/cart1 reset to0/0 in an already-mounted page. Verification used the visible 데모를 초기화했어요 completion status. One unregistered click during concurrent tab activity was not counted as a successful reset; the stable visible scenario was rerun and passed.
- Actual 320px room/Fashion/Food/Living/Beauty screenshots were reviewed for clipping and key controls. Main/Visual Critic used measured dimensions and excluded early misnamed captures. No page horizontal overflow was observed in measured local integrated screens; public room/category renders remained coherent.
- Browser captured warning/error logs were empty in both final public tabs.
- Scene entry (첫 출근 / 5만원 → selection completion → room) was replayed in the integrated local build. Its production modules are identical; no claim of a new full recommendation flow is made.

Public release metadata independently read by Main: deployment READY, alias `makmeaning.vercel.app`, gitCommitSha `0942addb1a7037fd60cacf990718d70cf8569805`, matching pushed main. GitHub CI run `35616613442` succeeded. A subsequent documentation-only commit may record these receipts; it changes no deployed runtime source and must be deployed to retain main/production commit alignment.
