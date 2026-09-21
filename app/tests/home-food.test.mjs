import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as movement from '../movement.js';
import * as avatars from '../avatar.js';
import * as scenes from '../scene-entry.js';
import * as interactions from '../interactions.js';
import * as objects from '../object-art.js';
import * as demoState from '../demo-state.js';
import * as routes from '../category-routes.js';
import {EATING_DURATION,REDUCED_EATING_DURATION} from '../food-action.js';
import {demoHome} from '../../src/data/demo-home.ts';

const RETURN_KEY='gscene-room-return-v1';
const catalogKeys=['gscene-food-v1','gscene-catalog-food-v1','gscene-catalog-beauty-v1','gscene-scene-fashion-v1','gscene-scene-living-v1'];
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'');

// Run the real Main handlers with controlled storage/events and an explicit clock.
// Rendering geometry and native accessibility remain covered by mobile browser QA.
async function boot(saved,blockedStorage=false,{confirmed,reduced=false,blockedLocal=false}={}){
 const elements=new Map(),events=new Map(),windowEvents=new Map(),storage=new Map(),local=new Map(catalogKeys.map(key=>[key,'catalog state']));
 const captureEvents=new Set();
 if(saved!==undefined)storage.set(RETURN_KEY,saved);
 if(confirmed!==undefined)local.set(demoState.DEMO_STATE_KEY,JSON.stringify(confirmed));
 let frame,scrolledTo=null;const navigations=[];
 function element(name){
  if(elements.has(name))return elements.get(name);
  const result={style:{},dataset:{},innerHTML:'',textContent:'',tagName:'DIV',classList:{toggle(){}},setAttribute(){},
   addEventListener(type,fn){this[type]=fn;},querySelector(selector){return element(`${name} ${selector}`);},querySelectorAll(){return[];},
   getBoundingClientRect(){return{top:0,left:0,width:400,height:600};},focus(){document.activeElement=this;},contains(other){return this===other;}};
  elements.set(name,result);return result;
 }
 const document={hidden:false,body:element('body'),activeElement:null,querySelector:element,querySelectorAll(){return[];},
  addEventListener(type,fn,capture){if(!events.has(type))events.set(type,[]);events.get(type).push(fn);if(capture===true)captureEvents.add(type);}};
 document.activeElement=element('.house-wrap');
 const context=vm.createContext({...movement,...avatars,...scenes,...interactions,...objects,...routes,...demoState,document,
  window:{location:{assign(url){navigations.push(url);}},innerHeight:844,scrollY:246,scrollTo({top}){scrolledTo=top;},addEventListener(type,fn){windowEvents.set(type,fn);}},
  sessionStorage:{getItem(key){if(blockedStorage)throw new Error('blocked');return storage.get(key)||null;},setItem(key,value){if(blockedStorage)throw new Error('blocked');storage.set(key,value);},removeItem(key){if(blockedStorage)throw new Error('blocked');storage.delete(key);}},
  localStorage:{getItem(key){if(blockedLocal)throw Error('blocked');return local.get(key)||null;},setItem(key,value){if(blockedLocal)throw Error('blocked');local.set(key,value);},removeItem(key){if(blockedLocal)throw Error('blocked');local.delete(key);}},
  matchMedia(){return{matches:reduced};},requestAnimationFrame(fn){frame=fn;},
  fetch:async()=>({ok:true,json:async()=>structuredClone(demoHome)}),AbortController,setTimeout(){},clearTimeout(){},console});
 await vm.runInContext(`(async()=>{${source}\n globalThis.appTest={requestIntent,handleEffects,controller,productAction,getState(){return JSON.parse(JSON.stringify(state));}};})()`,context);
 return{navigations,context,element,storage,local,events,windowEvents,captureEvents,frame:()=>frame(16),scrolledTo:()=>scrolledTo};
}


