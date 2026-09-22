/**
 * Reusable game-object classification, not a reconstruction of the product photo.
 * A family is a coarse silhouette. Only explicit text or reviewed examples may
 * refine color / pattern / packaging. Unknown and mixed products remain reviewable.
 * Price, brand, pack count and product IDs never become reusable asset identities.
 */

const definitions = [
  ['fashion_review', '패션 형태 확인 필요', 'fashion', 'wardrobe'],
  ['cardigan_vneck_solid', '무지 브이넥 가디건', 'fashion', 'wardrobe'],
  ['cardigan_round_solid', '무지 라운드넥 가디건', 'fashion', 'wardrobe'],
  ['cardigan_unspecified', '가디건 · 넥 형태 미확인', 'fashion', 'wardrobe'],
  ['knit_pullover', '니트 풀오버', 'fashion', 'wardrobe'],
  ['tee_short', '반소매 티셔츠', 'fashion', 'wardrobe'],
  ['tee_long', '긴소매 티셔츠', 'fashion', 'wardrobe'],
  ['shirt', '셔츠·블라우스', 'fashion', 'wardrobe'],
  ['hoodie', '후드 상의', 'fashion', 'wardrobe'],
  ['sweatshirt', '맨투맨', 'fashion', 'wardrobe'],
  ['vest', '민소매 조끼', 'fashion', 'wardrobe'],
  ['jacket', '재킷', 'fashion', 'wardrobe'],
  ['puffer', '패딩 아우터', 'fashion', 'wardrobe'],
  ['coat', '코트', 'fashion', 'wardrobe'],
  ['trousers', '긴 바지', 'fashion', 'wardrobe'],
  ['shorts', '반바지', 'fashion', 'wardrobe'],
  ['skirt', '스커트', 'fashion', 'wardrobe'],
  ['dress', '원피스', 'fashion', 'wardrobe'],
  ['jeans', '데님 바지', 'fashion', 'wardrobe'],
  ['sneakers', '운동화', 'fashion', 'floor'],
  ['low_shoes', '단화·로퍼', 'fashion', 'floor'],
  ['boots', '부츠', 'fashion', 'floor'],
  ['sandals', '샌들·슬리퍼', 'fashion', 'floor'],
  ['handbag', '핸드백', 'fashion', 'shelf'],
  ['backpack', '백팩', 'fashion', 'shelf'],
  ['suitcase', '캐리어', 'fashion', 'floor'],
  ['wallet', '지갑', 'fashion', 'shelf'],
  ['socks', '양말', 'fashion', 'shelf'],
  ['hat', '모자', 'fashion', 'shelf'],
  ['scarf', '스카프·머플러', 'fashion', 'wardrobe'],
  ['belt', '벨트', 'fashion', 'shelf'],
  ['jewelry', '주얼리', 'fashion', 'shelf'],
  ['watch', '손목시계', 'fashion', 'shelf'],
  ['eyewear', '안경·선글라스', 'fashion', 'shelf'],
  ['umbrella', '우산', 'fashion', 'floor'],
  ['face_mask', '패션 마스크·넥 커버', 'fashion', 'shelf'],
  ['gloves', '장갑·핸드워머', 'fashion', 'shelf'],
  ['arm_sleeve', '팔토시', 'fashion', 'shelf'],
  ['sports_towel', '스포츠 타월', 'fashion', 'shelf'],
  ['insole', '깔창·신발 패드', 'fashion', 'shelf'],
  ['collar_bib', '탈착식 칼라', 'fashion', 'shelf'],
  ['necktie', '넥타이', 'fashion', 'wardrobe'],
  ['hair_accessory', '헤어 액세서리', 'fashion', 'shelf'],
  ['sports_accessory', '스포츠 소품', 'fashion', 'shelf'],
  ['golf_bag', '골프 가방', 'fashion', 'floor'],
  ['tights', '타이츠', 'fashion', 'wardrobe'],
  ['legwarmer', '레그워머', 'fashion', 'shelf'],
  ['clothing_set', '상의·하의 세트', 'fashion', 'wardrobe'],
  ['swimwear', '수영복', 'fashion', 'wardrobe'],
  ['bra', '브라', 'fashion', 'wardrobe'],
  ['briefs', '팬티', 'fashion', 'wardrobe'],
  ['camisole', '캐미솔', 'fashion', 'wardrobe'],

  ['living_review', '생활 상품 형태 확인 필요', 'living', 'shelf'],
  ['memo_board', '벽 메모판', 'living', 'wall'],
  ['furniture_support', '가구 받침대', 'living', 'floor'],
  ['storage_hook', '수납 걸이', 'living', 'shelf'],
  ['decorative_figurine', '장식 인형', 'living', 'shelf'],
  ['heel_sleeve', '뒤꿈치 보호 슬리브', 'living', 'shelf'],
  ['table_lamp_dome', '돔형 테이블 조명', 'living', 'table'],
  ['table_lamp', '테이블 조명', 'living', 'table'],
  ['floor_lamp', '플로어 조명', 'living', 'floor'],
  ['sofa', '소파', 'living', 'floor'],
  ['chair', '의자·스툴', 'living', 'floor'],
  ['table', '테이블·책상', 'living', 'floor'],
  ['cabinet', '수납장', 'living', 'floor'],
  ['shelf', '선반·책장', 'living', 'floor'],
  ['clothing_rack', '옷걸이 행거', 'living', 'floor'],
  ['apron', '앞치마', 'living', 'wardrobe'],
  ['curtain_rod', '커튼봉·압축봉', 'living', 'wall'],
  ['curtain_tieback', '커튼끈', 'living', 'shelf'],
  ['wall_light', '벽 부착 조명', 'living', 'wall'],
  ['light_bulb', '교체용 전구', 'living', 'shelf'],
  ['furniture_foot_cap', '가구 다리 보호캡', 'living', 'shelf'],
  ['sewing_kit', '반짇고리', 'living', 'shelf'],
  ['sink', '싱크볼·수전', 'living', 'floor'],
  ['soap_dispenser', '세제 디스펜서', 'living', 'table'],
  ['drain_cover', '배수구 커버', 'living', 'shelf'],
  ['soap_holder', '비누 받침', 'living', 'table'],
  ['toilet_seat', '변기 시트·뚜껑', 'living', 'shelf'],
  ['bathrobe', '욕실 가운', 'living', 'wardrobe'],
  ['shower_head', '샤워기 헤드', 'living', 'shelf'],
  ['shower_hose', '교체용 샤워호스', 'living', 'shelf'],
  ['bathtub', '이동식 욕조', 'living', 'floor'],
  ['sealant', '줄눈·보수제', 'living', 'shelf'],
  ['hygiene_supply', '위생 소모품', 'living', 'shelf'],
  ['medical_patch', '외용 패치', 'living', 'shelf'],
  ['health_device', '건강 측정 기기', 'living', 'shelf'],
  ['indoor_slippers', '거실화', 'living', 'floor'],
  ['hanging_ornament', '걸이 장식', 'living', 'wall'],
  ['cleaning_supply', '생활 세정용품', 'living', 'shelf'],
  ['warming_pack', '일회용 발열팩', 'living', 'shelf'],
  ['kitchen_appliance', '주방 소형가전', 'living', 'table'],
  ['household_appliance', '생활 소형가전', 'living', 'floor'],
  ['ironing_board', '다리미판', 'living', 'floor'],
  ['climate_appliance', '실내 환경 가전', 'living', 'floor'],
  ['wall_art', '그림·액자', 'living', 'wall'],
  ['clothes_hanger', '개별 옷걸이', 'living', 'wardrobe'],
  ['clothing_cover', '의류 보관커버', 'living', 'wardrobe'],
  ['insulation_material', '단열재·문풍지', 'living', 'shelf'],
  ['umbrella_stand', '우산꽂이', 'living', 'floor'],
  ['bed', '침대', 'living', 'floor'],
  ['rug', '러그·발매트', 'living', 'floor'],
  ['cushion', '쿠션·베개', 'living', 'table'],
  ['folded_textile', '접어 둔 침구', 'living', 'shelf'],
  ['curtain', '커튼', 'living', 'floor'],
  ['mirror', '거울', 'living', 'floor'],
  ['clock', '시계', 'living', 'table'],
  ['plant', '화분 식물', 'living', 'table'],
  ['vase', '화병·빈 화분', 'living', 'table'],
  ['candle', '양초', 'living', 'table'],
  ['diffuser', '리드 디퓨저', 'living', 'table'],
  ['basket', '바구니', 'living', 'shelf'],
  ['storage_box', '수납 상자', 'living', 'shelf'],
  ['mug', '컵·머그', 'living', 'table'],
  ['plate_bowl', '접시·볼', 'living', 'shelf'],
  ['cookware', '냄비·팬', 'living', 'shelf'],
  ['kettle', '주전자', 'living', 'table'],
  ['towel', '타월', 'living', 'shelf'],
  ['tissue', '티슈·휴지', 'living', 'shelf'],
  ['cleaning_tool', '청소 도구', 'living', 'floor'],
  ['fan', '선풍기', 'living', 'floor'],
  ['fridge', '냉장고', 'living', 'floor'],
  ['laundry_appliance', '세탁기·건조기', 'living', 'floor'],
  ['screen', 'TV·모니터', 'living', 'table'],
  ['kitchen_utensil', '주방 조리 도구', 'living', 'shelf'],

  ['food_review', '식품 포장 형태 확인 필요', 'food', 'shelf'],
  ['pasta_long_pouch', '긴 파스타 봉지', 'food', 'shelf'],
  ['beverage_carton', '음료 종이팩', 'food', 'shelf'],
  ['beverage_pouch', '음료 파우치', 'food', 'shelf'],
  ['beverage_bottle', '음료 병', 'food', 'shelf'],
  ['beverage_can', '음료 캔', 'food', 'shelf'],
  ['food_can', '식품 통조림', 'food', 'shelf'],
  ['food_jar', '식품 유리병', 'food', 'shelf'],
  ['food_pouch', '식품 봉지', 'food', 'shelf'],
  ['food_box', '식품 상자', 'food', 'shelf'],
  ['food_cup', '식품 컵·밀봉 용기', 'food', 'shelf'],
  ['supplement_bottle', '영양제 알약통', 'food', 'shelf'],
  ['supplement_blister', '영양제 블리스터', 'food', 'shelf'],
  ['supplement_stick', '영양제 스틱 포장', 'food', 'shelf'],
  ['egg_carton', '계란 트레이', 'food', 'shelf'],
  ['fresh_fruit', '생과일', 'food', 'table'],
  ['fresh_vegetable', '생채소', 'food', 'table'],
  ['fresh_meat', '포장 밖 신선 육류', 'food', 'shelf'],
  ['fresh_seafood', '포장 밖 수산물', 'food', 'shelf'],
  ['bakery_food', '빵·떡·제과 본체', 'food', 'shelf'],
  ['nut_seed', '견과·씨앗 본체', 'food', 'shelf'],
  ['grain', '쌀·잡곡 본체', 'food', 'shelf'],
  ['pickled_vegetable', '김치·절임 채소 본체', 'food', 'shelf'],
  ['processed_seafood', '어묵·가공 수산물 본체', 'food', 'shelf'],
  ['fresh_egg', '껍데기 계란 본체', 'food', 'shelf'],
  ['processed_meat', '가공 육류 본체', 'food', 'shelf'],
  ['food_tray', '식품 포장 트레이', 'food', 'shelf'],
  ['cosmetic_box', '화장품 외부 포장 상자', 'beauty', 'shelf'],

  ['beauty_review', '뷰티 용기 형태 확인 필요', 'beauty', 'vanity'],
  ['serum_dropper_round', '원형 드로퍼 용기', 'beauty', 'vanity'],
  ['cosmetic_cylinder_capped', '뚜껑이 있는 원통 용기', 'beauty', 'vanity'],
  ['cosmetic_bottle_flat', '납작한 화장품 병', 'beauty', 'vanity'],
  ['cosmetic_bottle_curved', '곡선 몸통 화장품 병', 'beauty', 'vanity'],
  ['cosmetic_bottle_rectangular', '각진 화장품 병', 'beauty', 'vanity'],
  ['cosmetic_trigger', '트리거 스프레이', 'beauty', 'vanity'],
  ['cosmetic_pump', '펌프 용기', 'beauty', 'vanity'],
  ['cosmetic_tube', '화장품 튜브', 'beauty', 'vanity'],
  ['cosmetic_jar', '화장품 단지', 'beauty', 'vanity'],
  ['cosmetic_compact', '화장품 콤팩트', 'beauty', 'vanity'],
  ['cosmetic_stick', '스틱 화장품', 'beauty', 'vanity'],
  ['cosmetic_sheet', '마스크팩·화장솜', 'beauty', 'vanity'],
  ['cosmetic_bath_pouch', '입욕제 주머니·봉지', 'beauty', 'vanity'],
  ['perfume_bottle', '향수 병', 'beauty', 'vanity'],
  ['beauty_brush', '미용 브러시', 'beauty', 'vanity'],
  ['hair_dryer', '헤어 드라이어', 'beauty', 'vanity'],
  ['beauty_tool', '미용 도구', 'beauty', 'vanity'],
  ['soap', '고형 비누', 'beauty', 'vanity'],
  ['cosmetic_pencil', '펜슬 화장품', 'beauty', 'vanity'],
  ['cosmetic_palette', '아이섀도 팔레트', 'beauty', 'vanity'],
];

