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
