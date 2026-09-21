import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {avatarSVG} from '../avatar.js';
import {EATING_FRAMES} from '../eating-frames.js';

test('all four eating atlases have real PNG art, bounded crops, and planted feet',async()=>{
 for(const id of ['m01','m02','f01','f02']){
  const png=await readFile(new URL(`../assets/avatars/${id}-eating-states.png`,import.meta.url));
  assert.equal(png.subarray(1,4).toString(),'PNG');
  const frames=EATING_FRAMES[id];
  assert.equal(frames.length,3);
  for(const {box:[x,y,w,h],anchorX,shirtMask} of frames){
   assert.ok(x>=0&&y>=0&&x+w<=1536&&y+h<=1024);
   assert.ok(anchorX>0&&anchorX<w);
   assert.ok(shirtMask.length>0);
  }
  assert.ok(Math.max(...frames.map(f=>f.box[3]))-Math.min(...frames.map(f=>f.box[3]))<=1);
 }
});

test('eating swaps whole poses and returns to approved idle without changing outfit',()=>{
 for(const id of ['m01','m02','f01','f02'])for(const outfit of ['base','knit','shirt']){
  for(const [progress,state] of [[.2,'hold'],[.5,'sip'],[.8,'satisfied']]){
   const svg=avatarSVG(id,outfit,'right',0,{pose:'eat',progress,heldProductId:'milk'});
   assert.ok(svg.includes(`data-eating-state="${state}"`));
   assert.ok(svg.includes(`${id}-eating-states.png`));
   assert.equal(svg.includes('feColorMatrix'),outfit!=='base');
   assert.ok(!svg.includes('rotate(')&&!svg.includes('scale('));
  }
  const ended=avatarSVG(id,outfit,'right',0,{pose:'eat',progress:1});
  assert.ok(ended.includes(`${id}-states.png`));
  assert.ok(!ended.includes('-eating-states.png'));
 }
});

test('reduced motion holds one complete sip pose; outfit change never compresses the body',()=>{
 for(const progress of [0,.2,.5,.8,1]){
  const reduced=avatarSVG('m01','shirt','right',0,{pose:'eat',progress,reduced:true});
  assert.ok(reduced.includes('data-eating-state="sip"'));
  const change=avatarSVG('m01','shirt','down',0,{pose:'change-clothes',progress});
  assert.ok(!change.includes('scale('));
 }
});
