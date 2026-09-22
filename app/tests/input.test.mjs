import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as movement from '../movement.js';
import * as avatars from '../avatar.js';
import * as scenes from '../scene-entry.js';
import * as interactions from '../interactions.js';
import * as demoState from '../demo-state.js';
import * as demoPersona from '../demo-persona.js';
import * as categoryRoutes from '../category-routes.js';
import * as objects from '../object-art.js';
import {resolveDemoHome} from '../../src/lib/demo-home.ts';
import personaSource from '../../data/demo-persona-purchases.json' with { type: 'json' };
import {demoHome} from '../../src/data/demo-home.ts';

// Execute actual app event handlers/frame loop with a minimal DOM and virtual clock.
// This tests held input and blur semantics; it is not a browser rendering test.
const elements=new Map(), documentEvents=new Map(), windowEvents=new Map();
let frameCallback, time=0;
function element(name){
  if(elements.has(name)) return elements.get(name);
  const e={style:{},dataset:{},hidden:false,innerHTML:'',textContent:'',tagName:'DIV',
    classList:{toggle(){}},setAttribute(){},
    addEventListener(type,fn){this[type]=fn;},
    querySelector(selector){return element(name+' '+selector);},
    querySelectorAll(){return [];},
    focus(){document.activeElement=this;},
    contains(other){return other===this;},
    getBoundingClientRect(){return {top:0,left:0,width:400,height:600,bottom:600};}
  };
  elements.set(name,e);return e;
}
const document={hidden:false,body:element('body'),activeElement:null,
  querySelector:element,querySelectorAll(){return [];},
  addEventListener(type,fn){if(!documentEvents.has(type))documentEvents.set(type,[]);documentEvents.get(type).push(fn);}
};
document.activeElement=element('.house-wrap');
let fetchCount=0;
let savedState=null;
const sessionState=new Map(),routeRequests=[];
const apiHome=structuredClone(demoHome);
apiHome.user.name='API 민서';
const fetchHome=async(url,options)=>{
  assert.equal(url,'/api/demo/home');assert.equal(options.cache,'no-store');fetchCount++;
  return {ok:true,json:async()=>structuredClone(apiHome)};
};
const context=vm.createContext({
  ...movement,...avatars,...scenes,...interactions,...objects,...categoryRoutes,...demoState,...demoPersona,document,
  window:{addEventListener(type,fn){windowEvents.set(type,fn);},location:{assign(href){routeRequests.push(href);}},innerHeight:844,scrollBy(){}},
  sessionStorage:{getItem(key){return sessionState.get(key)||null;},setItem(key,value){sessionState.set(key,value);},removeItem(key){sessionState.delete(key);}},
  localStorage:{removeItem(key){if(key==='gscene-main-v1')savedState=null;},getItem(){return savedState;},setItem(key,value){assert.equal(key,'gscene-main-v1');savedState=value;}},
  matchMedia(){return{matches:false};},
  requestAnimationFrame(fn){frameCallback=fn;},
  fetch:fetchHome,AbortController,clearTimeout(){},setTimeout(){},console
});
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'');
const bootstrapSource=`(async()=>{${source}\n globalThis.appTest={validateHome,showAvatarPicker,loadHome,requestIntent,controller,getState(){return JSON.parse(JSON.stringify(state));},renderProductsFor(category){active=category;renderProducts();active=null;}};})()`;
const bootstrap=vm.runInContext(bootstrapSource,context);
assert.equal(element('#app').dataset.homeState,'loading');
await bootstrap;
assert.equal(fetchCount,1);
assert.equal(element('#app').dataset.homeState,'ready');
assert(element('h1').innerHTML.includes('API 민서'),'The visible user must come from the API');
assert.equal(context.appTest.getState().outfitId,'knit','Initial outfit must honor the API wearing purchase');
const position=()=>({x:Number(element('.walker').dataset.x),y:Number(element('.walker').dataset.y)});
function emit(type,key){
  for(const fn of documentEvents.get(type)||[])fn({key,target:document.activeElement,preventDefault(){},repeat:false});
}
function frames(count){for(let i=0;i<count;i++){time+=1000/60;frameCallback(time);assert(movement.isWalkable(position().x,position().y));}}
const results=[];
frames(1);
let before=position();
emit('keydown','s');frames(30);
let after=position();
assert(after.y-before.y>45&&after.y-before.y<58,'Held S must advance continuously for half a second');
emit('keyup','s');frames(1);before=position();frames(30);
assert.deepEqual(position(),before,'Keyup must stop movement');results.push('held WASD and keyup stop');
emit('keydown','ArrowUp');frames(20);assert(position().y<before.y-25);
windowEvents.get('blur')();before=position();frames(30);assert.deepEqual(position(),before);results.push('held arrow and blur stop');
emit('keydown','d');emit('keyup','d');before=position();frames(1);assert(position().x>before.x);frames(1);before=position();frames(10);assert.deepEqual(position(),before);results.push('short press consumed exactly once');
emit('keydown','w');frames(500);before=position();assert(movement.isWalkable(before.x,before.y));frames(60);assert.deepEqual(position(),before);emit('keyup','w');results.push('held collision blocks wall/furniture without drift');
emit('keydown','s');frames(4);document.hidden=true;for(const fn of documentEvents.get('visibilitychange')||[])fn();before=position();frames(10);document.hidden=false;frames(10);assert.deepEqual(position(),before);results.push('visibility loss clears held keys');
console.log(JSON.stringify({result:'PASS',checks:results},null,2));

