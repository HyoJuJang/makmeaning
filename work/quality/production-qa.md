# Production API / data QA — 2026-09-22

## 검증 대상

- Public URL: https://makmeaning.vercel.app
- Source commit: `719c1cbb4151498cd4879ceb7b82255bf18cbc97`
- Vercel deployment: `dpl_HLhk6afN9D2tirVrHz9nryLBqBMb`
- 범위: 독립 read-only HTTP/API/asset/catalog 및 Vercel metadata 검증. Main의 실제 mobile browser 검증과 별개다.

## 실제 실행 결과

1. `SMOKE_BASE_URL=https://makmeaning.vercel.app node tests/release-smoke.mjs` — **PASS**, exit 0.
   - Homepage, API, 구매 artwork 10개 및 room/interaction module.
   - Fashion/Living page, category entry, Scene API, artwork.
   - Food/Beauty page, catalog API, source columns, home purchase 연결 및 artwork.
2. `SMOKE_BASE_URL=https://makmeaning.vercel.app node tests/release-contract.mjs --compare-catalog /Users/gsretail/Documents/my_docs/projects/makmeaning/work/release-catalog-baseline.json` — **PASS**, exit 0.
   - Home 구매 **10개**의 canonical ID/name/price/domain이 실제 shared product API와 정확히 같다.
   - Food/Beauty가 동일한 home/user/purchases를 사용하며 가상 추가 예시 6개/2개는 구분된다.
   - Fashion/Living의 기존 가상 Scene 예시 8개/6개 및 cart reference가 유효하다.
   - Room 및 네 category page, 필수 artwork/interaction asset **39개** 정상 응답.
   - 공통 DB 전체 **6,036개**를 읽기 전용 재조회했다. 원본 baseline과 count/hash가 정확히 같다.
   - SHA-256: `d2caaf9ed958d13c724c87aff849cb7427b3f25514128db5082c4564e19a8dbe`.
3. 기존 승인 Vercel CLI의 `/v13/deployments/dpl_HLhk6afN9D2tirVrHz9nryLBqBMb` read — **PASS**.
   - `readyState`: **READY**, target: **production**.
   - `meta.gitCommitSha`: **719c1cbb4151498cd4879ceb7b82255bf18cbc97**, 지정한 release source commit과 일치.
   - Deployment URL: `makmeaning-b939oqb99-ww-002-8351s-projects.vercel.app`.
   - Aliases: `makmeaning.vercel.app`, `makmeaning-ww-002-8351s-projects.vercel.app`.
   - 출력은 release 상태/SHA/alias만 선별했으며 secret을 출력하거나 변경하지 않았다.

## 판정과 경계

이 production 배포의 API/data/asset release gate는 PASS다. 공통 DB 쓰기, migrate/seed/import, Git 변경, product code 수정을 하지 않았다.

이 검사는 browser interaction·visual plausibility·390/320 viewport PASS를 대신하지 않는다. 해당 결과는 Main의 실제 mobile QA 기록을 따른다. 이 배포 이후 문서 전용 release가 있을 수 있으므로 최종 goal 완료나 최종 commit 확정은 Main이 판단한다. 기능 일치가 고객 문제 해결/전환 성과를 입증한다고 표현하지 않는다.

## Main 실제 공개 브라우저 QA — 02:31 KST

같은 `719c1cb` 공개 배포를 Codex in-app browser의 390×844 / 320×568 viewport에서 직접 조작했다. 아래는 위 read-only API 검증과 별도의 UI 증거다.

| 시나리오 | 실제 결과 |
| --- | --- |
| 네 object 첫 tap / 준비 후 두 번째 tap | 두 크기에서 wardrobe→Fashion, fridge→Food, vanity→Beauty, sofa→Living PASS. 첫 tap은 방에서 접근·open/seated 상태로 끝나며 바로 이동하지 않는다. |
| 연속 입력 / 복귀 후 재사용 | Wardrobe rapid double tap은 approach 중 route를 열지 않는다. 각 category에서 내 공간으로 돌아온 뒤 해당 object interaction이 다시 작동한다. 최종 Fashion 왕복 후에도 engaged / wardrobe open=1을 확인했다. |
| Fashion 소유 상품 | 임시 shirt preview 취소는 원래 knit 유지. 명시적 적용 후 방/새로고침에서 `1083830467` 유지. 보유 카드는 적용 직후 첫 위치로 드러난다. |
| Fashion 탐색·찜·장바구니 | 320 출근·5만원 조건으로 7개 추천 확인. 가상 white tee 코디 미리보기/비우기, 찜·장바구니 저장과 새로고침 복원. owned 수는 3으로 유지. |
| Food | 우유·물은 fridge, 영양제는 pantry. 390 물 먹기 rapid double click은 한 번만 완료되어 3→2, 새로고침 후 2 유지. 상품 전환이나 중복 소비 없음. 취소/0잔량 경계는 같은 코드의 local 회귀 증거에 있다. |
| Beauty | Cream을 화장대에 꺼내는 생활 motion 완료 후 확정 선택이 새로고침에도 유지. category의 2개 구매 상품 ID와 일치한다. |
| Living | 320 파란 cushion 미리보기/취소 및 조명 off 체험 후 방 복귀. 임시 조명이 확정 lampOn을 덮어쓰지 않는다. 찜·장바구니 새로고침 복원, owned 수 2 유지. |
| Window / lamp | 실제 창문 open→close 및 DOM open=0, 조명 off→새로고침 후 ‘켜기’ control로 저장 복원 확인. |
| Scene | 390 첫 출근·5만원 / 320 여행 준비·10만원 선택→완료→방 복귀. 320 재선택/재진입 시 선택값 유지. 선택용 종점 안내와 두 CTA가 잘리지 않는다. |
| 개인 데모 초기화 | Outfit `1106041553`, Food 3/3/3, Beauty serum `16052422`, lampOn 복원. Fashion 찜0·초기 demo cart1 복원. 공통 DB는 위 hash 검사 및 재배포 후 read-only contract 재검증 대상이며 UI 초기화는 DB write를 수행하지 않는다. |
| Mobile / visual | 두 크기에서 주요 control 가림/가로 넘침 없음. 긴 category 목록과 320 room은 정상 세로 스크롤한다. 독립 Critic이 실제 공개 사진 26장을 검토해 새 P0/P1/major P2 0으로 판정했다. |

Screenshots: task outputs `quality-20260922/production/`. 최종 UI 테스트 후 개인 데모는 기본 상태로 복원했다. Native mobile Safari/실물 터치 기기는 검사하지 않았고, viewport pointer interaction으로 검증했다. 고객 성과·전환 개선은 검증하지 않았다.

## 최종 기록 release 방식

이 보고서와 시각 review/log를 포함하는 마지막 commit은 문서만 변경한다. 제품 코드·assets·tests는 위에서 검증한 `719c1cb`와 동일하다. Main은 그 기록 commit을 main으로 fast-forward/push하고 Vercel에 다시 배포한 후, READY/meta SHA 및 공개 smoke/contract와 실제 room 왕복을 재검증한다. 최종 commit/deployment 증거는 task output release record에 남긴다.
