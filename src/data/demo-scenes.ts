import type { DemoScene, SceneCategory, SceneProduct } from '../types/scene.ts';

// Fictional products and prices for the demo, not actual GS SHOP listings.
// Replace this catalog with sampled product records when those are available.
const fashion: SceneProduct[] = [
  {
    id: 'fashion-trousers', category: 'fashion', name: '차콜 스트레이트 팬츠',
    brand: 'G:Scene sample', price: 39000, imageUrl: '/scene-art/products.png#trousers',
    kind: '하의', situations: ['출근', '약속'], tastes: ['미니멀', '단정한'],
    description: '출근부터 저녁 약속까지, 차분하게 연결하는 차콜 팬츠.',
    pairsWith: ['knit', 'shirt'],
    reasons: {
      knit: '크림 니트와 차콜의 차분한 대비로 출근 코디를 완성해요.',
      shirt: '블루 셔츠에 차콜 하의를 더하면 단정한 조합이 돼요.',
    },
  },
  {
    id: 'fashion-denim', category: 'fashion', name: '데일리 스트레이트 데님',
    brand: 'G:Scene sample', price: 42000, imageUrl: '/scene-art/products.png#denim',
    kind: '하의', situations: ['주말', '여행'], tastes: ['캐주얼', '포근한'],
    description: '주말 산책과 여행에 어울리는 편안한 분위기의 블루 데님.',
    pairsWith: ['knit', 'shirt'],
    reasons: {
      knit: '크림 니트에 블루 데님을 매치하면 편안한 주말 분위기가 나요.',
      shirt: '블루 셔츠와 데님을 같은 색 계열로 묶어 자연스럽게 입어요.',
    },
  },
  {
    id: 'fashion-blazer', category: 'fashion', name: '네이비 데일리 블레이저',
    brand: 'G:Scene sample', price: 79000, imageUrl: '/scene-art/products.png#blazer',
    kind: '아우터', situations: ['출근', '약속'], tastes: ['미니멀', '단정한'],
    description: '익숙한 상의 위에 걸쳐 분위기를 정돈하는 네이비 아우터.',
    pairsWith: ['knit', 'shirt'],
    reasons: {
      knit: '크림 니트 위에 네이비를 더해 밝고 어두운 색의 균형을 잡아요.',
      shirt: '블루 셔츠와 네이비를 연결하면 차분한 출근 룩이 돼요.',
    },
  },
  {
    id: 'fashion-tee', category: 'fashion', name: '화이트 베이직 티셔츠',
    brand: 'G:Scene sample', price: 19000, imageUrl: '/scene-art/products.png#tee',
    kind: '상의', situations: ['주말', '여행'], tastes: ['미니멀', '캐주얼'],
    description: '단독으로도, 셔츠 안에 겹쳐도 자연스러운 화이트 티셔츠.',
    pairsWith: ['shirt'],
    reasons: {
      shirt: '블루 셔츠를 열어 입고 화이트 티셔츠를 더해 가볍게 연출해요.',
    },
  },
  {
    id: 'fashion-sneakers', category: 'fashion', name: '화이트 로우 스니커즈',
    brand: 'G:Scene sample', price: 49000, imageUrl: '/scene-art/products.png#sneakers',
    kind: '신발', situations: ['주말', '여행', '출근'], tastes: ['미니멀', '캐주얼'],
    description: '밝은 색으로 코디를 마무리하는 베이직 스니커즈.',
    pairsWith: ['knit', 'shirt'],
    reasons: {
      knit: '크림 니트의 밝은 색감을 발끝까지 이어줘요.',
      shirt: '블루 셔츠에 화이트를 더해 산뜻한 일상 코디를 만들어요.',
    },
  },
  {
    id: 'fashion-flats', category: 'fashion', name: '블랙 라운드 플랫슈즈',
    brand: 'G:Scene sample', price: 35000, imageUrl: '/scene-art/products.png#flats',
    kind: '신발', situations: ['출근', '약속'], tastes: ['미니멀', '단정한'],
    description: '둥근 앞코와 블랙 컬러로 단정하게 마무리하는 플랫슈즈.',
    pairsWith: ['knit', 'shirt'],
    reasons: {
      knit: '부드러운 크림 니트에 블랙 포인트를 더해 균형을 잡아요.',
      shirt: '블루 셔츠의 깔끔한 인상을 블랙 플랫으로 이어가요.',
    },
  },
  {
    id: 'fashion-loafers', category: 'fashion', name: '브라운 클래식 로퍼',
    brand: 'G:Scene sample', price: 49000, imageUrl: '/scene-art/products.png#loafers',
    kind: '신발', situations: ['출근', '약속'], tastes: ['단정한', '포근한'],
    description: '브라운 한 끗으로 평소 코디에 따뜻함을 더하는 로퍼.',
    pairsWith: ['knit', 'shirt'],
    reasons: {
      knit: '크림 니트와 브라운이 만나 따뜻하고 단정한 느낌을 줘요.',
      shirt: '차가운 블루 셔츠에 브라운을 더하면 색감이 부드러워져요.',
    },
  },
  {
    id: 'fashion-canvas', category: 'fashion', name: '그레이 캔버스 스니커즈',
    brand: 'G:Scene sample', price: 29000, imageUrl: '/scene-art/products.png#canvas',
    kind: '신발', situations: ['주말', '여행'], tastes: ['캐주얼', '미니멀'],
    description: '튀지 않는 그레이로 가볍게 어울리는 주말 스니커즈.',
    pairsWith: ['knit', 'shirt'],
    reasons: {
      knit: '크림과 그레이의 은은한 조합으로 니트를 편하게 즐겨요.',
      shirt: '블루 셔츠에 그레이를 더해 부담 없는 캐주얼 룩을 만들어요.',
    },
  },
];

