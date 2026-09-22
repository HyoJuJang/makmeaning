// Shared timing for completed consumption in the room and Food category.
export const EATING_DURATION=2400;
export const REDUCED_EATING_DURATION=650;

// Classify the owned product, never its screen position or purchase ID.
export function foodConsumptionMode(product){
 if(product?.category!=='food')return 'eat';
 const asset=product.gameAsset;
 if(asset?.status==='ready'&&asset.domain==='food')return asset.familyId?.startsWith('beverage_')?'drink':'eat';
 return ['milk','water'].includes(product.illustrationKey)?'drink':'eat';
}
export const foodActionLabel=product=>foodConsumptionMode(product)==='drink'?'마시기':'먹기';
