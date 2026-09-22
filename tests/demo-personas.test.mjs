import test from 'node:test';
import assert from 'node:assert/strict';
import {getPersonaSource,personaSourceFromRequest,demoPersonaChoices} from '../src/lib/demo-personas.ts';
import {resolveDemoHome,demoHomeResponse} from '../src/lib/demo-home.ts';
import {demoCatalogResponse} from '../src/lib/demo-catalog.ts';
import {getGameProduct} from '../src/lib/game-assets.ts';
import {getHeroProducts,getRoomMirrorProducts} from '../app/category-products.js';

const expected={
 'demo-f01':['1083830467','1124808739','1113830439','1113622242','1015281967','1134436378','1053232515','1057538146','16052422','1059856091'],
 'demo-f02':['1134622052','1105155685','1092856012','1050446036','1083510719','1033331215','1057182462','1056652878','1118407031','1088835047'],
 'demo-m01':['1128893597','1132775217','1111946338','1113622242','1033331215','1069125001','1056652878','1678991','1053067763','1059856091'],
 'demo-m02':['1108455723','1108216372','1111946338','1029143151','1131432801','1015281967','1000432412','1057182462','1032164641','1120723268'],
};
const repository={find:async id=>{
 const p=getGameProduct(id);return p?{prd_id:p.prd_id,view_name:'DB: '+p.view_name,domain:p.domain,discprice:12345,cate1_nm:p.cate1_nm,cate2_nm:p.cate2_nm,cate3_nm:p.cate3_nm,cate4_nm:p.cate4_nm,brand_name:p.brand_name}:null;
}};
const lookup=async ids=>ids.map(id=>{const p=getGameProduct(id);return {prd_id:id,domain:p.domain,status:p.assetStatus,familyId:p.familyId,assetId:p.assetId,reasons:p.reasons,asset:p.asset};});

test('the approved four purchase sets resolve exact IDs from the product source and reviewed assets',async()=>{
 const events=new Set();
 for(const choice of demoPersonaChoices){
  const source=getPersonaSource(choice.id),home=await resolveDemoHome(repository,lookup,source);
  assert.deepEqual(home.purchases.map(p=>p.id),expected[choice.id]);
  assert.equal(home.user.avatarId,choice.id.slice(5));assert.equal(home.personas.length,4);
  for(const [category,count] of Object.entries({fashion:3,food:3,living:2,beauty:2})){
   const collection=home.categories[category];assert.equal(collection.ownedProducts.length,count);
   assert.equal(collection.user.id,choice.id);
   assert.deepEqual(getRoomMirrorProducts(collection).map(x=>x.id),getHeroProducts(collection).map(x=>x.id));
  }
  for(const p of home.purchases){
   assert(!events.has(p.purchaseId));events.add(p.purchaseId);
   assert(p.name.startsWith('DB: '));assert.equal(p.price,12345);
   assert.equal(p.gameAsset.status,'ready');assert.equal(p.gameAsset.domain,p.category);
   if(p.category==='fashion')assert.equal(p.state.wearing,false,'A hanging sprite does not select an outfit');
  }
  for(const category of ['food','beauty']){
   const response=await demoCatalogResponse(category,()=>repository,lookup,source);
   assert.equal(response.status,200);assert.equal(response.headers.get('vary'),'Cookie');
   const data=await response.json();assert.equal(data.home.user.id,choice.id);
   assert.deepEqual(data.purchases.map(p=>p.productId),expected[choice.id].filter(id=>getGameProduct(id).domain===category));
  }
 }
 assert.equal(events.size,40);assert.equal(new Set(Object.values(expected).flat()).size,33);
});

test('only approved persona cookies select a source; malformed, duplicate and foreign cookies stay on default',()=>{
 const source=cookie=>personaSourceFromRequest(new Request('https://demo.example/api/demo/home',{headers:{cookie}}));
 assert.equal(personaSourceFromRequest().user.id,'demo-f01');
 for(const id of Object.keys(expected))assert.equal(source('other=value; gscene-persona='+id).user.id,id);
 for(const cookie of ['gscene-persona=unknown','gscene-persona=%','gscene-persona=demo-m01; gscene-persona=demo-f02','other=demo-m01'])assert.equal(source(cookie).user.id,'demo-f01');
 assert.throws(()=>getPersonaSource('any-user'));
 const changed=getPersonaSource('demo-f01');changed.categories.food[0].state.quantity=0;
 assert.equal(getPersonaSource('demo-f01').categories.food[0].state.quantity,3);
});

test('missing or wrong-category products fail honestly; an absent image stays unlinked',async()=>{
 const source=getPersonaSource('demo-f01');
 const failed=await demoHomeResponse(()=>({find:async()=>null}),lookup,source);
 assert.equal(failed.status,503);
 const home=await resolveDemoHome(repository,async()=>[],source);
 assert(home.purchases.every(p=>p.gameAsset===null));
 assert.deepEqual(home.purchases.map(p=>p.id),expected['demo-f01']);
});
