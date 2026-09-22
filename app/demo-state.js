import {getHeroProducts} from './category-products.js';
// One confirmed state for the fictional user. Rendering keys never identify products.
export const DEMO_STATE_KEY='gscene-main-v1';
export const DEMO_PERSONAL_KEYS=['gscene-scene-fashion-v1','gscene-scene-living-v1','gscene-catalog-food-v1','gscene-catalog-beauty-v1','gscene-food-v1','gscene-room-return-v1'];
const failedStoreSnapshots=new WeakMap();
const avatarId=value=>({short:'m01',wave:'m02',bob:'f01'}[value]||(['m01','m02','f01','f02'].includes(value)?value:'m01'));
const supportsFitting=product=>product&&product.imageKind!=='product-photo'&&['knit','shirt'].includes(product.illustrationKey);
const isPersonaHome=home=>['demo-f01','demo-f02','demo-m01','demo-m02'].includes(home.user.id);
export function personalStateKey(baseKey,homeOrUserId){const id=typeof homeOrUserId==='string'?homeOrUserId:homeOrUserId.user.id;return id==='demo-user'?baseKey:`${baseKey}:${id}`;}
export function demoStateKey(home){return personalStateKey(DEMO_STATE_KEY,home);}
const productId=(home,value,category)=>home.purchases.find(p=>p.category===category&&(p.id===value||p.illustrationKey===value))?.id;
export function initialDemoState(home){return {version:2,userId:home.user.id,outfitId:home.purchases.find(p=>p.category==='fashion'&&p.state.wearing&&supportsFitting(p))?.id||'base',foodQuantity:Object.fromEntries(home.purchases.filter(p=>p.category==='food').map(p=>[p.id,p.state.quantity||0])),lampOn:home.purchases.find(p=>p.category==='living'&&p.presentationRole==='lamp')?.state.on===true,featuredBeautyId:home.purchases.find(p=>p.category==='beauty'&&p.state.featured)?.id||home.purchases.find(p=>p.category==='beauty')?.id||null,avatarRoom:'living',avatarId:avatarId(home.user.avatarId)};}
export function normalizeDemoState(home,saved){
 const state=initialDemoState(home);
 if(!saved||typeof saved!=='object'||Array.isArray(saved)||(saved.userId&&saved.userId!==home.user.id))return state;
 const outfit=home.purchases.find(p=>p.id===productId(home,saved.outfitId,'fashion'));
 state.outfitId=saved.outfitId==='base'?'base':supportsFitting(outfit)?outfit.id:state.outfitId;
 state.featuredBeautyId=productId(home,saved.featuredBeautyId,'beauty')||state.featuredBeautyId;
 if(typeof saved.lampOn==='boolean')state.lampOn=saved.lampOn;
 if(['fashion','food','living','beauty'].includes(saved.avatarRoom))state.avatarRoom=saved.avatarRoom;
 if(saved.avatarId&&!isPersonaHome(home))state.avatarId=avatarId(saved.avatarId);
 for(const p of home.purchases.filter(p=>p.category==='food')){const n=saved.foodQuantity?.[p.id]??saved.foodQuantity?.[p.illustrationKey];if(Number.isInteger(n)&&n>=0&&n<=state.foodQuantity[p.id])state.foodQuantity[p.id]=n;}
 return state;
}
export function readDemoState(home,storage){try{return normalizeDemoState(home,JSON.parse((storage||globalThis.localStorage).getItem(demoStateKey(home))||'null'));}catch{return initialDemoState(home);}}
export function saveDemoState(home,state,storage){try{(storage||globalThis.localStorage).setItem(demoStateKey(home),JSON.stringify(normalizeDemoState(home,state)));return true;}catch{return false;}}
// Apply only the fields owned by this action to the latest confirmed state. A stale
// room/category snapshot must not restore an old outfit or an already consumed food.
export function updateDemoState(home,current,patchOrUpdater,storage){
 let latest=normalizeDemoState(home,current);
 let store,snapshot,read=false;
 try{
  store=storage||globalThis.localStorage;snapshot=store.getItem(demoStateKey(home));read=true;
  // A quota failure can leave readable but stale persisted state behind. Continue
  // from this session until another tab actually changes that stored snapshot.
  const stale=failedStoreSnapshots.has(store)&&failedStoreSnapshots.get(store)===snapshot;
  if(snapshot!==null&&!stale)latest=normalizeDemoState(home,JSON.parse(snapshot));
 }catch{}
 const patch=typeof patchOrUpdater==='function'?patchOrUpdater(latest):patchOrUpdater;
 const state=normalizeDemoState(home,{...latest,...patch,foodQuantity:{...latest.foodQuantity,...patch?.foodQuantity}});
 const saved=saveDemoState(home,state,store||storage);
 if(store){if(saved)failedStoreSnapshots.delete(store);else if(read)failedStoreSnapshots.set(store,snapshot);}
 return {state,saved};
}
export function resetDemoState(home,storage){const state=initialDemoState(home);try{const store=storage||globalThis.localStorage;for(const key of DEMO_PERSONAL_KEYS)store.removeItem(personalStateKey(key,home));saveDemoState(home,state,store);}catch{}return state;}
export function outfitArtKey(home,state){const product=home.purchases.find(p=>p.id===state.outfitId);return supportsFitting(product)?product.illustrationKey:'base';}
// The legacy room renderer/controller accepts a small allowlisted set of poses/art keys.
export function toRoomVisualState(home,state){return {...state,outfitId:outfitArtKey(home,state),featuredBeautyId:home.purchases.find(p=>p.id===state.featuredBeautyId)?.illustrationKey||'serum',foodQuantity:{...state.foodQuantity}};}
export function applyOwnedOutfit(home,state,id){const p=home.purchases.find(p=>p.id===id&&p.category==='fashion'&&supportsFitting(p));return p?normalizeDemoState(home,{...state,outfitId:p.id}):normalizeDemoState(home,state);}
export function consumeOwnedFood(home,state,id){
 const next=normalizeDemoState(home,state);
 if(home.purchases.some(p=>p.id===id&&p.category==='food'))next.foodQuantity[id]=Math.max(0,next.foodQuantity[id]-1);
 return next;
}
// Compatibility for older consumers; representative selection is category-owned.
export function selectWardrobeProducts(home,state,limit=4){
 const count=Number.isInteger(limit)?Math.max(0,Math.min(4,limit)):4;
 return getHeroProducts(home.categories?.fashion,state).slice(0,count).map(entry=>({...entry.product,displayIndex:entry.displayIndex}));
}
