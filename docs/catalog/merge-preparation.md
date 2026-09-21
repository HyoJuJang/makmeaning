# 식품·뷰티 브랜치 병합 준비

2026-09-21. 작업 브랜치는 `feat/food-kitchen`, 참조 브랜치는 `origin/feat/fashion-living-scenes`의 `5602026`이다. **실제 merge 및 merge commit은 만들지 않았다.** 사용자 요청 변경 후 시작했던 미완료 merge는 abort하고 필요한 파일만 복사했다. 원격 push·배포도 하지 않았다.

## 원본 그대로 가져온 공통 파일

아래 파일은 참조 커밋과 byte 단위로 동일하다. 실제 병합 때 같은 파일이 추가되어도 공통 구현을 한 벌로 유지한다.

- `src/components/scene/scene.css`
- `src/components/scene/RoomAvatar.tsx`
- `src/lib/scene/avatar-motion.ts`
- `app/avatar.d.ts`
- `tests/avatar-motion.test.mjs`

`RoomAvatar`의 기존 `living` 비착석 모드와 CSS 좌표를 사용하여 구매 상품까지 걷는다. 원본 타입과 이동 로직을 수정하지 않았다. 식품/뷰티 좌표·스타일은 `src/components/catalog/`에만 둔다. 홈의 `gscene-main-v1` 외형·복장을 그대로 읽는다.

## 우리 브랜치의 변경

- `app/food/`, `app/beauty/`, 두 카탈로그 API와 `src/{types,lib,data}/*catalog*`: 시나리오 없는 공통 카탈로그 화면.
- `public/catalog-art/`: 주방·화장대 배경. 상대 브랜치 `public/scene-art/`와 경로가 겹치지 않는다.
- `app/index.html`, `app/app.js`: Food/Beauty native 링크·홈 복귀 캡처·카탈로그 초기화.
- `tests/catalog.test.mjs`, `app/tests/home-food.test.mjs`, `tests/release-smoke.mjs`, `package.json`: 새 카탈로그 검증.
- 기존 식품 시나리오 코드/테스트/이미지 제거.

## 실제 병합 시 확인

1. 홈 HTML/JS 충돌은 Fashion/Living 진입과 Food/Beauty 즉시 링크를 모두 살린다. `data-catalog-entry` 링크도 위치 복원 캡처가 필요하고 초기화 시 두 카탈로그 키와 이전 식품 키를 지운다.
2. package.json test 명령은 패션/생활 테스트와 catalog/avatar-motion/home-food 검사를 합쳐야 한다. 삭제한 `tests/food.test.mjs`는 복구하지 않는다.
3. HTTP smoke는 상대 브랜치 패션/생활 검사와 이번 식품/뷰티 검사를 모두 유지한다.
4. README와 문서는 현재 구현 기준을 합친다. 실제 추천은 아직 연결하지 않는다.
5. 원격 브랜치가 더 진행되었으면 공통 5개 파일의 변경을 다시 비교하고 양쪽 카테고리의 아바타·상태·모바일 화면을 재검증한다.

최종 확인 명령은 `npm test`, `npm run typecheck`, `npm run build`, production 서버 실행 후 `node tests/release-smoke.mjs`다. 병합 후에는 네 카테고리 진입과 홈 복귀도 브라우저에서 확인한다.
