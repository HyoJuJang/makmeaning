# G:Scene 공용 게임 에셋과 상품 ID 연결

최종 필터 CSV 5,224개를 기준으로 공용 픽셀 에셋 저장소, 상품 ID 매핑, 검수 화면을 구현했다. 상품별 원본 사진은 GS SHOP URL로 유지하고, 게임 공간에는 형태·색상에 맞는 공용 PNG를 사용한다.

작업 브랜치: `feat/game-asset-mapping`. 최신 `origin/main`의 `025bff6`을 로컬 main으로 pull한 뒤 작업 브랜치에도 fast-forward 반영했다. 에셋 작업 변경사항은 이 전용 브랜치의 작업 디렉터리에 보존했다. main에 에셋 작업을 커밋하거나 푸시하지 않았다.

## 현재 결과와 확인 위치

전체 제작은 진행 중이다. 수량과 검사 결과는 `data/game-assets/overnight/state.json` 및 `data/game-assets/generated/validation.json`을 확인한다. 사용자 전달본은 repo 상위 `outputs/game-assets-overnight/`에 있으며 각 배치 검수 뒤 갱신한다.

전체 원본 5,224개의 사진 다운로드·디코딩·SHA-256 기록이 완료되었다. 원본 상품과 모든 매핑 행은 1:1 대응하지만, 에셋은 사진에서 확인한 공통 형태·주색·패턴에 따라 여러 상품이 공유한다. 등록되지 않은 파일이나 모호한 상품에는 임의의 게임 이미지를 붙이지 않는다.

현재 형태 사전은 초기 97개에서 사진 검수 결과에 따라 확장되었다. `pending_generation`은 제작 대기이며 미연결 불가 판정과 다르다. 확정 개수·실행 순서는 `generation-progress.csv` 및 `overnight/jobs/`의 검수 기록을 기준으로 한다.

## 저장 위치

프로젝트 루트: `/Users/iseyun/Documents/Codex/2026-09-21/dlf/makmeaning`

| 역할 | 프로젝트 내 위치 |
| --- | --- |
| 기준 상품 CSV | `data/catalog/products.csv` |
| 생성 PNG 원본 | `app/assets/game-items/v1/{domain}/{family}/{color}.png` |
| 에셋 등록 정보 | `data/game-assets/manifest.json` |
| 사용한 생성 프롬프트 | `data/game-assets/generation-prompts.json` |
| 분류 규칙 / 확인된 상품별 예외 | `scripts/lib/game-asset-rules.mjs` |
| 매핑 생성·검증 | `scripts/build-game-assets.mjs` |
| 생성된 매핑 CSV·대기·검토 목록 | `data/game-assets/generated/` |
| 앱이 읽는 매핑 데이터 | `src/generated/product-asset-map.json` |
| 상품 ID 조회 함수 | `src/lib/game-assets.ts` |
| 게임 에셋 표시 컴포넌트 | `src/components/GameItemSprite.tsx` |
| 개발자용 검수 화면 | `/asset-library` |

`predev`와 `prebuild`가 매핑을 갱신하고 PNG를 `public/assets/game-items/v1/…`로 복사한다. public 폴더의 복사본을 직접 편집하지 않는다. 원본 CSV는 기존 9개 컬럼과 값, 문자열 상품 ID를 그대로 보존했다. 매핑 CSV는 같은 9개 컬럼 뒤에 연결 정보를 추가한 별도 파일이다.

## 연결 구조

```text
CSV의 prd_id
  → 상품 형태 / 색상 / 패턴 / 확인 근거
  → 등록된 assetId
  → /assets/game-items/v1/{domain}/{family}/{color}.png
```

예: `1050446036`(3개입)과 `1050446037`(5개입)은 같은 파스타 포장 에셋을 참조한다. 다른 브랜드인 `1080664026`은 실제 사진의 흰색·파란색 배색을 확인해 별도 그룹으로 분리했다. 상품명·가격·상품 ID는 각각 유지한다. 상품의 묶음 수량을 사용자가 실제 보유한 잔량으로 간주하지 않는다.

