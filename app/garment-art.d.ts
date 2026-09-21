type Garment={illustrationKey?:string;imageUrl?:string;displayOrder?:number;displayIndex?:number};
export function garmentPresentation(product:(Garment&{product?:Garment})|null|undefined):{source:string;number:number}|null;
