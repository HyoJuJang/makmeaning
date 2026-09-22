import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {avatarSVG} from '../avatar.js';
import {MEAL_FRAMES} from '../meal-frames.js';
import {foodConsumptionMode,foodActionLabel} from '../food-action.js';

test('all four rear-view atlases have real RGBA PNGs and bounded, anchored crops',async()=>{
 for(const id of ['m01','m02','f01','f02']){
  const png=await readFile(new URL(`../assets/avatars/${id}-meal-back.png`,import.meta.url));
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png[25],6,'Preserve generated RGBA, without opaque background');
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
  assert.equal(MEAL_FRAMES[id].length,4);
  for(const {box:[x,y,w,h],anchorX,shirtMask} of MEAL_FRAMES[id]){
   assert.ok(x>=0&&y>=0&&x+w<=width&&y+h<=height);
   assert.ok(anchorX>0&&anchorX<w);assert.ok(shirtMask.length>0);
  }
 }
});

test('food metadata selects a distinct bite or sip, even with a generic artwork key',()=>{
 const product=familyId=>({category:'food',illustrationKey:'food',gameAsset:{status:'ready',domain:'food',familyId}});
 for(const family of ['beverage_carton','beverage_bottle','beverage_pouch']){assert.equal(foodConsumptionMode(product(family)),'drink');assert.equal(foodActionLabel(product(family)),'마시기');}
 for(const family of ['food_jar','food_pouch','pasta_long_pouch'])assert.equal(foodConsumptionMode(product(family)),'eat');
 assert.equal(foodConsumptionMode({category:'food',illustrationKey:'water'}),'drink');
 assert.equal(foodConsumptionMode({category:'food',illustrationKey:'vitamin'}),'eat');
 assert.equal(foodConsumptionMode(null),'eat');
});

test('each identity preserves rear orientation and confirmed clothing across both actions',()=>{
 for(const id of ['m01','m02','f01','f02'])for(const outfit of ['base','knit','shirt','mapped:hoodie:gray:solid','mapped:tee_short:white:solid'])for(const mode of ['eat','drink']){
  for(const [progress,state] of [[.2,'hold'],[.5,mode==='drink'?'sip':'bite'],[.8,'satisfied']]){
   const svg=avatarSVG(id,outfit,'left',0,{pose:'eat',progress,consumptionMode:mode});
   assert.ok(svg.includes(`data-eating-state="${state}"`));assert.ok(svg.includes('data-meal-facing="back"'));
   assert.ok(svg.includes(`${id}-meal-back.png`));assert.equal(svg.includes('feColorMatrix'),outfit!=='base');
   assert.ok(!svg.includes('rotate(')&&!svg.includes('scale('),'No limb transforms or facing flips');
   if(progress===.5)assert.ok(svg.includes(`data-meal-frame="${mode==='drink'?3:1}"`),'Eat and drink use different drawn frames');
  }
  const ended=avatarSVG(id,outfit,'right',0,{pose:'eat',progress:1,consumptionMode:mode});
  assert.ok(ended.includes('data-sprite-frame="1"'),'Return to rear idle, without turning sideways');
  assert.ok(!ended.includes('-meal-back.png'));
 }
});

test('reduced motion holds the appropriate whole pose without losing selected action',()=>{
 for(const consumptionMode of ['eat','drink'])for(const progress of [0,.2,.5,.8,1]){
  const svg=avatarSVG('m01','shirt','up',0,{pose:'eat',progress,reduced:true,consumptionMode});
  assert.ok(svg.includes(`data-eating-state="${consumptionMode==='drink'?'sip':'bite'}"`));
 }
});