const living: SceneProduct[] = [
  {
    id: 'living-sofa', category: 'living', name: '크림 컴팩트 소파',
    brand: 'G:Scene sample', price: 289000, imageUrl: '/scene-art/products.png#sofa',
    kind: '가구', situations: ['퇴근 후 휴식', '집들이'], tastes: ['내추럴', '포근한'],
    description: '밝은 크림 색으로 휴식 공간의 중심을 만드는 소파.',
    pairsWith: ['cushion', 'lamp'],
    reasons: {
      cushion: '올리브 쿠션을 크림 소파에 올려 자연스러운 색 포인트를 만들어요.',
      lamp: '우드 플로어 램프 옆에 밝은 소파를 두어 아늑한 휴식 자리를 만들어요.',
    },
  },
  {
    id: 'living-table', category: 'living', name: '오벌 우드 티테이블',
    brand: 'G:Scene sample', price: 89000, imageUrl: '/scene-art/products.png#table',
    kind: '가구', situations: ['주말 홈카페', '집들이'], tastes: ['내추럴', '미니멀'],
    description: '차 한 잔과 좋아하는 책을 올려두는 타원형 우드 테이블.',
    pairsWith: ['cushion', 'lamp'],
    reasons: {
      cushion: '올리브 쿠션의 자연스러운 색감에 우드 소재를 이어줘요.',
      lamp: '우드 플로어 램프와 나무 소재를 맞춰 공간을 차분하게 연결해요.',
    },
  },
  {
    id: 'living-cushion', category: 'living', name: '딥 블루 포인트 쿠션',
    brand: 'G:Scene sample', price: 19000, imageUrl: '/scene-art/products.png#cushion',
    kind: '패브릭', situations: ['퇴근 후 휴식', '집들이'], tastes: ['모던', '포근한'],
    description: '익숙한 소파에 짙은 블루 한 점으로 분위기를 더해요.',
    pairsWith: ['cushion', 'lamp'],
    reasons: {
      cushion: '올리브 쿠션 옆에 딥 블루를 더해 차분한 색 조합을 만들어요.',
      lamp: '따뜻한 우드 램프 곁에 짙은 블루로 선명한 포인트를 줘요.',
    },
  },
  {
    id: 'living-rug', category: 'living', name: '크림 체크 소프트 러그',
    brand: 'G:Scene sample', price: 39000, imageUrl: '/scene-art/products.png#rug',
    kind: '패브릭', situations: ['퇴근 후 휴식', '주말 홈카페'], tastes: ['내추럴', '포근한'],
    description: '바닥에 부드러운 체크 패턴을 더해 휴식 공간을 구분해요.',
    pairsWith: ['cushion', 'lamp'],
    reasons: {
      cushion: '올리브 쿠션 아래로 크림 러그를 연결해 포근한 분위기를 만들어요.',
      lamp: '우드 플로어 램프 주변에 밝은 러그를 두면 휴식 자리가 한층 아늑해져요.',
    },
  },
  {
    id: 'living-table-lamp', category: 'living', name: '플리츠 테이블 램프',
    brand: 'G:Scene sample', price: 45000, imageUrl: '/scene-art/products.png#table-lamp',
    kind: '조명', situations: ['집중하는 시간', '주말 홈카페'], tastes: ['내추럴', '포근한'],
    description: '테이블 위 작은 코너에 따뜻한 분위기를 더하는 램프.',
    pairsWith: ['cushion', 'lamp'],
    reasons: {
      cushion: '올리브 쿠션 주변에 크림 갓의 조명을 더해 따뜻한 분위기를 이어가요.',
      lamp: '기존 플로어 램프와 높이를 달리한 조명으로 테이블 코너를 만들어요.',
    },
  },
  {
    id: 'living-mushroom-lamp', category: 'living', name: '라운드 머쉬룸 램프',
    brand: 'G:Scene sample', price: 59000, imageUrl: '/scene-art/products.png#mushroom-lamp',
    kind: '조명', situations: ['퇴근 후 휴식', '집들이'], tastes: ['미니멀', '모던'],
    description: '둥근 실루엣으로 선반이나 사이드테이블에 작은 변화를 줘요.',
    pairsWith: ['cushion', 'lamp'],
    reasons: {
      cushion: '올리브 쿠션의 색감 옆에 화이트 조명을 두어 깔끔하게 정돈해요.',
      lamp: '우드 램프와 다른 둥근 형태를 더해 공간에 작은 리듬을 만들어요.',
    },
  },
];

export const demoScenes: Record<SceneCategory, DemoScene> = {
  fashion: { category: 'fashion', cartIds: ['fashion-loafers'], products: fashion },
  living: { category: 'living', cartIds: ['living-rug'], products: living },
};
