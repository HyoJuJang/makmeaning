/** Local-only visual QA server; allowlists render modules and artwork, never exposes env/Git files. */
import {createServer} from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {dirname,extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {demoHome} from '../../src/data/demo-home.ts';
const qa=dirname(fileURLToPath(import.meta.url)),root=resolve(qa,'../..'),assets=resolve(root,'app/assets');
const port=Number(process.env.QA_PORT||3202);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid QA_PORT');
const moduleNames=new Set(['avatar.js','avatar-frames.js','vanity-frames.js','object-art.js','interactions.js','movement.js','category-routes.js','eating-frames.js','food-action.js','demo-state.js','garment-art.js']);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.json':'application/json; charset=utf-8'};
createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);let file;
  if(path==='/fixture.json'){res.writeHead(200,{'Content-Type':mime['.json'],'Cache-Control':'no-store'});return res.end(req.method==='HEAD'?'':JSON.stringify(demoHome));}
  if(path==='/')file=resolve(qa,'canonical.html');
  else if(['/canonical.js','/canonical-state.mjs'].includes(path))file=resolve(qa,path.slice(1));
  else if(path.startsWith('/app/')&&moduleNames.has(path.slice(5)))file=resolve(root,path.slice(1));
  else if(['/products/knit.svg','/products/shirt.svg'].includes(path))file=resolve(root,'public',path.slice(1));
  else if(path.startsWith('/assets/')){
   file=await realpath(resolve(assets,path.slice(8)));
   if(!file.startsWith((await realpath(assets))+sep)){res.writeHead(403);return res.end();}
  }else{res.writeHead(404);return res.end();}
  if(!(await stat(file)).isFile()){res.writeHead(404);return res.end();}
  const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Content-Length':body.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404);res.end();}
}).listen(port,'127.0.0.1',()=>console.log(`Synthetic renderer QA: http://127.0.0.1:${port}/ (root ${root})`));
