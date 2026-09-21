// Developer-only deterministic controller driver. Never imports/boots app.js or writes demo state.
import {InteractionController,OBJECTS} from '../../app/interactions.js';
import {APPROACHES,START} from '../../app/movement.js';
import {initialDemoState,outfitArtKey,consumeOwnedFood} from '../../app/demo-state.js';
export const STATES={
 idle:{label:'Idle / full body'},face:{label:'Face / direction'},walk:{label:'Walk frame'},
 'lamp-reach':{object:'lamp',step:'switch',label:'Lamp · reach (220 ms)'},
 'sofa-sit':{object:'sofa',step:'sit',label:'Sofa · sitting down'},
 'sofa-seated':{object:'sofa',engaged:true,label:'Sofa · seated'},
 'sofa-stand':{object:'sofa',exit:true,label:'Sofa · standing up'},
 'vanity-sit':{object:'vanity',step:'sit',label:'Vanity · sitting down'},
 'vanity-seated':{object:'vanity',engaged:true,label:'Vanity · seated back'},
 'vanity-cosmetic':{object:'vanity',action:'cream',label:'Vanity · cosmetic motion'},
 'vanity-stand':{object:'vanity',exit:true,label:'Vanity · standing up'},
 'wardrobe-open':{object:'wardrobe',step:'open',label:'Wardrobe · opening hinge'},
 'wardrobe-browse':{object:'wardrobe',step:'browse',label:'Wardrobe · browsing'},
 'wardrobe-close':{object:'wardrobe',exit:true,label:'Wardrobe · closing hinge'},
 'fridge-open':{object:'fridge',step:'open',label:'Fridge · opening hinge'},
 'fridge-close':{object:'fridge',exit:true,label:'Fridge · closing hinge'},
 'food-eat':{object:'fridge',food:'milk',label:'Fridge · eating (2,400 ms)'},
 'pantry-eat':{object:'pantry',food:'vitamin',label:'Pantry · eating (2,400 ms)'},
 'window-open':{object:'window',step:'toggle',label:'Window · lifting sash'},
 'window-close':{object:'window',toggle:true,label:'Window · lowering sash'},
 'bed-lie':{object:'bed',step:'lie',label:'Bed · lying down'},
 'bed-rest':{object:'bed',engaged:true,label:'Bed · resting'},
 'bed-rise':{object:'bed',exit:true,label:'Bed · getting up'},
};
export function canonicalState(name,progress=.5,{direction='down',outfit='base',home=null}={}){
 const spec=STATES[name];if(!spec)throw new Error('Unknown canonical state');
 const p=Math.max(0,Math.min(1,Number(progress)||0)),controller=new InteractionController();
 let confirmed=home?{...initialDemoState(home),outfitId:outfit==='base'?'base':home.purchases.find(item=>item.id===outfit||item.illustrationKey===outfit)?.id||'base'}:null;
 let actualOutfit=home?outfitArtKey(home,confirmed):outfit;const effects=[];
 const consume=out=>{effects.push(...out);for(const e of out)if(e.type==='commit'&&e.kind==='food'&&home)confirmed=consumeOwnedFood(home,confirmed,e.productId);};
 const advance=dt=>consume(controller.tick(dt));
 const seek=test=>{for(let n=0;n<24&&!test();n++){if(!controller.duration)throw new Error('Controller cannot reach requested step');advance(controller.duration-controller.elapsed);}if(!test())throw new Error('Controller step did not settle');};
 let position={...START},facing=direction;
 if(spec.object){
  position={...APPROACHES[OBJECTS[spec.object].target]};facing=OBJECTS[spec.object].direction;
  consume(controller.dispatch({type:'REQUEST',intent:{type:'object',id:spec.object},position}));
  consume(controller.dispatch({type:'ARRIVED',id:spec.object,epoch:controller.epoch,pathEmpty:true,position}));
  if(spec.engaged||spec.exit||spec.action||spec.toggle||spec.food){seek(()=>controller.phase==='engaged');if(spec.object==='sofa')facing='right';}
  if(spec.exit)consume(controller.dispatch({type:'CANCEL'}));
  else if(spec.action)consume(controller.dispatch({type:'ACTION',productId:spec.action,current:spec.action==='shirt'?'knit':'serum'}));
  else if(spec.toggle)consume(controller.dispatch({type:'WINDOW_TOGGLE'}));
  else if(spec.food){const item=home?.purchases.find(p=>p.category==='food'&&p.illustrationKey===spec.food);if(!item)throw new Error('Eating state needs current canonical home fixture');consume(controller.dispatch({type:'SELECT_FOOD',productId:item.id}));consume(controller.dispatch({type:'EAT',productId:item.id,quantity:confirmed.foodQuantity[item.id]}));}
  else if(spec.step)seek(()=>controller.step===spec.step);
  if(!spec.engaged)advance(controller.duration*p);
 }
 const view=controller.view();
 return {name,label:spec.label,progress:p,position,direction:facing,outfit:actualOutfit,frame:name==='walk'?Math.min(3,Math.floor(p*4)):0,view,confirmed,effects,synthetic:true};
}
