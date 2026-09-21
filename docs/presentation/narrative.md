# G:Scene 발표 서사

52g 발표용, 최대 5장. 고객 문제와 제품이 주인공이며 Agent의 역할은 마지막 장의 실행 방식에만 둔다.

1. **상품은 많은데, 내 생활은 잘 보이지 않는다** — 2030 고객이 상품을 쓰는 자기 모습을 떠올리기 어렵다는 기획의 문제 가설. 조사 인용이나 수치로 포장하지 않는다. 큰 문장 중심의 어두운 오프닝.
2. **이 상품이 내 생활 어디에 들어올까?** — 보유 물건을 생활 공간에 놓고 다음 쇼핑을 시작한다. 실제 Living 방 화면과 질문을 연결한다.
3. **G:Scene** — 내가 산 물건과 살아가는 나의 공간. 실제 Main room을 가장 크게 보여주고 네 생활 영역이 공간에 있음을 드러낸다.
4. **입어보고, 고르고, 내 공간으로** — 같은 가상 고객과 M01 캐릭터의 옷장 열림, 보유 셔츠 미리보기와 명시 적용, 적용한 셔츠를 입고 방에 복귀한 연속 QA 캡처를 보여준다.
5. **다음 쇼핑의 출발점은 나의 생활** — 제품의 의미로 마무리한다. Agent 팀은 구현과 QA를 나눠 같은 사용자 흐름을 반복 검토했다는 실제 실행 방식만 짧게 언급한다. 고객 효과·전환 성과는 아직 검증하지 않았음을 보인다.

## 사실 / 표현 경계

- 실상품 ID와 카탈로그 참고가를 가상 고객의 구매 상태에 연결했다. 실제 고객/결제 데이터가 아니다.
- 방 그림과 아바타 착장은 공간 표현용 예시이며 실상품 외형이나 가상 피팅이 아니다.
- Fashion/Living 추천 목록은 가상 예시를 유지한다. Food/Beauty 카탈로그와 혼동하지 않는다.
- 최초 object 생활 interaction 이후 준비 상태의 두 번째 탭으로 category로 이동한다.
- preview cancel/apply, 방 복귀와 reload는 `docs/design/release_verification.md`의 기존 로컬 검증 사실에 한해 설명한다. 이번 overnight production gate가 끝나기 전 새 완료 주장이나 수치 주장 금지.

## 시각 방향

16:9. Warm paper #F5F3EB, deep forest #263F35, muted sage #6D8069. IBM Plex Sans KR. 편집 가능한 큰 제목, 실제 screenshot, 충분한 여백. 임의 stock image/장식 icon/가짜 UI 사용하지 않음.

## Sources

- docs/ideas/doc03_final_ideation.md
- docs/criterion/crit00_proj_guide.md
- docs/criterion/crit01_EXECUTION.md
- docs/design/room_commerce_contract.md
- docs/design/release_verification.md
- docs/logs/nightly_2026-09-21.md
- 실제 실행 screenshot: outputs/release-qa/living-320-public.png와 outputs/nightly-qa/integrated/의 wardrobe-open-390.png, fashion-apply-390.png, room-applied-shirt-390.png (work/deck/assets에 복사). 원본 픽셀을 유지한 layout crop만 사용했다.

## Status

Final R2 complete. Independent Critic R1의 3건을 수정했고 R2 actual PNG 재검토에서 모두 해결됐다. 최대 5장, 제품 중심, 가짜 성과 없음, actual apply/return loop, 글자/화면 겹침 없음 기준을 통과했다.

- Final PPTX: docs/presentation/GScene_Final_52g.pptx
- PDF preview: docs/presentation/GScene_Final_52g.pdf
- Authored source: work/deck/build-deck.mjs
- Final imported PPTX renders: work/deck/render-imported-r2/slide-1.png ~ slide-5.png
- Independent reviews: work/deck/critic-r1.md, work/deck/critic-r2.md
- Structural/layout/font/import receipt: work/deck/validation-r2.json
- Final artifact check: work/deck/final-checks.json
- Chat deliverables: outputs/nightly-presentation/ (PPTX/PDF/5 PNG/HTML preview)

PPTX는 native editable text와 실제 screenshot을 담는다. PDF는 final PPTX 렌더의 이미지 미리보기다. 별도 Microsoft PowerPoint 앱에서의 실행을 검증했다고 주장하지 않는다.
