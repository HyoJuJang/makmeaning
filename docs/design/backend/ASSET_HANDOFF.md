# 게임 에셋 연결·인수인계

미니룸 앱은 **상품 DB에서 구매 상품을 읽고, 에셋 API에서 같은 `prd_id`의 이미지를 조회**한다. 기존 운영 환경에 연결하는 개발자는 새 DB·Blob 저장소·Vercel 프로젝트를 만들거나 데이터를 다시 적재할 필요가 없다. 기존 프로젝트 접근 권한과 환경 변수만 전달받으면 된다.

이 문서의 `<...>`는 자리표시자다. 실제 서비스 주소·DB 접속 문자열·계정 및 프로젝트 식별자는 문서나 Git에 저장하지 않고 담당자에게 별도로 받는다. `.env.local`도 커밋하지 않는다.

## 1. 미니룸 앱에서 연결하기

Node.js 22.18 이상을 사용한다. 저장소 루트의 `.env.local`에 다음 두 값을 설정한다.

```dotenv
DATABASE_URL=<PRODUCT_DATABASE_CONNECTION_STRING>
ASSET_API_URL=<ASSET_SERVICE_HTTPS_ORIGIN>
```

- `DATABASE_URL`: 상품 DB 연결 문자열. 상품명·가격 등 기존 상품 데이터 조회에 사용한다.
- `ASSET_API_URL`: 에셋 서비스의 HTTPS origin. `/api/...` 경로·쿼리·인증 정보는 붙이지 않는다.
- 두 변수는 **서버 전용**이며 `NEXT_PUBLIC_` 접두사를 붙이지 않는다.
- 앱 소비자는 `ASSET_DATABASE_URL`이나 Blob 쓰기 토큰을 받지 않아도 된다.

권한이 있는 기존 **미니룸 앱 프로젝트**에서 설정을 내려받을 수도 있다. 아래 식별자는 담당자가 전달한 앱용 값으로 바꾼다. 환경 변수 파일이 이미 있다면 필요한 로컬 설정을 먼저 보관한다.

```sh
npx vercel login
npx vercel link --yes --scope <APP_TEAM_SLUG> --project <APP_PROJECT_NAME>
npx vercel env pull .env.local --environment=development --scope <APP_TEAM_SLUG>
npm ci
npm run dev
```

Vercel 환경에 `ASSET_API_URL`이 아직 없다면 담당자가 추가한 뒤 다시 받거나 로컬 파일에 별도 전달값을 설정한다. 앱을 배포할 때는 실제 배포 대상인 Preview/Production에도 두 변수를 설정하고 다시 배포한다. 로컬 파일 변경만으로 배포 환경은 바뀌지 않는다.

이 저장소에는 `src/lib/runtime-game-assets.ts`와 데모 API의 연결 코드가 포함돼 있다. 환경 변수가 적용되면 구매 상품의 ID를 묶어서 조회하고, 같은 ID와 카테고리에 해당하는 준비된 에셋만 연결한다. 서비스 장애는 오류로 알리며 준비된 이미지가 있는 것처럼 처리하지 않는다.

## 2. 다른 앱에서 API 사용하기

서버에서 `GET /api/game-assets/resolve?ids=<PRD_ID_1>,<PRD_ID_2>`를 호출한다. `ASSET_API_URL`을 기준으로 경로를 붙인다. API는 읽기 전용이며 DB 비밀번호를 요청에 넣지 않는다. 브라우저 간 직접 호출보다 앱 서버를 통한 연결을 사용한다.

응답의 `products`를 배열 순서가 아닌 **문자열 `prd_id`**로 연결한다. 상품 ID를 숫자로 변환하지 않는다.

| 응답 | 앱 처리 |
|---|---|
| `status: "ready"` + `asset` 존재 | `asset.url`의 이미지와 `frame`, `anchor`, `placement`를 사용한다. |
| `pending_generation` 또는 `needs_review` | `asset:null`을 유지하고 기본 그림을 사용한다. |
| 요청 ID가 `missingIds`에 포함 | 매핑 대상에 없는 상품이다. 기본 그림을 사용한다. |
| HTTP 400 | 요청 ID 형식을 수정한다. |
| HTTP 503 또는 네트워크 오류 | 서비스/설정 장애로 처리한다. 미연결 상품 상태와 구분한다. |

한 번에 **중복 없는 숫자 문자열 ID 1~50개**만 전송한다. 50개를 넘으면 나눠 호출하고 빈 목록은 호출하지 않는다. 에셋이 없더라도 상품명·가격·구매 수량·구매 여부를 제거하거나 변경하지 않는다. 여러 상품이 같은 에셋을 공유하는 것은 정상이다.

단건 확인은 `GET /api/game-assets/products/<PRD_ID>`, 목록 확인은 `GET /api/game-assets?limit=2`를 사용한다. 단건에서 없는 ID는 404지만 알려진 미연결 상품은 200과 `asset:null`을 반환한다. 전체 계약은 [DB/API 설명](./GAME_ASSETS.md)을 참고한다.

## 3. 에셋 DB를 직접 관리하는 경우

이 절은 에셋 서비스 운영자용이다. 일반 앱 연결에는 필요하지 않다.