export const FAMILIES = Object.freeze(Object.fromEntries(definitions.map(([id, label, domain, placement]) => [id, Object.freeze({
  label, domain, placement,
  view: domain === 'fashion' ? 'front' : 'three-quarter',
  suggestedSize: placement === 'floor' ? [128, 128] : [96, 96],
})])));

// These twelve reference photos were inspected in the parent task. New records
// must not inherit their shape simply because their brand or category is similar.
const VERIFIED = Object.freeze({
  '1128893597': { familyId: 'cardigan_vneck_solid', color: 'navy', pattern: 'solid', attributes: { neckline: 'v-neck' } },
  '1128893626': { familyId: 'cardigan_vneck_solid', color: 'gray', pattern: 'solid', attributes: { neckline: 'v-neck' } },
  '1134622052': { familyId: 'cardigan_round_solid', color: 'burgundy', pattern: 'solid', attributes: { neckline: 'round' } },
  '1053232515': { familyId: 'table_lamp_dome', color: 'ivory', attributes: { shadeShape: 'dome' } },
  '1080664026': { familyId: 'pasta_long_pouch', attributes: { packaging: 'long-pouch' } },
  '1050446037': { familyId: 'pasta_long_pouch', attributes: { packaging: 'long-pouch' } },
  '1050446036': { familyId: 'pasta_long_pouch', attributes: { packaging: 'long-pouch' } },
  '1059856091': { familyId: 'serum_dropper_round', color: 'blue', attributes: { packaging: 'round-dropper' } },
  '1118407031': { familyId: 'serum_dropper_round', color: 'yellow', attributes: { packaging: 'round-dropper' } },
  '16052422': { familyId: 'cosmetic_cylinder_capped', attributes: { packaging: 'tall-capped-cylinder' } },
  '1104285714': { familyId: 'beverage_carton', attributes: { packaging: 'carton' } },
  '1110422732': { familyId: 'beverage_pouch', attributes: { packaging: 'pouch' } },
});