// Render the actual legacy modal wrapper, where Array.map must not pass its index as category.
context.appTest.renderProductsFor('food');
assert(element('.product-list').innerHTML.includes('data-action="milk"'));
assert(element('.product-list').innerHTML.includes('하나 사용하기'));
context.appTest.renderProductsFor('living');
assert(element('.product-list').innerHTML.includes('data-action="lamp"'));
assert(element('.product-list').innerHTML.includes('조명 끄기'));
console.log('PASS: actual renderProducts wrapper preserves pantry Food and lamp Living action buttons.');

// Exercise the actual retry loop: a failed response stays visible until explicit retry.
let retryAttempt=0;
context.fetch=async(...args)=>++retryAttempt===1?{ok:false,status:503}:fetchHome(...args);
const retry=context.appTest.loadHome();
await new Promise(resolve=>setImmediate(resolve));
assert.equal(element('#app').dataset.homeState,'error');
assert(element('#home-load-state').innerHTML.includes('다시 불러오기'));
element('#home-load-state #retry-home').click();
await retry;
assert.equal(retryAttempt,2);assert.equal(element('#app').dataset.homeState,'ready');
assert.equal(element('#home-load-state').hidden,true);
console.log('PASS: API boot, API user rendering, failed response, and explicit retry recovery.');

// Re-run real bootstrap with persisted choices, then invoke the real reset handler.
context.fetch=fetchHome;
savedState=JSON.stringify({outfitId:'shirt',foodQuantity:{milk:1},lampOn:false,featuredBeautyId:'cream'});
await vm.runInContext(bootstrapSource,context);
assert.equal(context.appTest.getState().outfitId,'shirt','A saved purchased outfit wins on refresh');
assert.equal(context.appTest.getState().foodQuantity.milk,1);
element('#reset').click();
const resetState=context.appTest.getState();
assert.equal(resetState.outfitId,'knit','Reset must restore the API wearing purchase');
assert.equal(resetState.foodQuantity.milk,3);
assert.equal(resetState.lampOn,true);
assert.equal(resetState.featuredBeautyId,'serum');
assert.equal(JSON.parse(savedState).outfitId,apiHome.purchases.find(p=>p.illustrationKey==='knit').id,'Reset must persist its restored outfit');
await vm.runInContext(bootstrapSource,context);
assert.equal(context.appTest.getState().outfitId,'knit','Reload must preserve reset state');

