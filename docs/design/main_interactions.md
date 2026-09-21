# G:Scene Main Screen — 생활 interaction 명세

작성일: 2026-09-21 · Experience 초안 / Main 통합 검토

**상태: 구현 및 1회 build → review → fix → run 완료. 2026-09-21 후속 요청에 따라 상태 모델(§2A)을 먼저 확정한 뒤 구현했다.** 아래 QA 항목은 합격 기준이며 실제 검증 결과는 main_screen_review.md에 별도로 기록한다.

## 1. 목표와 적용 범위

제품 방향은 `docs/ideas/doc03_final_ideation.md`를 따른다. 구매한 물건이 있는 개인 공간에서 캐릭터가 물건을 만지고, 옷을 갈아입고, 앉아 쉬는 경험을 만든다. 새 서비스나 게임 규칙을 기획하지 않는다.

현재 dollhouse 배치, 자유 이동, 충돌, object 접근, 네 캐릭터 외형, 두 착장, 구매 상품 및 category별 행동, Scene entry를 유지한다. 이번 명세는 `main_screen_spec.md`의 **object 도착 직후 modal 개방**만 아래의 공간 동작과 작은 context tray로 대체한다. Scene 선택·캐릭터 선택의 기존 modal은 유지한다.

최신 대상은 Wardrobe / Fridge / Sofa / Vanity / Window / Lamp / Bed 일곱 가지다. Lamp·Bed의 추가 계약은 §12를 따른다. 구현 단위는 문 개폐, 짧은 캐릭터 pose sequence, 착석, 기존 상품 상태 반영이다. 추천 페이지, 구매, backend, NPC, 욕구 수치, 시간 시뮬레이션, 날씨·바람 효과, 게임 엔진은 범위에 포함하지 않는다.

## 2. 현재 구현과 연결되는 공통 계약

### 이동과 접근점

현재 `app/movement.js`의 world 400×600, 발 기준 `position`, 충돌 반경 7, 속도 약 104 논리 px/s를 유지한다. `findPath`는 8px grid BFS와 선분 검증을 통한 경로 단순화이며, 모든 일반 보행은 기존 충돌 검사를 사용한다. 이동 속도를 높이거나 object 사이로 순간이동시키지 않는다.

| Object | 안전한 보행 도착점 | 도착 방향 | 다음 동작 |
| --- | --- | --- | --- |
| Wardrobe | 기존 Fashion (162,164) | left | 손 뻗기 → 문 열기 |
| Fridge | 기존 Food (262,197) | up | 손잡이 잡기 → 문 열기 |
| Sofa | Living 중앙 좌석 도착점 (124,389) | left, 착석 후 right | 좌석으로 체중 이동 → 앉기 |
| Vanity | Beauty 아래쪽 도착점 (340,329) | up | 의자로 체중 이동 → 앉기 |
| Window | (204,130) | up | 손잡이 잡기 → 현재 상태의 반대로 개폐 |
| Lamp | (326,444) | right | 손 뻗기 → 켜기/끄기 |
| Bed | (124,235) | left | 침대 위로 몸 이동 → 눕기 |

Main의 현재 geometry **코드 조회 검사**에서 신규·조정 세 점은 walkable이며 기존 여섯 접근점 모두에서 경로가 존재했다. 이는 화면 검증을 대신하지 않는다. 문 손잡이, 좌석, 캐릭터 팔의 최종 정합은 구현 시 실제 asset에서 확인한다. 좌표를 조정하면 radius를 포함한 도달 가능성을 다시 검사한다. lamp는 손이 스탠드 쪽으로 닿도록 (326,444)로 조정했다. pantry (318,198)는 유지한다. 침대/조명 포함 최종 도달 가능성은 §12와 review를 따른다.

object 본체와 category label은 같은 trigger다. 목적지 2 논리 px 이내에 도착하고 보행이 끝난 뒤에만 물체를 바라보고 동작을 시작한다. 도달하지 못하면 문을 열거나 앉거나 상품 UI를 띄우지 않는다. 빈 바닥 탭·WASD·방향키 이동은 그대로 지원한다.

### 상태와 한 번만 실행되는 동작

구매 상태와 동작 중 상태를 분리한다.

| 구분 | 필요한 값 | 유지 범위 |
| --- | --- | --- |
| 기존 구매·외형 | outfitId, avatarId, foodQuantity, lampOn, featuredBeautyId | 기존 저장/복원 유지 |
| 보행 | position, direction, path, pressed keys | 기존 방식 유지 |
| 현재 object 동작 | objectId, phase, sequenceToken, standingAnchor, renderOffset, pendingIntent | runtime만 유지 |
| 물체 상태 | wardrobeDoor, fridgeDoor, sofaOccupied, vanityOccupied, bedOccupied | runtime; 이탈 시 정리 |
| 창문 | windowStableState = closed/open, 전환 progress | 세션 동안 유지; 새로고침/데모 초기화 시 closed |
| 상품 선택 UI | 선택 상품, tray 펼침 상태, 확정 전 상품 action | runtime; 취소 시 폐기 |

공통 phase는 `approaching → entering → engaged → acting → exiting → idle`로 제한한다. acting은 상품 선택과 창문·조명 재조작의 짧은 동작에 사용한다. 캐릭터는 phase에 맞춰 idle/walk/reach/browse/change-clothes/sit-down/seated-idle/use-cosmetic/stand-up pose를 표시한다. 동시에 두 object 동작을 실행하지 않는다.

새 동작마다 token을 부여한다. 모든 animation 완료·상품 commit·지연 UI 갱신은 현재 token인지 확인한다. 취소한 동작의 callback이 늦게 패널을 열거나 옷을 바꿀 수 없어야 한다. 단일 phase clock 또는 취소 가능한 animation controller를 사용하고, `animationend` 이벤트 하나만 기다려 상태가 멈추게 하지 않는다. reduced-motion에서도 정상 종료되어야 한다.

### 공간 동작과 상품 UI의 관계

일곱 object는 **실제 방 안에서 먼저 동작을 보여주며, blur/backdrop 없는 비모달 context tray**를 사용한다. 기존 상품 목록·이름·수량·행동을 tray 안에서 재사용한다. 동작을 보여주는 복제 캐릭터나 별도의 미리보기 창으로 대체하지 않는다.

- 기본 tray: 하단의 작은 한 줄 상태 + `옷 고르기`/`식품 보기`/`거실 물건 보기`/`화장품 고르기` + 종료 control. 320px에서는 짧은 label과 아이콘 종료 control로 한 줄을 유지하고 접근 가능한 전체 이름을 제공한다. 접힌 높이 최대 72px, 모든 button 최소 44×44px.
- 펼친 tray: 최대 `min(220px, 35svh)`, 상품 목록만 내부 스크롤. 제목/접기/종료는 고정하고 기존 상품 action에 접근 가능해야 한다. 한 번에 한 상품을 온전히 읽을 수 있게 한다.
- `접기`는 상품 목록만 접는다. 문이 열린 상태/착석은 유지한다. `종료`는 해당 object의 exit를 실행한다. Window에는 상품 목록을 만들지 않고 `열기` 또는 `닫기`, `돌아서기`만 제공한다.
- tray는 방을 inert로 만들거나 focus를 가두지 않는다. tray 입력은 바닥 탭으로 전파하지 않는다. 열린 tray 밖의 바닥/다른 가구를 탭하면 아래 cleanup 후 새 동작으로 이어진다.
- 도착 직후, 상품 action으로 tray를 접은 직후에는 **캐릭터와 문/좌석/손 동작 영역이 tray 위에 보이는지** 확인한다. 가려졌을 때만 페이지를 최소한 스크롤한다. world 좌표, 캐릭터 위치, room 크기는 바꾸지 않는다. 동작 영역 확보 후 animation을 시작한다. 320×568에서 확보가 어렵다면 먼저 tray를 접는다. 스크롤은 한 번만 정렬하고 사용자의 스크롤과 계속 경쟁하지 않는다.

