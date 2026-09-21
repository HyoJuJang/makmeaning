// Approved A / Slouch raster artwork. Motion remains owned by InteractionController.
import {FRAMES} from './avatar-frames.js';
import {VANITY_FRAMES} from './vanity-frames.js';
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
  const picture=`<svg x="${fmt(px)}" y="${fmt(py)}" width="${fmt(bw*scale)}" height="${fmt(bh*scale)}" viewBox="0 0 ${bw} ${bh}" overflow="visible"><svg width="${bw}" height="${bh}" viewBox="${bx} ${by} ${bw} ${bh}" overflow="hidden" style="overflow:hidden"><image href="${href}" width="1536" height="1024" image-rendering="pixelated"/></svg>${outfit==='base'?'':tinted(data,uid,href)}</svg>`;
  return `<g opacity="${fmt(opacity)}" transform="${transform}" data-sprite-frame="${i}">${picture}</g>`;
 };
 const clip=(name,shape,content)=>`<defs><clipPath id="${key}-${name}">${shape}</clipPath></defs><g clip-path="url(#${key}-${name})">${content}</g>`;
 const standing=(i=index)=>source(i);
 const sofaSeat=()=>source(6);
 const vanitySeat=()=>{
  // Reuse the approved strict-rear seated raster. Separate silhouette clips
  // exclude its ivory background and reference stool, revealing the room stool.
  const data=VANITY_FRAMES[a.id],href=`/assets/avatars/${a.id}-vanity-seated-back.png`;
  const px=20-data.hipX*data.scale,py=45-data.hipY*data.scale;
  const image=`<image href="${href}" width="${data.width}" height="${data.height}" image-rendering="pixelated"/>`;
  const uid=key+'-vanity';
  const color=outfit==='shirt'?[.56,.69,.77]:[.91,.875,.79];
  const bias=color.map(c=>fmt(c-data.luma*.65));
  const defs=`<defs><clipPath id="${uid}-body"><path d="${data.bodyMask}"/></clipPath><clipPath id="${uid}-legs"><path d="${data.legMask}"/></clipPath><clipPath id="${uid}-cloth"><path d="${data.shirtMask}"/></clipPath><filter id="${uid}-tint" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".138 .465 .047 0 ${bias[0]} .138 .465 .047 0 ${bias[1]} .138 .465 .047 0 ${bias[2]} 0 0 0 1 0"/></filter></defs>`;
  const garment=outfit==='base'?'':`<g clip-path="url(#${uid}-cloth)" filter="url(#${uid}-tint)">${image}</g>`;
  const upper=`<g transform="translate(${fmt(px)} ${fmt(py)}) scale(${data.scale})"><g clip-path="url(#${uid}-body)">${image}${garment}</g></g>`;
  const legs=`<g transform="translate(${fmt(px)} ${fmt(py+data.legOffsetY)}) scale(${data.scale})" clip-path="url(#${uid}-legs)">${image}</g>`;
  // The native arms already bend forward. A tiny hip-pivoted motion preserves
  // their connected silhouette. Draw the small held bottle over the sleeve
  // edge so the native forward arm cannot completely occlude the action.
  const reach=pose==='use-cosmetic'&&!reduced?Math.sin(p*Math.PI):0;
  const product=pose==='use-cosmetic'&&options.heldProductId&&p>.22&&p<.84?`<g class="avatar-held-product" transform="translate(${fmt(31.5+reach*.5)} ${fmt(34-reach*2)})"><rect x="-1.7" y="-5" width="3.4" height="5.2" rx=".4" fill="${options.heldProductId==='cream'?'#eee5cf':'#c6aa60'}" stroke="#64705a" stroke-width=".4"/><rect x="-1.7" y="-6" width="3.4" height="1.3" fill="#4c6958"/><path d="M-1.8-.8H.8L1.4.1 .5 1H-1.8Z" fill="#e7b493" stroke="#9b7158" stroke-width=".35"/></g>`:'';
  return `${defs}${legs}<g data-vanity-source="seated-back" transform="rotate(${fmt(-1.2*reach)} 20 45)">${upper}${product}</g>`;
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
  if(seat>=.99)body=seated;
  else if(seat<=.01)body=standing();
  else body=`<g opacity="${fmt(1-seat)}" transform="translate(0 ${fmt(seat*3)})">${standing()}</g><g opacity="${fmt(seat)}">${seated}</g>`;

 }else if(pose==='reach'&&options.objectId==='lamp'){
  // Separate the actual near arm from the approved side sprite. Removing it
  // from the body prevents the old hanging arm remaining beside a new reach.
  const reach=reduced?1:Math.sin(p*Math.PI);
  const armShape='M14 25H22L25 31V40L24 46H16L14 40L13 33Z';
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
 }else if(pose==='change-clothes'){
  const turn=p>.2&&p<.7?1:index;
  body=source(turn,{transform:reduced?'':`translate(20 40) scale(${fmt(1-Math.sin(p*Math.PI)*.12)} 1) translate(-20 -40)`});
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
 return `${shadow}<g class="pixel-avatar" data-avatar-art="${a.id}" data-pose="${pose}">${body}</g>`;

 function tinted(data,uid,href){
  const [bx,by,bw,bh]=data.box;
  const color=outfit==='shirt'?[.56,.69,.77]:[.91,.875,.79];
  const bias=color.map(c=>fmt(c-data.luma*.65));
  return `<defs><clipPath id="${uid}-cloth"><path d="${data.shirtMask}"/></clipPath><filter id="${uid}-tint" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".138 .465 .047 0 ${bias[0]} .138 .465 .047 0 ${bias[1]} .138 .465 .047 0 ${bias[2]} 0 0 0 1 0"/></filter></defs><g clip-path="url(#${uid}-cloth)"><svg width="${bw}" height="${bh}" viewBox="${bx} ${by} ${bw} ${bh}" overflow="hidden" style="overflow:hidden"><image href="${href}" width="1536" height="1024" image-rendering="pixelated" filter="url(#${uid}-tint)"/></svg></g>`;
 }
}
