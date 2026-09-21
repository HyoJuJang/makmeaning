# 팀 공통 상품 DB·API 사용 가이드

상품 탭 개발자는 조회 API를, 데이터 담당자는 SQL Editor 또는 JSON 등록 명령을 사용합니다. 원본 명세는 [tables.md](tables.md), 코드의 타입은 [Product](../../../src/types/product.ts)입니다.

## 어떤 작업부터 할까요?

| 하려는 일 | 시작 방법 | 필요한 권한 |
| --- | --- | --- |
| 상품 데이터 확인 | 아래 공개 URL을 브라우저·curl·Postman으로 조회 | 없음 |
| 이 저장소에서 상품 탭 개발 | 로컬 DB 연결 후 상대 경로 `/api/products` 호출 | GitHub 저장소 + DB 연결 정보 접근 |
| 상품·`opt1~opt4` 수정 | Neon SQL Editor 또는 `npm run db:import` | 해당 Vercel/Neon DB 접근 |

**Production·Preview·Development·연결된 로컬 앱이 같은 DB를 사용합니다.** 로컬에서 저장한 변경도 팀 공통 데이터에 반영됩니다. Git 브랜치를 나눠도 DB가 분리되지는 않습니다.

테이블과 상품 데이터는 이미 등록되어 있습니다. 신규 팀원이 다시 만들 필요는 없습니다. **2026-09-21 CSV 6,031건을 추가해 기존 5건을 포함한 총 6,036건**을 확인했습니다. 분류별 건수·원본 파일·검증 결과는 [상품 데이터 등록 이력](DATA_IMPORTS.md)에 기록합니다. 이후 변경된 실제 건수는 API의 `pagination.total`에서 확인하세요.

## 1. 바로 조회하기

