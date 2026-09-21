# G:Scene Overnight Product Quality Loop

## 0. 목적

이번 작업의 목적은 기능을 더 많이 만드는 것이 아니다.

현재 G:Scene prototype을 실제 사람이 사용하는 제품이라고 생각하고
계속 관찰하면서,

- 이상한 자세
- 부자연스러운 interaction
- 불일치하는 상품
- 어긋난 정렬
- 부족한 information architecture
- 통일되지 않은 tone & manner
- 설명은 되지만 설득되지 않는 presentation

같은 "작은데 제품 완성도를 크게 깎는 문제"를
스스로 발견하고 하나씩 제거하는 것이다.

첫 QA를 통과했다고 종료하지 않는다.

**관찰 → 문제 발견 → 우선순위 → 수정 → 실제 화면 검토 → 재평가**

loop를 반복한다.

---

# 1. 종료 시간

이번 autonomous quality run은

2026-09-22 07:00 KST

까지를 목표로 한다.

첫 번째 PASS에서 종료하지 않는다.

현재 시각이 종료 시각 이전이고,
수정 가능한 High/Medium quality issue가 남아 있다면
다음 review cycle을 시작한다.

단 다음 경우에는 조기 중단 가능하다.

- 사용자의 인증/권한이 반드시 필요한 blocker
- destructive operation이 필요한 경우
- 제품 방향의 큰 변경이 필요한 경우
- 실행 환경 자체가 더 이상 사용 불가능한 경우

이 경우 blocker만 기록하고,
독립적으로 진행 가능한 다른 작업은 계속한다.

---

# 2. 가장 중요한 원칙

## Functional correctness != Product quality

기능이 작동한다고 제품이 완성된 것이 아니다.

예:

소파에 앉을 수 있음
→ PASS 아님.
→ 사람이 봤을 때 자연스럽게 앉아 있어야 PASS.

옷장이 열림
→ PASS 아님.
→ Fashion 탭에서 보유한 실제 동일 상품이
  자연스럽게 걸려 있어야 PASS.

카테고리 탭이 존재함
→ PASS 아님.
→ 전체 navigation hierarchy에서
  사용자가 어디에 있고 어떻게 내 공간으로 돌아가는지
  즉시 이해할 수 있어야 PASS.

PPT가 5장 존재함
→ PASS 아님.
→ "무엇을 만들었나"뿐 아니라
  "왜 이 문제를 이렇게 풀어야 했는가"가 전달되어야 PASS.

---

# 3. Agent Architecture

Main Agent는 직접 모든 것을 고치는 Builder가 아니다.

다음 역할을 필요에 따라 sub-agent로 운영한다.

## A. Product / UX Critic — 가장 중요

실제 앱을 사람처럼 사용한다.

코드를 먼저 읽지 않는다.

화면과 interaction을 먼저 관찰하고
"뭔가 이상한데?"를 찾아낸다.

특히 다음 질문을 반복한다.

- 처음 보는 사람이 지금 어디에 있는지 아는가?
- 다음에 무엇을 눌러야 할지 자연스러운가?
- 이것이 실제 생활 공간처럼 느껴지는가?
- 디자인 요소들이 하나의 제품에서 나온 것처럼 보이는가?
- 임시 구현 / 개발자 placeholder처럼 보이는 곳은 없는가?
- 사용자가 설명을 듣지 않아도 이해할 수 있는가?
- 같은 개념이 화면마다 다르게 표현되고 있지는 않은가?

한 cycle에서 가장 영향도가 높은 문제 3~5개만 고른다.

---

## B. Visual Consistency Critic

pixel-perfect regression이 아니라
사람 눈으로 보는 plausibility를 검사한다.

특히:

- 캐릭터 눈 / 얼굴
- 신체 비율
- seated pose
- 다리 / 팔 각도
- clipping
- grounding
- 상품 placement
- furniture perspective
- object scale
- padding
- alignment
- spacing
- typography
- icon family
- active / inactive states
- animation intermediate frame

을 검사한다.

---

## C. State / Data Consistency Auditor

같은 사용자의 같은 상품과 상태가
모든 화면에서 동일하게 유지되는지 확인한다.

특히:

Fashion tab owned products
↔ wardrobe clothes

confirmed outfit
↔ room avatar outfit

Food owned products
↔ fridge/pantry products

product id
↔ category
↔ room object
↔ API

를 검사한다.

"비슷하게 보인다"가 아니라
동일한 product/state source를 사용하는 것을 확인한다.

---

## D. Builder

