import test from 'node:test';
import assert from 'node:assert/strict';
import { assetBaseOrigin, assetWithBaseUrl, mappingWithBaseUrl } from '../src/lib/asset-db/image-origin.ts';
import { publicAsset } from '../src/lib/asset-db/contracts.ts';
const origin='https://store-a123.public.blob.vercel-storage.com';
const asset={id:'shirt--white',familyId:'shirt',domain:'fashion',color:'white',pattern:'solid',label:'화이트 셔츠',version:'v1',status:'ready',url:'/assets/game-items/v1/fashion/shirt/white.png',width:100,height:100,frame:{x:0,y:0,width:100,height:100},anchor:{x:.5,y:.98},placement:'wardrobe',sha256:'a'.repeat(64)};
test('optional Blob origin rewrites only the returned URL and never stored metadata',()=>{
  const snapshot=structuredClone(asset),rewritten=assetWithBaseUrl(asset,origin+'/');
  assert.equal(rewritten.url,origin+asset.url);assert.deepEqual(asset,snapshot);assert.notEqual(rewritten,asset);
  assert.deepEqual(assetWithBaseUrl(asset),asset);assert.equal(assetBaseOrigin(''),undefined);
  assert.throws(()=>publicAsset(rewritten),'DB validator must continue to require local relative paths');
  assert.deepEqual(publicAsset(asset),asset);
});
test('reject non-Blob origins, private stores, credentials, paths, ports, queries and fragments safely',()=>{
  for(const value of ['http://store.public.blob.vercel-storage.com','https://evil.test','https://store.private.blob.vercel-storage.com','https://store.public.blob.vercel-storage.com.evil.test','https://extra.store.public.blob.vercel-storage.com','https://user:secret@store.public.blob.vercel-storage.com',origin+'/assets',origin+'?token=secret',origin+'#secret',origin+'?',origin+'#','https://@store.public.blob.vercel-storage.com',origin+':8443',origin+'\\assets','https://\tstore.public.blob.vercel-storage.com','not a URL']){
    assert.throws(()=>assetBaseOrigin(value),e=>e.code==='ASSET_IMAGE_ORIGIN_INVALID'&&e.status===503&&!e.message.includes('secret'),value);
  }
});
test('mapping rewrites preserve identity, ready/unlinked statuses and reasons',()=>{
  const mapping={prd_id:'00012',domain:'fashion',status:'ready',familyId:'shirt',assetId:asset.id,reasons:[],asset};
  const result=mappingWithBaseUrl(mapping,origin);assert.equal(result.prd_id,'00012');assert.equal(result.assetId,asset.id);assert.equal(result.asset.url,origin+asset.url);assert.equal(mapping.asset.url,asset.url);
  for(const status of ['needs_review','pending_generation']){const unlinked={...mapping,status,assetId:null,reasons:['확인 필요'],asset:null};assert.deepEqual(mappingWithBaseUrl(unlinked,origin),unlinked);}
});