lamp 직접 클릭은 접근 후 손 동작과 켜기/끄기를 실행하고 작은 비모달 tray를 표시한다. pantry 직접 클릭은 기존 접근 후 Food modal을 유지한다. 이 경로에서 소파에 강제로 앉히거나 냉장고 문을 원격으로 열지 않는다. category 상품 데이터와 action의 결과는 tray/modal 어느 진입에서나 동일하다.

### 입력 전환과 cleanup

| 상황 | 필수 처리 |
| --- | --- |
| 접근 중 새 유효 목적지 | 이전 path와 예약 동작 취소 → 새 경로. 이전 object의 enter는 실행하지 않음 |
| engaged/acting 중 바닥·다른 object·이동키 | 가장 최근 유효 의도 하나만 보관 → 미확정 action 취소 → 문 닫기/일어서기 등 exit → 안전 anchor에서 새 경로/키 이동 |
| exit 중 새 입력 | exit를 중복 시작하지 않고 마지막 의도만 갱신 |
| 동일 object 연타 | 접근/enter/acting은 중복 생성하지 않음. engaged의 창문·조명은 반대 상태 조작, 나머지는 현재 tray 유지. exit 중에는 최신 intent만 교체 |
| 가구 내부·집 밖 등 유효하지 않은 이동 | 상태 변경 없이 짧은 기존 안내. 좌석이나 문 동작을 불필요하게 종료하지 않음 |
| Escape | modal이면 그 modal 닫기. object/tray이면 pending 폐기 + exit. 자유 보행이면 정지 |
| Scene/캐릭터 선택으로 전환 | 먼저 object exit, keys/path 정리 → 요청한 modal 하나만 열기. 기존 focus trap·inert 유지 |
| lamp/pantry 직접 접근으로 전환 | object exit → 안전 접근점까지 경로 보행 → 도착 판정. lamp는 손 동작 후 조명 토글, pantry는 Food modal |
| blur / document hidden | path·keys·예약 의도·미확정 action·callback 취소. 옷장/냉장고 closed, 착석은 안전 standingAnchor의 idle로 정리. 창은 마지막 확정 open/closed 유지. 복귀 후 자동 이동/동작 재개 없음 |
| 데모 초기화 | 기존 구매 초기화 + 모든 동작/token/tray/offset/occupancy 초기화, 문과 창 closed, 기존 시작 좌표로 복귀 |

화면에 보이는 정상 exit는 기존 object 200–250ms, 침대 get-up 320ms다. 즉시 pose 정리는 blur/hidden/reset에만 사용한다. 앉기 중 취소도 현재 보이는 pose에서 stand로 이어져야 하며 한 프레임에 원점으로 튀지 않는다. queued 키 이동은 exit 후에도 키가 눌려 있을 때만 시작한다. exit 중 keyup이면 취소한다. 기존 일반 보행의 짧은 key pulse 처리는 유지한다.

**구매 상태 commit:** 아래 interaction별 확정 지점에서 한 번만 변경·저장한다. commit 이전에 취소하면 이전 값을 유지하고, 이후 취소하면 반영된 값을 유지한다. 동일 action의 재진입·stale callback은 재저장/재소모하지 않는다. 문 닫기나 일어서기가 구매 상태를 되돌려서는 안 된다. 오류로 animation을 계속할 수 없으면 같은 규칙으로 안전하게 exit한다.

### 앉기와 충돌의 분리

Sofa/Vanity/Bed는 실제 `position`을 가구 내부에 넣지 않는다. 마지막 안전 보행점 `standingAnchor`를 유지한 채 좌석용 pose와 제한된 `renderOffset`으로 좌석에 진입한다. 앉은 동안 일반 보행 적분을 중지하며 무릎·발·그림자가 좌석에 맞게 달라져야 한다. standing sprite를 통째로 아래로 내리는 방식은 합격이 아니다.

일어나기는 그 pose/offset에서 연속적으로 standingAnchor의 선 자세로 돌아온 뒤 보행을 시작한다. 좌석 주변 모든 collision을 해제하거나 소파·화장대를 관통하는 일반 경로를 만들지 않는다. 4개 외형 × 기본 옷 및 2개 구매 상의 모두 동일한 몸체 기준과 착장 상태를 사용한다.

## 2A. Character / Object state model — 구현 선행 계약

이 절은 앞의 runtime 필드를 구체화한다. 제품 행동과 sequence 시간은 기존 다섯 interaction 절을 유지한다. 기존 phase는 진행 위치이고 `character.primary`는 현재 캐릭터의 단 하나의 주상태다. 서로 대체하거나 독립 boolean으로 중복 저장하지 않는다.

### 단일 상태와 owner

`character.primary = idle | walking | interacting | sitting_sofa | sitting_vanity | changing_clothes | rummaging_wardrobe | using_cosmetic | lying_bed`.
추가 상태는 Vanity의 손/제품 동작 `using_cosmetic`과 침대의 안정 자세 `lying_bed`다. sit-down/stand-up/reach는 `interacting`의 pose variant로 표현한다. `pose`는 controller의 phase/step에서 파생하며 별도의 행동 시작 권한이 없다.

| primary | 허용 owner / phase | 동작 |
| --- | --- | --- |
| idle | 없음, 또는 modal owner | 발 위치 고정, offset 0 |
| walking | movement owner / approaching | 기존 충돌과 path/키 이동만 위치 적분 |
| interacting | object owner / entering·engaged·exiting, window의 acting | reach, 방향 정렬, sit-down, stand-up, 안정된 문 앞 대기 |
| rummaging_wardrobe | wardrobe owner / entering, step=browse | 문이 완전히 열린 후 뒤적임 |
| changing_clothes | wardrobe owner / acting | 선택 상의 전환, 중간 commit |
| sitting_sofa | sofa owner / engaged | 좌석 pose 유지, 램프 action 가능 |
| sitting_vanity | vanity owner / engaged | 좌석 pose 유지, 상품 선택 대기 |
| using_cosmetic | vanity owner / acting | 착석을 유지한 손/제품 motion, 중간 commit |
| lying_bed | bed owner / engaged | 안전 발 anchor 고정, bedProgress=1, 침대 위 누운 pose |

`executionOwner = none | movement | object:{id} | modal:{id}`를 하나만 가진다. modal은 Scene/avatar/pantry이며 controller event를 통해 소유권을 넘긴다. object 요청의 접근 중에는 movement가 owner이며 `targetObject`만 예약한다. 도착 검증 후 object owner로 원자적으로 전환한다. 모든 입력은 controller의 `dispatch(event)`로 들어가며 renderer/CSS callback/UI handler는 직접 primary·object stable·상품을 변경하지 않는다. 한 frame clock이 현재 phase/step의 progress를 계산한다.

controller 필드: `epoch`, `phase`, `step`, `phaseRevision`, `elapsed`, `targetObject`, `standingAnchor`, `renderOffset`, `pendingIntent`, `action:{id,productId,committed}|null`. `epoch`는 새로운 행동과 취소 때 증가하고 `phaseRevision`은 같은 phase 내 step 변경에도 증가한다. `step`은 align/open/browse/hold/sit/gesture/close/stand 등 기존 sequence의 구간이며 새로운 기능이 아니다.

### Object의 stable / transition 분리

