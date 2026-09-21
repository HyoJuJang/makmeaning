# G:Scene — Execution Guide

Repository:
https://github.com/HyoJuJang/makmeaning.git

Product source of truth:
`docs/ideas/doc03_final_ideation.md`

---

# 1. Mission

우리가 만드는 것은 단순한 쇼핑몰 UI가 아니다.

G:Scene은 사용자가 GS SHOP에 들어왔을 때

> "상품이 잔뜩 진열된 쇼핑몰"

이 아니라

> "내가 구매한 물건들과 함께 살아가는 나의 공간"

이라고 느끼게 만드는 interactive commerce experience다.

현재 가장 중요한 목표는 아이디어를 더 만드는 것이 아니라,
이 컨셉이 실제로 작동하는 **convincing web prototype**을 빠르게 만드는 것이다.

---

# 2. Current Vertical Slice

현재 구현해야 하는 최소 완성 단위는 다음이다.

사용자 1명.

이 사용자는 GS SHOP에서 이미 여러 상품을 구매했다고 가정한다.

구매 상품은 네 카테고리에 존재한다.

- Fashion
- Food
- Living
- Beauty

각 카테고리에는 약 2~6개의 구매 상품이 있다.

예:

Fashion
- 셔츠
- 가방
- 니트

Food
- 생수
- 견과
- 영양제
- 간편식
- 음료

Living
- 무드등
- 수건
- 생활용품

Beauty
- 토너
- 크림
- 립
- 선크림

이 상품들은 단순 목록으로 보이는 것이 아니라
사용자의 방 안에 실제 물건처럼 존재해야 한다.

예:

Fashion → wardrobe / hanger  
Food → fridge / pantry  
Living → living area  
Beauty → vanity / bathroom

---

# 3. Definition of Success

이번 vertical slice는 아래가 모두 충족되면 성공이다.

## Product

사용자가 첫 화면을 봤을 때

> "어? 쇼핑몰인데 내 공간 같네."

라는 인상을 받을 수 있어야 한다.

구매 상품이 단순 추천 카드가 아니라
사용자의 생활 공간에 존재하는 물건처럼 보여야 한다.

## Functional

다음이 실제로 작동해야 한다.

- web app 실행
- 사용자 1명 로딩
- Fashion / Food / Living / Beauty 데이터 존재
- 각 category에 여러 구매 상품 존재
- 구매 상품이 올바른 공간에 렌더링
- 모바일 화면 정상
- 기본 object interaction 정상
- refresh 후에도 정상 시작

## Engineering

다음을 통과해야 한다.

- production build PASS
- runtime error 없음
- `/api/demo/home` 정상 응답
- frontend는 API contract를 통해 데이터를 사용
- secret / token / credential이 repository에 없음
- Git history가 정상
- main branch가 deploy 가능한 상태
- Vercel deployment 성공

## Demo

Vercel URL 하나를 열었을 때
다른 설명 없이도 최소 30초 안에 다음을 보여줄 수 있어야 한다.

1. 사용자의 개인 공간
2. 네 생활 영역
3. 실제 구매 상품
4. 공간과 상품의 연결
5. 최소 하나 이상의 interaction

---

# 4. Non-goals

현재 단계에서는 만들지 않는다.

- 로그인
- 실제 회원 데이터
- 실제 구매
- 결제
- 추천 모델
- 실제 GS SHOP API
- DB
- MCP
- 복잡한 인증
- WebGL
- game engine
- 전체 category page
- production-grade backend

현재 목표에 직접 기여하지 않는 기술은 추가하지 않는다.

---

# 5. Technical Direction

기본 구조:

Next.js
+ TypeScript
+ Vercel
+ local mock data
+ API route
+ mobile-first UI

초기 backend contract:

`GET /api/demo/home`

예상 response:

