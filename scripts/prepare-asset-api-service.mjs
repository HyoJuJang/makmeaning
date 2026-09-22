import { copyFile, lstat, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const repositoryRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const defaultOutput = path.resolve(repositoryRoot, '../work/vercel-asset-api');
const markerName = '.asset-api-service.json';
const dependencyLockPath = path.join(repositoryRoot, 'services/asset-api/package-lock.json');
export const assetServicePackage = {
  name:'gscene-asset-api', version:'1.0.0', private:true, type:'module', engines:{node:'>=22.18.0'},
  scripts:{dev:'next dev --hostname 127.0.0.1 --port 3002',build:'next build --webpack',start:'next start --hostname 127.0.0.1 --port 3002',typecheck:'tsc --noEmit'},
  dependencies:{'@neondatabase/serverless':'1.1.0',next:'16.3.5',react:'19.3.0','react-dom':'19.3.0','server-only':'0.0.1'},
  devDependencies:{'@types/node':'22.20.4','@types/react':'19.3.0','@types/react-dom':'19.3.0',typescript:'5.9.3'},
};
export function validateAssetServiceLock(lock, manifest = assetServicePackage) {
  const root = lock?.packages?.[''];
  if (lock?.lockfileVersion !== 3 || !root || lock.name !== manifest.name || lock.version !== manifest.version
    || root.name !== manifest.name || root.version !== manifest.version) throw new Error('Asset service dependency lock identity is invalid');
  for (const field of ['dependencies', 'devDependencies']) {
    const expected = manifest[field] ?? {}, actual = root[field] ?? {};
    if (Object.keys(expected).length !== Object.keys(actual).length
      || Object.entries(expected).some(([name, version]) => actual[name] !== version)) throw new Error(`Asset service package.json and lock ${field} disagree`);
    for (const [name, version] of Object.entries(expected)) {
      if (lock.packages[`node_modules/${name}`]?.version !== version) throw new Error('Asset service locked direct package version is missing or inconsistent');
    }
  }
  return lock;
}
async function exists(file) { try { return await lstat(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
async function sourceFiles(root, directory) {
  const result = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Source links cannot be copied');
    if (entry.isDirectory()) result.push(...await sourceFiles(root, relative));
    else if (entry.isFile() && entry.name.endsWith('.ts')) result.push(relative);
    else throw new Error('Only TypeScript source is allowed in the API service inputs');
  }
  return result;
}
export async function prepareAssetApiService({ output = defaultOutput, linkDependencies = false } = {}) {
  const target = path.resolve(output);
  if (target === repositoryRoot || repositoryRoot.startsWith(target + path.sep) || target.startsWith(repositoryRoot + path.sep)) throw new Error('Output must be separate from the source repository');
  const info = await exists(target);
  if (info?.isSymbolicLink()) throw new Error('Output cannot be a symbolic link');
  if (info && !info.isDirectory()) throw new Error('Output must be a directory');
  if (info) {
    const names = await readdir(target);
    // Existing local credentials and project linkage belong to the deployment operator.
    // Never read, copy or overwrite them; .vercelignore excludes all .env* paths.
    if (names.length) {
      const marker = JSON.parse(await readFile(path.join(target, markerName), 'utf8'));
      if (marker.kind !== 'gscene-generated-asset-api' || marker.schemaVersion !== 1) throw new Error('Refusing to overwrite an unmanaged directory');
    }
  }
  const files = [...await sourceFiles(repositoryRoot, 'app/api/game-assets'), ...await sourceFiles(repositoryRoot, 'src/lib/asset-db'), 'src/lib/game-asset-types.ts'].sort();
  const allowed = new Set(files);
  const records = [];
  // Ensure relative dependencies are in the explicit source allowlist before writing output.
  for (const file of files) {
    const source = await readFile(path.join(repositoryRoot, file), 'utf8');
    for (const match of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
      if (match[1].startsWith('.')) {
        const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1]));
        if (!allowed.has(resolved)) throw new Error('API source imports a file outside the deployment allowlist');
      }
    }
    records.push({ path: file, sha256: createHash('sha256').update(source).digest('hex'), bytes: Buffer.byteLength(source) });
  }
  const dependencyLock = await readFile(dependencyLockPath, 'utf8');
  validateAssetServiceLock(JSON.parse(dependencyLock));
  const dependencyLockSha256 = createHash('sha256').update(dependencyLock).digest('hex');
  await mkdir(target, { recursive: true });
  // These directories are generated by this script; .vercel project linkage is preserved.
  for (const directory of ['app', 'src']) await rm(path.join(target, directory), { recursive: true, force: true });
  for (const file of files) {
    await mkdir(path.dirname(path.join(target, file)), { recursive: true });
    await copyFile(path.join(repositoryRoot, file), path.join(target, file));
  }
  const scaffold = {
    'package.json': JSON.stringify(assetServicePackage, null, 2)+'\n',
    'package-lock.json': dependencyLock,
    'tsconfig.json': JSON.stringify({compilerOptions:{target:'ES2022',lib:['dom','dom.iterable','esnext'],allowJs:false,skipLibCheck:true,strict:true,noEmit:true,esModuleInterop:true,module:'esnext',moduleResolution:'bundler',allowImportingTsExtensions:true,resolveJsonModule:true,isolatedModules:true,jsx:'react-jsx',incremental:true,plugins:[{name:'next'}]},include:['next-env.d.ts','**/*.ts','**/*.tsx','.next/types/**/*.ts','.next/dev/types/**/*.ts'],exclude:['node_modules']},null,2)+'\n',
    'next-env.d.ts': '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n',
    'next.config.ts': "import type { NextConfig } from 'next';\nconst config: NextConfig = { poweredByHeader: false, outputFileTracingRoot: process.cwd() };\nexport default config;\n",
    'app/layout.tsx': "import type { ReactNode } from 'react';\nexport const metadata = {title:'G:Scene Asset API',description:'G:Scene 공용 게임 에셋 조회 서비스'};\nexport default function Layout({children}:{children:ReactNode}){return <html lang=\"ko\"><body style={{fontFamily:'system-ui,sans-serif',margin:'48px auto',maxWidth:760,padding:'0 24px',color:'#234338',background:'#faf9f5'}}>{children}</body></html>;}\n",
    'app/page.tsx': "const endpoints=[['상품 매핑 목록','/api/game-assets?limit=2'],['상품 ID로 조회','/api/game-assets/products/1083830467'],['여러 상품 함께 조회','/api/game-assets/resolve?ids=1083830467,1113622242']];\nexport default function Page(){return <main><p>G:Scene</p><h1>게임 에셋 API</h1><p>상품 ID에 연결된 공용 픽셀 에셋과 준비 상태를 확인하세요.</p><nav aria-label=\"API 예시\"><ul>{endpoints.map(([label,url])=><li key={url} style={{margin:'18px 0'}}><a href={url} style={{color:'#235943'}}>{label}</a></li>)}</ul></nav><p>상품 가격과 구매 데이터는 이 서비스에서 관리하지 않습니다.</p></main>;}\n",
    '.gitignore': 'node_modules/\n.next/\n.vercel/\n.env\n.env.*\n*.tsbuildinfo\n',
    '.vercelignore': 'node_modules\n.next\n.vercel\n.git\n.env*\n**/.env*\n*.tsbuildinfo\n',
    'vercel.json': JSON.stringify({framework:'nextjs',buildCommand:'npm run build'},null,2)+'\n',
    'README.md': '# G:Scene asset API deployment source\n\nGenerated from the repository by scripts/prepare-asset-api-service.mjs. Edit the source repository, then regenerate; do not maintain API copies here.\n\nRequired server environment: ASSET_DATABASE_URL. Optional image origin: ASSET_BASE_URL=https://<store>.public.blob.vercel-storage.com. Inject both through hosting settings. Any operator-owned local .env* files are preserved by preparation and excluded from deployment through .vercelignore. No product database, catalog CSV, generated mapping, native PNG, prompt or source photo is packaged.\n\nRun npm ci, then npm run build. The checked-in services/asset-api/package-lock.json is copied unchanged after its root dependencies are verified against the generated package.json. For local checks the prepare script can temporarily link the source repository node_modules using --link-dependencies. Run prepare again without that flag before source deployment to remove the link.\n',
  };
  for (const [file, value] of Object.entries(scaffold)) await writeFile(path.join(target,file),value);
  const modules = path.join(target, 'node_modules'), modulesInfo = await exists(modules);
  if (linkDependencies) {
    if (modulesInfo && !modulesInfo.isSymbolicLink()) throw new Error('Existing node_modules directory will not be replaced');
    if (modulesInfo) await rm(modules);
    await symlink(path.join(repositoryRoot,'node_modules'),modules,'dir');
  } else if (modulesInfo?.isSymbolicLink()) await rm(modules);
  const report = {kind:'gscene-generated-asset-api',schemaVersion:1,copiedFiles:records,totalSourceBytes:records.reduce((sum,item)=>sum+item.bytes,0),temporaryDependencyLink:linkDependencies,dependencyLockSha256};
  await writeFile(path.join(target,markerName),JSON.stringify(report,null,2)+'\n');
  return {output:target,copiedFiles:files.length,totalSourceBytes:report.totalSourceBytes,temporaryDependencyLink:linkDependencies,dependencyLockSha256};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.some(arg => arg !== '--link-dependencies')) throw new Error('Unsupported option');
    console.log(JSON.stringify(await prepareAssetApiService({linkDependencies:args.includes('--link-dependencies')})));
  } catch (error) {
    console.error(`Asset API preparation failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    process.exitCode=1;
  }
}
