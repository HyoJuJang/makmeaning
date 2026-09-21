import test from 'node:test';
import assert from 'node:assert/strict';
import {demoHome} from '../src/data/demo-home.ts';
import {DEMO_STATE_KEY,DEMO_PERSONAL_KEYS,initialDemoState,normalizeDemoState,readDemoState,saveDemoState,updateDemoState,resetDemoState,applyOwnedOutfit,consumeOwnedFood,selectWardrobeProducts,outfitArtKey,toRoomVisualState} from '../app/demo-state.js';
const home=structuredClone(demoHome);
for(const p of home.purchases) p.id='catalog-'+p.id;
const id=key=>home.purchases.find(p=>p.illustrationKey===key).id;
function storage(){const values=new Map();return {values,getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};}
test('legacy artwork state migrates to owned catalog IDs without changing home or cart',()=>{
 const before=JSON.stringify(home),s=storage();s.setItem(DEMO_STATE_KEY,JSON.stringify({outfitId:'shirt',featuredBeautyId:'cream',foodQuantity:{milk:1},lampOn:false,avatarId:'wave'}));
 const result=readDemoState(home,s);assert.equal(result.outfitId,id('shirt'));assert.equal(result.featuredBeautyId,id('cream'));assert.equal(result.foodQuantity[id('milk')],1);assert.equal(result.lampOn,false);assert.equal(result.avatarId,'m02');assert.equal(outfitArtKey(home,result),'shirt');assert.equal(JSON.stringify(home),before);
 assert(saveDemoState(home,result,s));assert.deepEqual(readDemoState(home,s),result);assert.equal(JSON.parse(s.getItem(DEMO_STATE_KEY)).version,2);
});
test('room rendering adapter is one-way and leaves canonical product identity unchanged',()=>{
 const third=home.purchases.find(p=>p.roomSlot==='wardrobe-3'),s=storage();
 const confirmed=applyOwnedOutfit(home,initialDemoState(home),third.id),before=structuredClone(confirmed);
 const visual=toRoomVisualState(home,confirmed);assert.equal(visual.outfitId,'knit');
 visual.outfitId='shirt';visual.foodQuantity[id('water')]=0;visual.featuredBeautyId='cream';visual.lampOn=false;
 assert.deepEqual(confirmed,before);saveDemoState(home,confirmed,s);
 const restored=readDemoState(home,s);assert.equal(restored.outfitId,third.id);assert.equal(restored.foodQuantity[id('water')],3);
});
test('unowned previews cannot become owned clothing; explicit owned apply changes only outfit',()=>{
 const current=initialDemoState(home),before=structuredClone(current);let preview=id('shirt');preview=null;assert.deepEqual(current,before);
 assert.deepEqual(applyOwnedOutfit(home,current,'unowned-demo-tee'),current);assert.deepEqual(applyOwnedOutfit(home,current,id('cream')),current);
 assert.deepEqual(applyOwnedOutfit(home,current,id('shirt')),{...current,outfitId:id('shirt')});assert.deepEqual(current,before);
});
test('invalid or another user state is bounded; reset clears only personal demo state',()=>{
 const s=storage(),initial=initialDemoState(home),before=JSON.stringify(home);
 assert.deepEqual(normalizeDemoState(home,{userId:'someone-else',outfitId:id('shirt')}),initial);
 assert.deepEqual(normalizeDemoState(home,{outfitId:'unowned',foodQuantity:{[id('milk')]:99,[id('water')]:-1}}).foodQuantity,initial.foodQuantity);
 for(const key of DEMO_PERSONAL_KEYS)s.setItem(key,'saved');s.setItem('unrelated-preference','keep');saveDemoState(home,{...initial,lampOn:false},s);
 assert.deepEqual(resetDemoState(home,s),initial);assert.deepEqual(readDemoState(home,s),initial);for(const key of DEMO_PERSONAL_KEYS)assert.equal(s.getItem(key),null);assert.equal(s.getItem('unrelated-preference'),'keep');assert.equal(JSON.stringify(home),before);
});
test('three real owned garments keep distinct product identity even when sharing an illustration',()=>{
 const s=storage(),initial=initialDemoState(home),fashion=home.purchases.filter(p=>p.category==='fashion');
 assert.equal(fashion.length,3);
 assert.equal(new Set(fashion.map(p=>p.id)).size,3);
 const sameArt=fashion.filter(p=>p.illustrationKey==='knit');assert.equal(sameArt.length,2);
 const confirmed=applyOwnedOutfit(home,initial,sameArt[1].id);saveDemoState(home,confirmed,s);
 assert.equal(readDemoState(home,s).outfitId,sameArt[1].id);assert.equal(outfitArtKey(home,confirmed),'knit');
 const wardrobe=selectWardrobeProducts(home,confirmed);
 assert.deepEqual(wardrobe.map(p=>p.id),[sameArt[1].id,sameArt[0].id,id('shirt')]);
 for(const {displayIndex,...product} of wardrobe){
  assert.deepEqual(product,fashion.find(owned=>owned.id===product.id),'Compatibility metadata must preserve the exact category-owned product');
  assert.ok(displayIndex>=1&&displayIndex<=4);
 }
 assert.equal(selectWardrobeProducts(home,confirmed,1)[0].id,sameArt[1].id);
 assert.deepEqual(selectWardrobeProducts(home,confirmed,0),[]);
});
test('wardrobe limits representative garments to four and remains stable without a confirmed outfit',()=>{
 const expanded=structuredClone(home),knit=expanded.purchases.find(p=>p.category==='fashion');
 for(let index=0;index<3;index++)expanded.categories.fashion.ownedProducts.push({...knit,id:`owned-extra-${index}`,purchaseId:`extra-purchase-${index}`,displayOrder:4+index,purchasedAt:`2026.09.0${index+1}`});
 expanded.purchases=Object.values(expanded.categories).flatMap(collection=>collection.ownedProducts);
 const before=JSON.stringify(expanded),state={...initialDemoState(expanded),outfitId:'base'};
 assert.equal(selectWardrobeProducts(expanded,state,20).length,4);
 assert.deepEqual(selectWardrobeProducts(expanded,state).map(p=>p.id),selectWardrobeProducts(expanded,state).map(p=>p.id));
 assert.equal(JSON.stringify(expanded),before);
});
test('food completion consumes only an owned food product and stays at zero without mutating its input',()=>{
 const initial=initialDemoState(home),before=structuredClone(initial),beforeHome=JSON.stringify(home);
 assert.deepEqual(consumeOwnedFood(home,initial,'milk'),initial,'Artwork keys cannot consume catalog products');
 assert.deepEqual(consumeOwnedFood(home,initial,'unknown'),initial);
 assert.deepEqual(consumeOwnedFood(home,initial,id('shirt')),initial);
 let next=consumeOwnedFood(home,initial,id('milk'));assert.equal(next.foodQuantity[id('milk')],2);
 for(let index=0;index<4;index++)next=consumeOwnedFood(home,next,id('milk'));
 assert.equal(next.foodQuantity[id('milk')],0);
 assert.equal(next.foodQuantity[id('water')],3);
 assert.equal(next.outfitId,initial.outfitId);assert.deepEqual(initial,before);assert.equal(JSON.stringify(home),beforeHome);
});
test('field updates from stale screens preserve the latest outfit and consumed food through reload',()=>{
 const s=storage(),stale=initialDemoState(home);
 const third=home.purchases.find(p=>p.roomSlot==='wardrobe-3');
 const applied=updateDemoState(home,stale,latest=>applyOwnedOutfit(home,latest,third.id),s);assert.equal(applied.saved,true);
 const eaten=updateDemoState(home,stale,latest=>consumeOwnedFood(home,latest,id('milk')),s);
 assert.equal(eaten.state.outfitId,third.id);assert.equal(eaten.state.foodQuantity[id('milk')],2);
 const interaction=updateDemoState(home,stale,{lampOn:false,avatarRoom:'beauty'},s);
 assert.equal(interaction.state.outfitId,third.id);assert.equal(interaction.state.foodQuantity[id('milk')],2);
 const reapplied=updateDemoState(home,stale,latest=>applyOwnedOutfit(home,latest,id('shirt')),s);
 assert.equal(reapplied.state.lampOn,false);assert.equal(reapplied.state.foodQuantity[id('milk')],2);
 assert.deepEqual(readDemoState(home,s),reapplied.state);
 assert.deepEqual(resetDemoState(home,s),initialDemoState(home));
});
test('blocked persistence falls back to the current session state and reports save failure',()=>{
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 const current=consumeOwnedFood(home,applyOwnedOutfit(home,initialDemoState(home),id('shirt')),id('milk'));
 const result=updateDemoState(home,current,{lampOn:false},blocked);
 assert.equal(result.saved,false);assert.equal(result.state.outfitId,id('shirt'));assert.equal(result.state.foodQuantity[id('milk')],2);assert.equal(result.state.lampOn,false);
});
test('readable stale storage after quota failure cannot replenish consumed food; external writes still win',()=>{
 const initial=initialDemoState(home),s=storage();saveDemoState(home,initial,s);
 const write=s.setItem;let quota=true;s.setItem=(key,value)=>{if(quota)throw Error('quota');write(key,value);};
 const first=updateDemoState(home,initial,latest=>consumeOwnedFood(home,latest,id('milk')),s);
 const second=updateDemoState(home,first.state,latest=>consumeOwnedFood(home,latest,id('milk')),s);
 assert.equal(first.saved,false);assert.equal(second.saved,false);
 assert.equal(first.state.foodQuantity[id('milk')],2);assert.equal(second.state.foodQuantity[id('milk')],1);
 assert.equal(readDemoState(home,s).foodQuantity[id('milk')],3,'The old persistent value remains readable');
 const external=applyOwnedOutfit(home,initial,id('shirt'));write(DEMO_STATE_KEY,JSON.stringify(external));
 const afterExternal=updateDemoState(home,second.state,latest=>consumeOwnedFood(home,latest,id('milk')),s);
 assert.equal(afterExternal.state.outfitId,id('shirt'));assert.equal(afterExternal.state.foodQuantity[id('milk')],2);
 quota=false;
 const recovered=updateDemoState(home,afterExternal.state,latest=>consumeOwnedFood(home,latest,id('milk')),s);
 assert.equal(recovered.saved,true);assert.equal(readDemoState(home,s).foodQuantity[id('milk')],1);
 const staleScreen=updateDemoState(home,initial,{lampOn:false},s);
 assert.equal(staleScreen.state.foodQuantity[id('milk')],1);assert.equal(staleScreen.state.outfitId,id('shirt'));
});
