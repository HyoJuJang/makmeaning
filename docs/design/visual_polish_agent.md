# G:Scene Visual Polish & Plausibility QA

## 목적

현재 G:Scene은 기능적으로는 동작하지만,
AI 바이브코딩 특유의 "묘하게 이상한 디테일"이 남아 있다.

예:

- 화장대에 앉았을 때 다리가 비정상적으로 벌어짐
- 소파 위 쿠션/상품이 자연스럽게 놓이지 않고 턱 얹혀 있음
- 조명 on/off 시 회전축이나 움직임이 물리적으로 이상함
- 옷장 안 옷이 걸린 느낌이 아니라 겹치거나 떠 있음
- 캐릭터가 가구에 앉거나 접근할 때 위치와 자세가 어색함
- object가 바닥/선반/가구에 닿지 않고 공중에 떠 있음
- 문, 창문, 냉장고의 pivot/hinge가 부자연스러움
- z-index 때문에 캐릭터나 물건이 앞뒤 관계를 잘못 가짐

이번 작업의 목표는 기능을 추가하는 것이 아니다.

**이미 구현된 화면과 interaction을 실제 사람이 보는 것처럼 검토하고,
"왜 저렇게 생겼지?" 싶은 디테일을 찾아 수정해
완성도 높은 제품처럼 보이게 만드는 것**이다.

---

# 핵심 원칙

Functional PASS와 Visual PASS는 별개다.

예:

- sofa에 앉기 state가 정상 작동해도
  캐릭터의 다리가 기괴하면 Visual FAIL

- fridge open/close가 작동해도
  문이 이상한 축을 중심으로 회전하면 Visual FAIL

- 상품 데이터가 올바르게 렌더링되어도
  쿠션이 소파 위에 어색하게 떠 있으면 Visual FAIL

"기능이 된다"는 이유로 시각적 문제를 통과시키지 않는다.

---

# 반드시 검토할 Canonical States

실제 앱을 실행하고 아래 장면을 하나씩 만든 뒤
mobile viewport에서 screenshot 또는 실제 화면을 확인한다.

기본 viewport:
390 × 844

## V01 — Default Idle
캐릭터가 아무 interaction 없이 방에 서 있는 상태.

## V02 — Walking
캐릭터가 이동 중인 상태.

## V03 — Wardrobe Browsing
옷장에 접근하고 문을 열어 옷을 보는 상태.

## V04 — Outfit Changed
옷을 갈아입은 직후의 상태.

## V05 — Fridge Open
냉장고 문이 열리고 내부 상품이 보이는 상태.

## V06 — Sofa Sitting
캐릭터가 소파에 앉아 있는 상태.

## V07 — Vanity Sitting
캐릭터가 화장대에 앉아 있는 상태.

## V08 — Vanity Interaction
화장품을 사용하거나 화장대와 interaction하는 상태.

## V09 — Window Open
창문이 열린 상태.

## V10 — Lamp On / Off
조명을 켜고 끄는 두 상태.

## V11 — Product Placement
Fashion / Food / Living / Beauty 구매 상품이
모두 공간에 놓여 있는 상태.

---

# Visual QA Checklist

각 canonical state에서 아래를 검토한다.

## 1. Character Pose

- 앉은 자세가 사람의 자연스러운 자세처럼 보이는가
- 엉덩이가 실제 seating surface 위에 있는가
- 무릎/다리/발 방향이 부자연스럽지 않은가
- 팔/손/다리가 몸이나 가구를 심하게 관통하지 않는가
- 캐릭터가 공중에 뜨거나 바닥에 박히지 않는가
- 앉기 → 일어나기 → 걷기의 transition이 자연스러운가
- interaction 종료 후 이상한 pose가 남지 않는가

---

## 2. Object Grounding

모든 object/product는 현실적으로 어디에 지지되고 있는지 보여야 한다.

확인:

- 바닥에 있는 물건은 바닥에 닿아 있는가
- 선반 위 물건은 선반 위에 놓여 있는가
- 쿠션은 소파 위에 자연스럽게 기대거나 눌려 있는가
- 옷은 hanger/rail에 실제로 걸려 있는 느낌인가
- 화장품은 화장대 위 사용 가능한 위치에 있는가
- 냉장고 상품은 내부 선반에 자연스럽게 배치되는가
- object가 공중에 뜨거나 가구 안에 반쯤 박히지 않는가
- 주변 furniture와 scale이 어울리는가

---

## 3. Furniture Physics / Geometry

- wardrobe door의 hinge 방향이 자연스러운가
- fridge door가 자연스러운 pivot을 사용해 열리는가
- window가 현실적인 방향으로 열리는가
- lamp에서 움직여야 할 부분만 움직이는가
- 가구 전체가 갑자기 회전하거나 이동하지 않는가
- 문이 벽이나 캐릭터를 심하게 관통하지 않는가

완벽한 물리엔진이 목표는 아니다.

**사람 눈에 자연스럽게 보이면 된다.**

---

## 4. Layer / Occlusion

- 캐릭터가 가구 앞에 있을 때 적절히 앞에 보이는가
- 뒤로 지나갈 때 자연스럽게 가려지는가
- 상품이 furniture보다 잘못된 z-index로 앞으로 튀어나오지 않는가
- 문이 열렸을 때 앞/뒤 layer가 자연스러운가
- 캐릭터가 object에 비정상적으로 묻히지 않는가

