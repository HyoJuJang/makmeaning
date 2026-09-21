import assert from 'node:assert/strict';
import { START, APPROACHES, isWalkable, segmentClear, findPath, moveWithCollision } from '../movement.js';
assert(isWalkable(START.x, START.y), 'Start must be on walkable floor');
const points = Object.entries(APPROACHES).map(([name, point]) => ({name, ...point}));
for (const p of points) assert(isWalkable(p.x,p.y), `${p.name} approach must be walkable`);
let routeCount = 0;
function checkRoute(from, to, required = true) {
  const route = findPath(from, to);
  if (!route) { assert(!required, `No route from ${JSON.stringify(from)} to ${JSON.stringify(to)}`); return false; }
  let prev = from;
  for (const p of route) {
    assert(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert(isWalkable(p.x,p.y), `Path waypoint collides: ${JSON.stringify(p)}`);
    assert(segmentClear(prev,p), `Path segment crosses obstacle: ${JSON.stringify([prev,p])}`);
    const distance = Math.hypot(p.x-prev.x,p.y-prev.y);
    for(let i=0;i<=Math.ceil(distance*2);i++) {
      const t=i/Math.max(1,Math.ceil(distance*2));
      assert(isWalkable(prev.x+(p.x-prev.x)*t,prev.y+(p.y-prev.y)*t), 'Path intersects collision boundary');
    }
    prev=p;
  }
  assert(Math.hypot(prev.x-to.x,prev.y-to.y)<12, 'Route does not reach target');
  routeCount++;
  return true;
}
for(const from of [START,...points]) for(const to of points) checkRoute(from,to);
for(const p of [{x:-20,y:300},{x:401,y:300},{x:220,y:-1},{x:220,y:601},{x:80,y:240},{x:160,y:370}]) {
  assert(!isWalkable(p.x,p.y),'Wall/furniture center should not be walkable');
  assert.equal(findPath(START,p),null,'Unwalkable destination must not generate a route');
}
// The strip between the stool and TV stays walkable from either side.
for (const x of [310,320,350,357]) checkRoute({x,y:329},APPROACHES.beauty);
assert(!isWalkable(340,310),'The stool itself must still block ordinary walking');
assert(!isWalkable(340,345),'The TV console must still block ordinary walking');
let seed=73129;
const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
let sampled=0,unreachable=0;
for(let i=0;i<1500&&sampled<100;i++) {
  const p={x:random()*400,y:random()*600};
  if(!isWalkable(p.x,p.y))continue;
  sampled++;
  if(!checkRoute(START,p,false))unreachable++;
}
let position={...START};
for(let i=0;i<3000;i++) {
  const dx=(random()-.5)*20,dy=(random()-.5)*20;
  const next=moveWithCollision(position,dx,dy);
  assert(isWalkable(next.x,next.y),'Keyboard move ends inside furniture/outside house');
  assert(Math.hypot(next.x-position.x,next.y-position.y)<=Math.hypot(dx,dy)+0.01,'Collision correction teleports actor');
  position=next;
}
console.log(JSON.stringify({routeCount,randomTargets:sampled,unreachable,keyboardSteps:3000,result:'PASS'},null,2));
