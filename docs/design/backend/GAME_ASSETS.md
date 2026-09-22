# 별도 게임 에셋 DB와 읽기 API

상품 카탈로그 DB와 독립된 에셋 전용 데이터베이스에 공용 픽셀 이미지의 메타데이터와 상품 ID 매핑을 저장한다. PNG 파일은 기존 정적 경로를 유지하며 DB에는 넣지 않는다. 상품의 `public.products` 테이블에는 읽기·쓰기·외래 키를 만들지 않는다.

## 연결 개요

처음 연결하는 개발자는 [연결·인수인계 가이드](./ASSET_HANDOFF.md)를 따른다. 이 문서에는 실제 서비스 주소, DB 접속 문자열, 계정·프로젝트 식별자를 기록하지 않는다. 환경별 값은 담당자에게 별도로 전달받거나 접근 권한이 있는 Vercel 프로젝트에서 받는다.

- **미니룸 앱**: 상품 DB에서 구매 상품을 읽고, 별도 에셋 API를 호출해 `prd_id`로 연결한다.
- **에셋 API**: 상품 DB와 분리된 에셋 전용 DB에서 이미지 메타데이터와 매핑만 읽는다.
- **이미지 저장소**: PNG를 공개 Vercel Blob 경로로 제공한다. DB에는 파일 대신 상대 경로와 검증 정보를 저장한다.

미니룸 앱의 서버에는 기존 상품 `DATABASE_URL`과 `ASSET_API_URL`이 필요하다. 에셋 DB 접속 문자열과 Blob 쓰기 토큰은 소비 앱에 전달하지 않아도 된다.

```dotenv
DATABASE_URL=<PRODUCT_DATABASE_CONNECTION_STRING>
ASSET_API_URL=<ASSET_SERVICE_HTTPS_ORIGIN>
```

조회 우선순위는 `ASSET_API_URL` → `ASSET_DATABASE_URL` → 로컬 manifest다. 설정한 서비스가 실패하면 오류를 표시하며 로컬 데이터로 성공한 것처럼 바꾸지 않는다. 알려진 미연결 상품이나 대상 CSV에 없는 상품은 `gameAsset:null`로 두고 기존 공간 그림을 유지한다.

에셋 API 배포와 미니룸 앱 배포는 별개다. 앱 통합 시 이 브랜치의 런타임 변경과 앱 환경 변수를 함께 반영하고, 보유 상품 수와 구매 정보는 앱의 구매 데이터 기준으로 유지한다.

## 연결과 데이터 계약

- 서버 환경 변수: `ASSET_DATABASE_URL`. `DATABASE_URL` / `POSTGRES_URL`은 대체 연결로 사용하지 않는다. 클라이언트 환경 변수로 노출하지 않는다.
- `public.game_assets`: `asset_id`, `domain`, `family_id`, `version`, `sha256`, 허용된 공개 필드만 담은 `metadata` JSONB.
- `public.product_game_assets`: 문자열 `prd_id`, `domain`, `status`, `family_id`, nullable `asset_id`, `reasons` JSONB.
- `ready`에만 `asset_id`가 존재한다. `pending_generation`과 `needs_review`는 명시적인 미연결이며 에셋은 `null`이다.
- `(asset_id, domain, family_id)` 외래 키가 잘못된 카테고리/형태 연결을 방지한다. 상품 ID 앞의 0도 유지한다.
- `public.game_asset_imports`: 입력 파일 SHA-256과 검증된 개수. 생성 프롬프트, 원본 로컬 경로, 승인 상품 ID 목록은 적재하거나 API에 반환하지 않는다.

`getAssetRepository()`는 `list`, `find`, `findMany`, `findAsset` 메서드를 제공한다. `findMany(ids)`는 최대 50개의 중복 없는 숫자 문자열을 받아 **존재하는 항목만 요청 순서대로** 돌려준다. 빈 배열은 빈 결과이며 데이터 조회를 하지 않는다. 호출 측에서는 `prd_id`를 키로 연결한다. 일반 상품 DB 접근을 이 모듈에 결합하지 않는다.

공개 매핑 형태:

```json
{
  "prd_id": "1083830467",
  "domain": "fashion",
  "status": "ready",
  "familyId": "shirt",
  "assetId": "shirt--shirt-white",
  "reasons": [],
  "asset": {
    "id": "shirt--shirt-white",
    "domain": "fashion",
    "familyId": "shirt",
    "url": "/assets/game-items/v1/fashion/shirt/shirt-white.png",
    "status": "ready"
  }
}
```

위 예시의 `asset`은 축약했다. 실제 응답에는 `color`, `pattern`, `label`, `version`, `width`, `height`, `frame`, `anchor`, `placement`, `sha256`도 포함한다. `sourcePath`는 포함하지 않는다.

## API

| GET 경로 | 동작 |
|---|---|
| `/api/game-assets?domain=fashion&status=ready&limit=24&offset=0` | 상품 매핑 목록과 `{limit,offset,total}`. 기본 limit 24, 최대 100. |
| `/api/game-assets/products/1083830467` | `{product}`. 목록에 없는 ID는 404, 미연결 상품은 200과 `asset:null`. |
| `/api/game-assets/resolve?ids=1083830467,1113622242` | `{products,missingIds}`. 최대 50개. 중복·공백·빈 ID는 400. |
| `/api/game-assets/assets/shirt--shirt-white` | `{asset}`. 없는 에셋 ID는 404. |

