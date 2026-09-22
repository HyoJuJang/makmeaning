export interface PersonaChoice {id:string;name:string;theme?:string;avatarId?:string;}
export interface PersonaHome {user:{id:string};personas?:PersonaChoice[];}
export const PERSONA_COOKIE:string;
export const PERSONA_SIGNAL_KEY:string;
export const PERSONA_IDS:string[];
export function personaStorageKey(baseKey:string,user:string|{id:string}|{user:{id:string}}):string;
export function selectedPersona(cookie:string):string;
export function personaCookie(id:string,secure?:boolean):string;
export function personaChoices(home:PersonaHome):PersonaChoice[];
export function switchPersona(id:string):void;
export function watchPersona(userId:string,onMismatch?:()=>void):()=>void;
export function mountPersonaSelector(home:PersonaHome,before:Element|null):HTMLFormElement|undefined;
