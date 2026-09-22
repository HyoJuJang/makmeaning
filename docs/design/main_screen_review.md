# Main Screen — 1차 실제 모바일 QA

- 일시: 2026-09-21, QA Agent
- 대상: http://127.0.0.1:4173/ (실행 중인 app)
- 방식: Codex in-app browser 실제 UI 클릭, 키보드 입력, 스크린샷, 접근성 트리, 읽기 전용 DOM 측정. 원본 app 코드는 수정하지 않음.
- 화면: 390×844, 375×812, 320×568. 390/375/320에서 document scrollWidth가 viewport 폭과 동일. 320에서 시트 목록 내부 스크롤과 닫기 버튼 노출 확인.

## 판정

2D dollhouse와 Fashion/Food/Living/Beauty의 네 공간, 구매한 9종의 실물 표현, 네 가구 interaction이 실행된다. 첫인상은 정돈된 개인 공간이며 상품 카드 진열, 할인 배너, 게임 HUD가 없다. 기능 차단 결함은 발견하지 않았다. 이번 수정 대상은 공간 안에서 상태 변화가 더 잘 읽히도록 하는 다음 2건으로 제한한다.

## 수정 대상 (영향도 순, 최대 3건 중 2건)

### 1. [P2] 냉장고 잔량 변화가 작은 점으로만 표현되어 식품과 연결해 읽기 어렵다

- 재현: 초기화 → Food → 우유 `하나 사용하기` → 닫기. 390px/375px에서 냉장고 아래의 작은 점 한 개가 사라지지만, 각 점 열이 우유·생수·영양제 중 무엇인지 집 화면에 표시되지 않는다. 초기 3열은 냉장고 환기구처럼 보인다. 320px에서는 더 작다.
- 관찰 근거: 화면 내 SVG는 각 잔량 점의 반지름이 1.5 viewBox unit이고, 상품과 떨어진 아래쪽에 세 열로 놓여 있다. 3→2/1은 점 감소, 0은 상품 아이콘 제거가 실제로 작동한다. 데이터 오류가 아니라 변화의 가독성 문제다.
- 영향: 식품을 사용한 결과가 공간에 반영된다는 이번 slice의 핵심을 사용자가 쉽게 알아차리기 어렵다.
- 수정 기준: 각 식품에 연결된 명확한 수량 표시 또는 눈으로 구분 가능한 개수 표현을 집 안에 제공. 320/390px에서 사용 전후 차이를 읽을 수 있고 0도 명확해야 한다. 시트의 수량 및 disabled 동작을 유지한다.

### 2. [P2] 화장품 선택이 전면 배치로 이어지지 않아 꺼내두기 결과가 약하다

- 재현: Beauty → `편안한 보습 크림 꺼내두기` → 닫기 → 세럼으로 다시 전환.
- 관찰: 선택 완료 문구와 바닥 highlight/크기는 변하지만, 세럼은 계속 화장대 왼쪽, 크림은 계속 오른쪽 같은 자리에 있다. 선택 상품이 거울 앞 공통 전면 자리로 옮겨지는 효과는 없다.
- 영향: 명세의 `선택한 제품이 거울 앞 가장 앞쪽에 위치` 경험이 충분히 표현되지 않는다. 작은 상품이라 highlight만으로는 현재 선택 구분이 약하다.
- 수정 기준: 선택 상품을 명확한 전면 자리로 옮기고 나머지는 뒤/옆으로 배치. 선택 유지/재오픈/새로고침 후 동일한 배치를 유지하고 중복 상품을 만들지 않는다.

## 통과한 실제 검증

- Fashion: 블루 셔츠 착용 → 닫기 후 아바타 상의 변경, 새로고침 후 착용 유지.
- Food: 우유 3→2→1→0, 0에서 `다 사용했어요` disabled. 집에서 0인 우유 사라짐. 새로고침 후 0 유지.
- Living: 조명 끄기 후 램프 빛/방 glow 제거, 새로고침 후 꺼짐 유지.
- Beauty: 크림 선택 완료/다른 상품으로 전환 가능, 새로고침 후 선택 유지.
- 데모 초기화: 기본 크림 니트, 조명 켜짐, 식품 3개, 세럼 선택 복원.
- 키보드: Enter로 Food 열기, Space로 Beauty 열기. 시트 첫 focus는 닫기. Shift+Tab/Tab으로 내부 순환. Food action에서 Enter 반복 사용 시 focus 유지, 소진 시 닫기로 안전하게 이동. Escape 후 원래 가구 focus 복귀.
- 닫기 버튼과 backdrop 클릭으로 시트 종료.
- 320px의 Food 목록은 내부 스크롤로 마지막 상품까지 접근 가능.
- 브라우저 수집 console warn/error: 0건.

## 수정 후 재검증

2026-09-21 · Builder 수정/서버 재시작 후 Main Agent가 실제 브라우저에서 재검증 완료.

- **P2-1 해결:** 각 식품 선반 바로 옆에 고대비 숫자 잔량 표시. 390px에서 우유 3→2→0개를 클릭으로 검증했고 0에서는 상품이 사라지며 빈 자리와 0개 표시를 유지한다. 시트의 소진 버튼 disabled 유지. 320px에서도 잔량 식별 가능.
- **P2-2 해결:** 선택한 크림/세럼은 거울 앞 공통 받침으로 실제 이동하며, 미선택 상품은 오른쪽 뒤로 이동한다. 크림 선택 후 새로고침/재오픈에서 선택 유지, 다시 세럼 선택 시 전면 교체 확인. 상품 중복 없음.
- 수정 후 390×844 및 320×568 실제 화면 확인. 320px document scrollWidth=320으로 가로 넘침 없음.
- 외부 Google Fonts 의존성을 제거하고 시스템 글꼴로 변경. Builder가 서버 재시작, HTTP 200, app.js/server.mjs 구문 검사 통과 확인.
- Main 재검증 브라우저 warn/error 0건. 마지막에 데모 초기화로 기본 상태 복원.

**완료 판정: Experience spec → Builder build/run → QA review(2건) → Builder fix/restart → 실제 모바일 재검증, 1회 loop 완료.**

## 원룸 이동 QA — 2026-09-21

QA Agent가 실행 중인 `http://127.0.0.1:4173/`를 별도 Codex in-app browser 탭에서 직접 조작했다. 390×844 및 320×568 화면, UI 클릭, 스크린샷, 접근성 트리, `.walker` DOM의 표시 좌표/방향/이동 상태를 관찰했다. app 코드는 변경하지 않았다.

### 수정 대상 — 영향도 높은 3건

