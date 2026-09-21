# 상품 DB 파일

팀원의 조회·로컬 연결·데이터 수정 절차는 **[공통 상품 DB·API 사용 가이드](../docs/design/backend/README.md)**를 따릅니다.

- [테이블 명세](../docs/design/backend/tables.md): 13개 상품 컬럼의 원본 정의.
- [migrations/001_products.sql](migrations/001_products.sql): `public.products`와 domain 인덱스 생성 SQL.
- [products.seed.json](products.seed.json): 최초 등록한 샘플 5건. `opt1~opt4`는 `NULL`.

기존 공통 DB에는 테이블과 샘플이 이미 등록되어 있습니다. 새 DB를 준비할 때는 저장소 루트에서 `npm run db:migrate`, `npm run db:seed`를 실행합니다. seed는 기존 상품을 갱신하지 않습니다.

팀 데이터 등록은 `npm run db:import -- 파일경로 --check`로 검사한 뒤 `npm run db:import -- 파일경로`로 실행합니다. 필수 필드와 생략·`null` 처리 규칙은 위 가이드를 확인하세요.
