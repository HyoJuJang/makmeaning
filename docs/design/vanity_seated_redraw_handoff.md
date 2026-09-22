# 화장대 착석 redraw — 최종 인계

2026-09-22. 기준 main: `8e66122d478f3ddc8e56bccbbfec53d4bc874aa9`.

## 확정 결과

네 캐릭터의 화장대 착석을 새로 그렸다. 기존 방의 쿠션 의자를 그대로 쓰며, 캐릭터만 투명 PNG로 올린다. 짧아진 등과 둥근 골반이 보이고 무릎/발은 화장대 방향, 즉 몸과 의자 뒤에 가려진다. 앞쪽으로 늘어진 종아리와 별도 의자 그림은 없다.

사용자는 새 그림을 승인한 뒤 실제 홈 캡처보다 조금 더 위로 옮기라고 요청했다. 최종 골반 접점은 room world `(340, 293)`이다. 최초 compact 미리보기 `(340, 301)`보다 8 world px 위다. 390px 모바일 화면에서는 약 7px 차이다.

## 그대로 적용할 파일

- `app/assets/avatars/m01-vanity-seated-back.png`: 도윤, 네이비/검정 헝클머리
- `app/assets/avatars/m02-vanity-seated-back.png`: 준호, 세이지/갈색 짧은 머리
- `app/assets/avatars/f01-vanity-seated-back.png`: 민서, 오트/검정 단발
- `app/assets/avatars/f02-vanity-seated-back.png`: 지우, 슬레이트/풀어 내린 긴 갈색 머리
- `app/vanity-frames.js`: 새 이미지의 머리 폭, 골반 접점, 의류 마스크
- `app/avatar.js`: 실제 의자에 맞춘 캐릭터 위치와 의류 매핑

PNG는 imagegen 출력 원본을 그대로 복사했다. 의류 마스크/좌표만 픽셀을 읽어 계산한 SVG 메타데이터다.

## 크기와 좌표 계약

의자 폭으로 이미지를 확대하지 않는다. 기존 서 있는 뒷모습의 폭을 기준으로 한다.

```
standingScale = 60 / FRAMES[id][0].box[3]
seatedScale = FRAMES[id][1].box[2] * standingScale / data.headWidth
local pelvis = (20, 34)
world pelvis = (340, 293)
```

| 캐릭터 | 서 있는 뒷모습/착석 머리 폭(world px) |
| --- | ---: |
| 도윤 | 25.55 |
| 준호 | 25.28 |
| 민서 | 29.33 |
| 지우 | 28.95 |

- 스프라이트의 캔버스 여백까지 포함한 전체 폭으로 맞추지 않는다.
- 캐릭터별 scale은 각각 계산한다. 캐릭터를 의자 폭까지 키우지 않는다.
- 기존 `APPROACHES.beauty`, vanity offset, 이동·충돌·컨트롤러는 그대로다.
- room bitmap, 의자와 화장대, layout, mirror clip도 그대로다.
- 새 PNG에는 의자가 없다. 의자 앞쪽을 복사해서 덮는 기존 rim 복원과 별도 leg 레이어를 제거했다.
- 의상 tint/후드/소매 디테일은 새 상의 마스크에 매핑한다. 머리와 바지를 다시 칠하지 않는다.
- 화장품 사용 시 새 골반을 축으로 작게 움직이고, 작은 제품만 소매 옆에 표시한다. 팔을 늘리지 않는다.

## 검토와 수정

1. 최초 새 그림을 실제 홈에 넣었더니 의자 기준 확대 시 머리가 약 28% 커졌다. 해당 그림은 폐기했다.
2. 새 compact pose를 민서로 먼저 생성하고 기존 머리 폭에 고정해 실제 홈에서 확인했다.
3. 사용자 요청에 따라 골반을 위로 옮겼다. 같은 원칙으로 네 명을 완성했다.
4. 네 명의 실제 홈 착석을 390×844에서 직접 확인했다. 쿠션 중앙/안쪽에 앉고, 지우의 긴머리도 유지된다.
5. 기본 옷 및 보유 의류 12벌의 착석 렌더를 직접 확인했다. 준호 화장품 선택 후 배치 완료와 착석 복귀도 확인했다.

## 검증

- `node app/tests/interactions.test.mjs`: PASS
- `node --conditions=react-server app/tests/input.test.mjs`: PASS
- `node --conditions=react-server app/tests/home-food.test.mjs`: PASS
- `node --conditions=react-server --test tests/owned-outfit.test.mjs tests/avatar-motion.test.mjs`: 20/20 PASS
- `node_modules/.bin/tsc --noEmit`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS

실제 의자 합성 비교(로컬, 외부 이미지 의존 없음):
`/Users/gsretail/Documents/Codex/2026-09-21/agents-md-docs-ideas-doc03-final-2/outputs/vanity-seated-final.html`

임시 `.probe-*`, `.seat-*`, `*-vanity-compact.png`, `work/` 파일은 개발 확인용이고 인계 커밋에 포함하지 않는다. 위 6개 구현 파일과 이 문서만 적용한다.

## MainSession 실행 체크리스트

- [ ] 최종 인계 커밋을 main에 적용한다. 기존 미완성 probe/폐기 그림은 가져오지 않는다.
- [ ] production build에서 준비된 prototype JS와 4개 PNG가 함께 갱신되는지 확인한다.
- [ ] production 배포까지 진행한다(사용자 명시 요청).
- [ ] 배포 URL에서 네 캐릭터의 화장대 착석과 일어나기를 확인한다.
- [ ] 의자나 캐릭터를 추가 확대/이동하지 않는다. 새 그림을 다시 그리거나 코드로 다리를 보충하지 않는다.
- [ ] 배포 완료 URL과 commit을 회신한다.