for(const [object,category] of [['fridge','food'],['pantry','food'],['vanity','beauty']]){
 const approach=movement.APPROACHES[interactions.OBJECTS[object].target];
 const original={position:approach,direction:'up',window:'open',savedAt:Date.now()};
 const app=await boot(JSON.stringify(original));
 assert.equal(app.element('.walker').dataset.x,approach.x.toFixed(2));
 assert.equal(app.storage.has(RETURN_KEY),false);
 const {controller,requestIntent,handleEffects}=app.context.appTest;
 requestIntent({type:'object',id:object});
 assert.deepEqual(app.navigations,[],'First tap keeps the room interaction');
 requestIntent({type:'object',id:object});
 assert.deepEqual(app.navigations,[],'Rapid taps cannot navigate before ready');
 handleEffects(controller.dispatch({type:'ARRIVED',id:object,epoch:controller.epoch,pathEmpty:true,position:approach}));
 for(let i=0;i<100&&controller.phase!=='engaged';i++)handleEffects(controller.tick(40));
 assert.equal(controller.phase,'engaged');
 requestIntent({type:'object',id:object});
 for(let i=0;i<100&&!app.navigations.length;i++)handleEffects(controller.tick(40));
 assert.deepEqual(app.navigations,['/'+category]);
 requestIntent({type:'object',id:object});
 assert.equal(app.navigations.length,1,'Navigation dispatches once');
 const resume=JSON.parse(app.storage.get(RETURN_KEY));
 assert.deepEqual(resume.position,approach);
 assert.equal(resume.window,'open');
 for(const key of catalogKeys)assert.equal(app.local.get(key),'catalog state');
 const restored=await boot(JSON.stringify(resume));
 assert.equal(restored.element('.walker').dataset.x,approach.x.toFixed(2));
 assert.equal(restored.context.appTest.controller.objects.window.stable,'open');
 restored.element('#reset').click();
 for(const key of catalogKeys)assert.equal(restored.local.has(key),false,key+' cleared by reset');
}
for(const saved of ['{',JSON.stringify({position:{x:0,y:0},savedAt:Date.now()}),JSON.stringify({position:movement.START,savedAt:0})]){
 const app=await boot(saved);
 assert.equal(app.element('.walker').dataset.x,movement.START.x.toFixed(2));
}
const blocked=await boot(undefined,true);blocked.element('#reset').click();
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
for(const category of ['food','beauty'])assert.match(html,new RegExp('<button[^>]*data-room="'+category+'"[^>]*class="room-target '+category+'"'));
console.log('PASS: Food/Beauty first interaction, ready second-tap navigation, return state, duplicate guard, and all catalog resets.');

const initial=demoState.initialDemoState(demoHome);
const owned=key=>demoHome.purchases.find(p=>p.illustrationKey===key);
const milk=owned('milk').id,water=owned('water').id,cream=owned('cream').id;
const thirdGarment=demoHome.purchases.find(p=>p.roomSlot==='wardrobe-3').id;
const persisted=app=>JSON.parse(app.local.get(demoState.DEMO_STATE_KEY));
const current=app=>app.context.appTest.getState();
function dispatch(app,event){const api=app.context.appTest;api.handleEffects(api.controller.dispatch(event));}
function advance(app,ms){const api=app.context.appTest;api.handleEffects(api.controller.tick(ms));}
function enter(app,object){
 const api=app.context.appTest,position=movement.APPROACHES[interactions.OBJECTS[object].target];
 api.requestIntent({type:'object',id:object});
 dispatch(app,{type:'ARRIVED',id:object,epoch:api.controller.epoch,pathEmpty:true,position});
 advance(app,1000);assert.equal(api.controller.phase,'engaged');
}
async function bootAt(object,confirmed=initial,options={}){
 const position=movement.APPROACHES[interactions.OBJECTS[object].target];
 return boot(JSON.stringify({position,direction:'up',savedAt:Date.now()}),false,{confirmed,...options});
}
function select(app,id){dispatch(app,{type:'SELECT_FOOD',productId:id});}
function eat(app,id){app.context.appTest.productAction(id);}

// O1/O2: The second knit is a distinct owned item, despite sharing its rendering key.
{
 const confirmed={...initial,outfitId:thirdGarment,avatarId:'f02'};
 const app=await bootAt('wardrobe',confirmed);
 assert.equal(current(app).outfitId,thirdGarment);
 assert.equal(app.element('.walker').dataset.outfitProductId,thirdGarment);
 enter(app,'wardrobe');dispatch(app,{type:'EXPAND'});
 const tray=app.element('#tray-root').innerHTML,art=app.element('.object-art').innerHTML;
 for(const garment of demoHome.purchases.filter(p=>p.category==='fashion')){
  assert.ok(tray.includes(`data-product="${garment.id}"`),'Main wardrobe lists every owned canonical ID');
  assert.ok(art.includes(`data-product="${garment.id}"`),'Main wardrobe renders every owned canonical ID');
 }
 assert.ok(tray.includes('Fashion에서 입기'),'Main wardrobe delegates explicit clothing changes to Fashion');
 assert.equal(persisted(app).outfitId,thirdGarment,'Opening/choosing wardrobe never rewrites the confirmed outfit');
 app.context.appTest.productAction(owned('shirt').id);
 assert.deepEqual(app.navigations,['/fashion']);
 assert.equal(persisted(app).outfitId,thirdGarment);
 const reload=await boot(undefined,false,{confirmed:persisted(app)});
 assert.equal(reload.element('.walker').dataset.outfitProductId,thirdGarment,'Reload preserves exact product identity');
}

