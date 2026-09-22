import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {getOutfitAppearance,getOwnedOutfitAppearance} from '../app/outfit-rendering.js';
import {initialDemoState,applyOwnedOutfit,normalizeDemoState,outfitArtKey,saveDemoState,readDemoState} from '../app/demo-state.js';
import {avatarSVG} from '../app/avatar.js';
const source=JSON.parse(fs.readFileSync(new URL('../data/demo-persona-purchases.json',import.meta.url)));
const assets=JSON.parse(fs.readFileSync(new URL('../data/game-assets/manifest.json',import.meta.url))).assets;
const homes=source.personas.map(p=>({user:{id:p.id,avatarId:p.avatarLabel.toLowerCase()},purchases:p.purchases.filter(x=>x.category==='fashion').map(x=>({id:x.productId,category:'fashion',imageKind:'product-photo',illustrationKey:'shirt',state:{wearing:false},gameAsset:assets.find(a=>a.id===x.assetId)}))}));
function storage(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}
test('verified photo metadata supports distinct garment appearances and exact owned IDs for every persona',()=>{
 for(const home of homes){const usable=home.purchases.filter(p=>getOutfitAppearance(p));assert(usable.length>0,home.user.id);
  for(const p of usable){const store=storage(),before=initialDemoState(home),applied=applyOwnedOutfit(home,before,p.id);
   assert.equal(applied.outfitId,p.id);assert.equal(applied.outfitAppearance.productId,p.id);assert.equal(outfitArtKey(home,applied),getOutfitAppearance(p).key);
   assert(saveDemoState(home,applied,store));assert.deepEqual(readDemoState(home,store),applied);assert.equal(before.outfitId,'base');
  }
 }
 const f01=homes.find(h=>h.user.id==='demo-f01');assert.equal(new Set(f01.purchases.map(p=>getOutfitAppearance(p).key)).size,3);
});
test('cart, foreign IDs, unsupported family/pattern and stale photo aliases cannot apply',()=>{
 for(const home of homes){const current=initialDemoState(home);assert.equal(getOwnedOutfitAppearance(home,'cart-only'),null);assert.deepEqual(applyOwnedOutfit(home,current,'cart-only'),current);
  const foreign=homes.flatMap(h=>h.purchases).find(p=>!home.purchases.some(x=>x.id===p.id));assert.deepEqual(applyOwnedOutfit(home,current,foreign.id),current);
  for(const p of home.purchases.filter(p=>!getOutfitAppearance(p)))assert.deepEqual(applyOwnedOutfit(home,current,p.id),current);
  assert.equal(normalizeDemoState(home,{...current,outfitId:'shirt'}).outfitId,'base');
 }
 const p=homes[0].purchases[0];assert.equal(getOutfitAppearance({...p,gameAsset:null}),null);assert.equal(getOutfitAppearance({...p,gameAsset:{...p.gameAsset,pattern:'stripe'}}),null);
 assert.equal(getOutfitAppearance({...p,gameAsset:{...p.gameAsset,status:'needs_review'}}),null);
});
test('confirmed mapped appearance survives temporary missing metadata, not explicit unsupported metadata or another buyer',()=>{
 const home=homes[0],p=home.purchases[0],confirmed=applyOwnedOutfit(home,initialDemoState(home),p.id);
 const missing={...home,purchases:home.purchases.map(x=>({...x,gameAsset:null}))};
 const restored=normalizeDemoState(missing,confirmed);assert.equal(restored.outfitId,p.id);assert.equal(outfitArtKey(missing,restored),outfitArtKey(home,confirmed));
 const bad={...home,purchases:home.purchases.map(x=>({...x,gameAsset:{...x.gameAsset,familyId:'dress'}}))};assert.equal(normalizeDemoState(bad,confirmed).outfitId,'base');
 assert.equal(normalizeDemoState(homes[1],confirmed).outfitId,'base');
 assert.equal(normalizeDemoState(missing,{...confirmed,outfitAppearance:{productId:p.id,key:'shirt'}}).outfitId,'base');
});
test('all avatar poses and directions retain supported key and render masked color without invalid geometry',()=>{
 const keys=[...new Set(homes.flatMap(h=>h.purchases.map(p=>getOutfitAppearance(p)?.key).filter(Boolean)))];
 const poses=[['idle',{}],['reach',{objectId:'lamp'}],['browse',{}],['change-clothes',{}],['seated-idle',{objectId:'sofa',seatProgress:1}],['seated-idle',{objectId:'vanity',seatProgress:1}],['use-cosmetic',{objectId:'vanity',seatProgress:1}],['eat',{}],['lying-idle',{bedProgress:1}]];
 for(const id of ['m01','m02','f01','f02'])for(const key of keys)for(const direction of ['up','down','left','right'])for(const [pose,options] of poses){const svg=avatarSVG(id,key,direction,1,{pose,progress:.5,...options});assert(svg.includes(`data-outfit-key="${key}"`));assert(svg.includes('feColorMatrix'));assert.doesNotMatch(svg,/NaN|undefined/);}
 assert.notEqual(avatarSVG('f01',keys[0]),avatarSVG('f01',keys[1]));assert.match(avatarSVG('f01','mapped:unknown:red:solid'),/data-outfit-key="base"/);
});

test('malformed persisted appearance keys cannot throw or restore prototype properties',()=>{
 const home=homes[0],p=home.purchases[0],missing={...home,purchases:home.purchases.map(x=>({...x,gameAsset:null}))};
 for(const key of [42,{},[],null,'__proto__','constructor']){const state=normalizeDemoState(missing,{outfitId:p.id,outfitAppearance:{productId:p.id,key}});assert.equal(state.outfitId,'base');assert.equal(outfitArtKey(missing,state),'base');}
 assert.equal(getOutfitAppearance({...p,imageKind:'illustration',gameAsset:null,illustrationKey:'__proto__'}),null);
 assert.equal(getOutfitAppearance({...p,gameAsset:{...p.gameAsset,familyId:'__proto__'}}),null);
});