| Object | stable | transition | 규칙 |
| --- | --- | --- | --- |
| wardrobe / fridge | closed 또는 open | null 또는 `{from,to,progress,epoch}` | stable은 마지막 완료 상태; 중간 문 각도는 transition에만 존재 |
| sofa / vanity / bed | unoccupied 또는 occupied | null 또는 `{from,to,progress,epoch}` | sit 완료에 occupied, stand 완료에 unoccupied. enter/exit 중 그림은 progress로 결정 |
| window | closed 또는 open | null 또는 `{from,to,progress,epoch}` | 완료 때만 stable 변경, 이탈 후 stable 유지 |

`stable=closed`인데 opening transition이 있는 것은 정상이다. `transition=null`이면 렌더는 stable과 일치한다. wardrobe/fridge exit는 현재 보이는 progress에서 closed까지, window 취소는 현재 progress에서 마지막 stable까지 복귀한다. seating exit는 현재 pose에서 standingAnchor로 복귀한다. occupied/unoccupied를 animation 시작 때 미리 바꾸지 않는다. 구매 식품 수량/상의/뷰티/램프는 이 object 상태와 독립된 기존 영속 state다. 외부 표시용 wardrobe 상태 `browsing`은 stable=open이며 primary=rummaging_wardrobe인 경우에만 파생한다. sofa/vanity의 UI 이름 empty는 unoccupied와 같은 뜻이며 별도로 저장하지 않는다.

### Event / guard / transition / effect

아래 모든 transition은 동기적으로 검증·수락 후 시작한다. 유효하지 않은 event는 안정 상태를 바꾸지 않는다.

| Event | Guard | Transition | Effect |
| --- | --- | --- | --- |
| MOVE / REQUEST_OBJECT | owner none 또는 movement; 유효 walkable 목적지 및 경로 | walking / approaching | 새 epoch; 이전 path·예약 교체; 일반 보행 시작 |
| ARRIVED | 현재 epoch·예약 target 일치, path 비어 있음, 거리≤2, position walkable, modal 없음 | movement→object owner, interacting / entering | 키/pulse 비우기, anchor 저장, 방향 정렬; target 가시성 확보 후 enter clock 시작 |
| PATH_FAILED | 현재 movement epoch | idle / owner none | 예약 폐기; 가구 상태/상품 변경 없이 안내 |
| STEP_DONE | epoch+owner+phase+step+phaseRevision 모두 일치, progress≥1 | 해당 정상 sequence의 다음 step | stable 확정이 필요한 step만 확정; wardrobe open 후 browse, seat 완료 후 seated |
| SELECT_OUTFIT | wardrobe engaged+open, 다른 유효 상의, action 없음 | changing_clothes / acting | 고유 actionId 생성, 미확정값 보관, tray 접기; 600ms sequence |
| SELECT_BEAUTY | vanity engaged+occupied, 다른 유효 제품, action 없음 | using_cosmetic / acting | 고유 actionId, 미확정값 보관, tray 접기; 500ms sequence |
| COMMIT_MARK | 현재 epoch+phaseRevision+acting+actionId, !committed, threshold 도달 | primary 유지 | outfit은 600ms의 50%, beauty는 500ms의 60%에 한 번 변경·저장·committed=true |
| USE_FOOD / TOGGLE_LAMP | 해당 tray engaged 또는 해당 기존 modal, 유효 상품, 수량>0(식품) | 기존 primary 유지 | 입력 activation의 고유 actionId로 즉시 한 번 commit; animation callback 재실행 금지 |
| LAMP_TOGGLE | lamp engaged, 다른 action 없음 | interacting / acting | switch 220ms 완료 시 기존 lampOn을 한 번만 변경·저장 |
| WINDOW_TOGGLE | window engaged, transition 없음 | interacting / acting | 반대 stable로 300ms open 또는 250ms close; 완료 guard 통과 시 stable 확정 |
| CANCEL / 새 유효 의도 | object owner; entering/engaged/acting | interacting / exiting | **epoch 증가해 이전 완료/commit 무효화**, 현재 시각 snapshot에서 exit 시작; 최신 유효 intent 한 개 예약 |
| 새 의도 / KEYUP | exiting | exiting 유지 | exit 재시작 금지, 마지막 intent 갱신; 해제된 키 intent 폐기 |
| EXIT_DONE | exit의 epoch+phaseRevision 일치, offset=0, exit 목표 object 상태 충족 | idle / none → 예약 의도 dispatch | tray/임시 action/pose 정리; 새 보행 또는 Scene/avatar modal. lamp는 접근 후 switch, pantry는 접근 후 modal |
| HIDE / BLUR | 모든 runtime | 즉시 안전 idle | 아래 중단 규칙; 자동 재개 없음 |
| RESET | 모든 상태 | 초기 idle / none | 아래 초기화 규칙 |

완료 event는 타이머가 불렀다는 이유로 수락하지 않는다. token 외에 **phase와 step revision**도 확인하여 같은 token의 이전 step event가 다음 step을 건너뛰게 하지 않는다. frame이 commit 지점과 완료 지점을 동시에 넘으면 유효 commit을 먼저 한 번 처리하고 정상 완료를 처리한다.

### 취소·commit·정상 완료의 차이

취소를 `nextStep()`이나 `complete()` 호출로 구현하지 않는다. 취소는 별도의 `beginExit(reason,intent)`로 entering/acting을 **exiting에 직접 연결**한다. 따라서 Wardrobe opening 취소가 browse나 change-clothes를 시작하거나, Vanity gesture 취소가 정상 완료 commit을 발생시키지 않는다.
commit 전 취소는 기존 구매값 유지, commit 후 취소는 새 구매값 유지. immutable 구매값을 취소 snapshot으로 덮어쓰지 않는다. wardrobe 정상 acting 완료만 새 옷 200ms hold→closed exit를 실행한다. vanity 정상 완료는 sitting_vanity/engaged로 돌아간다. 음식과 소파의 램프 상품 action은 입력 수락 시 commit된다. 스탠드 직접 조작은 220ms switch 완료 시 한 번 commit된다. 해당 commit 이후 취소는 되돌리지 않는다. actionId는 한 번의 수락 입력에 하나이며 의도적인 다음 음식 사용은 새 actionId다.

### 불가능한 조합과 invariant

1. primary는 한 값이다. walking+sitting, changing_clothes+rummaging, 두 seat occupied는 불가능하다.
2. walking이면 renderOffset=0, heldProduct=null, object owner 없음. position은 모든 state에서 walkable이며 seated도 standingAnchor를 유지한다.
3. changing_clothes/rummaging이면 wardrobe owner와 stable=open, transition=null. using_cosmetic이면 vanity occupied이며 position은 dock에 고정된다.
4. modal owner와 object owner/tray는 공존하지 않는다. Scene/avatar는 exit 후 열고 pantry modal은 exit→도착 후 연다. lamp는 object owner를 사용한다.
5. opened window는 owner가 없어도 가능하다. 다른 열린 문/occupied seat는 해당 object owner 또는 exit 처리와 연결돼야 한다.
6. exit에는 구매 commit이 없다. renderOffset·heldProduct·임시 선택은 exit 완료 후 남지 않는다. 취소된 epoch의 모든 effect는 no-op이다.
7. inventory/UI는 구매 state를 읽고 animation은 commit을 요청한다. 렌더 횟수, animationend 횟수, React 재실행 여부로 소모/저장을 수행하지 않는다.

### Reduced motion / blur / reset

