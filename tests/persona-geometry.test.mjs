import test from 'node:test';
import assert from 'node:assert/strict';
import { getCategoryProducts, getHeroProducts, getRoomMirrorProducts } from '../app/category-products.js';
import { roomMirrorPlacement, placedMirrorProducts } from '../app/room-mirror.js';
import { livingHeroPlacement } from '../app/living-hero-placement.js';
import { objectArt } from '../app/object-art.js';
import { catalogRoomPlacement } from '../src/lib/catalog-room.ts';
import { readyGameAsset } from '../src/lib/game-product-display.ts';

const user={id:'geometry-persona',name:'데모',avatarId:'base'};
function product(id,category,presentationRole,displayOrder){
 return {id,purchaseId:`purchase-${id}`,category,presentationRole,displayOrder,
  name:`상품 ${id}`,price:10000,imageUrl:'/products/food.svg',gameAsset:readyGameAsset(id,category),
  roomSlot:`${presentationRole}-${displayOrder}`,purchasedAt:'2026-09-01',illustrationKey:'food',
  state:category==='food'?{quantity:2}:category==='fashion'?{wearing:false}:{},
  catalogSource:'shared-products',imageKind:'illustration',priceKind:'catalog-reference'};
}
const collection=(category,ownedProducts)=>({category,user,ownedProducts});
const separate=(a,b)=>a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y;
const asBox=art=>({x:art.x,y:art.y,w:art.width,h:art.height});

test('table and bed purchases retain identity, artwork and order through both room views',()=>{
 const purchases=[product('1057538146','living','table',1),product('1057182462','living','table',2),product('1678991','living','bed',3)];
 const owned=collection('living',purchases),before=JSON.stringify(owned);
 const category=getCategoryProducts(owned),hero=getHeroProducts(owned),room=getRoomMirrorProducts(owned);
 assert.deepEqual(room.map(p=>p.id),purchases.map(p=>p.id));
 assert.deepEqual(hero,category);assert.deepEqual(room,hero);
 assert.deepEqual(room.map(p=>p.presentationRole),['table','table','bed']);
 assert(room.every(p=>p.product.gameAsset?.status==='ready'));
 const placements=room.map(p=>roomMirrorPlacement(p,room));
 assert(placements[0].y>330&&placements[1].y>330,'Mug and plant stay on the coffee table');
 assert(placements[2].y<220,'The rectangular pillow belongs on the main-room bed');
 assert(separate(placements[0],placements[1]),'Multiple table objects get separate surface cells');
 const art=placedMirrorProducts(room);
 for(const entry of room)assert(art.includes(`data-product-image="${entry.id}"`));
 assert.equal(placedMirrorProducts([]),'','Background decor cannot invent an owned product');
 assert.equal(JSON.stringify(owned),before);
 const heroPillow=livingHeroPlacement(hero[2],hero);
 assert(Number.parseFloat(heroPillow.art.width)*3>Number.parseFloat(heroPillow.art.height),'The pillow remains horizontal in the living close-up');
});

test('table and floor lamps have different supported sizes without changing their purchase',()=>{
 const table=product('1053232515','living','lamp',1),floor=product('1056652878','living','lamp',2);
 for(const p of [table,floor])assert.equal(p.gameAsset?.status,'ready');
 const entries=getHeroProducts(collection('living',[table,floor]));
 assert(roomMirrorPlacement(entries[1],entries).h>roomMirrorPlacement(entries[0],entries).h*2);
 assert(Number.parseFloat(livingHeroPlacement(entries[1],entries).art.height)>Number.parseFloat(livingHeroPlacement(entries[0],entries).art.height)*2);
 assert.deepEqual(entries.map(p=>p.id),[table.id,floor.id]);
});

test('two pantry goods fit separate shelf cells and depletion never moves another purchase',()=>{
 const food=collection('food',[product('1113622242','food','fridge',1),product('1015281967','food','pantry',2),product('1134436378','food','pantry',3)]);
 const before=JSON.stringify(food),entries=getRoomMirrorProducts(food),pantry=entries.filter(p=>p.presentationRole==='pantry');
 for(const placement of [entry=>roomMirrorPlacement(entry,entries),entry=>asBox(catalogRoomPlacement(entry,entries).art)]){
  const boxes=pantry.map(placement);
  assert(separate(...boxes));assert(boxes.every(box=>box.w>=20&&box.h>=22));
 }
 const next=getRoomMirrorProducts(food,{userId:user.id,foodQuantity:{[pantry[0].id]:0}});
 assert.deepEqual(next.map(p=>p.id),entries.map(p=>p.id));
 next.forEach((entry,i)=>assert.deepEqual(roomMirrorPlacement(entry,next),roomMirrorPlacement(entries[i],entries)));
 const markup=objectArt({mirrorProducts:next,fridgeOpen:1});
 assert(!markup.includes(`data-product-image="${pantry[0].id}"`));
 assert(markup.includes(`data-room-mirror-product-id="${pantry[0].id}"`));
 assert(markup.includes(`data-product-image="${pantry[1].id}"`));
 assert.equal(JSON.stringify(food),before);
});

test('the full pantry representative limit stays inside two shelves in both layouts',()=>{
 const goods=Array.from({length:6},(_,i)=>({...product('1015281967','food','pantry',i+1),id:`pantry-${i}`}));
 const entries=getRoomMirrorProducts(collection('food',goods));
 assert.equal(entries.length,6);
 const main=entries.map(entry=>roomMirrorPlacement(entry,entries));
 const hero=entries.map(entry=>asBox(catalogRoomPlacement(entry,entries).art));
 assert(main.every(b=>b.x>=306&&b.x+b.w<=354&&b.y>=85&&b.y+b.h<=143));
 assert(hero.every(b=>b.x>=320&&b.x+b.w<=370&&b.y>=32&&b.y+b.h<=86));
 for(const boxes of [main,hero])boxes.forEach((box,i)=>boxes.slice(i+1).forEach(other=>assert(separate(box,other))));
});

test('cardigan, hoodie and tee assets all render as owned garments without a wearing claim',()=>{
 const goods=[product('1134622052','fashion','wardrobe',1),product('1092856012','fashion','wardrobe',2),product('1111946338','fashion','wardrobe',3)];
 const owned=collection('fashion',goods),before=JSON.stringify(owned),entries=getRoomMirrorProducts(owned);
 const markup=objectArt({mirrorProducts:entries,wardrobeOpen:1});
 assert.deepEqual(entries.map(p=>p.id),goods.map(p=>p.id));
 for(const entry of entries){
  assert.equal(entry.status,'owned');assert.equal(entry.product.gameAsset.status,'ready');
  assert(markup.includes(`data-product-image="${entry.id}"`));
 }
 assert.equal(JSON.stringify(owned),before);
});
