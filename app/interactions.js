import {APPROACHES,isWalkable,findPath} from './movement.js';
export const OBJECTS={
 wardrobe:{category:'fashion',target:'fashion',direction:'left',name:'옷장',button:'옷 고르기',exit:'옷장 닫기'},
 fridge:{category:'food',target:'food',direction:'up',name:'냉장고',button:'식품 보기',exit:'냉장고 닫기'},
 sofa:{category:'living',target:'living',direction:'left',name:'소파',button:'거실 물건 보기',exit:'일어나기',offset:{x:-34,y:8}},
 vanity:{category:'beauty',target:'beauty',direction:'up',name:'화장대',button:'화장품 고르기',exit:'일어나기',offset:{x:0,y:-18}},
 window:{target:'window',direction:'up',name:'창문',exit:'돌아서기'}
};
const clamp=n=>Math.max(0,Math.min(1,n));
export class InteractionController {
 constructor({reduced=false}={}){this.reduced=reduced;this.epoch=0;this.phaseRevision=0;this.serial=0;this.effects=[];this.reset(false);}
 reset(preserveWindow=false){const windowState=preserveWindow?this.objects?.window.stable:'closed';this.epoch++;this.owner='none';this.phase='idle';this.step='idle';this.elapsed=0;this.duration=0;this.targetObject=null;this.standingAnchor=null;this.pendingIntent=null;this.action=null;this.trayExpanded=false;this.selectedFood=null;this.objects={wardrobe:{stable:'closed',transition:null},fridge:{stable:'closed',transition:null},sofa:{stable:'unoccupied',transition:null},vanity:{stable:'unoccupied',transition:null},window:{stable:windowState||'closed',transition:null}};this.usedActions=new Set();}
 get objectId(){return this.owner.startsWith('object:')?this.owner.slice(7):null;}
 get primary(){if(this.owner==='movement')return 'walking';const id=this.objectId;if(!id)return 'idle';if(this.phase==='acting'&&id==='wardrobe')return 'changing_clothes';if(this.phase==='acting'&&id==='vanity')return 'using_cosmetic';if(this.step==='browse')return 'rummaging_wardrobe';if(this.phase==='engaged'&&id==='sofa')return 'sitting_sofa';if(this.phase==='engaged'&&id==='vanity')return 'sitting_vanity';return 'interacting';}
 value(id){const o=this.objects[id],t=o.transition;return t?t.from+(t.to-t.from)*t.progress:Number(o.stable==='open'||o.stable==='occupied');}
 token(){return {epoch:this.epoch,phaseRevision:this.phaseRevision,phase:this.phase,step:this.step,owner:this.owner};}
 validToken(e){return ['epoch','phaseRevision','phase','step','owner'].every(k=>e[k]===this[k]);}
 emit(type,detail={}){this.effects.push({type,...detail});}
 drain(){return this.effects.splice(0);}
 beginStep(step,duration,phase=this.phase){this.step=step;this.phase=phase;this.elapsed=0;this.duration=this.reduced?Math.min(duration,70):duration;this.phaseRevision++;}
 transition(id,to){this.objects[id].transition={from:this.value(id),to,progress:0,epoch:this.epoch};}
 settle(id){const o=this.objects[id],to=o.transition?.to;if(to!==undefined)o.stable=(id==='sofa'||id==='vanity')?(to?'occupied':'unoccupied'):(to?'open':'closed');o.transition=null;}
 engaged(){this.beginStep('wait',0,'engaged');this.action=null;this.emit('engaged',{id:this.objectId});}
 beginExit(intent=null){if(this.phase==='exiting'){this.pendingIntent=intent;return;}this.epoch++;this.pendingIntent=intent;this.action=null;this.selectedFood=null;this.trayExpanded=false;const id=this.objectId;if(!id){this.owner='none';this.phase='idle';this.targetObject=null;if(intent)this.emit('intent',{intent});return;}this.transition(id,id==='window'?Number(this.objects.window.stable==='open'):0);this.beginStep('exit',id==='fridge'?250:id==='wardrobe'||id==='window'?200:220,'exiting');this.emit('tray');}
 dispatch(e){
  if(e.type==='REQUEST'){
   const intent=e.intent;if(!intent)return this.drain();
   let target=intent.type==='object'?APPROACHES[OBJECTS[intent.id]?.target||intent.id]:intent.target;
   if((intent.type==='object'||intent.type==='move')&&(!target||!isWalkable(target.x,target.y)||!findPath(e.position,target))){this.emit('invalid');return this.drain();}
   if(this.owner.startsWith('modal:'))return this.drain();
   if(intent.type==='object'&&(this.objectId===intent.id&&this.phase!=='exiting'||this.owner==='movement'&&this.targetObject===intent.id))return this.drain();
   if(this.objectId){this.beginExit(intent);return this.drain();}
   this.epoch++;this.action=null;this.targetObject=null;
   if(intent.type==='modal'){this.owner='modal:'+intent.id;this.phase='idle';this.emit('modal',{id:intent.id});}
   else{this.owner='movement';this.phase='approaching';this.step='walk';this.targetObject=intent.type==='object'?intent.id:null;this.emit('navigate',{intent,target,epoch:this.epoch});}
  }
  if(e.type==='ARRIVED'&&this.owner==='movement'&&e.epoch===this.epoch&&e.id===this.targetObject&&e.pathEmpty&&isWalkable(e.position.x,e.position.y)){
   const id=this.targetObject,target=APPROACHES[OBJECTS[id]?.target||id];if(!target||Math.hypot(e.position.x-target.x,e.position.y-target.y)>2)return this.drain();
   this.targetObject=null;this.standingAnchor={...e.position};
   if(id==='lamp'||id==='pantry'){this.owner='modal:'+id;this.phase='idle';this.emit('modal',{id});}
   else{this.owner='object:'+id;this.beginStep('align',100,'entering');this.emit('arrival',{id});}
  }
  if(e.type==='MOVE_STOP'&&this.owner==='movement'){this.owner='none';this.phase='idle';this.targetObject=null;}
  if(e.type==='CLOSE_MODAL'&&this.owner.startsWith('modal:')){this.owner='none';this.phase='idle';}
  if(e.type==='CANCEL'){if(this.objectId)this.beginExit(null);else if(this.owner==='movement'){this.epoch++;this.owner='none';this.phase='idle';this.targetObject=null;}}
  if(e.type==='KEYUP'&&this.pendingIntent?.type==='keys'&&!e.keysHeld)this.pendingIntent=null;
  if(e.type==='EXPAND'&&this.phase==='engaged'){this.trayExpanded=!this.trayExpanded;this.emit('tray');}
  if(e.type==='SELECT_FOOD'&&this.objectId==='fridge'&&this.phase==='engaged'&&['milk','water','vitamin'].includes(e.productId)){this.selectedFood=e.productId;this.emit('tray');}
  if(e.type==='ACTION'&&this.phase==='engaged'){
   const id=this.objectId,kind=id==='wardrobe'?'outfit':id==='vanity'?'beauty':null;
   if(kind&&((kind==='outfit'&&['knit','shirt'].includes(e.productId))||(kind==='beauty'&&['serum','cream'].includes(e.productId)))&&e.productId!==e.current){this.epoch++;this.action={id:++this.serial,kind,productId:e.productId,committed:false};this.trayExpanded=false;this.beginStep('gesture',kind==='outfit'?600:500,'acting');this.emit('action-start');}
  }
  if(e.type==='IMMEDIATE'){
   const permitted=(e.kind==='food'&&(this.objectId==='fridge'&&this.phase==='engaged'||this.owner==='modal:pantry')&&['milk','water','vitamin'].includes(e.productId)&&e.quantity>0)||(e.kind==='lamp'&&(this.objectId==='sofa'&&this.phase==='engaged'||this.owner==='modal:lamp'));
   if(permitted&&!this.usedActions.has(e.actionId)){this.usedActions.add(e.actionId);this.emit('commit',{kind:e.kind,productId:e.productId,actionId:e.actionId});}
  }
  if(e.type==='WINDOW_TOGGLE'&&this.objectId==='window'&&this.phase==='engaged'){this.epoch++;const to=1-this.value('window');this.beginStep('toggle',to?300:250,'acting');this.transition('window',to);this.emit('tray');}
  if(e.type==='COMMIT_MARK'&&this.validToken(e)&&this.phase==='acting'&&this.action?.id===e.actionId&&!this.action.committed&&this.elapsed>=this.duration*(this.action.kind==='outfit'?.5:.6)){this.action.committed=true;this.emit('commit',{kind:this.action.kind,productId:this.action.productId,actionId:this.action.id});}
  if(e.type==='STEP_DONE'&&this.validToken(e)&&this.duration>0&&this.elapsed>=this.duration)this.completeStep();
  if(e.type==='HIDE'||e.type==='BLUR'){const modal=this.owner.startsWith('modal:')?this.owner:null;this.reset(true);if(modal)this.owner=modal;this.emit('cleanup');}
  if(e.type==='RESET'){this.reset(false);this.emit('cleanup');}
  return this.drain();
 }
 completeStep(){const id=this.objectId;
  if(this.phase==='exiting'){this.settle(id);const intent=this.pendingIntent;this.pendingIntent=null;this.owner='none';this.phase='idle';this.step='idle';this.action=null;this.standingAnchor=null;this.emit('exit',{id,intent});if(intent)this.emit('intent',{intent});return;}
  if(this.step==='align'){
   if(id==='sofa'||id==='vanity'){this.beginStep('sit',220);this.transition(id,1);}
   else if(id==='window'&&this.objects.window.stable==='open')this.engaged();
   else{this.beginStep('open',id==='wardrobe'?280:300);this.transition(id,1);}return;
  }
  if(this.step==='open'){this.settle(id);if(id==='wardrobe')this.beginStep('browse',450);else if(id==='fridge')this.beginStep('hold-open',250);else this.engaged();return;}
  if(this.step==='sit'){this.settle(id);this.engaged();return;}
  if(this.step==='browse'||this.step==='hold-open'){this.engaged();return;}
  if(this.step==='toggle'){this.settle(id);this.engaged();return;}
  if(this.step==='gesture'){if(id==='wardrobe')this.beginStep('hold',200);else this.engaged();return;}
  if(this.step==='hold'){this.beginExit(null);return;}
 }
 tick(dt){let remaining=Math.max(0,dt);for(let i=0;i<12&&this.objectId&&this.phase!=='engaged'&&remaining>0;i++){
   const advance=Math.min(remaining,Math.max(0,this.duration-this.elapsed));this.elapsed+=advance;remaining-=advance;
   const transition=this.objects[this.objectId].transition;if(transition)transition.progress=clamp(this.elapsed/this.duration);
   if(this.phase==='acting'&&this.action&&!this.action.committed&&this.elapsed>=this.duration*(this.action.kind==='outfit'?.5:.6)){this.effects.push(...this.dispatch({type:'COMMIT_MARK',...this.token(),actionId:this.action.id}));}
   if(this.elapsed>=this.duration){this.effects.push(...this.dispatch({type:'STEP_DONE',...this.token()}));}else break;
  }return this.drain();
 }
 view(){const id=this.objectId,p=this.duration?clamp(this.elapsed/this.duration):0,seat=id==='sofa'||id==='vanity'?this.value(id):0;let pose='idle';if(this.step==='open'||this.step==='toggle'||this.phase==='exiting'&&id!=='sofa'&&id!=='vanity')pose='reach';if(this.step==='browse')pose='browse';if(this.step==='sit')pose='sit-down';if(seat&&this.phase==='engaged')pose='seated-idle';if(this.phase==='exiting'&&(id==='sofa'||id==='vanity'))pose='stand-up';if(this.step==='gesture')pose=id==='wardrobe'?'change-clothes':'use-cosmetic';const offset=OBJECTS[id]?.offset||{x:0,y:0};return {objectId:id,primary:this.primary,phase:this.phase,step:this.step,pose,progress:p,seatProgress:seat,renderOffset:{x:offset.x*seat,y:offset.y*seat},wardrobeOpen:this.value('wardrobe'),fridgeOpen:this.value('fridge'),windowOpen:this.value('window'),browseProgress:this.step==='browse'&&!this.reduced?p:null,selectedFood:this.selectedFood,sofaOccupied:this.objects.sofa.stable==='occupied',vanityOccupied:this.objects.vanity.stable==='occupied',heldProductId:this.step==='gesture'&&id==='vanity'&&p>=.25&&p<.75?this.action?.productId:null};}
}
