import test from 'node:test';
import assert from 'node:assert/strict';
import { getDemoPersona } from '../src/data/demo-personas.ts';
import { resolveDemoHome } from '../src/lib/demo-home.ts';
import { initialDemoState, saveDemoState, readDemoState, updateDemoState, resetDemoState, personalStateKey, consumeOwnedFood, applyOwnedOutfit, toRoomVisualState } from '../app/demo-state.js';
import { getHeroProducts } from '../app/category-products.js';
import { mirrorImage, roomMirrorPlacement } from '../app/room-mirror.js';
import { garmentPresentation } from '../app/garment-art.js';
import { objectArt } from '../app/object-art.js';
import { InteractionController, OBJECTS } from '../app/interactions.js';
import { APPROACHES, START } from '../app/movement.js';
import { readyObjectCategory } from '../app/category-routes.js';
import { EATING_DURATION } from '../app/food-action.js';

async function homeFor(id='demo-f01') {
 const seeds=getDemoPersona(id).purchases;
 return resolveDemoHome({find:async key=>{const p=seeds.find(p=>p.id===key);return p?{prd_id:key,domain:p.category,view_name:`Actual ${key}`,discprice:1000}:null;}},id);
}
function storage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}
function enter(c,id){const position=APPROACHES[OBJECTS[id].target];assert.equal(c.dispatch({type:'REQUEST',intent:{type:'object',id},position:START})[0].type,'navigate');c.dispatch({type:'ARRIVED',id,epoch:c.epoch,pathEmpty:true,position});c.tick(1000);assert.equal(c.phase,'engaged');return position;}

