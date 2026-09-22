// Category identity/order drives both wardrobe views; Room slots are geometry only.
const SOURCES=Object.freeze({knit:'/products/knit.svg',shirt:'/products/shirt.svg'});
export function garmentPresentation(value){
 const product=value?.product||value;
 const source=product?.imageUrl||SOURCES[product?.illustrationKey];
 const number=value?.displayIndex??product?.displayOrder;
 return (SOURCES[product?.illustrationKey]||product?.imageKind==='product-photo')&&source&&Number.isInteger(number)&&number>0?{source,number}:null;
}
