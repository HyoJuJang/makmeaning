// Shared by the room's object interactions and the category navigation.
export const CATEGORY_ROUTES=Object.freeze({
 fashion:{href:'/fashion',label:'패션'},
 food:{href:'/food',label:'푸드'},
 living:{href:'/living',label:'리빙'},
 beauty:{href:'/beauty',label:'뷰티'}
});
export const CATEGORY_OBJECTS=Object.freeze({fashion:'wardrobe',food:'fridge',living:'sofa',beauty:'vanity'});
export const OBJECT_CATEGORIES=Object.freeze({wardrobe:'fashion',fridge:'food',pantry:'food',sofa:'living',vanity:'beauty'});
export function readyObjectCategory(controller,id){
 const category=OBJECT_CATEGORIES[id];
 if(!category||controller.objectId!==id||controller.phase!=='engaged'||controller.step!=='wait'||controller.categoryNavigation)return null;
 const object=controller.objects[id];
 if(object?.transition)return null;
 if((id==='wardrobe'||id==='fridge')&&object?.stable!=='open')return null;
 if((id==='sofa'||id==='vanity')&&object?.stable!=='occupied')return null;
 return category;
}