1. **[P1] 우하단 스탠드를 누르면 스탠드 대신 왼쪽 소파 앞으로 이동한다.** 390px에서 `Living 스탠드 조명 사용` 버튼을 누르면 캐릭터가 냉장고 앞 (262,197)에서 왼쪽 소파 앞 (124,319)으로 걸어간 뒤 `내 거실` 패널이 열린다. 실제 스탠드는 방 우하단에 있어 선택한 object 근처에 도착한다는 핵심 경험이 깨진다. 스탠드 자체의 안전한 접근점을 별도로 두고 해당 클릭에서는 그 지점으로 이동한 후 기존 Living 패널을 열어야 한다. 소파의 기존 접근은 유지한다.
2. **[P2] 식품 팬트리를 직접 누르면 Food interaction이 실행되지 않는다.** 390px 초기 화면 기준 팬트리 선반 (319,321)을 탭하면 `가구 옆의 빈 바닥을 눌러주세요`만 표시되고 캐릭터는 (298,266)에 정지한다. 냉장고 본체/label은 정상이다. 팬트리도 같은 식품 object로 읽히므로 선반 자체를 Food 접근 타깃에 포함하고 안전한 주방 접근점 도착 후 패널을 열어야 한다.

3. **[P2] 매우 짧은 키 입력이 이동으로 반영되지 않는다.** QA가 원룸에 focus를 둔 상태에서 CUA `a` 및 `Left` 단발 입력 후 캐릭터 좌표가 그대로인 것을 확인했다. 한 animation frame 안에서 keydown/up이 모두 끝나면 pressed-key set을 tick이 읽지 못하는 구조다. 짧은 입력도 다음 frame에서 충돌 검사를 거친 작은 이동으로 한 번 반영하고, 누르고 있을 때는 기존 연속 이동을 유지해야 한다.

### 실제 UI에서 통과한 검증

- 390px 빈 바닥 탭으로 (234,300)→(268.85,456.73) 이동. Fashion 클릭 직후 패널 없이 이동 안내, 도착 (162,164)에서 패널 개방.
- Fashion→Food 이동 중 (194.83,174.83), `direction=right`, `moving=true`를 관찰했다. 도착 (262,197), `moving=false`, `direction=up`에서 냉장고 패널이 열렸다. 즉시 teleport가 아니다.
- Beauty 도착 (298,266), 우측 방향 idle 상태에서 화장대 패널 개방. Living 소파 접근도 도착 후 기존 패널 개방.
- Fashion 예약 이동 중 빈 바닥을 다시 탭하면 새 목적지로 이동하고 Fashion 패널은 열리지 않는다. 최종 (275.41,445.80) idle.
- 320px로 resize해도 위 논리 좌표가 유지된다. 바닥 탭 후 중간 (264.08,411.21), up/moving 상태를 거쳐 (201.29,219.49)에 도착했다. 침대 중앙 탭은 거부되고 캐릭터 위치를 유지했다. Fashion은 (162,164) 도착 후 패널이 열렸다.
- 320px document scrollWidth=320, 가로 넘침 없음. 방은 세로 스크롤로 이어지며 방향/걷기 변화 식별 가능.
- 블루 셔츠 착용 후 캐릭터 상의 변경, 우유 3→2 감소, 조명 끄기, 크림 꺼내두기와 선택 표시를 실제 실행했다. 패널을 닫은 후 도착 위치 유지.
- 수집된 브라우저 warn/error 0건.

### 검증 한계와 별도 회귀 검사

브라우저 도구의 `cua tab.pressKey(null,'a')`/`Left` 단발 입력은 좌표 변화가 관찰되지 않았다. keydown/up이 한 프레임 안에 끝날 가능성이 있다. 도구에 key-hold API가 없어 **길게 누른 WASD/방향키, keyup/blur 정지를 실제 브라우저에서 통과했다고 판정하지 않는다.** Main의 추가 검증과 코드 검사 결과와 분리한다.

Main이 별도 실행한 geometry 회귀 검사는 category 접근점 경로를 포함한 120개 경로, 무작위 목적지 100개, 3,000 collision step을 통과했다. 벽/침대/테이블 내부 목적지 거부도 검사했다. 이는 위의 실제 UI 관찰을 보완하는 코드 검사이며 실제 장기 키 누름 검증을 대체하지 않는다.

수정 후 위 세 재현 동작을 동일한 실제 화면에서 다시 실행하고 완료 여부를 덧붙인다.


### 원룸 이동 — 수정 후 재검증 완료

Builder가 3개 수정사항을 적용하고 서버를 재시작한 후 Main Agent가 동일 앱에서 재검증했다.

- **스탠드 해결:** 390px 클릭 직후 (245.60,323.20), moving=true, panel 없음. 이후 우하단 (306,444), 오른쪽 idle에서 Living 패널 개방. 320px에서도 같은 도착점과 패널 확인.
- **팬트리 해결:** 직접 버튼 클릭 후 위쪽으로 연속 보행하며 panel 없음. 실제 팬트리 옆 (318,198), 위쪽 idle에서 Food 패널 개방. 320px에서도 동일 동작, scrollWidth=320.
- **짧은 키 입력 해결:** 1280px desktop viewport에서 A 입력 후 x318→316.27/left, ArrowDown 후 y198→199.73/down, W 후 y198.18/up, D 후 x318/right, S 후 y199.98/down 관찰. 입력 직후 다음 frame에서 실제 위치 변화, 이후 idle 정지 확인.
- 도착 및 패널 닫기 후 이동 안내가 idle 문구로 복구됨.
- 실제 브라우저 warn/error 0건. 데모 초기화 후 초기 상태로 복원.
- 자동 회귀 검사: 6개 접근점 간 및 임의 바닥을 포함한 **142개 경로**, random100 전부 도달, keyboard collision3,000 step 통과. 침대/테이블/집 밖 목적지 거부.
- 실제 app.js 이벤트 핸들러와 animation loop를 minimal DOM/virtual clock에서 실행하여 held WASD(0.5초 연속 변위), Arrow held, keyup 정지, blur 정지, visibility 재개 후 키 해제, 짧은 입력 1회 소모, 장기 벽 충돌 검사를 통과했다. 이것은 **코드 입력 시뮬레이션**이다. 브라우저 도구는 장기 key hold를 지원하지 않아 실제 하드웨어 long-hold를 직접 검증했다고 주장하지 않는다.

**완료: 최신 이미지 적용 → 연속 이동 구현/실행 → 실제 mobile QA(3건) → 수정/재실행 → 실제 browser 재검증. 기존 구매 데이터 및 4개 패널/상품 행동 유지.**


## 캐릭터 스타일·선택 QA — 2026-09-21

Main Agent가 실제 실행 앱 `http://127.0.0.1:4173/`를 390px 및 320px mobile viewport에서 직접 조작했다. Builder가 전달한 이미지가 아니라 실행된 UI와 캐릭터 DOM의 발 좌표를 기준으로 확인했다.

### 실제 화면 검증

