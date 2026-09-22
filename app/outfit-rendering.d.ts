import type { Purchase, DemoHome } from '../src/types/home';
export type MappedOutfitKey = `mapped:${string}:${string}:${string}`;
export interface OutfitAppearance { key:'knit'|'shirt'|MappedOutfitKey; family:string; color:string; pattern:string; style:string; hex:string; }
export function appearanceFromKey(key:unknown):OutfitAppearance|null;
export function getOutfitAppearance(product:Purchase|null|undefined):OutfitAppearance|null;
export function supportsFitting(product:Purchase|null|undefined):boolean;
export function getOwnedOutfitAppearance(home:DemoHome,id:string):OutfitAppearance|null;
