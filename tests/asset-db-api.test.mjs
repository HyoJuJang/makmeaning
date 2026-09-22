import test from 'node:test';
import assert from 'node:assert/strict';
import { assetDatabaseUrl, AssetApiError, mapAssetProduct, parseAssetFilters, parseResolveIds, publicAsset, validateResolveIds } from '../src/lib/asset-db/contracts.ts';
import { findAsset, findAssetProduct, listAssets, resolveAssets } from '../src/lib/asset-db/handlers.ts';
import { assetByIdQuery, assetListQueries, assetProductsQuery } from '../src/lib/asset-db/queries.ts';
const asset = { id:'shirt--white', familyId:'shirt', domain:'fashion', color:'white', pattern:'solid', label:'화이트 셔츠', version:'v1', status:'ready', url:'/assets/game-items/v1/fashion/shirt/white.png', width:100, height:100, frame:{x:10,y:5,width:80,height:90}, anchor:{x:.5,y:.98}, placement:'wardrobe', sha256:'a'.repeat(64) };
const ready = { prd_id:'00012',domain:'fashion',status:'ready',familyId:'shirt',assetId:asset.id,reasons:[],asset };
const pending = { prd_id:'20',domain:'fashion',status:'pending_generation',familyId:'shirt',assetId:null,reasons:['제작 대기'],asset:null };
const review = { prd_id:'30',domain:'fashion',status:'needs_review',familyId:'shirt',assetId:null,reasons:['외형 확인 필요'],asset:null };
const rows = [ready,pending,review];
const request = q => new Request(`https://example.test/api/game-assets${q ? '?'+q : ''}`);
const repo = () => ({
  async list(filters) { const filtered=rows.filter(p=>(!filters.domain||p.domain===filters.domain)&&(!filters.status||p.status===filters.status)); return {products:filtered.slice(filters.offset,filters.offset+filters.limit),pagination:{limit:filters.limit,offset:filters.offset,total:filtered.length}}; },
  async find(id) { return rows.find(p=>p.prd_id===id)??null; },
  async findMany(ids) { return ids.flatMap(id=>rows.filter(p=>p.prd_id===id)); },
  async findAsset(id) { return id===asset.id?asset:null; },
});
test('asset connection never falls back to product credentials', () => {
  assert.throws(()=>assetDatabaseUrl({DATABASE_URL:'postgres://product-secret',POSTGRES_URL:'postgres://other-secret'}),e=>e instanceof AssetApiError&&e.code==='ASSET_DATABASE_NOT_CONFIGURED');
  assert.equal(assetDatabaseUrl({ASSET_DATABASE_URL:' postgres://explicit-asset '}),'postgres://explicit-asset');
});
test('list preserves pagination and distinguishes unlinked statuses from unknown IDs', async () => {
  const response=await listAssets(request('domain=fashion&limit=1&offset=1'),repo);
  assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'no-store');
  const data=await response.json(); assert.deepEqual(data,{products:[pending],pagination:{limit:1,offset:1,total:3}});
  const beyond=await (await listAssets(request('limit=2&offset=99'),repo)).json();assert.deepEqual(beyond,{products:[],pagination:{limit:2,offset:99,total:3}});
  for (const p of [pending,review]) { const r=await findAssetProduct(p.prd_id,repo); assert.equal(r.status,200); assert.deepEqual((await r.json()).product,p); }
  assert.equal((await findAssetProduct('999',repo)).status,404);
  assert.equal((await findAsset('unknown',repo)).status,404);
  assert.deepEqual((await (await findAsset(asset.id,repo)).json()).asset,asset);
});
test('bulk resolution preserves exact strings, order and missing IDs', async () => {
  const response=await resolveAssets(request('ids=30,00012,999,20'),repo);
  assert.equal(response.status,200); assert.deepEqual(await response.json(),{products:[review,ready,pending],missingIds:['999']});
  assert.deepEqual(parseResolveIds(new URLSearchParams('ids=00012,12')),['00012','12']);
  assert.throws(()=>validateResolveIds(['12','12']));
});
test('bad queries fail before touching a repository', async () => {
  let called=0;const fail=()=>{called++;throw new Error('Must not connect');};
  for (const q of ['domain=car','status=missing','limit=0','limit=101','limit=1.5','offset=-1','offset=1000001','limit=2&limit=3','extra=x']) assert.equal((await listAssets(request(q),fail)).status,400,q);
  for (const q of ['','ids=','ids=12,12','ids=12,%2013','ids=1,,2','ids=1&ids=2','ids=1&status=ready','ids='+Array.from({length:51},(_,i)=>String(i)).join(',')]) assert.equal((await resolveAssets(request(q),fail)).status,400,q);
  for (const id of [' x','1 ','1/2','',"12' OR 1=1"]) assert.equal((await findAssetProduct(id,fail)).status,400);
  assert.equal((await findAsset('../x',fail)).status,400);assert.equal(called,0);
  assert.deepEqual(parseAssetFilters(new URLSearchParams()),{limit:24,offset:0});
});
test('safe 503 responses never disclose driver URLs, SQL or secrets', async () => {
  const secret='postgres://user:secret@private.host/internal';
  const bad=()=>{throw new Error(secret+' SELECT credentials');};
  for (const response of [await listAssets(request(),bad),await findAssetProduct('12',bad),await resolveAssets(request('ids=12'),bad),await findAsset('shirt--white',bad)]) {
    assert.equal(response.status,503);const body=await response.text();assert(!body.includes('secret'));assert(!body.includes('private.host'));assert(body.includes('ASSET_DATABASE_UNAVAILABLE'));
  }
  const missing=()=>{assetDatabaseUrl({});};
  assert.equal((await (await listAssets(request(),missing)).json()).error.code,'ASSET_DATABASE_NOT_CONFIGURED');
});
test('row decoder only permits consistent ready mappings and strips private asset fields', () => {
  const metadata={...asset,sourcePath:'/private/native.png',approvedProductIds:['12','99'],generationPrompt:'private prompt',refs:['private source'],notes:'internal'};
  assert.deepEqual(publicAsset(metadata),asset);
  const row={prd_id:'00012',domain:'fashion',status:'ready',family_id:'shirt',asset_id:asset.id,reasons:[],asset_metadata:metadata};
  assert.deepEqual(mapAssetProduct(row),ready);
  for (const changed of [{domain:'living'},{family_id:'pants'},{asset_id:'other'},{status:'pending_generation'},{asset_metadata:null},{reasons:[{}]}]) assert.throws(()=>mapAssetProduct({...row,...changed}));
  for (const changed of [{url:'https://example.com/a.png'},{url:'/assets/game-items/v1/living/shirt/a.png'},{frame:{x:90,y:0,width:20,height:30}},{anchor:{x:2,y:0}},{sha256:'bad'},{status:'pending_generation'}]) assert.throws(()=>publicAsset({...asset,...changed}));
});
test('queries are parameterized, stable and restricted to asset tables', () => {
  const q=assetListQueries({domain:'fashion',status:'ready',limit:10,offset:20});
  assert.deepEqual(q.page.values,['fashion','ready',10,20]);assert.deepEqual(q.count.values,['fashion','ready']);assert(q.page.text.includes('ORDER BY m.prd_id COLLATE "C"'));
  const injection="x' OR 1=1";const one=assetByIdQuery(injection);assert(!one.text.includes(injection));assert.deepEqual(one.values,[injection]);
  assert.deepEqual(assetProductsQuery(['0001','2']).values,[['0001','2']]);
  for (const query of [q.page,q.count,one,assetProductsQuery(['1'])]) {assert(!/public\.products\b/.test(query.text));assert(!/\b(INSERT|UPDATE|DELETE|DROP)\b/.test(query.text));}
});