- 390px/320px에서 숏 컷·소프트 웨이브·라운드 보브의 머리 실루엣, 피부·바지 팔레트가 서로 구별되며 3개 미리보기와 적용 버튼이 정상 표시된다. 320px 가로 overflow 없음.
- wave를 선택하고 취소하면 기존 short를 유지한다. wave 적용 후 새로고침해도 선택이 유지된다.
- Fashion에서 블루 셔츠를 입고 bob으로 바꾸어도 블루 셔츠를 유지한다. 세 외형의 미리보기와 공간 캐릭터가 공용 렌더러를 사용한다.
- 옷장 도착 좌표 (162,164)에서 캐릭터를 적용한 뒤에도 좌표가 같다.
- 스탠드로 이동 중 선택창을 열면 (175.47,190.20)에서 멈춘다. 닫아도 이전 예약 패널이 뒤늦게 열리지 않는다.
- Escape로 취소/닫기 및 원래 `캐릭터 바꾸기` 버튼으로 focus 복귀를 확인했다.

이번 review에서 수정이 필요한 주요 문제는 발견되지 않았다. 기존 이동 경로·충돌 반경·원룸 배경은 변경하지 않았다.

### 별도 코드 검증

- npm test 통과: 142개 이동 경로, 무작위 목적지 100개, 3,000 collision step 및 키 입력·해제·blur·visibility 회귀 검사.
- 실제 app.js를 minimal DOM VM에서 실행: avatarId 없는 기존 저장 데이터의 기본 외형 보완, 취소 시 기존 외형 유지, 적용/저장, 블루 셔츠·식품 수량·조명·뷰티 선택 보존, 기존 발 좌표 유지 통과. 이는 UI 검증을 보완하는 상태 검사다.
- app.js/avatar.js 구문 검사 및 실행 중 서버의 avatar.js HTTP 200 확인.

## Scene entry QA — 2026-09-21

QA Agent가 실제 실행 앱 `http://127.0.0.1:4173/`를 별도 Codex in-app browser에서 390×844, 320×568 viewport로 직접 조작했다. 스크린샷, 접근성 트리, 표시 DOM의 캐릭터 좌표·이동 상태를 근거로 판단했으며 app 코드는 수정하지 않았다.

### 수정 대상 — 1건

1. **[P2] 여행 준비 선택 시 조사 오류가 미리보기와 완료 제목에 반복된다.** `여행 준비`와 `10만원` 선택 후 미리보기에 `10만원 안에서, 여행 준비을 위한 Scene`, 완료 화면 제목에 `여행 준비을 위한 Scene`이 표시된다. Scene 선택 결과를 설명하는 핵심 문구이므로 `여행 준비를 위한 Scene`으로 고치고 두 화면을 다시 확인한다. 다른 상황은 `을`을 유지하거나 조사가 필요 없는 일관된 표현을 사용한다.

이번 review의 실제 수정 대상은 위 1건이다. 신규 Scene 흐름을 막는 P0/P1 문제는 발견되지 않았다.

### 실제 UI에서 통과한 검증

- 390×844 첫 화면은 방과 이동 안내까지 보이며, Scene 입구는 방 아래로 약 180px 스크롤하면 보인다. 집 크기를 유지한 명세와 일치한다. 낮은 대비의 따뜻한 배경, 소파·램프 그림, 공간을 바꾸는 질문으로 기존 방과 시각적으로 이어진다. 할인·상품 광고나 별도 카테고리 목록처럼 보이지 않는다.
- 무선택, 상황만 선택, 예산만 선택한 세 상태에서 실제 CTA가 disabled이다. 상황/예산 선택을 모두 마치면 활성화된다.
- 여행 준비+10만원, 욕실+10만원, 침실+3만원 조합을 실제 선택했다. 이전 선택은 해제되고, 상황 설명과 미리보기 그림이 여행가방·욕조·침대로 바뀐다. 선택 값은 완료 요약에도 반영된다.
- `이 Scene으로 시작하기`는 같은 sheet의 선택 요약으로 즉시 전환한다. 새 제목으로 focus가 이동한다. `다시 고르기`는 입력값과 상황 선택 focus를 유지한다. Escape/닫기/내 방으로 돌아가기 후 Scene 입구로 focus가 복귀하며, 다시 열면 입력값이 유지된다.
- 320×568에서 document scrollWidth=320, 가로 overflow 없음. 선택 버튼은 줄바꿈되며 닫기/CTA에 접근할 수 있다. 확인 단계 내부 scroll로 데모 범위 문구까지 읽을 수 있고 CTA는 고정되어 있다. Tab/Shift+Tab으로 modal 내부 focus 순환을 확인했다.
- Scene sheet에서 d/Down 키를 눌러도 캐릭터 발 위치 (234,300)가 변하지 않는다. Living으로 이동 중 Scene을 열면 중간 (154.98,192.63)에서 moving=false가 되고, 닫아도 동일 위치를 유지한다. 이전 Living 예약 패널은 뒤늦게 열리지 않는다.
- 기존 Fashion 옷장까지 연속 보행 후 패널 개방, 블루 셔츠 착용, 라운드 보브 캐릭터 선택 후 셔츠와 발 위치 보존을 확인했다. Scene 사용 후 바닥 탭에서도 중간 위치 (164.39,213.11), direction=down, moving=true를 관찰하여 자유 이동이 유지됨을 확인했다.
- 나머지 Food/Beauty/Living object도 실제 걸어간 후 대응 패널이 열렸다. 우유 수량 3→2, 세럼→크림 꺼내두기, 조명 켜짐→꺼짐 동작 정상.
- 수집된 브라우저 warn/error 0건. QA용 임시 viewport는 복원하고 임시 브라우저 탭을 닫았다.

### 후속 확인

Builder/Main이 위 조사 오류를 수정하고 여행 준비 미리보기·완료 제목을 실제 앱에서 다시 검증한 결과를 이 아래에 덧붙인다. 단순 helper 조합 검사는 실제 UI 검증과 분리해 기록한다.


### Scene entry — 수정 후 재검증 완료

Builder가 QA에서 발견한 문구 1건을 미리보기와 완료 제목 모두 `여행 준비에 어울리는 Scene`으로 수정했다. 다른 상황에도 같은 조사 없는 표현을 사용한다.

Main Agent가 새로고침한 실제 앱에서 다음을 확인했다.

- 390×844: 방 아래 Scene 입구의 공간 그림·색감·질문을 직접 확인했다. 무선택 CTA는 disabled이고, 여행 준비 + 10만원 선택 후 활성화된다.
- 선택 미리보기 `10만원 안에서, 여행 준비에 어울리는 Scene`, 완료 제목 `여행 준비에 어울리는 Scene`이 실제 화면에 표시된다. 여행가방 그림과 `10만원 이내` 예산도 일치한다.
- 완료 CTA 실행 후 같은 sheet가 선택 요약으로 전환되며 제목으로 focus가 이동한다. `내 방으로 돌아가기` 후 dialog 0개, Scene 입구 focus 복귀, 캐릭터 idle을 확인했다.
- 320×568: 수정된 긴 제목과 닫기 버튼, 완료 행동을 실제 화면에서 확인했다. document scrollWidth=320으로 가로 overflow가 없다.
- Builder의 수정 후 npm test 통과: 기존 이동 142개 경로·무작위 목적지 100개·충돌 3,000 step과 키 입력 회귀 검사. 서버의 Scene 모듈 HTTP 200 확인.
- Main의 별도 helper 검사는 상황 5개 × 예산 3개 조합과 미선택/잘못된 예산 차단을 통과했다. 이는 실제 UI 검증과 별도인 코드 검사다.