reduced-motion은 같은 event graph를 통과한다. step duration만 0–80ms로 줄이고 browse 흔들림/bob을 생략한다. commit은 phase의 비율상 marker로 처리한다. duration=0도 enter→유효 commit→완료의 정해진 순서이며 stale guard는 그대로다. 취소를 duration=0 정상 완료로 변환하지 않는다.
blur/hidden은 epoch 증가 후 path/keys/pulse/예약/action을 폐기하고 **emergency cleanup**을 수행한다. wardrobe/fridge closed, seat unoccupied, offset 0, heldProduct null, window는 마지막 stable 유지, position은 안전 anchor, 이미 commit한 구매값 유지. object tray는 닫으며 modal이 이미 열렸다면 modal/focus는 유지하고 이동을 재개하지 않는다. 이것은 정상 완료 event를 합성하지 않는다.
reset은 epoch 증가와 modal/tray 종료 후 기존 구매·외형·Scene 초기화, 모든 문/창 closed, seat unoccupied, offset 0, 시작 발 위치로 복원한다. reload는 구매·외형만 기존 저장 규칙으로 복원하고 runtime은 초기화한다.

구현 시 reducer/controller 검사와 실제 화면 검증 모두에서 위 invariant를 확인한다. 본 모델 작성은 구현 또는 QA 통과를 뜻하지 않는다.


## 3. Wardrobe — 열고, 뒤적이고, 갈아입기

### Trigger

기존 Fashion 옷장 본체/label 탭, Enter 또는 Space. 아직 멀면 접근부터 시작하며, 근처에 있어도 방향 정렬과 문 동작은 수행한다.

### Character state

`walk → idle-left → reach → browse → idle-left → change-clothes → idle-left`.
손을 옷걸이 쪽으로 올리고 짧게 두 번 좌우로 움직이는 browse motion을 사용한다. 갈아입기는 양팔을 가슴 앞으로 모음 → 상체를 살짝 돌림 → 새 상의로 정돈하는 pose이며, 얼굴·헤어·위치는 유지한다. 캐릭터 전체가 사라지는 연출은 사용하지 않는다.

### Object state

`closed → opening → open → closing → closed`. 옷걸이의 기존 구매 니트/셔츠는 열린 상태에서 보이고 browse 중 2–3 논리 px 이내로 짧게 움직인다. 닫힌 문은 내부 옷을 실제 가린다.

### Animation sequence

1. 도착·left 정렬 100ms → 손 뻗기와 문 열기 280ms.
2. 열린 옷장을 뒤적이는 motion 450ms(좌우 2회) → 손을 내려 engaged. `옷 고르기` tray를 제공한다. 여기까지 구매 상태 변경 없음.
3. 기존 니트/셔츠 목록에서 `입어보기`를 누른다. 현재 착장은 `입고 있어요`와 disabled를 유지한다.
4. 유효한 선택을 임시 보관하고 목록을 접는다. 새 action 중복 입력은 막되 이동/종료는 취소로 처리한다. 공간이 보이면 change-clothes 600ms 실행.
5. **300ms 지점에 outfitId를 정확히 한 번 commit**하고 실제 캐릭터의 상의를 교체한다. 이때 모든 방향/외형 렌더러에도 동일 값이 적용된다. 마지막 300ms는 새 옷 정돈 pose.
6. 새 착장을 200ms 보여준 뒤 문 닫기 200ms, idle. tray를 제거하고 공간으로 focus를 돌린다.

### 종료 조건

착장 반영 → 닫힘까지 끝나면 정상 완료. 선택하지 않고 `옷장 닫기`/Escape/새 이동을 요청하면 문만 닫고 종료한다. 이미 입은 옷은 재실행하지 않으며 다른 옷을 고르거나 닫을 수 있다.

### 다른 interaction으로 넘어갈 때 cleanup

browse/enter callback과 임시 선택을 취소한다. change-clothes 300ms 이전 취소는 옷 유지, 이후는 새 옷 유지. 손과 상체 pose를 되돌리고 문을 닫은 다음 새 목적지로 걷는다. 옷걸이 흔들림과 선택 강조가 남지 않아야 한다.

### QA acceptance criteria

- W1. 멀리서 클릭하면 걷기 → 도착 → 문 개방 → 뒤적임 순서가 실제 방에서 보인다. 구매 UI만 뜨면 실패다.
- W2. 니트→셔츠 선택 시 실제 캐릭터의 change-clothes motion과 상의 변경을 보고, 끝에 옷장이 닫힌다.
- W3. 300ms 전/후 취소를 각각 재현해 이전 착장/새 착장이 명세대로 유지되고 저장과 화면이 일치한다.
- W4. 같은 object/action 연타로 motion이나 commit이 중복되지 않고, 종료 후 1초 이상 지나도 늦은 변경이 없다.
- W5. 네 캐릭터 모두 동작과 새 착장이 정상이며 재접속 시 기존 저장 규칙대로 착장이 복원된다.

## 4. Fridge — 열고, 살펴보고, 닫기

### Trigger

기존 Food 냉장고 본체/label 탭, Enter 또는 Space. pantry 직접 진입은 기존 별도 동작을 유지한다.

### Character state

`walk → idle-up → reach → idle-up → reach → idle-up`. 문을 여닫을 때 손잡이에 손을 뻗고, 상품 확인 중에는 열린 내부를 향한 자세로 머문다. 새 먹기·마시기 동작은 추가하지 않는다.

### Object state

`closed → opening → open → closing → closed`. 내부 상품 overlay는 foodQuantity와 연결한다. 선택 상품만 얇게 강조하며 닫힌 상태에서는 내부와 선택 강조가 가려진다. 실제 pantry 위치의 상품은 pantry 위치를 유지하고, Food 목록에서 선택하면 그 상품의 기존 보관 위치를 강조한다.

### Animation sequence

1. 도착·up 정렬 100ms → 손잡이 reach와 문 열기 300ms.
2. 내부가 완전히 드러난 상태를 250ms 보여준 뒤 engaged. `식품 보기`로 기존 구매 목록을 펼친다.
3. 상품 확인/선택은 이름·잔량과 공간의 해당 상품 강조를 갱신한다. **확인만으로 수량을 줄이지 않는다.**
4. 기존 `하나 사용하기`를 명시적으로 누를 때만 한 번 차감·저장한다. 한 action 처리 중 재입력을 막고 목록/방의 수량을 함께 갱신한다. 0은 disabled이며 음수가 될 수 없다.
5. `냉장고 닫기`/종료 시 손 뻗기와 닫기 250ms → idle. 상품 확인을 마친 뒤 사용하지 않고 닫아도 된다.

### 종료 조건

사용자가 닫거나 떠날 때 문이 closed이고 임시 선택 강조가 없으면 완료. 상품 선택이나 사용 한 번만으로 냉장고를 자동 닫지 않는다.

### 다른 interaction으로 넘어갈 때 cleanup

문 닫기, 손 pose와 선택 강조 정리 후 이동한다. 이미 사용한 식품 수량은 되돌리지 않는다. 아직 수락되지 않은 action은 취소한다. 문 개폐 collider는 기존 최대 열린 footprint를 계속 사용하여 정적 경로망과 불일치하지 않게 한다.

### QA acceptance criteria

- F1. 도착 이후 실제 문이 열리고 내부가 보인다. 기존 PNG의 열린 문과 새 문이 겹치지 않는다.
- F2. 상품 확인/선택만 한 뒤 닫으면 수량이 그대로다. `하나 사용하기` 1회는 정확히 1개만 감소한다.
- F3. 3→0 소모 시 구매 목록·공간 잔량이 일치하며 0 상품의 구매 overlay는 사라진다. 배경에 같은 구매 식품이 계속 남으면 실패다.
- F4. 닫고 다시 접근하면 문 개방 sequence 후 변경된 수량이 보인다. 사용 후 즉시 떠나도 차감은 유지된다.
- F5. 열기 중 취소, 연속 닫기, pantry 진입을 해도 문 잔상·가구 통과·늦은 Food UI가 발생하지 않는다.

