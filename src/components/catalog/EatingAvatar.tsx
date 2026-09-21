'use client';

import { avatarSVG } from '../../../app/avatar.js';
import { outfitArtKey, type DemoState } from '../../../app/demo-state.js';
import type { DemoHome } from '../../types/home';

/** The approved raster frames change as a whole; no limb transforms are applied. */
export default function EatingAvatar({home,confirmed,productId,progress,x,reduced}:{home:DemoHome;confirmed:DemoState;productId:string;progress:number;x:number;reduced:boolean}){
 const art=home.purchases.find(product=>product.id===productId)?.illustrationKey;
 return <div className="sc-room-avatar catalog-eating-avatar" role="img" aria-label="선택한 음식을 먹는 내 캐릭터" data-avatar={confirmed.avatarId} data-outfit-product-id={confirmed.outfitId} data-pose="eat" data-progress={progress.toFixed(3)} style={{left:`${x}%`,bottom:'4%',right:'auto',transform:'translateX(-50%)'}}>
  <svg viewBox="0 0 40 64" aria-hidden="true" dangerouslySetInnerHTML={{__html:avatarSVG(confirmed.avatarId,outfitArtKey(home,confirmed),'down',0,{pose:'eat',progress,heldProductId:art,reduced})}}/>
 </div>;
}