const COLOR_WORDS = [
  ['black', ['블랙', '검정', '검은색', 'BLACK']], ['white', ['화이트', '흰색', 'WHITE']],
  ['ivory', ['아이보리', 'IVORY']], ['beige', ['베이지', 'BEIGE']],
  ['gray', ['그레이', '그레이색', '회색', 'GREY', 'GRAY']], ['navy', ['네이비', '곤색', 'NAVY']],
  ['burgundy', ['버건디', '버건디색', '와인색', 'BURGUNDY']], ['brown', ['브라운', '갈색', 'BROWN']],
  ['blue', ['블루', '파란색', 'BLUE']], ['green', ['그린', '초록색', 'GREEN']],
  ['pink', ['핑크', '분홍색', 'PINK']], ['yellow', ['옐로우', '옐로', '노란색', 'YELLOW']],
  ['red', ['레드', '빨간색', 'RED']], ['purple', ['퍼플', '보라색', 'PURPLE']],
  ['orange', ['오렌지색', '주황색', 'ORANGE']],
];
const wordMatch = (name, word) => new RegExp(`(^|[^가-힣A-Za-z])${word}(?=$|[^가-힣A-Za-z])`, 'i').test(name);
const has = (s, re) => re.test(s);

function colorFromTitle(name, domain) {
  // Ingredient names, efficacy language and food names are not packaging colors.
  if (!['fashion', 'living'].includes(domain)) return { color: 'unspecified', evidence: [] };
  const matches = COLOR_WORDS.filter(([, words]) => words.some(word => wordMatch(name, word)));
  const selectable = /[2-9]\d*\s*(?:색|컬러|colors?)|색상\s*선택|컬러\s*선택/i.test(name);
  if (matches.length === 1 && !selectable) {
    return { color: matches[0][0], evidence: [`상품명 색상: ${matches[0][1].find(word => wordMatch(name, word))}`] };
  }
  return { color: 'unspecified', evidence: [], ...(matches.length || selectable ? { colorOptions: matches.map(([key]) => key) } : {}) };
}

