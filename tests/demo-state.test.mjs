import test from 'node:test';
import assert from 'node:assert/strict';
import {demoHome} from '../src/data/demo-home.ts';
import {DEMO_STATE_KEY,DEMO_PERSONAL_KEYS,demoStateKey,personalStateKey,initialDemoState,normalizeDemoState,readDemoState,saveDemoState,resetDemoState,applyOwnedOutfit,outfitArtKey,toRoomVisualState,fromRoomVisualState} from '../app/demo-state.js';
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

const personaHomes=['f01','f02','m01','m02'].map(avatarId=>({
 ...structuredClone(home),user:{id:`demo-${avatarId}`,name:avatarId,avatarId},
 purchases:home.purchases.map(product=>({...structuredClone(product),imageKind:'product-photo'})),
}));
test('four character states restore independently and never inherit the old demo user',()=>{
 const s=storage();
 saveDemoState(home,{...initialDemoState(home),lampOn:false,foodQuantity:{[id('milk')]:0}},s);
 for(const [index,persona] of personaHomes.entries()){
  const initial=initialDemoState(persona);
  assert.deepEqual(readDemoState(persona,s),initial);
  const next={...initial,avatarRoom:['fashion','food','living','beauty'][index],lampOn:index%2===0};
  assert(saveDemoState(persona,next,s));
  assert.equal(demoStateKey(persona),`${DEMO_STATE_KEY}:${persona.user.id}`);
 }
 for(const [index,persona] of personaHomes.entries()){
  const restored=readDemoState(persona,s);
  assert.equal(restored.avatarRoom,['fashion','food','living','beauty'][index]);
  assert.equal(restored.lampOn,index%2===0);
  assert.equal(restored.userId,persona.user.id);
  assert.equal(restored.foodQuantity[id('milk')],initialDemoState(persona).foodQuantity[id('milk')]);
 }
 assert.equal(readDemoState(home,s).foodQuantity[id('milk')],0);
});
test('selected character identity cannot be overwritten by persisted appearance or another persona',()=>{
 for(const persona of personaHomes){
  assert.equal(normalizeDemoState(persona,{...initialDemoState(persona),avatarId:'wave'}).avatarId,persona.user.avatarId);
  assert.deepEqual(normalizeDemoState(persona,{...initialDemoState(persona),userId:'another-persona',lampOn:false}),initialDemoState(persona));
 }
});
test('reset clears only the active character cart, saved products and room state',()=>{
 const s=storage();
 for(const persona of personaHomes){
  for(const key of DEMO_PERSONAL_KEYS)s.setItem(personalStateKey(key,persona),'saved');
  saveDemoState(persona,{...initialDemoState(persona),avatarRoom:'food'},s);
 }
 for(const key of DEMO_PERSONAL_KEYS)s.setItem(key,'legacy-kept');
 s.setItem('unrelated-preference','keep');
 const active=personaHomes[0];
 resetDemoState(active,s);
 for(const key of DEMO_PERSONAL_KEYS)assert.equal(s.getItem(personalStateKey(key,active)),null);
 assert.deepEqual(readDemoState(active,s),initialDemoState(active));
 for(const persona of personaHomes.slice(1)){
  assert.equal(readDemoState(persona,s).avatarRoom,'food');
  for(const key of DEMO_PERSONAL_KEYS)assert.equal(s.getItem(personalStateKey(key,persona)),'saved');
 }
 for(const key of DEMO_PERSONAL_KEYS)assert.equal(s.getItem(key),'legacy-kept');
 assert.equal(s.getItem('unrelated-preference'),'keep');
 assert.equal(personalStateKey('cart','demo-user'),'cart');
 assert.equal(personalStateKey('cart',active.user.id),personalStateKey('cart',active));
});
test('real product photos never activate clothing animation by a legacy placement alias',()=>{
 for(const persona of personaHomes){
  const initial=initialDemoState(persona);
  assert.equal(initial.outfitId,'base');
  assert.equal(outfitArtKey(persona,{...initial,outfitId:id('shirt')}),'base');
  assert.deepEqual(applyOwnedOutfit(persona,initial,id('shirt')),initial);
  assert.equal(normalizeDemoState(persona,{...initial,outfitId:id('knit')}).outfitId,'base');
  assert.equal(fromRoomVisualState(persona,{...toRoomVisualState(persona,initial),outfitId:'shirt'}).outfitId,'base');
 }
});
