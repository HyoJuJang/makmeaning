# Food / Beauty 병합 검토 — 2026-09-21

기준 main `ca3c54b`, 동료 `feat/food-kitchen@a5c4659`. 별도 worktree에서 통합 후 현재 미커밋 메인 수정 복사본을 얹어 검증했다. 원본 작업의 commit/stash/파일 교체 없이 진행한다.

## 통합 계약

- 기존 main의 첫 가구 탭 → 접근·생활 동작 → 준비 후 같은 가구 재탭 → 카테고리 이동을 유지한다. 동료 브랜치의 Food/Beauty 즉시 링크와 중복 홈 복귀 저장 구현은 제외한다.
- 기존 `gscene-room-return-v1`과 안전 위치·방향·창문 복원을 유지한다. `app/interactions.js`, `app/index.html`, `app/style.css`, `ScenePage.tsx`는 병합 전 main을 그대로 사용한다.
- `/food`, `/beauty` 임시 구매 화면을 동료 CatalogScenePage로 연결한다. 같은 demoHome 사용자와 구매 사건을 재사용하고 초기 착장을 전달한다.
- 카탈로그 화면에도 최신 main의 공통 CategoryNav SVG 아이콘을 적용한다. 네 카테고리 및 이전 식품 찜·장바구니 키를 메인 데모 초기화에서 모두 지운다.

## Review → fix → rerun (주요 3건)

1. 이전 branch의 즉시 이동 및 별도 return 키가 main의 준비 후 재탭 계약과 충돌: main 진입/복귀 코드 보존, home-food 테스트를 실제 가구 준비·빠른 입력·한 번만 이동·복귀 검증으로 갱신. 기존 5개 object 회귀검사와 함께 통과.
2. 공통 파일을 이전 branch 버전으로 덮으면 새 SVG 메뉴와 API 초기 착장이 회귀: 최신 RoomAvatar/scene.css 유지, CatalogScenePage는 CategoryNav 재사용 및 API initialOutfitId 전달. 모바일 Food/Beauty에서 구매 상품·니트 캐릭터·4개 아이콘 확인.
3. HTTP smoke가 메인에 제거된 Fashion/Living href를 요구: 현재 data-room 버튼 계약으로 수정하고 동일 HTTP 검사를 재실행해 통과. 실제 이동은 단위/브라우저 왕복 시나리오로 별도 확인.

## 검증 결과

- 커밋된 main+feature 및 미커밋 메인 수정 포함 빌드에서 production build/typecheck 통과.
- 전체 npm test 통과: 기존 이동·입력·생활 interaction, DB/API, Scene 추천/아바타, catalog 12개, Food/Beauty 진입·복귀·초기화 검사.
- 별도 production 서버 127.0.0.1:3108 HTTP smoke 통과: 네 페이지, home/scenes/food/beauty API, 사용자·구매 ID 일치, runtime 및 이미지 응답.
- 실제 390×844 Food: 냉장고 빠른 두 번 탭은 방에서 동작 유지; 준비 후 재탭으로 내 주방 진입; 동일 구매 3종; 우유 상세·장바구니·찜 저장 및 새로고침 복원; 방 복귀 후 냉장고 다시 열림.
- 실제 320×568 Beauty: 화장대 착석 후 재탭 진입; 동일 구매 2종; 세럼 선택; 공통 네 메뉴; 방 복귀 후 화장대 재착석. 가로 overflow 0, 시각적으로 조작 대상 가림 없이 스크롤 가능.
- 메인 데모 초기화 후 재진입 동작 확인. 테스트 과정의 Food 장바구니/찜은 초기화했다.

## 다른 main 작업과 경계

진행 중인 Main Screen task와 소유 파일/통합 시점을 조율했다. 이번 변경은 동료 브랜치의 기존 카탈로그 탐색·찜·장바구니를 보존하는 병합이며 신규 추천·레시피·실상품 DB 연결을 추가하지 않는다. Food/Beauty 추천 영역은 동료 구현의 준비 안내다. 실상품 구매 ID·확정 식품 잔량/뷰티 상태·명시적 적용의 전체 연결은 다른 main release task에서 이어간다. 이 문서는 해당 전체 release goal이 완료됐다는 주장이 아니다. 원격 push와 Vercel 배포도 그 task가 담당한다.