**완료: Experience 명세 → Builder 구현/실행 → QA 실제 mobile review(1건) → Builder 수정/실행 확인 → Main 실제 mobile 재검증.** 실제 추천 페이지는 만들지 않고 선택 조건을 다음 탐색으로 넘기는 가벼운 요약 전환까지 구현했다. 기존 원룸·자유 이동·캐릭터 선택·상품 interaction은 QA 회귀 검증을 통과했다.


## 생활 interaction — 구현 QA review

2026-09-21 · QA reviewer: pose_builder

## 검증 방식과 근거

**Main이 실제 앱을 직접 조작한 화면과 DOM 관찰을 QA sub-agent가 검토했다.** 이 reviewer가 직접 브라우저를 조작했다고 주장하지 않는다. sub-agent CUA에서는 `No browser is available` / `Browser is not available: iab`로 연결되지 않아 Main의 정상 CUA runtime에서 실행했다.

- 실행 앱: `http://127.0.0.1:4173/`
- 실제 viewport: 390×844, 320×568
- 기준: `docs/design/main_interactions.md`, 특히 §2A 상태 모델
- 증거: `work/life-qa-evidence/01-wardrobe-open.png`부터 `10-sofa-320.png`, 같은 폴더 `observations.json`, Main의 조작 관찰 전달
- 앱 코드·asset은 review 과정에서 수정하지 않았다. 브라우저에 연결되지 않아 reviewer가 생성한 탭이나 변경한 viewport도 없다.

## 관찰된 정상 동작

- 옷장 클릭 직후 primary=walking/phase=approaching, door=0, tray 없음. 도착 전 문·interaction을 시작하지 않는다. 착장 중 primary=changing_clothes/pose=change-clothes가 실제 방에 표시되고, 완료 후 블루 셔츠에서 크림 니트로 바뀌었다. 종료 후 door=0, primary=idle, offset=0, tray 없음.
- 냉장고의 문·내부 상품이 실제 화면에서 열리며, 목록 확인만 한 경우 우유 2개가 유지됐다. 명시적 사용 1회로 2→1개가 됐고 닫기 후 door=0/idle이었다. 320 화면에서 1→0 소모 후 `다 사용했어요` 버튼이 비활성임을 Main이 `isEnabled() === false`로 확인했다. JSON의 초기 `food zero disabled: false` 기록은 `isEnabled` 반환값이며 비활성 실패라는 뜻이 아니다.
- 소파는 무릎이 굽힌 좌석 pose로 보이고 primary=sitting_sofa, standingAnchor=(124,331), offset=(-22,19) 상태를 유지했다. 램프를 꺼도 sitting_sofa가 유지됐다. 다음 화장대 요청 시 Main이 stand-up/exiting을 관찰했으며 이후 walking에서는 offset=(0,0)으로 정리돼 있었다.
- 화장대는 의자 위에 앉아 거울 방향을 보고, 화장품 동작 중 primary=using_cosmetic/pose=use-cosmetic/held=true였다. action 시작 시 tray가 접혀 손·제품 영역이 가려지지 않았다. 완료 후 sitting_vanity로 돌아오고 `크림 꺼냄`이 반영됐다.
- 창문은 실제 창짝 배치·겹침이 바뀌고 data-open=1로 열렸다. 바닥 이동 후에도 open=1을 유지했다. 320 화면의 명시적 닫기 후 data-open=0 및 `창문이 닫혀 있어요`/`창문 열기` tray가 확인됐다. 아래 접근성 이름 문제와 시각적 열림 유지 성공은 별개다.
- 390/320의 캡처에서 object와 캐릭터의 주요 동작 영역이 tray 위에 보였다. 확인된 document scrollWidth는 각각 viewport 너비와 같았다. 320의 펼친 tray는 좌우 6px 안쪽, 높이 약 199px이며 첫 상품과 action에 접근할 수 있다. 소파 착석 때도 객체와 접힌 tray가 함께 보인다.

이 기록은 제공된 실제 관찰 범위의 결과다. 모든 취소 임계시점, 모든 외형 조합, blur/hidden을 독립 UI로 전수 검증했다는 뜻은 아니다. 추가 Scene/avatar/pantry/lamp 회귀 관찰과 수정 후 재검증은 Main의 실행 기록을 이어 붙인다.

## 가장 영향도가 큰 문제 — 2개

### 1. [P2] 냉장고 접근 캐릭터가 공간의 식품 잔량을 가린다

- 재현: Food/냉장고에 접근해 문을 열고 상품을 확인한다.
- 실제 결과: 캐릭터가 (262,197)에 서면서 발·다리가 우유/물/영양제 잔량 배지와 겹친다. `03-fridge-open.png`와 `08-fridge-320.png`/`09-fridge-zero-320.png`에서 일부 숫자·구분자가 가려진다.
- 영향: 냉장고를 살펴보는 바로 그 순간 공간 속 구매 식품 잔량을 한눈에 확인하기 어렵다. tray 안의 수량은 정상이다.
- 수정: 잔량 배지를 냉장고 내부 또는 옆 여백 등 접근 캐릭터/문과 겹치지 않는 위치로 옮긴다. 캐릭터·접근점·충돌을 임의로 바꾸지 않는다.
- 재검증: 390/320에서 문이 열린 상태, 우유 1개 및 0개 상태 각각 잔량 전체가 캐릭터/문/label에 가려지지 않아야 한다.

### 2. [P2] 열린 창문의 접근성 이름이 닫힌 상태 행동으로 남는다

- 재현: 창문에 도착해 열기 완료 후 창문 trigger의 aria-label을 읽는다.
- 실제 결과: 화면과 data-open은 열린 상태(1), tray는 `창문을 열었어요`인데 button 이름은 `창문 열기`로 남았다. `observations.json`의 `leave open window` 기록에서 windowButton=`창문 열기`, windowOpen=`1.000`이다.
- 영향: 키보드·스크린리더로 접근하는 사용자에게 현재 상태/다음 행동이 잘못 전달된다. 재접근 시 자동으로 닫지 않고 살펴본다는 명세와도 이름이 맞지 않는다.
- 원인 코드 확인: `paintObjects()`의 광범위한 `[data-object="window"]` 선택자가 window interaction 중 같은 data-object를 갖는 `.walker`를 먼저 선택한다. 이 관찰은 실제 label 불일치와 구분되는 코드 원인 분석이다.
- 수정: 실제 `.window-target` button을 명시적으로 선택해 stable=open이면 `열린 창문 살펴보기`, closed면 `창문 열기`로 갱신한다.
- 재검증: 열기 완료 → 다른 위치 이동 → 재접근 → 명시적 닫기 각각에서 실제 window button의 이름이 stable 상태와 일치해야 한다.