리스트는 원본 문자열 ID의 고정 순서로 정렬하고 조회/개수를 동일 읽기 스냅샷에서 계산한다. 페이지를 넘는 offset은 빈 products와 전체 개수를 반환한다. 모든 응답은 `Cache-Control: no-store`. 잘못된 입력은 DB 연결 전에 400으로 거부한다. DB 미설정은 `ASSET_DATABASE_NOT_CONFIGURED`, DB 장애/데이터 불일치는 `ASSET_DATABASE_UNAVAILABLE`로 안전한 503을 반환한다. DB 호스트·접속 문자열·SQL·드라이버 오류는 공개하지 않는다.

## 로컬 검증과 적용

Node.js 22.18 이상에서 실행한다. 두 CLI 모두 기본이 검증 모드이고 **명시적인 `--apply`에만 DB를 변경**한다.

```sh
node scripts/asset-db-migrate.mjs --check
node scripts/asset-db-import.mjs --check
node --test tests/asset-db-api.test.mjs tests/asset-db-import.test.mjs
```

입력 기본값은 `src/generated/product-asset-map.json`. Import 검증은 중복 ID·상태·미지의 에셋·카테고리/형태 불일치·요약 개수·각 PNG의 실제 SHA-256/크기까지 확인한다. 검증은 이미지 파일을 변경하지 않는다.

배포 담당자가 **별도 DB의 `ASSET_DATABASE_URL`을 주입한 환경에서만** 적용한다.

```sh
node --env-file-if-exists=.env.local scripts/asset-db-migrate.mjs --apply
node --env-file-if-exists=.env.local scripts/asset-db-import.mjs --apply
```

두 작업은 같은 트랜잭션 범위 advisory lock을 사용한다. Import의 전체 assets → product mappings → import metadata를 단일 트랜잭션으로 반영하므로 실패 시 부분 적재가 남지 않는다. 동일 파일 재실행은 내용이 달라진 행만 갱신하는 idempotent upsert다. 입력 파일에 없는 기존 행을 자동 삭제하지 않는다. 의도적인 에셋/상품 삭제는 별도 검토가 필요하다.

마이그레이션은 재실행 가능하며 상품 DB 연결 변수에 접근하지 않는다. 서비스의 DB 역할에는 필요 범위의 SELECT만 부여하고 마이그레이션·import는 별도 쓰기 권한으로 운영할 수 있다. API는 SQL SELECT만 실행하며 임의 쓰기 경로를 제공하지 않는다.

## 배포 검증 범위

DB/API와 정적 PNG 배포는 별개다. DB 적재 후에도 API가 반환하는 이미지 URL에서 PNG가 실제로 열리는지 확인해야 한다. 별도 API 서비스에서는 PNG를 묶어 배포하지 않으므로 Blob 업로드와 `ASSET_BASE_URL` 설정이 필요하다. 상대 URL을 사용하는 구성에서는 소비 앱이 해당 정적 경로를 제공해야 한다. 미니룸은 서버의 bulk `findMany` 결과에서 `ready` 에셋만 연결하고 미연결 상태를 준비 완료로 승격하지 않는다. 실제 DB 접속·배포·브라우저 검수는 별도 실행 결과로 기록한다.


## 독립 API 서비스와 Blob 이미지

`ASSET_BASE_URL`은 선택적인 서버 환경 변수다. `https://<store>.public.blob.vercel-storage.com` 형태의 공개 Vercel Blob store origin만 허용한다. 사용자 이름·비밀번호·다른 호스트·추가 경로·쿼리·fragment는 거부한다. 설정이 없으면 기존 상대 URL을 반환한다. 설정이 있으면 API repository가 **응답의 `asset.url`만** 절대 URL로 바꾸며 DB metadata, PNG 원본, `prd_id`, 에셋 ID와 상태는 그대로 유지한다. DB의 상대 경로 검증도 유지한다.

API만 별도 Vercel 프로젝트에 배포할 때:

```sh
node scripts/prepare-asset-api-service.mjs
```

기본 출력은 프로젝트 상위의 `work/vercel-asset-api`이다. 준비 스크립트는 매번 `app/api/game-assets/**`, `src/lib/asset-db/**`, 타입 파일을 원본에서 복사하며 별도 API 구현을 수작업으로 유지하지 않는다. 허용 목록 밖 상대 import나 source symlink는 거부한다. 상품 DB 코드·CSV·생성 매핑·PNG·프롬프트·원본 사진은 포함하지 않는다. 기존 출력의 `.vercel` 프로젝트 연결과 운영자가 관리하는 `.env*`는 덮어쓰거나 읽지 않으며, `.vercelignore`가 비밀 파일을 배포에서 제외한다.

로컬 build 검증에만 기존 설치 의존성을 잠시 재사용할 수 있다.

```sh
node scripts/prepare-asset-api-service.mjs --link-dependencies
# work/vercel-asset-api 안에서 npm run build
node scripts/prepare-asset-api-service.mjs
```

마지막 기본 prepare는 임시 `node_modules` symlink를 제거한다. 배포 플랫폼은 출력의 package.json과 저장소의 `services/asset-api/package-lock.json`에서 복사한 lock 파일로 의존성을 설치한다. 원본 저장소 package.json, 환경 변수, Next 설정은 준비 과정에서 수정하지 않는다. 별도 프로젝트에는 `ASSET_DATABASE_URL`과 `ASSET_BASE_URL`을 서버 환경 변수로 설정하고 Blob에 업로드된 경로가 DB의 `/assets/game-items/v1/...png`와 일치하는지 확인한다.
