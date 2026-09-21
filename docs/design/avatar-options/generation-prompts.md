# A-family selectable avatar designs

남자 2명, 여자 2명. 기존 A / Slouch를 공통 스타일 참고로 사용했다. 코드 및 interaction 변경 없음. Built-in image_gen으로 제작.

| ID | 캐릭터 | 기준 상태 시트 |
| --- | --- | --- |
| M01 | 남자: 검정 헝클머리, 네이비 상의, 차콜 바지 | M01-navy-states.png |
| M02 | 남자: 갈색 가르마, 세이지 상의, 다크 네이비 바지 | M02-sage-states.png |
| F01 | 여자: 검정 단발, 오트밀 상의, 블루 데님 | F01-oat-states.png |
| F02 | 여자: 갈색 낮은 묶음머리, 슬레이트 블루 상의, 올리브 차콜 카고 | F02-slate-states.png |

selection-lineup.png는 네 명의 정면 비교용 재생성 이미지다. 세부 포즈와 의상 확인은 개별 상태 시트를 기준으로 한다.

각 상태 시트 3×3 순서:
1행: idle front / idle back / idle left
2행: idle right / walk A / walk B
3행: sitting / wardrobe / vanity

캐릭터 ID는 시각 자산 식별자이며 기존 컴포넌트 API 변경을 요구하지 않는다. 현재는 배경과 라벨을 포함한 외형·포즈 참고 시트다. 바로 투입 가능한 sprite atlas가 아니며, 적용 시 투명 개별 프레임 제작 및 기존 크기·anchor에 맞춘 정렬이 필요하다. walk A/B는 정면 걷기 참고 포즈이며 완성된 4방향 애니메이션이 아니다. sitting은 바닥 착석이다.

## Generation prompts

### Shared reference prompt
Use case: stylized-concept. The attached image is the APPROVED STYLE AND PROPORTION REFERENCE, not a scene background. Create a matching selectable avatar character sheet for the same family as A / SLOUCH. Match its crisp pixel-art treatment, roughly 3-head-tall body, chunky wide pants, small relaxed hands, tiny understated face, cozy slightly slouched young adult presence. Do not switch to Bean or tall realistic proportions. Keep same 1536x1024 landscape 3x3 state sheet structure, solid opaque ivory backdrop, exactly nine isolated full-body sprites, no furniture, shadows, props, scene or UI. Character identity and outfit invariant across all nine sprites, standing scale and baseline consistent. Label positions and poses exactly as reference: row 1 IDLE FRONT, IDLE BACK, IDLE LEFT; row 2 IDLE RIGHT, WALK A, WALK B; row 3 SITTING, WARDROBE, VANITY. LEFT points screen left, RIGHT screen right. Back is true back with no face. Walking A and B show opposing feet forward, clear arm counter-swing. Sitting is floor-sitting knees bent like reference. Wardrobe is rear three-quarter with one arm reaching overhead. Vanity is right-facing with hand at cheek. No wardrobe/mirror props. Tiny simple eyes, no glamorous anime features, no giant shiny eyes, no childish or heroic aesthetic, no sexualized clothing. Maintain original A palette sophistication and equal apparent age in 20s. Every character fully contained within its cell. This is a pose reference sheet, not animation code. 

### M01
Title exactly "M01 / NAVY". Male option 1, closest to original A: tousled short charcoal hair with several loose tufts, subtly uneven fringe, original navy oversized long-sleeved tee, charcoal wide straight trousers, off-white sneakers. Calm neutral expression, approachable sleepy young adult, same original A silhouette. Preserve approved identity as closely as possible.

### M02
Title exactly "M02 / SAGE". Male option 2: chestnut brown soft short wavy hair with a visible off-center part and rounded silhouette, small forehead visible; do NOT use spiky black hairstyle. Muted sage oversized crewneck sweatshirt, very dark navy wide trousers, off-white low-top sneakers. Same A proportions and relaxed stance, slightly broader sweatshirt sleeves but not a different body build. Subtly laid-back, tiny neutral mouth. Clearly distinct from M01 by hair shape AND green top.

### F01
Title exactly "F01 / OAT". Female option 1: charcoal chin-length bob with blunt soft bangs and a slightly uneven outward flick at tips. Hair ends near chin, neck partly visible, rear bob silhouette unambiguous. Oatmeal oversized crewneck sweatshirt with sleeves loosely covering wrists, muted denim-blue wide trousers, off-white sneakers. Same A 3-head proportion, same understated eyes and face style, no exaggerated eyelashes or pink blush, no skirt required. Quiet confident Gen Z homewear. Distinct rounded bob and light top.

### F02
Title exactly "F02 / SLATE". Female option 2: dark chestnut hair tied in one SHORT LOW PONYTAIL, soft center-part curtain fringe, small loose side strands. Ponytail visible clearly in profile and rear, small tied hair silhouette not a long flowing mane. Muted dusty slate-blue oversized sweatshirt, charcoal olive wide cargo trousers with one subtle pocket, off-white sneakers. Same A proportions, mild sleepy deadpan expression, no exaggerated lashes or blush. Neutral streetwear style. Distinct ponytail and different silhouette from bob option.

Female sheets additionally requested a fully opaque ivory printed background. M02 received a background-only edit to opaque ivory, preserving all poses and labels.

### Comparison lineup
Create a character selection visual comparison board from these FOUR approved character sheets, one character per input. Use ONLY the IDLE FRONT sprite of each sheet as exact visual reference. Landscape 3:2, fully opaque solid warm ivory background, four full-body pixel-art characters standing in ONE horizontal row, equal apparent height and feet on same baseline, generous separation. Preserve identities, hairstyles, proportions, pixel art quality and outfits exactly. Left to right: M01 NAVY (black tousled hair, navy tee), M02 SAGE (brown wavy part, sage tee), F01 OAT (black bob, oatmeal sweatshirt and blue jeans), F02 SLATE (brown low ponytail, slate blue top and olive charcoal cargo trousers). Each character label below in dark charcoal: 'M01 · NAVY', 'M02 · SAGE', 'F01 · OAT', 'F02 · SLATE'. Top small title 'A / SELECT YOUR AVATAR'. No selection highlight, no buttons, no app shell, no furniture, no extra poses, no shadow or transparency. This board is for comparing four selectable avatars, not implementing selection UI.

