import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as movement from '../movement.js';
import * as avatars from '../avatar.js';
import * as scenes from '../scene-entry.js';
import * as interactions from '../interactions.js';
import * as objects from '../object-art.js';
import * as demoState from '../demo-state.js';
import * as demoPersona from '../demo-persona.js';
import * as routes from '../category-routes.js';
import {demoHome} from '../../src/data/demo-home.ts';

const RETURN_KEY='gscene-room-return-v1';
const catalogKeys=['gscene-food-v1','gscene-catalog-food-v1','gscene-catalog-beauty-v1','gscene-scene-fashion-v1','gscene-scene-living-v1'];
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'');

async function boot(saved,blockedStorage=false){
 const elements=new Map(),events=new Map(),windowEvents=new Map(),storage=new Map(),local=new Map(catalogKeys.map(key=>[key,'catalog state']));
 const captureEvents=new Set();
 if(saved!==undefined)storage.set(RETURN_KEY,saved);
 let frame,scrolledTo=null;const navigations=[];
 function element(name){
  if(elements.has(name))return elements.get(name);
  const result={style:{},dataset:{},innerHTML:'',textContent:'',tagName:'DIV',classList:{toggle(){}},setAttribute(){},
   addEventListener(type,fn){this[type]=fn;},querySelector(selector){return element(`${name} ${selector}`);},querySelectorAll(){return[];},
   getBoundingClientRect(){return{top:0,left:0,width:400,height:600};},focus(){document.activeElement=this;},contains(other){return this===other;}};
  elements.set(name,result);return result;
 }
 const document={body:element('body'),activeElement:null,querySelector:element,querySelectorAll(){return[];},
  addEventListener(type,fn,capture){if(!events.has(type))events.set(type,[]);events.get(type).push(fn);if(capture===true)captureEvents.add(type);}};
 document.activeElement=element('.house-wrap');
 const context=vm.createContext({...movement,...avatars,...scenes,...interactions,...objects,...routes,...demoState,...demoPersona,document,
  window:{location:{assign(url){navigations.push(url);}},innerHeight:844,scrollY:246,scrollTo({top}){scrolledTo=top;},addEventListener(type,fn){windowEvents.set(type,fn);}},
  sessionStorage:{getItem(key){if(blockedStorage)throw new Error('blocked');return storage.get(key)||null;},setItem(key,value){if(blockedStorage)throw new Error('blocked');storage.set(key,value);},removeItem(key){if(blockedStorage)throw new Error('blocked');storage.delete(key);}},
  localStorage:{getItem(key){return local.get(key)||null;},setItem(key,value){local.set(key,value);},removeItem(key){local.delete(key);}},
  matchMedia(){return{matches:false};},requestAnimationFrame(fn){frame=fn;},
  fetch:async()=>({ok:true,json:async()=>structuredClone(demoHome)}),AbortController,setTimeout(){},clearTimeout(){},console});
 await vm.runInContext(`(async()=>{${source}\n globalThis.appTest={requestIntent,handleEffects,controller};})()`,context);
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