// O3: An unrelated commit from old Main memory must merge against the latest confirmation.
for(const object of ['lamp','vanity']){
 const app=await bootAt(object);
 const latest={...initial,outfitId:thirdGarment,avatarId:'f02',foodQuantity:{...initial.foodQuantity,[milk]:1}};
 app.local.set(demoState.DEMO_STATE_KEY,JSON.stringify(latest));
 enter(app,object);
 if(object==='vanity'){app.context.appTest.productAction(cream);advance(app,500);}
 const saved=persisted(app);
 assert.equal(saved.outfitId,thirdGarment,`${object} preserves externally confirmed exact outfit ID`);
 assert.equal(saved.avatarId,'f02');assert.equal(saved.foodQuantity[milk],1);
 if(object==='lamp')assert.equal(saved.lampOn,!latest.lampOn);
 else assert.equal(saved.featuredBeautyId,cream,'Beauty art keys resolve back to canonical product IDs');
 assert.equal(app.element('.walker').dataset.outfitProductId,thirdGarment);
}

// F1/F4: Selection is free; the final frame alone commits one use, including reduced motion.
for(const object of ['fridge','pantry'])for(const reduced of [false,true]){
 const app=await bootAt(object,{...initial,outfitId:thirdGarment},{reduced});
 const food=object==='pantry'?owned('vitamin').id:milk;
 const duration=reduced?REDUCED_EATING_DURATION:EATING_DURATION;
 enter(app,object);select(app,food);advance(app,10000);
 assert.equal(persisted(app).foodQuantity[food],3,'Selection does not consume');
 eat(app,food);eat(app,food);eat(app,food);
 assert.equal(app.context.appTest.controller.step,'eat');
 advance(app,duration-1);assert.equal(persisted(app).foodQuantity[food],3,'No premature consumption');
 // Another page can confirm an outfit during the animation, before storage dispatch arrives.
 app.local.set(demoState.DEMO_STATE_KEY,JSON.stringify({...persisted(app),outfitId:owned('shirt').id}));
 advance(app,1);assert.equal(persisted(app).foodQuantity[food],2,'Completion consumes exactly one');
 assert.equal(persisted(app).outfitId,owned('shirt').id,'Completion preserves the latest confirmed outfit');
 advance(app,10000);assert.equal(persisted(app).foodQuantity[food],2,'An idle animation cannot double-consume');
 dispatch(app,{type:'CANCEL'});advance(app,1000);
 const reload=await bootAt(object,persisted(app),{reduced});enter(reload,object);select(reload,food);
 if(!reload.context.appTest.controller.trayExpanded)dispatch(reload,{type:'EXPAND'});
 assert.equal(current(reload).foodQuantity[food],2,'Completed use survives leaving and refreshing');
 assert.match(reload.element('#tray-root').innerHTML,/데모 잔량 2회/);
}

// F5/F6: Real interruption/reset handlers invalidate both old actions and stale completion tokens.
for(const interruption of ['exit','blur','hide','storage','reset']){
 const app=await bootAt('fridge',{...initial,outfitId:thirdGarment});
 enter(app,'fridge');select(app,milk);eat(app,milk);advance(app,EATING_DURATION-1);
 const controller=app.context.appTest.controller,token=controller.token();
 if(interruption==='exit')dispatch(app,{type:'CANCEL'});
 if(interruption==='blur')app.windowEvents.get('blur')();
 if(interruption==='hide'){app.context.document.hidden=true;for(const fn of app.events.get('visibilitychange'))fn();}
 if(interruption==='storage')app.windowEvents.get('storage')({key:demoState.DEMO_STATE_KEY});
 if(interruption==='reset')app.element('#reset').click();
 dispatch(app,{type:'STEP_DONE',...token});advance(app,10000);
 assert.equal(persisted(app).foodQuantity[milk],3,`${interruption} before completion does not consume`);
 assert.equal(current(app).outfitId,interruption==='reset'?initial.outfitId:thirdGarment);
 assert.equal(controller.action,null);assert.equal(controller.selectedFood,null);
}

{
 const zero={...initial,foodQuantity:{...initial.foodQuantity,[milk]:0}};
 const app=await bootAt('fridge',zero);enter(app,'fridge');select(app,milk);dispatch(app,{type:'EXPAND'});
 assert.match(app.element('#tray-root').innerHTML,new RegExp(`data-action="${milk}"[^>]*disabled`));
 eat(app,milk);advance(app,10000);assert.equal(persisted(app).foodQuantity[milk],0);
 assert.equal(app.context.appTest.controller.phase,'engaged');
 assert.equal(persisted(app).foodQuantity[water],3,'Zero inventory does not affect another food');
}

// A blocked storage backend still supports consecutive uses during this visit.
{
 const app=await bootAt('fridge',initial,{blockedLocal:true});enter(app,'fridge');select(app,milk);
 for(const remaining of [2,1,0]){eat(app,milk);advance(app,EATING_DURATION);assert.equal(current(app).foodQuantity[milk],remaining);}
 eat(app,milk);advance(app,EATING_DURATION);assert.equal(current(app).foodQuantity[milk],0);
}
console.log('PASS: canonical O1/O2/O3 wardrobe/state preservation; F1/F4 completion, duplicate, reload, interruption, reset, zero and blocked-storage consumption.');