## 판정

실제 방 위의 character motion/object state 변화, 구매 상태 commit, 착석 유지와 이동 정리, 창문 상태 유지가 확인됐다. 위 두 문제를 수정하고 동일한 모바일 흐름에서 재검증하면 이번 review→fix loop를 마무리할 수 있다. 그 전에는 두 항목을 수정 완료로 표시하지 않는다.


## 수정 후 재검토 — 두 문제 해결

Main의 실제 브라우저 재조작 결과를 reviewer가 다시 검토했다. 근거는 최신 `observations.json`, `11-fixed-fridge-zero-320.png`, `13-fixed-fridge-one-390.png`, `14-fixed-fridge-one-320.png`, `15-fixed-fridge-zero-390.png`다.

- **1번 PASS:** 냉장고 문이 열린 320/390 화면에서 우유 0개·1개 각각 잔량 전체가 읽힌다. 잔량 배지 위쪽과 캐릭터 아래쪽 사이 간격이 320에서 약 6.68px, 390에서 약 8.06px로 분리됐다. 캐릭터/문/Beauty label과 배지의 글자가 겹치지 않으며 가로 overflow도 없다.
- **2번 PASS:** 열린 창 button의 접근성 이름은 `열린 창문 살펴보기`, 실제 data-open=1이다. 캐릭터 이름은 `민서, 라운드 보브, 크림 니트 착용`으로 정상 유지됐다. Main이 이탈→재접근→명시적 닫기 후 button=`창문 열기`, data-open=0을 확인했다. 실제 상태와 이름이 일치한다.

추가 실제 UI 관찰도 검토했다. 옷장 door=1 이후 `rummaging_wardrobe`/browse가 확인됐고, changing_clothes의 commit 전 Escape는 크림 니트 유지, commit 후 Escape는 블루 셔츠 유지였다. 두 취소 모두 문 닫힘/idle로 끝났다. 320에서 짧은 방향키는 먼저 소파에서 일어서고 keyup 후 움직임이 이어지지 않았다. pantry (318,198)·lamp (306,444) 접근 후 기존 modal이 열렸으며 lamp 행동, avatar 선택 취소, Scene 오늘 저녁·3만원 선택 완료가 유지됐다. Main은 console warning/error 0도 확인했다고 전달했다.

**최종 review 판정:** 선정한 실제 문제 2개 모두 수정 후 실제 모바일 화면/DOM 증거로 해결 확인. 이번 build→review→fix→run loop의 QA 검토를 마친다. 앱 코드나 원본 review 문서는 이 reviewer가 수정하지 않았다.

### Main 최종 자동 검증

최종 수정 후 `npm test` 통과: object 경로 156개, 무작위 목적지 100개, 충돌 3,000 step, 키 입력 회귀와 기존 상품 modal renderer, 상태 controller 9개 검증 묶음. 상태 검증에는 도착 전 실행 금지, 오래된 완료 이벤트 무시, commit 전/후 취소, 중복 action, 착석 종료와 keyup, 창문 유지, hidden 정리, reduced-motion의 동일 전이 규칙이 포함된다. 자동 검증은 위 실제 화면 검증과 별개다.

## Next.js / API 통합 release QA — 2026-09-21

**상태: 선정한 두 문제의 수정 및 해당 재검증 완료. 후속 avatar·창문·좌석·label 변경본의 최종 통합 검증 대기.** 이 절의 판정은 위 과거 QA와 별개다. Git push와 Vercel 배포 성공 여부는 아직 이 review의 통과 항목이 아니다.

### 검증 방식

- Main이 `http://127.0.0.1:3000`의 production 앱을 CUA로 직접 조작했다. 390×844와 320×568의 화면·DOM 관찰 결과를 QA Agent에게 전달했다.
- QA Agent는 전달된 관찰을 검토하고 `app/app.js`, `app/object-art.js`, `app/interactions.js`, `app/style.css`, API route와 자동 회귀 검사를 독립적으로 확인했다. 이 Agent가 해당 브라우저를 직접 조작하거나 캡처 파일을 직접 열어 보았다는 뜻은 아니다.
- 실제 화면 결과, 코드에서 확인한 원인, 자동 검사 결과를 구분한다. 아래 통과는 전달된 조작 범위에 한정하며 이후 avatar 변경까지 소급하여 검증 완료로 표시하지 않는다.

### Main이 실제 브라우저에서 확인한 동작

- 390×844 첫 화면은 따뜻한 하나의 개인 원룸으로 보이고, 상품 카드 진열이나 게임 HUD가 중심을 차지하지 않는다. Fashion / Food / Living / Beauty의 영어·한국어 label을 확인했다. 320×568에서도 방 구조가 유지됐으며 두 너비 모두 가로 overflow가 없었다.
- DOM에서 구매 상품 9개가 각각의 올바른 공간에 연결됨을 확인했다: 옷장 2, 냉장고 2, 팬트리 1, 소파 1, 램프 1, 화장대 2.
- Fashion → 옷 고르기 → 셔츠 선택 후 실제 캐릭터의 착장이 변경됐다.
- Food → 식품 보기에서 물 수량을 3→2→1→0으로 사용했다. 0개에서는 사용 버튼이 비활성화되고 `.object-art`의 `data-product="water"` overlay가 없어졌다.
- Living 소파에 앉은 뒤 램프를 껐을 때 room glow의 opacity가 0으로 변경됐다.
- Beauty에서 크림 행동 후 공간 label이 `크림 꺼냄`으로 바뀌었다.
- 새로고침 후 셔츠, 램프 꺼짐, 크림 선택, 물 0개가 복원됐다.

### 선정한 문제 — 2개

1. **[P2, 실제 mobile 관찰] 320 화면의 스탠드 입력 영역이 최소 폭에 미달한다.** Main이 측정한 `.lamp-target` 크기는 약 37.195×51.15px이다. interaction 명세의 최소 44×44px보다 폭이 좁다. 코드의 `width:12%; min-width:34px`가 원인이다. 최소 폭을 44px로 수정했다. **현재: production 재빌드 후 320×568에서 실제 폭 44px, 클릭·focus 복귀·가로 overflow 없음 재검증 PASS.** 자세한 실행 결과는 아래에 기록한다.
2. **[P2, controller 코드·자동 재현] 가구를 떠나는 중 같은 가구를 다시 선택하면 최신 의도가 무시된다.** 소파→냉장고 요청 직후 일어서기 중 소파를 다시 요청하면 기존 냉장고 목적지가 남았다. `REQUEST`의 동일 object 차단을 engaged/acting 등에 유지하되 exiting에는 최신 pending intent를 수락하도록 수정했다. regression에서 exit가 재시작되지 않고 안전 anchor로 정리된 뒤 마지막 소파 요청이 실행됨을 확인했다. **현재: 코드 수정 및 해당 자동 재검사 PASS.** 이 세부 빠른 입력 순서를 실제 브라우저에서 직접 재현했다고 주장하지 않는다.

