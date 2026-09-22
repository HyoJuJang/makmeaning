import assert from 'node:assert/strict';
import { objectArt } from '../object-art.js';
import { placedMirrorProducts } from '../room-mirror.js';
import { getHeroProducts, getRoomMirrorProducts } from '../category-products.js';
import { demoHome } from '../../src/data/demo-home.ts';
import { initialDemoState, applyOwnedOutfit, consumeOwnedFood, selectWardrobeProducts, toRoomVisualState } from '../demo-state.js';
import { garmentPresentation } from '../garment-art.js';
import { gameItemArt } from '../game-item-art.js';
const categories=['fashion','food','living','beauty'];
const state=initialDemoState(demoHome);
const mirror=(home,confirmed)=>categories.flatMap(category=>getRoomMirrorProducts(home.categories[category],confirmed));
const draw=entries=>objectArt({mirrorProducts:entries,wardrobeOpen:1,fridgeOpen:1})+placedMirrorProducts(entries);
const ids=markup=>[...markup.matchAll(/data-room-mirror-product-id="([^"]+)"/g)].map(match=>match[1]);
const entries=mirror(demoHome,state),markup=draw(entries);
assert.deepEqual(ids(markup),entries.map(entry=>entry.id),'Room consumes the category representative chain for all four categories');
for(const entry of entries){
 assert(markup.includes(`data-product-image="${entry.id}"`)||markup.includes(`data-artwork-product-id="${entry.id}"`)||markup.includes(`data-garment-source="${entry.imageUrl}"`));
 assert(markup.includes(`data-product-state="${entry.status}"`));
}
assert.deepEqual(ids(draw([])),[],'Empty category sources cannot invent a purchase');
const foodProducts=demoHome.categories.food.ownedProducts;
assert.deepEqual(foodProducts.map(product=>state.foodQuantity[product.id]),[3,3,3],'Use the category-owned quantities already in the demo source');
assert(markup.includes('>보유 식품 3개</text>'),'Three in-stock product IDs are three foods, not nine servings');
assert(!markup.includes('보유 식품 잔량'));
const firstFood=foodProducts[0];
const onceConsumed=consumeOwnedFood(demoHome,state,firstFood.id);
assert.equal(onceConsumed.foodQuantity[firstFood.id],2);
assert(draw(mirror(demoHome,onceConsumed)).includes('>보유 식품 3개</text>'),'Eating one serving does not remove an in-stock product');
let oneDepleted=onceConsumed;
while(oneDepleted.foodQuantity[firstFood.id]>0)oneDepleted=consumeOwnedFood(demoHome,oneDepleted,firstFood.id);
assert(draw(mirror(demoHome,oneDepleted)).includes('>보유 식품 2개</text>'),'A fully consumed product is excluded from the food count');
let allDepleted=oneDepleted;
for(const product of foodProducts)while(allDepleted.foodQuantity[product.id]>0)allDepleted=consumeOwnedFood(demoHome,allDepleted,product.id);
assert(draw(mirror(demoHome,allDepleted)).includes('>보유 식품 없음</text>'),'All-zero quantities show the empty food state');
assert(draw([]).includes('>보유 식품 없음</text>'),'No room food entries show the empty food state');
const sharedArtworkHome=structuredClone(demoHome);
const [firstShared,secondShared]=sharedArtworkHome.categories.food.ownedProducts;
secondShared.illustrationKey=firstShared.illustrationKey;
secondShared.imageUrl=firstShared.imageUrl;
assert.notEqual(firstShared.id,secondShared.id);
assert(draw(mirror(sharedArtworkHome,state)).includes('>보유 식품 3개</text>'),'Different canonical product IDs sharing artwork still count separately');
assert(draw([...entries,entries.find(entry=>entry.productId===firstFood.id)]).includes('>보유 식품 3개</text>'),'Repeated room entries cannot count the same product ID twice');
assert.deepEqual(foodProducts.map(product=>state.foodQuantity[product.id]),[3,3,3],'Rendering and consumption leave the original quantities unchanged');
for(const confirmed of demoHome.categories.fashion.ownedProducts){
 const next=applyOwnedOutfit(demoHome,state,confirmed.id);
 const hero=getHeroProducts(demoHome.categories.fashion,next);
 const room=getRoomMirrorProducts(demoHome.categories.fashion,next);
 assert.deepEqual(room.map(e=>e.id),hero.map(e=>e.id));
 assert.equal(hero[0].id,confirmed.id);
 assert.deepEqual(selectWardrobeProducts(demoHome,next).map(p=>p.id),hero.map(e=>e.id));
 for(const entry of room){
  assert.deepEqual(garmentPresentation(entry),{source:entry.imageUrl,number:entry.displayIndex});
 }
}
const changed=structuredClone(demoHome);
const milk=changed.categories.food.ownedProducts.find(p=>p.illustrationKey==='milk');
changed.categories.food.ownedProducts.push({...milk,id:'another-milk',roomSlot:'unmapped-slot',displayOrder:4,state:{quantity:2}});
changed.purchases=categories.flatMap(c=>changed.categories[c].ownedProducts);
const remaining={...initialDemoState(changed),foodQuantity:{...initialDemoState(changed).foodQuantity,[milk.id]:0,'another-milk':2}};
const foods=mirror(changed,remaining),after=draw(foods);
assert(after.includes(`data-room-mirror-product-id="${milk.id}"`),'Consumed ID remains auditable while its physical artwork disappears');
assert(!after.includes(`data-product-image="${milk.id}"`));
assert(after.includes('data-artwork-product-id="another-milk"'),'Another unmapped ID remains independently visible as a placeholder');
assert.deepEqual(toRoomVisualState(changed,remaining).foodQuantity,remaining.foodQuantity,'Visual adapter never collapses canonical quantities to art keys');
const moved=structuredClone(changed);
for(const p of moved.categories.food.ownedProducts)p.roomSlot='arbitrary-room-geometry';
assert.deepEqual(getHeroProducts(moved.categories.food,remaining),getHeroProducts(changed.categories.food,remaining).map(e=>({...e,product:{...e.product,roomSlot:'arbitrary-room-geometry'}})));
assert.deepEqual(ids(draw(mirror(moved,remaining))),ids(after),'Room geometry metadata cannot choose category ownership or representatives');
changed.categories.living.ownedProducts=[];
assert(!draw(mirror(changed,remaining)).includes('data-room-mirror-product-id="32470670"'));
assert(!draw(mirror(changed,remaining)).includes('data-room-mirror-product-id="1056652878"'));
// A reviewed PNG changes artwork only: canonical IDs, representative order,
// depletion and fallbacks must still follow the shared category collection.
const mappedHome=structuredClone(demoHome);
const asset={id:'shirt--white',status:'ready',domain:'fashion',url:'/assets/game-items/v1/fashion/shirt/white.png',width:100,height:100,frame:{x:10,y:5,width:80,height:90}};
const shirt=mappedHome.categories.fashion.ownedProducts.find(p=>p.illustrationKey==='shirt');
shirt.gameAsset=asset;
const mappedMilk=mappedHome.categories.food.ownedProducts.find(p=>p.illustrationKey==='milk');
mappedMilk.gameAsset={...asset,id:'carton--cream',domain:'food',url:'/assets/game-items/v1/food/beverage_carton/cream.png'};
const mappedState=initialDemoState(mappedHome);
const mappedEntries=mirror(mappedHome,mappedState),mappedMarkup=draw(mappedEntries);
assert.deepEqual(ids(mappedMarkup),mappedEntries.map(entry=>entry.id));
assert(mappedMarkup.includes('data-game-asset="shirt--white"'));
assert(mappedMarkup.includes('viewBox="10 5 80 90"'));
assert(mappedMarkup.includes(`data-product-image="${shirt.id}"`));
assert(mappedMarkup.includes('preserveAspectRatio="xMidYMax meet"'));
assert(mappedMarkup.includes('data-game-asset="carton--cream"'));
const emptyState={...mappedState,foodQuantity:{...mappedState.foodQuantity,[mappedMilk.id]:0}};
assert(!draw(mirror(mappedHome,emptyState)).includes('data-game-asset="carton--cream"'));
for(const gameAsset of [null,{...asset,status:'pending_generation'},{...asset,domain:'beauty'},{...asset,url:'https://untrusted.test/x.png'},{...asset,id:'bad" onload="alert(1)'},{...asset,frame:{x:90,y:0,width:80,height:90}}]){
 assert.equal(gameItemArt({...shirt,gameAsset}),'','Invalid or unready assets must fall back');
 shirt.gameAsset=gameAsset;
 const fallback=draw(mirror(mappedHome,mappedState));
 assert(!fallback.includes('data-game-asset="shirt--white"'));
 assert(fallback.includes(`data-artwork-product-id="${shirt.id}"`));
 assert(!fallback.includes(`href="${shirt.imageUrl}"`),'Unmapped real products never fall back to photos');
}
console.log('PASS: category → hero → Room IDs/art/state, applied order, duplicate artwork quantities, depletion, source removal and geometry independence.');
