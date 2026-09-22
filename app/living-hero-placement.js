// Layout only: no ownership, catalog identity or confirmed state is inferred here.
export function livingHeroPlacement(entry,entries){
 const soft=role=>role==='sofa'||role==='bed';
 const peers=entries.filter(item=>soft(entry.presentationRole)?soft(item.presentationRole):item.presentationRole===entry.presentationRole);
 const i=Math.max(0,peers.findIndex(item=>item.id===entry.id));
 const family=entry.product.gameAsset?.familyId;
 if(soft(entry.presentationRole)){
  // A bed pillow can rest on the sofa in the living close-up while remaining
  // the same purchase and the same artwork as the pillow on the main-room bed.
  const pillow=entry.presentationRole==='bed';
  return {
   art:{left:`${32.8+i*16}%`,top:pillow?'21%':'13%',width:pillow?'17%':'13%',height:pillow?'27%':'36%'},
   pin:{left:`${30+i*20}%`,top:'35%'},
  };
 }
 if(entry.presentationRole==='lamp'){
  const tableLamp=entry.product.gameAsset?.status==='ready'&&family?.startsWith('table_lamp');
  if(tableLamp)return {
   art:{left:`${84-i*12}%`,top:'8%',width:'9%',height:'30%'},
   pin:{left:`${90-i*12}%`,top:'33%'},
  };
  return {
   art:{left:`${74+i*12}%`,top:'6%',width:'12%',height:'73%'},
   pin:{left:`${80+i*12}%`,top:'36%'},
  };
 }
 if(entry.presentationRole==='table'){
  const plant=family==='plant';
  return {
   art:{left:`${(plant?40:42)-i*11}%`,top:plant?'45%':'49%',width:plant?'9%':'7%',height:plant?'24%':'20%'},
   pin:{left:`${48-i*11}%`,top:'67%'},
  };
 }
 return {
  art:{left:`${72+i*8}%`,top:'34%',width:'8%',height:'27%'},
  pin:{left:`${76+i*8}%`,top:'29%'},
 };
}