---

## 5. Composition

- 물건을 "아무 데나 올려놓은 느낌"이 나지 않는가
- 상품끼리 지나치게 겹치지 않는가
- 공간이 답답하거나 비정상적으로 비어 보이지 않는가
- room perspective와 product perspective가 크게 충돌하지 않는가
- Fashion / Food / Living / Beauty 각각이 생활 공간의 일부처럼 보이는가

---

## 6. Animation / Transition

- teleport처럼 위치가 갑자기 튀지 않는가
- animation 시작/끝 frame이 어색하지 않은가
- 앉기 전에 캐릭터가 적절한 위치에 도착하는가
- 일어나기 전에 바로 걷기 시작하지 않는가
- 옷 갈아입기 중 기괴한 intermediate frame이 오래 보이지 않는가
- fridge/window/wardrobe open-close transition이 자연스러운가

---

# Visual Defect Format

Visual QA Agent는 코드를 바로 수정하지 않는다.

먼저 가장 눈에 띄는 문제를 최대 5개만 선정한다.

각 defect는 다음 형식으로 기록한다.

## VIS-XX

State:
V07 — Vanity Sitting

Problem:
캐릭터가 화장대 의자에 앉았지만 양쪽 다리가 지나치게 벌어져
자연스러운 seated pose로 보이지 않는다.

Why it matters:
화면 전체가 잘 만들어져 있어도 캐릭터 pose가 이상하면
prototype이 즉시 조악해 보인다.

Expected:
엉덩이와 의자 중심이 정렬되고,
다리가 자연스럽게 아래 또는 앞쪽으로 향해야 한다.

Severity:
High / Medium / Low

Suggested fix:
sitting pose의 leg offset / rotation / avatar anchor 조정.

---

# Severity

## High

사용자가 바로 이상하다고 느끼는 것.

예:

- 기괴한 pose
- 명백한 clipping
- floating object
- 잘못된 hinge
- 큰 scale 오류
- 이상한 z-index

반드시 수정한다.

## Medium

눈에 띄지만 제품 이해에는 영향을 주지 않는 문제.

시간이 허락하면 수정한다.

## Low

미세한 polish.

이번 loop에서는 무시해도 된다.

---

# Autonomous Polish Loop

Main Agent는 아래 loop를 최대 3회 수행한다.

## Round

1. 앱 실행
2. canonical states 생성
3. 실제 rendered 화면/screenshot 확인
4. Visual QA sub-agent가 최대 5개 defect 선정
5. High severity부터 Builder가 수정
6. 동일 canonical state 재생성
7. Visual QA가 before / after 비교
8. 수정된 defect PASS/FAIL 판정
9. functional regression 확인
10. 남은 High defect 확인

High defect가 없으면 조기 종료한다.

3 round 이후에는
Medium/Low 문제 때문에 무한 반복하지 않는다.

---

# Functional Regression

Visual 수정 때문에 기존 기능을 깨뜨리면 안 된다.

각 round가 끝날 때 최소한 확인:

- 자유 이동
- tap-to-move
- character selection
- outfit state
- wardrobe interaction
- fridge interaction
- sofa sit/stand
- vanity interaction
- window interaction
- lamp interaction
- mobile viewport

---

# Recommended Automation

가능하면 canonical state screenshot 생성을 반복 가능하게 만든다.

예:

tests/visual/

- idle.png
- walking.png
- wardrobe.png
- outfit-changed.png
- fridge-open.png
- sofa-sitting.png
- vanity-sitting.png
- window-open.png
- lamp-on.png
- products-room.png

가능하면 하나의 command로 재생성할 수 있게 한다.

예:

npm run qa:visual

단:

pixel diff만으로 Visual PASS를 판단하지 않는다.

이상한 화면이 어제와 오늘 동일하게 렌더링되면
pixel regression test는 PASS하기 때문이다.

Visual QA Agent가 실제 rendered image를 보고
plausibility를 판단해야 한다.

---

# Reporting

Main Agent는 중간 승인 없이 계속 진행한다.

단, 각 round 종료 시 사용자에게 짧게 알려준다.

예:

Round 1
- 11 states 검토
- visual defect 5개
- High 3 / Medium 2
- Vanity pose / sofa product / lamp pivot 수정 중

Round 2
- High 3개 수정 완료
- 재검증 2 PASS / 1 FAIL
- wardrobe clipping 추가 발견

최종 보고:

- 검토한 states
- 발견한 defect 수
- 수정 완료 defect
- 남은 known visual issue
- functional regression 결과
- relevant screenshots

만 보여준다.

---

# Completion Criteria

다음을 모두 만족하면 Visual Polish 작업을 종료한다.

- 모든 canonical state 검토 완료
- High severity visual defect 0개
- 캐릭터 pose에 명백한 기괴함 없음
- 상품/object에 명백한 floating/clipping 없음
- 주요 furniture interaction geometry가 자연스러움
- 주요 z-index 오류 없음
- functional regression PASS
- mobile viewport PASS

목표는 perfect game physics가 아니다.

**사용자가 화면을 보자마자
"AI가 대충 만든 화면 같다"고 느끼게 만드는 디테일을 제거하는 것**이다.