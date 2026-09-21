# G:Scene Hackathon

## Source of truth

현재 확정된 제품 기획은:

docs/ideas/doc03_final_ideation.md

이다.

이전 ideation 문서는 탐색 기록이다.
새로운 제품 방향을 다시 기획하지 않는다.

현재 목표는 G:Scene의 Main Screen을
실제로 실행 가능한 mobile web prototype으로 만드는 것이다.

문서보다 working software를 우선한다.

---

## Current vertical slice

첫 구현에서는 전체 서비스를 만들지 않는다.

다음 네 가지 경험만 완성한다.

1. 2D dollhouse 형태의 개인 공간
2. Fashion / Food / Living / Beauty 영역
3. 사용자가 구매한 상품이 공간에 존재
4. 공간의 주요 object를 클릭하면 실제 interaction 발생

Scene 추천, 실제 로그인, 실제 구매, 전체 카테고리 페이지,
실제 backend 연동은 이 단계에서 만들지 않는다.

---

## Agent workflow

Main Agent는 혼자 모든 작업을 하지 않는다.

필요한 경우 아래 역할의 sub-agent를 사용한다.

### Experience Agent

코드를 수정하지 않는다.

담당:
- main screen layout
- 공간 구조
- object 위치와 역할
- interaction
- visual direction
- 필요한 asset 정의

결과를:

docs/design/main_screen_spec.md

에 작성한다.

Builder가 바로 구현할 수 있을 만큼 구체적으로 작성한다.

---

### Builder Agent

실제 app/ 코드를 수정한다.

목표는 예쁜 설계 문서가 아니라
실제로 실행되는 prototype이다.

우선 단순한 기술을 사용한다.

가능하면:
- React
- CSS
- SVG / image assets
- simple animation

으로 구현한다.

불필요한 backend, game engine, WebGL 등의 도입을 피한다.

구현 후 반드시 앱을 실행한다.

---

### QA Agent

가능하면 코드를 수정하지 않는다.

실제 앱을 실행하고 mobile viewport에서 직접 확인한다.

다음을 검증한다.

- 앱이 정상 실행되는가
- main screen이 깨지지 않는가
- interactive object가 실제 작동하는가
- 사용자가 산 상품이 공간에 표현되는가
- Fashion / Food / Living / Beauty를 이해할 수 있는가
- 첫인상이 '쇼핑몰 상품 진열'보다 '내 공간'에 가까운가
- 너무 게임처럼 보이지 않는가
- 정보와 배너가 다시 복잡해지지 않았는가

결과를:

docs/design/main_screen_review.md

에 기록한다.

한 번의 review에서 가장 영향도가 큰 문제 최대 3개만 선정한다.

---

## Build loop

항상:

spec
→ build
→ run
→ inspect
→ review
→ fix
→ run again

순서로 진행한다.

작동하지 않는 코드를 완료했다고 보고하지 않는다.

첫 번째 결과를 완성품으로 취급하지 않는다.

최소 1번의 review/fix loop를 수행한다.

---

## Decision rule

Agent가 스스로 판단할 수 있는 구현 세부사항은
사용자에게 계속 질문하지 않는다.

단, 제품의 핵심 방향을 변경해야 하는 경우에만 사용자에게 확인한다.