## 5. Sofa — 앉아서 머무르기

### Trigger

기존 Living 소파 본체/label 탭, Enter 또는 Space. 우하단 lamp 직접 클릭과 구분한다.

### Character state

`walk → idle-left → sit-down → seated-idle-right → stand-up → idle/walk`.
좌석 진입에서는 왼쪽 소파로 체중을 옮기고 앉은 뒤 방 안쪽(right)을 본다. 무릎이 굽고 발이 좌석 앞에 놓이며, idle은 작고 느린 호흡만 사용한다.

### Object state

`unoccupied → entering → occupied → leaving → unoccupied`. 기존 쿠션과 조명 상태는 유지한다. 좌석 눌림은 필수 아님. 소파 앞부분 mask와 좌석용 그림자로 캐릭터가 위에 붙어 있는 관계를 표현한다.

### Animation sequence

1. 안전 dock (124,389) 도착 → 방향 정렬 100ms.
2. 좌석 쪽 연속 offset 이동과 무릎 굽힘 220ms → seated-idle. 좌석 pose anchor는 약 (90,397)을 시각 조정 시작값으로 삼는다. 정확한 발/엉덩이 기준은 pose asset에 맞춘다.
3. `앉아 쉬는 중` 상태와 `거실 물건 보기`/`일어나기` tray. 시간 제한 없이 착석 유지.
4. 기존 Living 구매 목록과 램프 on/off는 tray에서 사용할 수 있다. 램프 action은 기존과 같이 즉시 한 번 commit하며 소파 캐릭터는 계속 앉아 있다.
5. 바닥/다른 object 탭 또는 이동키 입력 → stand-up 220ms → offset 0과 안전 dock 복귀 → 요청한 방향/목적지로 기존 보행.

### 종료 조건

`일어나기`, 새 이동, 다른 interaction 진입으로만 착석을 끝낸다. tray를 접는 것은 종료가 아니다. 단순 일어나기는 안전 dock에서 idle로 끝난다.

### 다른 interaction으로 넘어갈 때 cleanup

seated idle, occupancy, 좌석 그림자·앞면 mask의 임시 처리와 tray를 해제한다. offset이 0으로 돌아오기 전 일반 이동을 시작하지 않는다. 이동키가 이미 떼어진 경우 일어서기만 완료한다. 조명/구매 상태는 유지한다.

### QA acceptance criteria

- S1. 실제 소파에 앉는 과정과 굽힌 다리가 보이고, 5초 이상 입력 없이 seated-idle을 유지한다.
- S2. 바닥 탭과 방향키 각각 일어서기 → 연속 이동 순서로 동작한다. 소파 내부에서 일반 보행을 시작하지 않는다.
- S3. 착석 중 램프를 토글해도 착석이 유지되고 실제 램프 상태가 바뀐다.
- S4. 빠른 소파 재클릭/다른 가구 연타 시 occupancy가 중복되거나 offset이 누적되지 않는다. Scene/캐릭터 선택 전에는 안전하게 선다.

## 6. Vanity — 앉아서 화장품 꺼내두기

### Trigger

기존 Beauty 화장대 본체/label 또는 동일 영역의 의자 탭, Enter/Space. 의자와 화장대는 하나의 target으로 취급한다.

### Character state

`walk → idle-up → sit-down → seated-idle-up → use-cosmetic → seated-idle-up → stand-up`.
화장대 거울을 향해 앉고, 선택한 병/크림을 손으로 가까이 가져왔다가 상판 앞쪽에 놓는다. 기존 `꺼내두기` 의미를 유지하며 얼굴에 바르기나 수량 소모를 새로 만들지 않는다.

### Object state

의자 `unoccupied/entering/occupied/leaving`. 화장품 `기존 선택 표시 → 임시 손/상품 이동 → 새 상품 전면 표시`. featuredBeautyId는 serum/cream 중 하나이며 상품 복제본이 손과 상판에 동시에 남지 않게 한다. 거울 반사 애니메이션은 이번 필수 범위에서 제외한다.

### Animation sequence

1. 안전 dock (340,329) 도착 → 방향 정렬 100ms → 의자 착석 220ms.
2. 거울을 향한 seated-idle. 좌석 pose anchor는 stool 중심 약 (340,293)을 시각 조정 시작값으로 사용한다. 이동 offset이 상판을 관통하지 않고 의자의 바로 아래에서 위로 들어가도록 맞춘다.
3. `화장품 고르기`로 기존 세럼/크림 목록을 펼친다. 현재 제품은 `꺼내두었어요`와 disabled를 유지한다.
4. 다른 제품의 `꺼내두기`를 누르면 임시 선택을 보관하고 목록을 접는다. use-cosmetic 500ms: 손 뻗기 150ms → 상품을 가까이 가져오기 150ms → 상판 앞에 놓고 손 복귀 200ms.
5. **300ms 지점에 featuredBeautyId를 한 번 commit**한다. 공간의 전면 상품/표시와 구매 목록이 일치하며 seated-idle로 돌아온다.
6. 이동 요청 시 stand-up 220ms → offset 0 → 기존 경로 보행.

### 종료 조건

화장품 action이 끝나도 계속 앉아 있다. `일어나기`, 새 이동 또는 다른 interaction 진입으로 종료한다. tray 접기는 착석을 유지한다.

### 다른 interaction으로 넘어갈 때 cleanup

300ms 전 취소는 기존 화장품 선택 유지, 이후 취소는 새 선택 유지. 임시 손-held 상품, 손 pose, 의자 occupancy, renderOffset과 tray를 정리한다. 상품을 손에 든 채 다른 곳으로 걷지 않는다. 다른 modal을 열 때도 먼저 일어난다.

### QA acceptance criteria

- V1. 캐릭터가 의자에 실제 앉고 거울을 향한다. 의자/상판을 뚫거나 공중에 떠 보이지 않는다.
- V2. 세럼→크림 action에서 손과 상품 이동이 실제 방에 보이고, 전면 상품과 `꺼내두었어요`가 정확히 한 번 바뀐다.
- V3. 300ms 전/후 취소가 명세대로 동작하며 상품 수량이나 옷·외형은 바뀌지 않는다.
- V4. 화장품 선택 뒤 5초 이상 seated-idle 유지, 새 바닥 탭 시 일어서기→이동. 4개 외형 × 기본 옷 및 2개 구매 상의에서 의자 pose가 어긋나지 않는다.

## 7. Window — 열어둔 상태가 남는 창

### Trigger

기존 상단 창의 본체/손잡이에 접근 가능한 새 object button. 닫힌 상태 이름은 `창문 열기`, 열린 상태는 `창문 닫기`. category나 상품 panel을 추가하지 않는다.

### Character state

`walk → idle-up → reach → idle-up`. 손잡이를 잡고 창짝을 밀거나 당기는 짧은 동작만 사용한다. 벽 위로 올라가거나 창밖으로 이동하지 않는다.

### Object state

`closed → opening → open → closing → closed`. closed/open은 마지막 확정 상태로 따로 보관한다. 창짝을 위아래로 미는 구조로 유리 겹침·손잡이 위치·열린 틈이 달라져야 한다. glow나 색만 바뀌는 표현은 열림으로 인정하지 않는다.

### Animation sequence