savedState=JSON.stringify({outfitId:'not-a-purchase'});
await vm.runInContext(bootstrapSource,context);
assert.equal(context.appTest.getState().outfitId,'knit','Invalid saved outfit must fall back to API state');
for(const purchase of apiHome.purchases)if(purchase.category==='fashion')purchase.state.wearing=false;
savedState=null;
await vm.runInContext(bootstrapSource,context);
assert.equal(context.appTest.getState().outfitId,'base','No API wearing item must preserve basic avatar outfits');
element('#reset').click();
assert.equal(context.appTest.getState().outfitId,'base','Reset without API wearing item must use base');
console.log('PASS: API outfit initialization, saved outfit restoration, reset/reload consistency, and base fallback.');

// Exercise real app handlers, the controller's exit effect, persistence, and a fresh room boot.
for(const [id,category] of [['wardrobe','fashion'],['fridge','food'],['vanity','beauty'],['sofa','living'],['pantry','food']]){
 await vm.runInContext(bootstrapSource,context);
 const app=context.appTest,request={type:'object',id};const priorRoutes=routeRequests.length;
 app.requestIntent(request);app.requestIntent(request);frames(2);app.requestIntent(request);
 assert.equal(routeRequests.length,priorRoutes,'Rapid first taps never navigate');
 for(let i=0;i<1000&&app.controller.phase!=='engaged';i++)frames(1);
 assert.equal(app.controller.phase,'engaged');assert.equal(routeRequests.length,priorRoutes);
 const dock=position();app.requestIntent(request);app.requestIntent(request);frames(30);
 assert.deepEqual(routeRequests.slice(priorRoutes),['/'+category],'Only the ready re-tap navigates, exactly once');
 assert(sessionState.has('gscene-room-return-v1'));
 await vm.runInContext(bootstrapSource,context);frames(1);
 assert.deepEqual(position(),dock,'Category return restores the safe standing dock');
 assert.equal(context.appTest.controller.primary,'idle');
 assert.equal(sessionState.has('gscene-room-return-v1'),false,'Resume is consumed once');
 context.appTest.requestIntent(request);
 for(let i=0;i<1000&&context.appTest.controller.phase!=='engaged';i++)frames(1);
 assert.equal(context.appTest.controller.phase,'engaged','Returning room still responds to the same object');
}
console.log('PASS: actual room handler routes all five objects exactly once after ready re-tap, restores the safe dock, and re-enters after returning.');

// BFCache restores old JS memory: the persisted pageshow handler must re-read canonical state.
savedState=null;await vm.runInContext(bootstrapSource,context);frames(1);
const canonicalShirt=apiHome.purchases.find(p=>p.illustrationKey==='shirt').id;
const canonicalMilk=apiHome.purchases.find(p=>p.illustrationKey==='milk').id;
const canonicalCream=apiHome.purchases.find(p=>p.illustrationKey==='cream').id;
const confirmedElsewhere={...demoState.initialDemoState(apiHome),outfitId:canonicalShirt,avatarId:'f02',lampOn:false,featuredBeautyId:canonicalCream};
confirmedElsewhere.foodQuantity[canonicalMilk]=1;savedState=JSON.stringify(confirmedElsewhere);
sessionState.set('gscene-room-return-v1',JSON.stringify({position:{x:162,y:164},savedAt:Date.now()}));
const cachePosition=position();windowEvents.get('pageshow')({persisted:true});
assert.equal(context.appTest.getState().outfitId,'shirt');
assert.equal(context.appTest.getState().avatarId,'f02');
assert.equal(context.appTest.getState().lampOn,false);
assert.equal(context.appTest.getState().featuredBeautyId,'cream');
assert.equal(context.appTest.getState().foodQuantity.milk,1);
assert.equal(element('.walker').dataset.avatar,'f02','Restored appearance is rendered immediately');
assert.deepEqual(position(),cachePosition,'BFCache restores state without teleporting');
assert.equal(sessionState.has('gscene-room-return-v1'),false,'Cached room consumes the pending return bookmark');
context.appTest.requestIntent({type:'object',id:'lamp'});
for(let i=0;i<1000&&context.appTest.controller.phase!=='engaged';i++)frames(1);
assert.equal(context.appTest.controller.phase,'engaged');
const afterLamp=JSON.parse(savedState);
assert.equal(afterLamp.lampOn,true,'Actual lamp interaction commits after cached return');
assert.equal(afterLamp.outfitId,canonicalShirt,'A later room commit cannot overwrite the externally confirmed outfit');
assert.equal(afterLamp.avatarId,'f02');assert.equal(afterLamp.featuredBeautyId,canonicalCream);assert.equal(afterLamp.foodQuantity[canonicalMilk],1);
console.log('PASS: persisted pageshow restores canonical appearance/purchases; subsequent actual lamp commit preserves them.');

