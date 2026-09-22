import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assetServicePackage, prepareAssetApiService, validateAssetServiceLock } from '../scripts/prepare-asset-api-service.mjs';

test('standalone source includes only asset API dependencies and preserves operator files', async t => {
  const target=await mkdtemp(path.join(tmpdir(),'asset-api-service-'));t.after(()=>rm(target,{recursive:true,force:true}));
  const report=await prepareAssetApiService({output:target});assert.equal(report.temporaryDependencyLink,false);assert(report.totalSourceBytes<100000);
  const marker=JSON.parse(await readFile(path.join(target,'.asset-api-service.json'),'utf8'));
  assert(marker.copiedFiles.every(file=>file.path.startsWith('app/api/game-assets/')||file.path.startsWith('src/lib/asset-db/')||file.path==='src/lib/game-asset-types.ts'));
  assert(!marker.copiedFiles.some(file=>/generated|products|\.png|\.env|csv/.test(file.path.replace('app/api/game-assets/products/',''))));
  const manifest=JSON.parse(await readFile(path.join(target,'package.json'),'utf8'));
  const lock=await readFile(path.join(target,'package-lock.json'),'utf8');
  assert.equal(lock,await readFile(new URL('../services/asset-api/package-lock.json',import.meta.url),'utf8'));
  validateAssetServiceLock(JSON.parse(lock),manifest);
  assert.match(report.dependencyLockSha256,/^[a-f0-9]{64}$/);
  const dependencies=manifest.dependencies;
  assert.equal(dependencies.next,'16.3.5');assert.equal(dependencies['@neondatabase/serverless'],'1.1.0');
  await mkdir(path.join(target,'.vercel'));await writeFile(path.join(target,'.vercel/project.json'),'operator-project');await writeFile(path.join(target,'.env.local'),'operator-secret');
  await prepareAssetApiService({output:target});
  assert.equal(await readFile(path.join(target,'.vercel/project.json'),'utf8'),'operator-project');assert.equal(await readFile(path.join(target,'.env.local'),'utf8'),'operator-secret');
  const ignore=await readFile(path.join(target,'.vercelignore'),'utf8');assert(ignore.includes('.env*'));assert(ignore.includes('node_modules'));
  assert(!(await readdir(target)).includes('public'));assert(!(await readdir(target)).includes('data'));
});
test('prepare refuses unmanaged output rather than removing existing work', async t => {
  const target=await mkdtemp(path.join(tmpdir(),'asset-api-unmanaged-'));t.after(()=>rm(target,{recursive:true,force:true}));
  await writeFile(path.join(target,'keep.txt'),'keep');await assert.rejects(prepareAssetApiService({output:target}));assert.equal(await readFile(path.join(target,'keep.txt'),'utf8'),'keep');
});

test('service lock rejects changed, extra, missing and conflicting direct dependencies',()=>{
  const manifest=structuredClone(assetServicePackage);
  const packages={'':{name:manifest.name,version:manifest.version,dependencies:{...manifest.dependencies},devDependencies:{...manifest.devDependencies}}};
  for(const [name,version] of Object.entries({...manifest.dependencies,...manifest.devDependencies}))packages[`node_modules/${name}`]={version};
  const lock={name:manifest.name,version:manifest.version,lockfileVersion:3,packages};
  assert.equal(validateAssetServiceLock(lock,manifest),lock);
  for(const change of [
    l=>l.packages[''].dependencies.next='0.0.0',
    l=>l.packages[''].dependencies.extra='1.0.0',
    l=>delete l.packages[''].devDependencies.typescript,
    l=>delete l.packages['node_modules/next'],
    l=>l.packages['node_modules/react'].version='0.0.0',
    l=>l.name='another-service',
    l=>l.lockfileVersion=1,
  ]){const bad=structuredClone(lock);change(bad);assert.throws(()=>validateAssetServiceLock(bad,manifest));}
});
