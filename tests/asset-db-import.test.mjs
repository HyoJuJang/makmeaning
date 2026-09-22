import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeAssetDataset, importQueries, parseAssetCli } from '../scripts/asset-db-data.mjs';
const asset={id:'shirt--white',familyId:'shirt',domain:'fashion',color:'white',pattern:'solid',label:'White shirt',version:'v1',status:'ready',url:'/assets/game-items/v1/fashion/shirt/white.png',width:100,height:100,frame:{x:0,y:0,width:100,height:100},anchor:{x:.5,y:.98},placement:'wardrobe',sha256:'a'.repeat(64),sourcePath:'private.png',approvedProductIds:['0001'],generationPrompt:'private'};
const product={prd_id:'0001',domain:'fashion',familyId:'shirt',assetStatus:'ready',assetId:asset.id,assetUrl:asset.url,reasons:[]};
const source=()=>({assets:[structuredClone(asset)],products:[structuredClone(product)]});
test('normalization retains string product IDs and only stores public asset metadata',()=>{
  const input=source(),snapshot=structuredClone(input),data=normalizeAssetDataset(input);assert.deepEqual(input,snapshot);
  assert.equal(data.products[0].prd_id,'0001');assert.deepEqual(data.statusCounts,{ready:1,pending_generation:0,needs_review:0});
  for(const key of ['sourcePath','approvedProductIds','generationPrompt']) assert.equal(data.assets[0][key],undefined);
});
test('duplicate, unknown, cross-domain/family and unready asset references are rejected before writes',()=>{
  for(const change of [s=>s.assets.push({...asset}),s=>s.products.push({...product}),s=>s.products[0].assetId='unknown',s=>s.products[0].domain='living',s=>s.products[0].familyId='pants',s=>s.products[0].prd_id=1,s=>s.products[0].assetStatus='pending_generation',s=>s.products[0].assetUrl='/wrong.png',s=>s.products[0].mappingStatus='needs_review',s=>s.summary={totalProducts:999,assetFiles:1,uniqueProductIds:1}]){const input=source();change(input);assert.throws(()=>normalizeAssetDataset(input));}
  const input=source();input.products[0]={...product,assetStatus:'needs_review',assetId:null,assetUrl:null,reasons:['ambiguous']};assert.equal(normalizeAssetDataset(input).products[0].asset_id,null);
});
test('CLI defaults to no writes and rejects contradictory or misspelled flags',()=>{
  assert.deepEqual(parseAssetCli([]),{apply:false,source:undefined});assert.equal(parseAssetCli(['--check']).apply,false);assert.equal(parseAssetCli(['--apply']).apply,true);
  assert.equal(parseAssetCli(['source.json','--check'],true).source,'source.json');
  for(const args of [['--apply','--check'],['--force'],['--apply','--apply'],['x.json'],['a','b']])assert.throws(()=>parseAssetCli(args));
});
test('import uses one advisory lock and parameterized idempotent upserts; never touches product catalog',()=>{
  const queries=importQueries(normalizeAssetDataset(source()),'b'.repeat(64));assert(queries[0].text.includes('pg_advisory_xact_lock'));
  assert.equal(queries.length,4);assert(queries[1].text.includes('ON CONFLICT (asset_id)'));assert(queries[2].text.includes('ON CONFLICT (prd_id)'));assert(queries[1].text.includes('IS DISTINCT FROM'));assert(queries[2].text.includes('IS DISTINCT FROM'));
  assert(!queries.some(q=>/public\.products\b|\bDELETE\b|\bDROP\b/.test(q.text)));assert(!queries[1].text.includes('shirt--white'));
  const serialized=queries.map(q=>JSON.stringify(q.values)).join('');assert(!serialized.includes('private'));assert(!serialized.includes('approvedProductIds'));
});
test('migration constrains mapping statuses and domain/family foreign keys only inside asset database',async()=>{
  const sql=await readFile(new URL('../db/asset-migrations/001_game_assets.sql',import.meta.url),'utf8');
  const statements=sql.replace(/^\s*--.*$/gm,'');assert(!/public\.products\b/.test(statements));assert(statements.includes('FOREIGN KEY (asset_id, domain, family_id) REFERENCES public.game_assets'));
  assert(statements.includes("status <> 'ready' AND asset_id IS NULL"));assert(statements.includes('prd_id TEXT PRIMARY KEY'));
});