test('persona collections and reset are isolated',async()=>{
 const a=await homeFor(),b=await homeFor('demo-m02'),store=storage();
 assert.deepEqual(a.purchases.map(p=>p.id),Object.values(a.categories).flatMap(c=>c.ownedProducts.map(p=>p.id)));
 assert.deepEqual(Object.values(a.categories).map(c=>c.ownedProducts.length),[3,3,2,2]);
 const af=a.categories.food.ownedProducts[0].id,bf=b.categories.food.ownedProducts[0].id;
 saveDemoState(a,consumeOwnedFood(a,initialDemoState(a),af),store);saveDemoState(b,consumeOwnedFood(b,initialDemoState(b),bf),store);
 const key='gscene-catalog-food-v1';store.setItem(personalStateKey(key,a),'a');store.setItem(personalStateKey(key,b),'b');resetDemoState(a,store);
 assert.equal(readDemoState(a,store).foodQuantity[af],3);assert.equal(readDemoState(b,store).foodQuantity[bf],2);
 assert.equal(store.getItem(personalStateKey(key,a)),null);assert.equal(store.getItem(personalStateKey(key,b)),'b');
});
test('stale patch preserves outfit and independent same-art food IDs',async()=>{
 const home=await homeFor(),store=storage(),garment=home.categories.fashion.ownedProducts[0];garment.imageKind='illustration';
 const [first,second]=home.categories.food.ownedProducts;second.illustrationKey=first.illustrationKey;
 const stale=initialDemoState(home);let state=applyOwnedOutfit(home,stale,garment.id);state=consumeOwnedFood(home,state,first.id);saveDemoState(home,state,store);
 const result=updateDemoState(home,stale,latest=>({foodQuantity:consumeOwnedFood(home,latest,second.id).foodQuantity}),store);
 assert.equal(result.saved,true);assert.equal(result.state.outfitId,garment.id);assert.equal(result.state.foodQuantity[first.id],2);assert.equal(result.state.foodQuantity[second.id],2);
 assert.deepEqual(toRoomVisualState(home,result.state).foodQuantity,result.state.foodQuantity);
});
test('food photos bypass SVG crop and third wardrobe photo is represented',async()=>{
 const home=await homeFor();
 for(const purchase of home.purchases)purchase.gameAsset=null;
 const state=initialDemoState(home),foods=getHeroProducts(home.categories.food,state),wardrobe=getHeroProducts(home.categories.fashion,state);
 for(const entry of foods){const markup=mirrorImage(entry,roomMirrorPlacement(entry,foods));assert.match(markup,/^<image /);assert.ok(markup.includes(entry.imageUrl));assert.doesNotMatch(markup,/viewBox=/);}
 assert.equal(wardrobe.length,3);assert.equal(wardrobe[2].productId,home.categories.fashion.ownedProducts[2].id);assert.deepEqual(garmentPresentation(wardrobe[2]),{source:wardrobe[2].imageUrl,number:3});
 const markup=objectArt({wardrobeOpen:1,mirrorProducts:[...wardrobe,...foods]});for(const entry of wardrobe)assert.ok(markup.includes(`data-garment-source="${entry.imageUrl}"`));
 assert.equal(applyOwnedOutfit(home,state,wardrobe[0].id).outfitId,'base');
});
test('reviewed sprites render by exact owned product without replacing photo metadata or applying an outfit',async()=>{
 const home=await homeFor(),before=JSON.stringify(home),state=initialDemoState(home);
 const foods=getHeroProducts(home.categories.food,state),wardrobe=getHeroProducts(home.categories.fashion,state);
 for(const entry of foods){
  assert.equal(entry.product.gameAsset?.status,'ready');
  const markup=mirrorImage(entry,roomMirrorPlacement(entry,foods));
  assert.ok(markup.includes(`data-game-asset="${entry.product.gameAsset.id}"`));
  assert.ok(markup.includes(`data-product-image="${entry.productId}"`));
  assert.ok(markup.includes(entry.product.gameAsset.url));
  assert.equal(entry.imageUrl,`https://asset.m-gs.kr/prod/${entry.productId}/1/550`);
 }
 const markup=objectArt({wardrobeOpen:1,mirrorProducts:[...wardrobe,...foods]});
 for(const entry of wardrobe){
  assert.equal(entry.product.gameAsset?.status,'ready');
  assert.ok(markup.includes(`data-game-asset="${entry.product.gameAsset.id}"`));
  assert.ok(markup.includes(`data-product-image="${entry.productId}"`));
 }
 assert.equal(applyOwnedOutfit(home,state,wardrobe[0].id).outfitId,'base');
 assert.equal(JSON.stringify(home),before);
});
test('all home routes require ready re-tap and finish exit once',()=>{
 for(const [id,category] of [['wardrobe','fashion'],['fridge','food'],['pantry','food'],['sofa','living'],['vanity','beauty']]){
  const c=new InteractionController();assert.equal(readyObjectCategory(c,id),null);const position=enter(c,id);assert.equal(readyObjectCategory(c,id),category);
  assert.ok(!c.dispatch({type:'REQUEST',intent:{type:'object',id},position}).some(e=>e.type==='intent'));const routes=c.tick(1000).filter(e=>e.type==='intent'&&e.intent.type==='category');assert.equal(routes.length,1);assert.equal(routes[0].intent.id,category);assert.equal(c.tick(1000).length,0);
 }
});
test('Food exact ID commits once at completion and never after interruption',async()=>{
 const home=await homeFor(),id=home.categories.food.ownedProducts[0].id;
 for(const interruption of [null,'CANCEL','HIDE','RESET','BLUR']){
  const c=new InteractionController();enter(c,'fridge');c.dispatch({type:'SELECT_FOOD',productId:id});assert.ok(!c.tick(500).some(e=>e.type==='commit'));
  c.dispatch({type:'EAT',productId:id,quantity:3});assert.deepEqual(c.dispatch({type:'EAT',productId:id,quantity:3}),[]);assert.ok(!c.tick(EATING_DURATION-1).some(e=>e.type==='commit'));
  if(interruption)c.dispatch({type:interruption});const commits=c.tick(10000).filter(e=>e.type==='commit');assert.equal(commits.length,interruption?0:1);if(!interruption)assert.equal(commits[0].productId,id);assert.ok(!c.tick(10000).some(e=>e.type==='commit'));
 }
});
