# Cycle 2 functional / data audit

- 대상: `/private/tmp/gscene-quality-20260922`, base commit `1bbbc0d`와 현재 통합 diff.
- 실행 대상: Main이 production build 후 실행한 `http://127.0.0.1:3303`.
- 검증 시점: 2026-09-22. 이 보고서는 CLI/HTTP와 source contract 감사 결과다. 모바일 rendered 화면, 픽셀 자연스러움, 실제 touch 조작은 Main/독립 Critic의 별도 검증이며 여기서 PASS로 대신하지 않는다.

## 실제 실행 결과

| 검사 | 결과 | 확인 범위 |
| --- | --- | --- |
| `npm test` | PASS | Node test runner 72개, fail/skip 0. 추가 assertion 기반 movement/input/interaction/object art/home-food 회귀도 모두 exit 0. 로그: `work/quality/cycle2-npm-test.log` |
| `npm run typecheck` | PASS | `tsc --noEmit`, exit 0 |
| `SMOKE_BASE_URL=http://127.0.0.1:3303 node tests/release-smoke.mjs` | PASS | Room, 네 category, API boot, 구매/Scene artwork 및 interaction module |
| `SMOKE_BASE_URL=http://127.0.0.1:3303 node tests/release-contract.mjs --compare-catalog /Users/gsretail/Documents/my_docs/projects/makmeaning/work/release-catalog-baseline.json` | PASS | 아래 상품/DB 계약 전부 |
| Live HTML / module 보충 검사 | PASS | `/`, `/fashion`, `/food`, `/living`, `/beauty`가 200. 다섯 native anchor 순서 Fashion → Food → 내 공간 → Living → Beauty, 페이지당 active destination 한 개. `/prototype/garment-art.js` 200 및 실제 export 포함 |
| `git diff --check` | PASS | whitespace 오류 없음 |

Release contract가 확인한 내용:

- **실제 구매 10개**의 ID/name/price/domain이 `/api/products/:id`와 정확히 같다. 이전 9개 fixture를 검증한 것이 아니다.
- Food/Beauty의 home/user/purchase/product 연결이 동일하고, 가상 예시 6개/2개는 실상품 구매와 구분된다.
- Fashion/Living Scene의 기존 가상 추천 8개/6개와 cart reference가 유효하다.
- Room + 네 category page 및 필수 artwork/interaction asset 39개가 정상 응답한다.
- 공통 DB 전체 **6,036개**를 읽기 전용 조회했다. 원본 baseline과 count 및 SHA-256이 같다.
- SHA-256: `d2caaf9ed958d13c724c87aff849cb7427b3f25514128db5082c4564e19a8dbe`.
- DB migrate/seed/import 및 쓰기 API를 실행하지 않았다.

## 상태/회귀 diff 검토

초기 CLI/source 감사에서는 새 P0/P1 기능 회귀를 확인하지 못했다. 이후 Main의 실제 브라우저에서 아래 double-click 재타깃 문제가 추가로 발견되어 조사 중이며, CLI PASS를 이 UI 문제의 PASS로 해석하지 않는다.

1. **Category 왕복 및 vanilla lifecycle**: 공통 nav는 native `<a>`를 사용한다. Root의 module Script를 기존대로 document마다 부팅하며 client-side route 재사용으로 초기화가 누락되는 경로를 추가하지 않았다. 기존 object second-click navigation 함수와 준비 상태/중복 방지 guard는 수정되지 않았다. 실제 handler harness의 다섯 object ready re-tap, 안전 위치 복원, 복귀 후 재진입 검사가 PASS다.
2. **Wardrobe 상품 identity / apply**: 방 object, Fashion hanger, owned card가 공유 garment source를 사용한다. selector의 canonical 상품 ID, 순서와 안정적인 room-slot 번호를 확인하는 regression이 PASS다. 명시적인 착장 적용 성공 후에만 horizontal rail을 첫 카드로 되돌리는 layout effect가 추가되었으며 저장 실패/preview 취소/장바구니 변경에는 실행하지 않는다. Main이 이전에 재현한 scroll anchoring 문제는 Main의 동일 390/320 시나리오에서 재검증되었으며 본 CLI 감사가 그 UI 결과를 대체하지 않는다.
3. **Food/Beauty placement**: `catalog-room.ts`는 API 구매 event → 같은 home 상품 → shared-products 표시 상품 → roomSlot geometry 순으로 연결한다. 우유/물은 냉장고, 비타민은 pantry로 정렬하고 접근 위치도 같은 config를 쓴다. 배열 순서 변경, 가상 상품의 구매 침투 차단, depleted food 그림 숨김, Beauty 확정 선택 및 입력 객체 불변 검사가 PASS다. geometry만 상태에서 파생되며 상품 ID나 ownership을 변경하지 않는다.
4. **Food 완료와 cleanup**: 기존 eating lock, 완료 후 단 한 번 소비, blur/pagehide/hidden/storage 복원 시 취소, latest-state merge 저장은 유지된다. Main room handler의 중복/중단/reload/reset/0 잔량/저장 차단 회귀가 PASS다. 이 assertion harness는 React category에서 실제 화면 좌표로 연속 클릭하는 경로를 검증하지 않는다. 새 source diff는 접근 좌표와 presentation만 바꾼다.
5. **확정 상태와 preview/reset**: `demo-state.js`의 canonical confirmed state 계약과 API runtime join은 변경되지 않았다. 미보유 preview의 outfit 적용 금지, 명시 적용, stale 화면 field update 병합, reset의 개인 storage 범위, cross-tab 찜/장바구니 복원 검사가 PASS다. Scene native 재진입 및 pageshow는 임시 preview를 지우며 source review에서 preview를 구매/확정 상태로 승격하는 새 경로는 없다.
6. **Scene sheet / avatar 변경**: Scene sheet 변경은 scroll reset, preventScroll focus와 완료 copy에 한정되어 상황/예산 선택, valid guard를 유지한다. avatar 변경은 vanity raster pose geometry/합성이고 state/controller timing을 수정하지 않는다. 각 중간 frame과 seat occlusion의 자연스러움은 Main/Visual Critic 판정 대상이다.

