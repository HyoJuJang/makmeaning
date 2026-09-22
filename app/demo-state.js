// Confirmed state belongs to one fictional customer. Art keys never identify products.
export const DEMO_STATE_KEY='gscene-main-v1';
export const DEMO_PERSONAL_KEYS=['gscene-scene-fashion-v1','gscene-scene-living-v1','gscene-catalog-food-v1','gscene-catalog-beauty-v1','gscene-food-v1','gscene-room-return-v1'];
const avatarId=value=>({short:'m01',wave:'m02',bob:'f01'}[value]||(['m01','m02','f01','f02'].includes(value)?value:'m01'));
const productId=(home,value,category)=>home.purchases.find(p=>p.category===category&&(p.id===value||p.illustrationKey===value))?.id;
const supportsFitting=product=>product&&product.imageKind!=='product-photo'&&['knit','shirt'].includes(product.illustrationKey);
const isPersonaHome=home=>['demo-f01','demo-f02','demo-m01','demo-m02'].includes(home.user.id);
export function personalStateKey(baseKey,homeOrUserId){
 const userId=typeof homeOrUserId==='string'?homeOrUserId:homeOrUserId.user.id;
 return userId==='demo-user'?baseKey:`${baseKey}:${userId}`;
}
export function demoStateKey(home){return personalStateKey(DEMO_STATE_KEY,home);}
export function initialDemoState(home){return {version:2,userId:home.user.id,outfitId:home.purchases.find(p=>p.category==='fashion'&&p.state.wearing&&supportsFitting(p))?.id||'base',foodQuantity:Object.fromEntries(home.purchases.filter(p=>p.category==='food').map(p=>[p.id,p.state.quantity||0])),lampOn:home.purchases.find(p=>p.roomSlot==='lamp-1')?.state.on===true,featuredBeautyId:home.purchases.find(p=>p.category==='beauty'&&p.state.featured)?.id||home.purchases.find(p=>p.category==='beauty')?.id||null,avatarRoom:'living',avatarId:avatarId(home.user.avatarId)};}
export function normalizeDemoState(home,saved){
 const state=initialDemoState(home);
 if(!saved||typeof saved!=='object'||Array.isArray(saved)||(saved.userId&&saved.userId!==home.user.id))return state;
 const outfit=home.purchases.find(p=>p.id===productId(home,saved.outfitId,'fashion'));
 state.outfitId=saved.outfitId==='base'?'base':supportsFitting(outfit)?outfit.id:state.outfitId;
 state.featuredBeautyId=productId(home,saved.featuredBeautyId,'beauty')||state.featuredBeautyId;
 if(typeof saved.lampOn==='boolean')state.lampOn=saved.lampOn;
 if(['fashion','food','living','beauty'].includes(saved.avatarRoom))state.avatarRoom=saved.avatarRoom;
 // Persona identity is selected with the purchase history, never restored from another appearance.
 if(saved.avatarId&&!isPersonaHome(home))state.avatarId=avatarId(saved.avatarId);
 for(const p of home.purchases.filter(p=>p.category==='food')){const n=saved.foodQuantity?.[p.id]??saved.foodQuantity?.[p.illustrationKey];if(Number.isInteger(n)&&n>=0&&n<=state.foodQuantity[p.id])state.foodQuantity[p.id]=n;}
 return state;
}
export function readDemoState(home,storage){try{return normalizeDemoState(home,JSON.parse((storage||globalThis.localStorage).getItem(demoStateKey(home))||'null'));}catch{return initialDemoState(home);}}
export function saveDemoState(home,state,storage){try{(storage||globalThis.localStorage).setItem(demoStateKey(home),JSON.stringify(normalizeDemoState(home,state)));return true;}catch{return false;}}
export function resetDemoState(home,storage){const state=initialDemoState(home);try{const store=storage||globalThis.localStorage;for(const key of DEMO_PERSONAL_KEYS)store.removeItem(personalStateKey(key,home));saveDemoState(home,state,store);}catch{}return state;}
export function outfitArtKey(home,state){const product=home.purchases.find(p=>p.id===state.outfitId);return supportsFitting(product)?product.illustrationKey:'base';}
// The legacy room renderer/controller accepts a small allowlisted set of poses/art keys.
export function toRoomVisualState(home,state){return {...state,outfitId:outfitArtKey(home,state),featuredBeautyId:home.purchases.find(p=>p.id===state.featuredBeautyId)?.illustrationKey||'serum',foodQuantity:Object.fromEntries(home.purchases.filter(p=>p.category==='food').map(p=>[p.illustrationKey,state.foodQuantity[p.id]]))};}
export function fromRoomVisualState(home,state){return normalizeDemoState(home,state);}
export function applyOwnedOutfit(home,state,id){const p=home.purchases.find(p=>p.id===id&&p.category==='fashion'&&supportsFitting(p));return p?normalizeDemoState(home,{...state,outfitId:p.id}):normalizeDemoState(home,state);}