// Boot the actual controller with each JSON-backed API home, then apply a different character.
const personaProducts=new Map(personaSource.personas.flatMap(p=>p.purchases).map(p=>[p.productId,p]));
const personaRepo={async find(id){const p=personaProducts.get(id);return p?{prd_id:id,view_name:p.productName,domain:p.category,discprice:10000,cate1_nm:'',cate2_nm:'',cate3_nm:'',cate4_nm:'',brand_name:''}:null;}};
const personaStates=new Map();
context.localStorage={getItem:key=>personaStates.get(key)||null,setItem:(key,value)=>personaStates.set(key,value),removeItem:key=>personaStates.delete(key)};
let personaReloads=0;context.window.location.reload=()=>personaReloads++;
for(let i=0;i<personaSource.personas.length;i++){
 const persona=personaSource.personas[i];
 Object.assign(apiHome,await resolveDemoHome(personaRepo,persona.id));
 document.cookie='gscene-persona='+persona.id;
 await vm.runInContext(bootstrapSource,context);frames(1);
 assert.equal(element('#app').dataset.homeState,'ready');
 assert(element('h1').innerHTML.includes(persona.name));
 assert(element('#purchase-summary').textContent.includes('10개'));
 assert.equal(element('.walker').dataset.avatar,persona.avatarLabel.toLowerCase());
 context.appTest.renderProductsFor('fashion');
 for(const p of persona.purchases.filter(p=>p.category==='fashion'))assert(element('.product-list').innerHTML.includes('data-product="'+p.productId+'"'));
 assert(!element('.product-list').innerHTML.includes('data-action='),'Display assets do not imply fitting support');
 const incomplete=structuredClone(apiHome);incomplete.purchases.pop();
 assert.throws(()=>context.appTest.validateHome(incomplete),/Incomplete demo home/);
 context.appTest.showAvatarPicker();
 for(const p of personaSource.personas)assert(element('.avatar-choices').innerHTML.includes(p.name));
 const next=personaSource.personas[(i+1)%4];
 element('#modal-root').click({target:{classList:{contains:()=>false},closest:selector=>selector==='[data-avatar]'?{dataset:{avatar:next.avatarLabel.toLowerCase()}}:null}});
 element('#modal-root').click({target:{classList:{contains:()=>false},closest:selector=>selector==='.apply-avatar'?{}:null}});
 assert.equal(demoPersona.activePersonaId(document.cookie),next.id);
 assert.equal(routeRequests.at(-1),'/');
 assert.equal(JSON.parse(personaStates.get(demoState.demoStateKey(apiHome))).userId,persona.id);
 windowEvents.get('pageshow')({persisted:true});
 assert.equal(personaReloads,i+1,'A cached previous persona must reload');
}
console.log('PASS: all four JSON purchase homes boot with ten items; picker changes persona cookie and stale cached homes reload.');
