import test from 'node:test';
import assert from 'node:assert/strict';
import { commerceProductsResponse } from '../src/lib/commerce-products.ts';
const request = query => new Request(`https://example.test/api/demo/products?${query}`);
const product = (prd_id, domain = 'fashion') => ({prd_id, domain, view_name:`실제 상품 ${prd_id}`, discprice:12900, cate1_nm:'의류', cate2_nm:'상의', cate3_nm:'티셔츠', cate4_nm:null,brand_name:'브랜드'});
const data = [product('123'),product('456'),product('789','food')];
const factory = () => ({find:async id=>data.find(row=>row.prd_id===id)??null});
test('cart hydration resolves exact IDs, prices and source photos without asserting ownership',async()=>{
 const response=await commerceProductsResponse(request('category=fashion&ids=456,123,456,789,999'),factory);
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 const {products}=await response.json();assert.deepEqual(products.map(p=>p.id),['456','123']);
 for(const p of products){assert.equal(p.id,p.prd_id);assert.equal(p.price,12900);assert.equal(p.imageUrl,`https://asset.m-gs.kr/prod/${p.id}/1/550`);assert.equal(p.catalogSource,'shared-products');assert.equal(p.gameAsset,null);assert.equal(p.purchasedAt,undefined);assert.equal(p.state,undefined);}
});
test('sample/invalid IDs and excess batches cannot query the shared catalog',async()=>{
 for(const q of ['category=fashion&ids=fashion-loafers','category=food&ids=12,','category=bad&ids=123','category=fashion&category=food&ids=123','category=fashion&ids=123&extra=x',`category=fashion&ids=${Array(51).fill('123').join(',')}`]){
  const r=await commerceProductsResponse(request(q),()=>{throw Error('must not query');});assert.equal(r.status,400,q);
 }
 assert.equal((await commerceProductsResponse(request('category=food&ids='),()=>{throw Error('must not query');})).status,200);
});
test('asset failure does not remove the real product and database failures stay safe',async()=>{
 const r=await commerceProductsResponse(request('category=fashion&ids=123'),factory,async()=>{throw Error('private artwork secret');});
 assert.equal((await r.json()).products[0].prd_id,'123');
 const failure=await commerceProductsResponse(request('category=fashion&ids=123'),()=>({find:async()=>{throw Error('postgres private secret');}}));
 assert.equal(failure.status,503);assert.doesNotMatch(await failure.text(),/postgres|private|secret/);
});
test('assets must match exact product and category metadata',async()=>{
 const asset={id:'a',familyId:'tee',domain:'fashion',status:'ready',url:'https://example.test/a.png'};
 const mapping={prd_id:'123',domain:'fashion',status:'ready',assetId:'a',familyId:'tee',asset};
 const good=await commerceProductsResponse(request('category=fashion&ids=123'),factory,async()=>[mapping]);assert.deepEqual((await good.json()).products[0].gameAsset,asset);
 const bad=await commerceProductsResponse(request('category=fashion&ids=123'),factory,async()=>[{...mapping,domain:'food'}]);assert.equal((await bad.json()).products[0].gameAsset,null);
});
