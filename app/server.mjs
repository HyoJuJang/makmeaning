import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GET as getDemoHome } from './api/demo/home/route.ts';

const root=path.dirname(fileURLToPath(import.meta.url));
const productRoot=path.resolve(root,'../public/products');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};

http.createServer(async(req,res)=>{
 let pathname;
 try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}
 catch{res.writeHead(400);return res.end('Bad request');}

 // Use the same home handler/data as Next for the standalone room preview.
 if(pathname==='/api/demo/home'){
  if(req.method!=='GET'&&req.method!=='HEAD'){
   res.writeHead(405,{'Allow':'GET, HEAD'});return res.end('Method not allowed');
  }
  try{
   const response=await getDemoHome();
   const body=req.method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer());
   res.writeHead(response.status,Object.fromEntries(response.headers));
   return res.end(body);
  }catch{
   res.writeHead(500,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
   return res.end(JSON.stringify({error:'Could not load demo home'}));
  }
 }

 const isProduct=pathname.startsWith('/products/');
 const base=isProduct?productRoot:root;
 const relative=isProduct?pathname.slice('/products/'.length):pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
 const file=path.resolve(base,relative);
 if(!file.startsWith(base+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(error,data)=>{
  if(error){res.writeHead(404);res.end('Not found');return;}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  res.end(data);
 });
}).listen(4173,'127.0.0.1',()=>console.log('G:Scene ready at http://localhost:4173'));