Critic이 선정한 문제만 수정한다.

새 기능을 임의로 추가하지 않는다.

문제를 숨기거나 interaction을 제거해서
QA를 통과시키지 않는다.

---

## E. Presentation Critic

PPT를 "무엇을 만들었는가" 설명자료로 만들지 않는다.

각 슬라이드에 대해 반드시 묻는다.

1. 그래서 이 slide의 주장 한 문장은 무엇인가?
2. 왜 이것이 문제인가?
3. 왜 기존 방식으로는 충분하지 않은가?
4. 왜 G:Scene이어야 하는가?
5. 이 slide를 보고 리더가 무엇을 기억해야 하는가?

What만 있고 Why / So what이 없으면 FAIL.

---

# 4. 현재 반드시 다시 검토할 Known Issues

이 목록은 수정해야 할 시작점이지,
전체 문제 목록이 아니다.

## Character

- vanity에 앉았을 때 자세가 여전히 부자연스러움
- 특히 다리 / 골반 / 의자 alignment 확인
- 모든 sitting state를 다시 비교

## Wardrobe ↔ Fashion

- 옷장에 걸린 옷과 Fashion tab의 owned clothes가 일치하지 않음
- 동일 product ID / 동일 source를 사용하도록 정리
- 너무 많으면 owned products 중 3~4개만 선택
- 별도 fake wardrobe clothing을 만들지 않음

## Category UI

- 작은 alignment / padding / spacing 문제가 여러 곳 존재
- typography baseline
- icon과 label 정렬
- card spacing
- CTA hierarchy
- section spacing
을 실제 screenshot 기준으로 다시 검토

## Tone & Manner

전체 화면을 나란히 놓고:

- color
- radius
- shadow
- line weight
- typography
- iconography
- spacing
- interaction feedback

가 하나의 design system처럼 느껴지는지 확인.

부분적으로 예쁜 화면보다
전체 product coherence를 우선한다.

## Navigation / Room Home

현재 "방으로 돌아가기"가 상단에만 있어
navigation hierarchy가 약할 수 있다.

Bottom navigation의 중앙에

Room / My Room / Home

역할의 강한 entry를 두는 방향을 우선 검토한다.

예:

Fashion | Food | ROOM | Living | Beauty

ROOM은 단순 집 아이콘이 아니라
"내 생활 공간으로 돌아간다"는 제품의 핵심 개념이어야 한다.

Product/UX Critic이 실제 mobile navigation으로 검토하고,
현재 구조보다 명확하다면 구현한다.

중앙 entry는 다른 category tab보다
조금 더 상징적으로 표현할 수 있으나
게임 HUD처럼 과도하면 안 된다.

---

# 5. Canonical Product Review

각 quality cycle마다 최소 다음 화면/상태를 실제로 확인한다.

Mobile:
390 × 844
320 × 568

States:

1. Room idle
2. Walking
3. Sofa sitting
4. Vanity sitting
5. Wardrobe closed
6. Wardrobe open
7. Wardrobe clothes
8. Fashion tab
9. Outfit preview
10. Outfit applied
11. Room after outfit applied
12. Fridge open
13. Food tab
14. Living tab
15. Beauty tab
16. Window interaction
17. Lamp interaction
18. Bottom navigation
19. Room return flow
20. Scene entry

가능하면 screenshot contact sheet를 만들어
화면을 한 번에 비교한다.

개별 화면만 보지 않는다.

---

# 6. UX Review Questions

각 화면마다 체크박스를 채우는 식으로 끝내지 않는다.

Product Critic은 최소 다음 질문을 실제로 답한다.

### Orientation

지금 어디인가?
어디로 갈 수 있는가?
방으로 어떻게 돌아가는가?

### Affordance

무엇을 누를 수 있는지 보이는가?
왜 눌러야 하는지 이해되는가?

### Continuity

Room → Category → Room이
한 제품 경험처럼 이어지는가?

### Consistency

같은 상품 / 사용자 / 상태가
화면마다 동일한가?

### Plausibility

사람 / 가구 / 상품이
사람 눈에 자연스럽게 보이는가?

### Tone

모든 화면이
같은 G:Scene 제품처럼 보이는가?

### Delight

최소 한 군데 이상
"오, 이건 재밌다"는 작은 순간이 있는가?

---

# 7. Quality Backlog

Critic은 발견한 모든 것을 바로 고치지 않는다.

각 issue를:

P0 — flow/state가 깨짐
P1 — 사람이 즉시 이상함을 느낌
P2 — 제품 완성도를 명확히 낮춤
P3 — 미세 polish