1. (204,130) 도착 → up 정렬 100ms.
2. 닫힌 창을 누르면 reach와 창짝 이동 300ms → 완료 지점에 open commit. 열린 창을 누르면 접근 후 reach와 창짝 복귀 250ms → closed commit. 이미 창 앞에서 engaged인 경우에도 본체를 다시 누르면 같은 개폐를 실행한다.
3. `창문을 열었어요`/`창문이 닫혀 있어요` 상태와 현재 반대 action(`창문 닫기` 또는 `창문 열기`), `돌아서기` tray를 제공한다.
4. 명시적 닫기 시 reach와 창짝 복귀 250ms → 완료 지점에 closed commit. 동작 중 동일 control 연타는 무시한다.

### 종료 조건

열기/닫기가 끝나면 그 상태로 창 앞에 서 있다. `돌아서기`, 이동, 다른 object, Escape는 캐릭터 동작만 종료한다. **창문은 떠났다는 이유로 닫히지 않는다.** 새로고침/데모 초기화만 closed로 복원한다.

### 다른 interaction으로 넘어갈 때 cleanup

손 pose와 tray를 정리하고 마지막 확정 open/closed를 유지한다. opening/closing 도중 취소하면 마지막 확정 상태로 200ms 이내 되돌린다(blur/hidden은 즉시 정리). 열린 상태에서 Scene/캐릭터 선택 또는 다른 가구로 이동해도 open이 유지된다.

### QA acceptance criteria

- N1. 실제 창짝/손잡이/열린 틈이 변해 closed와 open을 작은 모바일 화면에서도 구별할 수 있다.
- N2. 이동 후에도 열린 창이 남고, 창문 본체를 다시 누르면 걸어가서 닫는다. 창 앞에서 본체 재탭 또는 tray의 `창문 닫기`로도 닫을 수 있다.
- N3. 열기/닫기 중 취소와 hidden 복귀 후에는 마지막 확정 상태이며 중간 각도나 늦은 토글이 없다.
- N4. 창 trigger가 다른 category를 열지 않고, 캐릭터는 walkable 바닥 안에 계속 머문다.

## 8. 필요한 asset과 구현 단위

현재 `gather-room.png`에는 문 없는 옷걸이와 열린 냉장고가 이미 그려져 있다. 닫힌 문 이미지를 덧씌우기만 하면 원래 열린 문/음식이 남는다. **해당 부분만 clean-base로 정리하고 움직일 부분을 독립 overlay로 분리하는 작업이 선행 조건**이다. 방 전체를 다시 디자인하지 않는다. 아래 asset과 controller는 상태 모델을 먼저 문서화한 뒤 구현한다.

| 단위 | 필요한 결과 | 범위 경계 |
| --- | --- | --- |
| A. object 레이어 | 기존 옷장 위치의 문 프레임·문 2짝·구매 의류, 냉장고 body·interior·door·구매 식품, 창 sash·손잡이 | 기존 방 배치/재질/식물과 정합. 닫힌 상태의 잔상 제거 |
| B. 캐릭터 pose | 손 뻗기, 뒤적임, 옷 갈아입기, 앉기/앉은 idle/일어서기, 화장품 꺼내기 | 승인 PNG의 투명 sprite를 공용 SVG renderer에 연결. 4외형/기본 옷 및 2개 구매 상의 공유, 별도 캐릭터 시스템 금지 |
| C. interaction controller | 접근 완료 연결, phase/token, 취소, commit, exit, intent 교체 | 기존 경로/충돌 재사용. animation과 구매 상태 갱신 중복 금지 |
| D. context tray | compact 비모달 목록과 기존 action 재사용, 접기/종료 구별 | `active`는 Scene/캐릭터/pantry modal 소유권에 사용. tray category는 별도 명시하여 기존 product renderer/handler의 active 의존을 분리 |
| E. 다섯 sequence | 위 W/F/S/V/N의 순서·좌표·기간·종료 연결 | 시간 값은 초기 목표이며 약 ±20% 시각 조정 가능. 순서·commit 전후 규칙은 유지 |
| F. 향후 실행 QA | 실제 mobile interaction, 취소/전환, 회귀, 주요 문제 최대 3개 review→fix | 구현 후 실행하고 관찰 결과를 별도 기록 |

기본 layer 순서는 배경 clean-base → object 내부/상품 → 캐릭터 → 필요한 문/팔걸이/의자 앞쪽 mask → label이다. 모든 앞면 mask를 무조건 캐릭터 위에 놓지 말고 해당 좌석/object와 겹치는 부분만 가린다. 손과 문 손잡이 접촉이 보여야 한다. 장식 overlay는 pointer-events:none, 실제 DOM button만 입력을 받는다. 문은 가장 열린 footprint를 충돌 영역으로 유지하고 창짝은 실내 통로로 돌출하지 않는다.

## 9. 접근성과 향후 통합 QA

- Object button과 tray는 Tab/Enter/Space로 사용할 수 있고 이름에 행동/상태를 포함한다. 도착 후 tray의 상태 제목으로 `focus({preventScroll:true})`, 종료는 원래 object로 복귀하되 이동 요청 종료면 공간에 focus한다. 새 modal 요청이면 modal의 focus 규칙을 따른다.
- 공간, tray의 상태 제목 또는 일반 button에 focus가 있으면 WASD/방향키를 새 이동 의도로 수락한다. 앉아 있을 때에는 일어서기 후 이동하며, button의 Enter/Space 활성화는 그대로 유지한다. input/textarea/select, 편집 영역, 방향키 탐색을 사용하는 목록 control에 focus가 있으면 이동을 차단하고 해당 control의 입력을 우선한다. 현재 상품 목록을 단순 button 목록으로 유지하면 별도의 방향키 탐색을 만들 필요는 없다. Escape로 exit한 경우 공간에 focus한다. Scene/캐릭터/기존 modal에서는 계속 focus trap과 모든 보행 차단을 유지한다.
- aria-live polite는 도착·열림·착장 완료·착석·꺼내둠·닫힘의 안정된 결과만 알린다. 프레임별 좌표나 progress는 읽지 않는다.
- reduced-motion에서도 접근은 기존 연속 이동/충돌을 유지한다. browse 흔들림·body bob·회전 보간은 생략한다. reach/앉음/열림/닫힘/변경 전후 pose를 명확히 표시하고 transition은 0–80ms로 줄인다. 상품 action의 commit은 해당 축약 sequence의 정해진 중간 단계에서 한 번만 처리하며, 취소 전/후 규칙은 동일하다. 일반 시간 300ms를 기다리는 고정 callback을 남기지 않는다.

향후 구현 완료 판정은 **390×844와 320×568 실제 모바일 화면**, 데스크톱 WASD/방향키에서 수행한다.

| 검증 묶음 | 합격 조건 |
| --- | --- |
| 정상 5개 흐름 | 각 W/F/S/V/N 기준을 직접 조작하며 공간 위 motion과 상태 변화를 확인. 패널 변화만으로 합격 처리하지 않음 |
| 작은 화면 | motion 대상과 캐릭터가 tray 위에 같이 보임. 가로 overflow 없음. 44px 입력, 닫기/접기/상품 action 접근 가능 |
| 전환 | 옷장 뒤적임→냉장고, 착장 전/후 취소, 냉장고→소파, 소파→화장대, 화장품 전/후 취소→창문, 창문→Scene/캐릭터 선택을 검증 |
| 반복/중단 | 빠른 연타·이동 중 목적지 변경·exit 중 keyup·Escape·blur/hidden·초기화에서 늦은 action, 중복 commit, stuck pose 없음 |
| 이동/충돌 | 각 object 접근점에서 다른 접근점으로 경로 가능. 앉았다 일어난 뒤 벽/침대/테이블 충돌 유지. position은 항상 walkable |
| 기존 기능 | 캐릭터 선택 적용/취소, 니트/셔츠 저장, 식품 0 하한, 램프 토글, 뷰티 선택, pantry/lamp 직접 접근, Scene 상황/예산 완료 유지 |
| 복원 | 재접속 시 구매·외형 저장 복원, 임시 자세/문/tray는 초기 상태. 취소 전에 commit한 값만 남음 |

