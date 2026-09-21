import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as movement from '../movement.js';
import * as avatars from '../avatar.js';
import * as scenes from '../scene-entry.js';
import * as interactions from '../interactions.js';
import * as objects from '../object-art.js';
import {demoHome} from '../../src/data/demo-home.ts';

const RETURN_KEY='gscene-home-return-v1';
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'');

async function boot(saved,blockedStorage=false){
 const elements=new Map(),events=new Map(),windowEvents=new Map(),storage=new Map(),local=new Map([['gscene-food-v1','kitchen state']]);
 if(saved!==undefined)storage.set(RETURN_KEY,saved);
 let frame,scrolledTo=null;
 function element(name){
  if(elements.has(name))return elements.get(name);
  const result={style:{},dataset:{},innerHTML:'',textContent:'',tagName:'DIV',classList:{toggle(){}},setAttribute(){},
   addEventListener(type,fn){this[type]=fn;},querySelector(selector){return element(`${name} ${selector}`);},querySelectorAll(){return[];},
   focus(){document.activeElement=this;},contains(other){return this===other;}};
  elements.set(name,result);return result;
 }
 const document={body:element('body'),activeElement:null,querySelector:element,querySelectorAll(){return[];},
  addEventListener(type,fn){if(!events.has(type))events.set(type,[]);events.get(type).push(fn);}};
 document.activeElement=element('.house-wrap');
 const context=vm.createContext({...movement,...avatars,...scenes,...interactions,...objects,document,
  window:{scrollY:246,scrollTo({top}){scrolledTo=top;},addEventListener(type,fn){windowEvents.set(type,fn);}},
  sessionStorage:{getItem(key){if(blockedStorage)throw new Error('blocked');return storage.get(key)||null;},setItem(key,value){if(blockedStorage)throw new Error('blocked');storage.set(key,value);},removeItem(key){if(blockedStorage)throw new Error('blocked');storage.delete(key);}},
  localStorage:{getItem(key){return local.get(key)||null;},setItem(key,value){local.set(key,value);},removeItem(key){local.delete(key);}},
  matchMedia(){return{matches:false};},requestAnimationFrame(fn){frame=fn;},
  fetch:async()=>({ok:true,json:async()=>structuredClone(demoHome)}),AbortController,setTimeout(){},clearTimeout(){},console});
 await vm.runInContext(`(async()=>{${source}\n globalThis.appTest={openRoom,renderTray,controller};})()`,context);
 return{context,element,storage,local,events,windowEvents,frame:()=>frame(16),scrolledTo:()=>scrolledTo};
}

const original={position:movement.APPROACHES.food,direction:'up',scrollY:182};
const app=await boot(JSON.stringify(original));
assert.equal(app.element('.walker').dataset.x,String(original.position.x.toFixed(2)));
assert.equal(app.element('.walker').dataset.direction,'up');
assert.equal(app.storage.has(RETURN_KEY),false,'Return snapshot is consumed after loading');
app.frame();assert.equal(app.scrolledTo(),182);
for(const handler of app.events.get('click'))handler({target:{closest:()=>({dataset:{foodEntry:'fridge'}})}});
assert.deepEqual(JSON.parse(app.storage.get(RETURN_KEY)),{...original,scrollY:246});
assert.equal(app.local.get('gscene-food-v1'),'kitchen state','Navigation must not infer or change inventory');
app.windowEvents.get('pagehide')();
assert.equal(JSON.parse(app.storage.get(RETURN_KEY)).direction,'up');

// The room's Food link must keep native navigation and never dispatch floor movement.
const roomLink={dataset:{foodEntry:'room'},tagName:'A'};
let prevented=false;
const roomLinkClick={target:{closest(selector){return ['a[data-food-entry]','button,a[href]'].includes(selector)?roomLink:null;}},preventDefault(){prevented=true;}};
for(const handler of app.events.get('click'))handler(roomLinkClick);
app.element('.house-wrap').click(roomLinkClick);
app.frame();
assert.equal(prevented,false,'Food navigation must not be intercepted');
assert.equal(app.context.appTest.controller.objectId,null,'Food must not enter the fridge interaction sequence');
assert.equal(app.element('.walker').dataset.moving,'false','Food must not start floor movement');
assert.deepEqual(JSON.parse(app.storage.get(RETURN_KEY)),{...original,scrollY:246});

app.context.appTest.openRoom('food',null);
assert.match(app.element('#modal-root').innerHTML,/<a[^>]*href="\/food"[^>]*data-food-entry="pantry"/);
const controller=app.context.appTest.controller;
controller.dispatch({type:'CLOSE_MODAL'});
controller.dispatch({type:'REQUEST',intent:{type:'object',id:'fridge'},position:movement.START});
controller.dispatch({type:'ARRIVED',id:'fridge',epoch:controller.epoch,pathEmpty:true,position:movement.APPROACHES.food});
controller.tick(650);app.context.appTest.renderTray(true);
assert.match(app.element('#tray-root').innerHTML,/<a[^>]*href="\/food"[^>]*data-food-entry="fridge"/);
app.element('#reset').click();
assert.equal(app.storage.has(RETURN_KEY),false);
assert.equal(app.local.has('gscene-food-v1'),false);
assert.equal(app.element('.walker').dataset.direction,'down');

for(const invalid of ['{',JSON.stringify({position:{x:250,y:130},direction:'up',scrollY:300}),JSON.stringify({...original,direction:'diagonal'})]){
 const loaded=await boot(invalid);
 assert.equal(loaded.element('.walker').dataset.x,movement.START.x.toFixed(2));
 loaded.frame();assert.equal(loaded.scrolledTo(),null);
}
const blocked=await boot(undefined,true);blocked.windowEvents.get('pagehide')();blocked.element('#reset').click();
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(html,/<a[^>]*href="\/food"[^>]*data-food-entry="home"/);
assert.match(html,/<a[^>]*href="\/food"[^>]*data-food-entry="room"[^>]*class="room-target food"[^>]*aria-label="Food 내 주방으로 이동"><span>Food<\/span><\/a>/);
assert.doesNotMatch(html,/<button[^>]*class="room-target food"/);
console.log('PASS: direct Food navigation without movement, home/food anchors, validated position and scroll restoration, reset, and unavailable storage.');