function patternFromTitle(name, domain) {
  if (!['fashion', 'living'].includes(domain)) return 'unspecified';
  if (/스트라이프|스트라입|줄무늬/.test(name)) return 'stripe';
  if (/체크무늬|체크\s*(?:셔츠|남방|스커트|바지|자켓|가디건)|타탄|깅엄/.test(name)) return 'check';
  if (/도트|땡땡이/.test(name)) return 'dot';
  if (/플로럴|플라워\s*(?:패턴|프린트)|꽃무늬/.test(name)) return 'floral';
  if (/무지|솔리드/.test(name)) return 'solid';
  return 'unspecified';
}

function attributesFromTitle(name) {
  const attributes = {};
  if (/브이넥|V[ -]?넥|V[ -]?neck/i.test(name)) attributes.neckline = 'v-neck';
  else if (/라운드넥|크루넥|round[ -]?neck/i.test(name)) attributes.neckline = 'round';
  if (/민소매|슬리브리스/.test(name)) attributes.sleeve = 'sleeveless';
  else if (/반팔|반소매/.test(name)) attributes.sleeve = 'short';
  else if (/긴팔|긴소매/.test(name)) attributes.sleeve = 'long';
  if (/소가죽|천연가죽|리얼레더/.test(name)) attributes.material = 'leather';
  else if (/원목/.test(name)) attributes.material = 'wood';
  else if (/스테인리스|스테인레스|스텐/.test(name)) attributes.material = 'metal';
  else if (/투명.*유리|유리.*투명/.test(name)) attributes.material = 'clear-glass';
  return attributes;
}