QA는 실제 관찰과 코드 검사를 분리해 기록한다. 구현 후 `docs/design/main_screen_review.md`에 영향도가 가장 큰 문제 최대 3개를 남기고 Builder 수정 및 같은 화면 재검증으로 마무리한다. **후속 구현은 위 상태 모델과 합격 기준을 따른다.**

## 10. 구현 및 검증 기록 (2026-09-21)

상태 모델을 먼저 문서화한 뒤 아래 단위로 구현했다. 별도 state machine library는 추가하지 않았다.

| 파일 | 구현 책임 |
| --- | --- |
| `app/interactions.js` | 단일 primary action, object의 확정 상태와 전환 진행률, 도착 guard, animation 단계, commit, 취소/exit, 이전 완료 이벤트 무효화 |
| `app/app.js` | 기존 이동/입력과 controller 연결, 상품 상태 반영, context tray, modal 소유권 및 focus |
| `app/avatar.js` | 세 외형의 reach/browse/change-clothes/착석/화장품/일어서기 pose |
| `app/object-art.js` | 원본 방 PNG 위 독립 SVG 레이어로 옷장·냉장고 문, 내부 상품, 창짝 표시. 기존 냉장고 열린 문 잔상은 부분 mask로 정리 |
| `app/movement.js` | 기존 walkable/collision 유지, 소파·화장대·창문의 안전한 접근점 |
| `app/tests/interactions.test.mjs` | 정상 전이, 중복/오래된 이벤트, commit 전후 취소, 좌석 정리, 창문 유지, reduced-motion 검증 |

실제 390×844와 320×568 화면에서 다섯 object의 motion과 상태 변화를 확인했다. Scene 선택 완료, 외형 선택 취소, pantry/lamp 접근과 기존 상품 action도 회귀 확인했다. QA sub-agent는 Main이 직접 조작한 화면·DOM 증거를 검토해 문제 2개를 선정했고, Builder 수정 후 같은 모바일 조건에서 해결을 확인했다. 상세 관찰, 검증 범위 및 자동 검사 결과는 [main_screen_review.md](main_screen_review.md)의 생활 interaction 절에 기록했다.

위 acceptance criteria는 구현 계약으로 유지한다. 실제 수행한 UI 검사와 자동 검사 범위는 review 기록을 기준으로 구분한다.

## 11. API 통합 회귀 — 2026-09-21

Next.js `/api/demo/home` 통합에서는 기존 보행·pose·controller를 유지했다. 옷장과 냉장고/팬트리의 구매 overlay는 API `purchases`의 category와 `roomSlot`으로 존재 여부와 위치를 결정한다. 구매가 없거나 식품 수량이 0이면 해당 구매 overlay를 만들지 않는다. 각 overlay의 `data-product` / `data-room-slot`으로 데이터와 공간의 연결을 검사할 수 있다.

종료 중 최신 목적지가 현재 떠나는 object와 같을 때 입력을 무시하던 문제를 수정했다. 예를 들어 소파→냉장고 요청 뒤 일어서기가 끝나기 전에 소파를 다시 누르면, 일어서기를 중복 시작하지 않고 마지막 소파 요청을 실행한다. engaged/acting 중 동일 object 연타를 무시하는 규칙은 유지한다.

자동 회귀는 실제 app.js를 비동기 bootstrap으로 실행한다. API 로딩/사용자 이름 반영, 실패 응답 후 명시적 재시도, 실제 키 입력과 modal 상품 action, controller의 commit/취소/reduced-motion, API 상품 overlay와 식품 0개 표시를 검사한다. 이 코드는 실제 모바일 화면 QA를 대체하지 않으며 최종 시각 검증은 `main_screen_review.md`에 별도로 기록한다.

## 11. 승인 캐릭터 및 공간 디테일 반영 (2026-09-21)

- 외형은 사용자 승인 `avatar-options/`의 M01 Navy / M02 Sage / F01 Oat / F02 Slate 네 종류다. F02는 어깨 아래로 풀어내린 긴머리를 유지한다. 원본 시트는 보존하고 투명 runtime atlas를 `app/assets/avatars/`에 따로 둔다.
- `app/avatar-frames.js`는 pose별 crop·발 anchor·상의 영역, `app/avatar.js`는 방향별 sprite·보행·생활 pose·기존 구매 상의 색을 렌더링한다. state controller의 전이·commit 규칙은 유지한다.
- 신규 기본 착장은 캐릭터별 원본 `base`다. legacy 외형 short/wave/bob은 m01/m02/f01으로 연결하며 저장된 knit/shirt와 구매 상태는 보존한다. 2×2 선택 프리뷰는 원본 기본 옷을 보여준다.
- 소파는 안전 anchor (124,389), offset (-34,+8), 최종 발 (90,397)로 중앙 쿠션에 무릎을 굽혀 편하게 앉는다. 화장대는 안전 anchor (340,329), offset (0,-6), render anchor (340,323)로 의자 바로 아래에서 진입하고 거울을 바라본다. 일어서기 후 동일 안전 anchor에서 일반 이동을 재개한다.
- 창문은 중앙 실제 유리 x181–231/y19–66 내부에서 하부 창짝이 위로 22px 이동한다. 왼쪽 아래 식물 영역을 clip에서 제외한다. 닫을 때 아래로 복귀하며 가로 돌출이 없다.
- 방 위의 상시 라벨은 Fashion / Food / Living / Beauty만 유지한다. 창문과 가구 보조 이름·화살표 배지는 제거한다. 창문 자체의 투명 클릭 영역과 접근성 이름, 기존 walk-to-object는 유지한다.
- 390×844·320×568 실제 화면과 기존 전체 자동 검증을 통과했다. 최초 atlas 중복 표시 문제 1건은 직접 자식 SVG sizing으로 수정해 다시 확인했다. 최신 QA는 main_screen_review.md의 4종 아바타 교체 절을 따른다.


## 12. 물리 점검 · 조명 · 창문 · 침대 — 2026-09-21

사용자 후속 요청에 따라 같은 공간 안의 생활 동작을 보완했다. 구현 전 `work/physics-slice-spec.md`로 계약을 확정했고 Builder 구현 → 실제 모바일 QA → 이불 영역 수정 → 재실행을 마쳤다. 이 절과 갱신된 §2/§2A/§7이 과거 lamp modal·열린 창문 살펴보기 규칙보다 우선한다.

### Lamp

- **Trigger:** 스탠드 본체를 탭하거나 키보드로 활성화. 이미 조명 앞에 있다면 본체 재탭/현재 tray의 켜기·끄기.
- **Character state:** walking → interacting(align/reach) → interacting(engaged). lamp는 object owner이며 modal을 띄우지 않는다.
- **Object state:** 기존 영속 구매 state의 `lampOn` 하나만 원본으로 사용한다. controller에 별도 on/off 사본을 두지 않는다.
- **Animation:** 안전 접근점 (326,444), right 정렬 100ms → switch/reach 220ms → 완료 때 한 번 toggle. 빛 번짐, 구매 램프 밝기와 갓 색이 함께 바뀐다. 재탭도 같은 220ms 동작이다.
- **종료:** 변경 후 작은 비모달 상태 tray에서 대기. 돌아서기/이동/다른 물체/Escape는 exit 후 넘긴다.
- **Cleanup:** commit 전 취소는 기존 lampOn 유지, 완료 후 취소는 새 값 유지. busy 연타·stale 완료는 중복 toggle을 만들지 않는다. 소파에서의 기존 램프 상품 action과 저장은 그대로 유지한다.
- **QA:** 도착 전 빛 변화 없음; 직접 탭/재탭/상태 버튼으로 양방향 작동; 빠른 두 번 탭은 하나의 switch; 이동 전 exit; viewport 320에서도 조명과 캐릭터, control이 보임.

