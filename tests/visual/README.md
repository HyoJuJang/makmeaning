# G:Scene CUA visual capture

현재 CUA 탭으로 실제 UI를 조작하고, DOM을 읽어 상태를 확인한 뒤 screenshot과 캡처 전후 metadata를 저장하는 도우미다. PNG/JPEG header에서 실제 형식과 크기를 읽고 `.png`/`.jpg` 확장자를 사용한다. 브라우저를 새로 구동하거나 Playwright 패키지를 실행하지 않는다. helper는 앱 state·DOM·localStorage를 주입하거나 animation을 멈추지 않는다.

`captureStatus: captured`는 예상 상태가 스크린샷 전후에 관찰됐다는 뜻이다. `visualVerdict: NOT_REVIEWED`는 실제 PNG를 사람이 보는 것처럼 검토할 때까지 유지한다. DOM 존재는 상품의 자연스러운 배치나 가림 관계를 증명하지 않는다.

## 준비

1. 기존 프로젝트 실행 명령으로 앱을 실행한다. 서버 URL은 실제 실행 결과에서 확인한다.
2. Main의 CUA에서 현재 탭을 선택하고 지원되는 viewport API로 **390×844**로 맞춘다. 이 helper는 viewport를 바꾸지 않고 검사한다.
3. CUA 첫 호출/문서의 API를 따른다. 이미 선택한 탭이 `tab`이라는 변수라고 가정한다. 아래 import 경로는 실제 checkout 위치로 변경할 수 있다.

```js
var visualModule = await import('file:///Users/gsretail/Documents/my_docs/projects/makmeaning/tests/visual/capture.mjs');
var visual = await visualModule.createVisualHarness({
  tab,
  outputDir: '/Users/gsretail/Documents/Codex/2026-09-21/agents-md-docs-ideas-doc03-final/outputs/visual-polish',
  round: 'round-1',
  viewport: { width: 390, height: 844 }
});
```

Main의 기존 helper가 있으면 `STATES`의 selector/expectation만 재사용해도 된다. 실행 시작 전 CUA DOM snapshot으로 아래 selector가 실제 탭의 가구/상품을 가리키는지 확인한다. 앱의 로컬 코드에서 확인한 selector이며 browser snapshot 검증을 대신하지 않는다.

## Canonical capture 명령 목록

이전 interaction이 있으면 tray의 종료 버튼으로 정상 종료한다. 각 명령은 관련 UI 상태를 먼저 만들고 실행한다. 초기 수량이 필요한 V11은 실제 `데모 초기화` 버튼으로 초기화한 뒤 만든다. 캡처를 위해 구매 저장값을 직접 수정하지 않는다.

| ID | 실제 UI로 상태 만들기 | 캡처 명령 | 확인 대상 |
| --- | --- | --- | --- |
| V01 | 초기화 후 아무 동작 없음 | `await visual.capture('V01')` | 발·그림자·기본 공간 |
| V02 | 멀리 있는 빈 바닥 탭 또는 가구 접근 중 | `await visual.capture('V02')` | 걷기 중 다리·충돌·앞뒤 |
| V03 | `.fashion` 탭 후 문 열고 뒤적임 | `await visual.capture('V03')` | 옷걸이·옷·손·문 |
| V04 | 옷 고르기 → 블루 셔츠 입어보기 → 종료 | `await visual.capture('V04')` | 바뀐 착장·pose 복원 |
| V05 | `.food` 탭 후 냉장고 열림 | `await visual.capture('V05')` | 문 hinge·상품 선반 |
| V06 | `.living` 탭 후 착석 | `await visual.capture('V06')` | 엉덩이·무릎·발·쿠션 |
| V07 | `.beauty` 탭 후 착석 | `await visual.capture('V07')` | 의자 정렬·다리·상판 |
| V08 | 화장품 고르기 → 현재와 다른 상품 꺼내두기 | `await visual.capture('V08')` | 손·상품 중복·다리 |
| V09 | `.window-target` 탭 후 창문 열림 | `await visual.capture('V09')` | 창짝·프레임·식물 가림 |
| V10_ON | `.lamp-target` 또는 실제 tray로 켜기 | `await visual.capture('V10_ON')` | 빛과 갓의 정합 |
| V10_OFF | 같은 조명을 끄기 | `await visual.capture('V10_OFF')` | 스탠드 위치·회전축 |
| V11 | 초기화 후 전체 공간 | `await visual.capture('V11')` | 네 category의 구매 상품 배치 |

V11의 옷/식품은 닫힌 문 뒤에 있다. V11 전체 구도와 **V03 + WARDROBE_OPEN, V05**를 함께 검토해 모든 상품을 실제로 확인한다. 한 화면에 모든 물건이 보인다고 주장하지 않는다.

## 짧은 동작 / 중요한 중간 프레임

