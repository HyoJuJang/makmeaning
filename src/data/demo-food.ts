import { demoHome } from './demo-home.ts';
import type { DemoFood, FoodProduct } from '../types/food.ts';

const homeOptions: Record<string, Pick<FoodProduct, 'shortName' | 'packSize' | 'unit' | 'optionLabel'>> = {
  milk: { shortName: '우유', packSize: 1000, unit: 'ml', optionLabel: '1L · 1팩' },
  water: { shortName: '생수', packSize: 2000, unit: 'ml', optionLabel: '2L · 1병' },
  vitamin: { shortName: '멀티비타민', packSize: 30, unit: '개', optionLabel: '30정 · 1통' },
};

const foodPurchases = demoHome.purchases.filter(purchase => purchase.category === 'food');

// Fictional catalog, pack options and recipes for the prototype. Home product
// identity is reused, while the pasta purchase scenario is a separate fixture.
export const demoFood: DemoFood = {
  user: { id: demoHome.user.id, name: demoHome.user.name },
  products: [
    ...foodPurchases.map(purchase => ({
      id: purchase.id,
      name: purchase.name,
      price: purchase.price,
      imageUrl: purchase.imageUrl,
      ...homeOptions[purchase.id],
      available: true,
    })),
    {
      id: 'pasta', name: '듀럼밀 스파게티', shortName: '파스타면',
      imageUrl: '/food/products/pasta.svg', price: 3800,
      packSize: 500, unit: 'g', optionLabel: '500g · 1봉', available: true,
    },
    {
      id: 'tomato', name: '토마토 바질 파스타소스', shortName: '토마토소스',
      imageUrl: '/food/products/tomato.svg', price: 4500,
      packSize: 400, unit: 'g', optionLabel: '400g · 1병', available: true,
    },
    {
      id: 'mushroom', name: '향긋한 양송이버섯', shortName: '양송이버섯',
      imageUrl: '/food/products/mushroom.svg', price: 2900,
      packSize: 200, unit: 'g', optionLabel: '200g · 1팩', available: true,
    },
    {
      id: 'olive-oil', name: '엑스트라 버진 올리브오일', shortName: '올리브오일',
      imageUrl: '/food/products/olive-oil.svg', price: 8900,
      packSize: 250, unit: 'ml', optionLabel: '250ml · 1병', available: true,
    },
    {
      id: 'rice', name: '한 끼 즉석밥', shortName: '즉석밥',
      imageUrl: '/food/products/rice.svg', price: 1800,
      packSize: 210, unit: 'g', optionLabel: '210g · 1개', available: true,
    },
    {
      id: 'egg', name: '신선한 달걀', shortName: '달걀',
      imageUrl: '/food/products/egg.svg', price: 3900,
      packSize: 6, unit: '개', optionLabel: '6구 · 1팩', available: true,
    },
  ],
  recipes: [
    {
      id: 'tomato-pasta', name: '토마토 버섯 파스타',
      description: '토마토의 산뜻함에 버섯의 풍미를 더한 한 접시',
      minutes: 20, tags: ['quick', 'hearty'], imageUrl: '/food/meals/tomato-pasta.svg',
      ingredients: [
        { productId: 'pasta', amountPerServing: 100 },
        { productId: 'tomato', amountPerServing: 150 },
        { productId: 'mushroom', amountPerServing: 80 },
        { productId: 'olive-oil', amountPerServing: 5, optional: true },
      ],
      steps: [
        '버섯을 깨끗이 손질하고 얇게 썰어 주세요.',
        '끓는 물에 파스타면을 넣고 포장지에 안내된 시간만큼 삶아요. 면수는 조금 남겨 두세요.',
        '팬에 버섯과 면수를 조금 넣어 익힌 뒤 토마토소스를 넣어 따뜻하게 데워요. 원하면 올리브오일을 더해 주세요.',
        '삶은 면을 소스에 넣고 섞어요. 면수로 농도를 맞춘 뒤 그릇에 담아 주세요.',
      ],
    },
    {
      id: 'mushroom-rice', name: '버섯 달걀 덮밥',
      description: '노릇한 버섯과 부드러운 달걀로 채우는 든든한 한 끼',
      minutes: 15, tags: ['quick', 'hearty', 'new'], imageUrl: '/food/meals/mushroom-rice.svg',
      ingredients: [
        { productId: 'rice', amountPerServing: 210 },
        { productId: 'mushroom', amountPerServing: 100 },
        { productId: 'egg', amountPerServing: 2 },
        { productId: 'olive-oil', amountPerServing: 5, optional: true },
      ],
      steps: [
        '버섯은 얇게 썰고 달걀은 그릇에 풀어 주세요.',
        '코팅 팬에 버섯과 물을 조금 넣고 익혀요. 원하면 올리브오일을 더해 주세요.',
        '달걀을 넣어 저으며 완전히 익혀 주세요.',
        '즉석밥을 포장 안내에 맞춰 데운 뒤 버섯과 달걀을 올려요. 집에 있는 소금으로 취향에 맞게 간해도 좋아요.',
      ],
    },
    {
      id: 'creamy-pasta', name: '우유 버섯 크림 파스타',
      description: '우유와 면수로 부드럽게 완성하는 포근한 메뉴',
      minutes: 25, tags: ['hearty', 'new'], imageUrl: '/food/meals/creamy-pasta.svg',
      ingredients: [
        { productId: 'pasta', amountPerServing: 100 },
        { productId: 'milk', amountPerServing: 200 },
        { productId: 'mushroom', amountPerServing: 100 },
        { productId: 'olive-oil', amountPerServing: 5, optional: true },
      ],
      steps: [
        '버섯을 손질해 썰고, 파스타면은 포장 안내에 따라 삶아요. 면수는 조금 남겨 두세요.',
        '팬에 버섯과 면수를 조금 넣고 익혀요. 원하면 올리브오일을 더해 주세요.',
        '우유를 붓고 약한 불에서 저으며 데운 뒤 삶은 면을 넣어요.',
        '면수로 농도를 맞추며 충분히 익혀요. 집에 있는 소금으로 취향에 맞게 간한 뒤 담아 주세요.',
      ],
    },
  ],
  profiles: [
    {
      id: 'home', label: '홈과 연결',
      purchases: foodPurchases.map(purchase => ({
        productId: purchase.id,
        purchasedAt: purchase.purchasedAt,
        optionLabel: homeOptions[purchase.id].optionLabel,
      })),
      cart: [],
    },
    { id: 'new', label: '첫 방문 체험', purchases: [], cart: [] },
    {
      id: 'purchased', label: '파스타 구매 체험',
      purchases: [{ productId: 'pasta', purchasedAt: '2026.09.12', optionLabel: '500g · 1봉' }],
      cart: [],
    },
    { id: 'cart', label: '장바구니 체험', purchases: [], cart: [{ productId: 'tomato', quantity: 1 }] },
  ],
};
