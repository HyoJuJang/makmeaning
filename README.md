# G:Scene Main Screen prototype

가상 고객 민서가 구매한 물건으로 채워지는 연결된 2D 원룸 mobile web prototype입니다. 확정 방향은 `docs/ideas/doc03_final_ideation.md`, 구현 명세는 `docs/design/main_screen_spec.md`입니다.

**상품 탭·데이터 작업을 시작하는 팀원은 [공통 상품 DB·API 사용 가이드](docs/design/backend/README.md)를 먼저 확인하세요.** 공개 조회, 로컬 연결, `opt1~opt4` 수정, JSON 등록 예제를 제공합니다.

## 실행

Node.js 22.18 이상(배포는 Node.js 24 권장)에서 저장소 루트 기준:

```sh
npm ci
npm run dev
```

브라우저에서 http://127.0.0.1:3000 을 엽니다. Next.js가 기존 방 UI와 `GET /api/demo/home`을 함께 제공합니다.

```sh
npm test
npm run build
npm start
# 다른 터미널에서 실제 production 서버와 API/asset 확인
node tests/release-smoke.mjs
```

실행 계약은 `docs/EXECUTION.md`, 제품 방향은 `docs/ideas/doc03_final_ideation.md`입니다.

## 동작

- Scene 입구: 방 아래 `오늘은 뭘 바꾸고 싶어요?`를 눌러 상황(오늘 저녁/욕실/침실/첫 출근/여행 준비)과 예산(3/5/10만원)을 고릅니다. 둘 다 고르면 `이 Scene으로 시작하기`가 활성화됩니다. 선택 요약에서 다시 고르거나 내 방으로 돌아갈 수 있습니다. 이번 데모는 조건 선택까지이며 실제 추천 상품/API는 연결하지 않습니다. 같은 세션에서 선택을 유지하고 데모 초기화 시 지웁니다.
- 캐릭터 바꾸기: MY SCENE 옆 버튼에서 숏 컷 / 소프트 웨이브 / 라운드 보브를 미리 보고 `이 캐릭터로 적용하기`를 누릅니다. 닫기·바깥 탭·Escape는 선택을 취소하며, 입고 있는 옷과 공간 내 위치는 유지됩니다. 선택한 모습은 새로고침 후에도 유지됩니다.
- 바닥 탭: 가구를 피해 목적지까지 걷습니다. 방향키/WASD를 누르고 있으면 연속 이동합니다.
- 가구 탭: 옆까지 걸어간 뒤 방 안에서 실제 동작합니다. 옷장은 열고 뒤적이며, 냉장고는 열어 살펴보고, 소파·화장대에는 앉고, 창문은 밀어 엽니다. 아래의 작은 비모달 tray에서 상품 목록을 펼치거나 접고 동작을 종료합니다. 스탠드와 팬트리 직접 탭은 각각 접근 후 기존 상품 패널을 엽니다.
- 동작 전환: 바닥/다른 가구/이동키를 누르면 문을 닫거나 일어난 뒤 새 동작을 시작합니다. Scene·캐릭터 선택도 먼저 정리한 후 열립니다. 창문은 자리를 떠나도 열린 상태를 세션 동안 유지합니다.
- Fashion 옷장: 문 열기·뒤적임 후 옷을 고릅니다. 크림 니트/블루 셔츠를 선택하면 방에서 갈아입고 옷장을 닫습니다.
- Food 냉장고: 문을 연 뒤 상품 이름을 눌러 보관 위치와 잔량을 확인합니다. 확인만으로는 줄지 않으며 `하나 사용하기`에서만 하나 차감합니다. 0이면 사용 불가이고 해당 구매 상품 그림도 사라집니다.
- Living 거실: 구매한 플로어 램프의 조명을 켜고 끕니다.
- Beauty 화장대: 의자에 앉아 세럼/크림을 손으로 가까이 가져온 뒤 꺼내둡니다. 상품을 선택한 후에도 계속 앉아 있으며 일어나기나 새 이동으로 나옵니다.
- localStorage에 공간 상태를 보존하며, 하단 '데모 초기화'로 복원합니다.

구매 상품 9종과 가격은 **가상 고객의 예시 데이터**입니다. 실제 GS SHOP 상품·실제 회원·현재 판매 가격을 의미하지 않습니다. 이 방 데모는 실제 로그인, 구매, 추천, DB를 사용하지 않습니다. 별도 팀 작업으로 추가된 상품 API/DB 코드는 방 데모와 분리되어 있으며, `/api/demo/home`과 방 실행에는 DB 설정이 필요 없습니다.