UI click과 capture를 같은 CUA 호출 안에서 이어서 실행한다. 도착 거리가 길어 `waitFor`가 timeout되면 안정 상태에서 준비한 다음 실제 동작을 다시 만든다. `timeoutMs`를 늘려도 provider의 유효 timeout이 더 짧을 수 있다. `MISSED`를 성공으로 이름만 바꾸지 않는다.

```js
// Selector는 먼저 실제 DOM snapshot에서 확인한다.
nodeRepl.write(await visual.captureAfter('V03', () => tab.playwright.locator('.fashion').click()));
// 안정된 열린 옷장도 따로 보관한다.
nodeRepl.write(await visual.capture('WARDROBE_OPEN'));

// 상품 목록을 UI로 펼친 후, 아직 입지 않은 블루 셔츠를 클릭한다.
nodeRepl.write(await visual.captureAfter('MID_OUTFIT', () => tab.playwright.locator('[data-action="shirt"]').click()));
nodeRepl.write(await visual.capture('V04'));

// 화장대의 상품 목록에서 현재와 다른 cream을 선택하는 예시.
nodeRepl.write(await visual.captureAfter('V08', () => tab.playwright.locator('[data-action="cream"]').click()));

// 종료 버튼을 눌러 일어나는 실제 중간 프레임.
nodeRepl.write(await visual.captureAfter('MID_VANITY_STAND', () => tab.playwright.locator('.tray-exit').click()));
```

`MID_WARDROBE`, `MID_FRIDGE`, `MID_SOFA_SIT`, `MID_SOFA_STAND`, `MID_VANITY_SIT`, `MID_VANITY_STAND`, `MID_OUTFIT`, `MID_WINDOW`, `MID_LAMP`를 지원한다. 침대 회귀용 `BED`, `MID_BED`도 제공한다. 문 중간은 실제 `data-open`이 0과 1 사이인지를 전후에 검사한다. 걷기/앉기/화장품/조명 중간은 DOM pose가 전후에 유지돼야 한다. 220–500ms 동작은 캡처 latency로 놓칠 수 있으므로 실제 재시도하거나 관찰 한계로 기록한다.

### Localhost 진단 모드

짧은 transition을 CUA screenshot이 계속 놓치는 경우에만 실제 로컬 앱 URL에 `?visual-qa=1`을 추가한다. `localhost`, `127.0.0.1`, `[::1]`에서만 interaction controller의 clock을 **0.15 배속**으로 진행한다. 보행 속도·충돌·state 순서·pose renderer는 동일하다. 화면 control은 추가하지 않으며 일반 URL과 배포 호스트는 원래 속도다. `visualQaMotionScale`이 metadata에 기록된다.

이 모드의 캡처는 중간 geometry·pose의 검토 근거다. 정상 속도 animation의 자연스러움이나 functional timing의 증거로 사용하지 않는다. 해당 검증은 query 없는 URL에서 다시 수행한다. 진단 모드 캡처는 `round-1-slow-motion`처럼 별도 round 이름으로 보관한다.

## 결과와 재검증

- 파일명에 state·시간을 포함하며 실패 관찰에는 `-MISSED`가 붙는다. 각 PNG와 동일한 이름의 JSON에 viewport, scroll, actor pose/position/offset, 문 진행률, lamp/beauty, 상품 DOM bounds, 캡처 전후 상태를 기록한다.
- 배경 이미지의 complete/naturalWidth와 bounds, avatar SVG image href를 기록한다. 배경이 아직 로드되지 않았거나 PNG/JPEG header의 실제 픽셀 크기가 viewport×DPR와 다르면 MISSED다. viewport를 바꾼 직후 DOM만 새 크기이고 캡처는 이전 크기인 경우를 성공으로 기록하지 않는다. 이미지 load 확인 후에도 실제 screenshot의 배경/캐릭터 표시를 직접 확인한다.
- `manifest.json`은 **현재 helper instance**의 목록이다. round 안에서 하나의 helper를 유지한다. REPL 초기화 후에는 새 round/session 이름을 사용해 이전 manifest를 덮어쓰지 않는다.
- `nodeRepl.write(visual.summary())`로 누락을 확인하고 PNG를 직접 표시/열어 검토한다. screenshot bytes가 정상 저장됐다는 사실만으로 Visual PASS를 부여하지 않는다.
- 같은 viewport·avatar·outfit·상품 수량·scroll 조건의 before/after를 비교한다. 수정 상태마다 4종 캐릭터/기본 옷·구매 상의 및 필요한 320×568 보충 샷을 추가할 수 있다. 별도 round 이름과 viewport 인수를 사용한다.
- 실제 결함은 `docs/design/visual_polish_agent.md` 형식으로 최대 5개 선정한다. 이 helper는 기능 회귀나 visual plausibility 판정을 자동 통과시키지 않는다.

파일 단독 문법 검사: `node --check tests/visual/capture.mjs`. 이 명령은 browser capture를 실행하지 않는다. 실제 캡처는 CUA에서만 수행한다.
