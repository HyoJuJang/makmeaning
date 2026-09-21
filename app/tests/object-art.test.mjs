import assert from 'node:assert/strict';
import {objectArt} from '../object-art.js';

const purchases = [
  {id:'knit',category:'fashion',roomSlot:'wardrobe-1',illustrationKey:'knit'},
  {id:'shirt',category:'fashion',roomSlot:'wardrobe-2',illustrationKey:'shirt'},
  {id:'milk',category:'food',roomSlot:'fridge-1',illustrationKey:'milk'},
  {id:'water',category:'food',roomSlot:'fridge-2',illustrationKey:'water'},
  {id:'vitamin',category:'food',roomSlot:'pantry-1',illustrationKey:'vitamin'}
];
const scene = objectArt({purchases,wardrobeOpen:1,fridgeOpen:1});
for (const p of purchases) {
  assert(scene.includes(`data-product="${p.id}" data-room-slot="${p.roomSlot}"`), `${p.id} must render in its API slot`);
}
assert(!objectArt().includes('data-product='), 'An empty API collection must not invent purchased objects');
const depleted = objectArt({purchases,foodQuantity:{milk:0,water:1,vitamin:0}});
assert(!depleted.includes('data-product="milk"'));
assert(!depleted.includes('data-product="vitamin"'));
assert(depleted.includes('data-product="water"'));
assert(!objectArt({purchases:purchases.filter(p=>p.id!=='knit')}).includes('data-product="knit"'));
assert(!objectArt({purchases:[{...purchases[2],roomSlot:'pantry-1'}]}).includes('data-product="milk"'), 'Wrong slot must not silently render in the fridge');
console.log('PASS: room objects follow purchased API items, room slots, and depleted food quantities.');

// Room/owned-rack/card source contract: real garment IDs share artwork, not identity.
const {demoHome}=await import('../../src/data/demo-home.ts');
const {initialDemoState,selectWardrobeProducts,applyOwnedOutfit}=await import('../demo-state.js');
const {garmentPresentation}=await import('../garment-art.js');
const {readFile}=await import('node:fs/promises');
const garments=demoHome.purchases.filter(p=>p.category==='fashion');
for(const confirmed of garments){
 const state=applyOwnedOutfit(demoHome,initialDemoState(demoHome),confirmed.id);
 const selected=selectWardrobeProducts(demoHome,state);
 const markup=objectArt({purchases:demoHome.purchases,wardrobeProducts:selected,wardrobeOpen:1});
 const garmentIds=[...markup.matchAll(/data-product="([^"]+)" data-room-slot="wardrobe-\d+"/g)].map(match=>match[1]);
 assert.deepEqual(garmentIds,selected.map(p=>p.id),'Room must preserve the Fashion selector order, including after apply');
 for(const purchase of selected){
  const visual=garmentPresentation(purchase);
  assert.equal(visual.source,purchase.imageUrl,'Owned cards/API and room use the exact same SVG URL');
  const node=markup.slice(markup.indexOf(`data-product="${purchase.id}"`),markup.indexOf('</g></g>',markup.indexOf(`data-product="${purchase.id}"`))+10);
  assert(node.includes(`data-garment-source="${visual.source}"`));
  assert(node.includes(`data-garment-number="${visual.number}"`),'Stable slot number distinguishes same-art possessions');
  const svg=await readFile(new URL('../../public'+visual.source,import.meta.url),'utf8');
  assert(svg.includes('viewBox="0 0 44 64"'),'Shared long-sleeve art has one aspect ratio');
 }
}
const duplicateArt=garments.filter(p=>p.illustrationKey==='knit').map(garmentPresentation);
assert.equal(duplicateArt[0].source,duplicateArt[1].source,'Generic art does not claim invented real product differences');
assert.notEqual(duplicateArt[0].number,duplicateArt[1].number);
assert.equal(garmentPresentation({illustrationKey:'knit',roomSlot:'fridge-1'}),null);
console.log('PASS: real wardrobe IDs/order share exact owned-card SVG sources and stable distinct garment numbers.');
