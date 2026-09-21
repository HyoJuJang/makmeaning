# G:Scene 통합 릴리스 검증 — 2026-09-21

## 승인된 계약

`room_commerce_contract.md`와 doc03의 사용자 goal을 따른다. 9개 실상품 ID는 같은 가상 구매/보유와 연결하며 기존 공간 표현과 동작을 재사용한다. raw 상품 CSV와 계정 비밀은 릴리스에 포함하지 않는다.

## 실제 로컬 production 검증

- 390×844: 네 영역 첫 연속 탭은 접근/생활 동작만 수행, 준비 후 같은 object 재탭으로 올바른 category 이동. 방 복귀 후 재interaction PASS.
- Fashion: 보유 셔츠 미리보기 취소는 knit 유지. 명시적 적용 후 방/새로고침에서 같은 실상품 ID의 셔츠 복원. 미보유 상품 코디 취소·찜·장바구니 저장 PASS.
- Food: 우유 사용 후 잔량 2회가 Food에 연결되고 새로고침 후 유지. Beauty: 크림 선택이 category와 방에서 동일하며 새로고침 복원 PASS.
- Living: 확정 조명 OFF가 category에 연결, 임시 켜기/배치 취소·이탈 후 OFF 유지. 찜·장바구니 reload, 방 복귀/소파 재interaction PASS.
- 320×568: 방·네 category·구매 tray·Scene 조건 선택을 실제 검토. 가로 넘침 없음. 구매 rail은 가로 스크롤, 긴 목록/조건 패널은 세로 스크롤 사용.
- 데모 초기화 후 knit/우유3회/조명ON 복원. 전체 상품 DB 6036개 SHA256 `d2caaf9ed958d13c724c87aff849cb7427b3f25514128db5082c4564e19a8dbe` 동일.

## Review → fix → 동일 시나리오 재검증

1. Medium: Food/Beauty 상태 설명을 추가한 후 기존 last-child 선택자가 상품명에 적용되지 않아 320px에서 이름이 5–6줄로 확장. 명시 상품명 class와 2줄 제한을 복원. 동일 Food/Beauty 화면 재검토 PASS, full name은 상품 상세/전체 목록에서 확인.
2. High/P0: BFCache가 오래된 room JS state를 복원하면 이후 생활 동작 저장으로 category의 확정 착장을 덮어쓸 수 있음. persisted pageshow에서 공통 확정 상태를 재조회하고 화면에 반영. 실제 browser Back PASS; BFCache 전용 이벤트 회귀는 실제 앱 핸들러와 이후 lamp commit을 실행하여 outfit/food/beauty/avatar 유지 PASS. IAB에서 BFCache 자체가 사용됐다는 주장은 하지 않음.

## 릴리스 게이트

최종 통합 소스에서 test/typecheck/build, API smoke/contract를 실행한다. 이 문서는 로컬 검증 기록이며, 공개 URL 배포와 동일 commit 검증 결과는 최종 전달 보고서에 기록한다. 기능 PASS는 고객 문제 해결이나 전환 성과를 검증했다는 뜻이 아니다.
