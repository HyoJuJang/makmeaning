import assert from 'node:assert/strict';
import { objectArt } from '../object-art.js';
import { placedMirrorProducts } from '../room-mirror.js';
import { getHeroProducts, getRoomMirrorProducts } from '../category-products.js';
import { demoHome } from '../../src/data/demo-home.ts';
import { initialDemoState, applyOwnedOutfit, selectWardrobeProducts, toRoomVisualState } from '../demo-state.js';
import { garmentPresentation } from '../garment-art.js';
const categories=['fashion','food','living','beauty'];
const state=initialDemoState(demoHome);
const mirror=(home,confirmed)=>categories.flatMap(category=>getRoomMirrorProducts(home.categories[category],confirmed));
const draw=entries=>objectArt({mirrorProducts:entries,wardrobeOpen:1,fridgeOpen:1})+placedMirrorProducts(entries);
const ids=markup=>[...markup.matchAll(/data-room-mirror-product-id="([^"]+)"/g)].map(match=>match[1]);
const entries=mirror(demoHome,state),markup=draw(entries);
assert.deepEqual(ids(markup),entries.map(entry=>entry.id),'Room consumes the category representative chain for all four categories');
for(const entry of entries){
 assert(markup.includes(`data-product-image="${entry.id}"`)||markup.includes(`data-garment-source="${entry.imageUrl}"`));
 assert(markup.includes(`data-product-state="${entry.status}"`));
}
assert.deepEqual(ids(draw([])),[],'Empty category sources cannot invent a purchase');
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
assert(after.includes('data-product-image="another-milk"'),'Another ID with the same art remains independently visible');
assert.deepEqual(toRoomVisualState(changed,remaining).foodQuantity,remaining.foodQuantity,'Visual adapter never collapses canonical quantities to art keys');
const moved=structuredClone(changed);
for(const p of moved.categories.food.ownedProducts)p.roomSlot='arbitrary-room-geometry';
assert.deepEqual(getHeroProducts(moved.categories.food,remaining),getHeroProducts(changed.categories.food,remaining).map(e=>({...e,product:{...e.product,roomSlot:'arbitrary-room-geometry'}})));
assert.deepEqual(ids(draw(mirror(moved,remaining))),ids(after),'Room geometry metadata cannot choose category ownership or representatives');
changed.categories.living.ownedProducts=[];
assert(!draw(mirror(changed,remaining)).includes('data-room-mirror-product-id="32470670"'));
assert(!draw(mirror(changed,remaining)).includes('data-room-mirror-product-id="1056652878"'));
console.log('PASS: category → hero → Room IDs/art/state, applied order, duplicate artwork quantities, depletion, source removal and geometry independence.');
