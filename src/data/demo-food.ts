import { demoHome } from './demo-home.ts';
import { adaptFoodProducts } from '../lib/food.ts';
import type { CatalogProduct, DemoFood, FoodProductPresentation } from '../types/food.ts';

const foodPurchases = demoHome.purchases.filter(purchase => purchase.category === 'food');
const homeCategories: Record<string, [string, string]> = {
  milk: ['유제품', '우유'], water: ['음료', '생수'], vitamin: ['건강식품', '멀티비타민'],
};

/** Fictional catalog rows use exactly the agreed source columns. */
export const demoFoodCatalog: CatalogProduct[] = [
  ...foodPurchases.map(purchase => ({
    prd_id: purchase.id, view_name: purchase.name, price: purchase.price,
    cate1_nm: '식품', cate2_nm: homeCategories[purchase.id][0],
    cate3_nm: homeCategories[purchase.id][1], cate4_m: '', brd_mn: '', domain: '푸드',
  })),
  { prd_id: 'pasta', view_name: '듀럼밀 스파게티', price: 3800, cate1_nm: '식품', cate2_nm: '면류', cate3_nm: '파스타면', cate4_m: '', brd_mn: '', domain: '푸드' },
  { prd_id: 'tomato', view_name: '토마토 바질 파스타소스', price: 4500, cate1_nm: '식품', cate2_nm: '소스', cate3_nm: '파스타소스', cate4_m: '', brd_mn: '', domain: '푸드' },
  { prd_id: 'mushroom', view_name: '향긋한 양송이버섯', price: 2900, cate1_nm: '식품', cate2_nm: '채소', cate3_nm: '버섯', cate4_m: '', brd_mn: '', domain: '푸드' },
  { prd_id: 'olive-oil', view_name: '엑스트라 버진 올리브오일', price: 8900, cate1_nm: '식품', cate2_nm: '조미료', cate3_nm: '식용유', cate4_m: '', brd_mn: '', domain: '푸드' },
  { prd_id: 'rice', view_name: '한 끼 즉석밥', price: 1800, cate1_nm: '식품', cate2_nm: '간편식', cate3_nm: '즉석밥', cate4_m: '', brd_mn: '', domain: '푸드' },
  { prd_id: 'egg', view_name: '신선한 달걀', price: 3900, cate1_nm: '식품', cate2_nm: '축산', cate3_nm: '달걀', cate4_m: '', brd_mn: '', domain: '푸드' },
];

/** Illustration/short label lookup is local presentation data, not extracted data. */
const presentation: Record<string, FoodProductPresentation> = {
  milk: { shortName: '우유', imageUrl: '/products/milk.svg' },
  water: { shortName: '생수', imageUrl: '/products/water.svg' },
  vitamin: { shortName: '멀티비타민', imageUrl: '/products/vitamin.svg' },
  pasta: { shortName: '파스타면', imageUrl: '/food/products/pasta.svg' },
  tomato: { shortName: '토마토소스', imageUrl: '/food/products/tomato.svg' },
  mushroom: { shortName: '양송이버섯', imageUrl: '/food/products/mushroom.svg' },
  'olive-oil': { shortName: '올리브오일', imageUrl: '/food/products/olive-oil.svg' },
  rice: { shortName: '즉석밥', imageUrl: '/food/products/rice.svg' },
  egg: { shortName: '달걀', imageUrl: '/food/products/egg.svg' },
};