### 데이터/회귀 코드 검증

API route는 사용자 1명과 `purchases`를 반환하며 no-store를 설정한다. frontend는 `/api/demo/home` 로딩 완료 후 API 사용자·구매·초기 상태를 사용한다. 고정된 prototype의 9개 상품 ID, category, roomSlot 연결을 검증한다. 로딩/오류/명시적 재시도 UI가 있고, 상품 이름과 사용자 이름은 HTML 출력 시 escape한다.

이번 구현에서 옷장·식품 구매 overlay를 API 목록 기반으로 연결했다. API에 없는 상품을 임의로 만들지 않고 식품 수량이 0이면 구매 overlay를 제거한다. 이는 **구현 중 데이터 계약 정합을 개선한 내용**이며 별도의 실제 화면 발견 문제로 중복 집계하지 않는다. 방 배경에는 일반 생활 장식이 포함되지만, 위 물 0개 관찰은 해당 구매 overlay의 제거를 확인한 것이다.

API 통합 시점의 root `npm test`는 PASS였다. 156개 경로, 무작위 목적지 100개, collision 3,000 step, 실제 app 키 입력, 비동기 API bootstrap/이름 반영/503 후 재시도, Food·Living modal action, controller의 commit·취소·창문 유지·reduced-motion, 상품 slot/소진 overlay, API 응답/초기 상태 분리 검사를 포함한다. 이후 수정본의 production build·자동 검사·실제 mobile 재실행 결과를 아래에 추가한 뒤 release QA를 닫는다.

### 수정 후 production 재실행 — 스탠드 문제 해결

Main이 production 재빌드 후 같은 320×568 viewport에서 직접 조작하고 측정한 결과를 전달했으며, QA Agent가 이를 검토했다.

- `.lamp-target` 실제 폭은 44px로 증가했다. document scrollWidth는 320px이며 가로 overflow가 없다.
- 스탠드를 직접 눌러 접근하면 `내 거실` modal에 Living 상품 2개가 표시된다. `조명 켜기` 실행 후 room glow opacity는 0.65로 바뀐다.
- Escape로 modal을 닫으면 실제 activeElement의 접근성 이름이 `Living 스탠드 조명 사용`으로 복귀한다.
- Pantry 직접 진입 시 Food 상품 3개가 보이며, 앞서 소진한 물 0개가 유지되고 사용 버튼은 비활성이다.

이번 review에서 선정한 스탠드 터치 크기 문제는 실제 production 재실행으로 해결을 확인했다. controller 최신 목적지 문제는 앞서 명시한 자동 회귀 PASS 범위다. 별도 작업에서 진행 중인 avatar 4종·세로 창문·좌석·label 변경은 이 확인으로 검증 완료 처리하지 않는다. 해당 변경본의 최종 build/모바일/interaction 통합 검증과 Git/Vercel release 확인은 계속 대기 상태다.


## 4종 아바타 교체 — QA review

2026-09-21 · Reviewer: pose_builder

## 검증 방식

Main이 `http://127.0.0.1:4173/` 실제 앱을 390×844, 320×568 viewport에서 직접 조작했다. 이 QA sub-agent는 Main이 저장한 실제 screenshot과 전달한 DOM/state 관찰을 검토했다. sub-agent의 CUA browser provider는 사용 불가였으므로, reviewer가 직접 브라우저를 조작했다고 주장하지 않는다. 앱 코드·asset·원본 docs review는 수정하지 않았다.

증거는 같은 폴더의 `picker-390.png`, `sofa-f02-390.png`, `vanity-f02-390.png`, `window-open-390.png`, `picker-320.png`, `m01-knit-320.png`, `m02-knit-walk-320.png`다. 비교 기준으로 docs/design/avatar-options의 원본 M01/M02/F01/F02 PNG와 README를 직접 확인했다.

## 확인한 결과

- 4종 선택 카드가 2×2로 보이고 각 카드에 캐릭터 한 명만 표시된다. M01의 검정 헝클머리/네이비, M02의 갈색 가르마/세이지, F01의 검정 단발/오트, F02의 갈색 긴 풀어내린 머리/슬레이트가 원본의 구분을 유지한다. F02는 묶은 머리나 단발로 바뀌지 않았다.
- 390과 320에서 네 카드, 선택 표시, 닫기, 적용 CTA가 보인다. 320의 document scrollWidth=320이며 가로 넘침은 없다. 320에서는 보조 착장 안내가 콘텐츠 스크롤 아래쪽에 있을 수 있으나 네 선택지와 적용 CTA 사용을 막지 않는다.
- F02 적용 후 기존 shirt 착장 상태가 유지됐다. 선택 프리뷰는 캐릭터별 원본 기본 옷으로 표시된다. M01은 옷장까지 걸어간 뒤 changing_clothes를 거쳐 knit이 반영됐고, M02로 변경해도 knit을 유지했다. M01/M02의 실제 모바일 캡처에서 머리/바지의 외형 구분이 유지된다.
- F02 소파 화면에서 굽힌 다리와 앉은 실루엣이 실제 좌석 위에 보인다. Main의 실제 상태는 안전 anchor=(124,389), offset=(-34,+8), sitting_sofa였다. 캐릭터가 소파 뒤나 바닥으로 잘못 붙어 보이지 않는다.
- F02 화장대 화면에서 캐릭터가 거울을 향해 의자에 앉아 있다. Main의 실제 상태는 anchor=(340,329), offset=(0,-18), direction=up, sitting_vanity였다. 화장품 사용 중 using_cosmetic/held=true가 확인됐다. 캐릭터·물체·접힌 tray가 함께 보인다.
- 창문 열린 실제 화면을 확인했다. Main은 sash translate(0,-22), open=1에서 명시적 닫기로 open=0을 확인했다. 창문 trigger의 시각 텍스트는 비어 있고, room-targets의 보이는 category text는 Fashion/Food/Living/Beauty 네 개다.
- M02 floor-tap 후 walking과 방향키 이동이 Main 실제 조작에서 확인됐다. 화면의 새 캐릭터가 기존 movement/controller 동작에 연결돼 있다.

## 가장 영향도가 큰 문제 — 1개, 수정 완료

### [P1] 선택 카드/캐릭터 내부 atlas의 다른 cell까지 중복 표시됨 → PASS