로 분류한다.

각 cycle에서는:

P0 → P1 → P2

순서로 최대 3~5개 수정한다.

P3 때문에 무한 수정하지 않는다.

각 issue에는:

- screenshot/state
- problem
- why it matters
- proposed fix
- result

를 기록한다.

---

# 8. Quality Loop

한 cycle:

1. production/local app 실행
2. canonical states 관찰
3. Product/UX Critic review
4. Visual Critic review
5. State/Data audit
6. 최대 5개 issue 선정
7. Builder 수정
8. 동일 state 재검토
9. related regression test
10. 전체 화면 consistency review
11. score/update
12. 다음 cycle 여부 판단

첫 cycle에서 멈추지 않는다.

종료시간 이전이고
P1/P2 문제를 합리적으로 더 개선할 수 있으면
다음 cycle을 시작한다.

---

# 9. Product Quality Score

매 cycle 끝에 100점 만점으로 기록한다.

이 점수 자체가 목표는 아니며
quality regression을 보는 용도다.

### UX clarity — 20
navigation / orientation / affordance

### Visual plausibility — 20
pose / placement / geometry / naturalness

### Consistency — 20
product / state / design language

### Product identity — 15
G:Scene만의 느낌

### Interaction quality — 15
motion / feedback / continuity

### Mobile polish — 10
spacing / clipping / touch / hierarchy

점수 근거를 한 줄씩 적는다.

점수가 올랐다고 무조건 종료하지 않는다.

---

# 10. Presentation Quality Loop

Presentation도 별도 cycle을 돈다.

최대 5장.

각 slide마다:

CLAIM
→ WHY
→ EVIDENCE / VISUAL
→ SO WHAT

구조가 있어야 한다.

특히 다음 실패를 피한다.

"현재 GS SHOP은 이렇습니다."
"그래서 이런 화면을 만들었습니다."
"Agent를 사용했습니다."

만 나열하면 FAIL.

Deck 전체가 답해야 하는 질문:

왜 기존 상품 진열 중심 커머스 경험이
일부 고객에게 자신과 무관한 공간처럼 느껴지는가?

왜 상품이 아니라
"나의 생활 공간"을 쇼핑의 시작점으로 바꾸는 것이
의미 있는 reframe인가?

왜 GS SHOP이 이미 가진 상품/공급/추천 자산과
이 경험이 연결되는가?

왜 이것이 단순한 귀여운 UI가 아니라
새로운 commerce interface인가?

Agent는 어떻게
이 아이디어를 짧은 시간 안에 실제 제품으로 만들게 했는가?

Presentation Agent는:

draft
→ narrative critic
→ visual critic
→ revision

을 최소 2 cycle 수행한다.

---

# 11. Hourly Reporting

약 1시간마다 사용자에게 알려주되
답변을 기다리지 않는다.

형식:

## HH:MM

Observed
- 이번 시간에 새로 발견한 중요한 문제

Fixed
- 실제 수정한 것

Quality
- 이전 score → 현재 score
- 아직 부족한 영역

Presentation
- narrative / slide 진행 상황

Next
- 다음 cycle에서 볼 것

같은 내용을
docs/logs/nightly_quality_log.md
에도 append한다.

---

# 12. Definition of Done

다음 두 조건을 모두 만족할 때만
종료 시각 전에 조기 종료할 수 있다.

### Product

- P0 = 0
- P1 = 0
- major P2가 더 이상 없음
- canonical states 전체 재검토
- Fashion ↔ wardrobe product consistency PASS
- confirmed outfit persistence PASS
- sitting pose 자연스러움 PASS
- bottom navigation orientation PASS
- design tone consistency PASS
- mobile PASS
- production deployment PASS

### Presentation

- 5장 이하
- What뿐 아니라 Why가 명확함
- 제품의 reframe이 기억남
- 실제 prototype evidence가 있음
- visual quality gate PASS
- narrative critic 2회 이상 수행

둘 중 하나라도 부족하면
종료 시각 전에는 계속 다음 cycle을 수행한다.

---

# 13. 가장 중요한 행동 원칙

문제가 명시적으로 주어질 때까지 기다리지 않는다.

**스스로 제품을 보고 문제를 찾아라.**

Builder처럼 생각하기 전에
Product Designer처럼 관찰한다.

Product Designer처럼 관찰한 뒤
Engineer처럼 원인을 찾고 고친다.

그리고 다시 사용자처럼 화면을 본다.

이 반복이 오늘 밤의 작업이다.
