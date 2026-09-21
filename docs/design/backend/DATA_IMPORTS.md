# 공통 상품 데이터 등록 이력

팀 공통 상품 DB에 실제 반영한 데이터와 검증 결과를 기록합니다. 조회·로컬 연결·수정 방법은 [상품 DB·API 사용 가이드](README.md)를 참고하세요. 아래 건수는 등록 완료 시점의 기록이며, 이후 팀원의 수정으로 달라질 수 있습니다.

## 2026-09-21 실제 상품 CSV 등록

- 완료 시각: **2026-09-21 21:45:33 KST**
- 입력 파일: `products_20260921_2125.csv` — 등록 작업에 제공된 원본 CSV
- 등록 작업의 원본 경로: `docs/design/backend/products_20260921_2125.csv`
- 대상: Vercel `makmeaning`에 연결된 Neon `makmeaning-products`, `public.products`
- 결과: **신규 6,031건 등록, 기존 5건 보존, 총 6,036건**
- 기존 상품과 겹치는 상품 코드: **0건**

| 분류 | 이번 CSV 등록 | 기존 상품 보존 | 등록 후 전체 |
| --- | ---: | ---: | ---: |
| Fashion | 1,815 | 3 | 1,818 |
| Food | 1,606 | 1 | 1,607 |
| Living | 2,148 | 1 | 2,149 |
| Beauty | 462 | 0 | 462 |
| **합계** | **6,031** | **5** | **6,036** |

### 등록 방식

CSV의 9개 컬럼을 사용했습니다.

```text
prd_id, view_name, cate1_nm, cate2_nm, cate3_nm, cate4_nm,
brand_name, discprice, domain
```

- UTF-8 CSV를 읽고 상품 코드를 문자열로 보존했습니다. 가격은 원 단위 정수, 빈 선택 컬럼은 SQL `NULL`로 정규화했습니다.
- 파일 전체를 기존 상품 데이터 검증 함수로 검사한 뒤, 상품 코드 기준의 추가·갱신을 하나의 트랜잭션으로 실행했습니다. 이번 파일은 기존 5건과 코드가 겹치지 않아 모두 신규 등록되었습니다.
- CSV에 없는 `opt1~opt4`는 갱신 대상에서 제외했습니다. 신규 상품의 옵션은 모두 `NULL`이며, 기존 상품과 옵션 값은 그대로 보존했습니다.
- CSV에 없는 상품은 삭제하지 않았습니다. DB 변경은 공개 API의 다음 조회에 반영되며, 앱 재배포가 필요하지 않습니다.
- 원본 CSV는 변경하지 않았습니다. 원본 식별용 SHA-256은 다음과 같습니다.

```text
a30ce9f9029fa065333311c5716e8a36f69f108363fc9e8d3f98dff14ddebe23
```

### 검증 결과

| 검증 | 결과 |
| --- | --- |
| CSV 행 수 / 고유 상품 코드 | 6,031 / 6,031 |
| 중복·충돌, CSV 구문·컬럼 수 오류 | 0건 |
| 필수값 누락, 잘못된 가격·분류 | 0건 |
| 저장 후 입력 9개 컬럼 전수 대조 | 6,031건 모두 일치 |
| 공개 API 전수 조회 | 100건씩 61페이지, 마지막 페이지 36건 |
| API 상품 수 / 중복 상품 코드 | 6,036 / 0 |
| 신규 상품의 API 13개 컬럼 대조 | 정규화한 원본 및 빈 옵션과 모두 일치 |
| 기존 상품·옵션 보존 | 5건 모두 변경 없음 |
| 분류별 건수·페이지 total·no-store | 모두 정상 |

### 팀원이 바로 조회할 주소

- [전체 상품 첫 100건](https://makmeaning.vercel.app/api/products?limit=100&offset=0)
- [Fashion](https://makmeaning.vercel.app/api/products?domain=fashion)
- [Food](https://makmeaning.vercel.app/api/products?domain=food)
- [Living](https://makmeaning.vercel.app/api/products?domain=living)
- [Beauty](https://makmeaning.vercel.app/api/products?domain=beauty)
- [이번 CSV에서 등록한 상품 예시](https://makmeaning.vercel.app/api/products/4444949)

전체 목록을 받으려면 `limit=100`으로 두고 `offset`을 0, 100, 200 순서로 증가시켜 `pagination.total`까지 조회합니다. 기본 요청은 첫 50건만 반환합니다. 현재 분류별 데이터 수는 각 응답의 `pagination.total`에서 확인할 수 있습니다.

이 데이터는 공통 상품 카탈로그입니다. 방 화면의 가상 구매 데이터(`/api/demo/home`)와는 별도이며, 상품 등록만으로 방에 자동 표시되지는 않습니다.
