# 방의 창문·착석 정합 수정 기준

원본 `app/assets/gather-room.png`를 직접 확인하고, `docs/design/avatar-options/README.md`의 새 캐릭터는 Main이 별도 renderer로 통합함을 확인했다. 이 작업은 구매 데이터나 캐릭터 asset을 바꾸지 않는다.

- 창문: 원본 중앙 유리 안쪽 x181–231, y19–66만 사용한다. 왼쪽 하단 식물과 겹치는 x181–189/y51–66은 clip에서 제외한다. 낮은 창짝을 위로 22px 올리는 세로 개폐로 표현하고 원래 외곽틀·좌우 창·냉장고·식물을 침범하지 않는다. 손잡이도 창짝과 함께 위아래 이동한다.
- 창 trigger: 실제 중앙 창 위의 투명 hit area, visible 배지/문구 없음. aria-label과 키보드 focus outline은 유지한다. 화면 room label은 Fashion/Food/Beauty/Living 네 개만 남긴다. 옷장/주방/거실/화장대 보조 label과 화살표 제거.
- 소파: 안전 dock (124,389), seated renderOffset (-34,+8)로 발 anchor (90,397). 약18px 위의 hip이 중앙 쿠션 y379에 놓이며 왼쪽 등받이에 기대어 방 안쪽 right를 본다. 기존 collision을 그대로 유지한다.
- 화장대: 안전 dock (340,329), direction up, seated renderOffset (0,-18)로 발 anchor (340,311). hip≈(340,293)이 stool 중심에 오도록 하고 의자 아래쪽에서 직선으로 앉는다. 가구 내부의 일반 보행은 허용하지 않는다.
- 두 dock은 현재 collision과 기존 7개 접근점/시작점에서 도달 가능함을 사전 geometry 검사했다. 수정 후 전체 이동/상태모델 검사를 다시 실행하고 실제 sprite와 좌석 정합은 Main의 모바일 브라우저에서 확인한다.