- 최초 Main 관찰: 새 renderer가 중첩 SVG로 sprite frame을 잘라 보여주는데, 기존 광범위한 SVG sizing rule이 내부 SVG까지 덮어써 atlas의 다른 cell이 같이 나타났다.
- 영향: 한 캐릭터를 고르는 화면에 다른 pose가 중복 보이거나 잘못된 크기로 노출돼 선택 경험을 훼손한다.
- 수정: 전체 frame 크기 규칙을 직접 자식 SVG에만 적용해 내부 atlas crop 크기·overflow를 보존했다. 이 수정은 Main이 수행했다.
- 재검증: 수정 후 390/320 선택 화면 모두 카드당 한 캐릭터만 보인다. 소파/화장대/창문/걷기 실제 화면에도 인접 cell·시트 글자·시트 배경이 노출되지 않는다. **해결 PASS.**

제공된 실제 증거에서 이외의 추가 actionable 문제는 발견하지 않았다. 외형의 모든 pose×방향×착장 조합을 실제 UI에서 전수 검증했다는 뜻은 아니다.

## 판정

승인 원본 외형의 네 선택지, 기존 구매 착장 유지/변경, 실제 공간에서의 착석·물체 interaction·이동 연결이 확인됐다. 선정한 atlas 중복 문제를 수정한 뒤 390/320 실제 화면에서 해결을 확인하여 이번 review→fix 검토를 완료한다.


### Main 최종 재검증

최종 옷장 뒤적임은 왼쪽 물체 방향으로 sprite를 반전해 실제 손이 물체를 향하도록 확인했다. 독립 브라우저 탭에서도 M02의 소파 접근→중앙 착석 및 offset을 확인했고 console warning/error는 0건이다. root npm test 전체 통과: 156개 경로, 무작위 목적지100, 충돌3,000 step, 입력·controller·구매slot·API 검증. localhost4173의 local server는 기존 API GET을 재사용하고 public/products 이미지도 제공하며 root Next/API 원본은 바꾸지 않는다.


## 물리 점검 · 조명 · 창문 · 침대 — 2026-09-21

**상태: build → review → fix → 실제 앱 재확인 완료.** 기존 room/4캐릭터/구매 API/Scene entry를 유지했다. 구현 전 Builder가 `work/physics-slice-spec.md`에 작은 상태 계약을 기록했고 최종 `main_interactions.md` §12에 통합했다.

### 실제 브라우저 확인

Main이 http://127.0.0.1:4173/ 앱을 CUA로 직접 조작했다. QA sub-agent pose_builder는 실제 저장 screenshot과 전달된 관찰을 검토하고 코드·geometry·실제 app handler의 가상 clock 검사를 독립 수행했다. QA sub-agent가 직접 브라우저를 조작했다는 의미는 아니다.

- **390×844 침대:** 침대 클릭 후 먼저 walking, 도착 전 bedProgress=0. 안전 anchor=(124,235)에 도착한 후 lying_bed, offset=(-52,+3), bedProgress=1. 얼굴은 베개 위, 몸은 이불 아래에 보인다. 조명을 누르면 get-up/exiting을 거쳐 offset=0으로 복귀한 후 걷는다.
- **390×844 조명:** 최종 (326,444)에 도착해 손 동작 후 켜기/끄기. 별도 modal 없음. room glow opacity는 켜짐 .65/꺼짐 0, 램프와 갓 색도 바뀐다. 본체 빠른 double click은 한 번만 꺼지고, tray의 `조명 켜기`로 다시 켜졌다. 검증 후 기존 on 상태로 되돌렸다.
- **390×844 창문:** 창문 본체 클릭 시 이동 중에는 닫힘 유지, (204,130) 도착 후 열린다. 같은 본체를 다시 누르면 닫히는 중간 progress를 거쳐 closed가 되고 접근성 이름은 `창문 열기`로 바뀐다. 기존 세로 창짝 이동과 중앙 창틀 clip을 유지한다.
- **320×568:** 침대와 캐릭터가 접힌 tray 위에 보이고 document scrollWidth=320으로 가로 넘침 없음. 집 밖 탭은 누운 상태 유지, 짧은 ArrowRight는 get-up 후 같은 안전 anchor의 idle/offset=0에서 정지했다. 이후 바닥 탭으로 일반 walking과 새 바닥 도착을 확인했다.
- **320 창문 재접근:** 창문을 열고 침대로 이동해 누운 동안 창문은 열린 상태로 유지됐다. 열린 창문 본체를 다시 누르면 먼저 침대에서 일어나고, 창 앞으로 걸어가 닫혔다. 최종 window 접근성 이름은 `창문 열기`, actor는 window/engaged였다.
- 실제 QA 탭 console warning/error는 0건이었다. 이 회차의 실제 캡처는 M02이며 네 외형의 모든 pose×착장 조합을 실제 UI로 전수 검증했다고 주장하지 않는다.

### 선정한 문제 — 1개, 수정 완료

**[P2] 침대의 새 이불이 앞쪽 협탁과 스탠드를 덮음.** 최초 390 screenshot에서 이불 overlay가 원래 별도 가구 위까지 그려졌다. 보행/exit 실패가 아니라 layer 영역 문제였다. 새 이불을 침대 상단으로 제한하고 하단 fade mask로 원본 이불에 연결했다. 수정 후 QA reviewer가 390·320 screenshot을 다시 열어 협탁 상판·소품·스탠드가 복원되고 얼굴/몸/이불 위치가 자연스러운 것을 확인했다. **해결 PASS.** 추가로 재현 가능한 physics/controller 결함은 발견하지 않았다.

### 최종 자동 검증

- root `npm test` 전체 PASS: 172 경로, 무작위 목적지 100, 충돌 3,000 step; 입력·API bootstrap/오류 재시도·구매 slot·API 응답·controller 회귀.
- controller에는 창문 raw 재접근 닫기/engaged 재탭/연타/취소 복원, lamp 접근/단일 완료 commit/commit 전 취소, bed 눕기/일어남/keyup/최신 목적지/hidden 정리를 추가했다.
- QA의 최종 실제 app handler·frame loop 검사 16개 PASS: 일곱 object 접근/종료, 소파·화장대·침대의 짧은 키와 held key, 무효 목적지, 재지정과 blur. 모든 frame에서 발 위치 walkable, 일반 walking 시 offset=0.
- 최종 lamp=(326,444), bed=(124,235) geometry: 유효 grid node 1,053개가 단일 연결 영역, 시작점+접근점의 순서쌍 경로 81개, 사선 sweep 4,212개 모두 PASS.

증거 원본은 이번 Codex 작업의 `work/physics-refresh/`와 `work/physics-audit*.json`에 저장했다. 사용자용 review 사본과 최종 mobile 캡처는 `outputs/physics-refresh/`에 정리한다. Git push·외부 배포는 이번 요청의 검증 범위에 포함하지 않는다.


## Visual Polish Round 1 — 2026-09-21

