# 게임 에셋 브랜치 통합 검토 — 2026-09-22

> 후속 사용자 요청으로 실사 사진 유지 결정은 정정됐다. 현재 목록·상세·추천에서도 생성 에셋을 우선하며 미매핑은 준비 중으로 표시한다. 최신 정책은 product_artwork_spec.md와 main_screen_review.md의 상품 이미지 대체 절을 따른다. 아래는 첫 병합 당시 기록이다.

## 기준과 범위

- 동료 `feat/game-asset-mapping`: `6589022`.
- 기존 추천 통합 `660df5f`에 에셋을 통합한 커밋: `3265a7e`.
- 최신 main `13dc705`의 홈/카테고리 navigation 및 추천 catalog 배포 추적까지 보존한 병합: `868ad18`.
- 상품 DB는 기존 데이터 소스, 에셋은 별도 API를 같은 상품 ID로 조회한다. 전달된 DB 비밀번호는 저장하지 않았으며 DB migration/import/write는 실행하지 않았다.
- API 주소는 ignored 로컬 환경설정만 사용한다. 배포 환경의 ASSET_API_URL 설정은 별도 필요하다. 이번 작업은 push 또는 Vercel 배포를 하지 않는다.

## 충돌 결정

기존 추천의 persona 원본 `data/demo-persona-purchases.json`과 구매 이벤트 40개를 유지했다. 브랜치의 별도 구매 목록/캐릭터 선택 UI는 활성화하지 않는다. `src/data/demo-personas.json`은 상품 역할·슬롯·그림 키 등 배치 메타데이터만 제공하고, 호환 adapter도 기존 persona 원본을 읽는다.

네 탭의 추천 패널, 찜, 장바구니, 상품 사진/가격/상세는 유지한다. 게임 에셋은 준비된 동일 상품·카테고리에만 붙인다. 실상품 사진을 캐릭터의 예시 셔츠/니트로 입히는 동작은 허용하지 않는다. 소비 완료 시점과 개인별 상태 저장 계약도 유지한다.

## 홈 영향 및 선택적 롤백 단위

| 영역 | 반영 내용 | 관련 파일 |
| --- | --- | --- |
| 상품 그림 | 옷장·식품·뷰티·생활 보유품에 검수된 게임 에셋 표시; 홈 상품 tray의 썸네일도 에셋 우선 | app/game-item-art.js, app/object-art.js, app/room-mirror.js, app/app.js |
| 배치 | 화분/머그는 테이블, 베개는 침대, 식품은 냉장고/팬트리 역할에 따라 배치 | src/data/demo-personas.ts, src/data/demo-personas.json, app/category-products.js, app/room-mirror.js |
| 조명 | 장스탠드 크기와 일치하도록 홈 hit area/glow 위치 보정 | app/app.js, app/room-mirror.js |
| 조회 | 홈/Food/Beauty 구매 정보에 gameAsset 부가 필드 추가; 상품 ID·구매 여부·가격 원본은 그대로 | src/lib/demo-home.ts, src/lib/demo-catalog.ts, app/api/demo/*/route.ts |
| 저장 | 저장 실패 스냅샷을 persona별로 분리 | app/demo-state.js |

최신 메인의 Room 하단 nav 제거, 오른쪽 이동 힌트, 탭 중앙 홈 복귀, 중복 header 복귀 제거는 바꾸지 않았다. 선택적 롤백 시 위 영역의 diff를 `13dc705` 기준으로 분리해야 한다. 전체 merge revert는 탭 에셋/API까지 함께 제거하므로 홈만 되돌릴 때 사용하지 않는다. gameAsset 필드를 유지한 채 홈 renderer만 사진 우선으로 바꾸는 것도 가능하다.

## Review → fix

1. 에셋 라이브러리의 첫 화면이 아직 API로 변환되지 않은 로컬 PNG 주소를 표시하던 문제: 초기 API 조회 후 카드 표시, 실패/재시도/취소 처리 추가.
2. 에셋 환경설정이 없는 clone/deploy가 존재하지 않는 로컬 PNG를 ready로 반환하던 문제: 런타임은 매핑 없음으로 반환하여 기존 상품 사진 유지. 라이브러리도 같은 resolver 사용(DB-only 구성 포함). 설정된 서비스 장애는 안전한 503으로 표시한다.
3. 브랜치의 오래된 함수 인수/사진 전용 테스트 기대값은 현재 persona 계약과 sprite/사진 fallback을 각각 검사하도록 갱신했다.

## 실제 검증

- 네 persona 각 구매 10개, 총 40개 모두 API의 ready asset 연결. 고유 상품 33개와 고유 PNG 33개 모두 HTTP 200/image 응답 확인.
- 실행 API release contract 통과: Home/Food/Beauty 구매 원본과 에셋 동일성, 기존 Fashion/Living 데이터 계약 유지.
- 모바일 실제 UI: 390×844 홈/냉장고 첫 탭 동작→재탭 Food 진입, Food 상품 에셋과 추천 카드. 320×568 Beauty/Fashion/Living의 보유 에셋과 상품 사진 확인. Fashion/Living scrollWidth=320, 브라우저 error/warn 없음.
- Beauty 보유 상품 선택 후 해당 상품 기준으로 추천 카드가 변경되는 것 확인. 확인한 브라우저 persona는 지우(F02); 네 persona의 모든 동작을 UI 전수검증했다는 의미는 아니다.
- 독립 검토 결과 위 설정 누락 문제 외 추가 고영향 결함 없음. 수정 후 전체 npm test, typecheck, production build 통과. 테스트는 실제 서비스 대신 격리 fixture를 사용하며 production server-only 경계를 유지한다.

기존 `main_screen_review.md`의 Separate asset service 절은 동료 브랜치 당시의 기록이다. 그 절의 7/10 매핑·별도 persona 설명을 현재 통합 결과로 해석하지 않는다.