- [전체 상품](https://makmeaning.vercel.app/api/products)
- [Fashion 상품](https://makmeaning.vercel.app/api/products?domain=fashion)
- [Food 상품](https://makmeaning.vercel.app/api/products?domain=food)
- [상품 한 건](https://makmeaning.vercel.app/api/products/1000000660)

```sh
curl --fail --silent --show-error 'https://makmeaning.vercel.app/api/products?domain=fashion&limit=20&offset=0'
curl --fail --silent --show-error --get 'https://makmeaning.vercel.app/api/products' --data-urlencode 'q=코튼'
```

아래는 최초 샘플만 등록했을 때의 `GET /api/products?domain=food` 응답으로, 응답 구조를 설명하기 위한 예시입니다. 실제 CSV 등록 후 Food는 1,607건이며, 최신 값과 개수는 API에서 확인하세요.

```json
{
  "products": [
    {
      "prd_id": "1000000643",
      "view_name": "마르티넬리 사과주스 스파클링 296ml 24개 애플주스 애플데이",
      "cate1_nm": "음료",
      "cate2_nm": "과일/야채음료",
      "cate3_nm": null,
      "cate4_nm": null,
      "brand_name": "기타브랜드",
      "discprice": 72900,
      "domain": "food",
      "opt1": null,
      "opt2": null,
      "opt3": null,
      "opt4": null
    }
  ],
  "pagination": { "limit": 50, "offset": 0, "total": 1 }
}
```

목록은 `{ products, pagination }`, 단건 `GET /api/products/:prdId`는 `{ product }`를 반환합니다. 목록은 `prd_id` 문자열 오름차순이고, `total`은 필터에 해당하는 전체 개수입니다.

| 목록 쿼리 | 기본값 | 규칙 |
| --- | --- | --- |
| `domain` | 전체 분류 | `fashion`, `food`, `living`, `beauty` 중 하나 |
| `q` | 검색 없음 | 상품명·브랜드명 부분 검색, 대소문자 구분 없음. 앞뒤 공백 제거 후 최대 100자. `%`, `_`도 일반 문자로 검색 |
| `limit` | `50` | 1~100 정수 |
| `offset` | `0` | 0~10000 정수. 다음 페이지는 현재 `offset + limit` |

필터는 함께 사용할 수 있습니다. 정의되지 않은 쿼리나 같은 키를 중복 전달하면 400입니다. 가격은 원 단위 JSON 숫자이며 상품 코드는 문자열입니다. 조회 응답은 `Cache-Control: no-store`이므로 DB 변경은 다음 조회에서 확인할 수 있습니다.

## 2. 로컬에서 상품 탭 개발하기

Node.js 24와 저장소 루트를 기준으로 합니다. 아직 저장소가 없다면 먼저 받습니다.

```sh
git clone https://github.com/HyoJuJang/makmeaning.git
cd makmeaning
git switch -c feat/my-product-tab
npm ci
```

프로젝트 접근 권한이 있는 Vercel 계정으로 로그인하고 **기존** 프로젝트를 연결합니다. 아래 CLI 버전은 현재 프로젝트 연결에 사용한 버전입니다.

```sh
npx --yes vercel@59.23.2 login
npx --yes vercel@59.23.2 link --yes --team ww-002-8351s-projects --project makmeaning
npx --yes vercel@59.23.2 env pull .env.local --scope ww-002-8351s-projects
npm run dev
```

[로컬 상품 API](http://127.0.0.1:3000/api/products)를 열어 JSON이 나오면 연결 완료입니다. 프로젝트가 보이지 않으면 프로젝트 담당자에게 접근 권한을 요청하세요. `.env.example`은 형식 예시이며 실제 접속 정보가 아닙니다.

이 저장소의 프런트엔드에서는 **상대 경로**로 호출합니다.

```js
export async function loadProducts(domain = 'fashion') {
  const query = new URLSearchParams({ domain, limit: '20', offset: '0' });
  const response = await fetch(`/api/products?${query}`, { cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error?.message ?? '상품을 불러오지 못했습니다.');
  }
  return body; // { products, pagination }
}
```

`products`가 빈 배열이면 빈 상태를 표시하고, `null`인 선택 컬럼에는 기본 문구·표시 생략을 적용하세요. TypeScript에서는 저장소의 `Product` 타입을 재사용할 수 있습니다.

현재 API는 다른 출처의 브라우저 요청을 위한 CORS 허용 헤더를 보내지 않습니다. localhost 화면에서 배포 API의 절대 URL을 직접 `fetch`하면 브라우저가 차단하므로, 위처럼 로컬 API를 연결하세요. 별도 프로젝트에서는 자신의 서버에서 API를 호출해 전달할 수 있습니다. 주소창·curl·서버 측 조회에는 이 브라우저 제약이 적용되지 않습니다.

방의 `/api/demo/home`은 가상 사용자·구매 상품 9건·공간 위치를 제공하고, `/api/products`는 공통 상품 카탈로그를 제공합니다. 상품 테이블에는 이미지 URL·`roomSlot`·구매 여부가 없으므로, 상품을 등록한다고 방에 자동 표시되지는 않습니다.

## 3. 상품 데이터와 opt 컬럼 수정하기

### opt 값만 바꾸기: SQL Editor

[Vercel DB 관리 화면](https://vercel.com/d/dashboard/integrations/neon/icfg_Hk1mPw8H4oDCw1If77gYLqaC/resources/store_KICG3jqn8kUycZ6a)에서 연결된 Neon 콘솔의 SQL Editor를 엽니다. 먼저 담당 상품을 조회하고, 바꿀 컬럼만 지정합니다.

```sql
SELECT prd_id, view_name, domain, opt1, opt2, opt3, opt4
FROM public.products
WHERE prd_id = '1000000660';

UPDATE public.products
SET opt1 = '출근룩'
WHERE prd_id = '1000000660'
RETURNING prd_id, opt1, opt2, opt3, opt4;
```

이 예시는 해당 상품의 `opt1`만 바꿉니다. 값을 지우려면 `SET opt1 = NULL`을 사용합니다. `opt1~opt4`의 의미는 아직 정해져 있지 않으므로 사용하는 컬럼·값의 의미를 팀과 합의하고 이 가이드에 기록하세요. `opt` 값도 공개 조회 API에 나오므로 상품 화면에 사용할 정보만 넣습니다.

### 여러 상품 등록·수정하기: JSON 파일

상품 코드 기준으로 새 상품을 추가하거나 기존 상품을 갱신합니다. 아래를 `products-to-import.json`에 저장합니다. 실행하면 기존 샘플 상품의 이름·가격·분류·`opt1`을 아래 값으로 저장합니다.

```json
[
  {
    "prd_id": "1000000660",
    "view_name": "~4XL 빅사이즈 기본코튼 와이드무지편한 무지밴딩팬츠_BP7206",
    "discprice": 22500,
    "domain": "fashion",
    "opt1": "출근룩"
  }
]
```

로컬 연결 단계의 `.env.local`이 준비된 상태에서 실행합니다.

```sh
# 검사만 실행하며 DB에는 저장하지 않음. 이 검사는 DB 연결 없이도 가능.
npm run db:import -- products-to-import.json --check

# 검사가 통과한 파일을 공통 DB에 저장
npm run db:import -- products-to-import.json

# 저장 결과 확인
curl --fail --silent --show-error 'https://makmeaning.vercel.app/api/products/1000000660'
```

- 수정할 때도 `prd_id`, `view_name`, `discprice`, `domain` 네 필드는 필수입니다. `opt1`만 든 JSON은 등록할 수 없습니다.
- 기존 상품의 선택 컬럼을 **생략하면 기존 값이 보존**됩니다. `null`, 빈 문자열, 공백 문자열을 명시하면 해당 값을 비웁니다. 새 상품의 생략한 선택 컬럼은 `NULL`입니다.
- 필수 네 필드와 의도적으로 바꿀 선택 컬럼만 담으세요. 오래된 API 응답 전체를 다시 등록하면 포함된 다른 팀원 `opt` 값도 덮어쓸 수 있습니다. 옵션만 수정할 때는 위 SQL 방식으로 해당 컬럼만 갱신하는 편이 간단합니다.
- 전체 파일을 검사한 뒤 하나의 트랜잭션으로 저장합니다. 같은 파일의 중복 상품 코드, 알 수 없는 컬럼, 잘못된 가격·분류는 거부됩니다.
- DB 값 수정은 Git 커밋이나 Vercel 재배포 없이 다음 API 조회에 반영됩니다. JSON 파일을 Git에 커밋하는 것만으로는 DB에 등록되지 않습니다.

`POST`, `PATCH`, `DELETE` 상품 API는 제공하지 않습니다. 저장은 위 SQL 또는 등록 명령을 사용합니다.

## 4. 컬럼과 운영 정보

| 컬럼 | 형식·규칙 |
| --- | --- |
| `prd_id` | 문자열 기본키, 1~64자. 앞자리 0을 보존하도록 JSON에서도 따옴표 사용 |
| `view_name` | 비어 있지 않은 상품명 문자열 |
| `cate1_nm`~`cate4_nm` | 카테고리 문자열 또는 `NULL` |
| `brand_name` | 브랜드명 문자열 또는 `NULL` |
| `discprice` | 원 단위 0~9007199254740991 정수. API에서는 숫자 |
| `domain` | `fashion`, `food`, `living`, `beauty` 중 하나 |
| `opt1`~`opt4` | 자유 텍스트 또는 `NULL`. 초기값 `NULL` |

JSON 등록 시 원본 별칭 `brd_nm` → `brand_name`, `price` → `discprice`를 지원하고 `"22,500"` 같은 가격 문자열도 정규화합니다. 응답은 항상 정식 컬럼명을 사용합니다. 초기 데이터는 [샘플 JSON](../../../db/products.seed.json)이며, 책의 `fashion` 분류도 원본 명세대로 보존했습니다.

- Vercel 프로젝트: `ww-002-8351s-projects / makmeaning`
- DB: `makmeaning-products` — Neon Free, `iad1` 리전
- 테이블: `public.products`
- 조회 API: `https://makmeaning.vercel.app/api/products`
- 서버 접속 정보: `.env.local`의 `DATABASE_URL`. API는 `POSTGRES_URL` 대체 지원도 있지만 `db:*` 명령은 `DATABASE_URL`이 필요합니다.

접속 정보는 서버에서만 사용합니다. `.env.local`, DB URL, 비밀번호를 Git·공유 문서·프런트엔드 코드·`NEXT_PUBLIC_*` 변수에 넣지 않습니다. 공개 조회에는 DB 자격 증명이 필요하지 않습니다.

테이블 초기화 명령은 담당자가 새 DB를 준비할 때 사용합니다. 이미 연결된 공통 DB에는 매번 실행하지 않아도 됩니다.

```sh
npm run db:migrate
npm run db:seed
```

[마이그레이션 SQL](../../../db/migrations/001_products.sql)은 테이블을 삭제하지 않고, seed는 기존 상품을 건너뛰어 팀원 수정 값을 보존합니다. 두 명령 모두 배포 시 자동 실행되지 않습니다.

## 5. 오류가 나면

| 증상 | 확인할 내용 |
| --- | --- |
| 400 `INVALID_QUERY` | 쿼리 이름·중복·domain·limit·offset·검색어 길이 확인 |
| 400 `INVALID_PRODUCT_ID` | 상품 코드의 앞뒤 공백·길이 확인 |
| 404 `PRODUCT_NOT_FOUND` | 등록된 `prd_id`인지 확인 |
| 405 | 조회는 GET 사용. 쓰기는 SQL/JSON 등록 명령 사용 |
| 503 `DATABASE_NOT_CONFIGURED` | `.env.local` 다운로드와 `DATABASE_URL` 확인 후 로컬 서버 재시작 |
| 503 `DATABASE_UNAVAILABLE` | DB 연결·테이블 생성 상태를 담당자가 확인. 응답에는 접속 오류 상세를 노출하지 않음 |
| 브라우저 CORS 오류 | 로컬 DB를 연결하고 상대 경로 `/api/products` 사용 |
| Vercel 프로젝트가 안 보임 | 로그인 계정과 프로젝트 접근 권한 확인. 새 프로젝트를 만들 필요 없음 |
| API는 바뀌었는데 방은 그대로 | 방은 별도 `/api/demo/home` 데이터 사용. 상품 테이블과 자동 연결되지 않음 |

애플리케이션 오류 응답은 `{ "error": { "code": "...", "message": "..." } }`입니다. 405는 프레임워크 응답이므로 JSON 형식을 가정하지 않습니다.

API 코드를 수정한 경우 `npm run test:products`와 `npm run build`를 실행합니다. 실제 DB/API 연결 확인은 별도로 위 조회 명령을 사용합니다.