## 작은 문서 보정

허용된 범위에서 `docs/design/room_commerce_contract.md`의 과거 9개 상품 표기를 실제 10개(Fashion 3 / Food 3 / Living 2 / Beauty 2)로 고쳤다. 초기 감사 단계에서는 product/runtime 코드를 수정하지 않았다. 이후 Main이 아래 P2 연속 클릭 문제를 선정하여 한정된 수정을 추가로 맡겼다.

## 남은 검증 경계

- 390×844와 320×568 실제 rendered 20개 canonical state, 실제 touch/keyboard 왕복, pin 접근·먹기 화면, vanity 중간 pose와 z-index 자연스러움은 Main/독립 Critic 보고서로 판정한다.
- 이 결과는 통합 로컬 3303에 대한 결과다. 아직 배포되지 않은 현재 diff를 공개 URL에서 PASS했다고 주장하지 않는다.
- 기능/API/DB 일치가 고객 문제 해결이나 전환 성과를 입증하지 않는다.


## Main 실제 UI 추가 발견: Food 먹기 후 연속 클릭 재타깃

- Main 증거: `outputs/quality-20260922/cycle2/13-food-eating-390.jpg`.
- 관찰: water 2번 선택 후 먹기 버튼 double-click → 소비 없이 잔량 3 유지, vitamin 3번 선택 및 접근 x77. 같은 동작을 single-click하면 정상 eating.
- Source 경로: `eat()`이 eating lock을 획득한 뒤 collection 전체를 `scrollIntoView({ block: 'start', behavior: 'instant' })`로 즉시 이동한다. 구매 rail 카드들은 계속 활성이고 `choose()` 첫 줄은 `cancelEating()`이다. 화면 이동 후 동일 좌표의 다음 물리 클릭이 vitamin 카드에 닿으면 이 결과가 발생할 수 있다. `eatingLock`은 `eat()` 재호출만 막으며 `choose()`의 취소/선택 경로는 막지 않는다.
- 현재 판단: 소비 데이터 손상은 관찰되지 않았지만 연속 입력이 의도하지 않은 선택과 취소로 바뀌는 UX 문제다. 실제 event target/timing 기록을 직접 확보한 것은 아니므로 좌표 재타깃 원인은 source와 screenshot에 부합하는 설명이며 Main의 동일 조건 재검증이 필요하다.
- Main에 전달한 최소 수정안: 먹기 시작의 pointer 좌표/시각을 기록하고, 스크롤 직후 짧은 시간 안에 동일 좌표로 들어오는 후속 click만 capture에서 차단한다. 다른 위치로의 의도적 이동, 명시적 취소, keyboard 입력은 보존한다. 모든 choose를 식사 종료까지 막는 방식은 기존 이동-취소 계약을 훼손하므로 피한다.
- 원인 제보 당시에는 product code를 수정하지 않았으며, 이후 Main 승인으로 아래 수정까지 수행했다. 최종 cycle 판정은 해당 재현/수정/동일 시나리오 결과를 포함해야 한다.


### P2 최소 수정 후 handoff