| 상품 ID | 게임 에셋 |
| --- | --- |
| 1128893597 | `fashion/cardigan_vneck_solid/navy.png` |
| 1128893626 | `fashion/cardigan_vneck_solid/gray.png` |
| 1050446036 / 1050446037 | `food/pasta_long_pouch/neutral.png` |
| 1053232515 | `living/table_lamp_dome/ivory.png` |
| 1059856091 | `beauty/serum_dropper_round/blue.png` |
| 1118407031 | `beauty/serum_dropper_round/yellow.png` |

원본 이미지 URL은 `https://asset.m-gs.kr/prod/{prd_id}/1/550`으로 계산한다. 전체 5,224개 원본 파일의 수집 상태는 `overnight/reference-status.json`에 기록한다. 대표 한 장의 속성을 같은 카테고리 전체에 자동 전파하지 않고, 연결 대상의 사진도 검토한다.

## 틀린 에셋을 붙이지 않는 규칙

- `ready`: 확인된 형태·허용된 색상/패턴과 일치하는 등록 파일이 있다.
- `pending_generation`: 기본 형태는 분류됐지만 맞는 파일이 없다. `assetId`, `assetUrl`은 null이다.
- `needs_review`: 용기나 모양을 상품명만으로 확정할 수 없거나 분류 충돌이 있다. 같은 카테고리라는 이유로 임의의 그림을 붙이지 않는다.
- `unspecified`: CSV에서 색상 또는 패턴을 확인하지 못했다. 회색·무지라는 의미가 아니다.
- 브랜드·가격·판촉 문구·같은 상품의 묶음 수량은 새 에셋을 만드는 기준이 아니다.
- 원목/금속, 셔츠/가디건, 라운드넥/브이넥, 종이팩/파우치, 스포이드/뚜껑형 용기처럼 눈에 띄는 차이는 확인해야 한다. 현재 형태 사전은 1차 분류이며, 세부 속성이 반영되지 않은 제작 대기 그룹도 대표 사진 검토 후 확정한다.
- 상품 선택 옵션이 들어오면 대표 사진보다 선택 옵션을 우선하도록 확장해야 한다. 현재 CSV에는 구매 옵션·보유 여부·수량이 없다.
- 착용 애니메이션은 별도 에셋이다. 옷걸이용 가디건 PNG를 캐릭터 착장으로 간주하지 않는다.

## 후속 제작 순서

1. `generation-queue.csv`의 상품 수가 많은 묶음부터 대표 이미지를 확인한다. 상품 1개당 생성하지 않는다. `reference_required=true`인 묶음은 미확인 색상/패턴을 먼저 결정한다.
2. 형태 확인 목록에서 포장·외형을 판별한다. 코드의 `VERIFIED` 예외 또는 분류 규칙에 근거를 남긴다. 상품 한 개의 사진 확인을 같은 카테고리 전체에 자동 전파하지 않는다.
3. 기존 미니룸의 각도·따뜻한 중성 톤·픽셀 경계를 맞춘 투명 배경 PNG를 생성한다. 로고나 가격·텍스트는 넣지 않는다.
4. PNG를 원본 폴더에 저장하고 manifest에 경로·크기·표시 경계·색상·체크섬을 등록한다. 정확한 색상을 모르는 상품에 기존 컬러를 임의로 넣지 않는다.
5. `npm run assets:build`와 `npm run test:assets`로 재생성·검증한다. 제작 대기 상품은 조건에 맞는 에셋이 등록되면 자동으로 연결 완료로 바뀐다.
6. `/asset-library`에서 실제 상품 사진과 그림을 나란히 보고, 상품 ID로 검색해 확인한다.

생성 파일은 크기가 서로 다른 투명 RGBA PNG이며 파일별 실제 크기를 manifest에 기록한다. 원본 픽셀을 재편집하지 않고 manifest의 frame으로 오브젝트 표시 영역을 맞췄다. 96px/128px 전용 저해상도 스프라이트 시트나 팔레트 치환 마스크까지 완성된 상태는 아니다.