function fashionFamily(n, c, leaf, attrs, pattern) {
  if (/속옷|브래지어|브라팬티|런닝팬티|속바지|보정속옷|팬티|잠옷|내의|홈웨어|수영복|래쉬가드|트레이닝복\/세트|셋업|한복|점프수트|오버롤/.test(c)) return null;
  if (/가디건|카디건/.test(n) || /가디건/.test(leaf)) {
    if (attrs.neckline === 'v-neck' && pattern === 'solid') return 'cardigan_vneck_solid';
    if (attrs.neckline === 'round' && pattern === 'solid') return 'cardigan_round_solid';
    return 'cardigan_unspecified';
  }
  // Accessory names take precedence over materials, brands and parent categories.
  if (/우산|양산/.test(leaf)) return 'umbrella';
  if (/안경테|선글라스/.test(leaf)) return 'eyewear';
  if (/양말/.test(leaf)) return 'socks';
  if (/스카프|머플러|숄(?!더)|목도리|넥워머/.test(n) && /스카프|머플러|숄|워머/.test(leaf) && !/마스크/.test(n)) return 'scarf';
  if (/벨트/.test(leaf) && !/벨트백|잠금벨트/.test(leaf)) return 'belt';
  if (/모자|캡\/모자|바이저|버킷햇|썬캡/.test(leaf)) return 'hat';
  if (/귀걸이|목걸이|팔찌|발찌|반지|피어싱/.test(leaf) && !/세트/.test(leaf)) return 'jewelry';
  if (/남성지갑|여성지갑/.test(c) && !/머니클립/.test(leaf)) return 'wallet';
  if (/백팩|등산가방/.test(leaf)) return 'backpack';
  if (/캐리어/.test(leaf) && !/세트|커버/.test(leaf)) return 'suitcase';
  if (/숄더백|토트백|크로스백|보스턴백|보스턴가방|클러치백|에코백/.test(leaf)) return 'handbag';
  if (/신발|스포츠화|골프화|등산화|트레킹화/.test(c)) {
    if (/슬리퍼|샌들|실내화|아쿠아슈즈|뮬/.test(leaf)) return 'sandals';
    if (/부츠|워커/.test(leaf)) return 'boots';
    if (/스니커즈|운동화|러닝화|워킹화|골프화|트레킹화|등산화|슬립온/.test(leaf)) return 'sneakers';
    if (/로퍼|단화|플랫|구두/.test(leaf) && !/펌프스|힐/.test(n)) return 'low_shoes';
    if (/슬리퍼|샌들|실내화|아쿠아슈즈|뮬/.test(n)) return 'sandals';
    if (/스니커즈|운동화|러닝화|워킹화|골프화|트레킹화|등산화|슬립온/.test(n)) return 'sneakers';
    if (/로퍼|단화|플랫/.test(n)) return 'low_shoes';
    if (/부츠|워커/.test(n)) return 'boots';
    return null;
  }
  if (/니트\/스웨터/.test(leaf) || /(?:니트|스웨터|풀오버)/.test(n) && /니트|골프의류|등산|스포츠의류/.test(c) && !/조끼|베스트|자켓|원피스|스커트|팬츠|바지|맨투맨|후드/.test(n)) return 'knit_pullover';
  if (/민소매|슬리브리스/.test(n + ' ' + leaf)) return null;
  if (/조끼|베스트(?!상품)/.test(n + ' ' + leaf) && /조끼|의류|아우터|등산/.test(c)) return 'vest';
  if (/청바지/.test(leaf) || /데님\s*(?:팬츠|바지)/.test(n)) return 'jeans';
  if (/스커트|치마/.test(leaf) && !/바지\/스커트/.test(leaf)) return 'skirt';
  if (/원피스/.test(leaf)) return 'dress';
  if (/반바지/.test(leaf) || /반바지|쇼츠/.test(n) && /바지|의류/.test(c)) return 'shorts';
  if (/긴바지|정장바지|^바지$|레깅스/.test(leaf)) return 'trousers';
  if (/다운|패딩/.test(leaf) || /패딩|다운자켓|눕시/.test(n) && /아우터|의류|등산/.test(c)) return 'puffer';
  if (/코트|레인코트/.test(leaf) && !/자켓\/코트/.test(leaf)) return 'coat';
  if (/자켓|재킷|플리스|바람막이|점퍼|블루종|트위드/.test(leaf)) return 'jacket';
  if (/후드/.test(n + ' ' + leaf)) return 'hoodie';
  if (/맨투맨|스웨트셔츠/.test(n + ' ' + leaf)) return 'sweatshirt';
  if (/반팔티셔츠/.test(leaf) || /반팔|반소매/.test(n) && /티셔츠/.test(c)) return 'tee_short';
  if (/긴팔티셔츠/.test(leaf) || /긴팔|긴소매/.test(n) && /티셔츠/.test(c)) return 'tee_long';
  if (/셔츠|남방|블라우스/.test(leaf) && !/티셔츠/.test(leaf)) return 'shirt';
  return null;
}