### Bed

- **Trigger:** 원래 침대 영역의 투명 button `침대에 눕기`. 별도 상시 글자나 category를 추가하지 않는다.
- **Character state:** walking → interacting(lie-down) → lying_bed → interacting(get-up) → idle/walking. primary는 언제나 하나다.
- **Object state:** bed의 stable은 unoccupied/occupied, transition은 기존 seat와 같은 `{from,to,progress,epoch}`. lie 완료에 occupied, get-up 완료에 unoccupied.
- **Animation:** 안전 dock (124,235) → 정렬 100ms → lie-down 320ms. 논리 발 위치는 dock에 고정하고 `bedProgress` 0→1과 renderOffset (0,0)→(-52,+3)으로 침대 위로 몸을 옮긴다. 앞을 보는 얼굴은 베개 위, 몸은 침대 상단 이불 아래에 놓인다. 이불은 상단만 그리며 하단은 원본 이불에 자연스럽게 연결해 앞쪽 협탁과 스탠드를 가리지 않는다.
- **종료:** 누운 자세에서 대기. 일어나기/바닥 탭/방향키/다른 물체 요청은 현재 progress에서 get-up 320ms → offset=0 → 마지막 유효 의도 실행. 침대 collider를 해제하지 않는다.
- **Cleanup:** 눕는 도중 취소해도 현재 pose에서 연속적으로 일어난다. exit 중 목적지 교체는 마지막 하나만 유지한다. exit 중 keyup이면 일어난 뒤 정지한다. blur/hidden/reset은 안전 dock의 idle, offset=0, unoccupied로 정리하며 자동 재개하지 않는다.
- **QA:** 도착 전 누움 없음; 베개·상체·이불 위치 정합; 침대 안에서 일반 걷기 없음; 완전히 일어난 뒤만 이동; 무효 벽/가구 탭은 휴식 상태 유지; 최신 목적지·짧은 키·held key·중간 취소·hidden에서 stuck pose 없음; 390/320에서 협탁과 스탠드가 가려지지 않음.

### 최종 물리 검증 기준

발 collider 반경 7, 일반 보행 속도와 furniture footprint를 유지한다. bed/sofa/vanity는 실제 발 위치와 생활 pose offset을 분리한다. 일반 walking은 offset=0이고 발 위치는 항상 walkable이어야 한다. 조명 접근점은 TV장과 현관 수납을 침범하지 않는 바닥에 둔다. 모든 접근점 경로, 사선 이동, 취소/keyup/blur, 창문 재접근 닫기와 조명 단일 commit을 자동 검증하고 실제 mobile에서 공간과 pose를 확인한다. 실제 수행한 범위와 발견한 문제 1개의 해결 결과는 `main_screen_review.md` 최신 절에 기록한다.


## 13. Visual Polish Round 1 — 2026-09-21

상태 모델과 안전 anchor를 유지한 렌더링 보완이다. Vanity의 뒤쪽 착석 pose는 두 무릎/발을 몸통 아래 가까운 간격으로 모으고 골반의 좌판 접촉을 명확히 한다. 구매 쿠션은 소파 좌석에 맞게 크기를 줄이고 약한 기울기/접촉 그림자로 지지 관계를 보여준다. Lamp는 원본 방의 고정 실루엣을 유지하며 중복 generic 아이콘을 제거하고 갓 중심의 작은 빛만 토글한다. Lamp reach는 오른쪽 아래 스위치 높이로 팔을 뻗는 전용 pose다.

controller commit/exit/epoch, 일반 이동 및 collision, 객체 접근점, 기본 animation duration은 변경하지 않았다. localhost visual-qa=1 진단 URL만 controller clock을 0.15배로 진행해 중간 프레임을 캡처한다. 일반 URL과 공개 host에서는 원속도다. 최종 기능/화면 검증은 visual_polish_review.md를 따른다.


## 14. 사용자 피드백 — 착석·팔·의자 접근 보정 (2026-09-21)

이 절은 §11·§13의 화장대 pose 설명을 보완한다. 화장대의 논리적 안전 dock (340,329)은 유지하고 render offset을 (0,-6)으로 맞춘다. 머리/몸통은 서 있을 때보다 낮아지고, 골반이 흰 스툴의 앞쪽 좌판에 닿으며 허벅지→무릎→종아리가 꺾여야 한다. 단순히 다리 간격만 좁힌 standing 실루엣은 불합격이다.

의자 아래쪽도 Beauty 투명 클릭 영역에 포함한다(방 좌표 x312–368, y192–324). TV와 의자 사이 바닥 y329는 계속 일반 이동 영역이다. 그 통로에서 의자 아래쪽을 탭하면 안전 dock으로 접근한 뒤 앉는다. 의자 본체와 TV collider를 열어 통과시키지 않는다. 이동 테스트는 통로 x310/320/350/357의 접근 경로와 의자(340,310)/TV(340,345)의 충돌을 검증한다.

조명은 원본 side sprite의 움직일 팔을 몸통에서 먼저 제거한 뒤 그 동일한 팔을 어깨 pivot으로 회전한다. 팔을 중복해서 그리거나 길게 늘리지 않는다. 상체를 조금 숙이고 발은 안전 dock에 유지한다. 화장품 사용도 같은 원칙으로 원본 오른팔을 분리하며, 어깨 연결과 손/상품의 같은 좌표계를 유지한다.

상태 전이·commit·취소·이동 대기 규칙과 모든 일반 collider는 유지한다. QA는 실제 화면에서 서기/앉기, 화장품 중간/종료, 조명 시작/정점/종료를 비교하며, DOM의 sitting 또는 reach 값만으로 시각적 합격을 선언하지 않는다.


## 15. 제공된 vanity-seated-back 적용 (2026-09-21)

사용자가 제공한 `docs/design/avatar-options/vanity-seated-back/` 네 PNG와 README가 화장대 착석의 최종 시각 기준이다. 이 절은 §13·§14의 임시 하체/상체 합성 방식을 대체한다. 정후면 raster 자체를 `app/assets/avatars/*-vanity-seated-back.png`로 원본 그대로 복사하고 `app/vanity-frames.js`의 clip metadata로 ivory 배경과 참고용 스툴을 제외한다. 방의 기존 의자는 하나만 유지한다.

제공 이미지의 골반·상의 밑단, 화면 안쪽으로 가려진 허벅지, 짧은 두 종아리와 가까운 뒤꿈치를 보존한다. renderer는 hip local(20,45), scale .066과 분리된 calf를 사용한다. 기존 논리 dock(340,329), render offset(0,-6), arrival/seat/exit/commit 규칙과 TV–의자 사이 아래쪽 접근은 그대로다. 구매한 shirt/knit는 머리와 피부를 제외한 원본 의류 영역에만 색을 반영한다.

V08은 정후면의 앞으로 모인 팔을 유지한다. 상체의 작은 움직임과 소매 앞 제품/손끝 일부를 노출해 행동이 보이며, 긴 팔을 별도로 덧그리지 않는다. 제품과 접점은 같은 transform 안에서 이동한다. 화장대 소유권이 있는 동안 `.beauty-selection` 상태 문구는 숨겨 머리와 겹치지 않게 하고 종료 후 복원한다. 실제 390×844/320×568 검증 범위는 최신 main_screen_review와 visual_polish_review를 따른다.
