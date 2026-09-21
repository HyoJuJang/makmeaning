import assert from 'node:assert/strict';
import {InteractionController,OBJECTS} from '../interactions.js';
import {APPROACHES,START,isWalkable} from '../movement.js';
import {CATEGORY_ROUTES,readyObjectCategory} from '../category-routes.js';
const checks=[];
function arrive(c,id){const request=c.dispatch({type:'REQUEST',intent:{type:'object',id},position:START});assert.equal(request[0].type,'navigate');const epoch=c.epoch;const position=APPROACHES[OBJECTS[id].target];c.dispatch({type:'ARRIVED',id,epoch,pathEmpty:true,position});assert.equal(c.phase,'entering');return position;}
function engaged(c,id){arrive(c,id);c.tick(id==='wardrobe'?830:id==='fridge'?650:id==='window'?400:320);assert.equal(c.phase,'engaged');}
function invariant(c){const v=c.view();assert(['idle','walking','interacting','sitting_sofa','sitting_vanity','changing_clothes','rummaging_wardrobe','using_cosmetic'].includes(c.primary));assert(!(c.objects.sofa.stable==='occupied'&&c.objects.vanity.stable==='occupied'));if(c.owner==='movement'){assert.deepEqual(v.renderOffset,{x:0,y:0});assert.equal(v.heldProductId,null);}if(c.primary==='changing_clothes'||c.primary==='rummaging_wardrobe'){assert.equal(c.objects.wardrobe.stable,'open');assert.equal(c.objects.wardrobe.transition,null);}if(c.primary==='using_cosmetic')assert.equal(c.objects.vanity.stable,'occupied');}
{
 const c=new InteractionController();c.dispatch({type:'REQUEST',intent:{type:'object',id:'wardrobe'},position:START});const epoch=c.epoch;
 for(const e of [{position:START,pathEmpty:true,epoch},{position:APPROACHES.fashion,pathEmpty:false,epoch},{position:APPROACHES.fashion,pathEmpty:true,epoch:epoch-1}]){assert.deepEqual(c.dispatch({type:'ARRIVED',id:'wardrobe',...e}),[]);assert.equal(c.owner,'movement');}
 c.dispatch({type:'ARRIVED',id:'wardrobe',epoch,pathEmpty:true,position:APPROACHES.fashion});const alignToken=c.token();c.dispatch({type:'STEP_DONE',...alignToken});assert.equal(c.step,'align');
 c.tick(99);assert.equal(c.step,'align');c.tick(1);assert.equal(c.step,'open');c.dispatch({type:'STEP_DONE',...alignToken});assert.equal(c.step,'open');c.tick(279);assert.equal(c.objects.wardrobe.stable,'closed');c.tick(1);assert.equal(c.step,'browse');assert.equal(c.objects.wardrobe.stable,'open');invariant(c);c.tick(449);assert.equal(c.step,'browse');c.tick(1);assert.equal(c.phase,'engaged');checks.push('arrival distance/path/epoch guards and exact normal wardrobe sequence; stale step cannot skip');
}
{
 const c=new InteractionController();arrive(c,'wardrobe');c.tick(180);const token=c.token();assert(c.value('wardrobe')>0&&c.value('wardrobe')<1);const visible=c.value('wardrobe');c.dispatch({type:'CANCEL'});assert.equal(c.phase,'exiting');assert.equal(c.value('wardrobe'),visible);c.dispatch({type:'STEP_DONE',...token});c.tick(200);assert.equal(c.owner,'none');assert.equal(c.objects.wardrobe.stable,'closed');assert.equal(c.primary,'idle');checks.push('opening cancellation goes directly to continuous exit without browse/commit');
}
for(const [id,product,current,threshold,duration,kind]of[['wardrobe','shirt','knit',300,600,'outfit'],['vanity','cream','serum',300,500,'beauty']]){
 for(const before of [true,false]){const c=new InteractionController();engaged(c,id);c.dispatch({type:'ACTION',productId:product,current});const actionId=c.action.id,token=c.token();c.dispatch({type:'ACTION',productId:product,current});assert.equal(c.action.id,actionId);const effects=c.tick(before?threshold-1:threshold);assert.equal(effects.filter(e=>e.type==='commit').length,before?0:1);invariant(c);c.dispatch({type:'CANCEL'});const stale=c.dispatch({type:'COMMIT_MARK',...token,actionId});assert(!stale.some(e=>e.type==='commit'));assert(!c.tick(1000).some(e=>e.type==='commit'));assert.equal(c.owner,'none');assert.equal(c.view().heldProductId,null);assert.deepEqual(c.view().renderOffset,{x:0,y:0});}
 const c=new InteractionController();engaged(c,id);c.dispatch({type:'ACTION',productId:product,current});const effects=c.tick(duration);assert.equal(effects.filter(e=>e.type==='commit'&&e.kind===kind).length,1);if(id==='wardrobe'){assert.equal(c.step,'hold');c.tick(199);assert.equal(c.step,'hold');c.tick(1);assert.equal(c.phase,'exiting');c.tick(200);assert.equal(c.owner,'none');}else{assert.equal(c.primary,'sitting_vanity');c.tick(5000);assert.equal(c.primary,'sitting_vanity');}checks.push(`${id} exact commit once, duplicate action guarded, pre/post-commit cancel preserves contract`);
}
{
 const c=new InteractionController();arrive(c,'sofa');c.tick(210);const offset=c.view().renderOffset;assert(offset.x<0&&offset.x>-22);c.dispatch({type:'REQUEST',intent:{type:'keys'},position:APPROACHES.living});assert.equal(c.phase,'exiting');assert.deepEqual(c.view().renderOffset,offset);const epoch=c.epoch;c.tick(70);c.dispatch({type:'REQUEST',intent:{type:'object',id:'fridge'},position:APPROACHES.living});assert.equal(c.epoch,epoch);const effects=c.tick(150);assert.equal(effects.find(e=>e.type==='intent')?.intent.id,'fridge');assert.deepEqual(c.view().renderOffset,{x:0,y:0});
 const d=new InteractionController();engaged(d,'sofa');d.tick(5000);assert.equal(d.primary,'sitting_sofa');d.dispatch({type:'REQUEST',intent:{type:'keys'},position:APPROACHES.living});d.dispatch({type:'KEYUP',keysHeld:false});assert(!d.tick(220).some(e=>e.type==='intent'));assert.equal(d.owner,'none');checks.push('seating intermediate cancel continuous; last intent wins; keyup during stand cancels queued movement');
}
{
 const c=new InteractionController();engaged(c,'sofa');
 c.dispatch({type:'REQUEST',intent:{type:'object',id:'fridge'},position:APPROACHES.living});
 const epoch=c.epoch;c.tick(70);
 c.dispatch({type:'REQUEST',intent:{type:'object',id:'sofa'},position:APPROACHES.living});
 assert.equal(c.epoch,epoch,'A new destination must not restart the exit animation');
 const effects=c.tick(150);assert.equal(effects.find(e=>e.type==='intent')?.intent.id,'sofa');
 assert.equal(c.objects.sofa.stable,'unoccupied');assert.deepEqual(c.view().renderOffset,{x:0,y:0});
 checks.push('returning to the current object during exit replaces an older queued destination');
}
{
 const c=new InteractionController();engaged(c,'window');assert.equal(c.objects.window.stable,'open');c.dispatch({type:'CANCEL'});c.tick(200);assert.equal(c.objects.window.stable,'open');arrive(c,'window');c.tick(100);assert.equal(c.phase,'engaged');assert.equal(c.objects.window.stable,'open');c.dispatch({type:'WINDOW_TOGGLE'});c.tick(120);assert(c.value('window')<1);c.dispatch({type:'CANCEL'});c.tick(200);assert.equal(c.value('window'),1);engaged(c,'window');c.dispatch({type:'WINDOW_TOGGLE'});c.tick(250);assert.equal(c.objects.window.stable,'closed');checks.push('window stable persists after exit/reapproach; cancelled close reverts; explicit completed close commits');
}
{
 const c=new InteractionController();engaged(c,'fridge');c.dispatch({type:'SELECT_FOOD',productId:'milk'});assert.equal(c.selectedFood,'milk');assert(!c.tick(500).some(e=>e.type==='commit'));const e={type:'IMMEDIATE',kind:'food',productId:'milk',quantity:3,actionId:1};assert.equal(c.dispatch(e).filter(e=>e.type==='commit').length,1);assert.equal(c.dispatch(e).length,0);assert.equal(c.dispatch({...e,actionId:2,quantity:0}).length,0);checks.push('food inspect no consumption, one activation one commit, zero guard');
}
{
 const c=new InteractionController();engaged(c,'window');c.dispatch({type:'CANCEL'});c.tick(200);engaged(c,'vanity');c.dispatch({type:'ACTION',productId:'cream',current:'serum'});c.tick(170);c.dispatch({type:'HIDE'});assert.equal(c.owner,'none');assert.equal(c.objects.window.stable,'open');assert.equal(c.objects.vanity.stable,'unoccupied');assert.equal(c.view().heldProductId,null);assert(!c.tick(1000).some(e=>e.type==='commit'));c.dispatch({type:'RESET'});assert.equal(c.objects.window.stable,'closed');checks.push('hidden emergency cleanup cancels uncommitted action and preserves stable window; reset closes window');
}
{
 const c=new InteractionController({reduced:true});arrive(c,'wardrobe');c.tick(210);assert.equal(c.phase,'engaged');c.dispatch({type:'ACTION',productId:'shirt',current:'knit'});assert(!c.tick(34).some(e=>e.type==='commit'));assert.equal(c.tick(1).filter(e=>e.type==='commit').length,1);c.tick(175);assert.equal(c.owner,'none');checks.push('reduced motion uses same graph and proportional commit before normal exit');
}
for(const [id,category,total] of [['wardrobe','fashion',830],['fridge','food',650],['vanity','beauty',320],['sofa','living',320],['pantry','food',320]]){
 const c=new InteractionController(),position=APPROACHES[OBJECTS[id].target];
 c.dispatch({type:'REQUEST',intent:{type:'object',id},position:START});
 for(let tap=0;tap<4;tap++)assert.deepEqual(c.dispatch({type:'REQUEST',intent:{type:'object',id},position:START}),[]);
 assert.equal(readyObjectCategory(c,id),null);
 c.dispatch({type:'ARRIVED',id,epoch:c.epoch,pathEmpty:true,position});
 for(let ms=0;ms<total-1;ms++){c.tick(1);assert.equal(readyObjectCategory(c,id),null);assert.deepEqual(c.dispatch({type:'REQUEST',intent:{type:'object',id},position}),[]);}
 c.tick(1);assert.equal(c.phase,'engaged');assert.equal(readyObjectCategory(c,id),category);
 if(id==='pantry'){assert.equal(c.trayExpanded,true);assert.equal(c.dispatch({type:'IMMEDIATE',kind:'food',productId:'vitamin',quantity:3,actionId:101}).filter(e=>e.type==='commit').length,1);}
 const effects=c.dispatch({type:'REQUEST',intent:{type:'object',id},position});
 assert(!effects.some(e=>e.type==='intent'),'Navigation waits for existing object exit animation');
 assert.equal(c.phase,'exiting');assert.equal(c.categoryNavigation,category);
 assert.deepEqual(c.dispatch({type:'REQUEST',intent:{type:'object',id},position}),[]);
 assert.deepEqual(c.dispatch({type:'CANCEL'}),[],'Escape/extra taps cannot cancel a latched route into a broken lock');
 const done=c.tick(1000),routes=done.filter(e=>e.type==='intent'&&e.intent.type==='category');
 assert.equal(routes.length,1);assert.equal(CATEGORY_ROUTES[routes[0].intent.id].href,'/'+category);
 assert.equal(c.owner,'none');assert.deepEqual(c.view().renderOffset,{x:0,y:0});
 assert.equal(c.tick(1000).length,0,'Navigation effect occurs once');
 c.dispatch({type:'HIDE'});assert.equal(c.categoryNavigation,null);arrive(c,id);
 checks.push(`${id}: first tap stays in room, rapid taps ignored throughout entry, ready re-tap exits safely and routes once to ${category}, return cleanup permits re-entry`);
}
for(const [id,product,current] of [['wardrobe','shirt','knit'],['vanity','cream','serum']]){
 const c=new InteractionController();engaged(c,id);c.dispatch({type:'ACTION',productId:product,current});
 assert.equal(readyObjectCategory(c,id),null);assert.deepEqual(c.dispatch({type:'REQUEST',intent:{type:'object',id},position:APPROACHES[OBJECTS[id].target]}),[]);
 assert.equal(c.categoryNavigation,null,'Product animation must never launch a category');
}
console.log(JSON.stringify({result:'PASS',checks},null,2));