function livingFamily(n, c, leaf) {
  if (/조명|스탠드/.test(c)) {
    if (/장스탠드|플로어/.test(n + ' ' + leaf)) return 'floor_lamp';
    if (/단스탠드|탁상|책상\/사무용스탠드/.test(n + ' ' + leaf)) return /돔형|머쉬룸|버섯/.test(n) ? 'table_lamp_dome' : 'table_lamp';
  }
  if (/소파/.test(c) && !/소파매트|보조|커버/.test(c + n)) return 'sofa';
  if (/스툴|식탁의자|인테리어의자|좌식의자|사무용의자/.test(leaf)) return 'chair';
  if (/테이블|책상|협탁/.test(leaf) && !/부속|보조용품/.test(leaf)) return 'table';
  if (/수납가구|옷장/.test(c) && !/싱크대/.test(leaf)) return 'cabinet';
  if (/책장|책꽂이|선반/.test(leaf) && !/소품|부자재/.test(leaf)) return 'shelf';
  if (/침대/.test(c) && /가구/.test(c) && !/매트리스|보조|커버/.test(n + c)) return 'bed';
  if (/러그|카페트|발매트|욕실발판/.test(c) && !/건강매트/.test(c)) return 'rug';
  if (/쿠션|방석|베개/.test(c) && !/솜|커버|소파매트/.test(n + c)) return 'cushion';
  if (/침구|담요|이불/.test(c) && !/솜류|매트|토퍼|베개/.test(c)) return 'folded_textile';
  if (/커튼/.test(c) && !/부자재|커튼봉/.test(n + c)) return 'curtain';
  if (/거울/.test(leaf)) return 'mirror';
  if (/시계/.test(c)) return 'clock';
  if (/^원예 /.test(c) && /식물/.test(c) && !/씨앗|종자|묘목|모종/.test(n)) return 'plant';
  if (/화분\/화병/.test(leaf)) return 'vase';
  if (/조화|인조식물|조화화분/.test(n) && /원예|인테리어/.test(c)) return 'plant';
  if (/캔들/.test(c) && /캔들|양초/.test(n) && !/워머|홀더|심지|만들기/.test(n)) return 'candle';
  if (/디퓨저/.test(c) && /디퓨저/.test(n) && !/리필|스틱|소품|오일/.test(n)) return 'diffuser';
  if (/바구니|바스켓/.test(leaf)) return 'basket';
  if (/리빙박스|정리함|수납함|보관함/.test(c)) return 'storage_box';
  if (/컵\/머그\/잔/.test(c) && !/소품|거치|뚜껑|빨대|브러시/.test(n)) return 'mug';
  if (/^주방용품 /.test(c) && /식기\/홈세트|접시|공기|대접|면기/.test(c)) return 'plate_bowl';
  if (/냄비|프라이팬|후라이팬|압력솥/.test(c) && !/뚜껑|손잡이/.test(n)) return 'cookware';
  if (/주전자|전기포트/.test(c)) return 'kettle';
  if (/타월|수건/.test(leaf)) return 'towel';
  if (/화장지|물티슈|미용티슈/.test(c)) return 'tissue';
  if (/막대걸레|빗자루|테이프크리너/.test(c) && !/리필|청소포/.test(n)) return 'cleaning_tool';
  if (/선풍기|써큘레이터/.test(c) && !/커버|보관/.test(n)) return 'fan';
  if (/냉장고/.test(c)) return 'fridge';
  if (/세탁기|의류건조기/.test(c)) return 'laundry_appliance';
  if (/TV\/영상가전/.test(c) && /TV|텔레비전|모니터/i.test(n) && !/거치대|브라켓|안테나|리모컨/.test(n)) return 'screen';
  if (/조리도구|칼\/도마|주방가위/.test(c)) return 'kitchen_utensil';
  return null;
}

