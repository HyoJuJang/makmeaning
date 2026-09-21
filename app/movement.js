// Shared foot-anchor geometry for keyboard movement and tap pathfinding.
export const WORLD={width:400,height:600};
export const RADIUS=7;
export const START={x:234,y:300};
export const APPROACHES={fashion:{x:162,y:164},food:{x:262,y:197},beauty:{x:340,y:329},living:{x:124,y:389},window:{x:204,y:130},bed:{x:124,y:235},lamp:{x:326,y:444},pantry:{x:318,y:198}};
export const OBSTACLES=[
 {id:'wardrobe',x:40,y:116,w:106,h:40},
 {id:'fridge',x:231,y:117,w:65,h:42},
 {id:'fridge-door',x:290,y:128,w:19,h:53},
 {id:'pantry',x:300,y:115,w:61,h:41},
 {id:'bed',x:42,y:180,w:74,h:121},
 {id:'bedside',x:35,y:267,w:46,h:52},
 {id:'vanity',x:314,y:235,w:53,h:55},
 {id:'stool',x:322,y:274,w:38,h:44},
 {id:'sofa',x:33,y:319,w:82,h:138},
 {id:'coffee-table',x:134,y:335,w:53,h:78},
 {id:'ottoman',cx:195,cy:425,r:23},
 {id:'tv-console',x:315,y:341,w:49,h:86},
 {id:'lamp-table',x:334,y:423,w:31,h:48},
 {id:'entry-cabinet',x:327,y:452,w:46,h:102},
 {id:'front-wall',x:30,y:456,w:68,h:42}
];
const floors=[{x:31,y:117,w:338,h:377},{x:226,y:481,w:100,h:68}];
function inFloor(x,y){return floors.some(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);}
export function isWalkable(x,y){if(!Number.isFinite(x)||!Number.isFinite(y))return false;for(let i=0;i<16;i++){const a=i*Math.PI/8;if(!inFloor(x+Math.cos(a)*RADIUS,y+Math.sin(a)*RADIUS))return false;}return !OBSTACLES.some(r=>{if('r'in r)return Math.hypot(x-r.cx,y-r.cy)<r.r+RADIUS;const nx=Math.max(r.x,Math.min(x,r.x+r.w)),ny=Math.max(r.y,Math.min(y,r.y+r.h));return Math.hypot(x-nx,y-ny)<RADIUS;});}
export function segmentClear(a,b){const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2));for(let i=0;i<=steps;i++){const t=i/steps;if(!isWalkable(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;}return true;}
export function moveWithCollision(p,dx,dy){let x=p.x,y=p.y;const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/2));for(let i=0;i<steps;i++){if(isWalkable(x+dx/steps,y))x+=dx/steps;if(isWalkable(x,y+dy/steps))y+=dy/steps;}return{x,y};}
const CELL=8,COLS=50,ROWS=75;
const nodePoint=id=>({x:(id%COLS)*CELL+CELL/2,y:Math.floor(id/COLS)*CELL+CELL/2});
const valid=new Set();for(let id=0;id<COLS*ROWS;id++){const p=nodePoint(id);if(isWalkable(p.x,p.y))valid.add(id);}
function nearestNode(p){let selected=null,distance=Infinity;for(const id of valid){const q=nodePoint(id),d=Math.hypot(q.x-p.x,q.y-p.y);if(d<distance&&segmentClear(p,q)){distance=d;selected=id;}}return selected;}
export function findPath(from,to){if(!isWalkable(from.x,from.y)||!isWalkable(to.x,to.y))return null;if(segmentClear(from,to))return[{...to}];const start=nearestNode(from),goal=nearestNode(to);if(start===null||goal===null)return null;const queue=[start],parent=new Map([[start,null]]);let cursor=0;while(cursor<queue.length){const id=queue[cursor++];if(id===goal)break;const cx=id%COLS,cy=Math.floor(id/COLS);for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nx=cx+dx,ny=cy+dy,next=ny*COLS+nx;if(nx<0||nx>=COLS||ny<0||ny>=ROWS||!valid.has(next)||parent.has(next))continue;if(dx&&dy&&(!valid.has(cy*COLS+nx)||!valid.has(ny*COLS+cx)))continue;if(!segmentClear(nodePoint(id),nodePoint(next)))continue;parent.set(next,id);queue.push(next);}}
if(!parent.has(goal))return null;const raw=[{...to}];let id=goal;while(id!==null){raw.push(nodePoint(id));id=parent.get(id);}raw.push({...from});raw.reverse();const smooth=[];let i=0;while(i<raw.length-1){let j=raw.length-1;while(j>i+1&&!segmentClear(raw[i],raw[j]))j--;smooth.push(raw[j]);i=j;}return smooth;}
