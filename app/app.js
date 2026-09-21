import {InteractionController,OBJECTS} from './interactions.js';
import {objectArt} from './object-art.js';
import {SCENE_SITUATIONS,SCENE_BUDGETS,validScene,scenePreview,sceneContext,sceneArt,sceneSheetHTML} from './scene-entry.js';
import {AVATARS,avatarById,avatarSVG} from './avatar.js';
import {START,APPROACHES,isWalkable,findPath,moveWithCollision} from './movement.js';
const KEY='gscene-main-v1';
const LEGACY_AVATARS=new Map([['short','m01'],['wave','m02'],['bob','f01']]);
const canonicalAvatarId=id=>LEGACY_AVATARS.get(id)||id;
const escapeHTML=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const SLOT_CATEGORIES={'wardrobe-1':'fashion','wardrobe-2':'fashion','fridge-1':'food','fridge-2':'food','pantry-1':'food','sofa-1':'living','lamp-1':'living','vanity-1':'beauty','vanity-2':'beauty'};
const SLOT_PRODUCT_KEYS={'wardrobe-1':'knit','wardrobe-2':'shirt','fridge-1':'milk','fridge-2':'water','pantry-1':'vitamin','sofa-1':'cushion','lamp-1':'lamp','vanity-1':'serum','vanity-2':'cream'};
const PRODUCT_KEYS=new Set(['knit','shirt','milk','water','vitamin','cushion','lamp','serum','cream']);
function validateHome(data){
 if(!data||typeof data.user?.id!=='string'||!data.user.id||typeof data.user.name!=='string'||!data.user.name.trim()||!Array.isArray(data.purchases))throw new Error('Invalid home response');
 const ids=new Set(),slots=new Set();
 const purchases=data.purchases.map(p=>{
  if(!p||!PRODUCT_KEYS.has(p.id)||ids.has(p.id)||slots.has(p.roomSlot)||SLOT_PRODUCT_KEYS[p.roomSlot]!==p.id||SLOT_CATEGORIES[p.roomSlot]!==p.category||typeof p.name!=='string'||!p.name.trim()||!Number.isFinite(p.price)||p.price<0||typeof p.purchasedAt!=='string'||p.illustrationKey!==p.id||!p.state||typeof p.state!=='object')throw new Error('Invalid purchase response');
  if(p.category==='food'&&(!Number.isInteger(p.state.quantity)||p.state.quantity<0||p.state.quantity>99))throw new Error('Invalid food quantity');
  ids.add(p.id);slots.add(p.roomSlot);
  return {...p,name:p.name.slice(0,100),purchasedAt:p.purchasedAt.slice(0,30),imageUrl:typeof p.imageUrl==='string'&&/^\/products\/[a-z0-9-]+\.svg$/.test(p.imageUrl)?p.imageUrl:`/products/${p.illustrationKey}.svg`};
 });
 if(Object.values(SLOT_CATEGORIES).some(category=>purchases.filter(p=>p.category===category).length<2)||ids.size!==PRODUCT_KEYS.size)throw new Error('Incomplete demo home');
 return {user:{id:data.user.id,name:data.user.name.trim().slice(0,40),avatarId:avatarById(canonicalAvatarId(data.user.avatarId)).id},purchases};
}
async function loadHome(){
 const app=document.querySelector('#app'),loader=document.querySelector('#home-load-state');
 const controls=[...app.querySelectorAll('button')].filter(button=>!loader.contains(button));
 app.dataset.homeState='loading';app.setAttribute('aria-busy','true');controls.forEach(button=>button.disabled=true);
 while(true){
  loader.hidden=false;loader.innerHTML='<span class="loading-orbit" aria-hidden="true"></span><strong>나의 공간을 준비하고 있어요</strong><p>구매한 물건을 제자리에 놓는 중</p>';
  const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),10000);
  try{
   const response=await fetch('/api/demo/home',{signal:abort.signal,cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)throw new Error(`Home request failed: ${response.status}`);
   const home=validateHome(await response.json());
   loader.hidden=true;app.dataset.homeState='ready';app.setAttribute('aria-busy','false');controls.forEach(button=>button.disabled=false);return home;
  }catch{
   app.dataset.homeState='error';app.setAttribute('aria-busy','false');
   loader.innerHTML='<span class="load-error-mark" aria-hidden="true">↻</span><strong>공간을 불러오지 못했어요</strong><p>연결을 확인한 뒤 다시 시도해 주세요.</p><button type="button" id="retry-home">다시 불러오기</button>';
   document.querySelector('#status').textContent='공간을 불러오지 못했어요. 다시 불러오기를 눌러 주세요.';
   await new Promise(resolve=>loader.querySelector('#retry-home').addEventListener('click',resolve,{once:true}));
   app.dataset.homeState='loading';app.setAttribute('aria-busy','true');
  }finally{clearTimeout(timeout);}
 }
}
const home=await loadHome();
const products=home.purchases;
const initial=()=>({outfitId:'base',foodQuantity:Object.fromEntries(products.filter(p=>p.category==='food').map(p=>[p.id,p.state.quantity])),lampOn:products.find(p=>p.id==='lamp')?.state.on===true,featuredBeautyId:products.find(p=>p.category==='beauty'&&p.state.featured)?.id||products.find(p=>p.category==='beauty').id,avatarRoom:'living',avatarId:home.user.avatarId});
let state=initial();
try{
 const saved=JSON.parse(localStorage.getItem(KEY));
 if(saved&&typeof saved==='object'){
  if(saved.outfitId==='base'||products.some(p=>p.category==='fashion'&&p.id===saved.outfitId))state.outfitId=saved.outfitId;
  if(products.some(p=>p.category==='beauty'&&p.id===saved.featuredBeautyId))state.featuredBeautyId=saved.featuredBeautyId;
  if(['fashion','food','living','beauty'].includes(saved.avatarRoom))state.avatarRoom=saved.avatarRoom;
  if(typeof saved.lampOn==='boolean')state.lampOn=saved.lampOn;
  for(const id of Object.keys(state.foodQuantity)){const quantity=saved.foodQuantity?.[id];if(Number.isInteger(quantity)&&quantity>=0&&quantity<=state.foodQuantity[id])state.foodQuantity[id]=quantity;}
  const savedAvatarId=canonicalAvatarId(saved.avatarId);
  if(AVATARS.some(avatar=>avatar.id===savedAvatarId))state.avatarId=savedAvatarId;
 }
}catch{}
document.querySelector('h1').innerHTML=`${escapeHTML(home.user.name)}의 작은 일상<span>.</span>`;
document.querySelector('.home-section').setAttribute('aria-label',`${home.user.name}의 연결된 원룸`);
document.querySelector('#purchase-summary').textContent=`구매한 물건 ${products.length}개가 함께하는 공간`;
document.title=`G:Scene — ${home.user.name}의 공간`;
let active=null,returnFocus=null,draftAvatar=null;
let sceneSituation=null,sceneBudget=null,sceneStep='choose';
const icons={knit:'<path d="M17 8 8 13 2 29l9 4 5-9v28h28V24l5 9 9-4-6-16-9-5-7 5h-12Z" fill="#e5ddc6"/><path d="M24 9q6 12 12 0M18 46h24M18 49h24" fill="none" stroke="#c3b898" stroke-width="2"/>',shirt:'<path d="m17 8-9 5-6 16 9 4 5-9v28h28V24l5 9 9-4-6-16-9-5-13 4Z" fill="#93afbe"/><path d="m23 9 7 6 7-6M30 15v36M35 24h6v7h-6Z" fill="none" stroke="#648493" stroke-width="1.5"/>',milk:'<path d="m19 9 7-7h16l5 9v44H19Z" fill="#f5f1db"/><path d="M19 11h28v13H19Z" fill="#7c9a8c"/><path d="m19 9 7-7v9M26 2l6 9h15" fill="none" stroke="#bec8b4"/><text x="23" y="36" font-size="8" fill="#678571">MILK</text>',water:'<rect x="24" y="3" width="13" height="6" rx="2" fill="#7d9f9e"/><path d="m24 9-5 10v31q0 5 5 5h14q5 0 5-5V19L37 9Z" fill="#c5dcdb"/><path d="M20 31h22v13H20Z" fill="#f5f6e9"/><path d="M25 18v10" stroke="#f4fbef" stroke-width="3" stroke-linecap="round"/>',vitamin:'<rect x="19" y="8" width="25" height="9" rx="3" fill="#ded9c7"/><rect x="17" y="17" width="29" height="38" rx="6" fill="#ad8552"/><rect x="19" y="27" width="25" height="18" rx="1" fill="#f1ead9"/><path d="M31 31v10M26 36h10" stroke="#859574" stroke-width="2"/>',cushion:'<rect x="8" y="11" width="43" height="40" rx="10" fill="#829471" transform="rotate(-6 30 30)"/><rect x="12" y="15" width="35" height="32" rx="7" fill="none" stroke="#a4b191"/>',lamp:'<path d="M28 23h4v29H28Z" fill="#9b7752"/><ellipse cx="30" cy="53" rx="15" ry="3" fill="#947652"/><path d="m19 5-8 21h38L41 5Z" fill="#e6d5a5"/><ellipse cx="30" cy="26" rx="19" ry="3" fill="#c9b882"/>',serum:'<rect x="22" y="5" width="16" height="6" rx="2" fill="#526c59"/><path d="M30 2h13v4H30v9" fill="none" stroke="#526c59" stroke-width="3"/><rect x="18" y="14" width="25" height="40" rx="5" fill="#b4c3a1"/><rect x="20" y="27" width="21" height="16" rx="1" fill="#edf0de"/><path d="M26 32h9M27 36h7" stroke="#7a8f70"/>',cream:'<rect x="11" y="28" width="39" height="25" rx="7" fill="#e6dbbf"/><rect x="9" y="22" width="43" height="10" rx="4" fill="#698372"/><path d="M20 40h21M23 44h15" stroke="#b5a887"/>'};
const ROOM_PLACEMENTS={'sofa-1':{x:43,y:315,w:62,h:62},'lamp-1':{x:331,y:405,w:43,h:50},'vanity-1':{x:316,y:224,w:27,h:32},'vanity-2':{x:341,y:233,w:28,h:29}};
const SLOT_LABELS={'wardrobe-1':'옷장','wardrobe-2':'옷장','fridge-1':'냉장고','fridge-2':'냉장고','pantry-1':'팬트리','sofa-1':'소파','lamp-1':'거실 스탠드','vanity-1':'화장대','vanity-2':'화장대'};
function placedPurchases(){return products.filter(p=>ROOM_PLACEMENTS[p.roomSlot]).map(p=>{const {x,y,w,h}=ROOM_PLACEMENTS[p.roomSlot];return `<g data-room-product="${p.id}" data-room-slot="${p.roomSlot}" data-category="${p.category}" aria-label="${escapeHTML(p.name)} · ${SLOT_LABELS[p.roomSlot]}"><title>${escapeHTML(p.name)} · ${SLOT_LABELS[p.roomSlot]}</title><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 60 60">${icons[p.illustrationKey]}</svg></g>`;}).join('');}
function renderHouse(){
 const house=document.querySelector('#house');
 if(!document.querySelector('.room-art'))house.innerHTML=`<img class="room-art" src="/assets/gather-room.png" alt="햇살이 드는 하나의 원룸. 왼쪽 옷장과 침대, 오른쪽 냉장고와 화장대, 아래쪽 소파와 조명이 놓여 있어요." draggable="false"><svg class="object-art" viewBox="0 0 400 600" aria-hidden="true"></svg><svg class="purchase-layer" viewBox="0 0 400 600" aria-label="구매한 생활·뷰티 상품"></svg><svg class="state-layer" viewBox="0 0 400 600" aria-hidden="true"></svg><div class="destination-mark" hidden></div><div class="walker" aria-label="민서 캐릭터"><svg viewBox="0 0 40 64" aria-hidden="true"></svg></div>`;
 document.querySelector('.purchase-layer').innerHTML=placedPurchases();
 document.querySelector('.state-layer').innerHTML=`<ellipse cx="352" cy="435" rx="38" ry="55" fill="url(#roomGlow)" opacity="${state.lampOn?'.65':'0'}"/><defs><radialGradient id="roomGlow"><stop stop-color="#ffe08a"/><stop offset="1" stop-color="#ffe08a" stop-opacity="0"/></radialGradient></defs><path d="M341 419h21v18h-21z" fill="#3b4545" opacity="${state.lampOn?'0':'.55'}"/><g class="beauty-selection" opacity="${controller.view().heldProductId?0:1}"><ellipse cx="${state.featuredBeautyId==='serum'?330:354}" cy="254" rx="12" ry="3" fill="#718b66" opacity=".45"/><rect x="315" y="257" width="55" height="14" rx="4" fill="#f8f4e9" fill-opacity=".92"/><text x="343" y="267" text-anchor="middle" font-size="8.5" fill="#284b3c">${state.featuredBeautyId==='serum'?'세럼':'크림'} 꺼냄</text></g>`;
 if(typeof paintActor==='function')paintActor(true);paintObjects(true);
}
function persist(message){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}renderHouse();document.querySelector('#status').textContent=message;}
const roomInfo={fashion:['Fashion','내 옷장','오늘의 나에게 어울리는 옷을 골라보세요.'],food:['Food','내 냉장고','하나씩 꺼내 쓰는, 나를 위한 작은 습관.'],living:['Living','내 거실','좋아하는 물건과 편안하게 쉬어가는 시간.'],beauty:['Beauty','내 화장대','오늘 사용할 물건을 가까이 꺼내두세요.']};
function productHTML(p,category=active){let label='',disabled=false,meta=`${escapeHTML(p.purchasedAt)} 구매 · ${SLOT_LABELS[p.roomSlot]}`;
 if(category==='fashion'){label=state.outfitId===p.id?'입고 있어요':'입어보기';disabled=state.outfitId===p.id;}
 if(category==='food'){meta+=` · 남은 수량 ${state.foodQuantity[p.id]}개`;label=state.foodQuantity[p.id]?'하나 사용하기':'다 사용했어요';disabled=!state.foodQuantity[p.id];}
 if(category==='living'&&p.id==='lamp')label=state.lampOn?'조명 끄기':'조명 켜기';
 if(category==='beauty'){label=state.featuredBeautyId===p.id?'꺼내두었어요':'꺼내두기';disabled=state.featuredBeautyId===p.id;}
 return `<div class="product" data-product="${p.id}" data-room-slot="${p.roomSlot}"><div class="thumb" aria-hidden="true"><img src="${p.imageUrl}" alt="" width="60" height="60" loading="lazy" data-illustration="${p.illustrationKey}"></div><div class="product-info">${category==='food'&&controller.objectId==='fridge'?`<button class="food-select" data-food-select="${p.id}" aria-pressed="${controller.selectedFood===p.id}">${escapeHTML(p.name)}</button>`:`<h3 class="product-name">${escapeHTML(p.name)}</h3>`}<p class="product-meta">${meta}</p><p class="product-meta product-price">예시 가격 ${p.price.toLocaleString('ko-KR')}원</p>${p.id==='cushion'?'<p class="product-meta">소파에 놓여 있어요</p>':''}</div>${label?`<button class="action" data-action="${p.id}" aria-label="${escapeHTML(p.name)} ${label}" ${disabled?'disabled':''}>${label}</button>`:''}</div>`;
}
function renderProducts(){document.querySelector('.product-list').innerHTML=products.filter(p=>p.category===active).map(p=>productHTML(p,active)).join('');}
function openRoom(room,trigger){stopMovement();inform(`${roomInfo[room][1]}에 도착했어요`);active=room;returnFocus=trigger;state.avatarRoom=room;persist(`${roomInfo[room][1]}으로 이동했어요`);const info=roomInfo[room];document.querySelector('#modal-root').innerHTML=`<div class="overlay"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" aria-describedby="sheet-desc"><div class="handle"></div><div class="sheet-head"><div><span class="sheet-eyebrow">${info[0].toUpperCase()} / MY OBJECTS</span><h2 id="sheet-title">${info[1]}</h2></div><button class="close" aria-label="닫기">×</button></div><p class="sheet-desc" id="sheet-desc">${info[2]}</p><div class="sheet-content"><h3 class="list-heading">구매한 물건 · ${products.filter(p=>p.category===room).length}</h3><div class="product-list"></div></div><p class="sheet-note">가상 고객의 예시 구매 데이터 · 변화는 나의 공간에 저장돼요</p></section></div>`;renderProducts();document.body.style.overflow='hidden';document.querySelector('#app').inert=true;document.querySelector('.close').focus();}
function closeRoom(){controller.dispatch({type:'CLOSE_MODAL'});active=null;draftAvatar=null;document.querySelector('#modal-root').innerHTML='';document.body.style.overflow='';document.querySelector('#app').inert=false;returnFocus?.focus();inform('바닥을 눌러 이동 · 가구를 눌러 사용');}
function renderSceneSheet(){document.querySelector('#modal-root').innerHTML=sceneSheetHTML(sceneSituation,sceneBudget,sceneStep);}
function showScene(){stopMovement();paintActor();active='scene';sceneStep='choose';returnFocus=document.querySelector('#scene-entry');renderSceneSheet();document.body.style.overflow='hidden';document.querySelector('#app').inert=true;document.querySelector('.close').focus();}
function updateSceneChoice(){document.querySelectorAll('[data-scene-situation]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.sceneSituation===sceneSituation)));document.querySelectorAll('[data-scene-budget]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.sceneBudget)===sceneBudget)));document.querySelector('.scene-preview-copy').textContent=scenePreview(sceneSituation,sceneBudget);document.querySelector('.scene-preview-art').innerHTML=sceneArt(sceneSituation);document.querySelector('.scene-preview-context').textContent=sceneContext(sceneSituation);document.querySelector('[data-scene-action="start"]').disabled=!validScene(sceneSituation,sceneBudget);}
function handleSceneClick(target){
 const situation=target.closest('[data-scene-situation]'),budget=target.closest('[data-scene-budget]'),action=target.closest('[data-scene-action]')?.dataset.sceneAction;
 if(situation&&SCENE_SITUATIONS.some(item=>item.id===situation.dataset.sceneSituation)){sceneSituation=situation.dataset.sceneSituation;updateSceneChoice();}
 if(budget&&SCENE_BUDGETS.includes(Number(budget.dataset.sceneBudget))){sceneBudget=Number(budget.dataset.sceneBudget);updateSceneChoice();}
 if(action==='start'&&validScene(sceneSituation,sceneBudget)){sceneStep='summary';renderSceneSheet();document.querySelector('#sheet-title').focus();}
 if(action==='edit'){sceneStep='choose';renderSceneSheet();document.querySelector(`[data-scene-situation="${sceneSituation}"]`).focus();}
 if(action==='return')closeRoom();
}
document.querySelector('#scene-entry').addEventListener('click',()=>requestIntent({type:'modal',id:'scene'}));
function renderAvatarChoices(){document.querySelector('.avatar-choices').innerHTML=AVATARS.map(a=>`<button class="avatar-choice" data-avatar="${a.id}" aria-pressed="${draftAvatar===a.id}"><span class="avatar-preview"><svg viewBox="0 0 40 64" aria-hidden="true">${avatarSVG(a.id,'base')}</svg><span class="selection-tick" aria-hidden="true">✓</span></span><strong>${a.name}</strong><small>${a.note}</small></button>`).join('');}
function showAvatarPicker(){stopMovement();paintActor();active='avatar';draftAvatar=state.avatarId;returnFocus=document.querySelector('#avatar-picker');document.querySelector('#modal-root').innerHTML=`<div class="overlay"><section class="sheet avatar-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" aria-describedby="sheet-desc"><div class="handle"></div><div class="sheet-head"><div><span class="sheet-eyebrow">MY CHARACTER</span><h2 id="sheet-title">내 공간 속의 나</h2></div><button class="close" aria-label="닫기">×</button></div><p class="sheet-desc" id="sheet-desc">마음에 드는 모습으로 골라보세요.</p><div class="sheet-content"><div class="avatar-choices"></div><p class="avatar-outfit-note">${state.outfitId==='base'?'캐릭터마다 어울리는 기본 옷으로 시작해요.':'미리보기는 기본 옷, 지금 고른 착장은 그대로 유지돼요.'}</p></div><button class="apply-avatar">이 캐릭터로 적용하기</button></section></div>`;renderAvatarChoices();document.body.style.overflow='hidden';document.querySelector('#app').inert=true;document.querySelector(`[data-avatar="${draftAvatar}"]`).focus();}
document.querySelector('#avatar-picker').addEventListener('click',()=>requestIntent({type:'modal',id:'avatar'}));
// One controller owns object sequences; the existing pathfinder owns foot geometry.
let position={...START},direction='down',walking=false,path=[],pendingInteraction=null;
let lastTime=0,walkClock=0,lastSprite='',keys=new Set(),pressPulses=new Set(),lastObjects='',lastTray='',activation=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const controller=new InteractionController({reduced});
const scene=document.querySelector('.house-wrap');
scene.tabIndex=0;scene.setAttribute('role','group');scene.setAttribute('aria-label','나의 원룸. 바닥을 누르거나 방향키, WASD로 이동하세요');
const categoryObject={fashion:'wardrobe',food:'fridge',living:'sofa',beauty:'vanity'};
const keyVector={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]};
let objectTrigger=null;
function inform(text){document.querySelector('#status').textContent=text;document.querySelector('.touch-hint').textContent=text;}
function stopMovement(){path=[];pendingInteraction=null;keys.clear();pressPulses.clear();walking=false;const marker=document.querySelector('.destination-mark');if(marker)marker.hidden=true;}
function requestIntent(intent){if(active)return;handleEffects(controller.dispatch({type:'REQUEST',intent,position}));renderTray();paintActor();paintObjects();}
function handleEffects(effects){for(const effect of effects){
 if(effect.type==='invalid')inform('가구 옆의 빈 바닥을 눌러주세요');
 if(effect.type==='navigate'){
  const held=new Set(keys);stopMovement();if(effect.intent.type==='keys'){keys=held;continue;}
  path=findPath(position,effect.target)||[];pendingInteraction=effect.intent.type==='object'?{id:effect.intent.id,epoch:effect.epoch,trigger:effect.intent.trigger}:null;
  if(!path.length){controller.dispatch({type:'MOVE_STOP'});continue;}
  const marker=document.querySelector('.destination-mark');marker.hidden=false;marker.style.left=effect.target.x/4+'%';marker.style.top=effect.target.y/6+'%';
  inform(effect.intent.type==='object'?`${OBJECTS[effect.intent.id]?.name|| (effect.intent.id==='lamp'?'스탠드':'팬트리')} 쪽으로 걸어가는 중`:'선택한 곳으로 걸어가는 중');
 }
 if(effect.type==='arrival'){stopMovement();direction=OBJECTS[effect.id].direction;renderTray(true);paintActor(true);ensureInteractionVisible();document.querySelector('#tray-title')?.focus({preventScroll:true});}
 if(effect.type==='engaged'){if(effect.id==='sofa')direction='right';if(effect.id==='vanity')direction='up';renderTray(true);inform(trayStatus());}
 if(effect.type==='action-start'){renderTray(true);ensureInteractionVisible();}
 if(effect.type==='tray')renderTray(true);
 if(effect.type==='commit'){commitProduct(effect);renderTray(true);}
 if(effect.type==='exit'){renderTray(true);if(!effect.intent){scene.focus({preventScroll:true});inform('바닥을 눌러 이동 · 가구를 눌러 사용');}}
 if(effect.type==='intent')requestIntent(effect.intent);
 if(effect.type==='modal'){stopMovement();renderTray(true);if(effect.id==='scene')showScene();else if(effect.id==='avatar')showAvatarPicker();else openRoom(effect.id==='lamp'?'living':'food',objectTrigger);}
 if(effect.type==='cleanup'){stopMovement();renderTray(true);paintActor(true);paintObjects(true);}
}}
function commitProduct({kind,productId}){let message='';if(kind==='outfit'){state.outfitId=productId;message=`${products.find(p=>p.id===productId).name}를 입었어요`;}if(kind==='beauty'){state.featuredBeautyId=productId;message=`${products.find(p=>p.id===productId).name}을 꺼내두었어요`;}if(kind==='food'){state.foodQuantity[productId]=Math.max(0,state.foodQuantity[productId]-1);message=`${products.find(p=>p.id===productId).name} ${state.foodQuantity[productId]}개 남았어요`;}if(kind==='lamp'){state.lampOn=!state.lampOn;message=state.lampOn?'조명을 켰어요':'조명을 껐어요';}persist(message);if(active==='food'||active==='living')renderProducts();}
function productAction(id){const category=controller.objectId?OBJECTS[controller.objectId].category:active;if(category==='fashion'||category==='beauty')handleEffects(controller.dispatch({type:'ACTION',productId:id,current:category==='fashion'?state.outfitId:state.featuredBeautyId}));else if(category==='food')handleEffects(controller.dispatch({type:'IMMEDIATE',kind:'food',productId:id,quantity:state.foodQuantity[id],actionId:++activation}));else if(category==='living'&&id==='lamp')handleEffects(controller.dispatch({type:'IMMEDIATE',kind:'lamp',actionId:++activation}));renderTray();}
function trayStatus(){const id=controller.objectId;if(!id)return '';if(controller.phase==='exiting')return id==='sofa'||id==='vanity'?'일어나는 중':'마무리하는 중';if(controller.phase==='acting')return id==='wardrobe'?'옷 갈아입는 중':id==='vanity'?'화장품 꺼내는 중':'창문 움직이는 중';if(controller.phase==='entering')return controller.step==='browse'?'옷을 살펴보는 중':id==='sofa'||id==='vanity'?'자리에 앉는 중':'손을 뻗는 중';return {wardrobe:'옷장이 열렸어요',fridge:'냉장고를 살펴봐요',sofa:'앉아 쉬는 중',vanity:'화장대에 앉았어요',window:controller.objects.window.stable==='open'?'창문을 열었어요':'창문이 닫혀 있어요'}[id];}
function renderTray(force=false){const id=controller.objectId,root=document.querySelector('#tray-root');const stamp=JSON.stringify([id,controller.phase,controller.step,controller.trayExpanded,controller.selectedFood,state,controller.objects.window.stable]);if(!force&&stamp===lastTray)return;lastTray=stamp;if(!id){root.innerHTML='';return;}const object=OBJECTS[id],busy=controller.phase!=='engaged',expanded=controller.trayExpanded&&!busy;const focused=document.activeElement?.dataset;const focusAction=focused?.action,focusFood=focused?.foodSelect,focusTray=focused?.tray;
 root.innerHTML=`<section data-object="${id}" data-phase="${controller.phase}" class="context-tray ${expanded?'expanded':''}" aria-label="${object.name} 사용"><div class="tray-head"><h2 id="tray-title" tabindex="-1">${trayStatus()}</h2>${id==='window'?`<button data-tray="window" ${busy?'disabled':''}>${controller.objects.window.stable==='open'?'창문 닫기':'창문 열기'}</button>`:`<button data-tray="expand" aria-expanded="${expanded}" aria-label="${expanded?'상품 목록 접기':object.button}" ${busy?'disabled':''}>${expanded?'접기':object.button}</button>`}<button class="tray-exit" data-tray="exit" aria-label="${object.exit}" title="${object.exit}">×</button></div>${expanded?`<div class="tray-products">${products.filter(p=>p.category===object.category).map(p=>productHTML(p,object.category)).join('')}</div>`:''}</section>`;
 if(focusAction)root.querySelector(`[data-action="${focusAction}"]:not(:disabled)`)?.focus({preventScroll:true});else if(focusFood)root.querySelector(`[data-food-select="${focusFood}"]`)?.focus({preventScroll:true});else if(focusTray)root.querySelector(`[data-tray="${focusTray}"]:not(:disabled)`)?.focus({preventScroll:true});
}
function ensureInteractionVisible(){const box=scene.getBoundingClientRect(),tray=document.querySelector('.context-tray');const safeBottom=(tray?.getBoundingClientRect().top||window.innerHeight)-12,top=box.top+(position.y-90)/600*box.height,bottom=box.top+(position.y+22)/600*box.height;let shift=bottom>safeBottom?bottom-safeBottom:top<55?top-55:0;if(shift&&typeof window.scrollBy==='function')window.scrollBy({top:shift,behavior:'instant'});}
function paintObjects(force=false){const view=controller.view(),stamp=JSON.stringify([view.wardrobeOpen,view.fridgeOpen,view.windowOpen,controller.objects.window.stable,view.browseProgress,view.selectedFood,view.sofaOccupied,view.vanityOccupied,state.foodQuantity,view.heldProductId]);if(!force&&stamp===lastObjects)return;lastObjects=stamp;const art=document.querySelector('.object-art');if(art)art.innerHTML=objectArt({...view,foodQuantity:state.foodQuantity,purchases:products});const windowButton=document.querySelector('button.window-target');if(windowButton)windowButton.setAttribute('aria-label',controller.objects.window.stable==='open'?'열린 창문 살펴보기':'창문 열기');const beauty=document.querySelector('.beauty-selection');if(beauty)beauty.setAttribute('opacity',view.heldProductId?0:1);document.querySelectorAll('[data-room-product]').forEach(item=>item.setAttribute('opacity',item.dataset.roomProduct===view.heldProductId?'0':'1'));}
function paintActor(force=false){const actor=document.querySelector('.walker');if(!actor)return;const view=controller.view();actor.style.left=(position.x+view.renderOffset.x)/4+'%';actor.style.top=(position.y+view.renderOffset.y)/6+'%';actor.dataset.x=position.x.toFixed(2);actor.dataset.y=position.y.toFixed(2);actor.dataset.direction=direction;actor.dataset.moving=String(walking);actor.dataset.primary=controller.primary;actor.dataset.phase=controller.phase;actor.dataset.object=view.objectId||'';actor.dataset.pose=view.pose;actor.dataset.offsetX=view.renderOffset.x.toFixed(2);actor.dataset.offsetY=view.renderOffset.y.toFixed(2);actor.classList.toggle('is-walking',walking);actor.classList.toggle('is-interacting',Boolean(view.objectId));actor.setAttribute('aria-label',`${home.user.name}, ${avatarById(state.avatarId).name}, ${state.outfitId==='base'?'기본 옷':state.outfitId==='knit'?'크림 니트':'블루 셔츠'} 착용`);
 const frame=walking&&!reduced?Math.floor(walkClock*8)%4:0;const stamp=`${state.avatarId}-${direction}-${frame}-${state.outfitId}-${view.pose}-${view.progress.toFixed(3)}-${view.seatProgress.toFixed(3)}-${view.heldProductId}`;if(!force&&stamp===lastSprite)return;lastSprite=stamp;actor.dataset.avatar=state.avatarId;actor.querySelector('svg').innerHTML=avatarSVG(state.avatarId,state.outfitId,direction,frame,{...view,reduced});}