## 앱에서 사용하기

```ts
const product = getGameProduct('1050446037');
// product?.asset가 있을 때 GameItemSprite로 표시한다.
// null이면 확인/제작 대기이며 다른 상품 에셋을 대신 표시하지 않는다.
```

`GET /api/demo/game-assets?id=1050446037`로 원본 행과 에셋 정보를 함께 조회한다. 없는 상품 ID는 404, 잘못된 형식은 400이다. 목록 조회는 domain/status/q/page/limit를 지원하며 한 번에 최대 48개만 내려준다.

최신 main은 공통 상품 DB의 prd_id와 가상의 구매 이벤트를 분리해 이미 연결하고 있다. 이 계약과 기존 illustrationKey/roomSlot, 확정 상태·미리보기 동작을 보존했다. 이번 검수용 목록은 필터 CSV의 스냅샷이며 공통 DB를 대체하거나 수정하지 않는다. 실제 구매·장바구니의 prd_id를 조회 함수에 넘겨 에셋을 찾을 수 있지만, 상품 ID가 연결된 에셋을 기존 공간과 상품 표시 컴포넌트에서 조회하도록 연결 코드를 적용했다. 실제 메인 공간 화면 검수는 현재 로컬에 공통 상품 DB 설정이 없어 대기 중이다. 검수 화면은 CSV 스냅샷을 사용해 독립적으로 확인할 수 있다. DB에만 존재하고 이 스냅샷에 없는 ID는 null이므로 다음 CSV 반입 때 보충해야 한다.

## 검증

- 5,224개 원본 행 모두 한 번씩 매핑. 중복 ID·누락 ID·원본에 없는 ID 0건.
- 기존 9개 컬럼 값 일치. 쉼표·따옴표·줄바꿈·UTF-8 BOM·선행 0 ID를 보존하는 CSV 처리.
- ready 에셋 전체의 파일 존재, PNG 크기, 표시 경계, 경로, SHA-256 검증.
- 제작 대기/형태 확인 상품의 가짜 이미지 경로 0건.
- 묶음 수량 재사용, 넥라인/포장 구분, 모르는 색상·패턴의 잘못된 fallback 방지, API 검색·페이지·잘못된 ID 테스트.
- 게임 에셋 테스트 26개와 review importer 테스트 17개가 통과했다. 기존 앱 테스트, TypeScript 검사, Next.js 프로덕션 빌드도 통과했다. 각 검증 시점은 overnight state의 latestChecks에 기록한다.
- 브라우저에서 실제 상품 사진과 에셋 표시, 상품 번호 검색, 공용 PNG 경로 노출 확인.
- 최신 main 반영 후 전체 테스트와 프로덕션 빌드를 재실행해 통과했다. 등록 에셋의 실제 HTTP 응답과 원본 체크섬을 배치별로 확인한다. 최근 검사 범위와 시점은 overnight state를 따른다. 390×844 / 320×568에서 가로 넘침 0, 다른 공간을 선택한 상태에서 숫자 상품 ID 검색 시 정확한 한 상품이 노출됨을 확인했다.

검토 과정에서 `가방/지갑 → 모든 가방을 지갑`, `음식물처리기 → 식물`, `공기청정기 → 접시`, `베스트상품 → 조끼` 같은 부분 문자열 오분류를 수정했다. UI에서도 숫자 상품 ID 검색 시 기존 공간 필터를 해제해 다른 공간 상품이 숨지 않도록 수정했다.

## 생성 이미지 보관

`app/assets/game-items/`의 생성 PNG와 원본 사진은 Git에 포함하지 않는다. 이미지는 외부 Blob 저장소에 보관하고 미니룸은 `ASSET_API_URL`의 상품 매핑을 통해 가져온다. 새로 clone한 앱은 이미지 파일을 내려받지 않아도 실행할 수 있다. 로컬 에셋 제작·원본 파일 검증·DB 재적재는 별도로 보관한 이미지 파일이 필요하다.