```json
{
  "user": {
    "id": "demo-user",
    "name": "Jin",
    "avatarId": "avatar-01"
  },
  "purchases": [
    {
      "id": "product-001",
      "category": "fashion",
      "name": "Example Shirt",
      "price": 39000,
      "imageUrl": "...",
      "roomSlot": "wardrobe-1",
      "state": {
        "wearing": false
      }
    }
  ]
}

category:

fashion | food | living | beauty

Frontend는 가능한 한 이 API contract에 의존한다.

향후 mock backend를 실제 backend로 교체해도
room UI를 크게 다시 만들지 않는 구조를 지향한다.

6. Agent Architecture

Main Agent는 Orchestrator / Tech Lead 역할을 한다.

모든 코드를 혼자 순차적으로 작성하지 않는다.

독립적인 작업은 sub-agent에게 병렬 위임한다.

Agent A — Foundation / Data

담당:

Next.js / TypeScript baseline
project structure
domain types
demo user
mock purchase data
/api/demo/home
Vercel compatibility

ownership 우선 영역:

src/data/**
src/types/**
app/api/**

Room UI나 character interaction을 설계하지 않는다.

Agent B — Room / Commerce UI

담당:

mobile-first room
Fashion / Food / Living / Beauty 공간
API response rendering
roomSlot → visual location mapping
purchased product presentation
loading / error state

ownership 우선 영역:

src/components/room/**
src/components/product/**
room 관련 styles

complex character logic은 만들지 않는다.

Agent C — Interaction

담당:

avatar
movement
object interaction
interaction state

예:

wardrobe
fridge
sofa
vanity
window

ownership 우선 영역:

src/components/avatar/**
src/lib/interaction/**
interaction 관련 styles

backend contract를 변경하지 않는다.

Main Agent — Integration / QA

Main Agent가 책임지는 것:

sub-agent task 분배
dependency 판단
결과 검토
integration
conflict resolution
실제 실행
browser QA
regression fix
Git
Vercel deploy

sub-agent의 "완료했습니다" 보고를 그대로 신뢰하지 않는다.

실제 코드와 실행 결과를 검증한다.

7. Execution Strategy

가능한 작업은 병렬로 진행한다.

권장 흐름:

Foundation
↓
stable contract

이후 병렬:

Data/API
Room/UI
Interaction

각 Agent는 가능한 자신의 ownership 영역만 수정한다.

독립 작업이 끝나면 Main Agent가 통합한다.

통합 이후:

build
→ run
→ browser inspect
→ scenario QA
→ fix
→ rerun
→ deploy

순서로 진행한다.

문서 작성보다 working software를 우선한다.

과도한 planning으로 시간을 쓰지 않는다.

8. QA Loop

모든 핵심 기능은:

implement
→ run
→ inspect
→ fail/pass 판단
→ fix
→ same scenario rerun

을 거친다.

"코드를 작성했다"는 완료 조건이 아니다.

실제로 동작해야 한다.

Critical failure:

build 실패
runtime error
API error
mobile layout major break
구매 데이터가 방에 표시되지 않음
category mapping 오류
핵심 interaction 동작 안 함

Critical failure가 하나라도 있으면 완료로 판단하지 않는다.

9. Progress Reporting

Main Agent는 작업을 오래 진행하되
사용자가 현재 상황을 잃지 않도록 milestone마다 짧게 진행 상황을 알려준다.

보고 시점:

Update 1 — Plan

무엇을 병렬화했고 어떤 Agent가 무엇을 맡았는지.

Update 2 — Foundation

공통 기반과 API contract가 준비되었는지.

Update 3 — Feature Integration

어떤 기능들이 실제로 합쳐졌는지.

Update 4 — QA

무엇을 테스트했고 어떤 문제가 발견·수정되었는지.

Update 5 — Release

Git commit / Vercel URL / 남은 known issue.

진행 보고는 짧게 한다.

예:

Data/API와 Room UI를 병렬 진행 중입니다.
API contract는 확정했고, demo user + 15개 상품 생성 완료.
Room Agent가 현재 roomSlot mapping을 구현 중입니다.

중간 승인을 계속 요청하지 않는다.

제품 방향을 바꿔야 하거나,
인증/권한처럼 사용자 행동이 반드시 필요한 경우에만 질문한다.

10. Git Rules

Remote:

https://github.com/HyoJuJang/makmeaning.git

Main Agent는 시작 시:

current branch 확인
remote 확인
working tree 확인
secret 여부 확인

을 수행한다.

병렬 작업이 실제 파일 충돌을 일으킬 가능성이 있으면
branch 또는 git worktree를 사용한다.

권장 branches:

feat/data-api
feat/room-ui
feat/interactions

Worker Agent는 가능한 commit까지 수행한다.

최종 merge와 release는 Main Agent가 관리한다.

각 milestone에서는 repository를 깨끗한 상태로 유지한다.

11. Decision Rules

무언가 결정해야 하면 다음 순서를 따른다.

docs/ideas/doc03_final_ideation.md
이 문서의 Mission / Success Criteria
가장 빠르게 convincing prototype을 만드는 방법
유지보수 가능한 최소한의 architecture

"더 멋진 기술"보다
"더 빨리 검증 가능한 제품"을 선택한다.

두 방법이 비슷하다면
더 단순한 방법을 선택한다.

12. Scope Discipline

작업 도중 새로운 좋은 아이디어가 떠올라도
현재 vertical slice를 끝내기 전에는 확장하지 않는다.

새 아이디어는 TODO로 기록만 한다.

Current vertical slice:

user
→ purchase data
→ API
→ room
→ purchased products
→ interaction
→ deploy

이 chain을 완성하는 것이 최우선이다.

13. Completion Report

최종 완료 보고는 다음만 포함한다.

Shipped

실제로 만들어진 기능.

Verification

어떤 build / API / browser / mobile / interaction test를 통과했는지.

Git

branch / commit / push 상태.

Deploy

Vercel URL.

Known Issues

현재 알고 있지만 이번 scope에서는 남겨둔 문제.

Next Best Step

다음 한 가지 가장 중요한 작업.

Final Principle

사용자는 Agent를 관리하기 위해 이 프로젝트를 하는 것이 아니다.

Agent가 스스로:

분해하고
→ 병렬화하고
→ 구현하고
→ 실행하고
→ 검증하고
→ 수정하고
→ 통합하고
→ 배포한다.

사용자는 제품의 방향과 품질을 판단한다.

우리의 성공 기준은
"Agent를 많이 사용했다"가 아니라

짧은 시간 안에 더 완성도 높은 작동 제품을 만들었는가

이다.