// Approved A / Slouch raster artwork. Motion remains owned by InteractionController.
import {appearanceFromKey} from './outfit-rendering.js';
import {FRAMES} from './avatar-frames.js';
import {VANITY_FRAMES} from './vanity-frames.js';
import {EATING_FRAMES} from './eating-frames.js';
export const AVATARS=[
 {id:'m01',name:'M01 · 네이비',note:'헝클머리 · 남성',pants:'#353b43'},
 {id:'m02',name:'M02 · 세이지',note:'가르마 · 남성',pants:'#303944'},
 {id:'f01',name:'F01 · 오트',note:'단발 · 여성',pants:'#536980'},
 {id:'f02',name:'F02 · 슬레이트',note:'긴머리 · 여성',pants:'#494b43'}
];
const legacy={short:'m01',wave:'m02',bob:'f01'};
export const avatarById=id=>AVATARS.find(a=>a.id===(legacy[id]||id))||AVATARS[0];
const unit=n=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
const fmt=n=>Number(n.toFixed(3));

export function avatarSVG(id,outfit='base',direction='down',frame=0,options={}){
 const appearance=appearanceFromKey(outfit);
 if(outfit!=='base'&&!appearance)outfit='base';
 const a=avatarById(id),pose=options.pose||'idle',p=unit(options.progress),seat=unit(options.seatProgress),reduced=Boolean(options.reduced);
 const facing=['up','left','right','down'].includes(direction)?direction:'down';
 const index={down:0,up:1,left:2,right:3}[facing];
 const key=`avatar-${a.id}-${outfit}-${facing}-${pose}-${frame}`;
 const scale=60/FRAMES[a.id][0].box[3];
 const source=(i,{x=0,y=0,opacity=1,transform='',part='full'}={})=>{
  const data=FRAMES[a.id][i], [bx,by,bw,bh]=data.box;
  const px=20-(data.anchorX??bw/2)*scale+x,py=61-bh*scale+y;
  const uid=key+'-'+i+'-'+part;
  const href=`/assets/avatars/${a.id}-states.png`;
  const picture=`<svg x="${fmt(px)}" y="${fmt(py)}" width="${fmt(bw*scale)}" height="${fmt(bh*scale)}" viewBox="0 0 ${bw} ${bh}" overflow="visible"><svg width="${bw}" height="${bh}" viewBox="${bx} ${by} ${bw} ${bh}" overflow="hidden" style="overflow:hidden"><image href="${href}" width="1536" height="1024" image-rendering="pixelated"/></svg>${outfit==='base'?'':tinted(data,uid,href,i===1||i===7?'up':i===2?'left':i===3?'right':'down')}</svg>`;
  return `<g opacity="${fmt(opacity)}" transform="${transform}" data-sprite-frame="${i}">${picture}</g>`;
 };
 const clip=(name,shape,content)=>`<defs><clipPath id="${key}-${name}">${shape}</clipPath></defs><g clip-path="url(#${key}-${name})">${content}</g>`;
 const standing=(i=index)=>source(i);
 const eating=()=>{
  // Each state is an intact generated pose. Only a uniform artwork scale is
  // applied; no body part is stretched, detached, or re-positioned in code.
  const eatingFacing=facing==='left'?'left':'right';
  const state=reduced?'sip':p<.08||p>=.94?'idle':p<.34?'hold':p<.73?'sip':'satisfied';
  if(state==='idle')return source(eatingFacing==='left'?2:3);
  const i={hold:0,sip:1,satisfied:2}[state];
  const data=EATING_FRAMES[a.id][i], [bx,by,bw,bh]=data.box;
  const height=FRAMES[a.id][3].box[3]*scale;
  const eatingScale=height/bh;
  const px=20-data.anchorX*eatingScale,py=61-height;
  const href=`/assets/avatars/${a.id}-eating-states.png`,uid=key+'-eat-'+i;
  const picture=`<svg x="${fmt(px)}" y="${fmt(py)}" width="${fmt(bw*eatingScale)}" height="${fmt(height)}" viewBox="0 0 ${bw} ${bh}" overflow="visible"><svg width="${bw}" height="${bh}" viewBox="${bx} ${by} ${bw} ${bh}" overflow="hidden" style="overflow:hidden"><image href="${href}" width="1536" height="1024" image-rendering="pixelated"/></svg>${outfit==='base'?'':tinted(data,uid,href,eatingFacing)}</svg>`;
  return `<g data-eating-state="${state}" data-held-food="${['milk','water','vitamin'].includes(options.heldProductId)?options.heldProductId:'food'}" transform="${eatingFacing==='left'?'translate(40 0) scale(-1 1)':''}">${picture}</g>`;
 };
 const sofaSeat=()=>source(6);
 const vanitySeat=()=>{
  // Reuse the approved strict-rear seated raster. Separate silhouette clips
  // exclude its ivory background and reference stool, revealing the room stool.
  const data=VANITY_FRAMES[a.id],href=`/assets/avatars/${a.id}-vanity-seated-back.png`;
  // The rear pelvis contacts the front half of the visible seat at world
  // y=298. Its hem must nearly meet the lip, not float above the seat center.
  // Shins stay below the front rim rather than moving up with the pelvis.
  const px=20-data.hipX*data.scale,py=39-data.hipY*data.scale;
  const legY=40-data.hipY*data.scale;
  const image=`<image href="${href}" width="${data.width}" height="${data.height}" image-rendering="pixelated"/>`;
  const uid=key+'-vanity';
  const color=appearance?appearance.hex.match(/\w\w/g).map(v=>parseInt(v,16)/255):[.91,.875,.79];
  const bias=color.map(c=>fmt(c-data.luma*.65));
  const defs=`<defs><clipPath id="${uid}-body"><path d="${data.bodyMask}"/></clipPath><clipPath id="${uid}-legs"><path d="${data.legMask}"/></clipPath><clipPath id="${uid}-cloth"><path d="${data.shirtMask}"/></clipPath><filter id="${uid}-tint" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".138 .465 .047 0 ${bias[0]} .138 .465 .047 0 ${bias[1]} .138 .465 .047 0 ${bias[2]} 0 0 0 1 0"/></filter></defs>`;
  const garment=outfit==='base'?'':`<g clip-path="url(#${uid}-cloth)" filter="url(#${uid}-tint)">${image}</g>`;
  const upper=`<g transform="translate(${fmt(px)} ${fmt(py)}) scale(${data.scale})"><g clip-path="url(#${uid}-body)">${image}${garment}</g></g>`;
  const legs=`<g transform="translate(${fmt(px)} ${fmt(legY+data.legOffsetY)}) scale(${data.scale})" clip-path="url(#${uid}-legs)">${image}</g>`;
  // The native arms already bend forward. A tiny hip-pivoted motion preserves
  // their connected silhouette. Draw the small held bottle over the sleeve
  // edge so the native forward arm cannot completely occlude the action.
  const reach=pose==='use-cosmetic'&&!reduced?Math.sin(p*Math.PI):0;
  const product=pose==='use-cosmetic'&&options.heldProductId&&p>.22&&p<.84?`<g class="avatar-held-product" transform="translate(${fmt(31.5+reach*.5)} ${fmt(28-reach*2)})"><rect x="-1.7" y="-5" width="3.4" height="5.2" rx=".4" fill="${options.heldProductId==='cream'?'#eee5cf':'#c6aa60'}" stroke="#64705a" stroke-width=".4"/><rect x="-1.7" y="-6" width="3.4" height="1.3" fill="#4c6958"/><path d="M-1.8-.8H.8L1.4.1 .5 1H-1.8Z" fill="#e7b493" stroke="#9b7158" stroke-width=".35"/></g>`:'';
  // Restore only the existing chair's front lip over the upper shins. It
  // connects the naturally separated rear-pose legs to the room's real stool.
  const rim=clip('vanity-seat-front','<path d="M2 36Q20 43 38 36L36 45Q20 53 4 45Z"/>','<image href="/assets/gather-room.png" x="-320" y="-259" width="400" height="600"/>');
  return `${defs}<g transform="translate(0 ${fmt(6*(1-seat))})">${legs}</g><g transform="translate(0 ${fmt(-6*(1-seat))})">${rim}</g><g data-vanity-source="seated-back" transform="translate(0 ${fmt(6*(1-seat))}) rotate(${fmt(-1.2*reach)} 20 39)">${upper}${product}</g>`;
 };
 let body='';
 const bed=unit(options.bedProgress),isBed=['lie-down','lying-idle','get-up'].includes(pose);
 const isSeat=pose==='sit-down'||pose==='stand-up'||pose==='seated-idle'||pose==='use-cosmetic';
 if(isBed){
  // Lie face-up on the existing pillow; the bedspread covers the lower body.
  // The world anchor stays collision-safe and the controller owns this progress.
  const settle=bed*bed*(3-2*bed);
  const rest=clip('bed-upper','<rect x="-20" y="-10" width="80" height="54"/>',source(0,{transform:`rotate(${fmt(-5*settle)} 20 18)`,part:'bed'}));
  const cover=`<defs><linearGradient id="${key}-bed-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="white"/><stop offset=".66" stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient><mask id="${key}-bed-mask" maskUnits="userSpaceOnUse" x="-8" y="30" width="65" height="47"><rect x="-8" y="30" width="65" height="47" fill="url(#${key}-bed-fade)"/></mask></defs><g mask="url(#${key}-bed-mask)" data-bed-cover="${fmt(settle)}" opacity="${fmt(settle)}"><path d="M-6 36Q7 31 20 35T55 37L55 76H-6Z" fill="#547795" stroke="#365970" stroke-width="1.2"/><path d="M-5 40Q11 36 24 40T54 41" fill="none" stroke="#a6bac9" stroke-width="3"/><path d="M-5 57H54M-5 74H54M8 39V76M27 40V76M45 40V76" fill="none" stroke="#adc3d0" stroke-opacity=".3" stroke-width="1.2"/><path d="M-2 43Q2 60-1 76M50 44Q46 60 51 76" fill="none" stroke="#294c66" opacity=".3" stroke-width="2"/></g>`;
  body=settle>=.999?rest+cover:`<g opacity="${fmt(1-settle)}">${standing()}</g><g opacity="${fmt(settle)}">${rest}</g>${cover}`;
 }else if(isSeat){
  const seated=options.objectId==='sofa'?sofaSeat():vanitySeat();
  if(options.objectId==='vanity'){
   // Use one opaque whole pose per frame. Align the two source silhouettes
   // through the settle so sit/stand does not display two ghost heads/bodies.
   body=seat<.5?`<g transform="translate(0 ${fmt(-6*seat)})">${standing()}</g>`:seated;
  }else if(seat>=.99)body=seated;
  else if(seat<=.01)body=standing();
  else body=`<g opacity="${fmt(1-seat)}" transform="translate(0 ${fmt(seat*3)})">${standing()}</g><g opacity="${fmt(seat)}">${seated}</g>`;

 }else if(pose==='reach'&&options.objectId==='lamp'){
  // Separate the actual near arm from the approved side sprite. Removing it
  // from the body prevents the old hanging arm remaining beside a new reach.
  const reach=reduced?1:Math.sin(p*Math.PI);
  // Side-atlas hands end at different heights. The old broad y=46 crop
  // rotated a rectangle of trouser pixels past the native hand (most visible on F01).
  const [cuff,handLeft,handRight,handBottom]={m01:[39,16.5,22.5,44.8],m02:[38.5,16.1,22.1,44.5],f01:[39,16.5,22,42.8],f02:[38.5,16.5,22.5,43.5]}[a.id];
  const armShape=`M14 25H22L25 31V${cuff}H${handRight}V${handBottom-.9}L${handRight-.8} ${handBottom}H${handLeft+.8}L${handLeft} ${handBottom-.9}V${cuff}H14L13 33Z`;
  const arm=clip('lamp-native-arm',`<path d="${armShape}"/>`,source(3,{part:'moving-arm'}));
  const armMask=`<defs><mask id="${key}-lamp-body" maskUnits="userSpaceOnUse" x="-20" y="-10" width="80" height="90"><rect x="-20" y="-10" width="80" height="90" fill="white"/><path d="${armShape}" fill="black"/></mask></defs>`;
  const withoutArm=part=>`<g mask="url(#${key}-lamp-body)">${source(3,{part})}</g>`;
  const torso=clip('lamp-without-arm','<rect x="-20" y="-10" width="80" height="54"/>',withoutArm('body-without-arm'));
  // A narrow strip of the same garment restores the torso behind the arm.
  const repair=clip('lamp-shirt-strip','<rect x="24" y="26" width="3" height="18"/>',source(3,{part:'torso-strip'}));
  const legs=clip('lamp-planted-legs','<rect x="-20" y="44" width="80" height="25"/>',withoutArm('planted-legs'));
  const leanX=5*reach,leanY=8*reach;
  body=armMask+legs+`<g data-lamp-reach="${fmt(reach)}" transform="translate(${fmt(leanX)} ${fmt(leanY)})"><g transform="translate(14 0) scale(3.667 1) translate(-24 0)">${repair}</g>${torso}<g transform="rotate(${fmt(-60*reach)} 19 28)">${arm}</g></g>`;
 }else if(pose==='browse'||pose==='reach'){
  const amount=pose==='browse'?1:Math.sin(p*Math.PI);
  // Use the supplied raised-arm art, preserving its actual rear-three-quarter silhouette.
  body=amount>.4?source(7,{transform:`${facing==='left'?'translate(40 0) scale(-1 1) ':''}${!reduced&&pose==='browse'?`rotate(${fmt(Math.sin(p*Math.PI*6)*1.2)} 20 60)`:''}`}):standing();
 }else if(pose==='eat'){
  body=eating();
 }else if(pose==='change-clothes'){
  const turn=p>.2&&p<.7?1:index;
  body=source(turn);
  if(!reduced)body+=`<path d="M5 37q-5 8 3 12M34 34q6 8 1 12" stroke="#d3c39b" fill="none" stroke-width="1.2" opacity="${fmt(Math.sin(p*Math.PI))}"/>`;
 }else if(frame&&!reduced){
  if(facing==='down')body=source(frame===1?4:frame===3?5:0);
  else{
   const stride=frame===1?1.25:frame===3?-1.25:0;
   body=clip('walk-top','<rect x="-10" y="-10" width="60" height="53"/>',source(index,{y:-Math.abs(stride)*.22,part:'top'}));
   body+=clip('walk-leg-a','<rect x="-10" y="43" width="30" height="23"/>',source(index,{x:stride*.38,y:stride*.48,part:'leg-a'}));
   body+=clip('walk-leg-b','<rect x="20" y="43" width="30" height="23"/>',source(index,{x:-stride*.38,y:-stride*.48,part:'leg-b'}));
  }
 }else body=standing();
 const shadow=seat>.4||bed>.1?'':`<ellipse cx="20" cy="61" rx="10" ry="2.1" fill="#45483a" opacity=".18"/>`;
 return `${shadow}<g class="pixel-avatar" data-avatar-art="${a.id}" data-pose="${pose}" data-outfit-key="${outfit}">${body}</g>`;

 // Details stay inside the native garment mask; rear views never show front closures.
 function details(w,h,view){
  if(!appearance||appearance.style==='legacy')return '';
  const style=appearance.style,back=view==='up',side=view==='left'||view==='right';
  const cx=w*(view==='left'?.43:view==='right'?.57:.5),y=h*.39,wide=w*(side?.10:.17),bottom=h*.68;
  const ink=appearance.color==='black'||appearance.color==='navy'?'#b5bdc4':'#596775';
  const seam=(path,width=2)=>`<path d="${path}" fill="none" stroke="${ink}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  let art='';
  if(!back){
   if(style==='shirt')art+=`<path d="M${cx-wide} ${y}L${cx} ${y+7}L${cx-wide*.55} ${y+15}ZM${cx+wide} ${y}L${cx} ${y+7}L${cx+wide*.55} ${y+15}Z" fill="#e5e8df" stroke="${ink}" stroke-width="1.8"/>`;
   else if(style==='cardigan-v')art+=seam(`M${cx-wide} ${y-3}L${cx} ${y+20}L${cx+wide} ${y-3}`,3);
   else if(style==='cardigan-zip')art+=seam(`M${cx-wide*.65} ${y+10}V${y-4}H${cx+wide*.65}V${y+10}`,4);
   else art+=seam(`M${cx-wide} ${y}Q${cx} ${y+18} ${cx+wide} ${y}`,style==='sweatshirt'?4:2.5);
   if(style!=='sweatshirt'){
    const start=y+(style==='cardigan-v'?20:10);
    art+=seam(`M${cx} ${start}V${bottom}`,style==='cardigan-zip'?3:2);
    if(style!=='cardigan-zip')for(let n=0;n<4;n++)art+=`<circle cx="${cx+3}" cy="${start+8+n*(bottom-start-12)/4}" r="1.8" fill="${ink}"/>`;
   }
  }
  if(style==='sweatshirt'||style==='cardigan-zip')art+=seam(`M${cx-wide*1.35} ${bottom-3}H${cx+wide*1.35}`,3);
  if(style==='cardigan-zip')art+=`<path d="M0 ${bottom-1}H${cx-wide*1.45}M${cx+wide*1.45} ${bottom-1}H${w}" stroke="#e9e8df" stroke-width="4"/>`;
  if(appearance.pattern==='cable')for(const dx of [-wide*.7,wide*.7])art+=seam(`M${cx+dx} ${y+24}l-2 5 4 6-4 6 4 6-2 5`,1.7);
  return `<g data-garment-detail="${style}" opacity=".8">${art}</g>`;
 }
 function tinted(data,uid,href,view){
  const [bx,by,bw,bh]=data.box;
  const color=appearance?appearance.hex.match(/\w\w/g).map(v=>parseInt(v,16)/255):[.91,.875,.79];
  const bias=color.map(c=>fmt(c-data.luma*.65));
  return `<defs><clipPath id="${uid}-cloth"><path d="${data.shirtMask}"/></clipPath><filter id="${uid}-tint" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".138 .465 .047 0 ${bias[0]} .138 .465 .047 0 ${bias[1]} .138 .465 .047 0 ${bias[2]} 0 0 0 1 0"/></filter></defs><g clip-path="url(#${uid}-cloth)"><svg width="${bw}" height="${bh}" viewBox="${bx} ${by} ${bw} ${bh}" overflow="hidden" style="overflow:hidden"><image href="${href}" width="1536" height="1024" image-rendering="pixelated" filter="url(#${uid}-tint)"/></svg>${details(bw,bh,view)}</g>`;
 }
}
