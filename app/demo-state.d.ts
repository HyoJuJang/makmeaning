import type { DemoHome, Purchase } from '../src/types/home';
export interface DemoState { version:2; userId:string; outfitId:string; foodQuantity:Record<string,number>; lampOn:boolean; featuredBeautyId:string|null; avatarRoom:string; avatarId:'m01'|'m02'|'f01'|'f02'; }
export interface DemoStorage { getItem(key:string):string|null; setItem(key:string,value:string):void; removeItem(key:string):void; }
export const DEMO_STATE_KEY:string;
export const DEMO_PERSONAL_KEYS:string[];
export function initialDemoState(home:DemoHome):DemoState;
export function normalizeDemoState(home:DemoHome,saved:unknown):DemoState;
export function readDemoState(home:DemoHome,storage?:DemoStorage):DemoState;
export function saveDemoState(home:DemoHome,state:DemoState,storage?:DemoStorage):boolean;
export function updateDemoState(home:DemoHome,current:DemoState,patchOrUpdater:Partial<DemoState>|((latest:DemoState)=>Partial<DemoState>),storage?:DemoStorage):{state:DemoState;saved:boolean};
export function resetDemoState(home:DemoHome,storage?:DemoStorage):DemoState;
export function outfitArtKey(home:DemoHome,state:DemoState):'base'|'knit'|'shirt';
export function toRoomVisualState(home:DemoHome,state:DemoState):DemoState;
export function applyOwnedOutfit(home:DemoHome,state:DemoState,id:string):DemoState;
export function consumeOwnedFood(home:DemoHome,state:DemoState,id:string):DemoState;
export function selectWardrobeProducts(home:DemoHome,state:DemoState,limit?:number):Purchase[];
