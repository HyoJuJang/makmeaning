// Reviewed against the representative product photos of all 12 demo purchases.
// These render-only colors do not identify a purchased size/color option.
const PALETTE={white:'#f2f1ef',ivory:'#e7e4d7',light_blue:'#b8c9dc',burgundy:'#632e39',navy:'#242632',gray:'#b8bab9',blue:'#294466',black:'#25262f',green:'#328064'};
const FAMILIES={shirt:['white'],cardigan_round_solid:['light_blue','burgundy'],cardigan_vneck_solid:['navy'],sweatshirt:['ivory','gray']};
const SPECIAL={
 'cardigan_unspecified--fashion-cardigan-vneck-relaxed-blue-cable':{family:'cardigan_unspecified',color:'blue',pattern:'cable',style:'cardigan-v'},
 'cardigan_unspecified--fashion-cardigan-zip-standcollar-black-contrast-trim':{family:'cardigan_unspecified',color:'black',pattern:'contrast_trim',style:'cardigan-zip'},
 'cardigan_unspecified--fashion-cardigan-collared-green-contrast-trim':{family:'cardigan_unspecified',color:'green',pattern:'contrast_trim',style:'cardigan-collared'},
 'hoodie--fashion-hoodie-pullover-gray':{family:'hoodie',color:'gray',pattern:'solid',style:'hoodie'},
 'tee_short--fashion-tee-short-round-white':{family:'tee_short',color:'white',pattern:'solid',style:'tee-short'}
};
const APPEARANCES=new Map();
for(const [family,colors] of Object.entries(FAMILIES)) for(const color of colors){const key=`mapped:${family}:${color}:solid`;APPEARANCES.set(key,Object.freeze({key,family,color,pattern:'solid',style:family==='cardigan_round_solid'?'cardigan-round':family==='cardigan_vneck_solid'?'cardigan-v':family,hex:PALETTE[color]}));}
for(const value of Object.values(SPECIAL)){const key=`mapped:${value.family}:${value.color}:${value.pattern}`;APPEARANCES.set(key,Object.freeze({...value,key,hex:PALETTE[value.color]}));}
const LEGACY={shirt:Object.freeze({key:'shirt',family:'shirt',color:'light_blue',pattern:'solid',style:'legacy',hex:'#8fb0c4'}),knit:Object.freeze({key:'knit',family:'knit',color:'ivory',pattern:'solid',style:'legacy',hex:'#e8dfc9'})};
export const appearanceFromKey=key=>APPEARANCES.get(key)||(Object.hasOwn(LEGACY,key)?LEGACY[key]:null);
export function getOutfitAppearance(product){
 if(!product||product.category!=='fashion')return null;
 const a=product.gameAsset;
 if(a){
  if(a.status!=='ready'||a.domain!=='fashion')return null;
  const special=Object.hasOwn(SPECIAL,a.id)?SPECIAL[a.id]:null;
  if(special){if(a.familyId!==special.family||a.color!==special.color||a.pattern!==special.pattern)return null;}
  else if(a.pattern!=='solid'||!Object.hasOwn(FAMILIES,a.familyId)||!FAMILIES[a.familyId].includes(a.color))return null;
  return APPEARANCES.get(`mapped:${a.familyId}:${a.color}:${a.pattern}`)||null;
 }
 // Old illustration-only demo fixtures retain their intended, explicit art.
 return product.imageKind==='illustration'&&Object.hasOwn(LEGACY,product.illustrationKey)?LEGACY[product.illustrationKey]:null;
}
export const supportsFitting=product=>Boolean(getOutfitAppearance(product));
export const getOwnedOutfitAppearance=(home,id)=>getOutfitAppearance(home?.purchases?.find(p=>p.id===id&&p.category==='fashion'));
