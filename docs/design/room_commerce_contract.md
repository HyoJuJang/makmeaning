# Room → shopping → room release contract

2026-09-21 사용자가 승인한 goal은 AGENTS/crit01의 초기 DB·backend·category 제외 규칙을 이미 존재하는 DB/API와 화면의 연결 범위에 한해 갱신한다. doc03 제품 방향, crit00 평가 기준, 실행·QA 원칙은 유지한다.

## Identity / ownership

- `Purchase.id` = 공통 상품 DB의 `prd_id`. `/api/products/:id`, `/api/demo/home`, 구매 목록은 같은 ID/name/catalog reference price를 사용한다.
- `purchaseId` = 가상 고객의 가상 구매 이벤트. 실상품 카탈로그와 가상 보유 여부를 구분한다.
- `illustrationKey` / `roomSlot` = 기존 공간 그림·동작 연결. 그림은 실상품 사진, 정확한 외형, 가상 피팅이 아니다.
- `/api/demo/home`는 지정한 9개 상품만 DB에서 읽어 가상 구매 이벤트에 연결한다. 실패 시 명확한 오류를 내고 가짜 실상품으로 대체하지 않는다. DB에는 쓰지 않는다.
- Food 잔량은 데모에서 남은 사용 횟수이며 실상품의 포장 수량·재고가 아니다. 가격은 카탈로그 참고가이며 가상 주문의 결제 금액을 뜻하지 않는다.
- 기존 Scene 추천의 가상 예시 상품은 유지하고 실상품 구매 목록과 명시적으로 구분한다.

## Confirmed state / preview

- `app/demo-state.js`가 공통 확정 상태 정규화·저장·초기화를 담당한다.
- `gscene-main-v1`의 version 2는 userId, 상품 ID 기반 outfitId/featuredBeautyId/foodQuantity, lampOn, avatarId를 저장한다. 기존 art-key 상태는 구매 매핑으로 마이그레이션한다.
- Room 렌더러의 기존 art-key state는 adapter로만 연결한다. 확정 저장에는 상품 ID를 쓴다.
- Category의 입어보기/배치/조명은 임시 state. 취소·route 이탈·새로고침 시 확정 상태를 덮어쓰지 않는다.
- 지원되는 보유 의류만 `내 착장으로 적용`을 통해 확정할 수 있다. 미보유 추천·찜·장바구니는 보유로 처리하지 않는다.
- 초기화는 해당 demo storage와 개인 찜·장바구니·복귀 위치만 초기화한다. 공통 상품 DB와 무관하다.

## Navigation / scope

- 첫 object 탭 → 접근 → 생활 동작. 준비된 같은 object의 재탭 → 종료 animation → 해당 category. 진행 중 중복 입력은 route를 바꾸지 않는다.
- 방 복귀 시 확정 상태와 안전한 위치를 복원하고 interaction을 다시 사용할 수 있어야 한다.
- Fashion/Living의 기존 탐색·추천·미리보기·찜·장바구니 유지.
- Food/Beauty 동료 작업을 보존하고 구매 확인/생활 상태/진입/복귀 연결을 완성한다. 새 전체 쇼핑·추천 기능은 추가하지 않는다.
- Scene entry, 생활 동작, 자유 이동, 4명 avatar와 SVG category navigation을 보존한다.

## Release gate

390×844 / 320×568 실제 브라우저에서 4영역 round trip, preview cancel/apply, reload, persisted food/beauty/lamp, cart/saved, rapid taps, reset을 검증한다. 단절·상품 불일치·상태 유실은 P0. build/typecheck/tests/API/브라우저 검사와 review→fix→동일 시나리오 재실행 후 GitHub main과 Vercel을 같은 commit으로 배포하고 공개 URL에서 재검증한다. 고객 문제 해결/전환 성과가 검증되었다고 주장하지 않는다.