## 데이터와 구성

- `src/types/home.ts`: 사용자·구매·카테고리·roomSlot의 API contract.
- `src/data/demo-home.ts`: 가상 고객 1명과 Fashion 2 / Food 3 / Living 2 / Beauty 2개의 구매 데이터.
- `app/api/demo/home/route.ts`: `GET /api/demo/home`. 별도 환경변수나 외부 서비스가 필요 없습니다.
- `app/layout.tsx`, `app/page.tsx`: Next.js 호스트. 기존 HTML shell과 스타일을 재사용합니다.
- `app/index.html`, `app/style.css`, `app/app.js`: 방 UI, API 로딩·오류·재시도, 구매 데이터의 공간 표시, 상태 보존.
- `app/avatar.js`, `app/movement.js`, `app/interactions.js`, `app/object-art.js`: 기존 캐릭터·경로 탐색·동작 controller·공간 그림.
- `app/scene-entry.js`: 기존 Scene 조건 선택. 추천은 구현하지 않습니다.
- `public/products/*.svg`: 공간과 구매 목록에서 사용하는 로컬 상품 그림.
- `scripts/prepare-assets.mjs`: 실행/빌드 전에 기존 ES module과 배경을 public에 복사하고 HTML shell을 생성합니다. 생성물은 Git에서 제외합니다.

프런트엔드는 API가 반환하는 사용자·구매 정보를 사용합니다. API 실패 시 재시도를 제공하며, 구매 상태 변경은 이 브라우저의 localStorage에만 저장됩니다. 데모 초기화 시 API 기본 상태로 복원합니다. 시스템 글꼴과 로컬 asset을 사용합니다.

## 검증

`npm test`는 경로/충돌, 실제 입력 handler, 동작 controller, 상품 그림, API contract를 검증합니다. `node tests/release-smoke.mjs`는 실행 중인 production 서버의 페이지/API/9개 상품 이미지/필수 runtime module을 검증합니다. 배포 주소에서는 `SMOKE_BASE_URL=https://배포주소 node tests/release-smoke.mjs`로 같은 검사를 실행할 수 있습니다.

실제 모바일 화면과 interaction, review → fix → rerun 증거는 `docs/design/main_screen_review.md`에 기록합니다. 자동 검사를 모바일 화면 QA 대신 사용하지 않습니다.

## Vercel

기존 Vercel 프로젝트는 `ww-002-8351s-projects / makmeaning`입니다. Framework Preset은 **Next.js**, Root Directory는 저장소 루트(`.`), 빌드 명령은 `npm run build`입니다. 방 데모와 빌드는 DB 환경변수 없이 실행되며, `/api/products`에는 서버 전용 `DATABASE_URL`이 필요합니다. 기존 프로젝트에는 Neon 연결로 등록되어 있습니다. 기존 `app/` 폴더를 배포 루트로 선택하지 않습니다.

인증된 Vercel CLI에서도 저장소 루트에서 `vercel --prod`로 배포할 수 있습니다. `.vercel/`, `.env*`, token과 인증 파일은 Git에 포함하지 않습니다.

## 팀원 시작하기

```sh
git clone https://github.com/HyoJuJang/makmeaning.git
cd makmeaning
npm ci
git switch -c feat/작업명
npm run dev
```

Node.js 24 LTS를 권장합니다. 저장소 접근 권한이 있는 GitHub 계정을 사용합니다. 기능 브랜치에서 작업하고 main으로 Pull Request를 보내면 GitHub Actions가 테스트·production build·HTTP smoke를 검사합니다. 방 데모 실행에는 인증 정보나 환경변수가 필요하지 않습니다. 로컬 상품 API·DB 작업은 [상품 DB·API 가이드](docs/design/backend/README.md)의 연결 절차를 추가로 따릅니다.

데이터 작업은 `src/data/`, `src/types/`, `app/api/`, 화면 작업은 `app/app.js`·`app/style.css`, 캐릭터·동작 작업은 `app/avatar.js`·`app/interactions.js`·`app/movement.js`를 중심으로 나눕니다. 같은 파일을 수정할 때는 담당자끼리 먼저 조율합니다. 현재 방 구현을 교체하지 않고 API contract를 유지하세요.