export const demoFood: DemoFood = {
  user: { id: demoHome.user.id, name: demoHome.user.name },
  products: adaptFoodProducts(demoFoodCatalog, presentation),
  scenarios: [
    {
      id: 'tomato-pasta', name: '토마토 버섯 파스타',
      description: '토마토의 산뜻함에 버섯의 풍미를 더한 한 접시', kind: 'meal',
      tags: ['quick', 'hearty'], imageUrl: '/food/meals/tomato-pasta.svg',
      products: [{ productId: 'pasta' }, { productId: 'tomato' }, { productId: 'mushroom' }, { productId: 'olive-oil', optional: true }],
      steps: [
        '버섯을 손질하고 얇게 썰어 주세요.',
        '파스타면은 상품의 조리 안내에 따라 삶아요. 면수는 조금 남겨 두세요.',
        '팬에 버섯과 면수를 조금 넣어 익힌 뒤 토마토소스를 넣어 데워요. 원하면 올리브오일을 더해 주세요.',
        '면을 소스에 넣고 섞은 뒤 면수로 농도를 맞춰 주세요.',
      ],
    },
    {
      id: 'mushroom-rice', name: '버섯 달걀 덮밥',
      description: '버섯과 달걀을 올려 준비하는 든든한 한 끼', kind: 'meal',
      tags: ['quick', 'hearty'], imageUrl: '/food/meals/mushroom-rice.svg',
      products: [{ productId: 'rice' }, { productId: 'mushroom' }, { productId: 'egg' }, { productId: 'olive-oil', optional: true }],
      steps: [
        '버섯은 얇게 썰고 달걀은 그릇에 풀어 주세요.',
        '코팅 팬에 버섯과 물을 조금 넣고 익혀요. 원하면 올리브오일을 더해 주세요.',
        '달걀을 넣어 저으며 완전히 익혀 주세요.',
        '즉석밥을 상품의 조리 안내에 따라 데운 뒤 버섯과 달걀을 올려요.',
      ],
    },
    {
      id: 'creamy-pasta', name: '우유 버섯 크림 파스타',
      description: '우유와 면수로 부드럽게 완성하는 포근한 메뉴', kind: 'meal',
      tags: ['hearty'], imageUrl: '/food/meals/creamy-pasta.svg',
      products: [{ productId: 'pasta' }, { productId: 'milk' }, { productId: 'mushroom' }, { productId: 'olive-oil', optional: true }],
      steps: [
        '버섯을 손질해 썰고 파스타면은 상품의 조리 안내에 따라 삶아요.',
        '팬에 버섯과 면수를 조금 넣고 익혀요. 원하면 올리브오일을 더해 주세요.',
        '우유를 붓고 약한 불에서 저으며 데운 뒤 삶은 면을 넣어요.',
        '면수로 농도를 맞추며 충분히 익힌 뒤 그릇에 담아 주세요.',
      ],
    },
    {
      id: 'simple-breakfast', name: '간단한 아침 준비',
      description: '우유와 달걀로 아침 식탁을 가볍게 준비해요', kind: 'meal',
      tags: ['quick', 'morning'], imageUrl: '/food/scenarios/breakfast.svg',
      products: [{ productId: 'milk' }, { productId: 'egg' }],
      steps: [
        '아침에 준비할 상품을 골라보고 이번에 구매할 상품만 선택해 주세요.',
        '달걀은 취향에 맞게 조리하되 속까지 완전히 익혀 주세요.',
        '준비한 달걀과 우유를 식탁에 놓아요. 보관과 취급은 각 상품의 표시를 확인해 주세요.',
      ],
    },
    {
      id: 'daily-food', name: '일상 식품 챙기기',
      description: '멀티비타민 등 일상 식품의 구매 목록을 정리해요', kind: 'routine',
      tags: ['routine'], imageUrl: '/food/scenarios/daily.svg',
      products: [{ productId: 'vitamin' }, { productId: 'water', optional: true }],
      steps: [
        '구매 기록을 살펴보고 다시 구매할 상품이 있는지 직접 확인해 주세요.',
        '이번에 구매하지 않을 상품은 구매 목록에서 제외해 주세요.',
        '선택한 상품만 장바구니에 담아 구매 목록을 정리해요.',
      ],
    },
    {
      id: 'outing', name: '외출 전 챙기기',
      description: '외출을 앞두고 챙길 음료와 구매 목록을 확인해요', kind: 'outing',
      tags: ['outdoor'], imageUrl: '/food/scenarios/outing.svg',
      products: [{ productId: 'water' }],
      steps: [
        '외출에 가져갈 음료를 직접 확인해 주세요.',
        '이번에 구매할 상품을 선택하고 원하는 수량을 정해 주세요.',
        '장바구니에 이미 담은 상품은 중복으로 선택하지 않았는지 확인해 주세요.',
      ],
    },
  ],
  profiles: [
    {
      id: 'home', label: '홈과 연결',
      purchases: foodPurchases.map(purchase => ({ productId: purchase.id, purchasedAt: purchase.purchasedAt })), cart: [],
    },
    { id: 'new', label: '첫 방문 체험', purchases: [], cart: [] },
    { id: 'purchased', label: '파스타 구매 체험', purchases: [{ productId: 'pasta', purchasedAt: '2026.09.12' }], cart: [] },
    { id: 'cart', label: '장바구니 체험', purchases: [], cart: [{ productId: 'tomato', quantity: 1 }] },
  ],
};
