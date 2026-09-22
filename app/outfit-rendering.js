// A deliberately small renderer contract, not a guess from catalog photographs.
const PALETTE={white:'#f2f1e9',ivory:'#ddd2b9',light_blue:'#93bbd1',burgundy:'#863f51',navy:'#30465c',gray:'#8c9296',blue:'#557fa9',black:'#30363d'};
const FAMILIES={shirt:['white'],cardigan_round_solid:['light_blue','burgundy'],cardigan_vneck_solid:['navy'],sweatshirt:['ivory','gray']};
const SPECIAL={
 'cardigan_unspecified--fashion-cardigan-vneck-relaxed-blue-cable':{family:'cardigan_unspecified',color:'blue',pattern:'cable',style:'cardigan-v'},
 'cardigan_unspecified--fashion-cardigan-zip-standcollar-black-contrast-trim':{family:'cardigan_unspecified',color:'black',pattern:'contrast_trim',style:'cardigan-zip'}
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
