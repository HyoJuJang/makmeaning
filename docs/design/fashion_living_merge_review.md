# Fashion / Living 병합 검토 — 2026-09-21

대상: main `58a1635` + `origin/feat/fashion-living-scenes` `5602026`.
최신 작업 정리는 `docs/main.md`이며 마지막 커밋은 해당 문서 이동이다.

## 통합 범위와 보존

- Fashion/Living 페이지·추천·미리보기와 메인 진입 링크를 통합한다.
- package.json 충돌은 기존 상품 데이터 테스트와 신규 Scene 테스트를 모두 실행하도록 해결했다.
- 진행 중인 메인 화면 수정은 별도 작업 공간에 복사해 함께 검증했다. 침대, 조명, 화장대, 이동, 초기 착장 및 관련 미커밋 문서·자산을 병합 커밋에 포함하지 않는다.
- 겹치는 app.js, index.html, style.css, README, release-smoke는 현재 로컬 수정에 동료 브랜치의 추가 내용만 결합했다.

## Review → fix → rerun

1. 초기 착장 불일치: 새 브라우저에서 메인은 API의 wearing 상품(니트)을 표시하지만 카테고리 캐릭터는 base로 초기화했다. RoomAvatar에 API 초기 착장을 전달하고 유효한 로컬 저장 착장은 우선하도록 수정했다. 재빌드·서버 재시작 후 Fashion/Living 모두 knit, 셔츠 미리보기 shirt, 되돌리기 흐름을 확인했다.
2. 테스트 명령 충돌: 한쪽 명령만 선택하면 상품 데이터 또는 신규 Scene 검증이 누락된다. 두 테스트 묶음을 모두 유지하고 전체 실행을 통과했다.

## 검증

- 커밋된 두 브랜치 병합: npm test 및 production build 통과.
- 진행 중인 메인 수정 포함: npm test, npm run build, npm run typecheck 통과.
- 실행 서버 127.0.0.1:3107에서 release-smoke 통과: 메인/API/9개 구매 이미지/캐릭터 자산/두 카테고리 페이지/Scene API/배경 이미지.
- 실제 모바일 브라우저: 390×844 Fashion, 320×740 Living 가로 넘침 0. 메인 옷장 접근과 열기, tray 추천 링크, Fashion/Living 이동, 리빙 조명과 앉기, 착장 변경·되돌리기 확인. 브라우저 error 로그 없음.
- 시각 검토: 메인 개인 공간과 기존 가구 버튼 유지, 카테고리 화면은 동료 설계의 소유 상품 공간 + 추천 구성 유지.

실상품 DB 데이터를 새 추천 카탈로그에 연결하는 작업은 이 병합 범위가 아니다. 기존 /api/products 구현과 테스트를 보존하며 Scene 추천은 동료 브랜치의 예시 데이터를 사용한다.
