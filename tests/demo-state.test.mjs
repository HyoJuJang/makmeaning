import test from 'node:test';
import assert from 'node:assert/strict';
import {demoHome} from '../src/data/demo-home.ts';
import {DEMO_STATE_KEY,DEMO_PERSONAL_KEYS,initialDemoState,normalizeDemoState,readDemoState,saveDemoState,resetDemoState,applyOwnedOutfit,outfitArtKey,toRoomVisualState,fromRoomVisualState} from '../app/demo-state.js';
const home=structuredClone(demoHome);
for(const p of home.purchases) p.id='catalog-'+p.illustrationKey;
const id=key=>home.purchases.find(p=>p.illustrationKey===key).id;
function storage(){const values=new Map();return {values,getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};}
test('legacy artwork state migrates to owned catalog IDs without changing home or cart',()=>{
 const before=JSON.stringify(home),s=storage();s.setItem(DEMO_STATE_KEY,JSON.stringify({outfitId:'shirt',featuredBeautyId:'cream',foodQuantity:{milk:1},lampOn:false,avatarId:'wave'}));
 const result=readDemoState(home,s);assert.equal(result.outfitId,id('shirt'));assert.equal(result.featuredBeautyId,id('cream'));assert.equal(result.foodQuantity[id('milk')],1);assert.equal(result.lampOn,false);assert.equal(result.avatarId,'m02');assert.equal(outfitArtKey(home,result),'shirt');assert.equal(JSON.stringify(home),before);
 assert(saveDemoState(home,result,s));assert.deepEqual(readDemoState(home,s),result);assert.equal(JSON.parse(s.getItem(DEMO_STATE_KEY)).version,2);
});
test('room rendering adapter roundtrips catalog state and never stores artwork IDs',()=>{
 const s=storage(),initial=initialDemoState(home),visual=toRoomVisualState(home,initial);visual.outfitId='shirt';visual.foodQuantity.water=0;visual.featuredBeautyId='cream';visual.lampOn=false;
 const confirmed=fromRoomVisualState(home,visual);saveDemoState(home,confirmed,s);const restored=readDemoState(home,s);
 assert.equal(restored.outfitId,id('shirt'));assert.equal(restored.foodQuantity[id('water')],0);assert.equal(restored.featuredBeautyId,id('cream'));assert.equal(restored.lampOn,false);assert.deepEqual(toRoomVisualState(home,restored),visual);
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
