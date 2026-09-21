import {avatarSVG,AVATARS} from '/app/avatar.js';
import {objectArt} from '/app/object-art.js';
import {toRoomVisualState,selectWardrobeProducts} from '/app/demo-state.js';
import {canonicalState,STATES} from './canonical-state.mjs';
const byId=id=>document.getElementById(id),params=new URLSearchParams(location.search);
byId('state').innerHTML=Object.entries(STATES).map(([id,s])=>`<option value="${id}">${s.label}</option>`).join('');
for(const id of ['state','avatar','outfit','direction','series'])if(params.has(id))byId(id).value=params.get(id);
if(!byId('state').value)byId('state').value='lamp-reach';
if(!params.has('state'))byId('state').value='lamp-reach';
byId('progress').value=params.get('p')||'.5';
const home=await fetch('/fixture.json').then(r=>r.json());
const requestedOutfit=params.get('outfit')||'base';
byId('outfit').replaceChildren(...[{id:'base',illustrationKey:'base'},...home.purchases.filter(p=>p.category==='fashion')].map(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=item.id==='base'?'Base artwork':`${item.illustrationKey} · ${item.id}`;return option;}));
byId('outfit').value=requestedOutfit==='base'?'base':home.purchases.find(p=>p.id===requestedOutfit||p.illustrationKey===requestedOutfit)?.id||'base';
await Promise.all(['/assets/gather-room.png',...AVATARS.flatMap(a=>[`/assets/avatars/${a.id}-states.png`,`/assets/avatars/${a.id}-vanity-seated-back.png`,`/assets/avatars/${a.id}-eating-states.png`])].map(src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(new Error('Artwork failed: '+src));image.src=src;})));
// SVG fragment IDs are document-global: namespace each real renderer result in a contact sheet.
function unique(markup,prefix){return markup.replace(/id="([^"]+)"/g,(_,id)=>`id="${prefix}-${id}"`).replace(/url\(#([^)]+)\)/g,(_,id)=>`url(#${prefix}-${id})`);}
const crop={lamp:[288,370,105,116],sofa:[24,302,139,148],vanity:[293,214,99,131],wardrobe:[25,30,165,177],fridge:[211,84,122,139],pantry:[275,101,109,135],window:[156,6,115,151],bed:[27,162,130,162],idle:[177,228,114,105]};
function current(){return {state:byId('state').value,avatar:byId('avatar').value,outfit:byId('outfit').value,direction:byId('direction').value,p:Number(byId('progress').value),series:byId('series').value};}
function render(){
 const selection=current(),avatars=selection.avatar==='all'?AVATARS:AVATARS.filter(a=>a.id===selection.avatar),progresses=selection.series==='1'?[0,.25,.5,.75,1]:[selection.p],records=[];
 const query=new URLSearchParams(Object.entries(selection).map(([k,v])=>[k,String(v)]));history.replaceState(null,'','?'+query);
 byId('progress-label').textContent=selection.p.toFixed(2);
 const cards=[];let serial=0;
 for(const a of avatars)for(const p of progresses){
  const state=canonicalState(selection.state,p,{...selection,home}),view=state.view,prefix='qa'+(++serial),x=state.position.x+view.renderOffset.x-20,y=state.position.y+view.renderOffset.y-64;
  const held=view.pose==='eat'?home.purchases.find(p=>p.id===view.heldProductId)?.illustrationKey:view.heldProductId;
  const art=avatarSVG(a.id,state.outfit,state.direction,state.frame,{...view,heldProductId:held,reduced:false});
  const room=objectArt({...view,purchases:home.purchases,wardrobeProducts:selectWardrobeProducts(home,state.confirmed),foodQuantity:toRoomVisualState(home,state.confirmed).foodQuantity,selectedFood:home.purchases.find(p=>p.id===view.selectedFood)?.illustrationKey});
  const box=crop[STATES[selection.state].object]||crop.idle;
  const context=`<svg class="scene" viewBox="${box.join(' ')}" role="img" aria-label="${a.id} ${selection.state} room crop"><image href="/assets/gather-room.png" width="400" height="600"/>${unique(room,prefix+'objects')}<svg x="${x}" y="${y}" width="40" height="64" viewBox="0 0 40 64" overflow="visible">${unique(art,prefix+'room')}</svg></svg>`;
  const solo=`<svg class="sprite" viewBox="${selection.state==='face'?'0 -2 40 30':'-4 -5 49 74'}" role="img" aria-label="${a.id} source renderer closeup">${unique(art,prefix+'solo')}</svg>`;
  cards.push(`<article class="card ${selection.state==='face'?'face':''}" data-avatar="${a.id}" data-state="${selection.state}" data-progress="${p}"><h2>${a.name} · p=${p.toFixed(2)}</h2>${context}${solo}<p class="meta">${view.phase}/${view.step} · ${view.pose}<br>seat=${view.seatProgress.toFixed(2)} · offset=${view.renderOffset.x.toFixed(1)},${view.renderOffset.y.toFixed(1)}</p></article>`);
  records.push({avatar:a.id,...state});
 }
 byId('cards').innerHTML=cards.join('');byId('debug').textContent=JSON.stringify(records,null,2);
 byId('ready').textContent=`READY · ${records.length} synthetic source-rendered frames · artwork preloaded`;
 document.documentElement.dataset.qaReady='true';document.documentElement.dataset.state=selection.state;
}
byId('controls').addEventListener('input',render);byId('controls').addEventListener('submit',e=>e.preventDefault());
byId('copy').addEventListener('click',async()=>{await navigator.clipboard.writeText(location.href);byId('copy').textContent='Copied';});
render();
