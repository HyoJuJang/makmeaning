// Fictional demo profiles only. This preference is not authentication.
export const PERSONA_COOKIE='gscene-persona';
export const PERSONA_SIGNAL_KEY='gscene-persona-selection-v1';
export const PERSONA_IDS=['demo-f01','demo-f02','demo-m01','demo-m02'];
export function personaStorageKey(baseKey,user){
 const id=typeof user==='string'?user:user?.user?.id||user?.id;
 if(typeof id!=='string'||!id)throw new Error('A profile is required for personal storage');
 return id==='demo-user'?baseKey:`${baseKey}:${encodeURIComponent(id)}`;
}
export function selectedPersona(cookie){
 // Match the server's source selector so an encoded or ambiguous cookie cannot
 // make the loaded page disagree with this watcher and repeatedly reload.
 const values=String(cookie||'').split(';').map(part=>part.trim()).filter(part=>part.startsWith(`${PERSONA_COOKIE}=`));
 if(values.length===1){try{const value=decodeURIComponent(values[0].slice(PERSONA_COOKIE.length+1));if(PERSONA_IDS.includes(value))return value;}catch{}}
 return 'demo-f01';
}
export function personaCookie(id,secure=false){
 if(!PERSONA_IDS.includes(id))throw new Error('Unknown demo profile');
 return `${PERSONA_COOKIE}=${id}; Path=/; Max-Age=2592000; SameSite=Lax${secure?'; Secure':''}`;
}
export function personaChoices(home){
 if(!PERSONA_IDS.includes(home?.user?.id)||!Array.isArray(home?.personas))return [];
 const ids=new Set();
 return home.personas.filter(persona=>{
  if(!PERSONA_IDS.includes(persona?.id)||ids.has(persona.id)||typeof persona.name!=='string'||!persona.name.trim())return false;
  ids.add(persona.id);return true;
 }).map(persona=>({id:persona.id,name:persona.name.trim().slice(0,40),theme:typeof persona.theme==='string'?persona.theme.slice(0,80):''}));
}
export function switchPersona(id){
 // Set only the allowlisted preference. No purchase, asset or credential data enters the cookie.
 document.cookie=personaCookie(id,location.protocol==='https:');
 if(selectedPersona(document.cookie)!==id)throw new Error('Profile preference could not be stored');
 try{localStorage.setItem(PERSONA_SIGNAL_KEY,`${id}:${Date.now()}`);}catch{}
 location.assign('/');
}
export function watchPersona(userId,onMismatch=()=>location.replace('/')){
 if(!PERSONA_IDS.includes(userId))return ()=>{};
 let leaving=false;
 const verify=()=>{if(!leaving&&selectedPersona(document.cookie)!==userId){leaving=true;onMismatch();}};
 const storage=event=>{if(event.key===PERSONA_SIGNAL_KEY||event.key===null)verify();};
 window.addEventListener('pageshow',verify);window.addEventListener('focus',verify);window.addEventListener('storage',storage);
 verify();
 return ()=>{window.removeEventListener('pageshow',verify);window.removeEventListener('focus',verify);window.removeEventListener('storage',storage);};
}
/** Main-room counterpart of the React selector, using text nodes for API copy. */
export function mountPersonaSelector(home,before){
 const choices=personaChoices(home);if(choices.length<2||!before)return;
 const form=document.createElement('form');form.className='gs-persona-selector';form.setAttribute('aria-label','데모 구매자 선택');
 const label=document.createElement('label');label.className='gs-persona-label';label.htmlFor='room-persona';label.textContent='체험할 공간';
 const select=document.createElement('select');select.id='room-persona';select.name='persona';select.setAttribute('aria-label','체험할 구매자');
 for(const choice of choices){const option=document.createElement('option');option.value=choice.id;option.textContent=choice.name;select.append(option);}
 select.value=home.user.id;
 const apply=document.createElement('button');apply.type='submit';apply.disabled=true;apply.textContent='현재 공간';
 const hint=document.createElement('p');hint.className='gs-persona-hint';hint.textContent=choices.find(choice=>choice.id===home.user.id)?.theme||'구매자마다 다른 물건이 놓여 있어요';
 const error=document.createElement('p');error.className='gs-persona-error';error.setAttribute('role','alert');error.hidden=true;
 select.addEventListener('change',()=>{const changed=select.value!==home.user.id;apply.disabled=!changed;apply.textContent=changed?'이 공간 보기':'현재 공간';hint.textContent=choices.find(choice=>choice.id===select.value)?.theme||'구매자마다 다른 물건이 놓여 있어요';error.hidden=true;});
 form.addEventListener('submit',event=>{event.preventDefault();if(select.value===home.user.id)return;try{switchPersona(select.value);}catch{error.textContent='공간 선택을 저장하지 못했어요. 브라우저의 쿠키 설정을 확인해 주세요.';error.hidden=false;}});
 form.append(label,select,apply,hint,error);before.before(form);return form;
}