```dotenv
ASSET_DATABASE_URL=<ASSET_DATABASE_CONNECTION_STRING>
ASSET_BASE_URL=<PUBLIC_BLOB_HTTPS_ORIGIN>
```

`ASSET_DATABASE_URL`은 상품 DB와 **분리된 에셋 DB**를 가리켜야 한다. `DATABASE_URL`을 대체값으로 사용하지 않는다. 에셋 조회는 `game_assets`, `product_game_assets`, `game_asset_imports`에만 의존하며 상품 테이블을 생성·수정하지 않는다. 조회 서비스와 적재 작업에 필요한 DB 권한을 구분해 관리할 수 있다.

`ASSET_BASE_URL`은 공개 Vercel Blob store의 origin만 허용하며 `/assets/...` 경로는 붙이지 않는다. DB에는 상대 경로를 저장하고 응답에서만 이 origin을 붙인다. 값이 없으면 상대 URL을 반환하므로 이미지 정적 경로를 직접 제공하는 구성에만 생략한다. 현재처럼 API와 이미지 저장소를 분리한 구성에서는 설정한다.

```sh
npm ci
npm run assets:build
npm run db:assets:migrate -- --check
npm run db:assets:import -- --check
npm run test:asset-db
```

`--check`는 SQL/입력 데이터와 PNG 파일을 검증하는 단계로, **실제 DB 접속 성공을 검증하지 않는다**. Import는 `src/generated/product-asset-map.json`과 해당 PNG의 SHA-256/크기까지 검사한다. 기존 DB에 연결만 하려는 경우에는 아래 적용 명령을 실행하지 않는다.

새 스키마나 승인된 매핑 갱신을 운영 DB에 반영하는 담당자는 대상 DB를 확인한 후 실행한다.

```sh
npm run db:assets:migrate -- --apply
npm run db:assets:import -- --apply
```

`--apply`만 DB를 변경한다. Import는 트랜잭션과 잠금을 사용하며 재실행할 수 있는 upsert다. 입력에 없는 기존 행은 자동 삭제하지 않는다. 상품 DB용 `db:seed`, `db:import`는 에셋 연결에 필요하지 않다.

## 4. 에셋 API만 다시 배포하기

저장소 루트에서 실행한다.

```sh
npm run assets:api:prepare
```

생성된 별도 배포 폴더 `../work/vercel-asset-api`에서 **에셋 API용 프로젝트**로 연결한다. 앱 루트에 에셋 프로젝트를 연결하지 않는다.

```sh
cd ../work/vercel-asset-api
npx vercel link --yes --scope <ASSET_TEAM_SLUG> --project <ASSET_PROJECT_NAME>
npm ci
npm run build
npx vercel --prod --yes --scope <ASSET_TEAM_SLUG>
```

배포 전에 해당 프로젝트의 대상 환경에 `ASSET_DATABASE_URL`과 `ASSET_BASE_URL`을 설정한다. API 코드를 바꿀 때마다 원본 저장소에서 prepare를 다시 실행한다. 생성 폴더를 직접 수정해서 별도 구현으로 유지하지 않는다.

이 배포에는 DB 데이터나 PNG 파일이 포함되지 않는다. **DB 적재, Blob 이미지 업로드, API 배포, 미니룸 앱 배포는 각각 별도 작업**이다. 재배포만으로 미완성 에셋이 생성되거나 새 구매 내역이 추가되지 않는다. 이미지 갱신 담당자는 DB의 상대 경로와 같은 Blob 경로로 PNG를 올리고, 같은 에셋 ID의 파일을 바꾸면 해시·매핑·캐시도 함께 관리한다.

## 5. 연결 완료 확인

1. 준비된 상품 ID로 단건 API가 200을 반환하고, 응답 이미지가 실제로 열린다.
2. 준비 중인 상품은 `asset:null`, 대상 밖 ID는 단건 404 또는 bulk `missingIds`로 구분된다.
3. 미니룸에서 구매 상품의 ID·수량이 유지되고 준비된 이미지가 올바른 공간에 보인다.
4. `npm test`와 `npm run build`가 통과한다. 실제 DB/API 조회와 모바일 화면 확인도 수행한다.
5. Git 변경 목록에 `.env*` 실설정 파일, DB 접속 문자열, 업로드 토큰, 실제 환경 주소가 포함되지 않는다.

에셋 서비스가 503이면 운영자는 `ASSET_DATABASE_URL`, DB 권한, 마이그레이션 적용 상태를 확인한다. 이미지가 열리지 않으면 Blob 업로드 경로와 `ASSET_BASE_URL`을 확인한다. 상품 DB 연결에 성공한 것만으로 에셋 API 연결까지 성공한 것은 아니다.

## 생성 이미지 보관

`app/assets/game-items/`의 생성 PNG와 원본 사진은 Git에 포함하지 않는다. 이미지는 외부 Blob 저장소에 보관하고 미니룸은 `ASSET_API_URL`의 상품 매핑을 통해 가져온다. 새로 clone한 앱은 이미지 파일을 내려받지 않아도 실행할 수 있다. 로컬 에셋 제작·원본 파일 검증·DB 재적재는 별도로 보관한 이미지 파일이 필요하다.