실행 계약은 visual_polish_agent.md. 화면을 먼저 보는 독립 Visual QA가 390×844의 V01~V11와 주요 중간 프레임을 검토해 3건(High1/Medium2)을 선정했다. Builder는 화장대 다리/좌판 관계, 소파 쿠션 크기/접점, 램프 중복 실루엣/glow/손 접점을 수정했다. 동일 상태와 320×568을 다시 검토한 결과 세 건 PASS, 새 High0으로 1 round에서 조기 종료했다. 기존 이동/controller/상품/Scene architecture와 기능을 유지했다.

Main 실제 기본 속도 회귀와 최종 npm test 전체 PASS, console warn/error 0, 320 overflow 0. tests/visual/capture.mjs는 현재 CUA tab으로 상태 검증+스크린샷+전후 metadata를 반복 수집하고 MISSED를 분리한다. 단순 pixel diff로 자연스러움을 판정하지 않았다. 전체 defect/증거/known detail은 [visual_polish_review.md](visual_polish_review.md)에 기록한다.


## 사용자 재지적: 조명 팔 · 화장대 착석 · TV 쪽 접근 (2026-09-21)

이전 시각 PASS를 철회하고 Main 실제 실행 → Visual QA 독립 검토 → Builder 수정 → 동일 화면 재검토를 수행했다. 조명 원본 팔 중복을 제거하고, 화장대는 몸통을 낮추고 골반·무릎이 접힌 seated pose와 offset (0,-6)으로 맞췄다. 의자 아래까지 클릭 영역을 늘려 TV 사이 통로에서도 앉을 수 있다. 보행 collider는 유지한다. 재검토에서 드러난 화장품 사용 중 어깨 틈도 native shoulder cap/pivot로 수정했다.

390×844·320×740·320×568 실제 앱에서 네 외형의 착석, 주요 외형의 팔 중간 프레임, 기립과 조명 양방향 토글, TV 통로 접근을 확인했다. 관측한 이번 수정 범위에 미해결 High 없음. 일반 속도 M01 lamp peak는 capture missed로 제외했고 느린 진단 프레임의 M02/F01/F02 peak를 직접 검토했다. 전체 앱의 blanket PASS는 복원하지 않는다.

`npm test` 통과: 이동 경로176/무작위목적지100/키보드3000 및 기존 입력·state·API·상품 회귀. 마지막 V08 shoulder cap 수정은 Builder84개 포즈검사와 Main/QA의 동일peak 재촬영으로 확인했다. 최종 일반 URL의 console error0, object owner/offset 정리 정상. 최신 상세 검토는 visual_polish_review.md의 사용자 피드백 재검증 절과 아래 증거를 따른다.
/Users/gsretail/Documents/Codex/2026-09-21/agents-md-docs-ideas-doc03-final/outputs/pose-correction/review.md


## 제공된 정후면 착석 이미지 적용 — 2026-09-21

M01/M02/F01/F02의 `vanity-seated-back` PNG를 실제 화장대 착석에 직접 사용했다. 앱·배포용 파일은 제공된 원본과 SHA-256이 동일하다. SVG clip으로 배경과 참고용 나무 스툴만 제외하고 방의 흰 의자를 사용한다.

- 정후면 머리·등, 가려진 허벅지, 짧은 종아리와 가까운 뒤꿈치 유지.
- 골반과 의자 좌판의 접점을 맞추고 기존 이동 dock/충돌/접근 경로 유지.
- 구매 셔츠·니트 착장 유지. 사용 중 머리와 겹치던 상품 상태 문구는 잠시 숨기고 종료 후 복원.
- 화장품 사용 시 정후면 팔을 유지하며 소매 앞 상품·손끝 일부와 작은 움직임 표시.

Visual QA는 코드 대신 실제 렌더 화면을 검토했다. 발견 4건(High 1 / Medium 3)을 수정하고 같은 조건에서 재확인했다. 네 캐릭터의 셔츠 착석을 390×844에서, F02 니트 착석·이동·아래쪽 접근을 320×568에서 확인했다. 추가로 착석/기립 중간 상태, M02/F02 화장품 동작 두 프레임과 종료 상태를 검토했다. 미관측 외형·착장 전체 조합까지 일괄 PASS로 확대하지 않았다.

`npm test` 전체 통과: 경로176/무작위목적지100/키 입력3000 및 input/controller/API/product 회귀. 브라우저 오류0, 기립 후 offset0, 상품 상태 문구 복원 확인. 기존 옷장 착장 변경과 냉장고·창문 흐름도 실제 실행했으며, 소파는 도착 상태를 관측했지만 시간 제한으로 놓친 screenshot은 시각 판정에서 제외했다.


증거: /Users/gsretail/Documents/Codex/2026-09-21/agents-md-docs-ideas-doc03-final/outputs/vanity-reference/review.md


## 2026-09-21 — Room category navigation / icon integration QA

- 실제 브라우저: 390×844 mobile, 1280×900 desktop. 옷장·냉장고·화장대·소파의 첫 탭은 생활 동작, 준비 후 재탭은 해당 tab으로 이동. N1–N7 PASS; Pantry 추가 경로와 뒤로 가기/동일 object 재진입도 PASS.
- 수정한 integration 문제: (1) 버튼화한 room label의 회색 기본 배경 제거 (2) lamp의 잘못된 category 안내/CTA 제거 (3) Food/Beauty 구매 상품을 room과 같은 API에 연결. 동일 흐름 재검증 PASS.
- I1–I6: 실제 production screenshot에서 custom SVG 4종의 24px/1.65px 선·56px 터치 높이·11px label·subtle active 표시 확인. 가로 overflow/깨진 image/브라우저 console 오류 없음. 기존 찜 기능 유지 확인.
- 검증: 전체 npm test, typecheck, production build PASS. 기존 미커밋 변경과 분리한 commit 후보에서도 input/controller 검사 PASS.
- 범위 제한: Food/Beauty는 기존 구매 상품 landing만 제공하며 추천 기능은 이번 작업에 추가하지 않음.


## 2026-09-22 — 캐릭터별 구매내역 QA

- 민서 기본 공간 10개와 지우 선택 후 F02·이름·구매 목록 변경을 실제 브라우저에서 확인. 390px 캐릭터 선택 카드·적용 버튼 표시 정상.
- 뷰티의 새 보유 상품 사진과 단일 선택 추천, 식품 구매 3개 사진을 확인. API로 네 캐릭터의 모든 구매 40건을 추가 검증했다.
- 리뷰에서 발견한 문제 1개: 홈의 사진 오류 대체가 다른 상품 모양을 표시할 수 있음. 실제 사진 실패는 중립 안내로 변경하고 기존 그림 fallback과 분리했다.
- 전체 테스트·타입·빌드·실서버 API 계약 통과. 게임 이미지가 없는 현재 브랜치에서는 기존 공간용 예시를 유지하며 상품 사진을 진열용 착장 애니메이션으로 취급하지 않는다.
