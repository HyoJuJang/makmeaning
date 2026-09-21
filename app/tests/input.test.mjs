import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as movement from '../movement.js';
import * as avatars from '../avatar.js';
import * as scenes from '../scene-entry.js';
import * as interactions from '../interactions.js';
import * as objects from '../object-art.js';
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
    contains(other){return other===this;}
  };
  elements.set(name,e);return e;
}
const document={hidden:false,body:element('body'),activeElement:null,
  querySelector:element,querySelectorAll(){return [];},
  addEventListener(type,fn){if(!documentEvents.has(type))documentEvents.set(type,[]);documentEvents.get(type).push(fn);}
};
document.activeElement=element('.house-wrap');
let fetchCount=0;
const apiHome=structuredClone(demoHome);
apiHome.user.name='API 민서';
const fetchHome=async(url,options)=>{
  assert.equal(url,'/api/demo/home');assert.equal(options.cache,'no-store');fetchCount++;
  return {ok:true,json:async()=>structuredClone(apiHome)};
};
const context=vm.createContext({
  ...movement,...avatars,...scenes,...interactions,...objects,document,
  window:{addEventListener(type,fn){windowEvents.set(type,fn);}},
  localStorage:{getItem(){return null;},setItem(){}},
  matchMedia(){return{matches:false};},
  requestAnimationFrame(fn){frameCallback=fn;},
  fetch:fetchHome,AbortController,clearTimeout(){},setTimeout(){},console
});
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'');
const bootstrap=vm.runInContext(`(async()=>{${source}\n globalThis.appTest={loadHome,renderProductsFor(category){active=category;renderProducts();active=null;}};})()`,context);
assert.equal(element('#app').dataset.homeState,'loading');
await bootstrap;
assert.equal(fetchCount,1);
assert.equal(element('#app').dataset.homeState,'ready');
assert(element('h1').innerHTML.includes('API 민서'),'The visible user must come from the API');
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