document.querySelectorAll('[data-room]').forEach(btn=>btn.addEventListener('click',()=>{objectTrigger=btn;requestIntent({type:'object',id:btn.dataset.target||categoryObject[btn.dataset.room],trigger:btn});}));
document.querySelector('button.window-target').addEventListener('click',e=>{objectTrigger=e.currentTarget;requestIntent({type:'object',id:'window',trigger:e.currentTarget});});
document.querySelector('#reset').addEventListener('click',()=>{if(active)closeRoom();handleEffects(controller.dispatch({type:'RESET'}));state=initial();sceneSituation=null;sceneBudget=null;sceneStep='choose';position={...START};direction='down';persist('데모를 초기화했어요');});
document.querySelector('#tray-root').addEventListener('click',e=>{e.stopPropagation();const command=e.target.closest('[data-tray]')?.dataset.tray;if(command==='exit'){handleEffects(controller.dispatch({type:'CANCEL'}));return;}if(command==='expand'){handleEffects(controller.dispatch({type:'EXPAND'}));return;}if(command==='window'){handleEffects(controller.dispatch({type:'WINDOW_TOGGLE'}));ensureInteractionVisible();return;}const food=e.target.closest('[data-food-select]');if(food){handleEffects(controller.dispatch({type:'SELECT_FOOD',productId:food.dataset.foodSelect}));return;}const button=e.target.closest('[data-action]');if(button&&!button.disabled)productAction(button.dataset.action);});
document.querySelector('#modal-root').addEventListener('click',e=>{if(e.target.classList.contains('overlay')||e.target.closest('.close'))return closeRoom();if(active==='scene'){handleSceneClick(e.target);return;}const choice=e.target.closest('[data-avatar]');if(choice){draftAvatar=choice.dataset.avatar;renderAvatarChoices();document.querySelector(`[data-avatar="${draftAvatar}"]`).focus();return;}if(e.target.closest('.apply-avatar')){const selected=draftAvatar;state.avatarId=selected;closeRoom();persist(`${avatarById(selected).name} 캐릭터로 바꿨어요`);return;}const button=e.target.closest('[data-action]');if(button&&!button.disabled){productAction(button.dataset.action);document.querySelector(`[data-action="${button.dataset.action}"]:not(:disabled)`)?.focus();}});
document.addEventListener('keydown',e=>{if(!active)return;if(e.key==='Escape'){e.preventDefault();closeRoom();return;}if(e.key==='Tab'){const focusables=[...document.querySelector('.sheet').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')];const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&(document.activeElement===first||!focusables.includes(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
scene.addEventListener('click',e=>{if(e.target.closest('button')||active)return;scene.focus({preventScroll:true});const bounds=scene.getBoundingClientRect(),target={x:(e.clientX-bounds.left)/bounds.width*400,y:(e.clientY-bounds.top)/bounds.height*600};requestIntent({type:'move',target});});
document.addEventListener('keydown',e=>{if(active||e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable)return;const key=e.key.length===1?e.key.toLowerCase():e.key;if(e.key==='Escape'){stopMovement();handleEffects(controller.dispatch({type:'CANCEL'}));scene.focus({preventScroll:true});return;}if(!keyVector[key]||!(scene.contains(document.activeElement)||document.activeElement===document.body||controller.objectId&&document.querySelector('#app').contains(document.activeElement)||document.querySelector('#tray-root').contains(document.activeElement)))return;e.preventDefault();const wasDown=keys.has(key);keys.add(key);if(controller.objectId){pressPulses.clear();requestIntent({type:'keys'});}else{if(controller.owner!=='movement'||pendingInteraction||path.length)requestIntent({type:'keys'});if(!e.repeat&&!wasDown)pressPulses.add(key);} });
document.addEventListener('keyup',e=>{keys.delete(e.key.length===1?e.key.toLowerCase():e.key);controller.dispatch({type:'KEYUP',keysHeld:keys.size>0});});
window.addEventListener('blur',()=>handleEffects(controller.dispatch({type:'BLUR'})));
document.addEventListener('visibilitychange',()=>{if(document.hidden)handleEffects(controller.dispatch({type:'HIDE'}));});
function tick(time){const dt=Math.min((time-lastTime)/1000||0,.04);lastTime=time;const previous={...position};
 if(!active&&!document.hidden&&controller.owner==='movement'){
  if(keys.size||pressPulses.size){const inputs=new Set([...keys,...pressPulses]);let dx=0,dy=0;const inputDt=keys.size?dt:Math.max(dt,1/60);for(const key of inputs){dx+=keyVector[key][0];dy+=keyVector[key][1];}pressPulses.clear();const length=Math.hypot(dx,dy);if(length)position=moveWithCollision(position,dx/length*104*inputDt,dy/length*104*inputDt);}
  else if(path.length){const target=path[0],distance=Math.hypot(target.x-position.x,target.y-position.y),step=104*dt;if(distance<=step){position={...target};path.shift();}else position={x:position.x+(target.x-position.x)/distance*step,y:position.y+(target.y-position.y)/distance*step};
   if(!path.length){document.querySelector('.destination-mark').hidden=true;const arrived=pendingInteraction;pendingInteraction=null;if(arrived){objectTrigger=arrived.trigger;handleEffects(controller.dispatch({type:'ARRIVED',id:arrived.id,epoch:arrived.epoch,pathEmpty:true,position}));}else{controller.dispatch({type:'MOVE_STOP'});inform('바닥을 눌러 이동 · 가구를 눌러 사용');}}
  }else controller.dispatch({type:'MOVE_STOP'});
 }
 if(!document.hidden)handleEffects(controller.tick(dt*1000));
 const dx=position.x-previous.x,dy=position.y-previous.y;walking=controller.owner==='movement'&&Math.hypot(dx,dy)>.001;
 if(walking){walkClock+=dt;direction=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';}else walkClock=0;
 paintActor();paintObjects();renderTray();requestAnimationFrame(tick);
}
document.addEventListener('error',event=>{const image=event.target;if(image instanceof HTMLImageElement&&image.dataset.illustration&&icons[image.dataset.illustration])image.outerHTML=`<svg viewBox="0 0 60 60" aria-hidden="true">${icons[image.dataset.illustration]}</svg>`;},true);
renderHouse();paintActor();requestAnimationFrame(tick);
