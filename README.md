# G:Scene Main Screen · Food · Beauty prototype

가상 고객 민서가 구매한 물건으로 채워지는 연결된 2D 원룸 mobile web prototype입니다. 확정 방향은 `docs/ideas/doc03_final_ideation.md`, 구현 명세는 `docs/design/main_screen_spec.md`입니다.

**상품 탭·데이터 작업을 시작하는 팀원은 [공통 상품 DB·API 사용 가이드](docs/design/backend/README.md)를 먼저 확인하세요.** 공개 조회, 로컬 연결, `opt1~opt4` 수정, JSON 등록 예제를 제공합니다.
식품·뷰티의 현재 구현 범위는 `docs/food/implementation.md`, 검증 결과는 `docs/food/review.md`, 추후 브랜치 통합 안내는 `docs/catalog/merge-preparation.md`입니다. `/food` 내 주방과 `/beauty` 내 화장대에서 같은 구매 상품·장바구니 경험을 제공합니다.

## 실행

[배포 앱](https://makmeaning.vercel.app/)은 환경변수 없이 바로 열 수 있습니다. **로컬에서 현재 방·카테고리를 정상 사용하려면 서버 전용 `DATABASE_URL`이 필요합니다.** 먼저 [팀 가이드의 환경 설정](docs/design/backend/README.md#2-로컬에서-상품-탭-개발하기)으로 기존 Vercel 프로젝트의 Development 환경을 `.env.local`에 받아오세요.

Node.js 22.18 이상(배포는 Node.js 24 권장)에서 저장소 루트 기준:

```sh
npm ci
npm run dev
```

브라우저에서 http://127.0.0.1:3000 을 엽니다. Next.js가 기존 방 UI와 `GET /api/demo/home`을 함께 제공합니다.

```sh
npm test
npm run typecheck
npm run build
npm start
# 다른 터미널에서 실제 production 서버와 API/asset 확인
node tests/release-smoke.mjs
```

실행 계약은 `docs/EXECUTION.md`, 제품 방향은 `docs/ideas/doc03_final_ideation.md`입니다.

## 동작

- Scene 입구: 방 아래 `오늘은 뭘 바꾸고 싶어요?`를 눌러 상황(오늘 저녁/욕실/침실/첫 출근/여행 준비)과 예산(3/5/10만원)을 고릅니다. 둘 다 고르면 `이 Scene으로 시작하기`가 활성화됩니다. 선택 요약에서 다시 고르거나 내 방으로 돌아갈 수 있습니다. 이번 데모는 조건 선택까지이며 실제 추천 상품/API는 연결하지 않습니다. 같은 세션에서 선택을 유지하고 데모 초기화 시 지웁니다.
- 캐릭터 바꾸기: MY SCENE 옆 버튼에서 M01 / M02 / F01 / F02 네 모습을 미리 보고 `이 캐릭터로 적용하기`를 누릅니다. 닫기·바깥 탭·Escape는 선택을 취소하며, 입고 있는 옷과 공간 내 위치는 유지됩니다. 선택한 모습은 새로고침 후에도 유지됩니다.
- 바닥 탭: 가구를 피해 목적지까지 걷습니다. 방향키/WASD를 누르고 있으면 연속 이동합니다.
- 가구 탭: 옆까지 걸어간 뒤 방 안에서 실제 동작합니다. 옷장은 열고 뒤적이며, 냉장고는 열어 살펴보고, 소파·화장대에는 앉고, 창문은 밀어 엽니다. 아래의 작은 비모달 tray에서 상품 목록을 펼치거나 접고 동작을 종료합니다. 스탠드는 접근 후 손을 뻗어 조명을 전환하고, 팬트리는 접근 후 식품 패널을 엽니다.
- 동작 전환: 바닥/다른 가구/이동키를 누르면 문을 닫거나 일어난 뒤 새 동작을 시작합니다. Scene·캐릭터 선택도 먼저 정리한 후 열립니다. 창문은 자리를 떠나도 열린 상태를 세션 동안 유지합니다.
- Fashion 옷장: 문 열기·뒤적임 후 옷을 고릅니다. 크림 니트/블루 셔츠를 선택하면 방에서 갈아입고 옷장을 닫습니다.
- Food 냉장고: 문을 연 뒤 상품 이름을 눌러 보관 위치와 잔량을 확인합니다. 확인만으로는 줄지 않으며 `하나 사용하기`에서만 하나 차감합니다. 0이면 사용 불가이고 해당 구매 상품 그림도 사라집니다.
- Living 거실: 구매한 플로어 램프의 조명을 켜고 끕니다.
- Beauty 화장대: 의자에 앉아 세럼/크림을 손으로 가까이 가져온 뒤 꺼내둡니다. 상품을 선택한 후에도 계속 앉아 있으며 일어나기나 새 이동으로 나옵니다.
- localStorage에 공간 상태를 보존하며, 하단 '데모 초기화'로 복원합니다.

구매 이력은 **가상 고객의 데모 상태**이며, 상품 정보는 공통 DB의 상품 ID로 조회합니다. 가격은 카탈로그 참고가이고 그림은 실상품의 정확한 외형이나 가상 피팅이 아닙니다. `/api/demo/home`도 DB를 읽으므로 로컬에서 `DATABASE_URL`을 설정해야 합니다. 실제 로그인·주문·결제는 수행하지 않습니다.

## 데이터와 구성

### 식품·뷰티 페이지

홈 냉장고·팬트리와 화장대는 첫 탭에 기존 생활 동작을 수행하고, 준비된 상태에서 다시 누르면 각각 `/food`, `/beauty`로 이동합니다. 홈 복귀 시 기존 메인의 안전 위치·방향·창문 상태 복원을 사용합니다.

- 최신 메인의 공통 스타일·캐릭터·이동 로직·네 카테고리 SVG 내비게이션을 재사용합니다. 구매 상품을 선택하면 캐릭터가 해당 공간으로 걸어갑니다.
- 구매 상품/장바구니 탭, 선택 체크, 전체 보기, 상품 상세, 상품 찜, 장바구니 수량 변경·삭제·합계를 제공합니다.
- 식품 시나리오·레시피·장면 저장·로컬 추천 규칙을 제거했습니다. 추천 영역은 준비 안내만 표시하며 일반 상품 목록과 구분합니다.
- 상품 원천은 `prd_id`, `view_name`, `price`, `cate1_nm`, `cate2_nm`, `cate3_nm`, `cate4_m`, `brd_mn`, `domain` 9개 컬럼입니다. 용량·사이즈·판매 옵션은 요구하지 않습니다.
- `GET /api/demo/food`, `GET /api/demo/beauty`는 같은 홈 사용자·구매 기록을 사용합니다. 구매 기록을 현재 재고로 간주하지 않습니다.
- 장바구니·찜은 `gscene-catalog-food-v1`, `gscene-catalog-beauty-v1`에 각각 저장합니다. 이전 식품 데이터에서는 홈 장바구니만 복구하며 장면 저장은 상품 찜으로 변환하지 않습니다.

`src/components/catalog/`는 두 화면의 공통 UI, `src/lib/catalog.ts`는 상품·장바구니·저장 복구, `src/data/demo-catalog.ts`는 9컬럼 데모 데이터입니다. `public/catalog-art/`는 두 공간 배경이며 상품 그림은 별도 로컬 표시 자산입니다. 병합 기준과 검증은 `docs/design/food_beauty_merge_review.md`를 참고하세요.

### 기존 홈

- `src/types/home.ts`: 사용자·구매·카테고리·roomSlot의 API contract.
- `src/data/demo-purchases.ts`: 가상 사용자와 카테고리별 보유 상품 ID·초기 상태. `src/data/demo-home.ts`는 테스트용 카탈로그 fixture이며 런타임 DB 오류의 대체 데이터가 아닙니다.
- `app/api/demo/home/route.ts`: `GET /api/demo/home`. 공통 상품 DB에서 상품을 읽어 가상 구매 상태와 연결합니다. 서버 DB 연결이 필요합니다.
- `app/layout.tsx`, `app/page.tsx`: Next.js 호스트. 기존 HTML shell과 스타일을 재사용합니다.
- `app/index.html`, `app/style.css`, `app/app.js`: 방 UI, API 로딩·오류·재시도, 구매 데이터의 공간 표시, 상태 보존.
- `app/avatar.js`, `app/movement.js`, `app/interactions.js`, `app/object-art.js`: 기존 캐릭터·경로 탐색·동작 controller·공간 그림.
- `app/scene-entry.js`: 기존 Scene 조건 선택. 추천은 구현하지 않습니다.
- `public/products/*.svg`: 공간과 구매 목록에서 사용하는 로컬 상품 그림.
- `scripts/prepare-assets.mjs`: 실행/빌드 전에 기존 ES module과 배경을 public에 복사하고 HTML shell을 생성합니다. 생성물은 Git에서 제외합니다.

프런트엔드는 API가 반환하는 사용자·구매 정보를 사용합니다. API 실패 시 재시도를 제공하며, 구매 상태 변경은 이 브라우저의 localStorage에만 저장됩니다. 데모 초기화 시 API 기본 상태로 복원합니다. 시스템 글꼴과 로컬 asset을 사용합니다.

## 검증

`npm test`는 경로/충돌, 실제 입력 handler, 동작 controller, 상품 그림, 홈·식품·뷰티 API contract, 장바구니 수량·금액·저장 복구, 캐릭터 이동, 홈 복귀를 검증합니다. `node tests/release-smoke.mjs`는 실행 중인 production 서버의 홈·식품·뷰티 페이지, API, 상품·공간 이미지, 필수 runtime module을 검증합니다. 배포 주소에서는 `SMOKE_BASE_URL=https://배포주소 node tests/release-smoke.mjs`로 같은 검사를 실행할 수 있습니다.

실제 모바일 화면과 interaction, review → fix → rerun 증거는 `docs/design/main_screen_review.md`에 기록합니다. 자동 검사를 모바일 화면 QA 대신 사용하지 않습니다.

## Vercel

기존 Vercel 프로젝트는 `ww-002-8351s-projects / makmeaning`입니다. Framework Preset은 **Next.js**, Root Directory는 저장소 루트(`.`), 빌드 명령은 `npm run build`입니다. 빌드 자체는 DB 환경변수 없이 가능하지만, 실행 중인 `/api/products`와 `/api/demo/home` 및 이를 사용하는 방·카테고리에는 서버 전용 `DATABASE_URL`이 필요합니다. 기존 프로젝트에는 Neon 연결로 등록되어 있습니다. 기존 `app/` 폴더를 배포 루트로 선택하지 않습니다.

인증된 Vercel CLI에서도 저장소 루트에서 `vercel --prod`로 배포할 수 있습니다. `.vercel/`, `.env*`, token과 인증 파일은 Git에 포함하지 않습니다.

## 팀원 시작하기

```sh
git clone https://github.com/HyoJuJang/makmeaning.git
cd makmeaning
npm ci
git switch -c feat/작업명
npm run dev
```

Node.js 24 LTS를 권장합니다. 저장소 접근 권한이 있는 GitHub 계정을 사용합니다. 기능 브랜치에서 작업하고 main으로 Pull Request를 보내면 GitHub Actions가 테스트·production build·HTTP smoke를 검사합니다. 배포 앱 열람에는 환경변수가 필요 없지만, 로컬 앱 실행에는 DB 연결이 필요합니다. 환경 설정과 상품 API·DB 작업은 [상품 DB·API 가이드](docs/design/backend/README.md)의 연결 절차를 추가로 따릅니다.

데이터 작업은 `src/data/`, `src/types/`, `app/api/`, 화면 작업은 `app/app.js`·`app/style.css`, 캐릭터·동작 작업은 `app/avatar.js`·`app/interactions.js`·`app/movement.js`를 중심으로 나눕니다. 같은 파일을 수정할 때는 담당자끼리 먼저 조율합니다. 현재 방 구현을 교체하지 않고 API contract를 유지하세요.

## Fashion / Living Scene (2026-09-21)

메인 공간의 **Fashion / Living 이름표**, 또는 옷장·소파 사용 중 **추천 보기**를 누르면 `/fashion`, `/living`으로 이동합니다. 가구 자체는 기존 캐릭터 동작을 유지합니다.

- 구매한 상품은 기존 `/api/demo/home`에서 가져옵니다. 작은 픽셀 공간의 번호와 상품 목록이 연결됩니다.
- 구매품·장바구니 상품 선택, 기준 상품 없이 새롭게 둘러보기를 지원합니다.
- 상황 1개, 복수 취향, 새 상품 1개당 예산으로 추천 조건을 적용합니다. 추가 조건에서 종류·직접 예산을 정합니다.
- 예산·종류는 필수 필터이고, 상황·취향·조합은 추천 순서에 반영됩니다. 연결 근거가 있는 경우에만 조합 이유를 표시합니다.
- 상품 상세, 찜, 장바구니 담기·삭제·합계를 지원합니다. 구매와 결제는 진행되지 않습니다.
- 찜·장바구니는 카테고리별 localStorage에 보관되며 메인의 **데모 초기화**로 초기 상태로 돌아갑니다.

추가 API: `GET /api/demo/scenes?category=fashion|living` (입력 누락/오류 400). 상품 14개와 가격은 가상 데이터이며 실제 GS SHOP 상품이 아닙니다. 실제 상품 샘플은 `src/data/demo-scenes.ts`의 계약에 맞춰 교체하면 됩니다. 일반 이미지 URL도 지원합니다. 현재 `public/scene-art/products.png#셀명`은 이전 디자인 시안에서 생성한 이미지의 CSS 스프라이트 표현입니다. 공간 이미지 역시 승인된 이전 픽셀 디자인 자산을 재사용했고, 소유 상품에는 기존 API 이미지와 번호를 겹쳐 표시합니다.

추천 규칙은 `src/lib/scene/recommend.ts`, 공통 화면은 `src/components/scene/ScenePage.tsx`에 있습니다. 실제 추천 모델/회원/주문 연동은 다음 단계입니다. 실행은 기존과 같이 `npm ci`, `npm run build`, `npm start`이며 Vercel 설정은 유지됩니다.

검증: `npm test`, `npm run typecheck`, `npm run build`, 서버 실행 후 `node tests/release-smoke.mjs`. 화면 검수 기록은 `docs/design/category_screen_review.md`를 참고합니다.


## 2026-09-21 통합 데모 상태

- 공통 상품 DB의 상품을 가상 고객 민서의 구매 이력에 연결합니다. 상품 ID와 공간용 그림 키는 분리합니다. 그림·착장은 상품의 정확한 외형이나 가상 피팅이 아니며, 가격은 카탈로그 참고가입니다.
- 확정 착장·데모 식품 사용 횟수·화장대 선택·조명은 동일한 개인 상태로 저장됩니다. Fashion의 보유 의류는 미리보기 후 `내 착장으로 적용`할 수 있습니다. 미리보기 취소/이탈과 미보유 상품의 찜·장바구니는 보유 상태를 바꾸지 않습니다.
- 기존 Fashion/Living 추천은 명시된 가상 상품 예시입니다. Food/Beauty는 동료의 기존 카탈로그를 보존하며 새로운 추천은 추가하지 않았습니다.
- 기존 상품 DB 연결 설정이 필요하며 비밀값은 로컬 `.env.local` / 기존 Vercel 환경에만 둡니다. 연결 실패 시 오류를 표시하며 실상품을 가짜 데이터로 대체하지 않습니다.
- 실행 계약: `docs/design/room_commerce_contract.md`. `SMOKE_BASE_URL=http://127.0.0.1:3000 node tests/release-contract.mjs`로 실제 API/구매/Scene/asset 연결을 검사합니다. `--write-baseline <file>` / `--compare-catalog <file>`은 공통 상품 전체의 읽기 전용 해시 비교입니다.
