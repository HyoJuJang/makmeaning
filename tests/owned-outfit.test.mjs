import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import {getOutfitAppearance,getOwnedOutfitAppearance} from '../app/outfit-rendering.js';
import {initialDemoState,applyOwnedOutfit,normalizeDemoState,outfitArtKey,saveDemoState,readDemoState} from '../app/demo-state.js';
import {avatarSVG} from '../app/avatar.js';
const source=JSON.parse(fs.readFileSync(new URL('../data/demo-persona-purchases.json',import.meta.url)));
const assets=JSON.parse(fs.readFileSync(new URL('../data/game-assets/manifest.json',import.meta.url))).assets;
const homes=source.personas.map(p=>({user:{id:p.id,avatarId:p.avatarLabel.toLowerCase()},purchases:p.purchases.filter(x=>x.category==='fashion').map(x=>({id:x.productId,category:'fashion',imageKind:'product-photo',illustrationKey:'shirt',state:{wearing:false},gameAsset:assets.find(a=>a.id===x.assetId)}))}));
// Reviewed directly against https://asset.m-gs.kr/prod/<productId>/1/550.
// The shared tee occurs in both male wardrobes: 11 products, 12 owned entries.
const reviewed=new Map([
 ['1083830467',['shirt','white','#f2f1ef']],['1124808739',['cardigan-round','light_blue','#b8c9dc']],['1113830439',['sweatshirt','ivory','#e7e4d7']],
 ['1134622052',['cardigan-round','burgundy','#632e39']],['1105155685',['cardigan-collared','green','#328064']],['1092856012',['hoodie','gray','#b8bab9']],
 ['1128893597',['cardigan-v','navy','#242632']],['1132775217',['sweatshirt','gray','#b8bab9']],['1111946338',['tee-short','white','#f2f1ef']],
 ['1108455723',['cardigan-v','blue','#294466']],['1108216372',['cardigan-zip','black','#25262f']],
]);
function storage(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}
test('verified photo metadata supports distinct garment appearances and exact owned IDs for every persona',()=>{
 assert.equal(homes.flatMap(h=>h.purchases).length,12);
 for(const home of homes){const usable=home.purchases.filter(p=>getOutfitAppearance(p));assert.equal(usable.length,3,home.user.id);
  for(const p of usable){const store=storage(),before=initialDemoState(home),applied=applyOwnedOutfit(home,before,p.id);
   const appearance=getOutfitAppearance(p);assert.deepEqual([appearance.style,appearance.color,appearance.hex],reviewed.get(p.id),p.id);
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
 for(const p of homes.flatMap(h=>h.purchases).filter(p=>['hoodie','tee_short','cardigan_unspecified'].includes(p.gameAsset.familyId))){
  assert.equal(getOutfitAppearance({...p,gameAsset:{...p.gameAsset,id:'unreviewed-variant'}}),null);
  assert.equal(getOutfitAppearance({...p,gameAsset:{...p.gameAsset,color:'red'}}),null);
 }
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

test('all twelve confirmed appearances restore after a temporary metadata outage',()=>{
 for(const home of homes)for(const p of home.purchases){
  const confirmed=applyOwnedOutfit(home,initialDemoState(home),p.id);
  const missing={...home,purchases:home.purchases.map(x=>({...x,gameAsset:null}))};
  const restored=normalizeDemoState(missing,confirmed);
  assert.equal(restored.outfitId,p.id);assert.equal(outfitArtKey(missing,restored),getOutfitAppearance(p).key);
 }
});

test('tee, hoodie and trimmed cardigan retain their construction in action poses',()=>{
 const newItems=homes.flatMap(h=>h.purchases).filter(p=>['1111946338','1092856012','1105155685'].includes(p.id));
 const poses=[['idle',{}],['browse',{}],['change-clothes',{}],['eat',{}],['seated-idle',{objectId:'sofa',seatProgress:1}],['seated-idle',{objectId:'vanity',seatProgress:1}],['use-cosmetic',{objectId:'vanity',seatProgress:1}],['lying-idle',{bedProgress:1}]];
 for(const p of newItems)for(const id of ['m01','m02','f01','f02'])for(const direction of ['down','up','left','right'])for(const [pose,options] of poses){
  const appearance=getOutfitAppearance(p),svg=avatarSVG(id,appearance.key,direction,1,{pose,progress:.5,...options});
  assert(svg.includes(`data-garment-detail="${appearance.style}"`));assert(svg.includes(`data-garment-color="${appearance.hex}"`));
  if(p.id==='1111946338'){assert(svg.includes('data-short-sleeves="true"'));assert(!svg.includes('<circle'));}
  if(p.id==='1092856012'){assert(svg.includes('data-hood='));assert(!svg.includes('<circle'));}
  if(p.id==='1105155685')assert(svg.includes('#eeeede'));
 }
});

const pngCache=new Map();
async function raster(id,key,direction='down',frame=0){
 let svg=avatarSVG(id,key,direction,frame);
 for(const [,href] of [...svg.matchAll(/href="([^"]+)"/g)]){
  if(!pngCache.has(href))pngCache.set(href,`data:image/png;base64,${fs.readFileSync(new URL(`../app${href}`,import.meta.url)).toString('base64')}`);
  svg=svg.replaceAll(href,pngCache.get(href));
 }
 return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="195" viewBox="0 0 40 65">${svg}</svg>`)).ensureAlpha().raw().toBuffer();
}

test('rendered owned colors change the cloth while walking leaves hair and trousers intact',async()=>{
 for(const home of homes)for(const p of home.purchases){
  const id=home.user.avatarId,appearance=getOutfitAppearance(p),target=appearance.hex.match(/\w\w/g).map(x=>parseInt(x,16));
  for(const frame of [0,1]){
   const [base,colored]=await Promise.all([raster(id,'base','down',frame),raster(id,appearance.key,'down',frame)]);
   let clothPixels=0,changed=0;
   for(let pixel=0;pixel<120*195;pixel++){
    const i=pixel*4,y=Math.floor(pixel/120),diff=colored.subarray(i,i+4).some((v,n)=>v!==base[i+n]);
    if(y<66||y>=145)assert(!diff,`${id} ${p.id} frame ${frame} tinted outside clothing at y=${y}`);
    if(y>=69&&y<132&&colored[i+3]>230&&target.every((v,n)=>Math.abs(v-colored[i+n])<24))clothPixels++;
    if(diff)changed++;
   }
   assert(clothPixels>100,`${p.id} ${frame} loses its photographed base color`);
   assert(changed>100,`${p.id} ${frame} did not visually apply`);
  }
 }
});

test('white tee visibly exposes forearms in every walking direction for both owners',async()=>{
 const skin=(buf,i)=>buf[i]>220&&buf[i+1]>170&&buf[i+1]<215&&buf[i+2]>130&&buf[i+2]<190&&buf[i+3]>230;
 for(const id of ['m01','m02'])for(const direction of ['down','up','left','right'])for(const frame of [0,1]){
  const [shirt,tee]=await Promise.all([raster(id,'mapped:shirt:white:solid',direction,frame),raster(id,'mapped:tee_short:white:solid',direction,frame)]);
  let exposed=0;
  for(let pixel=120*78;pixel<120*137;pixel++)if(skin(tee,pixel*4)&&!skin(shirt,pixel*4))exposed++;
  assert(exposed>40,`${id} ${direction} frame ${frame} still appears long-sleeved`);
 }
});