function foodFamily(n, c, leaf) {
  const beverage = /음료/.test(c);
  if (beverage && /테트라팩|종이팩/.test(n)) return 'beverage_carton';
  if (beverage && /파우치|스파우트/.test(n)) return 'beverage_pouch';
  if (beverage && /(?:^|[\s\d])캔(?:$|[\s\d])|캔음료|\d+\s*캔/.test(n)) return 'beverage_can';
  if (beverage && /페트|PET|유리병|\d+\s*병(?:입|세트|$|\s)/i.test(n)) return 'beverage_bottle';
  if (/통조림/.test(c)) return 'food_can';
  if (!beverage && /유리병/.test(n)) return 'food_jar';
  if (!beverage && /파우치|지퍼백|봉지/.test(n)) return 'food_pouch';
  if (!beverage && /종이상자|틴케이스|틴박스/.test(n)) return 'food_box';
  if (/계란/.test(leaf) && /트레이|난좌/.test(n)) return 'egg_carton';
  // Loose produce has a known category, but the specific silhouette is retained
  // for review below. No apple sprite is silently reused for melons or bananas.
  if (/^과일 /.test(c) && !/냉동|세트|건조|칩/.test(n + c)) return 'fresh_fruit';
  if (/^채소 /.test(c) && !/약재|세트|냉동|건조|분말|절임/.test(n + c)) return 'fresh_vegetable';
  return null;
}

function beautyFamily(n, c, leaf) {
  if (/드로퍼|스포이드/.test(n) && /원형|원통|라운드/.test(n)) return 'serum_dropper_round';
  if (/펌프형|펌핑형|펌프용기/.test(n)) return 'cosmetic_pump';
  if (/튜브형|튜브타입|튜브\s*(?:용기|크림)|\d+\s*튜브/.test(n)) return 'cosmetic_tube';
  if (/단지형|크림\s*단지|자\s*타입/.test(n)) return 'cosmetic_jar';
  if (/팔레트/.test(n) && /아이섀도우|아이메이크업/.test(c)) return 'cosmetic_palette';
  if (/쿠션\/에센스팩트|선쿠션\/팩트/.test(leaf) && !/리필/.test(n)) return 'cosmetic_compact';
  if (/립스틱|선스틱/.test(leaf)) return 'cosmetic_stick';
  if (/펜슬/.test(n) && /아이브로우|아이라이너|립라이너/.test(leaf)) return 'cosmetic_pencil';
  if (/마스크시트/.test(leaf)) return 'cosmetic_sheet';
  if (/향수/.test(c) && /오드퍼퓸|오드뚜왈렛|EDP|EDT/i.test(n) && !/공병|리필|고체|세트/.test(n)) return 'perfume_bottle';
  if (/헤어브러시|메이크업브러시/.test(leaf) && !/세척|클리너|커버/.test(n)) return 'beauty_brush';
  if (/드라이기/.test(leaf) && !/거치|노즐|부속/.test(n)) return 'hair_dryer';
  if ((leaf === '비누' || /비누|뷰티바|클렌징바/.test(n) && /클렌징/.test(c)) && !/액체|물비누|리퀴드|바디워시|폼클렌징/.test(n)) return 'soap';
  if (/미용소품|이미용기기|네일케어도구/.test(c)) return 'beauty_tool';
  return null;
}