- `CatalogScenePage.tsx`: eat 시작 시 `.catalog-room`의 실제 top/bottom을 현재 header 아래/하단 navigation 위의 사용 가능한 viewport와 비교한다. 이미 온전히 보이면 화면을 이동하지 않는다. 그림이 화면 밖이면 기존 collection reveal을 수행한다.
- 그림 reveal 또는 상품 dialog 닫기로 클릭 대상이 이동하는 경우에만 시작 pointer 좌표/시각을 기록한다. Main capture handler는 450ms 안의 10px 이내 후속 pointer click이 다른 control로 새는 것을 막는다.
- keyboard click(`detail=0`), 다른 좌표의 의도적 클릭, `먹기 취소`는 통과한다. 기존 choose → cancelEating, blur/pagehide/hidden 취소, 완료 시 state commit은 유지한다.
- 새 pure helper: `src/lib/catalog-eating-input.ts`. 현재 가시 여부 및 재타깃 보호 조건만 계산한다. 구매/잔량/저장 계약을 다루지 않는다.
- 수정 후 실행: `node --test tests/catalog.test.mjs` **20/20 PASS**, `node app/tests/home-food.test.mjs` PASS, `npm run typecheck` PASS, `git diff --check` PASS.
- focused tests는 390/320 가시 영역, 화면 위/아래 clipping, 시간 경계, touch처럼 detail=1로 재타깃된 후속 클릭, 다른 좌표, keyboard, 만료/없는 guard를 확인한다. 실제 browser hit-testing은 Main의 동일 water double-click → 취소 → 완료 시나리오로 다시 확인해야 한다.
- 위의 live 3303 full smoke/contract/DB hash는 이 마지막 P2 source 수정 이전 build 결과다. Main이 재build한 뒤 실제 UI를 확인할 예정이다. 새 수정은 DB/API를 변경하지 않는다.


## 최종 local release candidate 재검증

Main이 Food pointer guard 및 Living의 작은 geometry 보정을 포함하여 production build를 다시 완료하고 3303을 재시작한 후, 모든 functional release gate를 다시 실행했다.

| 최종 검사 | 실제 결과 |
| --- | --- |
| `npm test` | **74/74 PASS**, fail 0, skipped 0. 3 + 5 + 13 + 43 + 10개의 Node cases이며 assertion 기반 Main interaction/movement/input/object-art/home-food suite도 exit 0 |
| `npm run typecheck` | PASS, exit 0 |
| `SMOKE_BASE_URL=http://127.0.0.1:3303 node tests/release-smoke.mjs` | PASS: Room, Fashion/Living Scene, Food/Beauty page/API/artwork |
| `SMOKE_BASE_URL=http://127.0.0.1:3303 node tests/release-contract.mjs --compare-catalog /Users/gsretail/Documents/my_docs/projects/makmeaning/work/release-catalog-baseline.json` | PASS: 실제 구매 **10개**의 ID/name/price/domain, category/home/user 계약, Scene/cart reference, 5개 페이지, 필수 asset 39개 |
| 전체 DB 재비교 | **6,036개**, SHA-256 `d2caaf9ed958d13c724c87aff849cb7427b3f25514128db5082c4564e19a8dbe`로 원본 baseline과 일치 |
| `git diff --check` | PASS |

최종 전체 test 로그: `work/quality/cycle2-final-npm-test.log`.

추가 diff 감사: Living 변경은 미리보기 쿠션의 SVG x translation -32 → -22, 기존 쿠션 marker의 30%/35% 위치 보정뿐이다. 기존 44px target과 상품 선택/preview/저장 경로를 유지한다. Food guard의 조건부 reveal과 click 보호는 state commit 로직을 변경하지 않는다. 이번 functional/data/source 감사에서 **미해결 P0/P1은 확인되지 않았다**. 실제 모든 시각 상태에 대한 판정은 별도 Main/Visual Critic 기록을 따른다.

### Main 실제 브라우저 재검증 결과 인용

다음 내용은 본 감사자가 브라우저를 조작한 결과가 아니라 Main이 직접 실행하여 전달한 결과다.

- **320px**: water 먹기 double-click → selected water / x22 / eating 유지. 즉시 먹기 취소 → 잔량 1 그대로 유지.
- **390px**: 같은 water double-click → selected water / x22 / eating 유지. 완료 후 잔량 1 → 0으로 정확히 한 번 차감. 물 그림만 사라지고 0회/다 먹었어요/구매 카드 유지.
- 이전의 vitamin 재선택/x77로 튀는 현상은 재발하지 않았다.
- 증거: `outputs/quality-20260922/cycle2/13-food-doubletap-complete-390.jpg`.

따라서 이 연속 클릭 P2의 source 수정, focused 회귀, 실제 동일 시나리오 재실행, 최종 전체 functional release gate가 모두 완료되었다. 현재 결과는 최종 로컬 3303 candidate 대상이며 공개 배포 확인과 최종 제품 시각 품질 판정은 Main이 맡는다.
