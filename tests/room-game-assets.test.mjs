import test from 'node:test';
import assert from 'node:assert/strict';
import {remoteAssetLookup} from '../src/lib/remote-game-assets.ts';
import {resolveDemoHome,demoHomeResponse} from '../src/lib/demo-home.ts';
import {demoHome} from '../src/data/demo-home.ts';
import {getDemoPersona} from '../src/data/demo-personas.ts';
import {readyGameAsset} from '../src/lib/game-product-display.ts';
import {gameItemArt} from '../app/game-item-art.js';
import {roomMirrorPlacement} from '../app/room-mirror.js';
import {objectArt} from '../app/object-art.js';
import {getRoomMirrorProducts} from '../app/category-products.js';
const shirtId='1083830467';
const asset=readyGameAsset(shirtId,'fashion');
const origin='https://store.public.blob.vercel-storage.com';
const mapping={prd_id:shirtId,domain:'fashion',status:'ready',familyId:asset.familyId,assetId:asset.id,reasons:[],asset:{...asset,url:origin+asset.url}};
const rows=getDemoPersona().purchases.map(p=>({prd_id:p.id,domain:p.category,view_name:`DB ${p.id}`,discprice:12345,cate1_nm:null,cate2_nm:null,cate3_nm:null,cate4_nm:null,brand_name:null}));
const repo={find:async id=>rows.find(p=>p.prd_id===id)||null};
test('room resolves owned IDs once and preserves product source and unknown artwork',async()=>{
 let calls=0;
 const home=await resolveDemoHome(repo,undefined,async ids=>{calls++;assert.deepEqual(ids,rows.map(p=>p.prd_id));return [mapping]});
 assert.equal(calls,1);assert.equal(home.purchases.length,10);
 for(const p of home.purchases){assert.equal(p.name,rows.find(r=>r.prd_id===p.id).view_name);assert.equal(p.gameAsset?.id??null,p.id===shirtId?asset.id:null);}
 assert.deepEqual(home.categories.fashion.ownedProducts,home.purchases.filter(p=>p.category==='fashion'));
 assert(gameItemArt(home.purchases.find(p=>p.id===shirtId)).includes(origin));
 const failed=await demoHomeResponse(()=>repo,undefined,async()=>{throw Error('postgres://private:secret@host')});
 assert.equal(failed.status,503);assert(!(await failed.text()).includes('secret'));
});
test('remote service response is bounded by requested IDs, domain and safe image geometry',async()=>{
 const response=(products)=>async(url,options)=>{assert.equal(new URL(url).pathname,'/api/game-assets/resolve');assert.equal(options.cache,'no-store');return Response.json({products,missingIds:[]})};
 const result=await remoteAssetLookup('https://assets.example',response([mapping]))([shirtId]);
 assert.equal(result[0].asset.url,origin+asset.url);assert.equal(result[0].asset.sourcePath,undefined);
 for(const products of [[mapping,mapping],[{...mapping,prd_id:'999'}],[{...mapping,domain:'living'}],[{...mapping,asset:{...mapping.asset,url:'https://evil.example/x.png'}}],[{...mapping,asset:{...mapping.asset,url:origin+asset.url+'?secret=1'}}]]){
  await assert.rejects(remoteAssetLookup('https://assets.example',response(products))([shirtId]));
 }
 for(const url of ['http://assets.example','https://user:pass@host.example','https://host.example/path'])assert.throws(()=>remoteAssetLookup(url));
});
test('new reviewed garment shapes do not depend on the old knit/shirt aliases',()=>{
 const skirt={...demoHome.categories.fashion.ownedProducts[0],id:'1117990964',illustrationKey:'skirt',gameAsset:readyGameAsset('1117990964','fashion')};
 const entries=getRoomMirrorProducts({...demoHome.categories.fashion,ownedProducts:[skirt]});
 assert(objectArt({mirrorProducts:entries,wardrobeOpen:1}).includes(`data-game-asset="${skirt.gameAsset.id}"`));
});
test('floor-lamp geometry differs from generic lamps without changing identity',()=>{
 const product={...demoHome.categories.living.ownedProducts.find(p=>p.illustrationKey==='lamp'),gameAsset:readyGameAsset('1056652878','living')};
 const entry=getRoomMirrorProducts({...demoHome.categories.living,ownedProducts:[product]})[0];
 const floor=roomMirrorPlacement(entry,[entry]);
 const fallback=roomMirrorPlacement({...entry,product:{...product,gameAsset:null}},[entry]);
 assert(floor.h>fallback.h*2);assert(floor.x<fallback.x);assert.equal(entry.productId,product.id);
});
