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

test('four buyers keep the same SKU, food quantity, cart and favorites in separate namespaces', async () => {
 const {personaStorageKey}=await import('../app/persona-browser.js');
 const s=storage(),personas=['demo-f01','demo-f02','demo-m01','demo-m02'].map(userId=>({...structuredClone(home),user:{...home.user,id:userId}}));
 const milkId=id('milk');
 // Old one-user demo values must never migrate into one of the new profiles.
 saveDemoState(home,{...initialDemoState(home),foodQuantity:{[milkId]:0}},s);
 s.setItem('gscene-scene-fashion-v1',JSON.stringify({cartIds:['legacy'],savedIds:['legacy']}));
 personas.forEach((person,index)=>{
  assert.equal(readDemoState(person,s).foodQuantity[milkId],3);
  assert.equal(s.getItem(personaStorageKey('gscene-scene-fashion-v1',person)),null);
  let state=initialDemoState(person);
  for(let count=0;count<index;count++)state=updateDemoState(person,state,latest=>consumeOwnedFood(person,latest,milkId),s).state;
  for(const base of ['gscene-scene-fashion-v1','gscene-scene-living-v1','gscene-catalog-food-v1','gscene-catalog-beauty-v1']){
   s.setItem(personaStorageKey(base,person),JSON.stringify({cartIds:[`cart-${index}`],savedIds:[`favorite-${index}`]}));
  }
 });
 personas.forEach((person,index)=>{
  assert.equal(readDemoState(person,s).foodQuantity[milkId],3-index);
  assert.deepEqual(JSON.parse(s.getItem(personaStorageKey('gscene-scene-fashion-v1',person))),{cartIds:[`cart-${index}`],savedIds:[`favorite-${index}`]});
 });
 resetDemoState(personas[2],s);
 personas.forEach((person,index)=>{
  assert.equal(readDemoState(person,s).foodQuantity[milkId],index===2?3:3-index);
  assert.equal(s.getItem(personaStorageKey('gscene-catalog-food-v1',person))===null,index===2);
 });
 assert.equal(readDemoState(home,s).foodQuantity[milkId],0);
 assert.equal(JSON.parse(s.getItem('gscene-scene-fashion-v1')).cartIds[0],'legacy');
});

test('a failed save for one profile cannot replace another profile state', async () => {
 const {personaStorageKey}=await import('../app/persona-browser.js');
 const s=storage(),a={...home,user:{...home.user,id:'demo-f01'}},b={...home,user:{...home.user,id:'demo-m01'}};
 saveDemoState(a,initialDemoState(a),s);saveDemoState(b,initialDemoState(b),s);
 const write=s.setItem;s.setItem=(key,value)=>{if(key===personaStorageKey(DEMO_STATE_KEY,a))throw new Error('quota');write(key,value);};
 const aEaten=updateDemoState(a,initialDemoState(a),latest=>consumeOwnedFood(a,latest,id('milk')),s);
 const bEaten=updateDemoState(b,initialDemoState(b),latest=>consumeOwnedFood(b,latest,id('milk')),s);
 assert.equal(aEaten.saved,false);assert.equal(bEaten.saved,true);
 const aAgain=updateDemoState(a,aEaten.state,latest=>consumeOwnedFood(a,latest,id('milk')),s);
 assert.equal(aAgain.state.foodQuantity[id('milk')],1);
 assert.equal(readDemoState(b,s).foodQuantity[id('milk')],2);
});

test('persona preference allows only fictional IDs and keeps buyer selection separate from avatar appearance', async () => {
 const {personaCookie,selectedPersona,personaChoices}=await import('../app/persona-browser.js');
 assert.equal(selectedPersona(''), 'demo-f01');
 assert.equal(selectedPersona('other=1; gscene-persona=demo-m02'), 'demo-m02');
 assert.equal(selectedPersona('gscene-persona=administrator'), 'demo-f01');
 assert.throws(()=>personaCookie('demo-f01; Path=/other'));
 assert.equal(personaCookie('demo-f02',true),'gscene-persona=demo-f02; Path=/; Max-Age=2592000; SameSite=Lax; Secure');
 const profile={user:{id:'demo-f01',avatarId:'m02'},personas:[{id:'demo-f01',name:'민서',theme:'미니멀'}, {id:'demo-m02',name:'준호'}, {id:'unknown',name:'잘못된 사용자'}, {id:'demo-f01',name:'중복'}]};
 assert.deepEqual(personaChoices(profile).map(persona=>persona.id),['demo-f01','demo-m02']);
 const before=JSON.stringify(profile);personaCookie('demo-m02');assert.equal(JSON.stringify(profile),before);
});


test('client profile watcher and server source selection agree for encoded, malformed and duplicate cookies', async () => {
 const {selectedPersona}=await import('../app/persona-browser.js');
 const {personaSourceFromRequest}=await import('../src/lib/demo-personas.ts');
 const cookies=['','unrelated=demo-m01','gscene-persona=demo-m01','gscene-persona=demo%2Dm02','gscene-persona=%64emo-f02','gscene-persona=%','gscene-persona=%2564emo-f02','gscene-persona=demo-m01; gscene-persona=demo-f02','gscene-persona=demo-m02; gscene-persona=demo-m02','gscene-persona=demo-m01; other=1; gscene-persona=unknown','gscene-persona=demo-m02=extra'];
 for(const cookie of cookies){
  const expected=personaSourceFromRequest(new Request('https://demo.example/api/demo/home',{headers:{cookie}})).user.id;
  assert.equal(selectedPersona(cookie),expected,cookie);
 }
 assert.equal(selectedPersona('gscene-persona=demo%2Dm02'),'demo-m02');
 assert.equal(selectedPersona('gscene-persona=demo-m02; gscene-persona=demo-m02'),'demo-f01');
});

test('reset clears all four real commerce collections only for the current persona',()=>{
 const store=storage(),profile=structuredClone(home);profile.user.id='demo-f01';
 for(const category of ['fashion','food','living','beauty']){
  store.setItem(`gscene-commerce-${category}-v2:demo-f01`,'current');
  store.setItem(`gscene-commerce-${category}-v2:demo-m01`,'other');
 }
 resetDemoState(profile,store);
 for(const category of ['fashion','food','living','beauty']){
  assert.equal(store.getItem(`gscene-commerce-${category}-v2:demo-f01`),null);
  assert.equal(store.getItem(`gscene-commerce-${category}-v2:demo-m01`),'other');
 }
});
