// One generic garment image for the room, Fashion rail and owned-product cards.
// The slot number identifies a demo possession, never an actual color or fitting.
const SOURCES=Object.freeze({knit:'/products/knit.svg',shirt:'/products/shirt.svg'});
export function garmentPresentation(product){
 const source=SOURCES[product?.illustrationKey];
 const slot=/^wardrobe-([1-4])$/.exec(product?.roomSlot||'');
 return source&&slot?{source,number:Number(slot[1])}:null;
}
