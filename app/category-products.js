// Category data owns identity, order and state. Screen geometry only consumes it.
export const CATEGORY_HERO_LIMITS=Object.freeze({fashion:4,food:6,living:4,beauty:4});
const roles=new Set(['wardrobe','fridge','pantry','sofa','lamp','vanity','shelf','table','bed']);
const defaultRole={fashion:'wardrobe',food:'shelf',living:'shelf',beauty:'shelf'};
const order=product=>Number.isFinite(product.displayOrder)?product.displayOrder:Number.MAX_SAFE_INTEGER;

/** All owned products remain inspectable even when a representative hero is full. */
export function getCategoryProducts(collection,confirmed=null){
 if(!collection||!Array.isArray(collection.ownedProducts))return [];
 const state=confirmed&&(!confirmed.userId||confirmed.userId===collection.user?.id)?confirmed:null;
 const owned=collection.ownedProducts.filter(p=>p.category===collection.category&&p.catalogSource==='shared-products');
 const outfit=state&&'outfitId' in state?state.outfitId:owned.find(p=>p.state?.wearing)?.id;
 const featuredId=state&&'featuredBeautyId' in state?state.featuredBeautyId:owned.find(p=>p.state?.featured)?.id;
 return [...owned].sort((a,b)=>
  (collection.category==='fashion'?Number(b.id===outfit)-Number(a.id===outfit):0)
  ||order(a)-order(b)||(b.purchasedAt||'').localeCompare(a.purchasedAt||'')||a.id.localeCompare(b.id)
 ).map((product,index)=>{
  const initial=Number.isInteger(product.state?.quantity)&&product.state.quantity>=0?product.state.quantity:0;
  const value=state?.foodQuantity?.[product.id];
  const remaining=collection.category==='food'?(Number.isInteger(value)&&value>=0?Math.min(value,initial):initial):null;
  const featured=collection.category==='beauty'&&product.id===featuredId;
  const role=roles.has(product.presentationRole)?product.presentationRole:defaultRole[collection.category];
  const on=role==='lamp'?(typeof state?.lampOn==='boolean'?state.lampOn:product.state?.on===true):null;
  const applied=(collection.category==='fashion'&&product.id===outfit)||featured||on!==null;
  // A consumer may annotate its view; it must never mutate category-owned data.
  return {id:product.id,productId:product.id,product:structuredClone(product),category:collection.category,
   status:remaining===0?'consumed':applied?'applied':'owned',remaining,featured,on,
   displayIndex:index+1,presentationRole:role,imageUrl:product.imageUrl,
   illustrationKey:product.illustrationKey,artVisible:remaining!==0};
 });
}

/** One representative policy; cart and temporary preview are deliberately not inputs. */
export function getHeroProducts(collection,confirmed=null){
 return getCategoryProducts(collection,confirmed).slice(0,CATEGORY_HERO_LIMITS[collection?.category]??0);
}

/** Includes consumed placeholders; artVisible hides only their physical product artwork. */
export function getRoomMirrorProducts(collection,confirmed=null){
 return getHeroProducts(collection,confirmed);
}
