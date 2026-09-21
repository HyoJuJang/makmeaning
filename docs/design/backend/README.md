# 팀 공통 상품 저장소

기준 명세는 [tables.md](tables.md)입니다. Vercel에 연결한 Neon PostgreSQL의 `public.products`를 사용하고, Next.js API를 통해 상품을 조회합니다. 기존 `/api/demo/home`과 방의 가상 구매 데이터는 별도로 유지합니다.

## 컬럼 규칙

- `prd_id`: 문자열 기본키. 상품 코드의 앞자리 0을 보존합니다.
- `view_name`: 필수 상품명.
- `cate1_nm`~`cate4_nm`, `brand_name`: 값이 없으면 `NULL`입니다.
- `discprice`: 원 단위 0 이상의 정수입니다. 쉼표가 있는 원본 가격은 가져올 때 숫자로 변환합니다.
- `domain`: `fashion`, `food`, `living`, `beauty` 중 하나입니다.
- `opt1`~`opt4`: 팀에서 채우는 자유 텍스트이며 초기값은 `NULL`입니다.

샘플의 `brd_nm`은 `brand_name`, `price`는 `discprice`로 정규화합니다. 샘플 5개를 그대로 등록하며, 문서의 상품 분류를 임의 변경하거나 없는 Beauty 상품을 만들지 않습니다.

## 로컬 준비와 테이블 생성

Node.js 24와 저장소 루트 기준입니다. DB 접속 정보는 Vercel 프로젝트 접근 권한이 있는 팀원만 가져옵니다.

```sh
npm ci
vercel link
vercel env pull .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

SQL 원본은 `db/migrations/001_products.sql`입니다. 마이그레이션은 테이블을 삭제하지 않습니다. 샘플 등록을 반복해도 이미 있는 상품은 갱신하지 않습니다. 마이그레이션과 샘플 등록은 배포 때마다 자동 실행되지 않으며, 명시적으로 실행합니다.

## 팀 상품 파일 등록

JSON 배열의 각 상품에 `prd_id`, `view_name`, `discprice`(또는 `price`), `domain`을 넣습니다. 나머지 컬럼은 선택입니다. 먼저 파일 전체를 검사한 뒤 등록합니다.

```sh
npm run db:import -- path/to/products.json --check
npm run db:import -- path/to/products.json
```

등록은 상품 코드 기준으로 추가·갱신하며 전체 파일을 하나의 트랜잭션으로 처리합니다. 기존 상품의 선택 컬럼을 생략하면 기존 값이 보존되고, `null` 또는 빈 문자열을 명시하면 해당 값이 비워집니다. 같은 파일 안의 중복 상품 코드는 거부합니다.

## 조회 API

```text
GET /api/products
GET /api/products?domain=fashion&limit=50&offset=0
GET /api/products?q=코튼
GET /api/products/1000000060
```

목록은 `{ products, pagination: { limit, offset, total } }`를 반환합니다. 가격은 JSON 숫자로 반환합니다. 잘못된 필터는 400, 없는 상품은 404, DB 미연결은 503입니다. DB 주소와 오류 세부 정보는 응답에 노출하지 않습니다.

상품 조회는 앱에서 사용할 수 있는 공개 API입니다. 쓰기 API는 공개하지 않습니다. 데이터 편집은 Vercel Storage에서 연결된 Neon SQL Editor나 허가된 DB 접속을 사용합니다.

```sql
UPDATE public.products
SET opt1 = '출근룩', opt2 = '봄'
WHERE prd_id = '1000000660';
```

`DATABASE_URL`은 서버에서만 사용합니다. `.env.local`과 DB 접속 문자열을 Git 또는 프런트엔드 코드에 넣지 않습니다. API 코드의 DB 연결은 요청 시점에 생성되므로 DB 접속 정보가 없어도 프로젝트를 빌드할 수 있습니다.

## 검증

```sh
npm run test:products
npm run build
```

실제 DB 연결 후 마이그레이션·샘플 등록·상품 수/컬럼/필터 조회를 별도로 확인합니다. Unit test 통과를 실제 DB 생성 완료로 간주하지 않습니다.