/** Classify one original nine-field CSV row without mutating it. */
export function classifyProduct(row) {
  const n = String(row?.view_name ?? '').normalize('NFKC');
  const domain = String(row?.domain ?? '').trim().toLowerCase();
  const id = String(row?.prd_id ?? '');
  const cats = ['cate1_nm', 'cate2_nm', 'cate3_nm', 'cate4_nm'].map(k => String(row?.[k] ?? '').trim()).filter(Boolean);
  const c = cats.join(' ');
  const leaf = cats.at(-1) || '';
  const attributes = attributesFromTitle(n);
  const colorInfo = colorFromTitle(n, domain);
  if (colorInfo.colorOptions) attributes.colorOptions = colorInfo.colorOptions;
  const pattern = patternFromTitle(n, domain);
  const evidence = [...colorInfo.evidence];
  const reasons = [];
  if (c) evidence.push(`원본 분류: ${cats.join(' > ')}`);
  let familyId = `${['fashion', 'living', 'food', 'beauty'].includes(domain) ? domain : 'living'}_review`;
  let mappingStatus = 'needs_review';

  const result = () => ({ familyId, color: colorInfo.color, pattern, attributes, mappingStatus, evidence, reasons });
  if (!['fashion', 'living', 'food', 'beauty'].includes(domain) || !n || !id) {
    reasons.push('필수 상품 식별 정보 또는 지원 도메인이 부족합니다.');
    return result();
  }
  const known = VERIFIED[id];
  if (known && FAMILIES[known.familyId].domain === domain) {
    return {
      familyId: known.familyId, color: known.color || 'unspecified', pattern: known.pattern || 'unspecified',
      attributes: { ...attributes, ...known.attributes, referenceVerified: true }, mappingStatus: 'classified',
      evidence: [...evidence, `실제 상품 이미지 검토 기록: ${id}`], reasons: [],
    };
  }

  // A picture of the parent object is incorrect for its refill, spare part or kit.
  const parts = /(?:호환|교체용|부속품|부자재|리필|깔창|이너백|충전재|속통|패킹|내솥|커튼봉|필터교체|교체필터|필터세트|스틱만|뚜껑만|커버만|보관커버|본품없음|본품\s*미포함|쿠션솜|베개솜|이불솜|뒤꿈치\s*패드|신발\s*패드|에어스무스\s*스타일링\s*브러시)/;
  if (parts.test(n) || /소모품|부속품|부자재|의자보조용품|시계소품|커튼부자재/.test(c)) {
    reasons.push('본체와 부속품·리필·구성품을 구분해야 합니다.');
    return result();
  }
  if (/랜덤|골라담기|모음전|혼합세트|주얼리세트|\d+종\s*(?:택|선택)|택\s*1/.test(n) || /세트/.test(leaf) && !/침구세트/.test(leaf)) {
    reasons.push('여러 외형 또는 품목이 포함되어 대표 오브젝트 선택이 필요합니다.');
    return result();
  }
  if (/선스틱\s*\d+\s*\+\s*세럼|식탁\s*의자\s*세트|디퓨저\s*\+\s*고체탈취제|로브\s*세트/.test(n)) {
    reasons.push('서로 다른 본품이 묶인 구성으로 대표 오브젝트 선택이 필요합니다.');
    return result();
  }
  if (domain === 'fashion' && /세트/.test(n) && /(?:자켓|후드|맨투맨|티셔츠).*?(?:팬츠|바지)|(?:팬츠|바지).*?(?:자켓|후드|맨투맨|티셔츠)|캐리어.*백팩/.test(n)) {
    reasons.push('상의·하의 또는 서로 다른 가방이 묶인 상품으로 단일 외형을 확정하지 않았습니다.');
    return result();
  }
  if (domain === 'fashion' && /깊은접시|세제|식품|원두|도서|글쓰기/.test(n)
    || domain === 'living' && /치약/.test(n) && /인테리어/.test(c) && !/거치|꽂이|걸이|홀더/.test(n)) {
    reasons.push('상품명과 원본 분류가 일치하지 않습니다.');
    return result();
  }
  if (/보관함|보관케이스|수납함|거치대|받침대|보호커버|가방커버|캐리어커버|신발커버|장갑|손수건|키홀더|네임태그/.test(leaf) && domain === 'fashion') {
    reasons.push('패션 상품 본체가 아닌 소품의 개별 형태 확인이 필요합니다.');
    return result();
  }

  let matched;
  if (domain === 'fashion') matched = fashionFamily(n, c, leaf, attributes, pattern);
  else if (domain === 'living') matched = livingFamily(n, c, leaf);
  else if (domain === 'food') matched = foodFamily(n, c, leaf);
  else matched = beautyFamily(n, c, leaf);
  if (matched) {
    familyId = matched;
    evidence.push(`상품명·분류의 형태 규칙: ${matched}`);
    if (matched === 'bed' && /카우치|흙소파|흙쇼파/.test(n)
      || matched === 'knit_pullover' && /팬츠|바지|맨투맨/.test(n)
      || matched === 'curtain' && /블라인드|버티컬/.test(n)
      || matched === 'table_lamp' && /플러그일체형|전구/.test(n)) {
      mappingStatus = 'needs_review';
      reasons.push('원본 분류와 상품명에서 서로 다른 외형이 식별되었습니다.');
    } else if (['cardigan_unspecified', 'beauty_tool', 'fresh_fruit', 'fresh_vegetable', 'jewelry', 'kitchen_utensil'].includes(matched)) {
      reasons.push('큰 품목군은 식별했지만 공유 이미지에 필요한 세부 외형을 확인해야 합니다.');
    } else {
      mappingStatus = 'classified';
      attributes.representation = 'generic-family-silhouette';
    }
  } else {
    reasons.push(domain === 'food' || domain === 'beauty'
      ? '내용물 분류만으로 포장·용기 모양을 추정하지 않습니다. 실제 이미지 확인이 필요합니다.'
      : '검증된 공용 외형 규칙이 없습니다. 실제 이미지 확인이 필요합니다.');
  }
  if (colorInfo.colorOptions) {
    mappingStatus = 'needs_review';
    reasons.push('복수 색상 또는 선택형 상품으로 단일 색상을 확정하지 않았습니다.');
  }
  return result();
}
